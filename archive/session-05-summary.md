# Session 05 Summary — Eat Out Better

## Where We Are
Working through the EAS / TestFlight block. Ray's part (steps 1-2: Expo account + `eas.json`) was done and pushed. This session covered Sean's part (steps 3-4): install/login eas-cli, run `eas build --platform ios`, then submit to TestFlight.

`eas-cli` was already installed (v20.1.0) and already logged in as `seanflynn13@gmail.com` (Owner on `stlynn13-lgtm`, Admin on `eatoutbetter`).

## Changes Made & Pushed (commit `a65cb20`)

Pulled latest (`9fc1c79`, Ray's `eas.json`), then fixed issues that blocked `eas build`:

### 1. `app.config.ts` was dropping `extra.eas.projectId`
`app.config.ts`'s `extra: {...}` block completely overwrote `app.json`'s `extra`, losing the EAS project ID (`00762885-6323-4fbb-9220-32bee3194ea0`). Fixed to `extra: { ...config.extra, apiUrl: ... }`.

### 2. `eas.json` failed schema validation
`submit.production.ios.ascAppId` was an empty string (`""`), which `eas build` rejects outright (won't even start). Removed the empty field — will need to add the real App Store Connect numeric app ID once that app record exists (required before `eas submit` works).

### 3. Added `ITSAppUsesNonExemptEncryption: false`
To `app.config.ts`'s `ios.infoPlist`, preempting an App Store Connect export-compliance prompt (app only uses standard HTTPS).

### 4. Fixed the actual `pod install` failure
EAS build got past credentials/config but failed at `pod install` with:
```
[Reanimated] react-native-worklets package isn't installed.
Please install a version between 0.8.x and 0.8.x to use Reanimated 4.3.1.
```
**Root cause:** `react-native-worklets` was only a transitive dependency, and `nativewind`'s nested copy (0.9.1) conflicted with the 0.8.x that `react-native-reanimated@4.3.1` needs. On EAS's fresh `npm install` (no committed lock file), this resolved inconsistently.

**Fixes:**
- Added `react-native-worklets@0.8.3` as a direct dependency (`npx expo install react-native-worklets`)
- Removed `jsEngine: "jsc"` from `app.config.ts` — not a valid SDK 56 config field anymore, and Reanimated 4 / New Architecture requires Hermes anyway
- Removed unused `@react-navigation/bottom-tabs`, `@react-navigation/native`, `@react-navigation/native-stack` (incompatible with `expo-router` as of SDK 56, and confirmed unused in source)
- Bumped `@react-native-async-storage/async-storage` 2.1.2 → 2.2.0 (expected version for SDK 56)
- `rm -rf node_modules package-lock.json && npm install` for a clean, reproducible lock file
- Un-ignored `apps/mobile/package-lock.json` in `.gitignore` (was being excluded from EAS's upload entirely — added a `!apps/mobile/package-lock.json` exception, kept root `package-lock.json` ignored since that's `apps/api`'s/Ray's territory)

After these fixes, `npx expo-doctor` went from 17/21 → 20/21 (only remaining failure is a local CocoaPods version check, irrelevant to EAS's cloud build images).

## Current Status: BUILD STILL FAILED
Sean re-ran `eas build --platform ios --profile production` after this commit was pushed, and it **failed again**. We don't yet have the new error log — need to capture it to diagnose the next issue.

## Not Yet Touched (separate, pre-existing uncommitted changes — left alone)
- Root `package.json`: `workspaces` changed from `["apps/*", "packages/*"]` to `["apps/api", "packages/*"]`, plus `"overrides": {"zod": "3.22.4"}` and a `mobile` script change. Pre-existing before this session, not committed.
- Untracked: `.nvmrc`, `api-analyze-spec.md`, `apps/mobile/scripts/`, `my-app/`, `session-02/03/04-summary.md`

## Next Step
Get the new `eas build` error output from Sean and diagnose. Likely candidates given the pattern so far: more `expo-doctor`/dependency issues surfacing one at a time, or a credentials/provisioning issue (the build did get past credential setup last time using "remote iOS credentials" from Expo's servers).
