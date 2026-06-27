// ============================================================
// Core domain types for Eat Out Better
// Designed to support V0 (high_cholesterol, no auth) through
// V1 (multi-condition, user accounts, backend persistence)
// ============================================================

// -----------------------------------------------------------
// Health conditions
// -----------------------------------------------------------

/** Registry key for a health condition. V0 always uses 'high_cholesterol'. */
export type HealthConditionId =
  | "high_cholesterol"
  | "gluten_free"       // V1
  | "diabetes"          // V1
  | "hypertension"      // V1
  | string;             // Future conditions added via DB

export interface HealthCondition {
  id: HealthConditionId;
  name: string;
  description: string;
  active: boolean;
}

// -----------------------------------------------------------
// Images
// -----------------------------------------------------------

export interface MenuImage {
  /** Object URL for preview (revoked after upload) */
  previewUrl: string;
  /** Base64-encoded data URI for API submission */
  base64: string;
  /** Original file size in bytes (before compression) */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** MIME type after compression (always image/jpeg) */
  mimeType: "image/jpeg";
}

// -----------------------------------------------------------
// Dishes
// -----------------------------------------------------------

/** Raw dish extracted by OCR — pre-ranking */
export interface ExtractedDish {
  name: string;
  description?: string;
}

/** Score tier based on 1–10 scale */
export type ScoreTier = "green" | "yellow" | "red";

/** Label shown on a dish card */
export type DishTag = "top-pick" | "enjoy-occasionally" | null;

/** Fully ranked dish — the core output of the pipeline */
export interface RankedDish {
  /** UUID assigned client-side */
  id: string;
  name: string;
  description?: string;
  /** Float 1.0–10.0. 10 = best for heart health. */
  score: number;
  /** Rank position (1 = best) */
  rank: number;
  /** One-line explanation referencing a specific cholesterol factor */
  explanation: string;
  /** V0.5+: "Ask for grilled instead of fried" */
  substitution?: string;
  /** Derived from score via scoring config */
  tier: ScoreTier;
  /** Derived from score via scoring config */
  tag: DishTag;
  /** V0.5+: How confident was OCR on this dish name */
  ocrConfidence?: "high" | "medium" | "low";
}

// -----------------------------------------------------------
// Analysis pipeline
// -----------------------------------------------------------

export type AnalysisStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "ranking"
  | "complete"
  | "error";

export type AnalysisErrorCode =
  | "OCR_EMPTY"
  | "NOT_A_MENU"
  | "CLAUDE_ERROR"
  | "INVALID_IMAGE"
  | "RATE_LIMIT"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface AnalysisError {
  code: AnalysisErrorCode;
  message: string;
}

// -----------------------------------------------------------
// API request / response shapes
// -----------------------------------------------------------

export interface AnalyzeRequest {
  /** Base64-encoded JPEG images (raw base64, not data URI) */
  images: string[];
  healthCondition: HealthConditionId;
}

export interface AnalyzeResponseData {
  /** Session UUID — matches MenuSession.id in shared types */
  id: string;
  dishes: RankedDish[];
  /** Pre-ranking extract — returned for V0.5 correction UI */
  rawDishes: ExtractedDish[];
  dishCount: number;
  processingTimeMs: number;
  healthCondition: HealthConditionId;
  /** ISO 8601 timestamp of when analysis completed */
  createdAt: string;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: AnalyzeResponseData;
  error?: AnalysisError;
}

// -----------------------------------------------------------
// Session (localStorage in V0, Supabase in V1)
// -----------------------------------------------------------

export interface MenuSession {
  id: string;
  healthCondition: HealthConditionId;
  dishes: RankedDish[];
  rawDishes: ExtractedDish[];
  dishCount: number;
  processingTimeMs: number;
  /** ISO string */
  createdAt: string;
}

// -----------------------------------------------------------
// Zustand store shape
// -----------------------------------------------------------

export interface AnalysisStore {
  // ---- Image state ----
  images: MenuImage[];
  addImage: (image: MenuImage) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;

  // ---- Analysis state ----
  status: AnalysisStatus;
  /** 0–100 */
  progress: number;
  progressMessage: string;
  results: RankedDish[] | null;
  session: MenuSession | null;
  error: AnalysisError | null;

  // ---- Actions ----
  setStatus: (status: AnalysisStatus) => void;
  setProgress: (progress: number, message?: string) => void;
  setResults: (data: AnalyzeResponseData) => void;
  setError: (error: AnalysisError) => void;
  reset: () => void;
}
