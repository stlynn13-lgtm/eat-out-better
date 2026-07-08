# Eat Out Better — Scoring Knowledge Base Generation Prompt

**How to use:** Paste everything between the lines into a fresh session with a strong model (Sonnet 4.6 or Opus). Run once to produce KB **v1.0**. Re-run with the same prompt whenever you version the rubric. The output is reference *data + rules*, not per-dish scores — it's what your scoring engine reads. Validate the result against the Phase 0 tests (accuracy + dangerous-miss rate) before exposing it in the app.

---

## ROLE & GOAL

You are a nutrition-informed systems designer building the **deterministic scoring knowledge base (KB)** for *Eat Out Better*, an iOS app that reads a restaurant menu photo and rates each dish for a person managing a chronic, diet-sensitive condition.

Your job is **NOT** to score individual dishes. Your job is to produce the **versioned reference data and rules** that a separate, deterministic program will use to score *any* dish, on *any* menu, from *any* cuisine — and return the **same score every time** for the same inputs. The model that runs in production only **extracts structured facts** from the menu (ingredients, cooking method, likely hidden ingredients); your KB supplies the **judgment** as fixed data.

Cover three conditions, in parallel structure: **(1) High Cholesterol, (2) Hypertension (sodium), (3) Type 2 Diabetes / Prediabetes.**

## NON-NEGOTIABLE DESIGN RULES

1. **Facts vs. judgment are separate.** The KB is data. Never assume the production model will "use its judgment" — every decision must be expressible as a weight, modifier, threshold, or rule.
2. **Cuisine-agnostic.** Attach risk to **ingredients, cooking methods, and dish archetypes** — never to named dishes. The same archetype must score consistently across cuisines. Examples you must honor:
   - *Saturated-fat archetype* (cream / butter / cheese / coconut milk / fatty cuts) shows up as Alfredo, korma, chowder, queso, carnitas — score them alike.
   - *Sodium archetype* (soy/fish/oyster sauce, miso, cured/smoked/deli meats, broths, pickled, olives, "blackened") spans ramen, deli, BBQ, Tex-Mex.
   - *Refined-carb / added-sugar archetype* (white rice, white bread, naan, noodles, tortillas, sweet glazes, sweetened drinks) spans sushi, sandwiches, Indian, Chinese, Mexican.
3. **Deterministic.** Use explicit numeric weights, multipliers, and tier thresholds. No vibes, no ranges left to interpretation.
4. **Directional, not clinical.** Output is lifestyle guidance ("point me toward the better choice"), not precise nutrition facts or medical advice. **Exclude** severe/allergic reactions and anything requiring exact dosing or counts (insulin units, gram-level potassium). Stay inside the general-nutrition lane.
5. **Evidence-based and double-checked.** Anchor weights to mainstream guidelines — AHA/ACC for cholesterol, AHA/DASH for sodium, ADA for diabetes, and the US Dietary Guidelines. Cross-check your own numbers; where evidence is mixed, choose a defensible default and **flag it** rather than omit it.
6. **Explainable in one sentence.** Every weight needs a plain-language "why" simple enough to power user-facing copy ("High — fried + cream sauce").
7. **Consistent across conditions.** All three conditions share one scoring scale and the same tier labels (Low / Medium / High), and you must define how a dish that's risky for multiple conditions combines for a multi-condition user.

## WHAT TO PRODUCE — in this order

**A. Scope & assumptions** — what's in, what's explicitly excluded (allergy, dosing), portion baseline (assume typical *restaurant* portions, not home cooking), and any standing assumptions the engine should make.

**B. Shared scoring scale & tiers** — define one numeric scale (e.g., 0–100 risk points) and the Low/Medium/High tier bands, used identically by all three conditions.

**C. One module per condition**, each containing:
   1. **Physiological rationale** — 2–4 sentences on the mechanism (e.g., saturated/trans fat → raises LDL).
   2. **Primary risk drivers** — ingredient/method → points, with cross-cuisine examples, a one-sentence why, guideline basis, and a confidence rating.
   3. **Protective factors** — ingredient/method → *negative* points, same columns.
   4. **Cooking-method modifiers** — multipliers or additions (e.g., fried ×1.4; grilled ×1.0; deep-fried + breaded stacks).
   5. **Hidden-ingredient inference rules** — what to assume when the menu is terse (e.g., "bisque/chowder" implies cream; "teriyaki" implies added sodium + sugar).
   6. **Portion / preparation adjustments** — large-portion and shareable-dish handling.
   7. **Tier thresholds + rationale** — the numbers that split Low/Med/High and why they sit there.
   8. **Substitution rules** — for each major driver, the lower-risk swap and its point delta (e.g., fried → grilled, −X).
   9. **Cross-cuisine red-flag lexicon** — keywords and synonyms that signal a driver across cuisines (build this so menu extraction can pattern-match).
   10. **Confidence & uncertainty rules** — when extraction is ambiguous, when to widen to a range or prompt for a clearer photo instead of inventing a precise score.

**D. Cross-condition combination rules** — how scores combine when a user has 2–3 conditions (the metabolic-syndrome case), and how to present a dish that's Low for one and High for another.

**E. Verification & evidence log** —
   - A self-check pass: re-examine every weight for internal consistency and alignment with the cited guidelines, and revise before finalizing.
   - A short **evidence basis** line per major weight (which guideline/principle supports it).
   - A **DANGEROUS-MISS AUDIT**: explicitly hunt for any genuinely harmful dish/ingredient that the current weights would rate Low or Medium, and fix it. This is the only error class that can hurt a user — treat it as the priority check.

**F. Open questions / low-confidence items** — anything you'd want a clinician to confirm later, or where guidelines conflict.

## PROCESS

- Think step by step before writing. Build Condition 1 completely, then mirror the exact structure for 2 and 3 so the three modules are directly comparable.
- After drafting all three, run the verification pass (Section E) and **revise**. Show the corrected KB plus the evidence log and the flagged-items list.
- Output as clean **Markdown tables** that can be transcribed row-for-row into structured data. Use this column set for drivers/protective factors:
  `Driver | Cross-cuisine examples | Points | Modifier | Why (1 sentence) | Guideline basis | Confidence (H/M/L)`
- Keep one consistent point scale across all conditions. State **KB version (v1.0)** and today's date at the top.
- Where evidence is mixed, pick a defensible default and flag it — never silently drop an item.

## GUARDRAILS (restate in your output)

This KB produces **directional dietary estimates, not medical advice.** It does not address food allergies/intolerances or any decision requiring precise dosing or lab-level accuracy. It is designed to help someone managing high cholesterol, high blood pressure, or type 2 diabetes/prediabetes choose a *relatively better* dish when eating out.
