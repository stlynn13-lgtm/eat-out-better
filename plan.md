# Eat Out Better — Plan (What's Next)

**What this is:** the plain-language, always-current answer to "what are we doing and what's next?" Written so a non-developer can read it in two minutes and know where we stand. The detailed, filterable version of all this lives in **Eat_Out_Better_GTM_Launch_Tracker.xlsx** — this file is the readable summary that points into it.

**Last updated:** 2026-09-10
**Read with:** `log.md` (what already changed) · the GTM Launch Tracker (full detail) · `CLAUDE.md` (the rules that don't change often).

---

## Where we are right now

**Build 9 (v1.1.4) is on TestFlight** — submitted 26 August, and it is the build on Sean's phone.

**Everything since then has shipped over the air instead.** On 10 September the project published its **first ever over-the-air update**, which is the thing build 9 was built to make possible. It carries the Terms of Service gate, the results-screen disclaimer, readable contrast on every legal line, the Sentry privacy fix and the restored shutter flash. Anyone on build 9 picks it all up on the next cold start, with no new build and no App Store involvement.

**Build 10 has a version bump committed but has never actually been built.** That only matters for *new* testers: they would install a two-week-old binary and then pull the update on first launch. Worth cutting before any App Store submission, not urgent otherwise.

**The legal position changed substantially.** The app now has Terms of Service (`/terms`), a blocking first-run "I Agree" gate, a support page (`/support`), and an allergen disclaimer in three places — that last one being the largest real risk in a menu-reading app and the thing no checklist asked about. Dine Right LLC is confirmed registered in Colorado, so the entity question that five documents disagreed about is closed. Full detail in the `log.md` 2026-09-09/10 entry.

**Two shipping gotchas worth keeping**, both discovered the hard way while publishing that first update:

- **`eas update` needs `eas env:exec`.** `--environment production` alone does *not* reach the subprocess that evaluates `app.config.ts`, so the APP_TOKEN guard fires and the publish dies in ten seconds. The working command is in `log.md`.
- **The local `ios/` folder disagrees with what ships.** It is untracked and claims JSC; the config default, and what EAS actually builds, is Hermes. It has to be moved aside for every publish until someone runs `npx expo prebuild --clean`.

**Worth knowing:** EAT-9 ("never rank a dish that isn't on the menu") and EAT-17 ("always assume typical ingredients rather than giving up") pull in opposite directions and both are correct. EAT-9 governs which dishes exist and which text belongs to them; EAT-17 governs how hard to think about a dish that really is on the menu. Conflating them is what caused both bugs — keep them apart when either is touched again.

Still true from before: the root `package-lock.json` will recreate the duplicate-React launch crash on the next root `npm install`, and fixing it touches how Vercel installs the API. The rubric rewrite is live in production and **has still never been validated against real menus** — that remains the most important untested thing in the project.

---

## NOW — verify the update on a device, then validate the scoring

**Status:** `main` carries the Terms of Service, the first-run gate, the legal pages and the accessibility and privacy fixes. The first over-the-air update is **live** on the `production` branch at runtime 1.1.4 (update group `9658d607`), so it reaches build 9 on the next cold start.

0. **Cold-start the app and check the update landed (Sean, two minutes).** The Terms gate should appear first, then the results-screen disclaimer, readable grey text, and — the one nobody has ever seen work — the camera shutter flash, which had been invisible since the SDK bump because React Native 0.85 deleted the API it used.


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
- **Legal gates**: hosted privacy policy, Terms of Service with a medical disclaimer + liability waiver, an explicit in-app "this is an estimate, not medical advice" acknowledgment, and the operating entity. **✅ The LLC question is closed.** **Dine Right LLC is registered in Colorado** (confirmed by Sean, 2026-09-09), so `apps/api/src/app/privacy/page.tsx:15` has been accurate all along and the entity question is closed. That also clears App Store Guideline 5.1.1(ix) (health apps "should be submitted by a legal entity... not by an individual developer") and unblocks EU DSA trader verification, which an app is *removed* from the EU App Store for lacking. **Three things it does not yet clear:** the Apple Developer enrollment may still be Individual rather than Organization (App Store Connect → Agreements → Entity Type) — check it, because 5.1.1(ix) is about who *submits*, not only who operates; the privacy policy names the LLC but gives no registered address or entity number, which DSA trader status and ordinary business-details practice both want; and the registered address in Terms §24 is missing its apartment number. **✅ The Terms of Service now exist** (`/terms`, shipped 2026-09-09) with a medical disclaimer, an allergen disclaimer, an AI-accuracy disclaimer, a liability cap, an owner shield under CRS §7-80-705, Colorado governing law, arbitration with a 30-day opt-out, and Apple's required EULA terms — plus a blocking first-run acceptance gate, without which the rest is close to unenforceable. **They have not been reviewed by a lawyer, and should be before public launch.** See `app-store-legal-checklist.md`.
- **App Store submission assets**: final app icon, screenshots, listing copy (with search keywords), age rating, App Privacy questionnaire. **✅ Support URL now exists** (`/support`). All the rest is worked out in `app-store-legal-checklist.md`, including the nutrition-label answers derived from the code and the fact that App Store Connect takes a *pasted* EULA rather than a URL — `legal/eula-app-store.txt` is generated from the same component the website renders so the two cannot drift.
- **UI transparency**: a simple "how scores work" screen (✅ built + verified on `feat/scoring-explained-ui`, needs merge) + per-dish reasons ("High — fried + cream sauce. Try grilled.").
- **Basic analytics**: wire Firebase and the core funnel events so we can see if people complete a scan.
- **Light infra**: branch protection, separate dev/prod keys, one launch dashboard (spend + errors + uptime).

➡️ GTM Launch Tracker, filter Priority = P1.

---

## LATER — after launch, to grow and scale (P2 / P3)

- **Expanded TestFlight** (10–20 testers — note: external testers trigger Apple's Beta App Review).
- **Go-to-market sequence**: friends & family → ASO → LinkedIn → condition communities → Product Hunt (as a credibility spike, not the growth engine).
- **Monetization prep**: decide the model (free at launch → freemium), set the free-tier ceiling from real cost-per-analysis, scaffold RevenueCat.
- **The identity trigger point** — resolved, and re-cut after verification. `auth-plan.md` (rewritten 2026-09-07) now says: **do a small piece now, and hold the rest.** Now (~1 day, one build, $0): give each install a random id so returning users can actually be counted, and *ship the history screen* — the app has been silently saving your last 10 scans since launch and no screen has ever shown them. Held until a real trigger: accounts, sign-in, and anything that puts data on a server. **The first draft of that plan was wrong in three ways** and the rewrite explains each — most importantly, the Apple/Google upgrade call it recommended would have silently thrown away a user's history with no error. **The re-cut also drops Google sign-in from v1** (Apple + emailed code only), which removes an entire App Store obligation rather than satisfying one. The thing that decides the timing is not a product preference: Apple requires subscriptions to work on all of a user's devices, so real sign-in is a *prerequisite of the paywall*.
- **More conditions**: add hypertension (sodium), then type 2 diabetes/prediabetes — same engine, new knowledge-base table.
- **Backend / profiles / history** — gated on a product trigger (the paywall build starting, or cross-device history becoming the next feature), not a calendar and not retention data. The circularity is real — identity is *how* retention gets measured — which is why `auth-plan.md` splits the cheap measurement half out and ships it now.

➡️ GTM Launch Tracker, filter Priority = P2 / P3.

---

## How this file stays current

Updated at the end of any working session where priorities or status changed (see the Documentation System section in `CLAUDE.md`). If it contradicts the GTM Launch Tracker, the tracker wins for detail — fix this summary to match.
