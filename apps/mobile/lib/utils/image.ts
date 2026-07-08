import * as ImageManipulator from "expo-image-manipulator";
import type { MenuImage } from "@eat-out-better/shared";

// Claude vision reads menu text reliably at ~1568px on the long edge; larger
// images just cost upload bytes. The resize caps the LONG edge (the old
// width-only resize let tall images through uncapped, and upscaled photos
// narrower than the max — both inflated uploads).
const MAX_DIMENSION = 1568;
const MIN_DIMENSION = 900; // never shrink the long edge below this — text becomes unreadable
const INITIAL_QUALITY = 0.8;
const MIN_QUALITY = 0.4;

/**
 * Vercel rejects route-handler request bodies over ~4.5MB at the platform
 * level (no server config can raise it). Base64 inflates bytes by 4/3, so we
 * budget total DECODED bytes across ALL images in a scan to stay safely under
 * that ceiling: 3MB decoded → ~4MB base64 + JSON overhead.
 */
export const TOTAL_UPLOAD_BUDGET_BYTES = 3 * 1024 * 1024;

/** No single image needs more than this, even in a one-photo scan. */
const PER_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024;

/** Per-image compression target so a full scan fits the total upload budget. */
export function perImageByteTarget(imageCount: number): number {
  return Math.min(
    PER_IMAGE_MAX_BYTES,
    Math.floor(TOTAL_UPLOAD_BUDGET_BYTES / Math.max(imageCount, 1))
  );
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/**
 * Compresses a local photo to JPEG under `targetBytes` (decoded size).
 * Strategy: cap the long edge (no upscaling), then step quality down, then
 * shrink dimensions as a last resort. If the floor is reached the best-effort
 * result is returned rather than failing the scan.
 */
export async function compressImageUri(
  uri: string,
  targetBytes: number = PER_IMAGE_MAX_BYTES
): Promise<MenuImage> {
  // Probe original dimensions (no resize, no base64) so we never upscale.
  const probe = await ImageManipulator.manipulateAsync(uri, []);
  const originalLongEdge = Math.max(probe.width, probe.height);
  const isPortrait = probe.height >= probe.width;

  let longEdge = Math.min(MAX_DIMENSION, originalLongEdge);
  let quality = INITIAL_QUALITY;

  let result = await render(uri, longEdge, originalLongEdge, isPortrait, quality);

  while (result.base64 && base64SizeBytes(result.base64) > targetBytes) {
    if (quality > MIN_QUALITY) {
      quality = Math.max(quality - 0.1, MIN_QUALITY);
    } else if (longEdge > MIN_DIMENSION) {
      longEdge = Math.max(Math.round(longEdge * 0.8), MIN_DIMENSION);
      quality = 0.6; // smaller image → can afford better quality again
    } else {
      break; // floor reached — send best effort; server enforces the backstop
    }
    result = await render(uri, longEdge, originalLongEdge, isPortrait, quality);
  }

  if (!result?.base64) {
    throw new ImageValidationError("Failed to compress image.");
  }

  return {
    base64: result.base64,
    previewUrl: result.uri,
    width: result.width,
    height: result.height,
    sizeBytes: base64SizeBytes(result.base64),
  };
}

/** Re-encode as JPEG, resizing only if the long edge exceeds `longEdge`. */
async function render(
  uri: string,
  longEdge: number,
  originalLongEdge: number,
  isPortrait: boolean,
  quality: number
): Promise<ImageManipulator.ImageResult> {
  // Resize by the long edge only (aspect ratio preserved); skip entirely if
  // the original is already small enough — never upscale.
  const actions: ImageManipulator.Action[] =
    longEdge < originalLongEdge
      ? [{ resize: isPortrait ? { height: longEdge } : { width: longEdge } }]
      : [];

  return ImageManipulator.manipulateAsync(uri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
}

function base64SizeBytes(base64: string): number {
  const padding = (base64.match(/=+$/) ?? [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}
