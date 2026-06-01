"use client";

/**
 * useAnalysis — orchestrates the full analysis pipeline.
 *
 * Coordinates: image compression → API call → progress simulation → result storage.
 * All async business logic lives here, not in the store or components.
 *
 * Progress simulation rationale:
 * The API call is a single POST and we don't have streaming back yet.
 * We simulate realistic progress increments based on observed timing:
 *   0–10%: image compression
 *  10–60%: OCR (varies by image count and size)
 *  60–95%: LLM ranking
 *  95–100%: response parsing and storage
 */

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { compressImage } from "@/lib/utils/image";
import { saveSession } from "@/lib/storage/session";
import { DEFAULT_CONDITION } from "@/lib/config/health";
import type { AnalyzeResponse, AnalyzeRequest, MenuImage } from "@/lib/types";

const ANALYSIS_API = "/api/analyze";

export function useAnalysis() {
  const router = useRouter();
  const store = useAnalysisStore();
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Progress simulation ----

  const startProgressSimulation = useCallback(
    (
      from: number,
      to: number,
      durationMs: number,
      message: string
    ) => {
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
    async (rawFiles: File[]) => {
      if (rawFiles.length === 0) return;

      store.setStatus("uploading");
      store.setProgress(0, "Preparing your photos…");

      const startTime = Date.now();

      try {
        // Step 1: Compress all images
        startProgressSimulation(0, 10, 2_000, "Preparing your photos…");
        const compressedImages: MenuImage[] = await Promise.all(
          rawFiles.map((file) => compressImage(file))
        );
        stopProgressSimulation();

        // Save compressed images to store for preview
        compressedImages.forEach((img) => store.addImage(img));

        // Step 2: Navigate to processing screen, then call API
        store.setStatus("extracting");
        router.push("/processing");

        // Simulate realistic progress across the full server-side pipeline.
        // The server handles OCR + ranking in a single call (~15-25s).
        // We can't observe individual steps, so we animate 10→88% over
        // 28s max, then jump to 100% when the response lands.
        startProgressSimulation(
          10,
          88,
          28_000,
          rawFiles.length > 1
            ? `Reading ${rawFiles.length} menu pages…`
            : "Reading your menu…"
        );

        // Build request
        const requestBody: AnalyzeRequest = {
          images: compressedImages.map((img) => img.base64),
          healthCondition: DEFAULT_CONDITION,
        };

        // Call the API (server-side: OCR → dedupe → rank, ~15-25s)
        const response = await fetch(ANALYSIS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        // Response received — stop simulation and push to near-complete
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
            json.error ?? {
              code: "UNKNOWN",
              message: "An unexpected error occurred. Please try again.",
            }
          );
          router.push("/capture");
          return;
        }

        // Handle OCR_EMPTY — no dishes extracted
        if (json.data.dishCount === 0) {
          store.setError({
            code: "OCR_EMPTY",
            message:
              "We couldn't read any dishes from your photo. Try again with better lighting or a clearer angle.",
          });
          router.push("/capture");
          return;
        }

        // Success
        store.setProgress(100, "Done!");
        store.setResults(json.data);

        // Persist to localStorage
        if (store.session) {
          saveSession(store.session);
        }

        // Navigate to results
        router.push("/results");
      } catch (error) {
        stopProgressSimulation();

        const message =
          error instanceof Error ? error.message : "An unexpected error occurred.";

        store.setError({
          code: "NETWORK_ERROR",
          message,
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
