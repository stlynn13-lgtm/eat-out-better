/**
 * Image utilities: compression, validation, base64 encoding.
 *
 * All processing happens client-side before upload.
 * Target: max 5MB per image after compression.
 * Format: always JPEG (smaller than PNG for photos).
 */

import type { MenuImage } from "@/lib/types";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB raw
const TARGET_SIZE_BYTES = 5 * 1024 * 1024; // 5MB after compression
const MAX_DIMENSION = 1920; // Max width or height
const JPEG_QUALITY_INITIAL = 0.85;
const JPEG_QUALITY_MIN = 0.5;

/** Accepted MIME types for menu images */
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/heic", "image/webp"];

// -----------------------------------------------------------
// Validation
// -----------------------------------------------------------

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!ACCEPTED_MIME_TYPES.some((type) => file.type.startsWith(type.split("/")[0]))) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Please use a JPEG or PNG photo.`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `Image too large (${sizeMB}MB). Please use a photo under 10MB.`,
    };
  }

  return { valid: true };
}

// -----------------------------------------------------------
// Compression
// -----------------------------------------------------------

/**
 * Compresses a File or Blob to JPEG within size and dimension limits.
 * Returns a MenuImage with preview URL, base64, and size metadata.
 */
export async function compressImage(file: File): Promise<MenuImage> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const originalSize = file.size;

  // Load the image into a canvas
  const bitmap = await createImageBitmap(file);

  const { width, height } = scaleDimensions(
    bitmap.width,
    bitmap.height,
    MAX_DIMENSION
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // White background (for PNGs with transparency)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Compress iteratively until under target size
  let quality = JPEG_QUALITY_INITIAL;
  let dataUrl: string;

  do {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    const estimatedBytes = estimateBase64Size(dataUrl);
    if (estimatedBytes <= TARGET_SIZE_BYTES || quality <= JPEG_QUALITY_MIN) break;
    quality -= 0.05;
  } while (quality > JPEG_QUALITY_MIN);

  // Create object URL for preview (must be revoked when no longer needed)
  const blob = dataUrlToBlob(dataUrl);
  const previewUrl = URL.createObjectURL(blob);

  // Extract raw base64 (strip data URI prefix)
  const base64 = dataUrl.split(",")[1];

  return {
    previewUrl,
    base64,
    originalSize,
    compressedSize: blob.size,
    mimeType: "image/jpeg",
  };
}

/**
 * Revokes an object URL to free memory.
 * Call this when a preview image is removed from state.
 */
export function revokePreviewUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

// -----------------------------------------------------------
// Private helpers
// -----------------------------------------------------------

function scaleDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function estimateBase64Size(dataUrl: string): number {
  // base64 is ~4/3 the size of binary; data URI prefix adds ~20 chars
  const base64Length = dataUrl.length - dataUrl.indexOf(",") - 1;
  return Math.ceil((base64Length * 3) / 4);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
