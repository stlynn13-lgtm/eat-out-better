# Eat Out Better — Project Instructions

## What We're Building
"Eat Out Better" is a menu analysis tool that helps people with dietary restrictions make informed, confident meal choices at restaurants. Users input their health profile and a restaurant menu; the app returns ranked dish recommendations with explanations and substitution suggestions.

**v1 scope:** Single health condition (high cholesterol). iOS-first mobile app. Camera/photo menu input. No user accounts. Core output: per-dish risk rating, explanation of why (specific ingredients/cooking methods), and substitution suggestions.

## Tech Stack (Decided)
- **Mobile:** React Native (Expo SDK 56, RN 0.85.3) — iOS-first, `jsEngine: jsc`
- **Routing:** expo-router (file-based, lives in `apps/mobile/app/`)
- **Styling:** NativeWind v4 (Tailwind for React Native)
- **State:** Zustand
- **Backend/API:** Next.js API at `apps/api`, deployed on Vercel (`https://eat-out-better-api.vercel.app`) — receives menu images/text and calls the Claude API
- **AI Analysis:** Claude API — Haiku for cost efficiency, Sonnet for quality-critical calls
- **Future (V1, not yet implemented):** Supabase (Postgres + auth + storage) for accounts/history — deferred until after the no-account MVP is validated
- **V1 session storage:** AsyncStorage (no account required)
- **Monorepo:** npm workspaces — `apps/mobile` + `packages/shared`

## Mobile Dev Setup
```bash
# From repo root
npm install
cd apps/mobile
npx expo run:ios   # generates ios/, installs Pods, builds, runs on simulator
```
The `ios/` folder is gitignored — it's generated automatically by Expo prebuild. Do not commit it.

## Documentation Sources
- **Source of truth for code, config, and in-repo docs:** this repository (`CLAUDE.md`, `ARCHITECTURE.md`, `backlog.md`, `CHANGELOG.md`, `V0-launch-checklist.md`).
- **Google Drive** holds design assets, PRDs, and brainstorm docs:
  - Project folder: https://drive.google.com/drive/project/1w64UTHj8fF50nvfLySNTy9Rl-gnHxTlC?usp=sharing
  - Assets (logo, privacy policy): https://drive.google.com/drive/folders/1nbCptkmHQjzNGKgeUjYR92VVnA1XtbA9

**Tooling caveat:** the Google Drive / Figma MCP integrations are only available in **Claude Cowork (desktop)** sessions. In **Claude Code (CLI)** sessions there is *no* Drive or Figma MCP — assets must be downloaded locally (e.g. `~/Downloads/eob-assets/`) or shared by link, and Figma **Make** files are not readable via the Figma REST API (export the code or screenshots instead). Do not reference or write to Notion.

## Documentation System (Source of Truth) — keep these in sync
Three living docs, each with one job. Do not duplicate task lists across them.

| File | Job | When to update |
|------|-----|----------------|
| **CLAUDE.md** (this file) | Stable rules: what we're building, stack, principles, conventions. Changes rarely. | When an architectural decision, principle, or convention changes. |
| **plan.md** | Plain-language "what's next" — Now / Next / Later. Non-developer readable. | At the end of any session where priorities or status changed. |
| **log.md** | Plain-language "what changed and why." Newest on top. Replaces the old `session-NN-summary.md` files. | At the end of any session where anything changed. |

Supporting reference files (not living trackers): **Eat_Out_Better_GTM_Launch_Tracker.xlsx** (full detailed execution tracker — the detail behind plan.md), **ARCHITECTURE.md** (technical reference), **backlog.md** (idea pool — add ideas here before building), **Scoring_KB_Generation_Prompt.md** (scoring knowledge-base generator). Formal specs/PRDs/research live in Google Drive (below).

**The update rule (event-driven, not scheduled):** whenever a working session changes the product, the plan, or a decision, update `log.md` (what changed) and `plan.md` (what's next) before ending the session. This is why docs drift — they update on a clock instead of when work happens. A weekly drift-check is a safety net, not the mechanism.

**Deprecated (moved to `/archive`):** `session-01..05`, `CHANGELOG.md`, and `V0-launch-checklist.md` are superseded by `log.md` + `plan.md` + the GTM Launch Tracker. They live in `archive/` for history only — not maintained, not a source of truth, nothing reads them. Don't write new ones.

## Backlog
Feature backlog with RICE scores lives in this repo at `backlog.md` (root).
Reference this before suggesting new features. Add new ideas here before building them.

## Skills to Use (Already Installed)
- `product-management:product-brainstorming` — problem space exploration, assumption stress-testing
- `product-management:write-spec` — PRDs and feature specs (use before any major feature build)
- `product-management:competitive-brief` — deep competitive analysis (run before v1 launch)
- `product-management:roadmap-update` — when priorities shift
- `product-management:stakeholder-update` — when sharing progress externally
- `anthropic-skills:docx` / `pptx` — for any formal documents or presentations

## Product Principles
1. **Non-judgmental:** Inform, don't moralize. Users decide for themselves.
2. **Substitution-forward:** Always offer a way to make a bad choice less bad.
3. **Scalable architecture:** Health conditions are records, not code branches. Menu input is format-agnostic. Design for multi-condition, image input, and history from day one — even if v1 doesn't ship those.
4. **Confidence over perfection:** Users don't need the "best" option. They need a defensible option they feel good about.

## Builder Context
Sean is a Senior PM building his first app. He's learning as he goes on the engineering side. Always:
- Explain the *why* behind architectural and technical decisions, not just the what
- Challenge assumptions and push back before agreeing
- Flag when something will create future debt or limit scalability
- Remind Sean of any actions he needs to take that he hasn't confirmed completing
- Track pending tasks Sean has expressed intent to do (write-spec, competitive brief, etc.)

## Pending Actions
Do not keep a task list here — it goes stale (this section used to, which is why we moved it). **Live task state lives in `plan.md` (readable summary) and the GTM Launch Tracker (full detail).** Read those for what's open. As of 2026-06-22 the original items here — build the API, set up EAS, run write-spec, run competitive-brief — are all done; only the final app icon is unconfirmed.

### v1.1.0 release
- [x] App logo (1024×1024) → `apps/mobile/assets/icon.png`
- [x] Remove white square in camera view (`app/capture.tsx`)
- [x] Native pinch-to-zoom + zoom pills in camera (expo-camera `zoom` + gesture-handler)
- [x] 12-photo-per-scan limit + UI messaging (per Figma)
- [x] Rotating "fun facts" on processing screen (8s auto-cycle, cross-fade)
- [x] Privacy policy screen + entry point — DRAFT copy; needs final text + hosted URL
- [x] "How it works" slide-up
- [ ] Bug fixes — **no list provided yet**
- [x] Version bump → 1.1.0 / buildNumber 2 + CHANGELOG

## Context Window & Token Management
- If this conversation exceeds ~80 messages or feels slow, ask Claude to summarize the session into a markdown file and start a new conversation
- For quick factual lookups, Claude should use lighter reasoning where possible
- Keep Google Drive as the source of truth for decisions — don't re-explain context Claude already has stored there
- Paste Google Drive file URLs into chat rather than re-typing context

## What NOT to Do
- Don't start building before a spec exists for the feature
- Don't add a new health condition without updating the knowledge base architecture first
- Don't paint into corners: no hardcoded cholesterol logic, no single-use components
