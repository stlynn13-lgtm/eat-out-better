# Privacy policy — the version for the accounts release (build 12)

**Status:** DEPLOYED 2026-09-30 with the over-the-air update that switched accounts on in build 13. Supabase region written as "the United States" (East US, Ohio).
**Rewritten:** 2026-09-28, for what was actually built (the 2026-09-07 draft assumed Apple + email only, no
anonymous accounts, and a health condition that syncs — none of which is true now).
**Target file:** `apps/api/src/app/privacy/page.tsx`
**Review:** no outside lawyer (Sean's decision, 2026-09-28). Written to be accurate to the code, which is the
part that can be checked; the notes at the bottom say where judgment was used.

---

## What changed in the app, in one paragraph

Every install now gets an anonymous account on first launch, and saved scans are backed up to it on our
database (Supabase). People can attach a login — Sign in with Apple, Google, or an emailed 6-digit code — to
keep those scans across phones, and can delete the account from inside the app. **The health condition is
stripped from every scan before upload, and the database refuses any row that still carries one**
(`lib/sync/sessions.ts` `toServerPayload()`, and the `menu_sessions_no_health_condition` constraint). Photos
are still never stored.

## The rule to hold

The policy and the build go out together. Deploying early describes accounts nobody has; deploying late means
build 12 testers are uploading scans under a policy that says nothing leaves their phone.

---

## Section-by-section (paste into `page.tsx`)

### Header
`Last Updated:` the deploy date.

### §1 Overview — REPLACE the first paragraph

> **Eat Out Better** ("we," "us," or "our") is operated by **Dine Right LLC**. This Privacy Policy explains how
> we handle information when you use our mobile application.
>
> You never need to sign in to scan a menu. When you first open the app we create an anonymous account for
> you — a random identifier with no name, email or password — so your saved scans can be backed up. If you
> choose to sign in with Apple, Google or your email, that login is attached to the same account so your scans
> follow you to a new phone. You can delete your account, and everything in it, from inside the app at any
> time. We never store your menu photos, and we never sell your information.

(Keep the second paragraph about the Terms and allergens.)

### §3 What We Collect — AMEND

**Camera & Photos** — unchanged.

**Health Context** — unchanged from the 2026-09-28 live text, plus one sentence at the end:

> When your saved scans are backed up to your account, this setting is removed first; it is never stored on
> our servers.

**Your Account** — NEW subsection, after Health Context:

> When you first open the app we create an anonymous account: a random account identifier stored on your
> device and on our servers. It has no name, email or password.
>
> **Saved scans.** Each menu you scan is saved on your device and backed up to your account: the dishes read
> from the menu, their scores and the explanations. Your menu photos are not included, and neither is the
> health setting described above.
>
> **If you sign in**, we also store how you signed in and:
> - **Sign in with Apple** — the email address Apple gives us (which can be a private relay address if you
>   chose "Hide My Email") and, only the first time and only if you share it, your name.
> - **Google** — your email address and name from your Google account.
> - **Email** — the address you enter. We send a 6-digit code to it each time you sign in; there is no password.

**Device & Usage Data** — unchanged (the 2026-09-28 live text already covers the install identifier). Add:

> Analytics and crash reports are not linked to your account.

**Feedback** — unchanged.

### §4 How We Use Your Information — ADD two bullets

> - To create and keep your account, and to back up your saved scans and restore them on your devices
> - To send you sign-in codes by email, when you choose email sign-in

### §5 Third-Party Services — ADD

> - **Supabase, Inc.** — stores your account and your saved scans. Each account can read only its own records,
>   enforced by the database itself. Data is stored in [REGION chosen in `ACCOUNTS-SETUP.md` step 1 — fill in].
>   Privacy policy: [supabase.com/privacy](https://supabase.com/privacy).
> - **Resend** — delivers sign-in code emails. It receives your email address and the code, nothing else.
>   Privacy policy: [resend.com/legal/privacy-policy](https://resend.com/legal/privacy-policy).
> - **Apple** and **Google** — only if you choose to sign in with them, under their own privacy policies.

### §6 Data Retention — REPLACE

> Menu photos are never retained. Your saved scans are kept on your device and in your account until you clear
> them (Saved scans → Clear, which removes them from both) or delete your account. Your account holds at most
> your 500 most recent scans; older ones are removed automatically.
>
> Signing out removes your scans from view on that phone but keeps them in your account. Deleting your account
> permanently removes your account and every scan saved to it, and, if you used Sign in with Apple, disconnects
> Eat Out Better from your Apple ID.
>
> Analytics events, crash reports and submitted feedback are kept by the providers in Section 5 under their
> standard retention policies; none of them contain your photos, your health setting or your account.
>
> The install identifier described in Section 3 may remain in your device's keychain after you delete the app.

**"Deleting Your Data" subsection — REPLACE:**

> **In the app:** Account → Delete account. This is immediate and permanent. Deleting the app alone does **not**
> delete your account: your scans stay backed up, which is what lets you get them back on a new phone.
>
> For anything else — a copy of your data, a correction, withdrawing consent for analytics, or deleting feedback
> you sent — email [support@eatoutbetter.com](mailto:support@eatoutbetter.com). We respond within 45 days.

### §8 Security — REPLACE any "stateless / no server-side storage" wording

> We protect data in transit and at rest using industry-standard practices. Sign-in tokens are kept in your
> device's secure keychain. Saved scans are held in a database where each account can reach only its own
> records, enforced by the database itself rather than only by our app. Menu photos are never stored. No system
> is perfectly secure, and we don't claim otherwise.

### California section — keep, change the window to 45 days if it says anything else.

---

## App Store Connect → App Privacy (filled in 2026-10-01 — not yet published at time of writing)

Everything is declared **Linked to the user's identity** and **not used for tracking**. Apple treats data as
linked when it ties back to a person through an account **or a device identifier** — and analytics, feedback and
Sentry events all carry a random device-level ID (PostHog distinct id, the keychain install id) — so "not linked"
would have been inaccurate. Over-declaring linkage is the safe direction; under-declaring is what draws rejection.

| Data type | Used for | Linked | Tracking | Why it is declared |
|---|---|---|---|---|
| Contact Info → **Name** | App Functionality | Yes | No | Apple/Google sign-in, optional |
| Contact Info → **Email Address** | App Functionality | Yes | No | Account + sign-in codes |
| Location → **Coarse Location** | Analytics | Yes | No | PostHog derives city from IP (GeoIP is on by default; no `disableGeoip`) |
| User Content → **Customer Support** | App Functionality | Yes | No | In-app feedback (text, rating, PostHog id) |
| User Content → **Other User Content** | App Functionality | Yes | No | Saved scan results |
| Identifiers → **User ID** | App Functionality | Yes | No | Supabase account id |
| Identifiers → **Device ID** | Analytics | Yes | No | install id + PostHog distinct id |
| Usage Data → **Product Interaction** | Analytics | Yes | No | PostHog scan-funnel events |
| Diagnostics → **Crash Data** | App Functionality | Yes | No | Sentry |
| Diagnostics → **Performance Data** | App Functionality | Yes | No | Sentry |
| Diagnostics → **Other Diagnostic Data** | App Functionality | Yes | No | Sentry logs + error-time session replay |

**Deliberately not declared:** Health (the condition is constant and never leaves the phone — see below),
Photos or Videos (sent to Anthropic for analysis and not retained; Anthropic keeps content its safety systems flag
for up to two years, which is why the policy says so), Phone, Physical Address, Precise Location, Contacts,
Browsing/Search History, Advertising Data, Other Usage Data, Other User Contact Info.

**Keep the label and the app in step.** Before shipping any build that collects something new (location prompt,
more analytics, a new SDK), edit the label first. If `disableGeoip` is ever turned on in PostHog, Coarse Location
can come off.

## Where judgment was used (no outside review)

1. **"Health: not collected."** Rests on the condition being stripped before upload and blocked by the
   database. It stays true only while there is no condition picker that stores a per-user choice. The day one
   ships, revisit this line, the label and Guideline 5.1.1(ix) together.
2. **Saved scan results as "Other User Content," not health data.** They are menu analyses, and every user is
   scored for the same single condition, so a scan says nothing about the person who made it. A cautious
   reviewer could see "cholesterol scores" and think otherwise; if Apple asks, this is the answer.
3. **45 days** matches the CCPA/CPRA response window. Neither CCPA nor the Colorado Privacy Act applies to an
   app this size today (both have volume thresholds far above current usage), so the California section is a
   voluntary commitment. Keep it; don't expand it.
4. **Deleting the app does not delete the account.** This is standard, but it's the opposite of today's policy
   ("deleting the app removes it permanently"), so it must be said plainly — it's in §6 above.
