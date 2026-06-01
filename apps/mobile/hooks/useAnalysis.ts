/**
 * useAnalysis — orchestrates the full analysis pipeline (React Native)
 *
 * Coordinates: image compression → API call → progress simulation → result storage.
 * Architecture is identical to the web version; only image utils and storage differ.
 *
 * Progress simulation:
 *   0–10%:  image compression
 *  10–88%:  single animation across the full server-side call (~15-25s)
 *  92%:     response received, parsing
 * 100%:     done
 */

import { useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { useAnalysisStore } from "../store/useAnalysisStore";
import { compressImageUri } from "../lib/utils/image";
import { saveSession } from "../lib/storage/session";
import { DEFAULT_CONDITION } from "@eat-out-better/shared";
import type { AnalyzeResponse, AnalyzeRequest } from "@eat-out-better/shared";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3000";
const ANALYSIS_API = `${API_URL}/api/analyze`;

export function useAnalysis() {
  const router = useRouter();
  const store = useAnalysisStore();
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Progress simulation ----

  const startProgressSimulation = useCallback(
    (from: number, to: number, durationMs: number, message: string) => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
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

  // ---- Main entry point ----

  const startAnalysis = useCallback(
    async (imageUris: string[]) => {
      if (imageUris.length === 0) return;

      store.setStatus("uploading");
      store.setProgress(0, "Preparing your photos…");

      try {
        // Step 1: Compress all images
        startProgressSimulation(0, 10, 2_000, "Preparing your photos…");
        const compressedImages = await Promise.all(
          imageUris.map((uri) => compressImageUri(uri))
        );
        stopProgressSimulation();

        // Save to store for preview
        compressedImages.forEach((img) => store.addImage(img));

        // Step 2: Navigate to processing screen, then call API
        store.setStatus("extracting");
        router.push("/processing");

        // Single simulation covering full server-side pipeline
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

        const response = await fetch(ANALYSIS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        stopProgressSimulation();
        store.setStatus("ranking");
        store.setProgress(92, "Finalizing results…");

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const json: AnalyzeResponse = await response.json();
        stopProgressSimulation();

        if (!json.success || !json.data) {
          store.setError(
            json.error ?? { code: "UNKNOWN", message: "An unexpected error occurred." }
          );
          router.push("/capture");
          return;
        }

        if (json.data.dishCount === 0) {
          store.setError({
            code: "OCR_EMPTY",
            message: "We couldn't read any dishes from your photo. Try again with better lighting.",
          });
          router.push("/capture");
          return;
        }

        store.setProgress(100, "Done!");
        store.setResults(json.data);
        await saveSession(json.data);
        router.push("/results");
      } catch (error) {
        stopProgressSimulation();
        store.setError({
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "An unexpected error occurred.",
        });
        router.push("/capture");
      }
    },
    [store, router, startProgressSimulation, stopProgressSimulation]
  );

  const resetAnalysis = useCallback(() => {
    stopProgressSimulation();
    store.reset();
    router.push("/capture");
  }, [store, router, stopProgressSimulation]);

  return {
    startAnalysis,
    resetAnalysis,
    status: store.status,
    progress: store.progress,
    progressMessage: store.progressMessage,
    results: store.results,
    session: store.session,
    error: store.error,
  };
}
