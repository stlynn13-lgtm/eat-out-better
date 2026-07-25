/**
 * Ranking repeatability test.
 *
 * Question it answers: if the SAME menu (identical extracted text) is scored
 * many times, how much does each dish's score wander? This isolates the
 * temperature / model non-determinism (variance source #2). It does NOT test
 * photo/OCR variance (source #1) — that needs a corpus of real photos and is a
 * separate test.
 *
 * It runs the REAL ranking prompt (getRankingSystemPrompt / getRankingUserPrompt)
 * against the REAL model (Haiku 4.5), at both temp 0.2 (current live setting)
 * and temp 0.0, so you also see how much temperature alone contributes.
 *
 * Run from apps/api (needs ANTHROPIC_API_KEY in the environment):
 *   npx tsx scripts/repeatability-test.ts
 *   RUNS=30 npx tsx scripts/repeatability-test.ts     // override run count
 *
 * Output: a per-dish summary table in the console + a CSV of every raw score.
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";
import { getRankingSystemPrompt, getRankingUserPrompt } from "../src/lib/claude/prompts";

// --- Config -------------------------------------------------
const MODEL = "claude-haiku-4-5-20251001"; // mirrors MODELS.HAIKU
const RUNS = Number(process.env.RUNS ?? 25);
const TEMPERATURES = [0.2, 0.0]; // 0.2 = current live; 0.0 = fully greedy
const CONDITION = "high_cholesterol" as const;

// Fixed dish set: the 7 decomposed dishes + 2 deliberately borderline dishes
// chosen to sit near the green/yellow (7.0) line, where a tier flip would hurt.
const DISHES = [
  { name: "Fettuccine Alfredo", description: "fettuccine in a rich parmesan cream sauce" },
  { name: "Coconut Curry", description: "vegetables simmered in coconut milk curry" },
  { name: "Bacon Cheeseburger", description: "beef patty, cheddar, bacon, brioche bun" },
  { name: "Cheese Pizza", description: "two slices, mozzarella, tomato sauce" },
  { name: "Caesar Salad", description: "romaine, parmesan, creamy caesar dressing, croutons" },
  { name: "Spinach & Egg Omelet", description: "two-egg omelet with spinach" },
  { name: "Grilled Salmon", description: "6oz fillet, grilled, lemon" },
  // Borderline probes (expected near the 7.0 line):
  { name: "Turkey Club Sandwich", description: "roast turkey, bacon, lettuce, tomato, mayo" },
  { name: "Chicken Burrito Bowl", description: "grilled chicken, black beans, rice, salsa, cheese" },
];

// Green >= 7.0, Yellow 4.0-6.9, Red <= 3.9 (mirrors config/scoring.ts)
function tierOf(score: number): "green" | "yellow" | "red" {
  if (score >= 7.0) return "green";
  if (score >= 4.0) return "yellow";
  return "red";
}

// --- Model call ---------------------------------------------
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 2,
  timeout: 60_000,
});

async function scoreOnce(temperature: number): Promise<Map<string, number>> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    temperature,
    system: getRankingSystemPrompt(CONDITION),
    messages: [{ role: "user", content: getRankingUserPrompt(DISHES, CONDITION) }],
  });

  const block = message.content[0];
  const raw = block.type === "text" ? block.text.trim() : "";
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(cleaned) as Array<{ name: string; score: number }>;
  const scores = new Map<string, number>();
  for (const d of parsed) scores.set(d.name, d.score);
  return scores;
}

// --- Stats --------------------------------------------------
function summarize(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  const tiers = new Set(values.map(tierOf));
  return { min, max, range: max - min, mean, std, tierFlips: tiers.size - 1 };
}

// --- Main ---------------------------------------------------
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Run from apps/api with your .env loaded.");
    process.exit(1);
  }

  const csvRows: string[] = ["temperature,run,dish,score"];

  for (const temp of TEMPERATURES) {
    console.log(`\n=== temperature ${temp} — ${RUNS} runs ===`);
    const perDish = new Map<string, number[]>();
    DISHES.forEach((d) => perDish.set(d.name, []));

    for (let i = 0; i < RUNS; i++) {
      try {
        const scores = await scoreOnce(temp);
        for (const d of DISHES) {
          const s = scores.get(d.name);
          if (s != null) {
            perDish.get(d.name)!.push(s);
            csvRows.push(`${temp},${i + 1},"${d.name}",${s}`);
          }
        }
        process.stdout.write(".");
      } catch (err) {
        process.stdout.write("x");
        console.error(`\n run ${i + 1} failed:`, err instanceof Error ? err.message : err);
      }
    }

    console.log("\n");
    console.log("dish".padEnd(26), "mean".padEnd(7), "min".padEnd(6), "max".padEnd(6), "range".padEnd(7), "std".padEnd(7), "tierFlips");
    for (const d of DISHES) {
      const vals = perDish.get(d.name)!;
      if (vals.length === 0) { console.log(d.name.padEnd(26), "no data"); continue; }
      const s = summarize(vals);
      const flag = s.tierFlips > 0 || s.range > 1.0 ? "  <-- CHECK" : "";
      console.log(
        d.name.padEnd(26),
        s.mean.toFixed(2).padEnd(7),
        s.min.toFixed(1).padEnd(6),
        s.max.toFixed(1).padEnd(6),
        s.range.toFixed(1).padEnd(7),
        s.std.toFixed(2).padEnd(7),
        String(s.tierFlips) + flag
      );
    }
  }

  const outPath = "repeatability-results.csv";
  writeFileSync(outPath, csvRows.join("\n"));
  console.log(`\nRaw scores written to ${outPath}`);
  console.log("Read: range <= 0.5 and 0 tier flips = cosmetic. Any tier flip or range > 1.0 = real.");
}

main().catch((e) => { console.error(e); process.exit(1); });
