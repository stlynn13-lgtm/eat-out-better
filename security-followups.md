# Security follow-ups

**What this is:** everything still open from the 2026-10-03 security audit (against the "20 security holes in vibe-coded apps" checklist): open bugs, actions for Sean, and the order to do them. Delete items as they close. When this file is empty, delete it.
**Last updated:** 2026-10-03
**Read with:** `plan.md` (NOW, item 0) · `log.md` (2026-10-03 entry) · PRs #51, #52, #53.

> ⚠️ This file describes open weaknesses. It lives here only because the repo is **private** (since 2026-10-03). If the repo is ever made public again, delete this file first, and remember git history keeps it.

---

## 1. Where things stand

| Item | Status |
|---|---|
| **H1: saved scans must come from a real scan** (signed scans) | ✅ **Live.** PR #53 merged; migration applied and verified on the live database 2026-10-03 18:00 UTC. All 12 existing scans signed. Unsigned, forged and wrong-id inserts are refused; signed ones are stored. |
| **H2: API token check fails closed** | 🟡 **PR #52 open, green.** Blocked on A2 (confirm the token in Vercel). Merging before that turns every scan into an error. |
| **H3: patched Next.js / sharp, Dependabot** | 🟡 **PR #51 open, green.** Ready to merge. |
| **End-to-end check that live scans get signed** | 🔴 **Not proven.** No scan has reached the production API since the deploy (the logs show nothing after 01:44 UTC on 10-03). See B1. |
| **M3: repo was public** | ✅ Private since 2026-10-03. |
| Medium / low audit findings | ⬜ Not started. Sections 3 and 4. |

---

## 2. Open bugs

**B1. The sync check after the signed-scans deploy is unverified.** *(Highest priority: it confirms H1 works for real users.)*
A test scan after the 17:53 UTC deploy never reached the API: no usage row for 10-03 and no request logs. Either the scan didn't run against production, or it failed before the request left the phone.
- **Do:** on build 14 or 1.5.0 (1), run one scan, let results load, wait about 30 s, then ask Claude to "check sync". It should find a new `menu_sessions` row whose `scanSig` validates.
- **If results appeared but no row arrives:** check which API URL that build uses (`extra.apiUrl` in `apps/mobile/app.config.ts`, from the `API_URL` env var) and whether the phone is signed in to an account (anonymous counts).
- **If the scan errored:** note the exact message. It isn't the token gate, because #52 isn't merged.

**B2. `log.md` and `plan.md` were stale after #53 merged.** ✅ Fixed in the same PR that added this file.

**B3. The live database and the migration file reach the same state by different SQL.** *(No action; recorded so nobody is surprised.)*
`supabase/migrations/20261003000000_signed_scans.sql` drops and recreates the insert rule. On the live database it was applied with `alter policy` instead (the Supabase connector hangs on `drop policy`), and it's recorded as version `20261003180033`. Same policy name, same check, verified. A fresh database built from the file ends in the identical state.

---

## 3. Actions for Sean (no code; dashboards only)

Do these in order. Each has the exact clicks.

**A1. Make the repo private.** ✅ Done 2026-10-03.

**A2. Confirm the API token in Vercel, then merge #52 (5 min).**
- **expo.dev** → Eat Out Better → **Environment variables** → **production** → `APP_TOKEN` → reveal and copy. (Or `cd apps/mobile && eas env:list production --include-sensitive`.)
- **vercel.com** → team **sean-flynn-s-projects** → **eat-out-better-api** → **Settings** → **Environment Variables** → search `APP_SHARED_TOKEN`:
  - **If it exists:** ⋯ → **Edit**. The value must match exactly, with **Production** and **Preview** both ticked.
  - **If it's missing:** **Add New**, key `APP_SHARED_TOKEN`, paste the value, tick **Production** and **Preview**, **Save**.
- If you changed anything: **Deployments** → top Production deployment → ⋯ → **Redeploy**.
- Scan on your phone. If it works, merge **#52** (**Ready for review** → **Merge**), wait about 1 minute, and scan again.
- **Rollback if needed:** Vercel → Deployments → the previous deployment → ⋯ → **Promote**.

**A3. Merge #51 and turn on Dependabot (3 min).**
- Merge **#51**. Wait about 1 minute and scan on your phone.
- github.com → repo → **Settings** → **Code security** → enable **Dependabot alerts** and **Dependabot security updates**.

**A4. Supabase: limit anonymous sign-ups, and turn on the password check (2 min).**
- supabase.com/dashboard → **eat-out-better** → **Authentication** → **Rate Limits** → **Anonymous users**: `30` → `5` → **Save**.
- **Authentication** → **Providers** (or **Sign In / Providers**) → **Email**:
  - turn on **Prevent use of leaked passwords**;
  - set **Minimum password length** to `12`;
  - **Save**.
  The app never uses passwords, but anyone with the public key can still create a password account. *(Closes L2.)*

**A5. Shrink the spend exposure (5 min, no deploy).** *(Closes M1.)*
- Vercel → eat-out-better-api → **Settings** → **Environment Variables** → add:
  - `SPEND_GLOBAL_DAILY_USD` = `20` (about 1,300 scans a day; raise it when real traffic needs it);
  - `RATE_LIMIT_IP_DAILY_MAX` = `15` (5 a day × 3 for shared Wi-Fi).
  Tick Production and Preview, **Save**, then **Redeploy** the latest production deployment.
- **console.anthropic.com** → **Settings** → **Limits**: set the monthly spend limit to about **$300**. It's the only backstop that still works if the database is down.

**A6. Alerts on the free tiers (5 min).** *(Part of M4.)*
- Supabase → **Organization settings** → **Usage**/**Billing**: turn on email alerts for database size.
- Anthropic console → **Limits**/**Notifications**: email at 50% of the monthly limit.

---

## 4. Quick code fixes: do these in a new chat

Each item below is self-contained: paste the **Prompt** into a new Claude Code session on this repo. Merge **#52 first** (A2): Q2 to Q5 touch `apps/api/src/app/api/analyze/route.ts` and `next.config.mjs`, and starting after #52 avoids conflicts. **Q2 to Q5 can be one PR**, "API hardening".

### Q1. Make the feedback endpoint safe (M2, step 1): 15 min, plus a Sean paste
**Why:** `scripts/feedback-sheet/Code.gs` accepts any POST from anyone. `appendRow` turns text starting with `=` into a live spreadsheet formula, which can leak the sheet's other rows to an outside URL when the sheet is opened. It also echoes raw errors back to the caller.
**Prompt:**
> In `scripts/feedback-sheet/Code.gs`, harden `doPost`. Before `sheet.appendRow(row)`, pass every string cell through a sanitizer:
> - prefix with `'` any value starting with `=`, `+`, `-`, `@`, a tab or a carriage return;
> - truncate to 2,000 characters.
>
> Allowlist the fields:
> - `feedback_type`: the values `apps/mobile/components/FeedbackSheet.tsx` sends;
> - `screen`: the screen names it sends;
> - `rating`: an integer 1–5, else blank.
>
> Replace `json_({ ok: false, error: String(error) })` with a generic `{ ok: false }` and log the error with `console.error`.
>
> Update `scripts/feedback-sheet/README.md` if the redeploy steps change. Keep the deployment URL unchanged ("Manage deployments → edit → new version"), and spell out the paste-and-redeploy steps for Sean in the PR description.

**Then Sean:** paste the new `Code.gs` into the sheet's Apps Script editor as eatoutbetter@gmail.com and redeploy as a new version of the same deployment. In the existing sheet, search for cells starting with `=` and delete any you didn't write.

### Q2. Generic error messages from the API (L1): 10 min
**Prompt:**
> In `apps/api/src/app/api/analyze/route.ts`, the OCR and ranking failure paths (around lines 119–131 and 216–228) return the Anthropic SDK's raw `error.message` to the client as a `CLAUDE_ERROR`. Return a fixed user-facing message instead, e.g. "We couldn't analyze this menu. Please try again." The full error must still be logged with `console.error`. Don't change the status codes or error codes; the app keys off them in `apps/mobile/hooks/useAnalysis.ts`. Run `npm run type-check --workspace=apps/api`.

### Q3. Trim the health endpoint (L4): 5 min
**Prompt:**
> In `apps/api/src/app/api/health/route.ts`, stop returning `commitSha` (the full SHA), `branch` and `environment`. Keep `status`, `version`, `timestamp` and the 7-character `commit`. First grep the repo (`scripts/`, `.github/`, docs) for anything that reads the removed fields, and update it.

### Q4. Security header tidy-up (L6): 10 min
**Prompt:**
> In `apps/api/next.config.mjs`:
> - remove the deprecated `X-XSS-Protection` header;
> - add `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`;
> - add `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
>
> Run `npm run build --workspace=apps/api`, then `next start`. Load `/privacy`, `/terms` and `/support` and confirm they render with no CSP errors in the console. If inline styles break, add `style-src 'self' 'unsafe-inline'` rather than loosening `default-src`.

### Q5. Reject non-image uploads before calling Claude (L5): 20 min
**Prompt:**
> In `apps/api/src/app/api/analyze/route.ts` `validateRequest()`, decode the first ~16 bytes of each base64 image. Reject anything that isn't JPEG (`FF D8 FF`), PNG (`89 50 4E 47`) or HEIC/HEIF (`ftyp` at byte offset 4 with brand `heic`/`heix`/`mif1`) with a 400 `INVALID_IMAGE`, before any Claude call.
>
> Then check `apps/api/src/lib/claude/ocr.ts` line ~143, which hard-codes `media_type: "image/jpeg"`. Confirm what format the app actually uploads (`apps/mobile/lib/utils/image.ts`). If it's always JPEG after compression, allow only JPEG. Add a small test script next to `apps/api/scripts/dedupe-test.ts` covering accept and reject cases, and wire it up as `test:imagetype` in `apps/api/package.json`.

---

## 5. Bigger items: need a spec or a decision first

| Item | What | Why it isn't quick | Next step |
|---|---|---|---|
| **M4. Alerting on the API** | Add `@sentry/nextjs` to `apps/api`. Send an error event when the spend cap trips (`rateLimit.ts` "DAILY SPEND CAP REACHED"), when the limiter fails open, when spend recording fails, when the token is missing, and when scan signing fails (`apps/api/src/lib/supabase/scanSignature.ts`). Email alert rule on each. | New dependency and DSN; Sean creates the Sentry project and alert rules. | ~2 h PR plus Sean's Sentry setup. Small enough to skip a full spec. |
| **M2, step 2. Feedback through the API** | Replace the public Apps Script URL with `/api/feedback`, behind the token and rate limiter, writing to a Supabase table. | New endpoint, table and migration; needs an app update to change the URL. | Spec when feedback is next touched. Q1 covers the risk until then. |
| **H2.4 / L3. App Attest** | Replace the extractable shared token with Apple device attestation, and enforce the 5/day scan limit on the server. | Native module and a new build; already specced in `app-attest-migration.md`. | Keep on the roadmap. **Don't build a paid tier on the 5/day counter until this ships**: it resets on reinstall. |
| **Optional OTA** | Ship the `apps/mobile/lib/sync/sessions.ts` change (skip unsigned scans) to `ota/1.4.0` and `ota/1.3.0`. | Affects almost nobody: only scans saved before signing and never uploaded. | Only if B1 shows a stuck upload on build 13 or 14. |

---

## 6. Closed (don't re-chase)

- **Row-level security, IDOR, SQL injection, raw HTML, password storage, token storage, CORS, mass assignment:** audited clean 2026-10-03.
- **Saved-scan size limit:** stays at 256 KB on purpose. Real scans are about 480 bytes per dish, so a 10-photo menu can reach 200 KB. The 64 KB idea was dropped.
- **Supabase advisor notes:** "RLS enabled, no policy" on the two counter tables and "anonymous access" on `menu_sessions` are intentional. "Leaked password protection" closes with A4.
