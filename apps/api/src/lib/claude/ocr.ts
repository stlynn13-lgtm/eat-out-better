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
import { normalizeDishName } from "./dishName";
import type { ExtractedDish, UnreadableItem } from "@/lib/types";

const MAX_IMAGES = 10;
// Per-image (images run in parallel). Budgeted so OCR (≤25s) + ranking (≤30s)
// stays inside the route's maxDuration of 60s — previously 30s + 60s could hit
// 90s and Vercel killed the function mid-scan.
const OCR_TIMEOUT_MS = 25_000;
// Haiku 4.5 supports large outputs; 8k tokens comfortably fits a dense menu
// page (~150+ dishes with descriptions). The old 2k cap truncated dense menus
// mid-JSON, which parsed as garbage and false-rejected real menus (EAT bug).
const OCR_MAX_TOKENS = 8_192;

/**
 * Result of the OCR step.
 * - `isMenu`: did the image(s) look like a restaurant menu at all? Used by the
 *   caller to distinguish "not a menu" (NOT_A_MENU) from "menu but unreadable"
 *   (OCR_EMPTY). Aggregated across pages: true if ANY page looked like a menu.
 * - `dishes`: merged, deduplicated dishes extracted across all pages.
 * - `unreadable`: text the model saw but could NOT confidently read as a dish
 *   (blur, glare, handwriting). Surfaced separately, NEVER ranked (EAT-9) —
 *   the alternative was guessing it into `dishes`, i.e. hallucination.
 */
export interface OcrResult {
  isMenu: boolean;
  dishes: ExtractedDish[];
  unreadable: UnreadableItem[];
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
  const allUnreadable: UnreadableItem[] = [];
  let failureCount = 0;
  // Aggregate across pages: treat the upload as a menu if ANY page looked like
  // one. A multi-page menu with a blank/odd page shouldn't be rejected.
  let anyMenu = false;

  for (const result of perImageResults) {
    if (result.status === "fulfilled") {
      if (result.value.isMenu) anyMenu = true;
      allDishes.push(...result.value.dishes);
      allUnreadable.push(...result.value.unreadable);
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

  return {
    isMenu: anyMenu,
    dishes: deduplicateDishes(allDishes),
    unreadable: deduplicateUnreadable(allUnreadable),
  };
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

    if (message.stop_reason === "max_tokens") {
      // Truncated output — parseOcrResponse will salvage what it can.
      console.warn(
        `[OCR] Response for image ${imageIndex + 1} hit max_tokens (${OCR_MAX_TOKENS}); output truncated`
      );
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
    // Unparseable — most often a truncated response on a dense menu page.
    // Salvage every complete dish object we can find rather than discarding
    // the page. Previously this returned `isMenu: false`, which told users
    // with perfectly real (dense) menus "that doesn't look like a menu".
    const salvaged = salvageDishesFromTruncatedJson(cleaned);
    if (salvaged.length > 0) {
      console.warn(
        `[OCR] Salvaged ${salvaged.length} dishes from unparseable JSON for image ${imageIndex + 1}`
      );
      return { isMenu: true, dishes: salvaged, unreadable: [] };
    }
    console.error(
      `[OCR] Failed to parse JSON for image ${imageIndex + 1}:`,
      cleaned.slice(0, 200)
    );
    // Nothing salvageable — treat this image as a *failure*, not "not a
    // menu". The caller's Promise.allSettled counts it against failureCount;
    // other pages still decide the menu/not-menu question.
    throw new Error(
      `OCR returned unparseable JSON for image ${imageIndex + 1}`
    );
  }

  // New shape: { isMenu, dishes, unreadable }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as {
      isMenu?: unknown;
      dishes?: unknown;
      unreadable?: unknown;
    };
    const rawDishes = Array.isArray(obj.dishes) ? obj.dishes : [];
    const dishes = sanitizeDishes(rawDishes);
    // EAT-9: text the model couldn't confidently read is routed here instead of
    // being guessed into `dishes`. Never ranked — surfaced separately.
    const rawUnreadable = Array.isArray(obj.unreadable) ? obj.unreadable : [];
    const unreadable = sanitizeUnreadable(rawUnreadable);
    // Default isMenu sensibly: if the model omitted the flag but found dishes,
    // treat it as a menu rather than rejecting a real one.
    const isMenu =
      typeof obj.isMenu === "boolean" ? obj.isMenu : dishes.length > 0;
    return { isMenu, dishes, unreadable };
  }

  // Legacy shape: bare array. Assume it's a menu for backward compatibility.
  if (Array.isArray(parsed)) {
    return { isMenu: true, dishes: sanitizeDishes(parsed), unreadable: [] };
  }

  console.error(
    `[OCR] Unexpected JSON shape for image ${imageIndex + 1}, got:`,
    typeof parsed
  );
  // A malformed response is a failure of THIS image, not evidence that the
  // user's photo isn't a menu.
  throw new Error(`OCR returned unexpected JSON shape for image ${imageIndex + 1}`);
}

/**
 * Best-effort recovery of complete dish objects from truncated/malformed JSON.
 * Matches `{"name": "...", "description": "..."}` fragments individually so a
 * response cut off mid-array still yields every dish before the cutoff.
 */
function salvageDishesFromTruncatedJson(text: string): ExtractedDish[] {
  const dishPattern =
    /\{\s*"name"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*"description"\s*:\s*"((?:[^"\\]|\\.)*)"\s*)?\}/g;
  const dishes: ExtractedDish[] = [];
  let match: RegExpExecArray | null;
  while ((match = dishPattern.exec(text)) !== null) {
    try {
      // Re-parse each fragment so escape sequences are decoded correctly.
      const obj = JSON.parse(match[0]) as { name?: unknown; description?: unknown };
      if (typeof obj.name === "string" && obj.name.trim().length > 0) {
        dishes.push({
          name: obj.name.trim(),
          description:
            typeof obj.description === "string" && obj.description.trim()
              ? obj.description.trim()
              : undefined,
        });
      }
    } catch {
      // Skip fragments that still don't parse
    }
  }
  return dishes;
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

/** Coerces a raw parsed array into validated UnreadableItem records (EAT-9). */
function sanitizeUnreadable(raw: unknown[]): UnreadableItem[] {
  return raw
    .filter(
      (item): item is { text: string; reason?: string } =>
        !!item &&
        typeof item === "object" &&
        typeof (item as { text?: unknown }).text === "string" &&
        (item as { text: string }).text.trim().length > 0
    )
    .map((item) => ({
      text: item.text.trim(),
      reason: item.reason?.trim() || undefined,
    }));
}

/** Deduplicates unreadable items by best-guess text (case-insensitive). */
function deduplicateUnreadable(items: UnreadableItem[]): UnreadableItem[] {
  const seen = new Map<string, UnreadableItem>();
  for (const item of items) {
    const key = item.text.toLowerCase().trim();
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

/**
 * Deduplicates dishes by canonical name.
 *
 * A description is only trusted when every occurrence of that dish that carries
 * one agrees. If the same dish name arrives with two DIFFERENT descriptions, at
 * least one is wrong — on a dense multi-column menu that is the signature of a
 * description being paired with the wrong dish — and we cannot tell which. We
 * keep the name alone. A dish with no description scores fine; a dish carrying
 * another dish's description produces exactly the "coffee described as an
 * arugula salad" failure (EAT-9).
 *
 * Collecting every description first makes this independent of page order. The
 * previous pass-by-pass version compared each dish only against the entry it
 * happened to find, which let the guard be walked around two ways: a wrongly
 * described copy silently overwrote a bare one (nothing to disagree with yet),
 * and once a conflict HAD dropped a description, the next page repeating that
 * description put it straight back — a 3-page menu could re-poison the dish the
 * guard had just cleaned.
 */
export function deduplicateDishes(dishes: ExtractedDish[]): ExtractedDish[] {
  const order: string[] = [];
  const nameByKey = new Map<string, string>();
  const descriptionsByKey = new Map<string, Map<string, string>>();

  for (const dish of dishes) {
    const key = normalizeDishName(dish.name);
    if (!key) continue; // punctuation-only name — nothing rankable
    if (!nameByKey.has(key)) {
      order.push(key);
      nameByKey.set(key, dish.name);
      descriptionsByKey.set(key, new Map());
    }
    if (dish.description) {
      // Compare case-insensitively, but keep the first spelling we saw.
      const variants = descriptionsByKey.get(key)!;
      const descKey = dish.description.trim().toLowerCase();
      if (!variants.has(descKey)) variants.set(descKey, dish.description);
    }
  }

  return order.map((key) => {
    const variants = descriptionsByKey.get(key)!;
    const name = nameByKey.get(key)!;
    if (variants.size > 1) {
      console.warn(
        `[OCR] ${variants.size} conflicting descriptions for "${name}" — dropping all as unreliable`
      );
      return { name, description: undefined };
    }
    return { name, description: variants.values().next().value };
  });
}
