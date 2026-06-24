# Changelog

A plain-English log of meaningful changes to the project. Updated when something significant ships or breaks.

---

## 2026-06-24 — v1.1.0 (build 4): fix stuck state after backgrounding

**What shipped:**
- **Fixed the app getting permanently stuck after returning from the background mid-upload (EAT-5).** When iOS suspended the app during the menu-analysis network call, the in-flight request hung forever — the processing screen never advanced and the Analyze button stayed locked. Now an `AppState` listener detects the foreground transition, aborts the dead request, and retries once with a fresh request (restarting the progress bar). If the retry also fails, the user gets a clear network-error alert instead of a frozen screen. (Merged via PR #2.)

**Versioning:** iOS `buildNumber 3 → 4` (in `app.config.ts`). App version stays `1.1.0`.

**Note:** build 3 (`final privacy policy text + submit appleId`) was cut and submitted to Apple before this fix landed, so it is not documented above; build 4 is the first build to carry the EAT-5 fix.

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
