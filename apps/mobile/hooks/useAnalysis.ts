import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useAnalysisStore } from "../store/useAnalysisStore";
import { compressImageUri } from "../lib/utils/image";
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

// We retry the analysis request at most once. The retry is event-driven, not
// timer-based: iOS suspends the in-flight fetch when the app is backgrounded,
// so the network promise can hang indefinitely. When the app returns to the
// foreground we abort the (now-dead) request, which rejects the fetch and lets
// the catch logic re-issue it. A genuine network rejection triggers the same
// retry path.
const MAX_RETRIES = 1;

export function useAnalysis() {
  const router = useRouter();
  const posthog = usePostHog();
  const store = useAnalysisStore();
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lets the AppState listener abort and re-issue the in-flight analysis fetch.
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestInFlightRef = useRef(false);
  const attemptRef = useRef(0);

  // When iOS brings the app back to the foreground while a request is still
  // in-flight (and we haven't already retried), the suspended fetch will never
  // resolve. Abort it so the catch logic re-issues a fresh request.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          nextState === "active" &&
          requestInFlightRef.current &&
          attemptRef.current <= MAX_RETRIES
        ) {
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
        const compressedImages = await Promise.all(
          imageUris.map((uri) => compressImageUri(uri))
        );
        stopProgressSimulation();

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

        // Issue the request, retrying once if the in-flight fetch is aborted
        // (e.g. backgrounded by iOS) or genuinely rejects. Each attempt gets a
        // fresh AbortController; the progress simulation is restarted on retry
        // so the bar doesn't sit frozen.
        let response: Response | undefined;
        attemptRef.current = 0;
        requestInFlightRef.current = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const controller = new AbortController();
          abortControllerRef.current = controller;
          try {
            response = await fetch(ANALYSIS_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            });
            break;
          } catch (fetchError) {
            if (attemptRef.current >= MAX_RETRIES) {
              throw fetchError;
            }
            attemptRef.current += 1;
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
          throw new Error(`API error: ${response.status} ${response.statusText}`);
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
        store.setResults(json.data);
        await saveSession(json.data);
        router.push("/results");
      } catch (error) {
        requestInFlightRef.current = false;
        abortControllerRef.current = null;
        stopProgressSimulation();
        const durationSeconds = (Date.now() - startedAt) / 1000;
        if (posthog) trackMenuAnalysisFailed(posthog, scanSessionId, "NETWORK_ERROR", durationSeconds, imageUris.length);
        store.setError({
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "An unexpected error occurred.",
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
