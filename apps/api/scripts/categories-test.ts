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
console.log("\nAppetizers — only ever from the section header:");

expect("Crispy Calamari", "APPETIZERS", "appetizer");
expect("Burrata & Tomato", "Starters", "appetizer");
expect("Chicken Wings", "SMALL PLATES", "appetizer");
expect("Hummus & Pita", "For the Table", "appetizer");
expect("Patatas Bravas", "Tapas", "appetizer");
// The same dish with no starter header stays a main, as it always has.
expect("Chicken Wings", undefined, "main");
expect("Chicken Wings", "MAINS", "main");
// A drink printed among the starters is still a drink.
expect("Iced Tea", "STARTERS", "drink_non_alcoholic");
expect("Sake Flight", "SMALL PLATES", "drink_alcoholic");
// "Bar" alone means drinks, but bar FOOD must stay food.
expect("Truffle Fries", "BAR BITES", "appetizer");
expect("Old Fashioned", "BAR", "drink_alcoholic");
// "Sides" must not be swallowed by the appetizer words, or the reverse.
expect("French Fries", "SIDES", "side");
expect("Shareable Nachos", "MAINS", "main");

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
// Found by Ray's answer key (evals/menus, 2026-10-04): real menus where the
// rules filed a dish under the wrong tab. Each line is one of his calls.
console.log("\nAnswer-key fixes — real menus, 2026-10-04:");

// "Cocktail" is a seafood starter as often as a drink. Filing it as alcohol
// removed it from scoring entirely.
expect("CREOLE BOILED GULF SHRIMP COCKTAIL", "APPETIZERS", "appetizer");
expect("Shrimp Cocktail", undefined, "main");
expect("Crab Cocktail", "STARTERS", "appetizer");
// …while a cocktail that is a drink stays one.
expect("Champagne Cocktail", "APPETIZERS", "drink_alcoholic");
expect("House Cocktail", undefined, "drink_alcoholic");

// "Bar" claimed the whole section as a drinks list; a raw bar is oysters.
expect("OYSTER SAMPLER", "RAW BAR*", "appetizer");
expect("Oysters on the Half Shell", "OYSTER BAR", "appetizer");

// A zero-alcohol beer printed under BOTTLED BEER.
expect("HEINEKEN ZERO", "BOTTLED BEER", "drink_non_alcoholic");
expect("Athletic N/A IPA", "BEER", "drink_non_alcoholic");
expect("Clausthaler 0.0", "BEER", "drink_non_alcoholic");

// Shake flavours are bare words; only the heading says "shake".
expect("VANILLA", "CLASSIC SHAKES", "drink_non_alcoholic");
expect("STRAWBERRY CHEESECAKE", "SPECIALTY SHAKES", "drink_non_alcoholic");
expect("GREEN HORNET", "ADULT SHAKES", "drink_alcoholic");
expect("Bourbon Caramel", "BOOZY SHAKES", "drink_alcoholic");

// "À la carte" means priced individually, not "side": these are the main event.
expect("Galbi", "BBQ A La Carte (Minimum 2 order) / BEEF", "main");
expect("Samgyupsal", "BBQ A La Carte (Minimum 2 order) / PORK", "main");

// A heading that only reads as "starters" in English, not by keyword.
expect("Spanakopita", "A LITTLE SOMETHING BEFORE / GREEK", "appetizer");
expect("Breaded Onion Rings", "A LITTLE SOMETHING BEFORE / AMERICAN", "appetizer");

// Ray's rule: when the heading doesn't say, a staple accompaniment is a side.
// Exact item names only — anything more specific is still a dish.
expect("RICE", "A LA CARTA", "side");
expect("BEANS", "A LA CARTA", "side");
expect("Raita", "Soups & Salads", "side");
expect("Naan", "Breads", "side");
expect("Garlic Naan", "Breads", "side");
expect("Pineapple Fried Rice", "A LA CARTA", "main");
expect("BURRITO (2)", "A LA CARTA", "main");
expect("Chicken Biryani", "Rice Specialties", "main");
expect("Bean Burrito", undefined, "main");
// …and the menu's own explicit heading still wins over the staple list.
expect("MIXED VEGETABLES", "ENTREES - with your choice of meat or veggies", "main");
expect("FRENCH FRIES", "APPETIZERS", "appetizer");

// ---------------------------------------------------------------
console.log("\nRanked vs unranked, and the user-facing reasons:");

check("mains are ranked", isRanked("main"));
check("appetizers are ranked", isRanked("appetizer"));
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
