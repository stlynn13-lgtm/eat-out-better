/**
 * @eat-out-better/shared — Domain types
 * Shared between apps/mobile and apps/api.
 * Never import from one app into another directly — always go through this package.
 */

// ---- Health conditions ----

export type HealthConditionId =
  | "high_cholesterol"
  | "gluten_free"
  | "diabetes"
  | "hypertension"
  | string; // forward-compat: V1 adds new conditions as DB rows

// ---- Scoring ----

export type ScoreTier = "green" | "yellow" | "red";
export type DishTag = "best-in-category" | "enjoy-occasionally" | null;

// ---- Analysis pipeline status ----

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

// ---- Core dish types ----

/** Raw dish extracted from OCR — before scoring */
export interface ExtractedDish {
  name: string;
  description?: string;
}

/** Text the OCR step saw but could NOT confidently read as a dish. Never ranked. */
export interface UnreadableItem {
  text: string;
  reason?: string;
}

/** Fully scored and ranked dish — the main output unit */
export type DishCategory =
  | "main"
  | "side"
  | "dessert"
  | "drink_non_alcoholic"
  | "drink_alcoholic"
  | "condiment";

/** Read off the menu but deliberately not scored — alcohol, standalone sauces (EAT-20). */
export interface UnrankedItem {
  name: string;
  description?: string;
  category: DishCategory;
  reason: string;
}

export interface RankedDish {
  id: string;
  name: string;
  description?: string;
  category: DishCategory;
  score: number;       // 1.0–10.0
  rank: number;        // 1 = best
  explanation: string;
  substitution?: string;  // V0.5+
  tier: ScoreTier;
  tag: DishTag;
  ocrConfidence?: "high" | "medium" | "low"; // V0.5+
}

// ---- Session ----

export interface MenuSession {
  id: string;
  healthCondition: HealthConditionId;
  dishes: RankedDish[];
  rawDishes: ExtractedDish[];
  unreadableItems?: UnreadableItem[]; // EAT-9: items we couldn't confidently read
  dishCount: number;
  processingTimeMs: number;
  createdAt: string; // ISO 8601
}

// ---- API request/response ----

export interface AnalyzeRequest {
  images: string[];          // base64-encoded JPEG strings
  healthCondition: HealthConditionId;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: MenuSession;
  error?: AnalysisError;
}

// ---- Image ----

export interface MenuImage {
  base64: string;
  previewUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}
