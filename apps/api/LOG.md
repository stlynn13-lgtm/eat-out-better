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

## 2026-06-28 (follow-up 2)

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
