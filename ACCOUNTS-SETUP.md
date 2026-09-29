# Accounts — setup checklist (Sean)

**What this is:** every click that has to happen outside the code before sign-in works. The code is on
branch `feat/accounts-anonymous-first` (see its PR). **Transient:** once accounts are live, fold what's still
true into `plan.md` and delete this file.

**Written:** 2026-09-28. **Cost:** $0/month. The domain (`eatoutbetter.com`, Namecheap, registered 25 June
2026) is already owned, so there is no new spend anywhere on this list.

**Until you do this, nothing changes for testers.** A build without the Supabase settings behaves exactly like
build 11: no account screens, no network calls, history on the phone. That's deliberate — the code can merge
and even ship before the setup is finished.

---

## What was decided (2026-09-28)

- **Everyone gets a silent anonymous account on first launch.** No screen, no prompt. Saved scans are tied to it
  from the start and backed up.
- **Signing in attaches a login to that same account** — Sign in with Apple, Google, or a 6-digit code by email.
  Same account id, so nothing moves and nothing is lost.
- **Signing in is optional, forever.** Scanning never asks for it (App Store 5.1.1(v)).
- **Code, not a link, for email.** You type 6 digits; iOS offers the code from Mail above the keyboard. A link
  makes you leave the app, and corporate mail scanners "click" links first and burn them.
- **People stay signed in until they tap Sign out** (or delete their account).

---

## 1. Supabase — create the project (≈15 min)

1. supabase.com → your existing account → **New project**.
   - Name: `eat-out-better`
   - **Region: pick once, it can never change.** Recommend **East US (Ohio)** or **West US (N. California)** —
     either is fine for Denver.
   - Database password: generate it and save it in your password manager. You won't need it day to day.
2. **SQL Editor → New query** → paste all of `supabase/migrations/20260928000000_menu_sessions.sql` → **Run**.
   That creates the one table (saved scans) and its security rules.
3. **Authentication → Sign In / Providers**
   - **Allow anonymous sign-ins: ON**
   - **Allow manual linking: ON** — linking a login to the anonymous account fails without this, and the error
     looks like a code bug.
   - **Email: ON. Confirm email: ON. Never turn Confirm email off** — with it off, anyone can claim any address.
   - **Apple: ON.** Client IDs: `com.eatoutbetter.app`. Leave Secret Key / Services ID **blank** (iOS-only, so no
     key to rotate every six months).
   - **Google: ON.** Client ID + Client Secret from step 4 below. Leave "Skip nonce check" **OFF**.
4. **Authentication → URL Configuration**
   - Site URL: `https://eat-out-better-api.vercel.app`
   - Redirect URLs → **Add** `eat-out-better://auth/callback`
5. **Authentication → Emails → SMTP Settings** → enable custom SMTP (step 2 gives you the values):
   - Host `smtp.resend.com` · Port `465` · Username `resend` · Password = your Resend API key
   - Sender email `no-reply@eatoutbetter.com` · Sender name `Eat Out Better`
6. **Authentication → Emails → Templates.** Three templates must show the code. Replace the body of **Magic
   Link**, **Confirm signup** and **Change Email Address** with:

   > **Subject:** Your Eat Out Better code
   >
   > Your sign-in code is **{{ .Token }}**
   >
   > Type it into the app to finish signing in. It expires in an hour.
   > If you didn't ask for this, you can ignore this email.

   (Change Email Address is the one used when someone adds an email to their anonymous account — it's the
   template most people forget.)
7. **Authentication → Rate Limits:** raise "Emails sent per hour" to `100`. Leave anonymous sign-ins at `30`
   per hour per IP.
8. **Project Settings → API Keys** — copy three values for steps 5 and 6: the **Project URL**, the
   **publishable** key (`sb_publishable_…`) and the **secret** key (`sb_secret_…`). The secret key never goes in
   the app.

## 2. Resend + Namecheap — email that actually arrives (≈15 min + DNS wait)

Supabase's built-in email refuses every address that isn't on your Supabase team, so without this the code
never reaches a tester.

1. resend.com → sign up (free: 3,000 emails/month).
2. **Domains → Add domain** → `eatoutbetter.com`. Resend shows 3–4 DNS records (DKIM, plus SPF and MX on a
   `send.` subdomain).
3. Namecheap → Domain List → `eatoutbetter.com` → **Advanced DNS** → add each record exactly as Resend shows it.
   These don't touch your existing email forwarding. Back in Resend, **Verify** (can take up to an hour).
4. **API Keys → Create** (sending access) → paste it into Supabase step 1.5.

## 3. Apple Developer (≈10 min)

1. **Certificates, Identifiers & Profiles → Identifiers → `com.eatoutbetter.app`** → tick **Sign in with Apple**
   → Save. (EAS usually does this for you at build time; doing it by hand is harmless.)
2. **Services → Sign in with Apple for Email Communication → Configure** → add domain `eatoutbetter.com` and
   email `no-reply@eatoutbetter.com`. Without this, anyone who picked "Hide My Email" never gets their code —
   and those are exactly the privacy-minded people a health app attracts.
3. **Keys → +** → name it "Sign in with Apple" → tick **Sign in with Apple** → Configure → primary App ID
   `com.eatoutbetter.app` → Register → **Download the .p8 (you only get one download)**. Note the **Key ID** and
   your **Team ID** (top right of the portal). These let the app revoke Apple's access when someone deletes their
   account, which Apple requires.

## 4. Google Cloud (≈15 min)

1. console.cloud.google.com → new project `Eat Out Better`.
2. **Google Auth Platform → Branding:** app name `Eat Out Better`, support email, and links —
   privacy `https://eat-out-better-api.vercel.app/privacy`, terms `https://eat-out-better-api.vercel.app/terms`.
   Authorized domains: `supabase.co` and `vercel.app`.
3. **Audience:** External → Publish app (basic sign-in scopes need no further review).
4. **Clients → Create client → Web application** (yes, web — the app signs in through the system browser, so
   no Google SDK ships in the app). Authorized redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback` → Create → paste the Client ID and Secret into
   Supabase step 1.3.

## 5. Vercel — API env vars (≈5 min)

Project `eat-out-better-api` → Settings → Environment Variables (Production):

| Name | Value |
|---|---|
| `SUPABASE_URL` | Project URL from 1.8 |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` from 1.8 |
| `APPLE_TEAM_ID` | from 3.3 |
| `APPLE_SIGN_IN_KEY_ID` | from 3.3 |
| `APPLE_SIGN_IN_PRIVATE_KEY` | the whole .p8 file contents, including the BEGIN/END lines |

While you're there: **Storage / Marketplace → Upstash for Redis → connect to `eat-out-better-api`.** That's what
switches on the $200/day spend cap (PR #24) — it does nothing without it.

## 6. EAS — app build env vars (≈2 min)

expo.dev → project → Environment variables → **production** (and **preview**), visibility **Plain text** (both
are public by design):

| Name | Value |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

---

## 7. Shipping it (build 12)

Accounts need a new binary (three new native modules + the Sign in with Apple entitlement), so version goes
**1.2.0 → 1.3.0**, build **12**.

1. **Before merging the accounts PR:** create `ota/1.2.0` from `main`. It's what build 11 testers run; any
   over-the-air fix for them (like the photo viewer, PR #23) gets published from there.
2. Merge, then build and submit build 12 (the usual `EAS_SKIP_AUTO_FINGERPRINT=1` build with `--auto-submit`).
3. **The same day build 12 reaches testers:**
   - Deploy the accounts privacy policy (`privacy-policy-accounts-release.md` has the exact text).
   - Update the App Store Connect privacy answers (table in that file). They don't need an app update, which
     is exactly why they get forgotten.
4. App Review notes, when it's time for the App Store: *"Sign-in is optional. To test it, use Sign in with
   Apple. Account deletion: Account → Delete account."*

## 8. Check it on a phone (≈10 min)

1. Fresh install → scan a menu → it appears in Saved scans. (You now have an anonymous account.)
2. Account → **Continue with email** → the code arrives within a minute → enter it → "Signed in".
3. Delete the app, reinstall → you're **still signed in** and your scans are back.
4. On a second phone (or after Sign out → sign back in with the same email): scans appear.
5. **Sign out** → Saved scans is empty (the next person on the phone can't see yours) → sign back in → they're back.
6. Continue with Apple, then with Google on another test account.
7. **Delete account** → confirm → it's gone; Supabase → Authentication → Users no longer shows it.

If anything goes wrong in testers' hands: publish an update with `ACCOUNTS_ENABLED=false` and every account
screen disappears, no new build needed.
