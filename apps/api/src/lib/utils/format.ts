/**
 * Display formatting utilities.
 * All formatting logic for scores, dates, and labels lives here.
 */

import { formatScore } from "@/lib/config/scoring";

/**
 * Returns the score as a display string with "/10" suffix.
 * Example: score 9.0 → "9.0/10", score 4.5 → "4.5/10"
 */
export function displayScore(score: number): string {
  return `${formatScore(score)}/10`;
}

/**
 * Returns a human-readable time elapsed string.
 * Example: 18500ms → "18.5s"
 */
export function formatProcessingTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Returns a human-readable relative time string.
 * Example: "2 minutes ago", "just now"
 */
export function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Pluralizes "dish" based on count.
 * Example: 1 → "1 dish", 21 → "21 dishes"
 */
export function dishCount(count: number): string {
  return `${count} ${count === 1 ? "dish" : "dishes"}`;
}

/**
 * Truncates a string to maxLength characters with an ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}
