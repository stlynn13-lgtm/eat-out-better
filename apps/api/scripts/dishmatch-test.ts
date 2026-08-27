/**
 * Regression check for EAT-18 — real dishes coming back "We couldn't score this one".
 *
 * The bug: the ranker's echo of the dish NAME was the join key, so its spelling
 * was load-bearing. It returned "Creme Brulee" for "Crème Brûlée", the name
 * didn't match, EAT-9's anti-hallucination guard discarded a perfectly good
 * score as an off-menu dish, and the dish was re-added unscored at a flat 5.0.
 *
 * The fix keys off the item number we print next to each dish, cross-checked
 * against the name. These tests pin both halves: the rename must now survive,
 * AND a drifted item number must never silently move a score onto another dish.
 *
 * Needs no API key and makes no network calls — pure logic.
 *
 *   npm run test:dishmatch
 */

import { parseRankingResponse } from "../src/lib/claude/ranking";
import {
  normalizeDishName,
  namesPlausiblyMatch,
  matchesNameWithDescription,
} from "../src/lib/claude/dishName";
import type { ExtractedDish } from "../src/lib/types";

let failures = 0;

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const d = (name: string, description?: string): ExtractedDish => ({ name, description });

// ---------------------------------------------------------------
// 1. The exact names that used to break
// ---------------------------------------------------------------
console.log("\nName folding — cosmetic differences must not decide scoring:");

const SHOULD_MATCH: [string, string][] = [
  ["Crème Brûlée", "Creme Brulee"],
  ["Sautéed Spinach", "Sauteed Spinach"],
  ["Fish & Chips", "Fish and Chips"],
  ["Mac 'n' Cheese", "Mac and Cheese"],
  ["Shrimp Scampi (GF)", "Shrimp Scampi"],
  ["Entrée Salad", "Entree Salad"],
  ["Bún Chả", "Bun Cha"],
  ["FETTUCCINE ALFREDO", "Fettuccine Alfredo"],
  ["Grilled Salmon*", "Grilled Salmon"],
  ["Caesar Salad", "Caesar salad"],
];
for (const [menu, echo] of SHOULD_MATCH) {
  check(
    `"${menu}" ≡ "${echo}"`,
    normalizeDishName(menu) === normalizeDishName(echo),
    `${normalizeDishName(menu)} vs ${normalizeDishName(echo)}`
  );
}

// Abbreviations aren't folded by the key (that would make the key unsafe to
// search with) but are accepted when confirming a known item number.
check(
  '"Chicken Parm." confirms item holding "Chicken Parmesan"',
  namesPlausiblyMatch("Chicken Parmesan", "Chicken Parm.")
);

console.log("\nDifferent dishes must NEVER be treated as the same dish:");
const SHOULD_NOT_MATCH: [string, string][] = [
  ["Steak", "Tea"], // "tea" is a substring of "steak" — the squashed-string trap
  ["Chicken Soup", "Chicken Salad"],
  ["Grilled Salmon", "Fried Salmon"],
  ["House Salad", "House Burger"],
];
for (const [a, b] of SHOULD_NOT_MATCH) {
  check(`"${a}" ≠ "${b}"`, !namesPlausiblyMatch(a, b));
}

// ---------------------------------------------------------------
// 2. The end-to-end regression: a rename must keep its real score
// ---------------------------------------------------------------
console.log("\nEnd-to-end — a re-spelled dish keeps the score it was given:");

const menu = [d("Crème Brûlée"), d("Grilled Salmon"), d("Fish & Chips")];
const respelled = JSON.stringify([
  { item: 1, name: "Creme Brulee", score: 2.4, explanation: "Cream and egg yolk.", substitution: null },
  { item: 2, name: "Grilled Salmon", score: 9.1, explanation: "Mostly unsaturated.", substitution: null },
  { item: 3, name: "Fish and Chips", score: 3.2, explanation: "Deep fried.", substitution: null },
]);
const parsed = parseRankingResponse(respelled, menu);

check("all three dishes present", parsed.length === 3, `got ${parsed.length}`);
check("Crème Brûlée kept its 2.4", parsed[0].score === 2.4, `got ${parsed[0].score}`);
check("Fish & Chips kept its 3.2", parsed[2].score === 3.2, `got ${parsed[2].score}`);
check(
  "nothing was left unscored",
  !parsed.some((p) => p.explanation.includes("couldn't score")),
  parsed.find((p) => p.explanation.includes("couldn't score"))?.name
);
check(
  "names shown are the menu's, not the model's",
  parsed[0].name === "Crème Brûlée" && parsed[2].name === "Fish & Chips",
  parsed.map((p) => p.name).join(", ")
);

// ---------------------------------------------------------------
// 3. A drifted item number must not move a score onto another dish
// ---------------------------------------------------------------
console.log("\nIndex drift — a wrong item number must never mis-assign a score:");

const drifted = JSON.stringify([
  // Claims item 1, but the name is plainly dish 2. Trust the name, not the number.
  { item: 1, name: "Grilled Salmon", score: 9.1, explanation: "Mostly unsaturated.", substitution: null },
]);
const driftParsed = parseRankingResponse(drifted, menu);
const salmon = driftParsed.find((p) => p.name === "Grilled Salmon");
const brulee = driftParsed.find((p) => p.name === "Crème Brûlée");

check("the 9.1 landed on Grilled Salmon", salmon?.score === 9.1, `got ${salmon?.score}`);
check(
  "Crème Brûlée was NOT given the salmon's score",
  brulee?.score === 5.0 && brulee.explanation.includes("couldn't score"),
  `got ${brulee?.score}`
);

// ---------------------------------------------------------------
// 4. EAT-9 still holds, and the item number never leaks to the client
// ---------------------------------------------------------------
console.log("\nEAT-9 guard intact, and no internal fields escape:");

const hallucinated = JSON.stringify([
  { item: 1, name: "Crème Brûlée", score: 2.4, explanation: "Cream and egg yolk.", substitution: null },
  { item: 2, name: "Grilled Salmon", score: 9.1, explanation: "Mostly unsaturated.", substitution: null },
  { item: 3, name: "Fish & Chips", score: 3.2, explanation: "Deep fried.", substitution: null },
  { item: 4, name: "Lobster Thermidor", score: 2.0, explanation: "Invented.", substitution: null },
]);
const guarded = parseRankingResponse(hallucinated, menu);
check("off-menu dish dropped", !guarded.some((p) => p.name === "Lobster Thermidor"));
check("output is exactly the extracted set", guarded.length === menu.length, `got ${guarded.length}`);

const leaked = guarded.flatMap((dish) =>
  Object.keys(dish).filter((k) => !["name", "score", "explanation", "substitution"].includes(k))
);
check(
  "no item/index/rank field on a scored dish",
  leaked.length === 0,
  `leaked: ${[...new Set(leaked)].join(", ")}`
);

// ---------------------------------------------------------------
// 5. EAT-19 — the ranker echoes the name WITH the description appended
// ---------------------------------------------------------------
console.log("\nEAT-19 — a name echoed with its description still scores:");

const described = [
  d("2 EGGS", "VITAL Farms Pasture Raised"),
  d("HALF AVOCADO"), // no description — the control
  d("MONGOLIAN BBQ DUCK BAO", "Koji Pickled Cucumber & Scallion"),
];
const conflated = JSON.stringify([
  { item: 1, name: "2 EGGS — VITAL Farms Pasture Raised", score: 8.0, explanation: "Low saturated fat.", substitution: null },
  { item: 2, name: "HALF AVOCADO", score: 9.0, explanation: "Mostly unsaturated.", substitution: null },
  { item: 3, name: "MONGOLIAN BBQ DUCK BAO — Koji Pickled Cucumber & Scallion", score: 4.0, explanation: "Duck skin.", substitution: null },
]);
const rescued = parseRankingResponse(conflated, described);

check(
  "all three kept",
  !rescued.some((p) => p.explanation.includes("couldn't score")),
  rescued.filter((p) => p.explanation.includes("couldn't score")).map((p) => p.name).join(", ")
);
check("described dish kept its 8.0", rescued[0].score === 8.0, `got ${rescued[0].score}`);
check("undescribed control kept its 9.0", rescued[1].score === 9.0, `got ${rescued[1].score}`);
check(
  "names shown are the menu's, not the echo",
  rescued[0].name === "2 EGGS" && rescued[2].name === "MONGOLIAN BBQ DUCK BAO",
  rescued.map((p) => p.name).join(", ")
);

console.log("\nEAT-19 guards — the rescue must not mis-assign a score:");

// A menu where one dish name is a prefix of another. An echo naming the LONGER
// dish must never be accepted for the shorter one's slot.
const prefixMenu = [d("HOUSE SALAD", "Mixed greens"), d("HOUSE SALAD LARGE", "Mixed greens, double")];
const wrongSlot = JSON.stringify([
  { item: 1, name: "HOUSE SALAD LARGE — Mixed greens, double", score: 2.0, explanation: "Wrong slot.", substitution: null },
]);
const guarded19 = parseRankingResponse(wrongSlot, prefixMenu);
// The item number says slot 1, the name says dish 2. Which one is wrong is
// unknowable, so the score is DISCARDED rather than attributed to either dish.
// An unscored dish is recoverable; a confident score on the wrong dish is not.
check(
  "an ambiguous echo is discarded, not attributed to either dish",
  guarded19.every((p) => p.explanation.includes("couldn't score")),
  `salad=${guarded19[0].score} large=${guarded19[1].score}`
);
check(
  "specifically, HOUSE SALAD did not inherit the 2.0",
  guarded19[0].score === 5.0,
  `got ${guarded19[0].score}`
);
check(
  "a different dish's name+description is not accepted for this slot",
  !matchesNameWithDescription(prefixMenu[0], "HOUSE SALAD LARGE — Mixed greens, double")
);
check(
  "an undescribed dish never matches the description rule",
  !matchesNameWithDescription(d("HALF AVOCADO"), "HALF AVOCADO — anything at all")
);

// ---------------------------------------------------------------
console.log(
  failures === 0
    ? "\nAll checks passed.\n"
    : `\n${failures} check(s) FAILED.\n`
);
process.exit(failures === 0 ? 0 : 1);
