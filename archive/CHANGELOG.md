# Changelog

A plain-English log of meaningful changes to the project. Updated when something significant ships or breaks.

---

## 2026-07-07 — v1.1.3 (build 6): full-codebase bug sweep

A review of the whole codebase surfaced ~20 bugs concentrated in failure paths — cases where a real scan failed with the wrong message, lost the user's photos, or hit platform limits the code didn't know about. App version `1.1.2 → 1.1.3`, iOS `buildNumber` `5 → 6`.

**Critical fixes:**
- **Uploads now fit Vercel's hard ~4.5MB request-body limit.** The old `serverActions.bodySizeLimit: 52mb` config never applied to route handlers, so multi-photo scans regularly got platform-413'd. The client now compresses to a total-upload budget (3MB decoded across all photos, split per image), caps the LONG edge at 1568px (tall photos were previously uncapped; small photos were being *upscaled*), and steps down quality → dimensions until each image fits.
- **Photo cap aligned at 10** (was 12 in the app vs 10 in the API — an 11/12-page scan always 400'd).
- **Dense menus no longer get "That doesn't look like a menu."** OCR output was capped at 2k tokens; dense pages truncated mid-JSON, the parse failed, and the code mapped that to `isMenu: false`. Now: 8k token cap, complete dishes are salvaged out of truncated JSON, and an unparseable page counts as a *failed image* instead of "not a menu".
- **Ranking is now chunked and parallel** (35 dishes per request). A single 100-dish call could exceed its 8k output cap (truncated → every dish silently scored 5.0) and could outlive the 60s function limit. Chunks are merged by score; a failed chunk degrades to neutral fallbacks instead of failing the scan. Pipeline worst case now ~55s, inside `maxDuration: 60`.

**Failure-path UX:**
- **Analysis errors no longer throw away the user's photos.** Processing now navigates *back* to the existing capture screen (replace() stacked a fresh empty capture, losing all photos and double-firing the alert).
- Users see friendly, status-aware error copy; raw internals ("Aborted", "API error: 413") go to Sentry/console instead of the alert.
- Dismissing an error clears it from the store (stale errors could hijack the results screen); failed attempts no longer leave multi-MB base64 blobs in memory or skew page-count analytics.
- Backgrounding the app twice mid-scan no longer kills the analysis (aborts get their own retry budget, separate from network failures).
- Fallback ranking copy no longer blames the user's connection.

**Other:**
- Best-effort per-IP rate limit on `/api/analyze` (20 scans / 10 min, in-memory) — a speed bump while the shared-token gate is fail-open, not a security boundary.
- **Privacy policy updated (App Store blocker):** Section 5 claimed no third-party sharing; it now discloses PostHog (analytics), Sentry (crash reports + session replay), and Google Sheets (feedback), plus matching Section 3/6 updates.
- Dish descriptions extracted by OCR now actually reach the results screen (they were dropped during enrichment; the description UI was dead code).
- Model dish-renames no longer create duplicate entries (normalized name matching); ranks are re-sequenced 1..n server-side.
- Ranking prompt hardened against instructions embedded in menu text; OCR content is delimited as untrusted.
- Removed dead browser-only image util from the API; zoom pills no longer show a non-functional 0.5×; migrated off deprecated `ImagePicker.MediaTypeOptions`.

**Still open (not code):** re-rotate `APP_TOKEN` before ever setting `APP_SHARED_TOKEN` in Vercel (build-5 value is burned); App Store privacy nutrition labels need "Usage Data / Diagnostics" added to match the updated policy.

---

## 2026-07-04 — Sentry crash reporting fixed (unblocks build 5)

Crash reporting (Sentry) had been wired into the app but the iOS build wouldn't compile. Investigation found the failure wasn't Sentry's SDK at all — sentry-cocoa 9.19.1 builds clean on Xcode 26.5 with no modifications. The build was broken by leftover workarounds from an earlier debugging session: hand-edits to Sentry pod sources plus a Swift compiler flag (written against the older sentry-cocoa 8.41.0, which genuinely couldn't build on Xcode 26), and a rewritten MLKit simulator patch that silently corrupted the MLKit archives a little more on every `pod install`.

**What changed:**
- Removed all Sentry workarounds from the Podfile; restored pristine Sentry and MLKit pod sources
- Rewrote the MLKit simulator patch as an idempotent in-place byte-patch (the approach documented on 2026-07-02) — it now fails loudly instead of corrupting silently
- Moved the `@sentry/react-native/expo` config plugin from `app.json` (where it was silently ignored) into `app.config.ts`, so EAS builds get source-map/dSYM upload
- Verified end to end: simulator build succeeds, app runs, Sentry native SDK initializes with crash handler + session replay recording

**Versioning:** iOS `buildNumber` `4 → 5` (app version stays `1.1.1`). *(Superseded on merge: the shared-secret-gate branch below bumps the app version, so the shipped build 5 binary is `1.1.2`.)*

**Follow-up (same day):** the MLKit simulator patch now lives in an Expo config plugin (`apps/mobile/plugins/`), so `npx expo prebuild --clean` regenerates it automatically instead of silently dropping it. Verified end to end (prebuild → pod install → build → app runs). Also deleted the unreferenced `GoogleService-Info.plist` Firebase leftover.

**Before cutting build 5:** add `SENTRY_AUTH_TOKEN` as an EAS secret (it lives only in local `.env.local`) so source-map upload works on EAS.

---

## 2026-07-01 — v1.1.2 (build 5): shared-secret gate on the API

Protects the public `/api/analyze` endpoint from abuse that would bill the Anthropic account. App version `1.1.1 → 1.1.2`, iOS `buildNumber` `4 → 5`.

**What shipped:**
- **API requires an `x-app-token` header.** The endpoint now checks incoming requests against an `APP_SHARED_TOKEN` env var; requests without a matching token get `401 UNAUTHORIZED`. The mobile app sends the token, injected at build time from an `APP_TOKEN` env var so the real value never lives in committed source.
- **Fails open when unconfigured.** If `APP_SHARED_TOKEN` is unset in Vercel the gate is a no-op (logs a warning) — so a forgotten env var never 401s real users. Setting the Vercel env var *activates* the gate.
- Not a security boundary on its own — the token ships inside the app bundle. It's a cheap deterrent paired with Vercel rate-limiting and an Anthropic spend cap (the real financial backstop).

**This binary also carries** the feedback system (bottom sheet + Google Sheets + PostHog events) already merged to `main`.

**Rollout order (important):** merge → API auto-deploys with the gate *inactive* → cut & TestFlight build 5 (with `APP_TOKEN` set) → only then set `APP_SHARED_TOKEN` in Vercel. Setting it earlier would 401 every already-installed build (4 and earlier) that doesn't carry the token. Both secrets must be the same value (`openssl rand -hex 32`).

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
