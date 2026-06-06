import * as ImageManipulator from "expo-image-manipulator";
import type { MenuImage } from "@eat-out-better/shared";

const MAX_DIMENSION = 1920;
const TARGET_MAX_BYTES = 5 * 1024 * 1024;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export async function compressImageUri(uri: string): Promise<MenuImage> {
  let quality = INITIAL_QUALITY;

  let result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

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
  const padding = (base64.match(/=+$/) ?? [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}
