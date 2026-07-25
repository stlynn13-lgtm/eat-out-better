# Eat Out Better — Scoring Rubric Cleanup: Workstream Summary

Status as of 2026-07-14. Written as a handoff so another model/session can continue without re-deriving context.

## 1. Product context

Eat Out Better is a menu-scanning app (iOS, React Native/Expo) that helps users with high cholesterol pick better restaurant dishes. User photographs a menu → app extracts dishes via OCR → app scores/ranks dishes → returns ranked list with a one-sentence explanation per dish. v1 scope is cholesterol only (no accounts, single condition).

## 2. Current live architecture (apps/api, confirmed against origin/main @ ff6ce68)

Pipeline: Mobile app captures photo → **on-device text pre-check** (ML Kit, client-side, no LLM call, deliberately loose threshold — just filters out zero-text photos before spending API cost) → API auth/rate-limit gate → **Step 1: OCR** (Claude Haiku Vision, `OCR_SYSTEM_PROMPT` in `apps/api/src/lib/claude/prompts.ts`, extracts `{isMenu, dishes:[{name, description}]}`) → **Step 2: Ranking** (Claude Haiku Text, `RANKING_SYSTEM_BASE` + `getRankingUserPrompt`, also in `prompts.ts`, run in parallel chunks of 35 dishes) → tier/tag enrichment (`scoring.ts`, maps score to green/yellow/red + top-pick/enjoy-occasionally tags) → response.

**Important architectural fact:** the live ranking prompt does NOT do deterministic/rule-based scoring. It's a single Claude call that reads dish name+description and outputs a score directly (1.0–10.0, one decimal), guided by a short, fairly generic prose rubric (6 score bands + a short list of positive/negative factors). This was a deliberate near-term choice ("Option A" in this workstream) over building an actual extraction-then-deterministic-scoring pipeline ("Option B"). The work below is aimed at making Option A's prompt smarter/better-grounded, not at building Option B (though the outputs here would also feed Option B if that's ever built).

## 3. The rubric being cleaned up

Sean built a 30-page "Deterministic Scoring Knowledge Base" in Google Docs a few weeks ago, in a single pass with Claude: **[Eat Out Better — Scoring Knowledge Base v1.0 (FINAL)](https://docs.google.com/document/d/1ZDgQbsqhhyoMbHUlwqd1vo0RKlO93GiAltx-nhFgaeI/edit)** — confirmed as the canonical version (a near-duplicate non-final version also exists in Drive, not canonical).

Structure: covers 3 conditions (cholesterol, sodium/hypertension, diabetes — only cholesterol is in v1 scope). Each condition module has: risk drivers with point weights (e.g. "saturated-fat-dense dairy: +35"), protective factors (negative points), cooking-method multipliers (fried ×1.4-1.5, grilled ×0.95), hidden-ingredient inference rules (e.g. "korma implies cream/ghee even if unstated"), a "health-halo" guardrail (so "salad"/"fresh"/"bowl" can't launder a bad dish), portion adjustments, and a "dangerous-miss audit" of dishes that would score wrong without the guardrail (fried-chicken-salad, coconut curry, deli sandwich). A final section (G) has a full JSON + pseudocode spec for a deterministic scoring engine — only relevant if Option B is ever built.

## 4. Core problem this workstream is addressing

The point weights in Sean's KB were invented in a single LLM pass. They're directionally plausible (trans fat > saturated fat > lean meat, in that order) and have real guideline citations attached (AHA/ADA/DASH), but the citations support *direction*, not the specific *magnitude* of each weight or the gaps between them (why is saturated dairy 35 and fatty red meat 30, specifically?). Nothing has validated these numbers against real nutrient data.

Agreed direction: replace bespoke per-driver point values with a small number of severity **tiers** (Severe / High / Moderate / Mild / Protective), each grounded in real nutrient data rather than invented numbers, and rescale everything to the app's existing live 1.0–10.0 scale (not a separate 0–100 system) to avoid a translation layer.

## 5. Research findings so far

### 5a. Two "the underlying science has moved" findings (high importance, not yet fully incorporated into the KB)

- **Trans fat / partially hydrogenated oils have been banned in all US restaurants and food manufacturing since January 2021.** The KB's single highest-weighted driver (+45, described as capping a dish near 1.0-2.0 regardless of anything else) describes an ingredient that's now largely illegal/rare in the US. It shouldn't be the default "worst case" trigger via loose keyword matching on "fried"/"crispy" — those words should map to the (separate, still-valid) fried-food-calorie/fat-loading risk via the cooking-method multiplier, not to trans fat specifically. Trans fat should be downgraded to an edge-case flag (imported goods, non-compliant kitchens, trace natural amounts).

- **The 300mg/day dietary cholesterol cap was removed from US Dietary Guidelines in 2015; a 2019 AHA science advisory found no general link between dietary cholesterol and cardiovascular risk for most people.** Current guidance: keep dietary cholesterol "reasonably low," no hard number; saturated fat and trans fat are the dominant levers, dietary cholesterol is a distant third. This directly affects two of the KB's ten cholesterol drivers — egg yolk (+15) and shellfish (+8) — which were scored specifically on dietary cholesterol content, not saturated fat (confirmed via the KB's own stated rationale for these two drivers). Given their saturated fat contributions are trivial (see 5b), both are likely over-weighted relative to current science and should probably drop toward the bottom of the scale.

### 5b. Per-ingredient nutrient data pulled (sourced via web search, not verified against USDA FoodData Central directly — worth a rigor pass)

| Ingredient | Saturated fat | Dietary cholesterol |
|---|---|---|
| Heavy cream | 3.45g / tbsp | — |
| Butter | 7g / tbsp | — |
| Parmesan cheese | 4.5g / oz | — |
| Cheddar cheese | 6g / oz | — |
| Ground beef 80/20 (cooked 1/4lb patty) | 6g | — |
| Bacon (2 slices) | 2g | — |
| Coconut milk | 36g / cup | — |
| Salmon (6oz) | 5.25g (of 22.6g total fat — mostly unsaturated) | — |
| Egg yolk (1 large) | 1.6g | 186mg |
| Shrimp (6oz, cooked) | ~0g | 321mg |
| Liver (beef, 100g) | not checked | 396mg |
| Liver (chicken, 100g) | not checked | 563mg |

### 5c. Dish decompositions (component-level, using 5b data) — 7 dishes done, NOT yet converted to final tier/score

| Dish | Components → driver mapped | Sat fat total | Tier suggested (not formally scored) |
|---|---|---|---|
| Fettuccine Alfredo (restaurant portion) | cream (5 tbsp) + butter (2 tbsp) → sat_dairy; parmesan (1.5oz) → cheese_melt | ~38g | Severe |
| Bacon Cheeseburger (single patty) | beef patty → fatty_red_meat; bacon → same; cheddar → cheese_melt | ~14g | High (Severe only shows up with double patty — real chain data ranged 7g-29.5g depending on patty count/size) |
| Grilled Salmon (6oz) | salmon → protective/oily fish | 5.25g (77% of total fat is unsaturated) | Protective — credit is about fat *quality*, not low fat quantity |
| Coconut Curry | coconut milk (~3/4 cup) → coconut driver | ~20-27g before dilution with broth/veg | High-Severe boundary |
| Cheese Pizza (2 slices) | cheese → cheese_melt | ~9g | Moderate |
| Egg dish (2 yolks, e.g. omelet/carbonara) | yolks → egg_yolk | ~3.2g sat fat / 372mg cholesterol | Mild on sat fat; the cholesterol number is high but that axis is now de-emphasized per 5a |
| Caesar Salad | dressing (yolk+oil, mostly unsaturated) + parmesan → egg_yolk + cheese_melt | ~5-8g | Moderate — NOT Severe despite "creamy" association; tests the health-halo guardrail doesn't overcorrect |

### 5d. Cross-dish insights (not yet acted on)

- Cheese and fatty red meat contribute nearly identical saturated fat in the burger breakdown (6g each) — the KB's 25 vs. 30 point gap between these drivers doesn't show up in real numbers.
- Bacon contributes less saturated fat (2g/2 slices) than a single slice of cheese — its real risk is more about sodium (a different condition module) than cholesterol specifically.
- Burger severity is driven more by **portion** (single vs. double patty, extra toppings) than by which driver fires — the KB's portion-adjustment mechanic may deserve more weight than the driver categories themselves for this dish family.
- Salmon's protective credit is legitimately about fat *composition* (mostly unsaturated), not about being low-fat overall.

## 6. What has NOT been done yet (the actual gap, and the immediate next step)

**No dish has been assigned a final score or tier using a formal, defined point rubric.** Section 5c decomposes dishes into components and suggests a plausible tier, but there is no agreed-upon point-per-tier value (e.g., "Severe = -6.5 from a baseline of 10") that has actually been applied and checked against the app's live 1.0-10.0 scale. This is the immediate next step: define the tier→point mapping, apply it formally to the 7 decomposed dishes, and sanity-check the resulting scores feel right relative to each other and to the app's existing green/yellow/red tier thresholds (green ≥7.0, yellow 4.0-6.9, red ≤3.9, defined in `apps/api/src/lib/config/scoring.ts`).

## 7. Open items not yet addressed

- Organ meats' saturated fat content was never checked (only dietary cholesterol was pulled) — needed to know if its Severe placement is justified independent of the de-emphasized cholesterol axis.
- Sodium and diabetes modules of the KB are completely untouched (correctly out of v1 scope, but will need this same treatment if/when conditions expand).
- A second, separate validation track was proposed and not yet executed: a list of ~15 ambiguous/terse real-restaurant dish names (e.g. "Butter Chicken," "Loaded Nachos") paired with the model's assumed hidden ingredients, meant for a human food-literate gut-check rather than nutrient-data validation — this tests the "guessing what's in an indie restaurant's dish" step, which matters more for real usage than chain-restaurant-calibrated point values do, since most users will scan menus with zero public nutrition data.
- No rigor pass has been done to confirm the pulled nutrient numbers (section 5b) against a single authoritative source (USDA FoodData Central) rather than mixed secondary sources from web search.
