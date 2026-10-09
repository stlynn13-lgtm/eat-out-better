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

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { rankDishes } from "../src/lib/claude/ranking";
import { getTier, GREEN_MIN, YELLOW_MIN } from "../src/lib/config/scoring";
import { categorizeDish, isRanked, CATEGORY_LABEL, RANKED_CATEGORIES } from "../src/lib/config/categories";
import type { ExtractedDish, ScoreTier, DishCategory } from "../src/lib/types";
import type { DishEstimates } from "../src/lib/config/scoring";

const HERE = dirname(fileURLToPath(import.meta.url));
const MENUS_DIR = join(HERE, "menus");
const BASELINES_DIR = join(HERE, "baselines");
const ESTIMATES_DIR = join(HERE, "estimates");

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

/** A human answer key on one dish (the photo corpus keeps it on the dish
 * itself, so two dishes sharing a name can carry different answers). */
interface DishExpectation {
  tier?: ScoreTier;
  category?: DishCategory;
}

interface MenuFile {
  id: string;
  label: string;
  note?: string;
  dishes: (ExtractedDish & { expected?: DishExpectation })[];
  /** Older menus: expected tier by dish name. */
  expected?: Record<string, ScoreTier>;
}

interface DishResult {
  /** Display key: the name, or "name [section]" when the menu prints the name twice. */
  name: string;
  expected?: DishExpectation;
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

/**
 * A menu with neither an answer key nor a baseline has nothing to be judged
 * against — scoring it costs real calls and can only print numbers. The
 * extraction corpus (menus collected for the photo-reading eval) lands here
 * before anyone has set its tiers, so the default run skips those; name one
 * with --menu to score it anyway, e.g. to record its first baseline.
 */
function isScorable(menu: MenuFile): boolean {
  return (
    Object.keys(menu.expected ?? {}).length > 0 ||
    menu.dishes.some((d) => d.expected) ||
    existsSync(join(BASELINES_DIR, `${menu.id}.json`))
  );
}

function loadMenus(): MenuFile[] {
  if (!existsSync(MENUS_DIR)) return [];
  const menus = readdirSync(MENUS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(MENUS_DIR, f), "utf8")) as MenuFile);
  if (ONLY) return menus.filter((m) => m.id === ONLY);
  const skipped = menus.filter((m) => !isScorable(m));
  if (skipped.length > 0) {
    console.log(
      `Skipping ${skipped.length} menu(s) with no answer key or baseline yet: ${skipped
        .map((m) => m.id)
        .join(", ")}\n`
    );
  }
  return menus.filter(isScorable);
}

// --- Scoring --------------------------------------------------

async function scoreMenu(menu: MenuFile): Promise<DishResult[]> {
  // Mirror the route: derive the category from the menu's own section heading,
  // then rank ONLY the rankable ones. Without this the excluded dishes would come
  // back with no scores, median 0, tier red — five phantom catastrophic
  // regressions on any menu with a bar.
  // Real menus print the same name twice for different orders (Benvenuto's
  // pasta and sandwich CHICKEN PARMIGIANA; Okada's adult and kids' "Chicken").
  // Keying results by name alone would pour both into one score list, so each
  // dish gets a display key, and the ranker's answers are handed back by name,
  // then category, then order.
  const nameCount = new Map<string, number>();
  for (const d of menu.dishes) nameCount.set(d.name, (nameCount.get(d.name) ?? 0) + 1);
  const categorized = menu.dishes.map((d) => ({
    ...d,
    category: categorizeDish(d),
    key: (nameCount.get(d.name) ?? 0) > 1 ? `${d.name} [${d.section ?? "no section"}]` : d.name,
    expectation: d.expected ?? (menu.expected?.[d.name] ? { tier: menu.expected[d.name] } : undefined),
  }));
  const rankable = categorized.filter((d) => isRanked(d.category));

  const perDishScores = new Map<string, number[]>();
  const unscoredKeys = new Set<string>();
  // COUNT badge wins per dish rather than collecting a set of winners. A set
  // hides the thing that matters: if two dishes in one category each won some
  // runs, the badge is unstable and the user's "Best Side" changes between scans.
  const bestWins = new Map<string, number>();

  // The model's raw estimates per dish per run, saved so thresholds can be
  // tuned offline against the answer key (npm run eval:calibrate).
  const estimatesByKey = new Map<string, (DishEstimates | null)[]>();

  for (let run = 1; run <= RUNS; run++) {
    process.stdout.write(`    run ${run}/${RUNS}…\r`);
    const ranked = await rankDishes(rankable, "high_cholesterol", {
      onEstimates: (list) =>
        list.forEach((e, i) => {
          const key = rankable[i].key;
          estimatesByKey.set(key, [...(estimatesByKey.get(key) ?? []), e.estimates ?? null]);
        }),
    });
    const pool = [...ranked];
    for (const dish of rankable) {
      const sameCategory = pool.findIndex((r) => r.name === dish.name && r.category === dish.category);
      const i = sameCategory >= 0 ? sameCategory : pool.findIndex((r) => r.name === dish.name);
      if (i < 0) { unscoredKeys.add(dish.key); continue; }
      const [r] = pool.splice(i, 1);
      if (isUnscored(r.explanation)) unscoredKeys.add(dish.key);
      if (r.tag === "best-in-category") bestWins.set(dish.key, (bestWins.get(dish.key) ?? 0) + 1);
      const list = perDishScores.get(dish.key) ?? [];
      list.push(r.score);
      perDishScores.set(dish.key, list);
    }
  }
  process.stdout.write("                    \r");

  mkdirSync(ESTIMATES_DIR, { recursive: true });
  writeFileSync(
    join(ESTIMATES_DIR, `${menu.id}.json`),
    JSON.stringify(
      {
        menu: menu.id,
        recordedAt: new Date().toISOString(),
        runs: RUNS,
        dishes: categorized.map((d, index) => ({
          index,
          key: d.key,
          category: d.category,
          runs: estimatesByKey.get(d.key) ?? [],
        })),
      },
      null,
      1
    ) + "\n"
  );

  return categorized.map((dish) => {
    const excluded = !isRanked(dish.category);
    const scores = perDishScores.get(dish.key) ?? [];
    const med = scores.length ? median(scores) : 0;
    return {
      name: dish.key,
      expected: dish.expectation,
      category: dish.category,
      scores,
      median: med,
      tier: getTier(med),
      bestWins: bestWins.get(dish.key) ?? 0,
      unscored: !excluded && unscoredKeys.has(dish.key),
      excluded,
    };
  });
}

// --- Reporting ------------------------------------------------

interface Problem {
  dish: string;
  kind: "unscored" | "expected" | "group" | "drift";
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
        const want = r.expected?.category;
        if (want && want !== r.category) {
          problems.push({ dish: r.name, kind: "group", detail: `filed as ${CATEGORY_LABEL[r.category]}, should be ${CATEGORY_LABEL[want]}` });
        }
        console.log(`  ${r.name.padEnd(pad)}       —  —       excluded by design${want && want !== r.category ? `  WRONG GROUP want=${want}` : ""}`);
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

    const expected = r.expected?.tier;
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

    const wantGroup = r.expected?.category;
    if (wantGroup && wantGroup !== r.category) {
      problems.push({
        dish: r.name,
        kind: "group",
        detail: `filed as ${CATEGORY_LABEL[r.category]}, should be ${CATEGORY_LABEL[wantGroup]}`,
      });
      notes.push(`WRONG GROUP want=${wantGroup}`);
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
  const tally = { tierChecked: 0, tierOk: 0, appGreener: 0, appRedder: 0, groupChecked: 0, groupOk: 0 };
  const rank: Record<ScoreTier, number> = { red: 0, yellow: 1, green: 2 };
  for (const menu of menus) {
    console.log(`\n${menu.label} (${menu.dishes.length} dishes, ${RUNS} runs)`);
    if (menu.note) console.log(`  ${menu.note}`);
    const results = await scoreMenu(menu);
    const problems = evaluate(menu, results);
    for (const r of results) {
      if (r.expected?.category) {
        tally.groupChecked++;
        if (r.expected.category === r.category) tally.groupOk++;
      }
      if (r.expected?.tier && !r.excluded && !r.unscored) {
        tally.tierChecked++;
        if (r.expected.tier === r.tier) tally.tierOk++;
        else if (rank[r.tier] > rank[r.expected.tier]) tally.appGreener++;
        else tally.appRedder++;
      }
    }
    if (UPDATE_BASELINE) writeBaseline(menu, results);

    if (problems.length > 0) {
      console.log("");
      for (const p of problems) console.log(`  ${p.kind.toUpperCase()}: ${p.dish} — ${p.detail}`);
    }
    total += problems.length;
  }

  if (tally.tierChecked + tally.groupChecked > 0) {
    const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");
    console.log("\nAgainst the answer key:");
    console.log(`  tiers   ${tally.tierOk}/${tally.tierChecked} match (${pct(tally.tierOk, tally.tierChecked)}) — app greener than the key on ${tally.appGreener}, redder on ${tally.appRedder}`);
    console.log(`  groups  ${tally.groupOk}/${tally.groupChecked} match (${pct(tally.groupOk, tally.groupChecked)})`);
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
