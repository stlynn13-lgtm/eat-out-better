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
import { rankDishes } from "../src/lib/claude/ranking";
import { getTier, GREEN_MIN, YELLOW_MIN } from "../src/lib/config/scoring";
import type { ExtractedDish, ScoreTier } from "../src/lib/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const MENUS_DIR = join(HERE, "menus");
const BASELINES_DIR = join(HERE, "baselines");

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
  scores: number[];
  median: number;
  tier: ScoreTier;
  unscored: boolean;
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
  const perDishScores = new Map<string, number[]>();
  const unscoredNames = new Set<string>();

  for (let run = 1; run <= RUNS; run++) {
    process.stdout.write(`    run ${run}/${RUNS}…\r`);
    const ranked = await rankDishes(menu.dishes, "high_cholesterol");
    for (const dish of ranked) {
      if (isUnscored(dish.explanation)) unscoredNames.add(dish.name);
      const list = perDishScores.get(dish.name) ?? [];
      list.push(dish.score);
      perDishScores.set(dish.name, list);
    }
  }
  process.stdout.write("                    \r");

  return menu.dishes.map((dish) => {
    const scores = perDishScores.get(dish.name) ?? [];
    const med = scores.length ? median(scores) : 0;
    return {
      name: dish.name,
      scores,
      median: med,
      tier: getTier(med),
      unscored: unscoredNames.has(dish.name),
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

  console.log(`  ${"dish".padEnd(pad)}  median  tier    vs expected / baseline`);
  for (const r of results) {
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

    if (nearEdge(r.median)) notes.push("near-edge");

    const spread =
      r.scores.length > 1
        ? ` [${Math.min(...r.scores).toFixed(1)}–${Math.max(...r.scores).toFixed(1)}]`
        : "";

    console.log(
      `  ${r.name.padEnd(pad)}  ${r.median.toFixed(1).padStart(6)}  ${r.tier.padEnd(6)}  ${notes.join(" ")}${spread}`
    );
  }

  if (!hasBaseline) {
    console.log(`\n  (no baseline yet for "${menu.id}" — run with --update-baseline to record one)`);
  }

  return problems;
}

function writeBaseline(menu: MenuFile, results: DishResult[]) {
  const tiers: Record<string, ScoreTier> = {};
  const medians: Record<string, number> = {};
  for (const r of results) {
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
