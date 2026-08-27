/**
 * EAT-19 replay — Sean's menu, no API key, no network.
 *
 * Replays the ranker reply shape that broke that scan through the REAL parser,
 * so the failure (and the fix) can be measured rather than argued about.
 *
 * The reply below is synthetic in its scores but faithful in its SHAPE: for
 * every dish that has a printed description, the model echoes the whole
 * prompt line back as the name — "2 EGGS — VITAL Farms Pasture Raised" — because
 * the prompt rendered the name and description on one line and then asked it to
 * copy "the input dish name exactly". Dishes with no description have nothing to
 * conflate, so their echo is the bare name.
 *
 * Expected: before the fix, only the 8 undescribed dishes survive. After, all 29.
 *
 *   npm run replay:eat19
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRankingResponse } from "../src/lib/claude/ranking";
import { getRankingUserPrompt } from "../src/lib/claude/prompts";
import type { ExtractedDish } from "../src/lib/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const MENU = join(HERE, "..", "evals", "menus", "edible-beats-brunch.json");

const menu: { dishes: ExtractedDish[] } = JSON.parse(readFileSync(MENU, "utf8"));
const dishes = menu.dishes;

/** Deterministic stand-in score so output is stable across runs. */
const scoreFor = (i: number) => Number((3 + ((i * 7) % 60) / 10).toFixed(1));

const modelReply = JSON.stringify(
  dishes.map((d, i) => ({
    item: i + 1,
    // The conflation: name + description when a description exists.
    name: d.description ? `${d.name} — ${d.description}` : d.name,
    score: scoreFor(i),
    explanation: "Scored from typical preparation.",
    substitution: null,
  }))
);

const parsed = parseRankingResponse(modelReply, dishes);
const lost = parsed.filter((d) => d.explanation.includes("couldn't score"));
const kept = parsed.filter((d) => !d.explanation.includes("couldn't score"));

const described = dishes.filter((d) => d.description).length;

console.log(`\nMenu: ${dishes.length} dishes (${described} with a description, ${dishes.length - described} without)\n`);

console.log("  dish                             | desc? | outcome");
console.log("  ---------------------------------|-------|--------------------");
for (const dish of dishes) {
  const out = parsed.find((p) => p.name === dish.name);
  const isLost = !out || out.explanation.includes("couldn't score");
  console.log(
    `  ${dish.name.slice(0, 32).padEnd(32)} | ${(dish.description ? "yes" : "no").padEnd(5)} | ${
      isLost ? "LOST → 5.0 fallback" : `kept ${out!.score}`
    }`
  );
}

console.log(`\n  scored: ${kept.length}/${dishes.length}   lost: ${lost.length}/${dishes.length}`);

// Cross-tab the outcome against whether the dish had a description. A perfect
// split is the signature of this bug; anything else means something else broke.
const lostNames = new Set(lost.map((d) => d.name));
const lostWithDesc = dishes.filter((d) => d.description && lostNames.has(d.name)).length;
const lostNoDesc = dishes.filter((d) => !d.description && lostNames.has(d.name)).length;
console.log(`  of the lost: ${lostWithDesc} had a description, ${lostNoDesc} did not`);

console.log("\n--- exact prompt text the ranker receives (first 6 dishes) ---\n");
console.log(
  getRankingUserPrompt(dishes.slice(0, 6), "high_cholesterol")
    .split("\n")
    .slice(0, 16)
    .join("\n")
);
console.log();
