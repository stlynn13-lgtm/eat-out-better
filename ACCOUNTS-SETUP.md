# Accounts — what Sean has to do (about 40 minutes)

**Short version:** the sign-in screens are built and ship in build 12. What's left is creating accounts at
four outside services and handing over their keys. Claude can't do those: they're new accounts, passwords
and secret keys, which Claude is not allowed to create or type for you. Everything else is scripted, so
your part is four sign-ups plus one command.

**Written:** 2026-09-28, simplified 2026-09-29. **Cost:** $0/month (the domain `eatoutbetter.com` is already
yours). **Transient:** delete this file once accounts are live.

**Nothing breaks while this waits.** Until it's done, sign-in stays hidden and the app works exactly as it
does today. When it's done, the app side switches on with an over-the-air update — no new build.

---

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
