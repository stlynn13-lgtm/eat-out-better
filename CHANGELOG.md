# Changelog

A plain-English log of meaningful changes to the project. Updated when something significant ships or breaks.

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
