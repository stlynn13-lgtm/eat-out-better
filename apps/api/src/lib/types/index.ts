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

/**
 * Which group a menu item belongs to (EAT-20). Derived deterministically from the
 * item's name and its menu section — see config/categories.ts. Two of these are
 * never scored: alcohol (no saturated fat, so the rubric can only produce a
 * non-answer) and standalone condiments.
 */
export type DishCategory =
  | "main"
  | "side"
  | "dessert"
  | "drink_non_alcoholic"
  | "drink_alcoholic"
  | "condiment";

/** Raw dish extracted by OCR — pre-ranking */
export interface ExtractedDish {
  name: string;
  description?: string;
  /**
   * The menu section header this dish appeared under, verbatim ("STEAMED BAO").
   * A FACT read off the page, kept separate from the category derived from it, so
   * a mis-bucketed dish can be traced to the header that caused it. Absent means
   * the menu had no section here and the category was inferred from the name.
   */
  section?: string;
  /** Derived from `name` + `section` after extraction. See config/categories.ts. */
  category?: DishCategory;
}

/**
 * A dish read off the menu but deliberately not scored — alcohol and standalone
 * condiments. Shown and labelled rather than dropped: EAT-9's promise is that
 * what the user sees equals what was read off their menu, and silently removing
 * items is the bug class we've now fixed twice.
 */
export interface UnrankedItem {
  name: string;
  description?: string;
  category: DishCategory;
  /** Plain-language explanation shown to the user. */
  reason: string;
}

/** Text the OCR step saw but could NOT confidently read as a dish. Never ranked. */
export interface UnreadableItem {
  /** Our best-guess transcription of the text we couldn't confidently identify. */
  text: string;
  /** Short reason we couldn't read it (e.g. blur, glare, handwriting). */
  reason?: string;
}

/** Score tier based on 1–10 scale */
export type ScoreTier = "green" | "yellow" | "red";

/**
 * Badge shown on a dish card.
 *
 * "best-in-category" is COMPARATIVE, not evaluative: it marks the strongest
 * option in its group, whatever that group's absolute quality. The tier colour
 * carries the absolute judgment, so the two compose — "Best Main, 6.5, amber"
 * is both honest and useful. It replaced a score-only "top-pick" (score >= 7.0),
 * which put the badge on four cocktails and, once alcohol was excluded, gave a
 * menu with no green entrée no steer toward a meal at all.
 */
export type DishTag = "best-in-category" | "enjoy-occasionally" | null;

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
  /** Which group this dish belongs to; ranking is per-category, not one flat list. */
  category: DishCategory;
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
  /** Items OCR couldn't confidently read — surfaced separately, never ranked (EAT-9). */
  unreadableItems: UnreadableItem[];
  /** Items read fine but deliberately not scored — alcohol, standalone sauces (EAT-20). */
  unrankedItems: UnrankedItem[];
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
  unreadableItems?: UnreadableItem[];
  unrankedItems?: UnrankedItem[];
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
