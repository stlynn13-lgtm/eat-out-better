import type { ScoreTier, DishTag } from "../types/index.js";

export const SCORE_MIN = 1.0;
export const SCORE_MAX = 10.0;

export const GREEN_MIN = 7.0;
export const YELLOW_MIN = 4.0;
export const RED_MAX = YELLOW_MIN - 0.1; // 3.9

export const TOP_PICK_MIN = GREEN_MIN;
export const ENJOY_OCCASIONALLY_MAX = RED_MAX;

export function getTier(score: number): ScoreTier {
  if (score >= GREEN_MIN) return "green";
  if (score >= YELLOW_MIN) return "yellow";
  return "red";
}

export function getTag(score: number): DishTag {
  if (score >= TOP_PICK_MIN) return "top-pick";
  if (score <= ENJOY_OCCASIONALLY_MAX) return "enjoy-occasionally";
  return null;
}

export function formatScore(score: number): string {
  const clamped = Math.min(Math.max(score, SCORE_MIN), SCORE_MAX);
  return clamped.toFixed(1);
}

export function displayScore(score: number): string {
  return `${formatScore(score)}/10`;
}
