/**
 * Regression check for the upload image-type gate (security audit L5).
 *
 * /api/analyze must refuse anything that isn't a JPEG before it spends money
 * on a Claude call. The app only ever uploads JPEG; everything else is a
 * direct caller.
 *
 * Needs no API key and makes no network calls — pure logic.
 *
 *   npm run test:imagetype
 */

import { isJpegBase64 } from "../src/lib/utils/imageType";

const b64 = (bytes: number[], pad = 32) =>
  Buffer.from([...bytes, ...new Array(pad).fill(0)]).toString("base64");

const CASES: { name: string; input: string; expect: boolean }[] = [
  { name: "JPEG/JFIF (FF D8 FF E0)", input: b64([0xff, 0xd8, 0xff, 0xe0]), expect: true },
  { name: "JPEG/Exif (FF D8 FF E1)", input: b64([0xff, 0xd8, 0xff, 0xe1]), expect: true },
  { name: "JPEG, minimal 3 bytes", input: b64([0xff, 0xd8, 0xff], 0), expect: true },
  { name: "PNG", input: b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), expect: false },
  {
    name: "HEIC (ftypheic)",
    input: b64([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]),
    expect: false,
  },
  { name: "GIF", input: b64([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), expect: false },
  { name: "PDF", input: b64([0x25, 0x50, 0x44, 0x46, 0x2d]), expect: false },
  { name: "plain text", input: Buffer.from("hello, this is not an image").toString("base64"), expect: false },
  { name: "data: URL prefix", input: "data:image/jpeg;base64," + b64([0xff, 0xd8, 0xff, 0xe0]), expect: false },
  { name: "truncated JPEG (2 bytes)", input: b64([0xff, 0xd8], 0), expect: false },
  { name: "not base64 at all", input: "!!!!!!!!!!!!!!!!!!!!", expect: false },
  { name: "empty string", input: "", expect: false },
];

let failed = 0;
for (const testCase of CASES) {
  const actual = isJpegBase64(testCase.input);
  const ok = actual === testCase.expect;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${testCase.name}`);
  if (!ok) console.log(`      expected ${testCase.expect}, got ${actual}`);
}

console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed === 0 ? 0 : 1);
