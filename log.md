# Eat Out Better — Change Log

**What this is:** the running, plain-language record of what changed, what we decided, and why. Newest entry on top. Written so a non-developer can skim it and understand the project's history without reading code or commits. This replaces the scattered `session-NN-summary.md` files and the developer-oriented `CHANGELOG.md` going forward.

**How to add an entry** (copy the template at the bottom): date it, say what changed in plain words, why it mattered, and what it sets up next. One entry per working session where something changed.

---

## 2026-07-27 (later) — Second-opinion review of the rubric fixes; 3 of 6 revised, tier bands re-cut, test harness made runnable

**What changed**
- **Confirmed the thing that was previously unverified: the unvalidated rubric IS live in production.** `a82fe94` is the current head of `origin/main`, Vercel auto-builds `main`, and `https://eat-out-better-api.vercel.app/api/health` returns `"environment":"production"`. Real users are being scored by the rewrite right now, with no live-menu validation behind it.
- **Found that the test scripts could never have been run non-interactively.** `tsx` isn't installed in this repo, so the documented command (`npx tsx scripts/repeatability-test.ts`) drops into npx's "Ok to proceed? (y)" prompt and hangs forever in any non-interactive shell — which is exactly what a background agent or CI job gets. Added `npm run test:repeatability` / `npm run test:rubric-ab`, both using `npx --yes`, and verified they execute and stop cleanly at the API-key guard. This is plausibly a large part of *why* the validation never happened.
  - Deliberately did **not** add `tsx` as a devDependency: doing so meant regenerating the root `package-lock.json` (a 15k-line, 11.7k-deletion diff), which is precisely the change Ray deferred on 2026-07-26 because it alters how Vercel installs the API. Reverted it. `apps/api/package.json` now changes by exactly two script lines and the lockfile is untouched. (Mobile `node_modules` verified undamaged afterwards — React still 19.2.3.)
- **Re-cut the saturated-fat tier bands.** The previous fix closed the two gaps by moving the band floors *down* (2–6g became 6.0–7.5). That dragged the 2–6g band below the app's 7.0 green line — which is where the Spinach & Egg Omelet sits, the single dish whose red→green move was the whole point of Ray's rewrite. Closed the gaps *upward* instead (`4.5–6.5 / 6.5–8.0 / 8.0–10.0`), so the bands are contiguous **and** the 7.0 line sits inside the 2–6g band rather than above it.
- **Fixed an internal contradiction in the cooking-fat rule.** It instructed the model to assume added cooking fat for anything not "raw, steamed, boiled, or dry-roasted" — which excluded *grilled*, while the very next paragraph calls grilled "neutral to slightly favorable." Grilled salmon and grilled chicken, the app's flagship green dishes, were being told to add butter and not to, in adjacent sentences. Grilled/broiled/baked/poached are now explicitly on the no-added-fat list.
- **Fixed the protective-factor arithmetic.** The previous version said base band 6.0–7.5 plus a 1.0–2.0 bump, then asserted salmon "lands at 8.5–9.5" — unreachable from the band floor. It also let the top band (7.5–10.0) plus a 2.0 bump imply a score of 12.0. Now: bump is 0.5–1.5, capped at 10.0, and the salmon example resolves cleanly (~5g sat fat → base 6.5–8.0 → ~9.0, matching the proposal's own target).
- **Trimmed the prompt.** The rubric section went 2,816 → 3,937 chars in the previous fix; it is now 3,517 — same corrections, ~420 chars less. Token cost was never the real concern (~$0.0008/scan on Haiku); instruction dilution was.
- **Added `apps/api/scripts/rubric-ab-test.ts`** — runs the live-on-`main` rubric and the candidate rubric head-to-head over 17 probe dishes and prints a tier-change table. The probe set includes the proposal's 7 sanity dishes plus the dishes the two rubrics actually disagree about (Eggs Benedict, Shrimp Scampi, Coconut Shrimp, and a plain Shrimp Cocktail control), plus over-correction probes (Grilled Chicken Breast, Steamed Broccoli) and a Lentil Soup to check the protective bump can't exceed 10.0.

**What was confirmed as correct in the previous review**
- The Eggs Benedict / Shrimp Scampi concern is **real**, though for a sharper reason than was given: Ray's wording asserted these dishes' saturated fat "is usually low," which is factually false for a butter-sauce preparation (hollandaise ≈ 10–15g; scampi ≈ 14–29g at 2–4 Tbsp butter, USDA butter = 7.3g sat fat/Tbsp). Correcting it was warranted. Kept, tightened.
- The `<dishes>` tag-injection fix is **sound and safe to keep.** Verified no code path breaks: `normalizeDishName()` in `ranking.ts` already strips non-alphanumerics for matching, and both fallback paths return the *original* unstripped name to the client, so what the user sees is unaffected.
- Nutrition figures spot-checked against USDA: butter 7.3g sat/Tbsp ✓, farmed Atlantic salmon 3.1g/100g → ~5.3g per 6oz ✓ (the proposal's 5.25g holds), one large egg ~1.6g ✓, AHA ~13g/day ✓.

**What was wrong in the previous review**
- **The "double-counting" finding was a misdiagnosis.** The `or fat that is mostly UNSATURATED: 8.0-10.0` clause wasn't a redundant second credit — it was Ray's *primary* mechanism for salmon reaching ~9.0, with the protective paragraph as the prose explanation. Removing it broke salmon's calibration, which is precisely why a bump magnitude then had to be invented to restore it. Two fixes chasing one self-inflicted problem. The removal is fine *now* only because the bands were re-cut to make the arithmetic work.
- **The dead-zone fix solved a cosmetic problem and created a real one.** The gaps (6.0–6.5, 7.5–8.0) were genuine, but both sat entirely *within* a single tier, so neither could ever change a dish's green/yellow/red outcome. The fix for them did.
- **The AHA characterisation was overcorrected on a wrong premise.** The 2019 advisory *did* report that observational studies generally show no significant CVD association; it separately declined to set a numeric target and noted intervention data linking above-average intakes to higher LDL. Ray's original wording was closer to correct than credited. Current wording reflects both halves.

**Why it mattered**
- The previous review's own headline fix and its band change collided on the omelet — the one dish the entire rewrite was built around — and neither the collision nor its direction was noticed. That is the kind of error a manual walk-through cannot catch and the A/B test will.

**Open question for Sean (needs a decision, not more analysis)**
- **Should a restaurant omelet actually be green?** Ray's proposal predicted 7.0/green from 3.2g saturated fat — counting only the eggs, not the pan butter. At a realistic 1–2 tsp of butter it's ~6–8g total, which is honestly yellow. So either the proposal's target is wrong, or omelets should be scored as cooked with minimal fat. This is a nutrition call, and the "red→green omelet" headline of the whole rewrite depends on it.

**What this sets up next**
- Run `npm run test:rubric-ab` from `apps/api` with a real key. Every TIER CHANGE it prints must be one we intended; unintended ones block the ship.
- Still outstanding: the ~15-dish real-menu ingredient-guessing validation (proposal §8).
- Not pushed, not merged, not redeployed — same as before. Production still runs the unfixed rubric.

---

## 2026-07-27 — Critical review of the cholesterol rubric rewrite; 6 fixes made before shipping as build 7

**What changed**
- **Found that Ray's rubric rewrite (`0e2b761`) had already reached `origin/main`** via the `a82fe94` merge — despite the 2026-07-26 log entry explicitly stating "nothing merges until someone runs real menus through the new prompt." No live-menu validation had happened yet. Flagged to Sean immediately; Vercel deploy status of `main` needs manual confirmation (no `.vercel` link or CLI available in this environment to check directly).
- **Ran a critical accuracy review of the rubric** (no `ANTHROPIC_API_KEY` available in this environment, so this was a manual walk-through of the exact prompt text against real nutrition figures and adversarial dish examples, not a live API test — a live-API repeatability/validation pass per `rubric-prompt-change-proposal.md` §8 is still outstanding). Found and fixed 6 issues in `apps/api/src/lib/claude/prompts.ts`:
  1. **Real accuracy risk:** the "eggs/shellfish are de-emphasized" language sat right next to the scoring instruction with no separation from preparation — a dish like Eggs Benedict (hollandaise = butter) or Shrimp Scampi (garlic butter sauce) risked getting a pass on cholesterol grounds while the actual butter-heavy sauce went uncounted. Rewrote to explicitly cover the protein only, and added hollandaise/scampi to the hidden-fat inference examples.
  2. **Structural bug:** the saturated-fat tier bands had two gaps (6.0–6.5g and 7.5–8.0g) where no score was reachable — a dish estimated at 5.9g vs 6.1g (indistinguishable at estimation precision) could swing 2+ points. Made the bands contiguous.
  3. **Double-counting:** "mostly unsaturated fat" was both a base-tier trigger and a protective-factor bump — same signal credited twice. Now credited in one place only.
  4. **Unquantified adjustment:** the protective-factor bump had no stated size (unlike the preparation adjustment, which does) — the prompt's own salmon example implied a magnitude it never stated. Quantified it (~1.0–2.0 points).
  5. **Narrow cooking-fat inference:** only alfredo/curry/fried-breaded triggered a cooking-fat assumption; anything else pan-cooked (e.g. an omelet) risked only counting named ingredients. Broadened to a general rule.
  6. **Minor:** softened "no general cardiovascular link" (overstates the 2019 AHA advisory's actual finding of weak/insufficient evidence, not zero risk) to avoid overclaiming certainty for an app whose users specifically have high cholesterol.
- **Also fixed a pre-existing, unrelated security gap** noticed while in the file: `getRankingUserPrompt` interpolated OCR'd dish names/descriptions into the `<dishes>...</dishes>` block with no sanitization — a crafted menu photo containing literal `</dishes>` text could close the tag early and defeat the prompt-injection guardrail. Added angle-bracket stripping. This predates Ray's rubric change; not part of the rubric logic.

**Why it mattered**
- This is a health-scoring feature; getting the cholesterol logic right matters more than most bugs in this app. The Eggs Benedict/scampi risk was the most serious: it could make the score *less* accurate for exactly the dishes where restaurant butter content is highest, in the opposite direction from what the rewrite intended.

**Decisions made**
- Fixed in place on `feat/scoring-explained-ui` rather than a new branch, since that branch and `origin/main` currently point at the same commit — committed as a new, separate commit on top so the fix is reviewable independently of Ray's original change.
- Did not push. Did not merge/redeploy. Sean to review and decide.

**What this sets up next**
- **Still outstanding (per the original proposal, unchanged by this review):** run `apps/api/scripts/repeatability-test.ts` against the fixed prompt with a real `ANTHROPIC_API_KEY`, and do the ~15-dish ingredient-guessing validation against real restaurant menus, before this becomes build 7.
- **Confirm whether `origin/main`'s current (pre-fix) prompt is live on Vercel right now** — if so, the Eggs Benedict/scampi-style underestimate may be affecting real users until this fix ships.
- Bump `apps/mobile/app.config.ts` to version `1.1.4` / buildNumber `7` once merged, then EAS build + TestFlight submit (same flow as build 6).

**Still needs Sean**
- Review the 6 prompt fixes (diff in `apps/api/src/lib/claude/prompts.ts` on `feat/scoring-explained-ui`).
- Run the repeatability test with a real API key, or say go-ahead to run it another way.
- Confirm Vercel's current deployed state of `main`.
- Decide whether to merge now or wait for the live-menu validation pass.

---

## 2026-07-26 — Launch crash root-caused and fixed (duplicate React); scoring UI verified on simulator

**What changed**
- **Found and fixed the real cause of the app not launching.** It was never Sentry (see the correction below) and never the sandbox — it was two copies of React and two copies of React Native in the dependency tree. In plain terms: the project's root config says "the mobile app is not part of this workspace," but the root lockfile still said it was. So installing from the root quietly placed NativeWind (our styling library) next to the *website's* React 18 instead of the app's React 19 — and npm, trying to be helpful, gave NativeWind its own private copies of React and React Native. The app then had two of each, which breaks in two stages: the duplicate React Native made the app's startup code run twice and abort with a red `[runtime not ready]` error, and the duplicate React made the styling library crash with "Invalid hook call," leaving a blank white screen. Fixed by installing the mobile app's dependencies from its own (correct) lockfile and deleting the stray root copy. **No app code was involved.**
- **Fixed a silent styling bug that had been latent for weeks.** Our Tailwind config only looked for styles inside the `app/` folder, so any style used *only* in a shared component in `components/` was never generated and silently did nothing. This is why the new "?" button rendered on the wrong side of the screen — the "align right" instruction was simply never built. Now `components/` is scanned too. (Checked the one pre-existing shared component, `FeedbackSheet`, for affected styles: none, so nothing else changes visually.)
- **Verified the "What goes into your score" feature on the simulator**, which had never been possible before: the "?" button appears top-right, opens the sheet, all five scoring factors and the disclaimer render, the sheet scrolls, "Done" closes it, and the button correctly hides itself on the info screens. Ray also clicked through it on the capture and results screens.

**Correction to the 2026-07-25 entry below**
- That entry named `Sentry.init()` as the likely trigger for the launch crash. **That was wrong.** The error came from inside React Native's own startup sequence, which runs before any of our code — so Sentry could never have caused it. Sentry needed no changes and none were made.

**Why it mattered**
- This crash had blocked all on-simulator verification and had been written off as an unfixable quirk of the sandbox. It was a real bug that would bite anyone doing a fresh install, and it took minutes to find once we read the actual error text instead of guessing.
- The Tailwind blind spot is the more insidious one: it fails *silently*. Styles just don't apply, with no error anywhere.

**Decisions made**
- Fix the mobile side now; **leave the stale root lockfile alone for now** (Ray's call). It's the underlying cause and will recreate this problem on the next root install, but regenerating it changes how Vercel installs the API — that deserves its own change with the API build verified, not a drive-by fix. Flagged below.
- Don't rebuild native to test JS changes. This is a JS-only reload: start Metro and deep-link the dev client. The previous session burned 30+ min on native rebuilds that could never have helped.

**Also decided: the rubric rewrite and the UI that explains it are one change, not two**
- The two branches were folded into one (`feat/scoring-explained-ui` now contains both). They were only separate because of how the work happened across sessions — nobody decided they were independent, and the 2026-07-25 entry left it as an open question.
- Why they can't ship apart: the scoring screen tells users we measure against a ~13g saturated-fat budget and that we no longer penalize dishes for trans fat or dietary cholesterol. `main`'s deployed prompt still docks dishes for "high dietary cholesterol" and flags "trans fat present," and has no 13g budget at all. Shipping the UI alone would have the app confidently explaining a methodology it isn't using — on a health app, the worst kind of wrong.
- Consequence: the tested UI is now gated behind the **untested** rubric. That's the right trade — but nothing merges until someone runs real menus through the new prompt.

**What this sets up next**
- **Before merging:** validate the new rubric against real menus (and ideally run `apps/api/scripts/repeatability-test.ts`). Merging to `main` redeploys the API and changes live scoring for users the moment it lands.
- **Known trap, not yet fixed:** root `package-lock.json` still lists `apps/*` as workspaces while root `package.json` lists only `apps/api` + `packages/*`. The next root `npm install` will recreate the duplicate-React crash. Fixing it means regenerating the root lockfile and confirming the Vercel API still installs and builds.

---

## 2026-07-25 — Cholesterol rubric rewrite branched off; "What goes into your score" UI built; simulator crash misattributed to Sentry

**What changed**
- Found a Cowork instance had made substantive uncommitted edits directly on `main` (the cholesterol scoring rubric rewrite in `apps/api/src/lib/claude/prompts.ts` — saturated-fat budget model, drops outdated trans-fat/dietary-cholesterol assumptions — see the rubric entry below for the detail). Moved that work onto `feat/cholesterol-rubric-rewrite` (commit `0e2b761`) so `main` stays clean. Nothing was lost, just relocated.
- Built the P1 backlog item "a simple 'how scores work' screen" (see `plan.md`'s NEXT section): a global "?" button (top-right, every screen except processing/how-it-works/scoring-explained) opening a new modal, `apps/mobile/app/scoring-explained.tsx`, with plain-English scoring factors matching the rewritten rubric. Lives on `feat/scoring-explained-ui`, uncommitted — ready for Sean to pull and test on his own simulator.
- While trying to verify the UI change on-device (per this repo's manual-verification convention), hit a reproducible `[runtime not ready]` crash on app launch in this sandbox. Confirmed via a clean-`main` baseline test that the crash is **not** caused by the new UI code. Root-cause debugging (disabling Sentry's replay integration, then `Sentry.init()` entirely) pointed at `Sentry.init()` — specifically its early, synchronous runtime patching in `_layout.tsx` — as the likely trigger, but this was **not fully confirmed** before the investigation was cut short (see below) and `_layout.tsx` was reverted back to the clean, Sentry-enabled state. No code changes were kept from this investigation.

**Why it mattered**
- Uncommitted work sitting on `main` (twice in one session — once from Cowork, once when Claude Code itself briefly repeated the mistake) risks being lost or accidentally shipped. Both instances are now cleanly isolated on branches.
- The "how scores work" UI directly answers the P1 backlog item already in `plan.md`.

**Decisions made**
- Ray flagged that the Sentry crash investigation went on an unprompted, unbounded tangent after a simple "why did it crash" question — should have proposed a bounded diagnostic plan and checked in before burning ~30+ min of build cycles. Noted for future sessions (see `feedback_debugging_approach` memory).
- Stopped the Sentry investigation short of a confirmed root cause. The lead (Sentry.init's early patching) is real but unverified — someone should pick this up deliberately, not as a tangent.

**What this sets up next**
- Sean: pull `feat/scoring-explained-ui` and `feat/cholesterol-rubric-rewrite`, test both on his own machine, decide on merge.
- If the Sentry crash matters for local dev (vs. just this sandbox), someone should deliberately reproduce and fix it — not clear yet whether it's sandbox-specific or would also hit Sean's machine.
- Open question: are these two branches meant to ship together or independently? *(Answered 2026-07-26: together — see the top entry.)*

---

## 2026-07-25 — Regrounded the cholesterol ranking prompt (saturated-fat budget + science fixes)

**What changed**
- Rewrote `RANKING_SYSTEM_BASE` in `apps/api/src/lib/claude/prompts.ts` — the live prompt that scores each dish 1–10 for high cholesterol. It now:
  - Makes saturated fat the explicit primary lever, anchored to the real AHA daily budget (~13g/day), with gram-based tier bands instead of vague qualitative ones.
  - Adds protective factors (unsaturated/omega-3 fat quality, soluble fiber, plant sterols) as a real second axis that can raise a score even when saturated fat is moderate.
  - Demotes trans fat from the default worst-case trigger to an edge-case flag (partially hydrogenated oils have been out of US food since 2018–2021). "Fried/crispy" now routes to a preparation penalty, not trans fat.
  - Demotes dietary cholesterol (egg yolk, shellfish) per the 2015 Dietary Guidelines / 2019 AHA advisory — these are now judged on their (usually low) saturated fat.
- Persona, one-sentence non-judgmental explanation rules, and the prompt-injection guardrail were left unchanged. OCR prompt, scoring thresholds, and pipeline untouched.

**Why it mattered**
- The old rubric's two worst-case triggers rested on outdated science: trans fat (effectively banned) and dietary cholesterol (de-emphasized). The clearest behavior change is an egg omelet moving from red to green.
- The old scoring bands were qualitative and ungrounded; anchoring to the 13g/day budget replaces invented precision with a defensible reference. Component-level nutrient decomposition also showed several of Sean's KB per-ingredient point weights were the same saturated-fat lever double-counted.
- Reviewed with Sean before implementing.

**Decisions made**
- Stayed on the single-LLM-call approach (Option A); did NOT build a deterministic scoring engine (Option B).
- Sean's 30-page Scoring Knowledge Base was confirmed to have never been wired into the live system — it's reference-only and was banner'd as such. This work targets the live prompt, not the KB.

**What this sets up next**
- Run the repeatability test (`apps/api/scripts/repeatability-test.ts`) to measure score drift at temp 0.2 vs 0.
- Higher-value follow-up: the ingredient-guessing validation (~15 ambiguous real-restaurant dish names vs. assumed hidden ingredients).
- Optional: USDA FoodData Central rigor pass on the per-ingredient saturated-fat numbers used to design the bands.

**Reference docs added**
- `rubric-prompt-change-proposal.md` — the full proposal (rationale + before/after + open questions).
- `prompts-snapshot.md` — verbatim baseline of all live prompts before this change.

---

## 2026-07-08 (later) — Build 6 UI enhancements: 5 of 7 Linear tickets done

**What changed**
- Read the 7 Linear tickets (EAT-10 through EAT-16) and triaged them: five buildable directly, two need a design first. Built the five on branch `feat/build6-ui-enhancements` (one commit per ticket):
  - **EAT-16 — camera controls moved out of the viewfinder.** Zoom pills and the shutter button now sit below the camera preview (zoom left, shutter center, gallery link right), so nothing blocks the menu while framing. Pinch-to-zoom still works on the preview itself.
  - **EAT-12 — capture flash.** The viewfinder blinks white when a photo is successfully taken and added to the tray, so you know the shot landed.
  - **EAT-11 — back from results keeps your photos.** The results screen now has a back button that returns to the same capture screen with photos still loaded (previously the only way back was the iOS swipe gesture; the failure-path half of this was already fixed in the build-6 sweep).
  - **EAT-15 — bigger reading text.** All primary body copy (instructions, dish explanations, substitutions, tips) went up one size step. Text already scales with the phone's accessibility text-size setting — nothing in the app disables that — so larger-text users get larger text automatically.
  - **EAT-10 — leave-and-return during analysis: already fixed.** The build-6 sweep added exactly this: when you return to the app, the suspended request is aborted and automatically retried (up to 3 leave/return cycles per scan). No new code needed — just verify on TestFlight. The unfixable case is iOS killing the app entirely while backgrounded.
- **Two tickets are paused for design:** EAT-13 (tap a photo to view it full-screen with close/delete) and EAT-14 (landscape photo capture). Both introduce new layouts with no precedent in the app — building them without a design risks clashing UI.

**Decisions made**
- EAT-12 is a pure visual flash — no haptics — to avoid adding a new native dependency (`expo-haptics`) right before the EAS build.
- EAT-15 stayed deliberately conservative: body copy only, one step; labels/pills/footers untouched. A full type-scale pass can ride along with the EAT-13/14 design work.

**What this sets up next**
- Sean provides designs (Figma or mockups to react to) for EAT-13 and EAT-14 → build them → merge the branch → EAS build + TestFlight submit for build 6.

**Still needs Sean**
- Designs for EAT-13 and EAT-14.
- On-device sanity pass of the five changes (especially the new camera control row on a small-screen iPhone).
- Everything from the previous entry (EAS build, Vercel deploy check) still stands.

---

## 2026-07-08 — Build 6 (v1.1.3) shipped: whole-app bug sweep + docs reconciled

**What changed**
- **Fixed ~20 real bugs across the whole app**, almost all in the "things go wrong" paths — the cases most likely to bite a real user at a restaurant. The happy path was already solid; this hardened everything around it. Highlights in plain terms:
  - **Multi-page scans stopped silently failing.** Uploads now stay under the size limit our host (Vercel) enforces, so photographing several menu pages no longer gets rejected before it even reaches us. Photos are also compressed smarter (no more accidentally *enlarging* small photos).
  - **Photo limit is now honestly 10.** The app used to let you add 12 photos, but the server rejected anything over 10 — so an 11–12 page scan always failed. Now both agree on 10.
  - **Dense menus no longer get told "that's not a menu."** A packed menu produced more text than our reader was allowed to return, which broke it and made the app wrongly reject a real menu. Fixed, plus it now recovers partial results instead of throwing everything away.
  - **A big menu can't quietly turn into all-neutral scores anymore.** Long menus are now scored in parallel batches, which also keeps us inside the time limit; if one batch fails, only those dishes fall back, not the whole list.
  - **A failed analysis no longer loses your photos.** It now returns you to the same capture screen with your photos intact, instead of dumping you on a blank one. Error messages are friendly ("that's more than we can analyze in one scan…") instead of raw technical text; the technical detail goes to Sentry.
- **Privacy policy corrected** to disclose the services we actually use (PostHog analytics, Sentry crash reports + session replay, Google Sheets for feedback). The old text claimed we shared nothing with third parties, which was no longer true.
- **Added a light rate limit** on the analysis endpoint (a speed bump against abuse while the token gate is off).
- **Reconciled the repo and the docs.** Build 6 was written against the pre-doc-system `main`, so it had logged itself in the old `CHANGELOG.md`. Integrated build 6 with the new doc system, moved its summary here (where change history now lives), and folded in the local EAS workspace fix that hadn't been pushed. The archived `CHANGELOG.md` now ends at build 5; everything from build 6 on lives in this file.

**Decisions made**
- **We only rotate `APP_SHARED_TOKEN` when it leaks, not every build.** It's a static shared secret — set it once, reuse across all builds. Build 5's value is burned only because it was pasted into a chat once; the next fresh value is permanent unless it leaks again.
- **`CHANGELOG.md` is fully retired.** Change history lives in `log.md` from build 6 onward; the archived copy is frozen at build 5.

**What this sets up next**
- Build 6 is code-complete on `main` but **not built or on TestFlight yet** — needs an EAS build + submit (Sean runs it; version/build number already set to 1.1.3 / 6).
- We're adding **new features into build 6 before it goes out** — scope comes from the Linear tickets Sean created (2026-07-08). UI for those may need Figma designs to avoid clashing layouts; that triage happens once the tickets are readable.

**Still needs Sean**
- Run the EAS build + TestFlight submit for build 6.
- Verify the Vercel deploy of `main` picked up the API + privacy-page changes.
- (App Store, later — not blocking TestFlight) add "Usage Data / Diagnostics" to the privacy nutrition labels to match the updated policy.
- Decide whether the stray `my-app/` scaffold and the GTM `.xlsx` in the repo root should be deleted / git-ignored / committed (left untracked for now).

---

## 2026-06-22 — Documentation system + launch planning

**What changed**
- Established a clear documentation system so our docs stop drifting out of sync (details now in `CLAUDE.md` → Documentation System). Three living docs from now on: `CLAUDE.md` (stable rules), `plan.md` (what's next), `log.md` (this file — what changed).
- Built the **GTM Launch Tracker** (`Eat_Out_Better_GTM_Launch_Tracker.xlsx`): ~70 sequenced activities across 11 phases, with priorities, must-have flags, a cost model, monetization plan, analytics plan, infra checklist, GTM channel sequence, KPIs, and a scoring source-of-truth tab.
- Wrote `Scoring_KB_Generation_Prompt.md` — the prompt that generates a consistent, cuisine-agnostic scoring knowledge base for high cholesterol, hypertension (sodium), and type 2 diabetes/prediabetes.

**Decisions made**
- Scoring will move out of the prompt into a **versioned knowledge base** with deterministic math, so the same dish scores the same every time. (Root-cause fix for inconsistent ratings.)
- We'll **stay accounts-free for launch**, but the "identity trigger point" is now an explicit decision on the roadmap, not an accident.
- Next two conditions after cholesterol: **hypertension, then type 2 diabetes/prediabetes** — chosen because they're the same cardiometabolic user and forgiving of directional accuracy. Severe allergy and any dosing decisions are explicitly out of scope.
- Decided to **skip a dietitian for now**; instead the KB prompt forces a self-verification + dangerous-miss audit, and we'll validate against real menus.

**Corrected stale status** (these were marked open in old docs but are actually done)
- The analyze API is **built and deployed**. EAS is **configured** (recent commit pins react-dom for EAS). The v1 spec (`write-spec`) and competitive brief are **done** (in Drive). Only the app icon's final-vs-placeholder status is still unconfirmed.

**What this sets up next**
- The P0 list in `plan.md`: spend cap, API auth + rate limiting, image cap, the three AI validation tests, the scoring KB, and crash reporting.

**Also done this session**
- Archived the deprecated docs to `archive/` (CHANGELOG, V0-launch-checklist, session-01..05) with a README; verified nothing in code/config reads them. Root folder now shows only canonical docs.

**Still needs Sean**
- Confirm app icon is final or replace it. Run the three AI validation tests. Set the Anthropic spend cap. Decide on LLC. Skim `backlog.md` and fold any still-live ideas into the GTM Launch Tracker.

---

## Entry template (copy me)

```
## YYYY-MM-DD — <short title>

**What changed**
- ...

**Decisions made**
- ... (and why)

**What this sets up next**
- ...

**Still needs Sean**
- ...
```
