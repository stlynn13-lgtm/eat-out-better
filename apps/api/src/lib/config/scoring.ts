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
// Score from estimates (2026-10-05)
// -----------------------------------------------------------
//
// The model no longer picks a 1–10 score. It estimates what it actually knows
// about — grams of saturated fat and added sugar in a typical restaurant
// portion — and this function turns those into the score.
//
// Why: when the model chose the score itself, it graded on a curve. The same
// dish scored alone vs. inside its full menu changed colour 46 times in 194
// (carnitas 2.0 alone, 4.0 next to cheese curds), and its band table put
// "12–20g" at 3.0–4.5, straddling the red/yellow line, so a cluster of dishes
// sat at exactly 4.0. Here the curve is fixed, visible, and its knots land on
// the tier boundaries by construction. It is also tunable against the answer
// key offline (npm run eval:calibrate) instead of by rewording a prompt.

/** What the model estimates for one dish. */
export interface DishEstimates {
  /** Saturated fat, grams, typical restaurant portion. */
  satFatG: number;
  /** Added sugar, grams (not sugar naturally in fruit or milk). */
  addedSugarG: number;
  /** How much the dish's fat/fibre actively helps: mostly unsaturated fat
   * (oily fish, olive oil, nuts, avocado), soluble fibre, plant sterols. */
  protective: "none" | "some" | "strong";
  /** Deep-fried, battered or breaded. */
  fried: boolean;
}

/** A piecewise-linear curve: [input, score] knots, input ascending. */
export type Curve = readonly (readonly [number, number])[];

/**
 * Saturated fat → score. Knots sit on the tier lines: 5g is the green edge,
 * 11g — most of the AHA's ~13g daily budget in one dish — is the red edge.
 * 11g rather than 13g was calibrated against Ray's answer key (2026-10-05).
 */
export const SAT_FAT_CURVE: Curve = [
  [0, 10], [2, 8.5], [5, GREEN_MIN], [11, YELLOW_MIN], [18, 2.5], [30, SCORE_MIN],
];

/**
 * Added sugar → score, for drinks and desserts only (Ray, 2026-10-04: sugar
 * counts there; a sweet glaze on a main stays a saturated-fat call). 15g —
 * over half the AHA's ~25g daily limit in one item — is the red edge; 25g put
 * gulab jamun, donut holes and Thai iced tea (18–24g) in yellow where Ray
 * called them red.
 */
export const ADDED_SUGAR_CURVE: Curve = [
  [0, 10], [5, GREEN_MIN], [15, YELLOW_MIN], [40, SCORE_MIN],
];

/**
 * Deep-fried food loses a point beyond its saturated fat. The old rubric did
 * this ("about half a band"); dropping it assumed the gram estimate already
 * carried the frying, but egg rolls, onion rings and fish & chips came out at
 * 8–10g — yellow — where Ray called them red.
 */
export const FRIED_PENALTY = 1.0;

/** Credit for protective fat/fibre — the old rubric's +0.5 to +1.5. */
export const PROTECTIVE_BONUS: Record<DishEstimates["protective"], number> = {
  none: 0,
  some: 0.75,
  strong: 1.5,
};

/** Categories where added sugar counts against the score. */
const SUGAR_COUNTS_FOR = new Set(["dessert", "drink_non_alcoholic"]);

function onCurve(curve: Curve, x: number): number {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i];
    if (x <= x1) {
      const [x0, y0] = curve[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return curve[curve.length - 1][1];
}

/**
 * The score for one dish. The worse of the two factors decides — a fat-free
 * sweet drink is judged on its sugar, a cream dessert on whichever is worse.
 * Curves are parameters so the calibration script can try alternatives against
 * the answer key without touching this file.
 */
export function scoreFromEstimates(
  est: DishEstimates,
  category: string | undefined,
  curves: { satFat?: Curve; sugar?: Curve; bonus?: Record<DishEstimates["protective"], number> } = {}
): number {
  const fat = Math.min(
    onCurve(curves.satFat ?? SAT_FAT_CURVE, Math.max(0, est.satFatG)) +
      (curves.bonus ?? PROTECTIVE_BONUS)[est.protective] -
      (est.fried ? FRIED_PENALTY : 0),
    SCORE_MAX
  );
  const sugar =
    category && SUGAR_COUNTS_FOR.has(category)
      ? onCurve(curves.sugar ?? ADDED_SUGAR_CURVE, Math.max(0, est.addedSugarG))
      : SCORE_MAX;
  const score = Math.min(fat, sugar);
  return Number(Math.min(Math.max(score, SCORE_MIN), SCORE_MAX).toFixed(1));
}

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
  // The positive badge is NOT score-based any more — it goes to the best dish in
  // each category, assigned in ranking.ts where the grouping is known. A pure
  // score threshold gave every green dish the badge, which on a real menu meant
  // four cocktails wearing it.
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
  "best-in-category": "bg-brand-100 text-brand-800 font-medium",
  "enjoy-occasionally": "bg-score-redBg text-score-red font-medium",
};

/**
 * Fallback label. The positive badge is normally rendered per-category via
 * BEST_IN_CATEGORY_LABEL ("Best main"), because the badge is comparative — this
 * generic string is only for a context where the category isn't to hand.
 */
export const TAG_LABEL: Record<NonNullable<DishTag>, string> = {
  "best-in-category": "Best choice",
  "enjoy-occasionally": "Enjoy occasionally",
};
