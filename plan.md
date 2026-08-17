# Eat Out Better — Plan (What's Next)

**What this is:** the plain-language, always-current answer to "what are we doing and what's next?" Written so a non-developer can read it in two minutes and know where we stand. The detailed, filterable version of all this lives in **Eat_Out_Better_GTM_Launch_Tracker.xlsx** — this file is the readable summary that points into it.

**Last updated:** 2026-08-05
**Read with:** `log.md` (what already changed) · the GTM Launch Tracker (full detail) · `CLAUDE.md` (the rules that don't change often).

---

## Where we are right now

Build 5 (v1.1.2) is on TestFlight. Build 6's work and build 7 (the cholesterol rubric rewrite + EAT-9 anti-hallucination) are **merged and live on `main`**; EAS build 7 was cut on 2026-07-28, so that build number is burned.

**Build 8 (v1.1.3 / iOS build 8) is pushed on `fix/build8-eat-review-finish`, not yet merged to `main`.** It's the result of reviewing every open ticket against the code: EAT-10, EAT-9, EAT-12 and EAT-15 each had a real gap one step to the side of what the ticket described, EAT-15 and EAT-17 each had a requirement that was never built at all, and EAT-13 is now done. Full detail in the `log.md` 2026-08-05 entry.

**Worth knowing:** EAT-9 ("never rank a dish that isn't on the menu") and EAT-17 ("always assume typical ingredients rather than giving up") pull in opposite directions and both are correct. EAT-9 governs which dishes exist and which text belongs to them; EAT-17 governs how hard to think about a dish that really is on the menu. Conflating them is what caused both bugs — keep them apart when either is touched again.

Still true from before: the root `package-lock.json` will recreate the duplicate-React launch crash on the next root `npm install`, and fixing it touches how Vercel installs the API. The rubric rewrite is live in production and has still never been validated against real menus.

---

## NOW — verify build 8 and get it onto TestFlight

0a. **EAT-19 — dishes with menu descriptions came back unscored.** On Sean's brunch menu, 21 of 29 dishes showed "We couldn't score this one" at 5.0; the split was exactly "has a printed description" vs "doesn't." The prompt put the name and description on one line, the model echoed both back as the name, and our matcher discarded every one. Fixed on `fix/eat-19-description-echo`, **not merged**. Verify with no API key: `cd apps/api && npm run replay:eat19` (shows 8/29 → 29/29). **This was mistaken for a model-quality problem** — the fix is ~15 lines and switching to Sonnet would have masked it at 3× the cost per scan.

0. **Merge EAT-18 before doing step 1.** Build 8 has a bug where real dishes come back "We couldn't score this one" at a flat 5.0 — the score was computed correctly and then discarded because the dish name came back spelled slightly differently (accents, `&`, "(GF)"). Fixed on `fix/eat-18-unscored-dishes`, not yet merged. **This must land before the scoring validation below**, because affected dishes look exactly like EAT-17 failing to make an ingredient assumption — you'd conclude EAT-17 is broken when it isn't. Full write-up in `eat-18-unscored-dishes.md`.

0b. **Run the new eval and lock in a baseline (Sean or Ray, needs an API key).** `cd apps/api && npm run eval` — scores the BCD Tofu House menu and reports which dishes land in which tier. First job is to confirm the transcribed dish names are right and to fill in *expected* tiers (a human call — an AI-written answer key makes the eval worthless). Then `npm run eval -- --update-baseline` to record where we stand, so the next prompt change is measurable instead of guesswork. Detail in `apps/api/evals/README.md`.

1. **Run a real menu through the new scoring (Sean, needs an API key)** — this is the one that matters. EAT-17 makes the analyzer assume a dish's typical restaurant preparation instead of hedging, and nothing here could test whether those assumptions are *good* ones. It's also the long-outstanding ~15-dish ingredient-guessing validation from the rubric rewrite, which EAT-17 is the most direct use case for. Check especially: bare dish names (no description) now get a real score with a hedged explanation ("typically made with…"), and no dish picks up ingredients from a different item on the same menu.
2. **On-device verification pass** (Sean) — nothing on `fix/build8-eat-review-finish` has been seen running. This machine has no iOS simulator runtime installed, so none of it could be checked visually. Specifically worth looking at:
   - **EAT-13** — tap a tray thumbnail: photo opens full-screen, swipe pages through the others, delete moves to the next one and closes the viewer on the last.
   - **EAT-12** — the shutter at the 10-photo cap, and a failed capture, both now show a message.
   - **EAT-15** — the "Couldn't read these" section and the results error text are a size bigger; and with the phone's text size turned up, the photo thumbnails should now grow with it instead of staying small.
   - **EAT-10** — pull down a notification mid-scan: the scan should now survive it rather than restarting. Then background the app properly mid-scan and return: it should recover, not freeze at 92%.
3. **Decide on EAT-13's design.** It was built without one because it was asked for; the layout is conventional and swappable. Either accept it or send a design and it gets restyled.
4. **EAT-14 (landscape capture)** — the last ticket still genuinely waiting on a design.
5. **Merge `fix/build8-eat-review-finish`, then EAS build + TestFlight submit** (Sean, manual) — version/build already set to 1.1.3 / 8. Note merging redeploys the API, which is where the EAT-9 and EAT-17 scoring changes go live.
6. **Verify the Vercel deploy** of `main` picked up the API changes (the API's `/api/health` now exposes a commit SHA, so this is finally checkable).

**Carried-over P0s to confirm (status unknown, cheap to check):** Anthropic spend cap + budget alert set? The three AI validation tests (OCR / scoring / speed) run on real menus? Scoring knowledge base (`Scoring_KB_Generation_Prompt.md`) still pending — that's the root fix for score consistency.

➡️ Full detail + owners + status: GTM Launch Tracker, filter Priority = P0.

---

## NEXT — before we go live to the public (P1)

- **Fix the two known bugs**: the 2nd-submission crash (the "go back" button) and the double loading screen.
- **Legal gates**: hosted privacy policy, Terms of Service with a medical disclaimer + liability waiver, an explicit in-app "this is an estimate, not medical advice" acknowledgment, and an LLC decision.
- **App Store submission assets**: final app icon, screenshots, listing copy (with search keywords), support URL, age rating, App Privacy questionnaire.
- **UI transparency**: a simple "how scores work" screen (✅ built + verified on `feat/scoring-explained-ui`, needs merge) + per-dish reasons ("High — fried + cream sauce. Try grilled.").
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
