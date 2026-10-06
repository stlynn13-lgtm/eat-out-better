/**
 * Upload sniffing for /api/analyze.
 *
 * The app compresses every photo to JPEG before upload (apps/mobile/lib/utils/
 * image.ts) and the OCR call labels every image `image/jpeg` (lib/claude/ocr.ts),
 * so anything that isn't a JPEG is either a broken client or someone feeding
 * the endpoint junk. Rejecting it here costs nothing; letting it through costs
 * a Claude call that fails.
 */

/** JPEG files start with FF D8 FF. */
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

/** True when a raw (no `data:` prefix) base64 string decodes to JPEG bytes. */
export function isJpegBase64(base64: string): boolean {
  // 8 base64 characters decode to 6 bytes; only the first 3 matter.
  const head = Buffer.from(base64.slice(0, 8), "base64");
  return JPEG_MAGIC.every((byte, i) => head[i] === byte);
}
