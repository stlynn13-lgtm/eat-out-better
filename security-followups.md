# Security follow-ups

**What this is:** everything still open from the 2026-10-03 security audit (against the "20 security holes in vibe-coded apps" checklist): open bugs, actions for Sean, and the order to do them. Delete items as they close. When this file is empty, delete it.
**Last updated:** 2026-10-04
**Read with:** `plan.md` (NOW) · `log.md` (2026-10-03 and 2026-10-04 entries) · PRs #51, #52, #53, #56.

> ⚠️ This file describes open weaknesses. It lives here only because the repo is **private** (since 2026-10-03). If the repo is ever made public again, delete this file first, and remember git history keeps it.

---

## 1. Where things stand

| Item | Status |
|---|---|
| **H1: saved scans must come from a real scan** (signed scans) | ✅ **Live.** PR #53 merged; migration applied and verified on the live database 2026-10-03 18:00 UTC. All 12 existing scans signed. Unsigned, forged and wrong-id inserts are refused; signed ones are stored. |
| **H2: API token check fails closed** | 🟡 **PR #52 open, green.** Blocked on A2 (confirm the token in Vercel). Merging before that turns every scan into an error. |
| **H3: patched Next.js / sharp, Dependabot** | 🟡 **PR #51 open, green.** Ready to merge. |
| **End-to-end check that live scans get signed** | 🔴 **Still not proven** (re-checked 2026-10-04 23:40 UTC). No scan stored or counted since **10-01**. See B1. |
| **M3: repo was public** | ✅ Private since 2026-10-03. |
| **Q1–Q5: quick code fixes** (M2 step 1, L1, L4, L5, L6) | 🟡 **PR #56 open.** All five done and verified locally; merges cleanly with #51 and #52, so it doesn't need to wait. Q1 also needs Sean's paste (§4). |
| **A2–A6: dashboard settings** | ⬜ **Open, Sean.** A4 confirmed still open by the Supabase advisor 2026-10-04. A2/A5 couldn't be checked: the Vercel connector has no access to the `sean-flynn-s-projects` team. |
| M4, M2 step 2, App Attest | ⬜ Need a spec or setup first. Section 5. |

---

## 2. Open bugs

**B1. The sync check after the signed-scans deploy is unverified.** *(Highest priority: it confirms H1 works for real users.)*
A test scan after the 17:53 UTC deploy never reached the API: no usage row for 10-03 and no request logs. Either the scan didn't run against production, or it failed before the request left the phone.
- **Do:** on build 14 or 1.5.0 (1), run one scan, let results load, wait about 30 s, then ask Claude to "check sync". It should find a new `menu_sessions` row whose `scanSig` validates.
- **If results appeared but no row arrives:** check which API URL that build uses (`extra.apiUrl` in `apps/mobile/app.config.ts`, from the `API_URL` env var) and whether the phone is signed in to an account (anonymous counts).
- **If the scan errored:** note the exact message. It isn't the token gate, because #52 isn't merged.
- **Re-checked 2026-10-04 23:40 UTC (Claude, via the Supabase connector):** `menu_sessions` still has the same 12 rows, newest **2026-10-01 17:45 UTC**; none since the deploy. `api_usage_daily` has **one row, 2026-10-01 (4 scans, $0.12)**, nothing for 10-02 to 10-04. So either nobody has scanned against production for three days, or scans are reaching it without being counted, which would mean the spend cap and per-IP limit aren't counting either. **The phone scan in "Do" settles both.** If a scan succeeds and there is still no `api_usage_daily` row for that day, check Vercel → eat-out-better-api → Settings → Environment Variables for `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (without them the limiter logs "only the in-memory burst limit is active").

**B2. `log.md` and `plan.md` were stale after #53 merged.** ✅ Fixed in the same PR that added this file.

**B3. The live database and the migration file reach the same state by different SQL.** *(No action; recorded so nobody is surprised.)*
`supabase/migrations/20261003000000_signed_scans.sql` drops and recreates the insert rule. On the live database it was applied with `alter policy` instead (the Supabase connector hangs on `drop policy`), and it's recorded as version `20261003180033`. Same policy name, same check, verified. A fresh database built from the file ends in the identical state.

---

## 3. Actions for Sean (no code; dashboards only)

Do these in order. Each has the exact clicks.

**A1. Make the repo private.** ✅ Done 2026-10-03.

**A1.5 (new, 2 min, after #56 merges): paste the hardened feedback script.** ⬜ See Q1 below.

**A2. Confirm the API token in Vercel, then merge #52 (5 min).** ⬜ *Open. Claude can't check this: the Vercel connector is refused access to the team (403).*
- **expo.dev** → Eat Out Better → **Environment variables** → **production** → `APP_TOKEN` → reveal and copy. (Or `cd apps/mobile && eas env:list production --include-sensitive`.)
- **vercel.com** → team **sean-flynn-s-projects** → **eat-out-better-api** → **Settings** → **Environment Variables** → search `APP_SHARED_TOKEN`:
  - **If it exists:** ⋯ → **Edit**. The value must match exactly, with **Production** and **Preview** both ticked.
  - **If it's missing:** **Add New**, key `APP_SHARED_TOKEN`, paste the value, tick **Production** and **Preview**, **Save**.
- If you changed anything: **Deployments** → top Production deployment → ⋯ → **Redeploy**.
- Scan on your phone. If it works, merge **#52** (**Ready for review** → **Merge**), wait about 1 minute, and scan again.
- **Rollback if needed:** Vercel → Deployments → the previous deployment → ⋯ → **Promote**.

**A3. Merge #51 and turn on Dependabot (3 min).** ⬜ *Open. #51 still open on 2026-10-04.*
- Merge **#51**. Wait about 1 minute and scan on your phone.
- github.com → repo → **Settings** → **Code security** → enable **Dependabot alerts** and **Dependabot security updates**.

**A4. Supabase: limit anonymous sign-ups, and turn on the password check (2 min).** ⬜ *Still open: the Supabase security advisor reported "Leaked password protection disabled" on 2026-10-04.*
- supabase.com/dashboard → **eat-out-better** → **Authentication** → **Rate Limits** → **Anonymous users**: `30` → `5` → **Save**.
- **Authentication** → **Providers** (or **Sign In / Providers**) → **Email**:
  - turn on **Prevent use of leaked passwords**;
  - set **Minimum password length** to `12`;
  - **Save**.
  The app never uses passwords, but anyone with the public key can still create a password account. *(Closes L2.)*

**A5. Shrink the spend exposure (5 min, no deploy).** *(Closes M1.)* ⬜ *Open.*
- Vercel → eat-out-better-api → **Settings** → **Environment Variables** → add:
  - `SPEND_GLOBAL_DAILY_USD` = `20` (about 1,300 scans a day; raise it when real traffic needs it);
  - `RATE_LIMIT_IP_DAILY_MAX` = `15` (5 a day × 3 for shared Wi-Fi).
  Tick Production and Preview, **Save**, then **Redeploy** the latest production deployment.
- **console.anthropic.com** → **Settings** → **Limits**: set the monthly spend limit to about **$300**. It's the only backstop that still works if the database is down.

**A6. Alerts on the free tiers (5 min).** *(Part of M4.)* ⬜ *Open.*
- Supabase → **Organization settings** → **Usage**/**Billing**: turn on email alerts for database size.
- Anthropic console → **Limits**/**Notifications**: email at 50% of the monthly limit.

---

## 4. Quick code fixes: done in PR #56 (2026-10-04)

All five are in one PR, "API and feedback hardening". It test-merges cleanly against #51 and #52, so **merge order no longer matters**. Delete this section once #56 is merged and Q1's paste is done.

| Item | Status | What was done |
|---|---|---|
| **Q1. Feedback endpoint** (M2 step 1) | 🟡 Code in #56. **Needs Sean's paste** (below). | `scripts/feedback-sheet/Code.gs`: formula-injection guard on every cell, 2,000-char cap, allowlists for `feedback_type`/`screen`/`environment` (else `other`), `rating` 1–5 and `dish_count` integers only, generic `{ ok: false }` with the error logged. Tested with a stubbed sheet. README updated. |
| **Q2. Generic API errors** (L1) | 🟡 In #56. Closes on merge. | Both `CLAUDE_ERROR` paths return "We couldn't analyze this menu. Please try again." Codes and statuses unchanged; full error still logged. |
| **Q3. Health endpoint** (L4) | 🟡 In #56. Closes on merge. | Returns only `status`, `version`, `timestamp`, `commit` (7 chars). Nothing in the repo read the dropped fields. `ARCHITECTURE.md` updated. |
| **Q4. Security headers** (L6) | 🟡 In #56. Closes on merge. | `X-XSS-Protection` removed; `Permissions-Policy` added; CSP added. **Changed from the plan:** the prescribed `default-src 'self'` blanks `/privacy`, `/terms` and `/support` (tested: Next's inline payload is blocked mid-hydration). These pages need no JS, so the CSP uses `script-src 'none'`, and all three render fully. The console shows harmless "Refused to load the script" lines. That matters because the privacy URL is in App Store Connect. |
| **Q5. Image type check** (L5) | 🟡 In #56. Closes on merge. | Uploads that don't start `FF D8 FF` get 400 `INVALID_IMAGE` before any Claude call. JPEG only: every shipped build (`ota/1.1.4` through `main`) re-encodes to JPEG, and `ocr.ts` sends `image/jpeg`. New `npm run test:imagetype --workspace=apps/api` (12 cases). |

**Then Sean (Q1, 5 min, after #56 merges):**
1. Open the **Feedback Form** sheet signed in as **eatoutbetter@gmail.com** → **Extensions → Apps Script**.
2. Replace all of `Code.gs` with the repo's `scripts/feedback-sheet/Code.gs` → **Save**.
3. **Deploy → Manage deployments** → pencil on the **existing** deployment → **Version: New version** → **Deploy**. *Not* "New deployment": that changes the URL and the app would keep posting to the old one.
4. In the sheet: **Edit → Find and replace**, find `=`, tick **Also search within formulas**, and delete any row you didn't write.
5. Send one feedback from the app and check a row lands.

**After #56 merges (Vercel redeploys automatically):** open https://eat-out-better-api.vercel.app/privacy and confirm it shows the policy, then run one scan on the phone.

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
