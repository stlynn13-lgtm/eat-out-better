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
const RANKING_TIMEOUT_MS = 60_000;
const RANKING_MAX_TOKENS = 8_192;

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

  const rawRankings = await callRankingAPI(dishesToRank, conditionId);
  return enrichRankings(rawRankings);
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
    .filter(
      (item): item is RawRankedDish =>
        item &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        typeof item.score === "number" &&
        typeof item.rank === "number" &&
        typeof item.explanation === "string"
    )
    .map((item) => ({
      name: item.name,
      score: Math.min(Math.max(Number(item.score.toFixed(1)), 1.0), 10.0),
      rank: item.rank,
      explanation: item.explanation,
      substitution: item.substitution ?? null,
    }));

  // If Claude returned fewer dishes than we sent, add fallbacks for missing ones
  if (validated.length < originalDishes.length) {
    const rankedNames = new Set(validated.map((d) => d.name.toLowerCase()));
    const missing = originalDishes.filter(
      (d) => !rankedNames.has(d.name.toLowerCase())
    );
    const startRank = validated.length + 1;
    for (const [i, dish] of missing.entries()) {
      validated.push({
        name: dish.name,
        score: 5.0,
        rank: startRank + i,
        explanation: "Unable to assess — insufficient information about preparation.",
        substitution: null,
      });
    }
  }

  return validated.sort((a, b) => a.rank - b.rank);
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
    explanation:
      "Analysis unavailable — check your connection and try again.",
    substitution: null,
  }));
}

/**
 * Adds IDs, tier, and tag to raw rankings.
 * This is the shape returned to the client.
 */
function enrichRankings(raw: RawRankedDish[]): RankedDish[] {
  return raw.map((dish) => ({
    id: uuidv4(),
    name: dish.name,
    score: dish.score,
    rank: dish.rank,
    explanation: dish.explanation,
    substitution: dish.substitution ?? undefined,
    tier: getTier(dish.score),
    tag: getTag(dish.score),
  }));
}
