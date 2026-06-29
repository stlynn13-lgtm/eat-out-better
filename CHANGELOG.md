# Changelog

A plain-English log of meaningful changes to the project. Updated when something significant ships or breaks.

---

## 2026-06-29 — v1.1.1 (build 4): non-menu warning + analytics, reconciled into one build

This release consolidates three streams of work that had diverged across branches into the single iOS build 4 binary — the first numbered build to carry all of them. App version bumped `1.1.0 → 1.1.1`; iOS `buildNumber` stays `4` (no build 4 had been cut yet).

**What shipped:**
- **No more frozen app after backgrounding mid-upload (EAT-5).** An `AppState` listener now detects the foreground transition, aborts the dead in-flight request, and retries once (restarting the progress bar); a clear network-error alert if the retry also fails. (First numbered build to carry this — it landed on `main` after build 3 was already submitted.)
- **Friendly warning when you photograph a non-menu (EAT-6).** Previously a non-menu photo silently bounced back to the scan screen. Now: (1) an on-device text pre-check (Google ML Kit, free/offline) skips the upload entirely when there's essentially no text; (2) the API returns a distinct `NOT_A_MENU` vs `OCR_EMPTY` error; (3) the swallowed-alert navigation race is fixed (processing screen solely owns navigation back). Fails open — a real menu is never blocked by a tooling hiccup.
- **PostHog product analytics (Ray's work).** P0 funnel events + P1 session linking, environment tagging (development/preview/production), plus navigation fixes (results-screen unmount, double-navigation prevention) and a Hermes-compatible ID generator.
- **Combined behavior:** the on-device `NOT_A_MENU` rejection now also fires a `menu_analysis_failed` analytics event, so the full funnel is tracked end-to-end.

**Reconciliation notes:**
- `chore/build-4-eat5` (EAT-6) had been branched from `main` *before* the PostHog work landed, so the two diverged. Merged `main` into the build-4 line; the only conflict was `hooks/useAnalysis.ts` (both sides edited it) — resolved by keeping the new `startAnalysis(imageUris, scanSessionId, startedAt)` signature + all PostHog tracking *and* layering in the EAT-6 pre-check and error-handling fixes.
- Added `NOT_A_MENU` to the mobile `AnalysisErrorType` union so the pre-check failure is type-safe to track.
- The Apple Vision variant of the EAT-6 pre-check (branch `claude/slack-session-azbfka`) was the abandoned alternative; ML Kit is canonical.

**Versioning:** app version `1.1.0 → 1.1.1`, iOS `buildNumber` `4` (in `app.config.ts`).

**Deploy note:** the EAT-6 API half (`NOT_A_MENU` 422 backstop + OCR prompt change) must reach `main`/Vercel for the "has text but isn't a menu" case to be caught server-side; the mobile on-device pre-check and error handling work regardless.

---

## 2026-06-24 — EAT-5 backgrounding fix lands on `main`

**What happened:** the stuck-after-backgrounding fix (EAT-5, see above) merged to `main` via PR #2 *after* build 3 had already been cut and submitted to Apple — so no numbered build carried it yet. The `buildNumber` was bumped `3 → 4` in anticipation. This fix ultimately ships in **build 4 / v1.1.1** (documented in the 2026-06-29 entry above), not in a standalone v1.1.0 build.

---

## 2026-06-23 — v1.1.0: product-improvement release (build 2)

**What shipped:**
- **App icon** — replaced the placeholder with the real 1024×1024 brand logo (fork + heart-with-check + knife).
- **Camera: removed the white framing square** that read as a UI artifact, for a clean full-frame viewfinder.
- **Camera: native zoom** — pinch-to-zoom plus tappable 0.5×/1×/2×/3× level pills (per Figma). Preset magnitudes still need on-device calibration; 0.5× ultra-wide is an expo-camera limitation.
- **12 photos per scan** — raised the cap from 10 to 12 and made it visible: an "n / 12" counter and "Up to 12 photos per scan" helper text that switches to "Maximum of 12 photos reached" at the cap.
- **Processing fun facts** — the cholesterol/healthy-eating tips now cross-fade smoothly every 8 seconds (no interaction), expanded from 5 to 9 facts.
- **Privacy Policy screen** + a "Privacy Policy" entry point in the welcome footer. *Copy is a draft derived from the architecture — replace with final legal text and host it at a public URL before submission.*
- **"How it works" slide-up** — a modal sheet explaining the scan → read → rank logic and score tiers, with a "How it works →" entry point in the welcome footer.
- **Docs reconciled** — corrected stale stack/Drive/MCP notes, marked completed launch-checklist items, and added v1.1.0 scope to the backlog.

**Versioning:** app version `1.0.0 → 1.1.0`, iOS `buildNumber 1 → 2` (in `app.config.ts`), mobile package `1.1.0`.

**Process:** built on branch `release/v1.1.0` off baseline tag `pre-release-2026-06-23`, one atomic commit per change, landing via PR to `main`. Revert path: `git reset --hard pre-release-2026-06-23` or revert the PR.

**Still open:** bug-fix list (none provided yet); final privacy-policy copy + hosted URL.

---

## 2026-06-06 — Mobile app rebuilt from scratch, now runs on iOS simulator

**What happened:**
The original mobile app was scaffolded with mismatched Expo/React Native package versions and a broken monorepo config. Every attempt to run it hit a cascade of Hermes bytecode compiler errors (`private properties not supported`, `DOMException not found`, `right operand of 'in' is not an object`). We spent significant time patching symptoms before concluding the foundation was unfixable.

**What we did:**
- Deleted `apps/mobile` entirely and scaffolded fresh with `create-expo-app` (Expo SDK 56, React Native 0.85.3)
- Switched JS engine from Hermes to JSC (`jsEngine: "jsc"` in `app.config.ts`) — eliminates all bytecode compilation issues, correct choice for MVP
- Cleaned root `package.json` — removed app-specific packages that were polluting the monorepo and causing npm hoisting conflicts
- Rewrote `metro.config.js` with minimal correct monorepo config (`watchFolders` + `nodeModulesPaths`)
- Removed broken polyfills, Babel hacks, and patch scripts from the old setup
- All product code (screens, store, hooks, lib) preserved and migrated into the new scaffold

**Current state:**
- App runs end-to-end on iPhone simulator (Welcome → Capture → Processing → Results flow)
- Code is on `main` in the repo
- `ios/` is gitignored (correct — Expo generates it via prebuild)

**What's next:**
- Build the API (`POST /api/analyze`) — nothing works without it
- Set up EAS for TestFlight when ready

---
