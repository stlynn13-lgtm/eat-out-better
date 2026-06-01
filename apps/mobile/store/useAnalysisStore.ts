import { create } from "zustand";
import type {
  AnalysisStatus,
  AnalysisError,
  RankedDish,
  MenuSession,
  MenuImage,
} from "@eat-out-better/shared";

interface AnalysisState {
  status: AnalysisStatus;
  progress: number;
  progressMessage: string;
  images: MenuImage[];
  results: RankedDish[] | null;
  session: MenuSession | null;
  error: AnalysisError | null;

  // Actions
  setStatus: (status: AnalysisStatus) => void;
  setProgress: (value: number, message?: string) => void;
  addImage: (image: MenuImage) => void;
  clearImages: () => void;
  setResults: (session: MenuSession) => void;
  setError: (error: AnalysisError) => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as AnalysisStatus,
  progress: 0,
  progressMessage: "",
  images: [] as MenuImage[],
  results: null,
  session: null,
  error: null,
};

export const useAnalysisStore = create<AnalysisState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setProgress: (value, message) =>
    set((state) => ({
      progress: value,
      progressMessage: message ?? state.progressMessage,
    })),

  addImage: (image) =>
    set((state) => ({ images: [...state.images, image] })),

  clearImages: () => set({ images: [] }),

  setResults: (session) =>
    set({
      status: "complete",
      results: session.dishes,
      session,
      error: null,
      progress: 100,
    }),

  setError: (error) =>
    set({
      status: "error",
      error,
    }),

  reset: () => set(initialState),
}));
