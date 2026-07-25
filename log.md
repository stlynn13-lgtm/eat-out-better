# Eat Out Better — Change Log

**What this is:** the running, plain-language record of what changed, what we decided, and why. Newest entry on top. Written so a non-developer can skim it and understand the project's history without reading code or commits. This replaces the scattered `session-NN-summary.md` files and the developer-oriented `CHANGELOG.md` going forward.

**How to add an entry** (copy the template at the bottom): date it, say what changed in plain words, why it mattered, and what it sets up next. One entry per working session where something changed.

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
