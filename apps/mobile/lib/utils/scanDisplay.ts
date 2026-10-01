/**
 * How a saved scan is named and summarised on screen.
 *
 * One place, because three screens show the same scan (Saved scans, Results,
 * Account) and they must never disagree about what it is called.
 */

import type { MenuSession, RankedDish, ScoreTier } from "@eat-out-better/shared";

/**
 * The name to show: what the user typed, else what was printed on the menu.
 * `null` when there is neither — scans saved before 1.5.0, and menus whose
 * photos never showed the restaurant's name.
 */
export function scanName(session: MenuSession | null | undefined): string | null {
  const custom = session?.customName?.trim();
  if (custom) return custom;
  const printed = session?.restaurantName?.trim();
  return printed || null;
}

export const UNNAMED_SCAN = "Unnamed menu";

/** The best-ranked dish, which is what a scan is remembered by. */
export function topDish(session: MenuSession): RankedDish | null {
  if (!Array.isArray(session.dishes) || session.dishes.length === 0) return null;
  // Ranks restart at 1 in every category, so the highest score is the honest
  // "best thing we found" across the whole menu.
  return session.dishes.reduce((best, d) => (d.score > best.score ? d : best));
}

export type TierCounts = Record<ScoreTier, number>;

export function tierCounts(session: MenuSession): TierCounts {
  const counts: TierCounts = { green: 0, yellow: 0, red: 0 };
  for (const dish of session.dishes ?? []) {
    if (dish.tier in counts) counts[dish.tier] += 1;
  }
  return counts;
}

export interface HistoryStats {
  scans: number;
  dishes: number;
  greens: number;
}

export function historyStats(sessions: MenuSession[]): HistoryStats {
  let dishes = 0;
  let greens = 0;
  for (const session of sessions) {
    dishes += session.dishes?.length ?? 0;
    greens += tierCounts(session).green;
  }
  return { scans: sessions.length, dishes, greens };
}

/**
 * Tile colours for a scan's monogram. Every pair is white text on a fill dark
 * enough for 4.5:1, and none of them is a score colour's exact shade — the
 * tile is decoration, and must not read as a verdict on the restaurant.
 */
const TILE_COLORS = ["#1B4332", "#1E40AF", "#6D28D9", "#9D174D", "#0F766E", "#9A3412"] as const;

/** Stable per scan: the same scan keeps its colour across launches. */
export function tileColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TILE_COLORS[hash % TILE_COLORS.length];
}

/** First letter or digit of the name, for the tile. `null` when unnamed. */
export function monogram(name: string | null): string | null {
  // A plain range, not \p{L}: Unicode property escapes are not safe on every
  // JS engine this app has shipped on.
  const match = name?.match(/[A-Za-z0-9\u00C0-\u024F]/);
  return match ? match[0].toUpperCase() : null;
}
