/**
 * Dish categorisation (EAT-20) — which bucket a menu item belongs to.
 *
 * Deliberately deterministic code rather than a model call. OCR's job is to read
 * the section header off the page (a fact); this file's job is to turn that plus
 * the item's name into a category (judgment expressed as rules). Same split the
 * scoring KB proposes, applied to a small problem: same inputs always give the
 * same bucket, the whole thing is unit-testable with no API key, and when a dish
 * lands in the wrong group you can see exactly which rule put it there.
 *
 * Why categories exist at all: the cholesterol rubric is saturated-fat-driven,
 * so anything with near-zero fat scores near 10 whether or not it is food. On a
 * real brunch menu that put four cocktails at the top of the list and told
 * someone managing cholesterol that bottomless mimosas were their best choice.
 * Ranking a mimosa against a burger on one axis is a category error.
 */

import { dishNameTokens } from "@/lib/claude/dishName";
import type { DishCategory } from "@/lib/types";

/** Categories we score and rank. */
export const RANKED_CATEGORIES: readonly DishCategory[] = [
  "main",
  "side",
  "dessert",
  "drink_non_alcoholic",
];

/**
 * Categories shown but never scored.
 *
 * Alcohol: it has no saturated fat, so this rubric would rate every cocktail
 * near 10 — a non-answer wearing the costume of an answer. Shown and labelled
 * instead, which informs without pretending to advise.
 *
 * Condiments: a side of aioli isn't a choice you're weighing against an entrée.
 * Note this applies ONLY to a sauce the menu lists as its own item. A sauce
 * named inside a dish's description is part of that dish and must still drive
 * its score — the hollandaise is the whole point of a Benedict.
 */
export const UNRANKED_CATEGORIES: readonly DishCategory[] = [
  "drink_alcoholic",
  "condiment",
];

export function isRanked(category: DishCategory): boolean {
  return RANKED_CATEGORIES.includes(category);
}

/** User-facing group heading. */
export const CATEGORY_LABEL: Record<DishCategory, string> = {
  main: "Mains",
  side: "Sides",
  dessert: "Desserts",
  drink_non_alcoholic: "Drinks",
  drink_alcoholic: "Alcohol",
  condiment: "Sauces & Condiments",
};

/**
 * Badge text for the best dish in each ranked category. Comparative by design:
 * it says "strongest option in this group", and the tier colour says how good
 * that is. The two together stay honest on a menu with no good entrée.
 */
export const BEST_IN_CATEGORY_LABEL: Partial<Record<DishCategory, string>> = {
  main: "Best main",
  side: "Best side",
  dessert: "Best dessert",
  drink_non_alcoholic: "Best drink",
};

/** Why an item wasn't scored — shown to the user, so it must be plain and honest. */
export const UNRANKED_REASON: Partial<Record<DishCategory, string>> = {
  drink_alcoholic: "Alcohol isn't scored for cholesterol.",
  condiment: "Sauces and condiments aren't scored on their own.",
};

// -----------------------------------------------------------
// Matching helpers
// -----------------------------------------------------------

/**
 * Fold to space-separated words, padded so whole-word checks are a substring test.
 *
 * Reuses dishNameTokens rather than rolling a second normalizer, deliberately.
 * The first version here did its own `replace(/[^a-z0-9]+/g, " ")`, which DELETES
 * accented letters instead of folding them — so "Crème Brûlée" became
 * "cr me br l e" and never matched "creme brulee". That is the same defect as
 * EAT-18, reintroduced from scratch, which is what happens when diacritic
 * handling lives in more than one place. It now lives in exactly one.
 *
 * (dishName.ts sits under claude/ for historical reasons but is a general text
 * utility with no model dependency.)
 */
function normalize(text: string): string {
  return ` ${dishNameTokens(text).join(" ")} `;
}

const has = (haystack: string, needles: readonly string[]): boolean =>
  needles.some((n) => haystack.includes(` ${n} `));

// -----------------------------------------------------------
// Section headers
// -----------------------------------------------------------

type SectionKind =
  | "drink_alcoholic"
  | "drink_non_alcoholic"
  | "drink_generic"
  | "side"
  | "dessert"
  | "condiment"
  | "food";

/**
 * A drinks section can be explicitly alcoholic, explicitly not, or generic —
 * and the difference matters. "BOTTOMLESS CLASSIC ORANGE" contains no word
 * suggesting alcohol; it is only a mimosa because of the section above it. Meanwhile
 * a plain "Drinks" section can hold sparkling water next to beer, so there the
 * item has to decide. Getting this wrong in either direction either hides a real
 * cocktail or wrongly suppresses a soft drink.
 */
const SECTION_PATTERNS: readonly { kind: SectionKind; words: readonly string[] }[] = [
  {
    kind: "drink_non_alcoholic",
    words: ["soft drinks", "mocktails", "mocktail", "non alcoholic", "zero proof",
            "coffee", "tea", "juices", "smoothies", "sodas"],
  },
  {
    kind: "drink_alcoholic",
    words: ["cocktails", "cocktail", "mimosas", "mimosa", "wine", "wines", "beer",
            "beers", "draft", "draught", "spirits", "bar", "happy hour", "bubbles",
            "sake", "margaritas", "on tap", "brews", "hard seltzer"],
  },
  {
    kind: "drink_generic",
    words: ["drinks", "beverages", "beverage", "sips", "liquids", "refreshments"],
  },
  { kind: "condiment", words: ["sauces", "sauce", "condiments", "dressings", "dips", "extras"] },
  {
    kind: "dessert",
    words: ["desserts", "dessert", "sweets", "sweet", "puddings", "pudding",
            "ice cream", "gelato", "pastries", "bakery"],
  },
  {
    kind: "side",
    words: ["sides", "side", "side orders", "add ons", "add on", "extras sides",
            "a la carte", "accompaniments"],
  },
];

function classifySection(section: string | undefined): SectionKind | null {
  if (!section?.trim()) return null;
  const s = normalize(section);
  for (const { kind, words } of SECTION_PATTERNS) {
    if (has(s, words)) return kind;
  }
  return "food";
}

// -----------------------------------------------------------
// Item names
// -----------------------------------------------------------

/**
 * Words that make an item alcoholic on its own. "Hard" qualifiers are listed
 * explicitly because the bare noun is non-alcoholic — a seltzer is water, a hard
 * seltzer is not, and cider goes either way depending on the region.
 */
const ALCOHOL_WORDS: readonly string[] = [
  "beer", "lager", "ale", "ipa", "stout", "pilsner", "porter", "wine", "red wine",
  "white wine", "rose", "champagne", "prosecco", "cava", "sparkling wine", "sangria",
  "mimosa", "bellini", "spritz", "aperol", "campari", "negroni", "martini", "margarita",
  "mojito", "daiquiri", "paloma", "michelada", "manhattan", "cosmopolitan", "old fashioned",
  "bloody mary", "whiskey", "whisky", "bourbon", "scotch", "rye", "vodka", "gin", "rum",
  "tequila", "mezcal", "brandy", "cognac", "sake", "soju", "shochu", "cider hard",
  "hard cider", "hard seltzer", "cocktail", "liqueur", "vermouth", "absinthe", "grappa",
];

/** Explicit non-alcoholic markers — these win inside an alcoholic section. */
const NON_ALCOHOLIC_WORDS: readonly string[] = [
  "virgin", "mocktail", "non alcoholic", "nonalcoholic", "alcohol free", "zero proof",
  "na beer", "soft drink", "soft drinks",
];

const BEVERAGE_WORDS: readonly string[] = [
  "coffee", "espresso", "americano", "latte", "cappuccino", "macchiato", "mocha",
  "cortado", "flat white", "cold brew", "tea", "chai", "matcha", "juice", "lemonade",
  "limeade", "soda", "cola", "coke", "pepsi", "sprite", "fanta", "root beer",
  "ginger ale", "tonic", "seltzer", "sparkling water", "still water", "water",
  "milkshake", "shake", "smoothie", "horchata", "agua fresca", "kombucha", "milk",
  "hot chocolate", "cocoa", "cider",
];

const DESSERT_WORDS: readonly string[] = [
  "cake", "pie", "tart", "brownie", "cookie", "cookies", "ice cream", "gelato",
  "sorbet", "sundae", "cheesecake", "tiramisu", "creme brulee", "panna cotta",
  "pudding", "mousse", "cobbler", "donut", "donuts", "doughnut", "churros", "baklava",
  "affogato", "profiteroles", "eclair", "macaron", "macarons",
];

const looksAlcoholic = (name: string) => has(normalize(name), ALCOHOL_WORDS);
const looksNonAlcoholic = (name: string) => has(normalize(name), NON_ALCOHOLIC_WORDS);
const looksBeverage = (name: string) => has(normalize(name), BEVERAGE_WORDS);
const looksDessert = (name: string) => has(normalize(name), DESSERT_WORDS);

// -----------------------------------------------------------
// The waterfall
// -----------------------------------------------------------

/**
 * Assign a category from the item's name and the menu section it appeared under.
 *
 * Two invariants hold at every step:
 *
 * 1. **The description is never an input.** Only the item's own identity decides.
 *    This is what stops "Steak, brandy cream sauce" being read as a drink and
 *    disappearing out of the ranked list — losing a real meal option is the worst
 *    outcome available here. The brandy still affects the SCORE, via the ranking
 *    prompt, which does see descriptions; it just can't move the dish's bucket.
 * 2. **Unknown means `main`.** Defaulting to the ranked bucket keeps a dish
 *    visible and scored. Every other default risks silently suppressing food.
 */
export function categorizeDish(dish: { name: string; section?: string }): DishCategory {
  const kind = classifySection(dish.section);

  // An explicitly alcoholic section carries its items, since the names often
  // don't announce themselves ("Bottomless Classic Orange"). An explicit
  // non-alcoholic marker on the item still wins — a Virgin Mary under COCKTAILS.
  if (kind === "drink_alcoholic") {
    return looksNonAlcoholic(dish.name) ? "drink_non_alcoholic" : "drink_alcoholic";
  }

  // A generic or explicitly soft drinks section: the item decides, defaulting to
  // non-alcoholic. A "Drinks" list holding sparkling water beside beer is common.
  if (kind === "drink_generic" || kind === "drink_non_alcoholic") {
    return looksAlcoholic(dish.name) ? "drink_alcoholic" : "drink_non_alcoholic";
  }

  // Food sections. A beverage listed among the sides is still a beverage.
  if (kind === "side" || kind === "dessert" || kind === "condiment" || kind === "food") {
    if (looksAlcoholic(dish.name)) return "drink_alcoholic";
    if (looksBeverage(dish.name)) return "drink_non_alcoholic";
    if (kind === "food") return "main";
    return kind;
  }

  // No section header at all — infer from the name, then fall back to `main`.
  if (looksAlcoholic(dish.name)) return "drink_alcoholic";
  if (looksBeverage(dish.name)) return "drink_non_alcoholic";
  if (looksDessert(dish.name)) return "dessert";
  return "main";
}
