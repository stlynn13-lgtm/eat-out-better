/**
 * Context test — does a dish's verdict depend on what else is on the menu?
 *
 * The scoring step is meant to be absolute: a burger is the same burger on a
 * steakhouse menu and on a salad bar's. On 2026-10-04 it wasn't — scoring the
 * answer-key dishes on their own vs. inside their full menu changed the colour
 * of 46 of 194 dishes. This re-runs that comparison and prints the number to
 * drive down.
 *
 * It scores each menu's answer-key dishes ALONE (one call per menu) and
 * compares with the full-menu estimates `npm run eval` saved in
 * evals/estimates/. Run `npm run eval` first. Costs ~one call per menu.
 *
 *   npm run eval:context
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { rankDishes } from "../src/lib/claude/ranking";
import { categorizeDish, isRanked } from "../src/lib/config/categories";
import { scoreFromEstimates, getTier, type DishEstimates } from "../src/lib/config/scoring";

const HERE = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(join(HERE, ".."));

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set — this test makes real API calls.");
    process.exit(1);
  }
  let compared = 0, flips = 0, gramDiffs: number[] = [];
  const flipLines: string[] = [];

  for (const file of readdirSync(join(HERE, "menus")).filter((f) => f.endsWith(".json"))) {
    const estPath = join(HERE, "estimates", file);
    if (!existsSync(estPath)) continue;
    const menu = JSON.parse(readFileSync(join(HERE, "menus", file), "utf8"));
    const saved = JSON.parse(readFileSync(estPath, "utf8"));

    const sample = menu.dishes
      .map((d: any, index: number) => ({ ...d, index, category: categorizeDish(d) }))
      .filter((d: any) => d.expected && isRanked(d.category));
    if (sample.length === 0) continue;

    let alone: { estimates?: DishEstimates }[] = [];
    await rankDishes(sample, "high_cholesterol", { onEstimates: (list) => (alone = list) });

    // Saved so calibration can score small-batch estimates against the key:
    // npm run eval:calibrate -- --dir estimates-alone
    mkdirSync(join(HERE, "estimates-alone"), { recursive: true });
    writeFileSync(
      join(HERE, "estimates-alone", file),
      JSON.stringify({ menu: menu.id, recordedAt: new Date().toISOString(), runs: 1,
        dishes: sample.map((d: any, i: number) => ({ index: d.index, key: d.name, category: d.category, runs: [alone[i]?.estimates ?? null] })) }, null, 1) + "\n"
    );

    sample.forEach((d: any, i: number) => {
      const a = alone[i]?.estimates;
      const fullRuns: DishEstimates[] = (saved.dishes.find((x: any) => x.index === d.index)?.runs ?? []).filter(Boolean);
      if (!a || fullRuns.length === 0) return;
      const full: DishEstimates = {
        satFatG: median(fullRuns.map((r) => r.satFatG)),
        addedSugarG: median(fullRuns.map((r) => r.addedSugarG)),
        protective: fullRuns[0].protective,
        fried: Boolean(fullRuns[0].fried),
      };
      const sa = scoreFromEstimates(a, d.category);
      const sf = scoreFromEstimates(full, d.category);
      compared++;
      gramDiffs.push(Math.abs(a.satFatG - full.satFatG));
      if (getTier(sa) !== getTier(sf)) {
        flips++;
        flipLines.push(
          `  ${menu.id.padEnd(20)} ${d.name.slice(0, 32).padEnd(32)} alone ${sa.toFixed(1)} (${a.satFatG}g)   full menu ${sf.toFixed(1)} (${full.satFatG}g)`
        );
      }
    });
    process.stdout.write(`  ${menu.id} done\n`);
  }

  const mean = gramDiffs.reduce((x, y) => x + y, 0) / Math.max(gramDiffs.length, 1);
  console.log(`\nColour changed between "alone" and "full menu": ${flips} of ${compared}  (was 46 of 194 on 2026-10-04)`);
  console.log(`Saturated-fat estimate moved by ${mean.toFixed(1)}g on average`);
  if (flipLines.length) console.log("\n" + flipLines.join("\n"));
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
