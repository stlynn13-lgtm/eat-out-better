# Scoring evals

**The question these answer:** did a prompt change make the scores better or worse?

Nothing in the repo could answer that before this. `test:dedupe` and `test:dishmatch` check plumbing (does the code wire up correctly). `test:repeatability` measures how much scores *wander* between identical runs — variance, not correctness. So the rubric rewrite, EAT-17's typical-preparation scoring, and EAT-18's prompt change all shipped unmeasured.

## What this is not

**Not an OCR eval.** These run on menu *text*, skipping the photo-reading step entirely. Whether we read a blurry menu correctly is a separate question needing a photo corpus — a much bigger lift. All three unvalidated prompt changes live in the scoring half, so that's where this starts.

## Why tiers, not scores

Scores wander between identical runs — that's the whole point of `test:repeatability`. An eval pinned to exact numbers would fail randomly, and a flaky eval gets ignored within two weeks.

So the assertion is the **tier** a dish lands in (green ≥ 7.0, yellow 4.0–6.9, red < 4.0, mirroring `config/scoring.ts`). That's also what actually reaches the user: the colour, the "Top pick" tag, the ordering. A dish drifting 6.8 → 7.1 is noise. A dish crossing from yellow to green is a product change.

Each dish is scored several times and the **median** is taken, so one unlucky run can't flip a verdict on its own. Dishes that land near a tier boundary are flagged as unstable rather than silently passing.

## Two ways a dish can be judged

**`expected`** — a human-agreed tier. This is the real signal: it says what the answer *should* be, so it can catch the model being confidently wrong. Needs someone to make the call, so a corpus starts with few of these and grows.

**Baseline** — a snapshot of what the current prompt produces, in `baselines/`. Catches *drift*: it can't tell you a score is right, only that it changed. Free, and it's what makes a prompt change visible on the day you make it.

A dish with no `expected` is compared to the baseline only. **Both matter** — the baseline tells you something moved, `expected` tells you which direction is wrong.

## Running

```bash
cd apps/api
ANTHROPIC_API_KEY=... npm run eval
```

Costs real API calls: one per run per menu (default 3 runs).

```bash
npm run eval -- --runs 5              # more runs, tighter medians
npm run eval -- --menu bcd            # a single menu
npm run eval -- --update-baseline     # accept current output as the new baseline
```

Exits non-zero if any dish misses its `expected` tier, or drifts from baseline. Wire it into CI only once the corpus is trusted — a failing eval nobody believes is worse than none.

**`--update-baseline` is a judgement call, not a formality.** It says "this change is an improvement." Read the diff it prints before accepting it, and say why in the commit.

## Adding a menu

Drop a file in `menus/`:

```json
{
  "id": "bcd",
  "label": "BCD Tofu House",
  "note": "Where this came from, and anything odd about it",
  "dishes": [
    { "name": "Soon Tofu Soup", "description": "as printed on the menu, or omit" }
  ],
  "expected": {
    "Soon Tofu Soup": "green"
  }
}
```

`dishes` should be the menu as **OCR would hand it over** — the name as printed, accents and all, and the description only if the menu actually prints one. Most dishes legitimately have none; don't invent them, since scoring a bare name is the common real case and exactly what EAT-17 governs.

`expected` is optional and partial — list only dishes you have a firm opinion on.

## A note on what this catches

The eval runs the real `rankDishes()`, not a bespoke API call, so it exercises the actual prompt *and* the name/index matching. EAT-18 would have shown up here: a dish whose score was discarded comes back at a flat 5.0, which is a tier flip into yellow.

## The photo corpus (added 2026-10-04)

Fifteen menus in `menus/` carry a `photos` list; the images live in `photos/<id>/`, which is gitignored. They are the restaurants' own menu designs, so since the repo went public (2026-10-06) they are rebuilt on demand rather than committed: `python3 apps/api/evals/fetch-photos.py` re-downloads each PDF (`source.url`) and renders the same pages (`source.pages`), byte-identical to the originals. They exist for the eval that's still missing: **does the model read the photo right** — every dish, no invented ones, each description on the right dish, the right section heading, the restaurant name only when it's printed. Nothing here is scored by default yet (see "Running" — a menu needs an answer key or a baseline before the scoring run picks it up).

**Where they came from.** Restaurants' own website PDFs, fetched 2026-10-04 (URL and date in each file's `source`). Each page was rendered to JPEG at 1600px on the long edge, which is within a hair of what the app uploads (`MAX_DIMENSION = 1568` in `apps/mobile/lib/utils/image.ts`). Clean renders flatter the photo step — real phone photos have glare, angles and dim light — so add your own photos alongside; a set of website PDFs alone will overstate accuracy.

**How the truth was written — and why it isn't the model's own answer.** Wording comes from each PDF's embedded text layer, which is the restaurant's own text, not a reading of the image. That text layer is NOT trustworthy on structure: on several menus it pairs descriptions with the wrong dish (Hunan Springs' Mei Fun / Chow Fun), splits words ('Na mikaze'), swaps a letter for a digit ('DEL G0LFO'), or contains text that isn't visible on the page at all (JCD p4's SIDE ORDER block). So pairing, sections and visibility were checked against the rendered page, by eye. That check was done by Claude reading the images, which is the closest this comes to a model writing its own key — **spot-check before trusting a failure**. Pages not individually eyeballed: namikaze p2–4, okada p2/p4/p5, o-mandarin p3, jcd p6–7, margaritas p3 (all simple single-item blocks where the text layer read cleanly).

**Fields beyond the scoring format:**

| Field | Meaning |
|---|---|
| `photos` | Page images, in the order a diner would hand them over. Some menus use a subset of the PDF's pages (noted in `source.kind`) — wine lists and lunch menus were left out. |
| `restaurantName` | What the model should return — the name exactly as printed, or `null` when it isn't printed on these pages. Six menus are `null`; in most of them a name-like word hides in a dish (`MATUNUCK HOUSE SALAD`, `BURGER BURGER SAUCE`, `The Berkeley`, JCD's `장충동 보쌈`), which is the "never guess the name from the dishes" rule under test. |
| `restaurantNameAlsoAccept` | Arguable cases (Namikaze: the name only appears in 'Namikaze Rolls'). |
| `aliases` (per dish) | Other names that count as a match — the romanised/Hangul pair, or the composed name for a sub-item only identifiable with its heading (`"House"` under Lo Mein ↔ `"House Lo Mein"`). |
| `optional` | Text the model may return or skip without penalty: add-ons, toppings, sauces, size lines, photo captions. Anything it returns that is in neither `dishes` nor `optional` counts as invented. |
| `restaurantFlags` | The restaurant's own labels, e.g. North India's ♥ "Heart Smart" items. An outside signal to compare tiers against — **not** an answer key. |

**Conventions.** One orderable item = one dish; size or protein variants printed on one line are one dish. Names keep the menu's case, asterisks and parentheticals; the matcher should normalise (case, punctuation, leading item codes like `D12.`/`A5`, parentheticals, non-Latin script) rather than the truth being rewritten. Nested headings are written `PARENT / CHILD` and either level counts. A missing section on a dish is acceptable (the OCR prompt asks for that when unsure); a *wrong* section is the error.

**Real duplicates.** Several menus list the same name twice in different sections because they are different orders — Benvenuto's CHICKEN PARMIGIANA (pasta and sandwich), Okada's kids' menu, JCD's Bossam/Jokbal/Bulgogi, Namikaze's nigiri vs sashimi. `deduplicateDishes()` must keep both. The scoring runner keys results by name, so these menus need a section-aware key before they can be scored.

## The answer key (added 2026-10-04)

202 dishes across 16 menus carry a human call on the dish itself:

```json
{ "name": "Mango Lassi", "section": "Beverages",
  "expected": { "tier": "red", "category": "drink_non_alcoholic", "note": "SO MUCH SUGAR", "by": "ray", "set": "2026-10-04" } }
```

`tier` is optional (absent = the reviewer was unsure); `category` is the tab the dish belongs under. Calls were made blind on the Menu Tier Calls page (the app's score appears only after a pick). Two rules came out of the review and are now the spec: **added sugar counts for drinks and desserts**, and **an explicit menu heading decides the group; when it's ambiguous, a staple accompaniment is a side** (see `STAPLE_SIDE_NAMES` in `categories.ts`).

The runner checks both: a wrong tier is `EXPECTED`, a wrong group is `GROUP` (checked even for dishes deliberately left unscored, so "this isn't alcohol" is catchable). Where a menu prints a name twice, results are labelled `name [section]`. The run ends with a one-line agreement summary — tiers matched, and whether misses lean greener or redder than the key.
