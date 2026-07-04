# Eat Out Better — Log

## 2026-06-09

### What I did
Stripped `apps/api` down to API-only. Deleted all web UI code left over from the original Next.js web frontend. Fixed Vercel build config so monorepo deploys correctly.

**Deleted:**
- `src/app/page.tsx`, `layout.tsx`, `globals.css` — web root page and shell
- `src/app/capture/`, `processing/`, `results/` — the three web UI pages
- `src/components/` — 7 web UI components (CameraViewfinder, DishCard, etc.)
- `src/hooks/` — useAnalysis, useCamera (web versions; mobile has its own copies)
- `src/store/` — Zustand store (web version; mobile has its own copy)
- `src/lib/utils/cn.ts` — Tailwind className helper with no callers in API/lib code
- `tailwind.config.ts`, `postcss.config.mjs` — Tailwind build config

**Modified:**
- `package.json` — removed `zustand`, `tailwindcss`, `autoprefixer`, `postcss`, `@types/react-dom`
- `next.config.mjs` — removed dead `/capture` camera Permissions-Policy header
- `vercel.json` (repo root) — fixed build command (`npm run build --workspace=apps/api`) and output directory (`apps/api/.next`) so Vercel correctly builds the monorepo

### Decisions made
- Kept `react` and `react-dom` as dependencies — Next.js requires them even for API-only apps
- `src/lib/utils/format.ts` and `image.ts` were kept — they have no web UI imports and may be used by the Claude pipeline
- Vercel config fixed in `vercel.json` rather than Vercel UI setting, so it's version-controlled and reproducible

### Open questions
- `ANTHROPIC_API_KEY` still needs to be added to Vercel environment variables before the deployed API will work
- Mobile `API_URL` env var needs to point at the live Vercel URL once deployed (currently defaults to `localhost:3000`)
- EAS build for TestFlight not yet set up

---

## 2026-06-28

### What I did
Instrumented all 6 P0 PostHog analytics events (menu scan funnel) + P1 session linking.

**Added:**
- `apps/mobile/lib/analytics.ts` — typed event capture helpers, module-level scan session ID tracking
- `posthog-react-native` SDK installed, `PostHogProvider` wrapped in `app/_layout.tsx`

**Instrumented:**
- `menu_scan_started` → `capture.tsx` on screen mount; includes `entry_point` (cold_start vs loop_back) and `scan_session_id`
- `menu_photo_captured` → `capture.tsx` on camera capture and gallery pick; fires once per photo with running `photo_count`
- `menu_analyze_clicked` → `capture.tsx` `handleAnalyze`; passes `scan_session_id` and `startedAt` into `useAnalysis`
- `menu_analysis_completed` → `useAnalysis.ts` success path; includes `dish_count` and `analysis_duration_seconds`
- `menu_analysis_failed` → `useAnalysis.ts` all failure paths (API error, OCR empty, network error); includes `error_type` from actual error codes
- `new_scan_initiated` → `results.tsx` "Analyze New Menu" button; carries `previous_scan_session_id` and `new_scan_session_id`, navigates with `entry=loop_back&sid=<newId>` so capture picks up the right session

**Build bumped:** 3 → 4

### Decisions made
- Session ID generated in capture's `useEffect`, passed via nav params to results→capture loop so both `new_scan_initiated` and the next `menu_scan_started` share the same new session ID
- `error_type` taxonomy derived from actual code (not guessed): `NETWORK_ERROR`, `RATE_LIMIT`, `CLAUDE_ERROR`, `OCR_EMPTY`, `UNKNOWN`
- PostHog host: `https://us.i.posthog.com`

### Open questions
- QA: verify each event fires exactly once (esp. photo capture and failure paths)
- PostHog API key is hardcoded in `lib/analytics.ts` — should move to env var before public release

---

## 2026-06-28 (follow-up)

### What I did
Fixed crash on simulator launch: `crypto.getRandomValues() not supported` from the `uuid` package.

**Root cause:** Hermes (the JS engine now used after Sean's Claude removed `jsEngine: "jsc"`) does not support `crypto.getRandomValues()`, which `uuid` v4 requires.

**Fix:** Replaced `uuid` with a `Math.random()`-based `generateId()` function in `lib/analytics.ts`. Removed `uuid` imports from `capture.tsx` and `results.tsx`.

### Decisions made
`Math.random()` is sufficient for analytics session IDs — no cryptographic strength required. Fix applies to both simulator and production (EAS) builds since Hermes is the engine in both contexts.

### Open questions
- QA confirmed — all 6 events firing in PostHog live events

---

## 2026-06-29

### What I did
Added PostHog environment tagging so simulator, TestFlight, and App Store builds can be distinguished in analytics.

**Files changed:**
- `eas.json` — added `APP_ENV` env var to each build profile (`development`, `preview`, `production`)
- `app.config.ts` — exposed `environment` via extras, read from `APP_ENV` (falls back to `"development"` on simulator)
- `lib/analytics.ts` — added `APP_ENVIRONMENT` constant and `registerSuperProperties()` which registers `environment` as a PostHog super property (auto-attached to every event)
- `app/_layout.tsx` — added `AnalyticsBootstrap` component that calls `registerSuperProperties` once on app start

### Decisions made
- Used PostHog super properties (`ph.register()`) so environment is attached to every event automatically — no need to touch individual track calls
- Simulator defaults to `"development"` since `APP_ENV` is only set by EAS builds

### Open questions
- None

---

## 2026-07-01

### What I did
Added feedback system across all screens (Concepts 02 + 04 from Figma Make).

**New file: `components/FeedbackSheet.tsx`**
- Reusable bottom sheet with emoji rating (results only) + free text input
- POSTs to Google Sheets via Apps Script endpoint
- Fields: posthog_distinct_id, screen, feedback, rating
- Best-effort submit (network failure doesn't block user)
- Shows confirmation on success, auto-closes after 1.5s

**Footer "Feedback · Privacy Policy" added to:**
- `index.tsx`, `capture.tsx`, `processing.tsx`, `results.tsx`

**Results screen (Concept 02):**
- Emoji rating (😕😐🙂😊) shown in the sheet when `showRating` prop is true
- Rating fires PostHog event immediately on tap (no submit needed)

**New PostHog events:**
- `feedback_sheet_opened` — `{ screen }`
- `feedback_submitted` — `{ screen, has_text, character_count, posthog_distinct_id }`
- `feedback_rating_submitted` — `{ screen, rating }`

### Decisions made
- Google Sheets via Apps Script — zero backend, free, data in one place
- PostHog `distinct_id` included in sheet row for cross-referencing funnel data
- `showRating` prop controls Concept 02 — only results screen passes it
- Processing screen gets footer but no rating (wrong context for satisfaction feedback)

### Open questions
- Crash reporting still to do

### What I did
Fixed double-navigation bug causing processing screen to not appear. Added `menu_processing_started` event.

**Bug fix — `results.tsx`:**
`reset()` was called before `router.push("/capture")`. This cleared the store (results → null, status → idle) while the results screen was still mounted, triggering its guard (`if (!results && status !== "complete") → router.replace("/capture")`). Capture mounted twice, processing screen never appeared. Fix: navigate first, then reset.

**New event — `menu_processing_started`:**
Fires when processing screen mounts. Properties: `scan_session_id`, `page_count`. Closes the gap in the funnel between `menu_analyze_clicked` and `menu_analysis_completed`.

### Decisions made
- `menu_processing_started` fires in a `[]` useEffect on processing screen mount — same pattern as `menu_scan_started`
- No build bump — JS-only changes, no native rebuild needed

**Follow-up fix:** First fix (navigate before reset) was insufficient — results screen stays mounted in the stack with `router.push`, so its guard still fires. Real fix: `router.replace` removes results from the stack entirely before reset() clears the store.

---

## 2026-07-02

### What I did
Fixed iOS simulator build — was broken due to Xcode 26 dropping x86_64 simulator support combined with MLKit beta pods lacking arm64 simulator slices.

**Root cause:** `@react-native-ml-kit/text-recognition` depends on MLKit pods (MLImage, MLKitCommon, MLKitVision, etc.) at versions that ship arm64 slices built for iOS device only — no arm64 simulator slice. Xcode 26 requires arm64 for simulator on Apple Silicon and no longer runs x86_64 via Rosetta.

**Fix — `apps/mobile/ios/Podfile` post_install block:**
- Removes `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` from MLKit xcconfigs so the simulator build targets arm64
- Byte-patches the arm64 slice of all 9 MLKit static archives directly in the fat binary — changes `LC_BUILD_VERSION` platform from `2` (iOS) to `7` (iOSSimulator) so the linker accepts them
- Guarded with `unless ENV['EAS_BUILD']` so EAS device builds are unaffected

**Frameworks patched:** MLImage, MLKitCommon, MLKitVision, MLKitTextRecognition, MLKitTextRecognitionChinese, MLKitTextRecognitionDevanagari, MLKitTextRecognitionJapanese, MLKitTextRecognitionKorean, MLKitTextRecognitionCommon

### Decisions made
- Direct binary patch (search/replace 12-byte LC_BUILD_VERSION pattern) rather than extract/repack — avoids ar archive object file name collision issues that drop symbols
- Patch runs on every `pod install` locally; EAS builds get clean originals and build for device normally
- If `ios/` is deleted and regenerated (`rm -rf ios/ && npx expo run:ios`), run `pod install` once after to re-apply the patch

### Open questions
- Google Sheets integration returning 403 — Apps Script deployment needs reauthorization or new deployment with "Execute as: Me / Anyone" access. Pick up next session.
- Crash reporting still to do

---

## 2026-07-04

### What I did
Fixed the failing Sentry integration (crash reporting) — the last blocker for build 5. iOS simulator build now compiles, app runs, Sentry native SDK initializes with session replay recording.

**Root causes (two separate problems):**
1. **Sentry pod hacks were breaking the build.** A previous late-night session (July 4, ~00:45–02:30) had added a Podfile post_install block that injected `-D SENTRY_NO_UI_FRAMEWORK` into the Sentry pod's Swift flags and hand-patched three Sentry pod source files (`SentryProfilingConditionals.h`, `SentryUIEventTracker.m`, `SentryViewHierarchyProviderHelper.m`). Those hacks were written against an older sentry-cocoa (8.41.0 was tried) that genuinely couldn't build under Xcode 26 — but the project ended up on sentry-cocoa 9.19.1, which already ships the Xcode 26 fixes. The leftover hacks created an ObjC/Swift interface mismatch that failed compilation. **Fix: removed all Sentry hacks from the Podfile and restored pristine pod sources. Pristine Sentry 9.19.1 compiles clean under Xcode 26.5 with zero modifications.**
2. **MLKit simulator patch had been rewritten destructively.** The Podfile's MLKit patch used `lipo -thin` + `ar -x` extract/repack — exactly the approach the 2026-07-02 entry warned drops symbols on duplicate archive member names. It also re-ran destructively on every `pod install`, progressively corrupting the archives (`MLKITx_absl::*` symbols vanished from MLKitCommon → linker failure). **Fix: reinstalled pristine MLKit pods from the CocoaPods cache and rewrote the patch as an in-place, idempotent byte-patch of `LC_BUILD_VERSION` load commands (platform 2 → 7), matching the approach documented on 2026-07-02.**
3. **Sentry Expo config plugin was silently ignored.** The wizard added `@sentry/react-native/expo` to `app.json`'s plugins, but `app.config.ts` defines its own `plugins` array which overrides app.json's entirely. **Fix: moved the plugin (org/project config) into `app.config.ts`, removed the dead entry from app.json.** This matters for EAS builds: prebuild there now wires up source-map/dSYM upload.

**Verified (all pass):**
- `xcodebuild` Debug simulator build: **BUILD SUCCEEDED**
- `npx expo export --platform ios`: Metro + `getSentryExpoConfig` bundles clean (2,313 modules)
- App installed + launched on iPhone 16 Pro simulator: home screen renders, no crash
- Sentry native SDK initialized: `SentryCrash` handler installed, `io.sentry` cache has active session, breadcrumbs, and replay directory

**Also:** bumped iOS buildNumber 4 → 5 for the next TestFlight build.

### Decisions made
- No Sentry pod workarounds of any kind — sentry-cocoa 9.19.1 needs none on Xcode 26.5. Never patch Pods sources; if a pod won't build, check whether a newer version fixes it first.
- MLKit byte-patch raises on failure instead of silently continuing, and prints a `retagged N load commands` line per framework so corruption is visible at pod install time.
- `MLKitTextRecognitionCommon` needs no retagging — its binary predates `LC_BUILD_VERSION` platform tagging and links as-is.

### Open questions / Sean's actions
- ~~Add `SENTRY_AUTH_TOKEN` to EAS environment variables~~ **Done** — added via the expo.dev dashboard as a Secret across production/preview/development. EAS builds will now upload source maps/dSYMs so Sentry stack traces are readable.
- Google Sheets 403 still outstanding (from 2026-07-02).

### Follow-up (same day)
- **`npx expo prebuild --clean` is now safe.** Moved the MLKit simulator patch into an Expo config plugin: `plugins/with-mlkit-simulator-patch.js` inserts a hook into the generated Podfile that calls `plugins/mlkit_simulator_patch.rb`. Verified: prebuild regenerates the Podfile with the hook intact, `pod install` retags idempotently (found CocoaPods runs post_install twice per install — harmless now, but it explains how the old destructive patch corrupted archives so fast), full rebuild succeeds, app runs on simulator.
- Prebuild also applied the Sentry Expo plugin's native config (sentry-xcode build phases in the Xcode project), resolving Metro's "Sentry native configuration is missing" warning.
- Deleted `apps/mobile/GoogleService-Info.plist` (unreferenced Firebase leftover).
