import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import * as Sentry from "@sentry/react-native";
import { useAnalysisStore } from "../store/useAnalysisStore";
import { compressImageUri, perImageByteTarget } from "../lib/utils/image";
import { hasMenuText } from "../lib/utils/menuTextCheck";
import { saveSession } from "../lib/storage/session";
import { DEFAULT_CONDITION } from "@eat-out-better/shared";
import type { AnalyzeResponse, AnalyzeRequest } from "@eat-out-better/shared";
import Constants from "expo-constants";
import {
  trackMenuAnalysisCompleted,
  trackMenuAnalysisFailed,
  type AnalysisErrorType,
} from "../lib/analytics";

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3000";
const ANALYSIS_API = `${API_URL}/api/analyze`;
// Shared secret the API checks (see apps/api .../analyze/route.ts). Injected at
// build time via app.config.ts `extra.appToken`. Undefined in local dev, where
// the API fails open.
const APP_TOKEN: string | undefined = Constants.expoConfig?.extra?.appToken;

// Retry budget. The abort/retry is event-driven, not timer-based: iOS suspends
// the in-flight fetch when the app is backgrounded, so the network promise can
// hang indefinitely. When the app returns to the foreground we abort the
// (now-dead) request, which rejects the fetch and lets the catch logic
// re-issue it. Aborts (user backgrounded the app) get their own, more generous
// budget than genuine network failures — backgrounding twice during one scan
// shouldn't fail the analysis.
const MAX_NETWORK_RETRIES = 1;
const MAX_ABORT_RETRIES = 3;

/** An error whose message is already safe to show to the user verbatim. */
class FriendlyError extends Error {}

function friendlyMessageForStatus(status: number): string {
  if (status === 413)
    return "That's more than we can analyze in one scan. Try fewer pages or retake the photos.";
  if (status === 429)
    return "The analysis service is busy right now. Please try again in a moment.";
  if (status === 504 || status === 408)
    return "The analysis took too long. Try again — fewer pages usually helps.";
  return "The analysis service hit a snag. Please try again.";
}

function friendlyMessageForError(error: unknown): string {
  if (error instanceof FriendlyError) return error.message;
  if (error instanceof Error && error.name === "AbortError")
    return "The analysis was interrupted. Please try again.";
  return "We couldn't reach the analysis service. Check your connection and try again.";
}

export function useAnalysis() {
  const router = useRouter();
  const posthog = usePostHog();
  const store = useAnalysisStore();
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lets the AppState listener abort and re-issue the in-flight analysis fetch.
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestInFlightRef = useRef(false);
  const networkRetriesRef = useRef(0);
  const abortRetriesRef = useRef(0);

  // When iOS brings the app back to the foreground while a request is still
  // in-flight, the suspended fetch will never resolve. ALWAYS abort it: within
  // the abort budget the catch logic re-issues a fresh request; past the
  // budget it surfaces an error — either way the user is never left staring
  // at a frozen progress bar attached to a dead request.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active" && requestInFlightRef.current) {
          abortControllerRef.current?.abort();
        }
      }
    );
    return () => subscription.remove();
  }, []);

  const startProgressSimulation = useCallback(
    (from: number, to: number, durationMs: number, message: string) => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      store.setProgress(from, message);
      const steps = 20;
      const increment = (to - from) / steps;
      const intervalMs = durationMs / steps;
      let current = from;

      progressIntervalRef.current = setInterval(() => {
        current = Math.min(current + increment, to);
        store.setProgress(Math.round(current));
        if (current >= to) {
          clearInterval(progressIntervalRef.current!);
          progressIntervalRef.current = null;
        }
      }, intervalMs);
    },
    [store]
  );

  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startAnalysis = useCallback(
    async (imageUris: string[], scanSessionId: string, startedAt: number) => {
      if (imageUris.length === 0) return;

      // On-device pre-check: if the photo(s) contain essentially no text, it
      // isn't a menu — warn and skip the API entirely (no upload, no LLM cost).
      // We run this BEFORE navigating to /processing, so we're still on the
      // capture screen and its alert effect surfaces the warning reliably (no
      // navigation race). Anything with text falls through to the API, which
      // makes the precise menu/not-menu call.
      const { hasText } = await hasMenuText(imageUris);
      if (!hasText) {
        const durationSeconds = (Date.now() - startedAt) / 1000;
        if (posthog)
          trackMenuAnalysisFailed(posthog, scanSessionId, "NOT_A_MENU", durationSeconds, imageUris.length);
        store.setError({
          code: "NOT_A_MENU",
          message: "That doesn't look like a menu. Try snapping the menu itself.",
        });
        return;
      }

      store.setStatus("uploading");
      store.setProgress(0, "Preparing your photos…");

      try {
        startProgressSimulation(0, 10, 2_000, "Preparing your photos…");
        // Budget compression per image so the TOTAL upload stays under
        // Vercel's ~4.5MB request-body limit regardless of page count.
        const targetBytes = perImageByteTarget(imageUris.length);
        const compressedImages = await Promise.all(
          imageUris.map((uri) => compressImageUri(uri, targetBytes))
        );
        stopProgressSimulation();

        // Replace (not append) — a previous failed attempt must not leave its
        // multi-MB base64 blobs in the store or skew page-count analytics.
        store.clearImages();
        compressedImages.forEach((img) => store.addImage(img));

        store.setStatus("extracting");
        router.push("/processing");

        startProgressSimulation(
          10,
          88,
          28_000,
          imageUris.length > 1
            ? `Reading ${imageUris.length} menu pages…`
            : "Reading your menu…"
        );

        const requestBody: AnalyzeRequest = {
          images: compressedImages.map((img) => img.base64),
          healthCondition: DEFAULT_CONDITION,
        };

        // Issue the request, retrying if the in-flight fetch is aborted (the
        // AppState listener aborts suspended requests when iOS re-foregrounds
        // the app) or genuinely rejects. Aborts and network failures draw from
        // separate budgets. Each attempt gets a fresh AbortController; the
        // progress simulation is restarted on retry so the bar doesn't freeze.
        let response: Response | undefined;
        networkRetriesRef.current = 0;
        abortRetriesRef.current = 0;
        requestInFlightRef.current = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const controller = new AbortController();
          abortControllerRef.current = controller;
          try {
            response = await fetch(ANALYSIS_API, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(APP_TOKEN ? { "x-app-token": APP_TOKEN } : {}),
              },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            });
            break;
          } catch (fetchError) {
            const wasAborted = controller.signal.aborted;
            if (wasAborted) {
              if (abortRetriesRef.current >= MAX_ABORT_RETRIES) throw fetchError;
              abortRetriesRef.current += 1;
            } else {
              if (networkRetriesRef.current >= MAX_NETWORK_RETRIES) throw fetchError;
              networkRetriesRef.current += 1;
            }
            startProgressSimulation(
              10,
              88,
              28_000,
              imageUris.length > 1
                ? `Reading ${imageUris.length} menu pages…`
                : "Reading your menu…"
            );
          }
        }

        requestInFlightRef.current = false;
        abortControllerRef.current = null;
        stopProgressSimulation();
        store.setStatus("ranking");
        store.setProgress(92, "Finalizing results…");

        if (!response) {
          throw new Error("API error: no response");
        }

        // Parse the body even on non-2xx: the API returns structured errors
        // (e.g. NOT_A_MENU / OCR_EMPTY at HTTP 422) that we want to surface with
        // their specific code and message rather than a generic network error.
        let json: AnalyzeResponse | undefined;
        try {
          json = (await response.json()) as AnalyzeResponse;
        } catch {
          json = undefined;
        }
        stopProgressSimulation();

        if (!json) {
          // Non-JSON response = the platform (not our API) rejected the
          // request — e.g. Vercel's 413 payload limit or a 504 timeout. Log
          // the real status for diagnostics; show the user something useful.
          console.error(`[useAnalysis] Non-JSON response: ${response.status} ${response.statusText}`);
          throw new FriendlyError(friendlyMessageForStatus(response.status));
        }

        // Navigation back to /capture is owned solely by processing.tsx's
        // `status === "error"` effect (via router.replace). We only set the
        // error here — pushing /capture from here too caused a double-navigation
        // race that swallowed the alert (EAT-6).
        if (!json.success || !json.data) {
          // The API's NOT_A_MENU / OCR_EMPTY messages are already user-friendly
          // and distinct, so we surface them as-is. Fall back only if absent.
          const errorCode = (json.error?.code ?? "UNKNOWN") as AnalysisErrorType;
          const durationSeconds = (Date.now() - startedAt) / 1000;
          if (posthog) trackMenuAnalysisFailed(posthog, scanSessionId, errorCode, durationSeconds, imageUris.length);
          store.setError(
            json.error ?? { code: "UNKNOWN", message: "An unexpected error occurred." }
          );
          return;
        }

        if (json.data.dishCount === 0) {
          const durationSeconds = (Date.now() - startedAt) / 1000;
          if (posthog) trackMenuAnalysisFailed(posthog, scanSessionId, "OCR_EMPTY", durationSeconds, imageUris.length);
          store.setError({
            code: "OCR_EMPTY",
            message: "We couldn't read any dishes. Try again with better lighting.",
          });
          return;
        }

        const durationSeconds = (Date.now() - startedAt) / 1000;
        if (posthog) trackMenuAnalysisCompleted(posthog, scanSessionId, json.data.dishCount, durationSeconds);
        store.setProgress(100, "Done!");
        // Navigation to /results is owned solely by processing.tsx's
        // `status === "complete"` effect (same convention as the error path).
        // setResults flips status to "complete", which triggers it — pushing
        // from here too mounted a second results screen ("double load").
        store.setResults(json.data);
        await saveSession(json.data);
      } catch (error) {
        requestInFlightRef.current = false;
        abortControllerRef.current = null;
        stopProgressSimulation();
        // Stale multi-MB base64 blobs have no use after a failure.
        store.clearImages();
        console.error("[useAnalysis] Analysis failed:", error);
        Sentry.captureException(error);
        const durationSeconds = (Date.now() - startedAt) / 1000;
        if (posthog) trackMenuAnalysisFailed(posthog, scanSessionId, "NETWORK_ERROR", durationSeconds, imageUris.length);
        // Users get friendly copy; the raw error (e.g. "Aborted", "API error:
        // 413") goes to the console + Sentry above instead of the alert.
        store.setError({
          code: "NETWORK_ERROR",
          message: friendlyMessageForError(error),
        });
        // Navigation handled by processing.tsx's error effect (see above).
      }
    },
    [store, router, startProgressSimulation, stopProgressSimulation, posthog]
  );

  return {
    startAnalysis,
    status: store.status,
    progress: store.progress,
    progressMessage: store.progressMessage,
    results: store.results,
    session: store.session,
    error: store.error,
  };
}
