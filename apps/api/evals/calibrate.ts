/**
 * Offline calibration — tune the score curves against the human answer key
 * with NO API calls.
 *
 * `npm run eval` saves the model's raw estimates for every dish
 * (evals/estimates/<menu>.json). This re-scores those saved estimates under
 * the curves in config/scoring.ts — or under curves you pass in — and reports
 * agreement with the answer key. Trying "should 12g be red?" costs nothing and
 * takes a second; the model is not involved.
 *
 *   npm run eval:calibrate
 *   npm run eval:calibrate -- --fat "0:10,2:8.5,5:7,12:4,20:2.5,30:1"
 *   npm run eval:calibrate -- --sugar "0:10,6:7,20:4,45:1" --misses
 *
 * The estimates are the MEDIAN across the saved runs, so one odd run can't
 * move a verdict.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  scoreFromEstimates,
  getTier,
  SAT_FAT_CURVE,
  ADDED_SUGAR_CURVE,
  type Curve,
  type DishEstimates,
} from "../src/lib/config/scoring";
import { isRanked } from "../src/lib/config/categories";
import type { ScoreTier } from "../src/lib/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

function parseCurve(spec: string | undefined, fallback: Curve): Curve {
  if (!spec) return fallback;
  return spec.split(",").map((pair) => pair.split(":").map(Number) as [number, number]);
}
const fatCurve = parseCurve(flag("fat"), SAT_FAT_CURVE);
const sugarCurve = parseCurve(flag("sugar"), ADDED_SUGAR_CURVE);
const SHOW_MISSES = argv.includes("--misses");
/** Which saved estimates to score: "estimates" (full-menu eval runs) or
 * "estimates-alone" (the context test's small batches). */
const DIR = flag("dir") ?? "estimates";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mode = <T,>(xs: T[]) =>
  [...new Set(xs)].sort((a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length)[0];

const rank: Record<ScoreTier, number> = { red: 0, yellow: 1, green: 2 };
let checked = 0, ok = 0, greener = 0, redder = 0, noEstimate = 0;
const misses: string[] = [];

for (const file of readdirSync(join(HERE, "menus")).filter((f) => f.endsWith(".json"))) {
  const menu = JSON.parse(readFileSync(join(HERE, "menus", file), "utf8"));
  const estPath = join(HERE, DIR, file);
  if (!existsSync(estPath)) continue;
  const saved = JSON.parse(readFileSync(estPath, "utf8"));

  menu.dishes.forEach((dish: { name: string; expected?: { tier?: ScoreTier } }, index: number) => {
    const want = dish.expected?.tier;
    if (!want) return;
    const row = saved.dishes.find((d: { index: number }) => d.index === index);
    if (!row || !isRanked(row.category)) return;
    const runs: DishEstimates[] = row.runs.filter(Boolean);
    if (runs.length === 0) { noEstimate++; return; }
    const est: DishEstimates = {
      satFatG: median(runs.map((r) => r.satFatG)),
      addedSugarG: median(runs.map((r) => r.addedSugarG)),
      protective: mode(runs.map((r) => r.protective)),
      fried: mode(runs.map((r) => Boolean(r.fried))),
    };
    const score = scoreFromEstimates(est, row.category, { satFat: fatCurve, sugar: sugarCurve });
    const got = getTier(score);
    checked++;
    if (got === want) ok++;
    else {
      if (rank[got] > rank[want]) greener++; else redder++;
      misses.push(
        `  ${menu.id.padEnd(20)} ${dish.name.slice(0, 34).padEnd(34)} key=${want.padEnd(6)} got=${got.padEnd(6)} ${score.toFixed(1).padStart(4)}  satFat ${est.satFatG}g  sugar ${est.addedSugarG}g  ${est.protective}${est.fried ? "  fried" : ""}`
      );
    }
  });
}

const fmt = (c: Curve) => c.map(([x, y]) => `${x}:${y}`).join(",");
console.log(`\nestimates   evals/${DIR}/`);
console.log(`fat curve   ${fmt(fatCurve)}`);
console.log(`sugar curve ${fmt(sugarCurve)}  (drinks and desserts only)`);
console.log(`\ntiers ${ok}/${checked} match the answer key (${checked ? Math.round((100 * ok) / checked) : 0}%) — app greener on ${greener}, redder on ${redder}`);
if (noEstimate) console.log(`${noEstimate} answer-key dish(es) have no saved estimate (cut off or unscored)`);
if (SHOW_MISSES) console.log("\n" + misses.sort().join("\n"));
console.log("");
