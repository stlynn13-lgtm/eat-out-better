/**
 * Image utilities — React Native / Expo implementation
 *
 * Uses expo-image-manipulator instead of Canvas API.
 * Same interface as the web version; swap is transparent to hooks/components.
 */

import * as ImageManipulator from "expo-image-manipulator";
import type { MenuImage } from "@eat-out-better/shared";

const MAX_DIMENSION = 1920;
const TARGET_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const RAW_MAX_BYTES = 10 * 1024 * 1024;   // 10MB
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/**
 * Compress a local image URI (from camera or gallery) into a MenuImage.
 * Returns base64 JPEG + preview URI + dimensions + size.
 */
export async function compressImageUri(uri: string): Promise<MenuImage> {
  let quality = INITIAL_QUALITY;
  let result: ImageManipulator.ImageResult | null = null;

  // Resize to max dimension, keeping aspect ratio
  result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  // Iteratively reduce quality if too large
  while (
    result.base64 &&
    base64SizeBytes(result.base64) > TARGET_MAX_BYTES &&
    quality > MIN_QUALITY
  ) {
    quality = Math.max(quality - 0.1, MIN_QUALITY);
    result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
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

function base64SizeBytes(base64: string): number {
  // base64 encodes 3 bytes as 4 chars; strip padding
  const padding = (base64.match(/=+$/) ?? [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}
