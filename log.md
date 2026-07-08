# Eat Out Better — Change Log

**What this is:** the running, plain-language record of what changed, what we decided, and why. Newest entry on top. Written so a non-developer can skim it and understand the project's history without reading code or commits. This replaces the scattered `session-NN-summary.md` files and the developer-oriented `CHANGELOG.md` going forward.

**How to add an entry** (copy the template at the bottom): date it, say what changed in plain words, why it mattered, and what it sets up next. One entry per working session where something changed.

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
