/**
 * PostHog analytics — typed event capture for the menu scan funnel.
 *
 * All 6 P0 events + P1 session linking are implemented here.
 * Import the typed helpers and call them at the trigger points listed below.
 *
 * Trigger map:
 *   menu_scan_started       → capture.tsx useEffect (screen mount)
 *   menu_photo_captured     → capture.tsx handleCapture / handleGalleryPick
 *   menu_analyze_clicked    → capture.tsx handleAnalyze
 *   menu_analysis_completed → useAnalysis.ts (success path)
 *   menu_analysis_failed    → useAnalysis.ts (all failure paths)
 *   new_scan_initiated      → results.tsx "Analyze New Menu" button
 */

import Constants from "expo-constants";
import type { PostHog } from "posthog-react-native";

export const POSTHOG_API_KEY = "phc_rroZb6tXuPv7gbHFJBj5bPTdE2htHHKPmQYxY5ZLgWGF";
export const POSTHOG_HOST = "https://us.i.posthog.com";

// Derived from APP_ENV via eas.json build profile env vars.
// "development" = simulator, "preview" = TestFlight, "production" = App Store.
export const APP_ENVIRONMENT: string =
  Constants.expoConfig?.extra?.environment ?? "development";

// Call once at app startup (in _layout.tsx) to attach environment to every event.
export function registerSuperProperties(ph: PostHog): void {
  ph.register({ environment: APP_ENVIRONMENT });
}

// uuid's crypto.getRandomValues() is not supported by Hermes. Math.random()
// is sufficient for analytics session IDs — no cryptographic strength needed.
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// P1: module-level session ID — set once per scan attempt, read by any screen.
let _currentScanSessionId: string | null = null;

export function setCurrentScanSessionId(id: string): void {
  _currentScanSessionId = id;
}

export function getCurrentScanSessionId(): string | null {
  return _currentScanSessionId;
}

// ---------------------------------------------------------------------------
// Error type taxonomy (mirrors API error codes + client-side failures)
// ---------------------------------------------------------------------------
export type AnalysisErrorType =
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "CLAUDE_ERROR"
  | "OCR_EMPTY"
  | "UNKNOWN";

// ---------------------------------------------------------------------------
// Typed event helpers
// ---------------------------------------------------------------------------

export function trackMenuScanStarted(
  ph: PostHog,
  scanSessionId: string,
  entryPoint: "cold_start" | "loop_back"
): void {
  ph.capture("menu_scan_started", {
    scan_session_id: scanSessionId,
    entry_point: entryPoint,
  });
}

export function trackMenuPhotoCaptured(
  ph: PostHog,
  scanSessionId: string,
  photoCount: number
): void {
  ph.capture("menu_photo_captured", {
    scan_session_id: scanSessionId,
    photo_count: photoCount,
  });
}

export function trackMenuAnalyzeClicked(
  ph: PostHog,
  scanSessionId: string,
  pageCount: number
): void {
  ph.capture("menu_analyze_clicked", {
    scan_session_id: scanSessionId,
    page_count: pageCount,
  });
}

export function trackMenuAnalysisCompleted(
  ph: PostHog,
  scanSessionId: string,
  dishCount: number,
  analysisDurationSeconds: number
): void {
  ph.capture("menu_analysis_completed", {
    scan_session_id: scanSessionId,
    dish_count: dishCount,
    analysis_duration_seconds: analysisDurationSeconds,
  });
}

export function trackMenuAnalysisFailed(
  ph: PostHog,
  scanSessionId: string,
  errorType: AnalysisErrorType,
  analysisDurationSeconds: number,
  pageCount: number
): void {
  ph.capture("menu_analysis_failed", {
    scan_session_id: scanSessionId,
    error_type: errorType,
    analysis_duration_seconds: analysisDurationSeconds,
    page_count: pageCount,
  });
}

export function trackMenuProcessingStarted(
  ph: PostHog,
  scanSessionId: string,
  pageCount: number
): void {
  ph.capture("menu_processing_started", {
    scan_session_id: scanSessionId,
    page_count: pageCount,
  });
}

export function trackNewScanInitiated(
  ph: PostHog,
  previousScanSessionId: string,
  newScanSessionId: string
): void {
  ph.capture("new_scan_initiated", {
    previous_scan_session_id: previousScanSessionId,
    new_scan_session_id: newScanSessionId,
  });
}
