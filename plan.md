# Eat Out Better — Plan (What's Next)

**What this is:** the plain-language, always-current answer to "what are we doing and what's next?" Written so a non-developer can read it in two minutes and know where we stand. The detailed, filterable version of all this lives in **Eat_Out_Better_GTM_Launch_Tracker.xlsx** — this file is the readable summary that points into it.

**Last updated:** 2026-08-10
**Read with:** `log.md` (what already changed) · the GTM Launch Tracker (full detail) · `CLAUDE.md` (the rules that don't change often).

---

## Where we are right now

Build 8 (v1.1.3) is **merged, deployed and on TestFlight** — that's the build on Sean's phone.

**Build 9 (v1.1.4 / iOS build 9) is on `feat/build9-ux-pass`, not yet merged.** It's a UX pass across every screen from Sean's own list, plus the single biggest change to how this project ships: **the app can now be updated without a new build.**

**The thing to understand about build 9:** it adds Expo's over-the-air updates. Until now every change, down to one word of copy, needed a full TestFlight build. From build 9 onward, anything that's purely app code — copy, layout, colours, animations — ships with one command and reaches testers the next time they open the app. Native changes still need a real build, and this does nothing for anyone still on build 8; **testers must install build 9 once before any over-the-air update can reach them.** Also worth being clear: none of this ever required an App Store release. TestFlight isn't one, and we're not publicly launched.

Roughly half of Sean's UX list was built; the other half was deliberately left alone because doing it would have meant inventing a design. Full detail in the `log.md` 2026-08-10 entry.

**Worth knowing:** EAT-9 ("never rank a dish that isn't on the menu") and EAT-17 ("always assume typical ingredients rather than giving up") pull in opposite directions and both are correct. EAT-9 governs which dishes exist and which text belongs to them; EAT-17 governs how hard to think about a dish that really is on the menu. Conflating them is what caused both bugs — keep them apart when either is touched again.

Still true from before: the root `package-lock.json` will recreate the duplicate-React launch crash on the next root `npm install`, and fixing it touches how Vercel installs the API. The rubric rewrite is live in production and has still never been validated against real menus.

---

## NOW — get build 9 onto TestFlight, then send the missing designs

1. **Run a real menu through the scoring (Sean, needs an API key)** — still the one that matters, outstanding since build 8. EAT-17 makes the analyzer assume a dish's typical restaurant preparation instead of hedging, and nothing in this environment can test whether those assumptions are *good* ones. Check especially: bare dish names (no description) get a real score with a hedged explanation ("typically made with…"), and no dish picks up ingredients from a different item on the same menu. EAT-18 and EAT-19 are now merged, so unscored-looking dishes are no longer a confound.

2. **Run the eval and lock in a baseline (Sean or Ray, needs an API key).** `cd apps/api && npm run eval` — scores the BCD Tofu House menu and reports which dishes land in which tier. First job is to confirm the transcribed dish names are right and to fill in *expected* tiers (a human call — an AI-written answer key makes the eval worthless). Then `npm run eval -- --update-baseline`, so the next prompt change is measurable instead of guesswork. Detail in `apps/api/evals/README.md`.

3. **On-device verification pass (Sean)** — nothing in build 9 has been seen running; this machine still has no iOS simulator runtime. Worth looking at: the bigger photos/buttons, the "×" no longer clipped, the new progress bar counting every number, the rebuilt star feedback prompt, the merged "?" info screen, the welcome animation, the daily cap alert on the 6th scan, and — new in this merge — the EAT-20 category groups plus the unranked (alcohol/sauce) section on results.

4. **Calibrate the zoom buttons (Sean, 30 seconds, needs a real phone).** The 2×/3× buttons don't do what they say and can't be fixed in code — the camera library only accepts "a percentage of the device's max zoom" and won't say what that maximum is. Open the camera, pinch until the framing looks like a true 2×, read the percentage badge on the viewfinder, divide by 100. Same for 3×. **Those two numbers then ship over the air — no build.**

5. **Add the new columns to the feedback Google Apps Script.** The app now sends `feedback_type`, `tags`, `scan_session_id`, `dish_count`, `app_version`, `environment`. The script lives outside this repo, so until it's updated those fields arrive and go nowhere.

6. **Send the designs that are blocking the rest of the UX list** — the welcome screen (feature chips → numbered steps, the "have high cholesterol?" headline) and the camera filling most of the screen. Plus a screenshot of the welcome screen: "background too dark" couldn't be reproduced, since that background is already near-white. **All three are pure app code, so once designed they ship over the air rather than as build 10.**

7. **Verify the Vercel deploy** of `main` picked up the API changes (`/api/health` exposes a commit SHA, so this is checkable). This merge redeploys the API.

8. **Before any decision on the scoring KB, run the decomposition test** — can the model reliably turn a dish name into ingredients + cooking method? ~10 cents against the existing corpus. And add per-scan dish logging regardless: it's the same work as the cost ceiling's logging, and unrecorded scans are gone permanently.

9. **EAT-14 (vertical/horizontal swap)** — still waiting on a design, and note it's the one item here that can *never* ship over the air: the app is locked to portrait in native config.

**Don't undo:** scoring runs at `temperature: 0`. At 0.2 roughly a quarter of a real menu had coin-flip tier colours. Don't raise it without re-running `npm run test:repeatability`.

**Carried-over P0s to confirm (status unknown, cheap to check):** **Anthropic spend cap + budget alert set?** — this got more important, not less: build 9's daily cap is per-device only, so the account spend cap is now the *only* global limit on a runaway day. A true global cap needs durable shared storage (Upstash/Vercel KV) and was deliberately deferred. Also: the three AI validation tests (OCR / scoring / speed) run on real menus? Scoring knowledge base (`Scoring_KB_Generation_Prompt.md`) still pending — that's the root fix for score consistency.

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
