/**
 * Step 1: Menu image(s) → extracted dish list.
 *
 * Sends each image to Claude Vision (Haiku) in parallel.
 * Merges and deduplicates results before returning.
 *
 * Design decision: parallel OCR per image (not concatenated).
 * - Allows per-image error handling
 * - Faster for multi-page menus (images processed simultaneously)
 * - Simpler deduplication (same dish on two pages → dedupe by name)
 */

import { getAnthropicClient, MODELS } from "./client";
import { OCR_SYSTEM_PROMPT } from "./prompts";
import type { ExtractedDish } from "@/lib/types";

const MAX_IMAGES = 10;
const OCR_TIMEOUT_MS = 30_000;
const OCR_MAX_TOKENS = 2_048;

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Extracts dishes from one or more base64-encoded menu images.
 * Returns an empty array if no dishes are found (not an error — triggers OCR_EMPTY in the caller).
 *
 * @param base64Images - Array of base64-encoded JPEG strings (not data URIs)
 * @returns Merged, deduplicated list of extracted dishes
 */
export async function extractDishesFromImages(
  base64Images: string[]
): Promise<ExtractedDish[]> {
  if (base64Images.length === 0) {
    throw new Error("At least one image is required for OCR");
  }

  if (base64Images.length > MAX_IMAGES) {
    throw new Error(`Maximum ${MAX_IMAGES} images per analysis session`);
  }

  // Run OCR on all images in parallel
  const perImageResults = await Promise.allSettled(
    base64Images.map((base64, index) => extractFromSingleImage(base64, index))
  );

  // Collect successful results; log failures
  const allDishes: ExtractedDish[] = [];
  let failureCount = 0;

  for (const result of perImageResults) {
    if (result.status === "fulfilled") {
      allDishes.push(...result.value);
    } else {
      failureCount++;
      console.error("[OCR] Image extraction failed:", result.reason);
    }
  }

  // If every image failed, propagate as an error
  if (failureCount === base64Images.length) {
    throw new Error(
      "All images failed OCR. Check image quality and Claude API connection."
    );
  }

  return deduplicateDishes(allDishes);
}

// -----------------------------------------------------------
// Private helpers
// -----------------------------------------------------------

async function extractFromSingleImage(
  base64: string,
  imageIndex: number
): Promise<ExtractedDish[]> {
  const client = getAnthropicClient();

  let rawText: string;

  try {
    const message = await client.messages.create(
      {
        model: MODELS.HAIKU,
        max_tokens: OCR_MAX_TOKENS,
        temperature: 0, // Deterministic — we want exact extraction, not creative interpretation
        system: OCR_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64,
                },
              },
              {
                type: "text",
                text: "Extract all dishes from this menu page. Return only valid JSON.",
              },
            ],
          },
        ],
      },
      { timeout: OCR_TIMEOUT_MS }
    );

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error(`Unexpected response type from OCR: ${content.type}`);
    }

    rawText = content.text.trim();
  } catch (error) {
    throw new Error(
      `Claude API error for image ${imageIndex + 1}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return parseOcrResponse(rawText, imageIndex);
}

/**
 * Parses the JSON response from the OCR step.
 * Strips markdown code fences if Claude adds them despite instructions.
 */
function parseOcrResponse(rawText: string, imageIndex: number): ExtractedDish[] {
  // Strip markdown code fences (Claude sometimes adds them despite instructions)
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(
      `[OCR] Failed to parse JSON for image ${imageIndex + 1}:`,
      cleaned.slice(0, 200)
    );
    return []; // Return empty rather than throwing — other images may succeed
  }

  if (!Array.isArray(parsed)) {
    console.error(
      `[OCR] Expected array for image ${imageIndex + 1}, got:`,
      typeof parsed
    );
    return [];
  }

  return parsed
    .filter(
      (item): item is { name: string; description?: string } =>
        item &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        item.name.trim().length > 0
    )
    .map((item) => ({
      name: item.name.trim(),
      description: item.description?.trim() || undefined,
    }));
}

/**
 * Deduplicates dishes by name (case-insensitive).
 * When duplicates exist (same dish on two menu pages), keep the one with a description.
 */
function deduplicateDishes(dishes: ExtractedDish[]): ExtractedDish[] {
  const seen = new Map<string, ExtractedDish>();

  for (const dish of dishes) {
    const key = dish.name.toLowerCase().trim();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, dish);
    } else if (!existing.description && dish.description) {
      // Prefer the entry that has a description
      seen.set(key, dish);
    }
  }

  return Array.from(seen.values());
}
