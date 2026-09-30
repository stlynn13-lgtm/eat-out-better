# Accounts — status and what's left

## Done by Claude, 2026-09-29 (verified)

- **Supabase project created:** `eat-out-better`, ref `dindkgcknjexggqqgoll`, East US (Ohio), free tier, in
  *Eat Out Better Org*. URL `https://dindkgcknjexggqqgoll.supabase.co`.
- **Both database migrations applied** (saved scans; spend-cap counters). The live database was checked
  against the repo: row-level security on all three tables, three own-rows policies, no UPDATE grant, the
  keep-newest-500 trigger, and spend functions callable by the API only. The security advisor's only note
  is "RLS enabled, no policies" on the two spend-cap tables, which is intentional (API-only).
- **Auth settings:** anonymous sign-ins ON, login linking ON, confirm email ON, site URL
  `https://eat-out-better-api.vercel.app`, redirect URL `eat-out-better://auth/callback`,
  **Sign in with Apple ON** (client ID `com.eatoutbetter.app`, native only, no secret).
- **EAS:** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` stored (production + preview, public values).
- **Build 13** (v1.3.0) finished. Accounts are hidden in it; they'll be switched on with an update.

## Email codes — LIVE, 2026-09-30 (tested end to end)

Sean set up Resend (domain verified; Claude added the four DNS records at Namecheap) and saved the SMTP in
Supabase. Claude then set the branded code email on all three templates (magic link, confirm signup, change
email), and changed the **email code length from Supabase's default 8 to 6** to match the app's six boxes.
A real test: the code email arrived in Gmail's inbox from `no-reply@eatoutbetter.com`, the 6-digit code signed
in and created a confirmed account, and the test account was deleted. (A first test showed an 8-digit code,
which is why the length setting matters: if it ever reverts, the app can't accept codes.)

## What's left, and why Claude can't do it

Claude can't create accounts at outside services or type secret keys, even when asked. Two steps remain:

1. **Google:** create the OAuth client in Google Cloud (steps below), paste the Client ID and secret into
   Supabase → Sign In / Providers → Google. Until then, leave Google off in the app.
2. **Vercel:** add `SUPABASE_URL` = `https://dindkgcknjexggqqgoll.supabase.co` and `SUPABASE_SECRET_KEY` (Supabase →
   Project Settings → API Keys → secret key), plus the three `APPLE_*` values from the Apple steps below, then
   Redeploy. This turns on account deletion (an App Store requirement) and the $200/day spend cap.

Email and Apple sign-in are ready now. Sign-in stays off in the app until Vercel is done: turning it on earlier
would show a Delete account that can't delete.

The detailed steps follow (steps 1 and 5 are now done).

## 1. Supabase — create the project (3 min)

supabase.com → **New project**
- Name `eat-out-better`
- **Region: East US (Ohio)** — pick carefully, it can never change
- **Generate a password** and save it in your password manager. The setup script asks for it once.

When it's ready, keep this tab open. You'll need two values from **Project Settings → API Keys**: the
**Project URL** (the 20 letters in it are the "project ref") and the **publishable key** (`sb_publishable_…`).

## 2. Resend — sends the 6-digit code emails (10 min + DNS wait)

1. resend.com → sign up (free).
2. **Domains → Add domain** → `eatoutbetter.com`. Resend shows 3–4 DNS records.
3. Namecheap → Domain List → `eatoutbetter.com` → **Advanced DNS** → add each record exactly as Resend shows
   it. (These don't touch your existing email forwarding.) Back in Resend → **Verify** — up to an hour.
4. **API Keys → Create API key** (Sending access). Keep it for the script.

## 3. Apple Developer (10 min)

developer.apple.com → Certificates, Identifiers & Profiles:
1. **Identifiers → `com.eatoutbetter.app`** → tick **Sign in with Apple** → Save.
2. **Services → Sign in with Apple for Email Communication → Configure** → add domain `eatoutbetter.com` and
   address `no-reply@eatoutbetter.com`. Without this, anyone who picks "Hide My Email" never gets their code.
3. **Keys → +** → name "Sign in with Apple" → tick **Sign in with Apple** → Configure → `com.eatoutbetter.app`
   → Register → **Download the .p8** (one download only). Note the **Key ID**, and your **Team ID** (top right).
   These let account deletion disconnect Apple, which Apple requires.

## 4. Google Cloud (10 min)

console.cloud.google.com → new project **Eat Out Better**
1. **Google Auth Platform → Branding:** app name `Eat Out Better`, your support email, privacy link
   `https://eat-out-better-api.vercel.app/privacy`, terms link `https://eat-out-better-api.vercel.app/terms`,
   authorized domains `supabase.co` and `vercel.app`.
2. **Audience:** External → **Publish app**.
3. **Clients → Create client → Web application.** Authorized redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`. Keep the **Client ID** and **Client secret**.

## 5. Run the setup script (5 min)

In Terminal, from the repo:

```bash
cd ~/Developer/eat-out-better && ./scripts/setup-supabase.sh
```

It asks for six values: project ref, database password, publishable key, Resend key, Google client ID and
Google client secret. Secret ones are hidden as you type. It then creates the database tables, turns on
anonymous accounts and login linking, sets up the code emails through Resend, switches on Apple and Google,
and stores the app's public values in EAS. Safe to run again if anything goes wrong.

## 6. Vercel (3 min)

vercel.com → `eat-out-better-api` → Settings → Environment Variables (Production):

| Name | Value |
|---|---|
| `SUPABASE_URL` | the Project URL from step 1 |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → **secret** key (`sb_secret_…`) |
| `APPLE_TEAM_ID` | from step 3.3 |
| `APPLE_SIGN_IN_KEY_ID` | from step 3.3 |
| `APPLE_SIGN_IN_PRIVATE_KEY` | the whole .p8 file, including the BEGIN/END lines |

Then **Deployments → latest → ⋯ → Redeploy**. This also switches on the $200/day spend cap.

## 7. Tell Claude

Claude publishes the over-the-air update that turns sign-in on for build 12, then you check it on your phone:
scan a menu → "Keep this scan safe" appears → Create free account → email code arrives → "You're all set" →
delete and reinstall the app → still signed in, scans still there.

**Same day it goes live:** the accounts privacy policy (`privacy-policy-accounts-release.md`) gets deployed and
the App Store Connect privacy answers get updated — both drafted, Claude can walk you through them.

If anything misbehaves for testers: an update with `ACCOUNTS_ENABLED=false` hides every account screen, no
build needed.
