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

/**
 * Result of the OCR step.
 * - `isMenu`: did the image(s) look like a restaurant menu at all? Used by the
 *   caller to distinguish "not a menu" (NOT_A_MENU) from "menu but unreadable"
 *   (OCR_EMPTY). Aggregated across pages: true if ANY page looked like a menu.
 * - `dishes`: merged, deduplicated dishes extracted across all pages.
 */
export interface OcrResult {
  isMenu: boolean;
  dishes: ExtractedDish[];
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Extracts dishes from one or more base64-encoded menu images.
 *
 * Returns `{ isMenu, dishes }`. The caller uses this to distinguish:
 * - `isMenu: false` → NOT_A_MENU (the photo isn't a menu)
 * - `isMenu: true, dishes: []` → OCR_EMPTY (a menu, but nothing readable)
 *
 * @param base64Images - Array of base64-encoded JPEG strings (not data URIs)
 * @returns Aggregated menu flag plus merged, deduplicated dishes
 */
export async function extractDishesFromImages(
  base64Images: string[]
): Promise<OcrResult> {
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
  // Aggregate across pages: treat the upload as a menu if ANY page looked like
  // one. A multi-page menu with a blank/odd page shouldn't be rejected.
  let anyMenu = false;

  for (const result of perImageResults) {
    if (result.status === "fulfilled") {
      if (result.value.isMenu) anyMenu = true;
      allDishes.push(...result.value.dishes);
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

  return { isMenu: anyMenu, dishes: deduplicateDishes(allDishes) };
}

// -----------------------------------------------------------
// Private helpers
// -----------------------------------------------------------

async function extractFromSingleImage(
  base64: string,
  imageIndex: number
): Promise<OcrResult> {
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
 *
 * Handles two shapes defensively:
 *   - New: {"isMenu": boolean, "dishes": [...]}
 *   - Legacy: [...] (a bare array) — assumed to be a menu (isMenu: true) for
 *     backward compatibility, so an old-shaped response never false-rejects.
 */
function parseOcrResponse(rawText: string, imageIndex: number): OcrResult {
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
    // Couldn't parse — don't assume "not a menu"; let other images decide.
    return { isMenu: false, dishes: [] };
  }

  // New shape: { isMenu, dishes }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as { isMenu?: unknown; dishes?: unknown };
    const rawDishes = Array.isArray(obj.dishes) ? obj.dishes : [];
    const dishes = sanitizeDishes(rawDishes);
    // Default isMenu sensibly: if the model omitted the flag but found dishes,
    // treat it as a menu rather than rejecting a real one.
    const isMenu =
      typeof obj.isMenu === "boolean" ? obj.isMenu : dishes.length > 0;
    return { isMenu, dishes };
  }

  // Legacy shape: bare array. Assume it's a menu for backward compatibility.
  if (Array.isArray(parsed)) {
    return { isMenu: true, dishes: sanitizeDishes(parsed) };
  }

  console.error(
    `[OCR] Unexpected JSON shape for image ${imageIndex + 1}, got:`,
    typeof parsed
  );
  return { isMenu: false, dishes: [] };
}

/** Coerces a raw parsed array into validated ExtractedDish records. */
function sanitizeDishes(raw: unknown[]): ExtractedDish[] {
  return raw
    .filter(
      (item): item is { name: string; description?: string } =>
        !!item &&
        typeof item === "object" &&
        typeof (item as { name?: unknown }).name === "string" &&
        (item as { name: string }).name.trim().length > 0
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
