/**
 * Image-type sniffing for uploads, by magic bytes rather than by trusting a
 * caller-supplied MIME type.
 *
 * Only JPEG is accepted: the app re-encodes every photo to JPEG before upload
 * (apps/mobile/lib/utils/image.ts), and ocr.ts sends images to Claude as
 * media_type "image/jpeg". If the app ever uploads another format, widen this
 * AND pass the detected type through to ocr.ts in the same change.
 */

/**
 * True when the base64 string decodes to bytes starting FF D8 FF (the JPEG
 * start-of-image marker followed by the next marker's prefix). Decodes only
 * the first 16 characters (12 bytes), so the cost is constant whatever the
 * image size. The app sends bare base64; a `data:` URL is rejected, as it
 * would be by Claude.
 */
export function isJpegBase64(base64: string): boolean {
  const head = Buffer.from(base64.slice(0, 16), "base64");
  return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}
