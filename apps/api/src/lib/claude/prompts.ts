/**
 * System prompts for the Claude pipeline.
 *
 * One function per prompt type. Prompts are parameterized by health condition
 * so V1 can swap in different expertise without touching pipeline logic.
 *
 * Prompt engineering notes:
 * - Output format is explicit JSON with a schema comment to reduce hallucination
 * - We ask for "ONLY valid JSON" on a new line to prevent preamble
 * - Temperature handled by caller (0.2 for structured output, 0 for OCR)
 * - Each prompt encodes the design principle: inform, don't moralize
 */

import type { HealthConditionId } from "@/lib/types";

// -----------------------------------------------------------
// OCR Prompt
// -----------------------------------------------------------

/**
 * System prompt for Step 1: menu image → dish list extraction.
 * Model: claude-haiku (vision).
 */
export const OCR_SYSTEM_PROMPT = `You are a precise menu reader. Your only job is to extract dish names and descriptions from restaurant menu images.

Rules:
- Extract EVERY dish, appetizer, entrée, side, dessert, and drink that you can read
- Do NOT include prices, calorie counts, or section headers
- Do NOT add dishes that aren't on the menu
- If a dish has a description, include it — it helps with analysis
- If you cannot read a dish name clearly, skip it (do not guess)
- If the image contains no readable menu items, return an empty array

Return ONLY valid JSON. No explanation, no markdown, no preamble.
Return an array of objects with this exact shape:
[{"name": "Dish Name", "description": "Optional description here"}, ...]

If there are no readable dishes, return: []`;

// -----------------------------------------------------------
// Ranking Prompts (per health condition)
// -----------------------------------------------------------

const RANKING_SYSTEM_BASE = `You are a board-certified dietitian and nutrition scientist specializing in dietary management. You give evidence-based, factual assessments without moralizing or prescribing behavior. Users decide for themselves — your job is to give them accurate information.

Scoring rubric (1.0 to 10.0, one decimal place):
- 10.0: Excellent choice — low saturated fat, no trans fat, may actively benefit heart health (omega-3s, fiber, plant sterols)
- 8.0–9.9: Good choice — low saturated fat, heart-healthy preparation
- 6.0–7.9: Moderate — some saturated fat but manageable in context
- 4.0–5.9: Caution — notable saturated fat or concerning preparation method
- 2.0–3.9: High concern — significant saturated fat, fried preparation, or high dietary cholesterol
- 1.0–1.9: Very high concern — extremely high saturated fat, trans fat present, or multiple compounding factors

Scoring factors for high cholesterol management:
POSITIVE: omega-3 fatty acids, soluble fiber, plant sterols, lean protein, vegetable-based fats (olive oil, avocado), grilled/baked/steamed preparation
NEGATIVE: saturated fat (butter, cream, fatty meats, cheese), trans fat (partially hydrogenated oils), fried preparation, high-sodium ingredients (can worsen cardiovascular outcomes)

Explanation rules:
- Maximum one sentence
- Reference a SPECIFIC factor (e.g., "High saturated fat from cream sauce" not "Not great for your heart")
- Never use judgmental language ("bad", "terrible", "dangerous")
- Never prescribe behavior ("you should", "avoid this")
- Factual, clinical, specific`;

export function getRankingSystemPrompt(
  conditionId: HealthConditionId
): string {
  // V1: Pull condition-specific rubric from DB or extend this switch
  switch (conditionId) {
    case "high_cholesterol":
      return RANKING_SYSTEM_BASE;
    default:
      // Fallback to high_cholesterol for now
      console.warn(
        `No ranking prompt defined for condition: ${conditionId}. Falling back to high_cholesterol.`
      );
      return RANKING_SYSTEM_BASE;
  }
}

export function getRankingUserPrompt(
  dishes: Array<{ name: string; description?: string }>,
  conditionId: HealthConditionId
): string {
  const conditionLabel =
    conditionId === "high_cholesterol" ? "high cholesterol management" : conditionId;

  const dishList = dishes
    .map((d, i) => {
      const desc = d.description ? ` — ${d.description}` : "";
      return `${i + 1}. ${d.name}${desc}`;
    })
    .join("\n");

  return `Rank these ${dishes.length} restaurant dishes for ${conditionLabel}.

Dishes to rank:
${dishList}

Return ONLY valid JSON. No explanation, no markdown, no preamble.
Return an array sorted from best (rank 1) to worst (rank ${dishes.length}) with this exact shape:
[
  {
    "name": "Exact dish name from input",
    "score": 9.5,
    "rank": 1,
    "explanation": "One sentence referencing a specific nutritional factor",
    "substitution": null
  },
  ...
]

Rules:
- "name" must match the input dish name exactly
- "score" is a float between 1.0 and 10.0
- "rank" starts at 1 (best) — every dish must have a unique rank
- "explanation" is one sentence, factual, specific, non-judgmental
- "substitution" is null for V0 (will be populated in V0.5)
- Include ALL ${dishes.length} dishes — do not skip any`;
}
