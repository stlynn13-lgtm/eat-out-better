/**
 * Checks the maths behind the $200/day spend cap.
 *
 * The cap is only as good as the per-call cost it adds up, and a unit slip
 * here (dollars vs micro-dollars, per token vs per million) moves the real
 * ceiling by a factor of a million without any error. These cases pin it.
 *
 * Needs no API key, no Redis and no network — pure logic.
 *
 *   npm run test:spend
 */

import type Anthropic from "@anthropic-ai/sdk";
import { costMicroUsd } from "../src/lib/utils/rateLimit";
import { MODELS } from "../src/lib/claude/client";

const usage = (
  input: number,
  output: number,
  cacheWrite: number | null = null,
  cacheRead: number | null = null
) =>
  ({
    input_tokens: input,
    output_tokens: output,
    cache_creation_input_tokens: cacheWrite,
    cache_read_input_tokens: cacheRead,
  }) as Anthropic.Usage;

interface Case {
  name: string;
  model: string;
  usage: Anthropic.Usage;
  expectMicroUsd: number;
}

const CASES: Case[] = [
  {
    // Haiku 4.5: $1 in / $5 out per million tokens.
    name: "Haiku, one million tokens each way = $6",
    model: MODELS.HAIKU,
    usage: usage(1_000_000, 1_000_000),
    expectMicroUsd: 6_000_000,
  },
  {
    // A typical menu page: ~1,600 image tokens in, ~2,000 JSON tokens out.
    name: "Haiku, one OCR page ≈ 1.16 cents",
    model: MODELS.HAIKU,
    usage: usage(1_600, 2_000),
    expectMicroUsd: 1_600 + 10_000,
  },
  {
    name: "Sonnet 4.6 priced at $3 / $15",
    model: MODELS.SONNET,
    usage: usage(1_000, 1_000),
    expectMicroUsd: 3_000 + 15_000,
  },
  {
    name: "Cache write at 2x input, cache read at 0.1x input",
    model: MODELS.HAIKU,
    usage: usage(0, 0, 1_000, 1_000),
    expectMicroUsd: 2_000 + 100,
  },
  {
    // An unknown model must price HIGH, never zero — an under-priced call is
    // how a cap silently stops capping.
    name: "Unpriced model falls back to the most expensive row",
    model: "claude-something-new",
    usage: usage(1_000, 1_000),
    expectMicroUsd: 3_000 + 15_000,
  },
  {
    name: "Fractional micro-dollars round up",
    model: MODELS.HAIKU,
    usage: usage(0, 0, null, 3),
    expectMicroUsd: 1,
  },
];

let failures = 0;
for (const c of CASES) {
  const got = costMicroUsd(c.model, c.usage);
  const ok = got === c.expectMicroUsd;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.name}` +
      (ok ? "" : `\n      expected ${c.expectMicroUsd}, got ${got}`)
  );
}

// What $200 buys at the planning cost, as a sanity line for whoever reads this.
const perScan = costMicroUsd(MODELS.HAIKU, usage(4 * 1_600 + 3_000, 4 * 2_000 + 3_000));
console.log(
  `\nA 4-page scan ≈ $${(perScan / 1e6).toFixed(3)}, so $200/day ≈ ${Math.floor(
    200e6 / perScan
  ).toLocaleString()} scans.`
);

console.log(`\n${CASES.length - failures}/${CASES.length} passed`);
process.exit(failures ? 1 : 0);
