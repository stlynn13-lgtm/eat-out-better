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
