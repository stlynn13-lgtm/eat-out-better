/**
 * One canonical dish-name key, shared by the OCR and ranking steps.
 *
 * These two steps MUST agree. OCR used to dedupe on `name.toLowerCase().trim()`
 * while ranking matched on alphanumerics-only, so "Caesar Salad" and
 * "Caesar-Salad" survived OCR as two dishes but collapsed to one key in
 * ranking's subset guard — leaving one of them with no slot to be re-added
 * into, and it silently vanished from the results. EAT-9 promises the ranked
 * set equals the extracted set; that only holds if both sides key dishes the
 * same way.
 *
 * EAT-18 widened what this folds away. The old version stripped every
 * non-`a-z0-9` character, which DELETED accented letters rather than folding
 * them: "Crème Brûlée" became "crmebrle", so when the ranker echoed back the
 * perfectly reasonable "Creme Brulee" ("cremebrulee") nothing matched, the real
 * score was discarded as an off-menu hallucination, and the dish came back
 * unscored. Accents, ampersands and dietary tags are cosmetic — they must never
 * decide whether a dish gets a score.
 *
 * Still deliberately NOT handled: word-level synonyms. "Chicken Parm." and
 * "Chicken Parmesan" remain different keys here. Fuzzy matching belongs in
 * `namesPlausiblyMatch` (which only ever CONFIRMS a match we already have a
 * reason to believe), never in this function — this key is used to SEARCH, and
 * a loose search silently attaches a score to the wrong dish.
 */

/** Cosmetic markers menus add that say nothing about the dish: "(GF)", "[new]". */
const PARENTHETICAL = /\([^)]*\)|\[[^\]]*\]/g;

/** " & " and " 'n' " are the same word. Spaced so "and" can't fuse into a neighbour. */
const AMPERSAND = /&/g;
const CONTRACTED_AND = /\s['’]?n['’]?\s/g;

/** Combining accents left behind by NFD decomposition. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Lowercases, folds accents to their base letter, normalizes "and", and drops
 * cosmetic markers and punctuation. "Crème Brûlée" and "Creme Brulee" both
 * become "cremebrulee".
 */
export function normalizeDishName(name: string): string {
  return foldToWords(name).join("");
}

/**
 * Same folding as `normalizeDishName`, but keeps word boundaries so callers can
 * compare names token by token.
 */
export function dishNameTokens(name: string): string[] {
  return foldToWords(name);
}

function foldToWords(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(PARENTHETICAL, " ")
    .replace(AMPERSAND, " and ")
    .replace(CONTRACTED_AND, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Is `candidate` plausibly the same dish as `expected`?
 *
 * ONLY for confirming a match we already have independent reason to believe —
 * specifically, that the ranker returned item number N and we want to check
 * that the name it attached looks like the dish we actually sent in slot N.
 * Never use it to search for a dish by name: it is deliberately loose, and a
 * loose search mis-attributes scores.
 *
 * Beyond an exact key match, it accepts one abbreviated word: same number of
 * words, each pair identical or one a prefix of the other ("Chicken Parm." vs
 * "Chicken Parmesan").
 *
 * Three deliberate limits, each of them a false positive we'd otherwise hit:
 * - Compares word by word, not on the squashed key: "tea" is a substring of
 *   "steak", so substring matching would call a cup of tea a steak.
 * - Requires the same word count. "Chicken" vs "Chicken Soup" is a real
 *   difference on a menu that lists both; it falls through to exact name
 *   matching, which resolves it correctly.
 * - Requires 3+ characters before treating a word as an abbreviation, so a
 *   stray initial can't stand in for a whole word.
 */
const MIN_ABBREVIATION = 3;

/**
 * Did the ranker echo back this dish's name with its OWN description appended?
 *
 * EAT-19: the prompt used to print "2 EGGS — VITAL Farms Pasture Raised" on one
 * line, so the model copied the whole thing back as the name. Every dish with a
 * printed description was then unmatched, dropped as off-menu, and re-added
 * unscored. The prompt no longer renders it that way, but a model can still
 * concatenate the two, so this catches it.
 *
 * Deliberately an EXACT comparison against this dish's own name+description
 * rather than a loose "expected name is a prefix of the echo" rule. A prefix
 * rule would also accept "HOUSE SALAD LARGE" for a slot holding "HOUSE SALAD"
 * on a menu listing both — which puts a real score on the wrong dish, the one
 * failure worse than leaving a dish unscored.
 */
export function matchesNameWithDescription(
  dish: { name: string; description?: string },
  candidate: string
): boolean {
  if (!dish.description) return false;
  const echoed = normalizeDishName(candidate);
  return (
    echoed === normalizeDishName(`${dish.name} ${dish.description}`) ||
    // Some models drop the separator, others keep it; normalization strips
    // punctuation either way, so one comparison covers "—", "-", ":" and none.
    echoed === normalizeDishName(`${dish.name}${dish.description}`)
  );
}

export function namesPlausiblyMatch(expected: string, candidate: string): boolean {
  if (normalizeDishName(expected) === normalizeDishName(candidate)) return true;

  const a = dishNameTokens(expected);
  const b = dishNameTokens(candidate);
  if (a.length === 0 || a.length !== b.length) return false;

  return a.every((tokenA, i) => {
    const tokenB = b[i];
    if (tokenA === tokenB) return true;
    const [short, long] = tokenA.length <= tokenB.length ? [tokenA, tokenB] : [tokenB, tokenA];
    return short.length >= MIN_ABBREVIATION && long.startsWith(short);
  });
}
