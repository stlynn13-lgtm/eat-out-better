/**
 * Step 2: Extracted dish list → ranked dish list.
 *
 * Takes the output of ocr.ts and sends a single ranking request to Claude.
 * Returns dishes sorted by rank (1 = best), each with a score, explanation, tier, and tag.
 */

import { v4 as uuidv4 } from "uuid";
import { getAnthropicClient, MODELS } from "./client";
import { getRankingSystemPrompt, getRankingUserPrompt } from "./prompts";
import { getTier, getTag } from "@/lib/config/scoring";
import type { ExtractedDish, RankedDish, HealthConditionId } from "@/lib/types";

const MAX_DISHES = 100;
// Dishes are ranked in parallel chunks so one request never needs a huge
// output. Why: a single 100-dish call needed >8k output tokens (truncated →
// every dish silently fell back to 5.0) and could outlive Vercel's 60s
// function limit. Scores are absolute (rubric-based), so chunks can be scored
// independently and merged by score afterwards.
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
  // sequential ranks 1..n.
  merged.sort((a, b) => b.score - a.score);
  const reranked = merged.map((dish, i) => ({ ...dish, rank: i + 1 }));

  return enrichRankings(reranked, dishesToRank);
}

// -----------------------------------------------------------
// Private helpers
// -----------------------------------------------------------

interface RawRankedDish {
  name: string;
  score: number;
  rank: number;
  explanation: string;
  substitution: string | null;
}

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
 * Falls back gracefully if parsing fails — assigns default scores.
 */
function parseRankingResponse(
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

  const validated: RawRankedDish[] = parsed
    .filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== "object") return false;
      const o = item as Record<string, unknown>;
      // Accept numeric-string scores/ranks — Claude occasionally quotes them,
      // and dropping the dish over that gave it a meaningless 5.0 fallback.
      return (
        typeof o.name === "string" &&
        Number.isFinite(Number(o.score)) &&
        Number.isFinite(Number(o.rank)) &&
        typeof o.explanation === "string"
      );
    })
    .map((item) => ({
      name: item.name as string,
      score: Math.min(Math.max(Number(Number(item.score).toFixed(1)), 1.0), 10.0),
      rank: Number(item.rank),
      explanation: item.explanation as string,
      substitution: typeof item.substitution === "string" ? item.substitution : null,
    }));

  // If Claude returned fewer dishes than we sent, add fallbacks for missing
  // ones. Match on normalized names (lowercase, alphanumerics only) so a minor
  // rename by the model ("Chicken Parmigiana" → "Chicken Parmesan") doesn't
  // create both a renamed entry AND a duplicate 5.0 fallback.
  if (validated.length < originalDishes.length) {
    const rankedNames = new Set(validated.map((d) => normalizeDishName(d.name)));
    const missing = originalDishes.filter(
      (d) => !rankedNames.has(normalizeDishName(d.name))
    );
    const maxRank = validated.reduce((max, d) => Math.max(max, d.rank), 0);
    for (const [i, dish] of missing.entries()) {
      validated.push({
        name: dish.name,
        score: 5.0,
        rank: maxRank + i + 1,
        explanation: "Unable to assess — insufficient information about preparation.",
        substitution: null,
      });
    }
  }

  // Sort by the model's rank, then reassign sequential ranks (1..n) so
  // duplicates or gaps from the model never surface in the UI.
  validated.sort((a, b) => a.rank - b.rank);
  return validated.map((dish, i) => ({ ...dish, rank: i + 1 }));
}

/** Lowercase, alphanumerics only — tolerant matching for dish names. */
function normalizeDishName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Fallback if ranking API fails completely.
 * Returns dishes at neutral score so the UI doesn't break.
 */
function generateFallbackRankings(dishes: ExtractedDish[]): RawRankedDish[] {
  return dishes.map((dish, index) => ({
    name: dish.name,
    score: 5.0,
    rank: index + 1,
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
  raw: RawRankedDish[],
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
