/**
 * Regression check for the EAT-9 description-pairing guard.
 *
 * The bug this protects against: a real menu item shown carrying a DIFFERENT
 * dish's description ("coffee" presented as an arugula salad with feta). On a
 * dense multi-column menu the OCR step pairs a name from one column with text
 * printed beside another, and once that reaches the ranker the score is
 * computed from ingredients the dish does not have.
 *
 * Needs no API key and makes no network calls — pure logic.
 *
 *   npm run test:dedupe
 */

import { deduplicateDishes } from "../src/lib/claude/ocr";
import type { ExtractedDish } from "../src/lib/types";

interface Case {
  name: string;
  input: ExtractedDish[];
  expect: ExtractedDish[];
}

const d = (name: string, description?: string): ExtractedDish => ({
  name,
  description,
});

const CASES: Case[] = [
  {
    name: "keeps a single description when nothing disagrees",
    input: [d("Coffee", "Freshly brewed"), d("Coffee")],
    expect: [d("Coffee", "Freshly brewed")],
  },
  {
    name: "same description repeated across pages is not a conflict",
    input: [
      d("House Salad", "Mixed greens, vinaigrette"),
      d("House Salad", "mixed greens, vinaigrette"), // case-only difference
    ],
    expect: [d("House Salad", "Mixed greens, vinaigrette")],
  },
  {
    name: "two different descriptions drop both",
    input: [
      d("Coffee", "Freshly brewed"),
      d("Coffee", "Arugula, feta, lemon vinaigrette"),
    ],
    expect: [d("Coffee", undefined)],
  },
  {
    // Regression: the bare entry arriving FIRST used to let the wrong
    // description install itself unopposed, because there was nothing to
    // disagree with yet.
    name: "bare-then-described does not silently adopt an unverified description",
    input: [
      d("Coffee"),
      d("Coffee", "Arugula, feta, lemon vinaigrette"),
      d("Coffee", "Freshly brewed"),
    ],
    expect: [d("Coffee", undefined)],
  },
  {
    // Regression: the guard used to be non-sticky. Once a conflict cleared the
    // description, the next page repeating it walked straight back in through
    // the "prefer the entry that has a description" branch.
    name: "a cleared conflict cannot be re-poisoned by a later page",
    input: [
      d("Coffee", "Freshly brewed"),
      d("Coffee", "Arugula, feta, lemon vinaigrette"),
      d("Coffee", "Arugula, feta, lemon vinaigrette"),
      d("Coffee", "Arugula, feta, lemon vinaigrette"),
    ],
    expect: [d("Coffee", undefined)],
  },
  {
    // Regression: OCR keyed on `toLowerCase().trim()` while ranking keyed on
    // alphanumerics-only, so these survived here as two dishes but collapsed to
    // one key in the ranker's subset guard — and one of them vanished from the
    // results with no warning.
    name: "punctuation variants collapse to one dish, matching the ranker's key",
    input: [d("Caesar Salad", "Romaine, parmesan"), d("Caesar-Salad")],
    expect: [d("Caesar Salad", "Romaine, parmesan")],
  },
  {
    // The normalizer strips punctuation but does not transliterate words, so
    // these stay distinct on BOTH sides. That is consistent, which is all the
    // subset guard needs — worth pinning so nobody "fixes" one side alone.
    name: "word-level variants stay distinct (consistently, on both sides)",
    input: [d("Fish & Chips", "Beer battered cod"), d("Fish and Chips")],
    expect: [d("Fish & Chips", "Beer battered cod"), d("Fish and Chips", undefined)],
  },
  {
    name: "distinct dishes are left alone",
    input: [d("Grilled Salmon", "With lemon"), d("Grilled Chicken")],
    expect: [d("Grilled Salmon", "With lemon"), d("Grilled Chicken", undefined)],
  },
  {
    name: "punctuation-only names are dropped, not ranked",
    input: [d("---"), d("Soup of the Day", "Ask your server")],
    expect: [d("Soup of the Day", "Ask your server")],
  },
  {
    name: "preserves first-seen order and original spelling",
    input: [d("Ahi Tuna"), d("BLT"), d("ahi tuna", "Seared rare")],
    expect: [d("Ahi Tuna", "Seared rare"), d("BLT", undefined)],
  },
];

function describe(dishes: ExtractedDish[]): string {
  return JSON.stringify(
    dishes.map((x) => [x.name, x.description ?? null]),
  );
}

let failed = 0;
for (const testCase of CASES) {
  const actual = deduplicateDishes(testCase.input);
  const ok = describe(actual) === describe(testCase.expect);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${testCase.name}`);
  if (!ok) {
    console.log(`      expected ${describe(testCase.expect)}`);
    console.log(`      actual   ${describe(actual)}`);
  }
}

console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed === 0 ? 0 : 1);
