"use client";

/**
 * Zustand store — global analysis state.
 *
 * Manages the full lifecycle from image selection through results display.
 * The store is the single source of truth for the current analysis session.
 *
 * Design notes:
 * - Actions are separate from state for clean TypeScript inference
 * - No async logic here — async work lives in useAnalysis hook
 * - Store is client-only ("use client" directive above)
 */

import { create } from "zustand";
import { revokePreviewUrl } from "@/lib/utils/image";
import type {
  AnalysisStore,
  AnalysisStatus,
  AnalysisError,
  MenuImage,
  AnalyzeResponseData,
  RankedDish,
  MenuSession,
} from "@/lib/types";

const initialState = {
  images: [] as MenuImage[],
  status: "idle" as AnalysisStatus,
  progress: 0,
  progressMessage: "",
  results: null as RankedDish[] | null,
  session: null as MenuSession | null,
  error: null as AnalysisError | null,
};

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  ...initialState,

  // ---- Image actions ----

  addImage: (image: MenuImage) =>
    set((state) => ({
      images: [...state.images, image],
    })),

  removeImage: (index: number) => {
    const { images } = get();
    const removed = images[index];
    if (removed) {
      revokePreviewUrl(removed.previewUrl);
    }
    set((state) => ({
      images: state.images.filter((_, i) => i !== index),
    }));
  },

  clearImages: () => {
    const { images } = get();
    images.forEach((img) => revokePreviewUrl(img.previewUrl));
    set({ images: [] });
  },

  // ---- Analysis state actions ----

  setStatus: (status: AnalysisStatus) => set({ status }),

  setProgress: (progress: number, message?: string) =>
    set({
      progress: Math.min(Math.max(progress, 0), 100),
      ...(message !== undefined && { progressMessage: message }),
    }),

  setResults: (data: AnalyzeResponseData) => {
    const session: MenuSession = {
      id: data.sessionId,
      healthCondition: data.healthCondition,
      dishes: data.dishes,
      rawDishes: data.rawDishes,
      dishCount: data.dishCount,
      processingTimeMs: data.processingTimeMs,
      createdAt: new Date().toISOString(),
    };

    set({
      status: "complete",
      progress: 100,
      progressMessage: "Done!",
      results: data.dishes,
      session,
      error: null,
    });
  },

  setError: (error: AnalysisError) =>
    set({
      status: "error",
      error,
    }),

  // ---- Full reset (returns to Welcome or Capture) ----
  reset: () => {
    const { images } = get();
    images.forEach((img) => revokePreviewUrl(img.previewUrl));
    set({ ...initialState });
  },
}));
