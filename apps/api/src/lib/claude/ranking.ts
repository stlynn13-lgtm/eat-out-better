/**
 * Step 2: Extracted dish list → ranked dish list.
 *
 * Takes the output of ocr.ts and sends a single ranking request to Claude.
 * Returns dishes sorted by rank (1 = best), each with a score, explanation, tier, and tag.
 */

import { v4 as uuidv4 } from "uuid";
import { getAnthropicClient, MODELS } from "./client";
import { getRankingSystemPrompt, getRankingUserPrompt } from "./prompts";
import {
  normalizeDishName,
  namesPlausiblyMatch,
  matchesNameWithDescription,
} from "./dishName";
import { getTier, getTag } from "@/lib/config/scoring";
import type { ExtractedDish, RankedDish, HealthConditionId } from "@/lib/types";

const MAX_DISHES = 100;
// Dishes are ranked in parallel chunks so one request never needs a huge
// output. Why: a single 100-dish call needed >8k output tokens (truncated →
// every dish silently fell back to 5.0) and could outlive Vercel's 60s
// function limit. Scores are absolute (rubric-based), so chunks can be scored
// independently and merged by score afterwards.
//
// CAREFUL: the "item" number the model returns is the dish's position within
// ITS OWN CHUNK — every chunk is numbered from 1. It is only meaningful next to
// the dish list that chunk was sent, so it must be resolved to a real dish
// inside callRankingAPI, before results from different chunks are merged. Never
// carry a raw item number across the merge; on a 40-dish menu there are two
// dishes called "item 1".
const RANKING_CHUNK_SIZE = 35;
const RANKING_TIMEOUT_MS = 30_000; // per chunk — OCR (≤25s) + ranking (≤30s) fits maxDuration 60
const RANKING_MAX_TOKENS = 8_192; // per chunk: 35 dishes × ~80 tokens ≈ 3k, ample headroom

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Ranks a list of extracted dishes by heart-health impact (high cholesterol).
 *
 * @param dishes - Output of extractDishesFromImages()
 * @param conditionId - Health condition to optimize for
 * @returns Ranked dish list (rank 1 = best choice)
 */
export async function rankDishes(
  dishes: ExtractedDish[],
  conditionId: HealthConditionId = "high_cholesterol"
): Promise<RankedDish[]> {
  if (dishes.length === 0) {
    throw new Error("Cannot rank an empty dish list");
  }

  // Cap to prevent enormous prompts
  const dishesToRank = dishes.slice(0, MAX_DISHES);

  if (dishes.length > MAX_DISHES) {
    console.warn(
      `[Ranking] Truncated dish list from ${dishes.length} to ${MAX_DISHES}`
    );
  }

  // Rank in parallel chunks (single call for small menus). If a chunk fails,
  // its dishes get neutral fallbacks instead of failing the entire scan.
  const chunks: ExtractedDish[][] = [];
  for (let i = 0; i < dishesToRank.length; i += RANKING_CHUNK_SIZE) {
    chunks.push(dishesToRank.slice(i, i + RANKING_CHUNK_SIZE));
  }

  const settled = await Promise.allSettled(
    chunks.map((chunk) => callRankingAPI(chunk, conditionId))
  );

  const merged: RawRankedDish[] = [];
  let failedChunks = 0;
  for (const [i, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      merged.push(...result.value);
    } else {
      failedChunks++;
      console.error(`[Ranking] Chunk ${i + 1}/${chunks.length} failed:`, result.reason);
      merged.push(...generateFallbackRankings(chunks[i]));
    }
  }

  // If every chunk failed, surface the error to the route (CLAUDE_ERROR /
  // RATE_LIMIT) rather than returning an all-5.0 "ranking".
  if (failedChunks === chunks.length) {
    const firstError = settled.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    throw firstError?.reason instanceof Error
      ? firstError.reason
      : new Error("All ranking requests failed");
  }

  // Global order: score descending (scores are absolute per the rubric), then
  // sequential ranks 1..n. This is the ONLY place rank is assigned — the model
  // is no longer asked to order anything, since its ordering was always
  // overwritten here and asking for it only risked drifting the item numbers
  // we now use to identify dishes (EAT-18).
  merged.sort((a, b) => b.score - a.score);
  const reranked: RankedRawDish[] = merged.map((dish, i) => ({ ...dish, rank: i + 1 }));

  return enrichRankings(reranked, dishesToRank);
}

// -----------------------------------------------------------
// Private helpers
// -----------------------------------------------------------

/**
 * A scored dish before ordering. Deliberately has no `rank` and no trace of the
 * input "item" number: rank is assigned globally once every chunk is back
 * (rankDishes), and the item number is an internal join key that must never
 * reach the client — it is the model's line number, not a menu position, and
 * showing it next to a dish would read as a rank the user can't explain.
 */
interface RawRankedDish {
  name: string;
  score: number;
  explanation: string;
  substitution: string | null;
}

/** A scored dish that has been given its final display position (1 = best). */
type RankedRawDish = RawRankedDish & { rank: number };

async function callRankingAPI(
  dishes: ExtractedDish[],
  conditionId: HealthConditionId
): Promise<RawRankedDish[]> {
  const client = getAnthropicClient();

  const systemPrompt = getRankingSystemPrompt(conditionId);
  const userPrompt = getRankingUserPrompt(dishes, conditionId);

  let rawText: string;

  try {
    const message = await client.messages.create(
      {
        model: MODELS.HAIKU,
        max_tokens: RANKING_MAX_TOKENS,
        temperature: 0.2, // Low but not zero — allows nuanced scoring
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      },
      { timeout: RANKING_TIMEOUT_MS }
    );

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error(`Unexpected response type from ranking: ${content.type}`);
    }

    if (message.stop_reason === "max_tokens") {
      console.warn(
        `[Ranking] Response hit max_tokens (${RANKING_MAX_TOKENS}) for ${dishes.length} dishes; output truncated`
      );
    }

    rawText = content.text.trim();
  } catch (error) {
    throw new Error(
      `Claude ranking API error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return parseRankingResponse(rawText, dishes);
}

/**
 * Parses the JSON response from the ranking step.
 *
 * EAT-9 guard: the ranker may only return dishes that were actually extracted
 * from the menu. Every returned item is matched back to an input dish; anything
 * that does not match is DROPPED as a hallucination, and any input dish the
 * ranker omitted is re-added with a neutral fallback. The output set is
 * therefore exactly the OCR-extracted set — we can never rank a dish that was
 * not on the menu.
 *
 * EAT-18 changed HOW that match is made. Matching on the dish name alone made
 * the model's spelling load-bearing: it echoed back "Creme Brulee" for "Crème
 * Brûlée", nothing matched, and a correctly scored dish was discarded as a
 * hallucination and re-added unscored. Names are now the fallback, not the key.
 *
 * The join key is the "item" number we printed next to each dish, which can't
 * be re-spelled. But an index is only safer if it's right: a drifted index
 * silently attaches a score to the WRONG dish, which is worse than the bug it
 * replaced — a name mismatch fails visibly ("we couldn't score this"), a
 * mis-assigned score fails invisibly. So the index is always cross-checked
 * against the name before it is trusted, and anything ambiguous falls through
 * to exact name matching rather than being guessed at.
 *
 * Falls back gracefully if parsing fails — assigns default scores.
 */
export function parseRankingResponse(
  rawText: string,
  originalDishes: ExtractedDish[]
): RawRankedDish[] {
  // Strip markdown fences
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Ranking] Failed to parse JSON:", cleaned.slice(0, 300));
    return generateFallbackRankings(originalDishes);
  }

  if (!Array.isArray(parsed)) {
    console.error("[Ranking] Expected array, got:", typeof parsed);
    return generateFallbackRankings(originalDishes);
  }

  // Fallback lookup: normalized input name → its position in the input list.
  // Used only when the item number is missing or untrustworthy. Exact-match
  // only by design — see namesPlausiblyMatch's doc comment for why searching
  // by fuzzy name is unsafe even though confirming by it is fine.
  const indexByName = new Map<string, number>();
  originalDishes.forEach((dish, i) => {
    indexByName.set(normalizeDishName(dish.name), i);
  });

  // Keyed by input position, so two menu items that happen to normalize alike
  // can't evict each other.
  const scoredByIndex = new Map<number, RawRankedDish>();

  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    // Accept numeric-string scores — Claude occasionally quotes them, and
    // dropping the dish over that gave it a meaningless 5.0 fallback.
    if (
      typeof item.name !== "string" ||
      !Number.isFinite(Number(item.score)) ||
      typeof item.explanation !== "string"
    ) {
      continue;
    }

    const index = resolveDishIndex(item, originalDishes, indexByName);
    if (index === null) {
      // Either an invented dish, or a real one we can no longer identify.
      // Dropping it here is what leaves a gap for the neutral fallback below —
      // we never guess which dish a score belongs to.
      console.warn(
        `[Ranking] Dropped unmatched dish (item=${String(item.item)}, name="${item.name}")`
      );
      continue;
    }
    if (scoredByIndex.has(index)) continue; // dedupe repeated dishes

    scoredByIndex.set(index, {
      // Always the extracted name, never the model's echo of it. The user sees
      // what was printed on their menu.
      name: originalDishes[index].name,
      score: Math.min(Math.max(Number(Number(item.score).toFixed(1)), 1.0), 10.0),
      explanation: item.explanation as string,
      substitution: typeof item.substitution === "string" ? item.substitution : null,
    });
  }

  // Walk the input list so every extracted dish gets exactly one entry, in
  // input order. Driven off the input rather than a length comparison: counts
  // only line up while both steps key dishes identically, and a dish missing
  // its slot disappears silently. Ordering here doesn't matter — rankDishes
  // sorts everything by score once all chunks are back.
  return originalDishes.map((dish, i) => {
    const scored = scoredByIndex.get(i);
    if (scored) return scored;
    return {
      name: dish.name,
      score: 5.0,
      // Reached only when the ranker skipped a dish it was given — a service
      // failure, not a judgement about the dish. The old copy blamed
      // "insufficient information about preparation", which under EAT-17 is
      // never a reason to withhold a score and told the user something false
      // about their menu.
      explanation: "We couldn't score this one — treat this as a neutral score.",
      substitution: null,
    };
  });
}

/**
 * Which input dish does this returned item belong to? `null` means "don't
 * know" — never a guess, because a wrong answer here puts a real score on the
 * wrong dish.
 *
 * Order matters: the item number is checked first (it survives re-spelling),
 * but only accepted once the name it came with confirms it. That way index
 * drift degrades into an unscored dish rather than a mis-scored one.
 */
function resolveDishIndex(
  item: Record<string, unknown>,
  originalDishes: ExtractedDish[],
  indexByName: Map<string, number>
): number | null {
  const name = item.name as string;

  const rawItem = Number(item.item);
  if (Number.isInteger(rawItem) && rawItem >= 1 && rawItem <= originalDishes.length) {
    const index = rawItem - 1;
    const dish = originalDishes[index];
    // Two narrow checks rather than one loose one: a rename/abbreviation of the
    // name (EAT-18), or the name with this dish's own description appended
    // (EAT-19). Both are anchored to the dish the item number already named.
    if (
      namesPlausiblyMatch(dish.name, name) ||
      matchesNameWithDescription(dish, name)
    ) {
      return index;
    }
    // The number and the name disagree. Trust neither — fall through to an
    // exact name match, which is the more conservative of the two.
    console.warn(
      `[Ranking] item ${rawItem} claimed "${name}" but slot holds "${originalDishes[index].name}"; falling back to name match`
    );
  }

  return indexByName.get(normalizeDishName(name)) ?? null;
}

/**
 * Fallback if ranking API fails completely.
 * Returns dishes at neutral score so the UI doesn't break.
 */
function generateFallbackRankings(dishes: ExtractedDish[]): RawRankedDish[] {
  return dishes.map((dish) => ({
    name: dish.name,
    score: 5.0,
    // Honest neutral copy: the failure was on our side, not the user's
    // connection — the old message sent people off to debug their wifi.
    explanation: "We couldn't fully assess this dish — treat this as a neutral score.",
    substitution: null,
  }));
}

/**
 * Adds IDs, tier, tag, and the original OCR description to raw rankings.
 * This is the shape returned to the client.
 */
function enrichRankings(
  raw: RankedRawDish[],
  originalDishes: ExtractedDish[]
): RankedDish[] {
  // Re-attach menu descriptions extracted by OCR — the model isn't asked to
  // echo them back, so without this lookup they never reached the client.
  const descriptionsByName = new Map(
    originalDishes
      .filter((d) => d.description)
      .map((d) => [normalizeDishName(d.name), d.description as string])
  );

  return raw.map((dish) => ({
    id: uuidv4(),
    name: dish.name,
    description: descriptionsByName.get(normalizeDishName(dish.name)),
    score: dish.score,
    rank: dish.rank,
    explanation: dish.explanation,
    substitution: dish.substitution ?? undefined,
    tier: getTier(dish.score),
    tag: getTag(dish.score),
  }));
}
