/**
 * Regression check for the /api/analyze upload filter: only JPEG reaches
 * Claude. The app always uploads JPEG (apps/mobile/lib/utils/image.ts), so
 * anything else is refused with a 400 before any paid call.
 *
 * Needs no API key and makes no network calls — pure logic.
 *
 *   npm run test:imagetype
 */

import { isJpegBase64 } from "../src/lib/utils/imageType";

const b64 = (...bytes: number[]) => Buffer.from(bytes).toString("base64");

const CASES: { name: string; input: string; expect: boolean }[] = [
  { name: "JPEG (JFIF)", input: b64(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46), expect: true },
  { name: "JPEG (Exif)", input: b64(0xff, 0xd8, 0xff, 0xe1, 0x12, 0x34), expect: true },
  { name: "JPEG, minimum 3 bytes", input: b64(0xff, 0xd8, 0xff), expect: true },
  { name: "PNG", input: b64(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), expect: false },
  {
    name: "HEIC",
    input: b64(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63),
    expect: false,
  },
  { name: "GIF", input: Buffer.from("GIF89a").toString("base64"), expect: false },
  { name: "PDF", input: Buffer.from("%PDF-1.7").toString("base64"), expect: false },
  { name: "plain text", input: Buffer.from("hello world").toString("base64"), expect: false },
  { name: "truncated JPEG header", input: b64(0xff, 0xd8), expect: false },
  { name: "data: URL prefix", input: "data:image/jpeg;base64," + b64(0xff, 0xd8, 0xff, 0xe0), expect: false },
  { name: "not base64 at all", input: "!!!!!!!!", expect: false },
];

let failed = 0;
for (const testCase of CASES) {
  const actual = isJpegBase64(testCase.input);
  const ok = actual === testCase.expect;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${testCase.name}${ok ? "" : ` (got ${actual})`}`);
}

console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed === 0 ? 0 : 1);
