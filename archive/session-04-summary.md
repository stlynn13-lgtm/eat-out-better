# Session 04 Summary — Eat Out Better

## Where We Are
Trying to get the app running on Sean's iPhone for testing. The Vercel API deployment is working. The mobile app has been rebuilt by Ray (a technical collaborator) on Expo SDK 56 / RN 0.85.3.

## What's Been Fixed This Session

### 1. `@eat-out-better/shared` resolution
`apps/mobile` is NOT in the root npm workspace (Ray removed it). This caused `npm install` inside `apps/mobile` to try fetching `@eat-out-better/shared` from the public npm registry — which fails.

**Fix applied:** Changed `apps/mobile/package.json`:
```json
// Before
"@eat-out-better/shared": "*"

// After
"@eat-out-better/shared": "file:../../packages/shared"
```

### 2. Metro version mismatch
`Cannot find module 'metro-core/private/canonicalize'` — caused by stale/mismatched node_modules.

**Fix:** `rm -rf node_modules && npm install` inside `apps/mobile`.

## Current Blocker: Can't Run App on Device

### Why Expo Go Doesn't Work
SDK 56 requires a newer version of Expo Go than what's currently on the App Store. Apple review lag means the compatible Expo Go version isn't published yet. This is a known Expo limitation — Expo Go only supports specific SDK versions.

Ray almost certainly tested using a simulator (requires CocoaPods, which he'd know how to set up) or an EAS development build — not Expo Go on a physical device.

### Why Simulator Doesn't Work (for us)
CocoaPods not installed on Sean's Mac. `expo run:ios` requires CocoaPods to build native iOS dependencies. Installing CocoaPods requires Ruby setup.

**Also:** Simulator can't use the real camera — which is the core feature of this app. So even if we got the simulator running, it wouldn't be useful for testing menu scanning.

## Chosen Path: EAS Build → TestFlight

This is the right path. It:
- Runs the build in the cloud (no CocoaPods needed locally)
- Installs on Sean's real iPhone (real camera works)
- Is the path to actual distribution anyway

### Steps (pick up here in next session)

**Prerequisite:** Confirm active paid Apple Developer Program membership at [developer.apple.com/account](https://developer.apple.com/account). Need to see "Member" status. Cost is $99/year if not enrolled.

**Also prerequisite:** Node/npm must be installed. Sean got `zsh: command not found: npm` — Node is not installed on his Mac.

#### Step 0 — Install Node.js (FIRST)
Download from [nodejs.org](https://nodejs.org) — get the LTS version. This installs both `node` and `npm`. After install, close and reopen Terminal, then verify:
```bash
node --version
npm --version
```

#### Step 1 — Install EAS CLI
```bash
npm install -g eas-cli
eas login
```
Use Expo account credentials (already linked to GitHub).

#### Step 2 — Configure EAS (run from apps/mobile)
```bash
cd ~/Documents/Claude/Projects/Eat\ Out\ Better/apps/mobile
eas build:configure
```
Creates `eas.json`, registers the app with Apple Developer account, creates App ID `com.eatoutbetter.app` if it doesn't exist.

#### Step 3 — Build
```bash
eas build --platform ios --profile preview
```
Cloud build — takes 15–30 min. No local Xcode/CocoaPods needed.

#### Step 4 — Submit to TestFlight
```bash
eas submit --platform ios
```
Then: App Store Connect → TestFlight → Internal Testing → add yourself as tester → accept invite on iPhone.

---

## Repo State

| Thing | Status |
|-------|--------|
| Vercel API deployment | ✅ Working — `https://eat-out-better-api.vercel.app` |
| API health check | ✅ Returns `{"status":"ok"}` |
| `apps/mobile/package.json` shared dep | ✅ Fixed to `file:../../packages/shared` |
| `apps/mobile/app.config.ts` | ✅ Hardcoded Vercel URL fallback, no `.env` needed |
| `apps/mobile` npm install | ⚠️ Should work after file: fix, but not confirmed yet |
| Expo Go on device | ❌ Incompatible with SDK 56 |
| EAS Build | ❌ Not set up yet |
| Node/npm on Sean's Mac | ❌ Not installed — do this first |

## Pending Actions (CLAUDE.md)
- [ ] Install Node.js on Mac (blocking everything else)
- [ ] Confirm Apple Developer Program paid membership
- [ ] Set up EAS Build (`eas build:configure` → `eas build --platform ios --profile preview`)
- [ ] Submit to TestFlight (`eas submit`)
- [ ] Build the actual API endpoint (`POST /api/analyze`) — core feature, nothing works without it
- [ ] Replace placeholder app icon
- [ ] Run `product-management:write-spec` for v1 MVP
- [ ] Run `product-management:competitive-brief`

## Key File Locations
- Repo root: `~/Documents/Claude/Projects/Eat Out Better/`
- Mobile app: `apps/mobile/`
- API: `apps/api/`
- Shared package: `packages/shared/`
- App config: `apps/mobile/app.config.ts`
- Vercel config: `vercel.json` (root)

## Tech Stack
- Mobile: Expo SDK 56, React Native 0.85.3, expo-router, NativeWind v4, Zustand
- API: Next.js 15, deployed on Vercel
- AI: Claude API (Haiku/Sonnet)
- Backend: Supabase (planned)
- Monorepo: npm workspaces (`apps/api` + `packages/*`; `apps/mobile` excluded)
