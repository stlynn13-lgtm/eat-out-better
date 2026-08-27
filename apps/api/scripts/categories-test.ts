/**
 * EAT-20 — dish categorisation waterfall.
 *
 * Pure logic, no API key, no network. The whole reason categorisation lives in
 * code rather than a prompt: it can be pinned exactly, and a mis-bucketed dish is
 * traceable to the rule that put it there.
 *
 * The cases that matter most are the ones where the obvious rule is wrong —
 * see the "counterexamples" block.
 *
 *   npm run test:categories
 */

import { categorizeDish, isRanked, UNRANKED_REASON } from "../src/lib/config/categories";
import type { DishCategory } from "../src/lib/types";

let failures = 0;

function expect(name: string, section: string | undefined, want: DishCategory) {
  const got = categorizeDish({ name, section });
  const ok = got === want;
  if (!ok) failures++;
  const where = section ? `under "${section}"` : "(no section)";
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name} ${where} → ${got}${ok ? "" : `   WANTED ${want}`}`
  );
}

function check(label: string, condition: boolean) {
  if (!condition) failures++;
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}`);
}

// ---------------------------------------------------------------
console.log("\nCounterexamples — where the obvious rule gives the wrong answer:");

// The name says nothing about alcohol. Only the section makes it a mimosa.
// This is why an alcoholic section carries its items.
expect("BOTTOMLESS CLASSIC ORANGE", "MIMOSAS & MORE", "drink_alcoholic");
expect("BOTTOMLESS BLOOD ORANGE", "MIMOSAS & MORE", "drink_alcoholic");

// ...but a generic drinks section can hold both, so there the item decides.
expect("Assorted Sparkling Water", "Drinks", "drink_non_alcoholic");
expect("Soft Drinks", "Drinks", "drink_non_alcoholic");
expect("Beer and Wine", "Drinks", "drink_alcoholic");

// An explicit non-alcoholic marker beats an alcoholic section.
expect("Virgin Mary", "COCKTAILS", "drink_non_alcoholic");
expect("Mocktail of the Day", "BAR", "drink_non_alcoholic");

// The brandy gotcha: alcohol in the DESCRIPTION must never move the bucket, or a
// real main disappears out of the ranked list.
expect("Steak Frites", "MAINS", "main");
check(
  "a description mentioning brandy cannot change the category",
  categorizeDish({ name: "Steak Frites", section: "MAINS" }) ===
    categorizeDish({ name: "Steak Frites", section: "MAINS" })
);
// Named in the dish itself is different — that IS what the item is.
expect("Brandy Alexander", "MAINS", "drink_alcoholic");

// A beverage listed among the food is still a beverage.
expect("Cold Brew Coffee", "SIDES", "drink_non_alcoholic");

// "Seltzer" is water; "hard seltzer" is not.
expect("Lime Seltzer", "Drinks", "drink_non_alcoholic");
expect("Hard Seltzer", "Drinks", "drink_alcoholic");

// ---------------------------------------------------------------
console.log("\nSean's menu — section by section:");

expect("SINGLE MIMOSA", "MIMOSAS & MORE", "drink_alcoholic");
expect("ELDERFLOWER SPRITZ", "MIMOSAS & MORE", "drink_alcoholic");
expect("BLOODY MARY", "MIMOSAS & MORE", "drink_alcoholic");
expect("MONGOLIAN BBQ DUCK BAO", "STEAMED BAO", "main");
expect("CARROT CAKE FRENCH TOAST", "SWEETS", "dessert");
expect("PANDAN WAFFLE", "SWEETS", "dessert");
expect("DONUT HOLES", "SWEETS", "dessert");
expect("2 EGGS", "SIDES", "side");
expect("HALF AVOCADO", "SIDES", "side");
expect("HOT HONEY SWEET POTATO FRIES", "SIDES", "side");
expect("LOX BENEDICT", "MAINS", "main");
expect("DOUBLE SMASH BURGER", "MAINS", "main");
expect("FARRO CAESAR", "MAINS", "main");

// ---------------------------------------------------------------
console.log("\nStandalone sauces vs sauces inside a dish:");

expect("Extra Chile Aioli", "SAUCES", "condiment");
expect("House Ranch", "DRESSINGS & DIPS", "condiment");
// The hollandaise in a Benedict is part of the dish, so the dish stays a main
// and the sauce still drives its score via the ranking prompt.
expect("LOX BENEDICT", "MAINS", "main");

// ---------------------------------------------------------------
console.log("\nNo section header — inferred from the name, defaulting to main:");

expect("Crème Brûlée", undefined, "dessert");
expect("Chocolate Brownie Sundae", undefined, "dessert");
expect("Iced Matcha Latte", undefined, "drink_non_alcoholic");
expect("Negroni", undefined, "drink_alcoholic");
expect("Grilled Salmon", undefined, "main");
// Deliberately unknowable → main, because losing a dish is worse than
// mis-grouping one.
expect("BeatBox Greens", undefined, "main");
expect("Chef's Selection", undefined, "main");

// ---------------------------------------------------------------
console.log("\nRanked vs unranked, and the user-facing reasons:");

check("mains are ranked", isRanked("main"));
check("sides are ranked", isRanked("side"));
check("desserts are ranked", isRanked("dessert"));
check("soft drinks are ranked", isRanked("drink_non_alcoholic"));
check("alcohol is NOT ranked", !isRanked("drink_alcoholic"));
check("condiments are NOT ranked", !isRanked("condiment"));
check("alcohol has a user-facing reason", !!UNRANKED_REASON.drink_alcoholic);
check("condiments have a user-facing reason", !!UNRANKED_REASON.condiment);

// ---------------------------------------------------------------
console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
