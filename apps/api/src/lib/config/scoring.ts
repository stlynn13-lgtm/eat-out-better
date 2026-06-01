/**
 * Centralized scoring configuration.
 *
 * All score thresholds, tier assignments, and tag rules live here.
 * Never hardcode these values in components or API routes.
 * Changing thresholds is a one-line edit in this file.
 *
 * Current config (confirmed with Sean 2026-05-27):
 *   Green  ≥ 7.0 → "Top pick"
 *   Yellow  4.0–6.9 → no tag
 *   Red    ≤ 3.9 → "Enjoy occasionally"
 */

import type { ScoreTier, DishTag } from "@/lib/types";

// -----------------------------------------------------------
// Thresholds
// -----------------------------------------------------------

/** Minimum score (inclusive) for the green tier. */
export const GREEN_MIN = 7.0;

/** Minimum score (inclusive) for the yellow tier. */
export const YELLOW_MIN = 4.0;

/** Maximum score (inclusive) for the red tier. Anything below YELLOW_MIN. */
export const RED_MAX = YELLOW_MIN - 0.1; // 3.9

/** Score at or above which a dish gets the "Top pick" tag. */
export const TOP_PICK_MIN = GREEN_MIN; // same as green tier

/** Score at or below which a dish gets the "Enjoy occasionally" tag. */
export const ENJOY_OCCASIONALLY_MAX = RED_MAX; // same as red tier

/** Valid score range */
export const SCORE_MIN = 1.0;
export const SCORE_MAX = 10.0;

// -----------------------------------------------------------
// Derived helpers
// -----------------------------------------------------------

/**
 * Assigns a tier from a raw score.
 * Score must be in [1.0, 10.0].
 */
export function getTier(score: number): ScoreTier {
  if (score >= GREEN_MIN) return "green";
  if (score >= YELLOW_MIN) return "yellow";
  return "red";
}

/**
 * Assigns a tag from a raw score.
 * Returns null for the yellow middle tier.
 */
export function getTag(score: number): DishTag {
  if (score >= TOP_PICK_MIN) return "top-pick";
  if (score <= ENJOY_OCCASIONALLY_MAX) return "enjoy-occasionally";
  return null;
}

/**
 * Display the score as a 1-decimal string, e.g. "9.0" or "4.5".
 * Clamps to valid range.
 */
export function formatScore(score: number): string {
  const clamped = Math.min(Math.max(score, SCORE_MIN), SCORE_MAX);
  return clamped.toFixed(1);
}

// -----------------------------------------------------------
// Tailwind class maps (avoids conditional logic in components)
// -----------------------------------------------------------

export const TIER_TEXT_COLOR: Record<ScoreTier, string> = {
  green: "text-score-green",
  yellow: "text-score-yellow",
  red: "text-score-red",
};

export const TIER_BG_COLOR: Record<ScoreTier, string> = {
  green: "bg-score-greenBg",
  yellow: "bg-score-yellowBg",
  red: "bg-score-redBg",
};

export const TIER_BORDER_COLOR: Record<ScoreTier, string> = {
  green: "border-score-greenBorder",
  yellow: "border-score-yellowBorder",
  red: "border-score-redBorder",
};

export const TIER_LEFT_BORDER: Record<ScoreTier, string> = {
  green: "border-l-score-green",
  yellow: "border-l-score-yellow",
  red: "border-l-score-red",
};

export const TIER_BADGE_STYLE: Record<ScoreTier, string> = {
  green: "bg-score-greenBg text-score-green border border-score-greenBorder",
  yellow: "bg-score-yellowBg text-score-yellow border border-score-yellowBorder",
  red: "bg-score-redBg text-score-red border border-score-redBorder",
};

export const TAG_STYLE: Record<NonNullable<DishTag>, string> = {
  "top-pick": "bg-brand-100 text-brand-800 font-medium",
  "enjoy-occasionally": "bg-score-redBg text-score-red font-medium",
};

export const TAG_LABEL: Record<NonNullable<DishTag>, string> = {
  "top-pick": "Top pick",
  "enjoy-occasionally": "Enjoy occasionally",
};
