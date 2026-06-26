/**
 * On-device "is there any text here?" pre-check.
 *
 * Why: when a user photographs a non-menu (a wall, a face, a pet), there is no
 * point uploading it and paying for an LLM round-trip just to be told it isn't a
 * menu. We run Google ML Kit's on-device text recognition (free, offline, no
 * network) and, if the photo(s) contain essentially NO text, we treat it as
 * "not a menu" and skip the API entirely.
 *
 * This is intentionally a CONSERVATIVE gate. Real menus are dense with text, so
 * the only thing we reject here is "basically zero text". Anything ambiguous
 * (a little text, e.g. a sign or a label) still goes to the API, where the
 * NOT_A_MENU backstop in the OCR step makes the final call.
 *
 * The package recognizes Latin script by default. `recognize()` takes a local
 * file URI (not base64), so callers should pass the original captured/picked
 * photo URIs, before compression.
 */

import TextRecognition from "@react-native-ml-kit/text-recognition";

// -----------------------------------------------------------
// Tuning constants — adjust these to make the gate stricter/looser.
// -----------------------------------------------------------

/**
 * Minimum number of recognized text BLOCKS, across all photos combined, for the
 * upload to be considered "might be a menu". A menu has many blocks (sections,
 * dishes, descriptions); a non-menu photo typically yields 0. We require at
 * least this many to PROCEED. Keep this low so we never false-reject a real
 * (if sparse) menu — the API does the precise menu/not-menu judgement.
 */
export const MIN_TEXT_BLOCKS = 1;

/**
 * Minimum number of recognized characters (whitespace stripped), across all
 * photos combined, for the upload to be considered "might be a menu". Guards
 * against a single stray block holding one or two spurious characters. A real
 * menu easily clears this. Tune upward if false-positives (non-menus slipping
 * through) become common, but never so high that a small/partial menu fails.
 */
export const MIN_TEXT_CHARS = 12;

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Runs on-device text recognition across the given photo URIs and decides
 * whether there is enough text to bother sending to the API.
 *
 * Fails OPEN: if recognition throws (e.g. the native module isn't available in
 * a dev client, or a URI can't be read), we return `hasText: true` so the photo
 * still goes to the API. We never block a real menu because of a tooling issue.
 *
 * @param imageUris - Local file URIs of the captured/picked photos.
 * @returns `{ hasText, totalBlocks, totalChars }`
 */
export async function hasMenuText(imageUris: string[]): Promise<{
  hasText: boolean;
  totalBlocks: number;
  totalChars: number;
}> {
  if (imageUris.length === 0) {
    return { hasText: false, totalBlocks: 0, totalChars: 0 };
  }

  try {
    const results = await Promise.all(
      imageUris.map((uri) => TextRecognition.recognize(uri))
    );

    let totalBlocks = 0;
    let totalChars = 0;
    for (const result of results) {
      totalBlocks += result.blocks.length;
      totalChars += result.text.replace(/\s/g, "").length;
    }

    const hasText =
      totalBlocks >= MIN_TEXT_BLOCKS && totalChars >= MIN_TEXT_CHARS;

    return { hasText, totalBlocks, totalChars };
  } catch (error) {
    // Fail open — never block a real menu because recognition itself failed.
    console.warn("[menuTextCheck] text recognition failed, proceeding:", error);
    return { hasText: true, totalBlocks: 0, totalChars: 0 };
  }
}
