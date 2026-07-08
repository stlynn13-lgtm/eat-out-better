# Eat Out Better — Plan (What's Next)

**What this is:** the plain-language, always-current answer to "what are we doing and what's next?" Written so a non-developer can read it in two minutes and know where we stand. The detailed, filterable version of all this lives in **Eat_Out_Better_GTM_Launch_Tracker.xlsx** — this file is the readable summary that points into it.

**Last updated:** 2026-06-22
**Read with:** `log.md` (what already changed) · the GTM Launch Tracker (full detail) · `CLAUDE.md` (the rules that don't change often).

---

## Where we are right now

The app's happy path works in TestFlight: take a photo of a menu, get an analysis, see results. The backend API is built and deployed; EAS is configured for builds. What's left before strangers can use it falls into four buckets: **prove the AI is trustworthy**, **protect ourselves from runaway cost and legal exposure**, **clear Apple's submission gates**, and **be able to see what's happening** (crashes + basic analytics). We are deliberately NOT building accounts, history, or a bigger backend yet — but we've decided the trigger point for when we will.

---

## NOW — do these first (the P0 blockers)

Nothing public happens until these are done. None of them are big; skipping them is what gets expensive.

- **Set a hard spend cap + budget alert** in the Anthropic console. Today. One setting, biggest unprotected risk.
- **Lock down the API**: add auth + per-device rate limiting, and move the secret URL out of the app bundle. Right now anyone who extracts it can run up our bill.
- **Cap images per upload** (e.g. 3) — each image costs money on every scan.
- **Prove the AI works**: run the three unvalidated tests on real menus — can it read them (OCR), does it score dishes correctly, is it fast enough (<30s). This is our #1 launch risk, not Apple or legal.
- **Build the scoring source of truth**: move scoring out of the prompt into a versioned knowledge base so the same dish gets the same score every time (see `Scoring_KB_Generation_Prompt.md`).
- **Add crash reporting** (Crashlytics). Today we have zero visibility when something breaks.

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
