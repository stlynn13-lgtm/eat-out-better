import { Platform } from "react-native";

import MenuTextDetectorModule, {
  TextDetectionResult,
} from "./MenuTextDetectorModule";

export type { TextDetectionResult };

/**
 * Thresholds for what counts as "this scan plausibly contains text worth
 * sending to the LLM". Tuned conservatively to reject only obvious non-text
 * photos (a dog, a wall, a face) while letting any real menu through. These
 * live in JS so they can be adjusted without a native rebuild.
 */
export const TEXT_PRECHECK = {
  /** Minimum recognized text blocks across the whole scan. */
  minBlocks: 3,
  /** Minimum total characters across the whole scan. */
  minChars: 24,
};

/**
 * Runs Apple's Vision text recognition on a single local image URI.
 * iOS only — resolves `null` on other platforms (no native module).
 */
export async function detectText(
  uri: string
): Promise<TextDetectionResult | null> {
  if (Platform.OS !== "ios") {
    return null;
  }
  return MenuTextDetectorModule.detectText(uri);
}

export type PrecheckOutcome = {
  hasText: boolean;
  blockCount: number;
  charCount: number;
};

/**
 * Decides whether aggregate Vision counts clear the text thresholds. Pure and
 * testable; kept separate from any native/IO so policy can be unit-tested.
 */
export function meetsTextThreshold(
  blockCount: number,
  charCount: number
): boolean {
  return (
    blockCount >= TEXT_PRECHECK.minBlocks && charCount >= TEXT_PRECHECK.minChars
  );
}

/**
 * On-device pre-check for a batch of captured photos. Returns whether the scan
 * collectively contains a meaningful amount of text.
 *
 * Fail-open: if detection isn't available (non-iOS) or errors out, we return
 * `hasText: true` so a pre-check bug can never block a legitimate menu — the
 * server-side OCR/LLM remains the source of truth.
 */
export async function scanHasMeaningfulText(
  uris: string[]
): Promise<PrecheckOutcome> {
  if (Platform.OS !== "ios" || uris.length === 0) {
    return { hasText: true, blockCount: 0, charCount: 0 };
  }

  let blockCount = 0;
  let charCount = 0;

  try {
    const results = await Promise.all(uris.map((uri) => detectText(uri)));
    for (const result of results) {
      if (!result) continue;
      blockCount += result.blockCount;
      charCount += result.charCount;
    }
  } catch {
    // Fail-open on any native/IO error.
    return { hasText: true, blockCount: 0, charCount: 0 };
  }

  return {
    hasText: meetsTextThreshold(blockCount, charCount),
    blockCount,
    charCount,
  };
}
