/**
 * Scoring eval runner — see ./README.md for what this is and why it asserts
 * tiers rather than exact scores.
 *
 * Runs the REAL rankDishes() so the eval covers the live prompt AND the
 * name/index matching, not a reimplementation that could drift from either.
 *
 *   cd apps/api
 *   ANTHROPIC_API_KEY=... npm run eval
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { rankDishes } from "../src/lib/claude/ranking";
import { getTier, GREEN_MIN, YELLOW_MIN } from "../src/lib/config/scoring";
import { categorizeDish, isRanked, CATEGORY_LABEL, RANKED_CATEGORIES } from "../src/lib/config/categories";
import type { ExtractedDish, ScoreTier, DishCategory } from "../src/lib/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const MENUS_DIR = join(HERE, "menus");
const BASELINES_DIR = join(HERE, "baselines");

// Read apps/api/.env.local the same way `next dev` does. A bare tsx script does
// NOT pick that file up on its own, so without this the runner reports "no API
// key" even when the key is sitting right there — and the obvious workaround
// (exporting the key inline) is the one that ends up in shell history.
loadEnvConfig(join(HERE, ".."));

/**
 * How close to a tier edge counts as "could have gone either way". A dish
 * inside this band is reported as unstable rather than treated as a solid
 * pass — its tier is a coin flip, so neither passing nor failing on it means
 * much.
 */
const EDGE_MARGIN = 0.3;

interface MenuFile {
  id: string;
  label: string;
  note?: string;
  dishes: ExtractedDish[];
  expected?: Record<string, ScoreTier>;
}

interface DishResult {
  name: string;
  category: DishCategory;
  scores: number[];
  median: number;
  tier: ScoreTier;
  /** How many runs this dish won its category's badge. Below RUNS means the
   * badge MOVES between scans — the user gets a different recommendation for the
   * same menu, which is worse than a slightly wrong one. */
  bestWins: number;
  unscored: boolean;
  /** Deliberately not scored (alcohol, standalone sauce) — not a failure. */
  excluded: boolean;
}

// --- CLI ------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const RUNS = Number(flag("runs") ?? 3);
const ONLY = flag("menu");
const UPDATE_BASELINE = argv.includes("--update-baseline");

// --- Helpers --------------------------------------------------

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Is this score close enough to a tier boundary that its tier is luck? */
function nearEdge(score: number): boolean {
  return (
    Math.abs(score - GREEN_MIN) < EDGE_MARGIN || Math.abs(score - YELLOW_MIN) < EDGE_MARGIN
  );
}

/**
 * A dish the ranker never scored comes back at exactly 5.0 with the fallback
 * copy. That is a service failure, not a verdict, and it must never be quietly
 * averaged in as though it were a real score — it's the EAT-18 bug's signature.
 */
function isUnscored(explanation: string): boolean {
  return explanation.includes("couldn't score") || explanation.includes("couldn't fully assess");
}

function loadMenus(): MenuFile[] {
  if (!existsSync(MENUS_DIR)) return [];
  return readdirSync(MENUS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(MENUS_DIR, f), "utf8")) as MenuFile)
    .filter((m) => !ONLY || m.id === ONLY);
}

// --- Scoring --------------------------------------------------

async function scoreMenu(menu: MenuFile): Promise<DishResult[]> {
  // Mirror the route: derive the category from the menu's own section heading,
  // then rank ONLY the rankable ones. Without this the excluded dishes would come
  // back with no scores, median 0, tier red — five phantom catastrophic
  // regressions on any menu with a bar.
  const categorized = menu.dishes.map((d) => ({ ...d, category: categorizeDish(d) }));
  const rankable = categorized.filter((d) => isRanked(d.category));

  const perDishScores = new Map<string, number[]>();
  const unscoredNames = new Set<string>();
  // COUNT badge wins per dish rather than collecting a set of winners. A set
  // hides the thing that matters: if two dishes in one category each won some
  // runs, the badge is unstable and the user's "Best Side" changes between scans.
  const bestWins = new Map<string, number>();

  for (let run = 1; run <= RUNS; run++) {
    process.stdout.write(`    run ${run}/${RUNS}…\r`);
    const ranked = await rankDishes(rankable, "high_cholesterol");
    for (const dish of ranked) {
      if (isUnscored(dish.explanation)) unscoredNames.add(dish.name);
      if (dish.tag === "best-in-category")
        bestWins.set(dish.name, (bestWins.get(dish.name) ?? 0) + 1);
      const list = perDishScores.get(dish.name) ?? [];
      list.push(dish.score);
      perDishScores.set(dish.name, list);
    }
  }
  process.stdout.write("                    \r");

  return categorized.map((dish) => {
    const excluded = !isRanked(dish.category);
    const scores = perDishScores.get(dish.name) ?? [];
    const med = scores.length ? median(scores) : 0;
    return {
      name: dish.name,
      category: dish.category,
      scores,
      median: med,
      tier: getTier(med),
      bestWins: bestWins.get(dish.name) ?? 0,
      unscored: !excluded && unscoredNames.has(dish.name),
      excluded,
    };
  });
}

// --- Reporting ------------------------------------------------

interface Problem {
  dish: string;
  kind: "unscored" | "expected" | "drift";
  detail: string;
}

function evaluate(menu: MenuFile, results: DishResult[]): Problem[] {
  const baselinePath = join(BASELINES_DIR, `${menu.id}.json`);
  const baseline: Record<string, ScoreTier> = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, "utf8")).tiers
    : {};
  const hasBaseline = Object.keys(baseline).length > 0;

  const problems: Problem[] = [];
  const pad = Math.max(...results.map((r) => r.name.length), 4);

  const order: DishCategory[] = [
    ...RANKED_CATEGORIES,
    ...[...new Set(results.filter((r) => r.excluded).map((r) => r.category))],
  ];

  for (const category of order) {
    const inCategory = results.filter((r) => r.category === category);
    if (inCategory.length === 0) continue;
    const ranked = isRanked(category);
    console.log(`\n  ${CATEGORY_LABEL[category]}${ranked ? "" : "  (not scored)"}`);
    for (const r of inCategory) {
      if (!ranked) {
        console.log(`  ${r.name.padEnd(pad)}       —  —       excluded by design`);
        continue;
      }
      reportDish(r, menu, baseline, hasBaseline, problems, pad);
    }
  }
  return problems;
}

function reportDish(
  r: DishResult,
  menu: MenuFile,
  baseline: Record<string, ScoreTier>,
  hasBaseline: boolean,
  problems: Problem[],
  pad: number
) {
  {
    const notes: string[] = [];

    if (r.unscored) {
      problems.push({
        dish: r.name,
        kind: "unscored",
        detail: "ranker returned no score; fell back to a flat 5.0",
      });
      notes.push("UNSCORED");
    }

    const expected = menu.expected?.[r.name];
    if (expected && expected !== r.tier) {
      problems.push({
        dish: r.name,
        kind: "expected",
        detail: `expected ${expected}, got ${r.tier} (${r.median.toFixed(1)})`,
      });
      notes.push(`WRONG want=${expected}`);
    } else if (expected) {
      notes.push(`ok=${expected}`);
    }

    const base = baseline[r.name];
    if (hasBaseline && base && base !== r.tier) {
      problems.push({
        dish: r.name,
        kind: "drift",
        detail: `baseline ${base} → now ${r.tier} (${r.median.toFixed(1)})`,
      });
      notes.push(`MOVED from=${base}`);
    } else if (hasBaseline && !base) {
      notes.push("new");
    }

    if (r.bestWins > 0) {
      notes.push(r.bestWins === RUNS ? "◆BEST" : `◆best ${r.bestWins}/${RUNS} UNSTABLE`);
    }
    if (nearEdge(r.median)) notes.push("near-edge");

    const spread =
      r.scores.length > 1
        ? ` [${Math.min(...r.scores).toFixed(1)}–${Math.max(...r.scores).toFixed(1)}]`
        : "";

    console.log(
      `  ${r.name.padEnd(pad)}  ${r.median.toFixed(1).padStart(6)}  ${r.tier.padEnd(6)}  ${notes.join(" ")}${spread}`
    );
  }

}

function writeBaseline(menu: MenuFile, results: DishResult[]) {
  const tiers: Record<string, ScoreTier> = {};
  const medians: Record<string, number> = {};
  // Excluded dishes have no score, so recording a tier for them would bake a
  // meaningless "red" into the reference and report drift the moment anything moves.
  for (const r of results.filter((x) => !x.excluded)) {
    tiers[r.name] = r.tier;
    medians[r.name] = Number(r.median.toFixed(1));
  }
  writeFileSync(
    join(BASELINES_DIR, `${menu.id}.json`),
    JSON.stringify(
      { menu: menu.id, recordedAt: new Date().toISOString(), runs: RUNS, tiers, medians },
      null,
      2
    ) + "\n"
  );
  console.log(`  baseline updated: evals/baselines/${menu.id}.json`);
}

// --- Main -----------------------------------------------------

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set — this eval makes real API calls.");
    process.exit(1);
  }

  const menus = loadMenus();
  if (menus.length === 0) {
    console.error(
      ONLY
        ? `No menu with id "${ONLY}" in evals/menus/.`
        : "No menus in evals/menus/ yet — add one (see evals/README.md) before running."
    );
    process.exit(1);
  }

  let total = 0;
  for (const menu of menus) {
    console.log(`\n${menu.label} (${menu.dishes.length} dishes, ${RUNS} runs)`);
    if (menu.note) console.log(`  ${menu.note}`);
    const results = await scoreMenu(menu);
    const problems = evaluate(menu, results);
    if (UPDATE_BASELINE) writeBaseline(menu, results);

    if (problems.length > 0) {
      console.log("");
      for (const p of problems) console.log(`  ${p.kind.toUpperCase()}: ${p.dish} — ${p.detail}`);
    }
    total += problems.length;
  }

  if (UPDATE_BASELINE) {
    console.log("\nBaselines rewritten. Read the diff before committing — accepting a");
    console.log("baseline asserts the change is an improvement.\n");
    process.exit(0);
  }

  console.log(total === 0 ? "\nNo problems.\n" : `\n${total} problem(s) across ${menus.length} menu(s).\n`);
  process.exit(total === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
