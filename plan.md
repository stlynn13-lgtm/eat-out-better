# Eat Out Better — Plan (What's Next)

**What this is:** the plain-language, always-current answer to "what are we doing and what's next?" Written so a non-developer can read it in two minutes and know where we stand. The detailed, filterable version of all this lives in **Eat_Out_Better_GTM_Launch_Tracker.xlsx** — this file is the readable summary that points into it.

**Last updated:** 2026-07-08
**Read with:** `log.md` (what already changed) · the GTM Launch Tracker (full detail) · `CLAUDE.md` (the rules that don't change often).

---

## Where we are right now

Build 5 (v1.1.2) is on TestFlight. **Build 6 (v1.1.3) is code-complete on `main`** — a ~20-bug sweep of the failure paths — and we're adding UI enhancements to it before cutting it to TestFlight. Of the 7 Linear tickets: **5 are built** (on `feat/build6-ui-enhancements`), **2 are waiting on designs** (EAT-13 photo full-screen viewer, EAT-14 landscape capture). Several of the old P0s are now done: API auth + rate limiting (build 5/6), image cap (10), crash reporting (Sentry), analytics (PostHog), hosted privacy policy.

---

## NOW — finish build 6 and get it onto TestFlight

1. **Designs for EAT-13 and EAT-14** (Sean) — Figma links or react-to mockups; then build them on the same branch.
2. **Merge `feat/build6-ui-enhancements`** into `main` once the design tickets are in (or ship the 5 done ones without them if designs stall).
3. **EAS build + TestFlight submit** (Sean, manual) — version/build already set to 1.1.3 / 6.
4. **On-device verification pass**: the 5 new UI changes, plus the leave-during-analysis fix (EAT-10) and back-with-photos (EAT-11) from the sweep.
5. **Verify the Vercel deploy** of `main` picked up the API + privacy-page changes.

**Carried-over P0s to confirm (status unknown, cheap to check):** Anthropic spend cap + budget alert set? The three AI validation tests (OCR / scoring / speed) run on real menus? Scoring knowledge base (`Scoring_KB_Generation_Prompt.md`) still pending — that's the root fix for score consistency.

➡️ Full detail + owners + status: GTM Launch Tracker, filter Priority = P0.

---

## NEXT — before we go live to the public (P1)

- **Fix the two known bugs**: the 2nd-submission crash (the "go back" button) and the double loading screen.
- **Legal gates**: hosted privacy policy, Terms of Service with a medical disclaimer + liability waiver, an explicit in-app "this is an estimate, not medical advice" acknowledgment, and an LLC decision.
- **App Store submission assets**: final app icon, screenshots, listing copy (with search keywords), support URL, age rating, App Privacy questionnaire.
- **UI transparency**: a simple "how scores work" screen + per-dish reasons ("High — fried + cream sauce. Try grilled.").
- **Basic analytics**: wire Firebase and the core funnel events so we can see if people complete a scan.
- **Light infra**: branch protection, separate dev/prod keys, one launch dashboard (spend + errors + uptime).

➡️ GTM Launch Tracker, filter Priority = P1.

---

## LATER — after launch, to grow and scale (P2 / P3)

- **Expanded TestFlight** (10–20 testers — note: external testers trigger Apple's Beta App Review).
- **Go-to-market sequence**: friends & family → ASO → LinkedIn → condition communities → Product Hunt (as a credibility spike, not the growth engine).
- **Monetization prep**: decide the model (free at launch → freemium), set the free-tier ceiling from real cost-per-analysis, scaffold RevenueCat.
- **The identity trigger point** — the decision to add lightweight identity before we spend on growth. This is what unlocks retention measurement, recurring revenue, and a sellable asset. Don't let it drift.
- **More conditions**: add hypertension (sodium), then type 2 diabetes/prediabetes — same engine, new knowledge-base table.
- **Backend / profiles / history** — gated on what retention data tells us, not a calendar.

➡️ GTM Launch Tracker, filter Priority = P2 / P3.

---

## How this file stays current

Updated at the end of any working session where priorities or status changed (see the Documentation System section in `CLAUDE.md`). If it contradicts the GTM Launch Tracker, the tracker wins for detail — fix this summary to match.
