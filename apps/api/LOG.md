# apps/api — Log

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
