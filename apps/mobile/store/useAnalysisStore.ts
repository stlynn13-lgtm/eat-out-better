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
  /**
   * Set by the results screen's "Analyze New Menu" when the capture screen that
   * produced those results is still underneath it. That capture screen picks it
   * up, empties its photo tray and starts a fresh scan under this analytics id.
   * Deliberately NOT part of `initialState`, so `reset()` leaves it alone.
   */
  newScanRequest: string | null;

  setStatus: (status: AnalysisStatus) => void;
  setProgress: (value: number, message?: string) => void;
  addImage: (image: MenuImage) => void;
  clearImages: () => void;
  setResults: (session: MenuSession) => void;
  /** Swap in an edited copy of the scan on screen (a rename). Nothing else moves. */
  updateSession: (session: MenuSession) => void;
  requestNewScan: (scanSessionId: string) => void;
  consumeNewScanRequest: () => void;
  setError: (error: AnalysisError) => void;
  clearError: () => void;
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
  newScanRequest: null,

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

  updateSession: (session) =>
    set((state) => (state.session?.id === session.id ? { session } : {})),

  requestNewScan: (scanSessionId) => set({ newScanRequest: scanSessionId }),
  consumeNewScanRequest: () => set({ newScanRequest: null }),

  setError: (error) => set({ status: "error", error }),

  // Dismissing an error must clear the error object too — leaving it set made
  // stale errors hijack later renders (e.g. the results screen's error state).
  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
