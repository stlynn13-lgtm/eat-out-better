# Privacy policy — staged rewrite for the accounts release

**Status:** draft, NOT deployed. **Do not deploy this until the accounts release actually ships.**
**Author:** drafted 2026-09-07
**Applies to:** `auth-plan.md` §5 step 12 (the compliance package)
**Target file:** `apps/api/src/app/privacy/page.tsx`

---

## Why this is a separate file

The live policy is accurate for the app as it exists today, and it was amended on 2026-09-07 to
disclose Vercel and Expo as processors and to add a deletion/revocation section (App Store
5.1.1(i)). It should stay that way while the app has no accounts.

Deploying account language before accounts exist would make it inaccurate in the other direction —
a policy that describes collection you do not perform is still a policy that does not describe your
app. So this is staged, not shipped.

**The rule to hold:** the policy deploy and the account-creating build go out **the same day**.
`auth-plan.md` §8 item 8 — a published policy contradicting actual behaviour is a live exposure,
not a soft one.

---

## ⚠ Three things to settle before this is deployed

1. ~~**Does Dine Right LLC exist?**~~ **Resolved 2026-09-09 — registered in Colorado.** The line 15
   assertion stands in both the live policy and this rewrite. The remaining entity work is additive,
   not corrective: publishing a registered address and entity number (DSA trader status, and
   ordinary business-details practice), and confirming the Apple Developer enrollment is an
   Organization rather than an Individual.
2. **Is a lawyer reviewing this?** I have written it to be accurate to what the app does, which is
   the part I can verify. The CPRA sensitive-personal-information language in §7 below, and the
   30-day response commitment, are the clauses where accuracy is not the same as sufficiency. This
   is a health app collecting health data under an LLC — the review is worth it.
3. **Which variant of §3 applies** — see the decision-3 fork below. `auth-plan.md` §4 recommends
   keeping the health condition on-device, which keeps the smaller variant true and keeps Health
   off the nutrition label.

---

## The decision-3 fork

`auth-plan.md` decision 3 recommends the health condition **stays on the device**. But note that
syncing scan *history* moves health data anyway, because `MenuSession` carries `healthCondition` in
its payload. So there are two honest positions, and the policy must match whichever ships:

| | What the policy must say |
|---|---|
| **A — recommended.** History syncs, condition is inside the payload | Health information **is** stored on our servers as part of your saved scans, linked to your account. Health & Fitness → Health **must** be declared on the nutrition label. |
| **B — smaller surface.** No history sync at all in the accounts release; accounts exist only for identity and entitlements | Health information never leaves the device. Health stays **off** the label. |

**Variant B is materially cheaper on compliance** and is worth considering seriously: it makes the
accounts release about *identity and subscriptions* only, and defers all health-data-at-rest
questions to the release that actually ships cross-device history. The text below is written for
**variant A**, with variant B's alternates marked inline.

---

## Section-by-section changes

### §1 Overview — REPLACE

The current text ("we don't create accounts, we don't store your photos, and we don't retain your
health information after your session ends") becomes false on two of three counts.

> **Eat Out Better** ("we," "us," or "our") is operated by **Dine Right LLC**. This Privacy Policy
> explains how we handle information when you use our mobile application.
>
> You can use Eat Out Better without an account. Scanning a menu and getting your results never
> requires signing in. If you choose to create an account, we store your saved scans so they
> survive a new phone — and you can delete that account, and everything in it, from inside the app
> at any time. We still never store your menu photos, and we never sell your information.

### §2 Who This App Is For — UNCHANGED

### §3 What We Collect — AMEND

**Camera & Photos** — unchanged. Photos are still not retained.

**Health Context** — the current text ("not stored, shared, or linked to you in any way") is the
most serious falsehood in the current policy once anything syncs. Replace:

> *(Variant A)* You may input a health condition (such as high cholesterol) to personalize your
> results. If you do not have an account, this stays on your device and is used only to generate
> your in-session analysis. If you create an account and your scans are saved, the health condition
> attached to each saved scan is stored on our servers as part of that scan and is linked to your
> account. We never use it for advertising, we never sell it, and we never send it to our analytics
> or crash-reporting providers.

> *(Variant B)* You may input a health condition (such as high cholesterol) to personalize your
> results. This stays on your device. It is sent to our analysis provider to generate your results
> and is not retained by us afterward, and it is never linked to your account.

**Account Information** — NEW subsection:

> If you create an account, we store an account identifier and, depending on how you sign in,
> your email address and the name you choose to share.
>
> If you use Sign in with Apple, you may choose to hide your email address; Apple then gives us a
> private relay address instead, and we never see your real one. Apple provides your name only once,
> the first time you sign in, and only if you choose to share it.
>
> If you sign in by email, we send a six-digit code to the address you give us and store that
> address so you can sign back in.

**Device & Usage Data** — AMEND. The current text calls analytics "anonymous." Once `install_id`
ships (`auth-plan.md` §5 step 1) that is no longer the right word, because the identifier persists
across app reinstall on iOS:

> We collect basic technical information (device type, OS version, crash reports) and usage
> analytics (which screens you visit, whether an analysis succeeded, how long it took) to maintain
> and improve the app. To count returning users accurately we generate a random identifier for your
> installation; it is not derived from your device, your identity, or any advertising ID, and on
> iOS it may persist if you reinstall the app. This identifier is never linked to your health
> information, and menu photos are never included in analytics or crash reports.

> **NOTE:** this paragraph is needed as soon as `install_id` ships — which is `auth-plan.md` §5
> step 1, *before* the accounts release. It is the one part of this document that should be lifted
> out and deployed early. Re-check the App Store Connect Identifiers answers at the same time.

**Feedback** — unchanged.

### §4 How We Use Your Information — AMEND

Add to the list:

> - To create and maintain your account, and to keep your saved scans available across your devices
> - To provide and restore any subscription you purchase

### §5 Third-Party Services — ADD

> - **Supabase, Inc.** — provides the authentication and database service that stores your account
>   and your saved scans. *(Variant A: including the health condition attached to each saved scan.)*
>   Data is stored in [REGION — fill in; it is fixed at provisioning and cannot be changed later].
>   Privacy policy: supabase.com/privacy.
> - **Resend** *(or the SMTP provider actually configured)* — delivers sign-in code emails. It
>   receives your email address and nothing else.
> - **RevenueCat, Inc.** — *(add only when the paywall ships)* manages subscription entitlements.
>   It receives your account identifier and purchase status, and no health information.

### §6 Data Retention — REPLACE

> Menu photos are never retained. If you do not have an account, your scan history lives only on
> your device and is removed when you delete the app.
>
> If you have an account, your saved scans are stored until you delete them or delete your account.
> Deleting your account removes your account record and all scans attached to it. Analytics events,
> crash reports and submitted feedback are retained by the providers listed in Section 5 under
> their standard retention policies.
>
> If you signed in with Apple, deleting your account also revokes our access token with Apple.

### §7 California Residents — EXPAND

The current three rights are no longer sufficient once an identifiable account holds health data.
**This is the section most in need of a real review.**

> If you are a California resident, you have the right to know what personal information we
> collect and how it is used; to request correction of inaccurate personal information; to request
> deletion of your personal information; to request a portable copy; and to opt out of the sale or
> sharing of personal information — we do not sell or share personal information.
>
> A health condition you enter is treated as **sensitive personal information** under California
> law. We use it only to generate your results and to keep your saved scans useful to you — never
> to infer characteristics about you, and never for advertising. You may limit our use of it at any
> time by deleting your saved scans or your account from inside the app.
>
> The fastest way to exercise deletion is in the app: Settings → Delete Account. For anything else,
> email support@eatoutbetter.com. We will respond within 45 days.

> **REVIEW FLAGS:** (a) the "sensitive personal information" characterization and the
> right-to-limit language are my reading of CPRA applied to what the app does — confirm it. (b) The
> CCPA statutory response window is 45 days, extendable; the live policy currently commits to no
> window and my amendment to the live policy said 30. Pick one deliberately and make both documents
> agree. (c) If the app is available outside the US, GDPR/UK-GDPR require a lawful basis, a
> controller identity, and transfer disclosures that are not drafted here at all.

### §8 Security — REPLACE

The current claim ("Given our stateless architecture — no server-side storage of photos or health
data — your exposure is minimized by design") is directly contradicted.

> We use industry-standard practices to protect data in transit and at rest. Menu photos are still
> never stored. Account data and saved scans are held in an access-controlled database where each
> account can reach only its own records, enforced by the database itself rather than only by our
> application code. No system is perfectly secure, and we do not claim otherwise.

### §9 Changes / §10 Contact — UNCHANGED

### NEW §11 — Your Account and How to Delete It

Apple requires the in-app deletion path (5.1.1(v)); the policy should name it so a reviewer
checking the policy against the app finds them consistent.

> You can delete your account at any time from **Settings → Delete Account** inside the app. This
> permanently removes your account and every scan saved to it. It cannot be undone.
>
> If you have an active subscription, deleting your account does not cancel it — subscriptions are
> managed by Apple. Cancel in your device's Settings → Apple ID → Subscriptions. If you later
> create a new account, use **Restore Purchases** to reattach an active subscription.

---

## App Store Connect privacy answers to change the same day

| Data type | Change |
|---|---|
| Identifiers → User ID | Becomes **collected and Linked** |
| Contact Info → Email Address | Becomes **collected and Linked** (once email OTP ships) |
| Health & Fitness → Health | **Variant A: collected and Linked. Variant B: unchanged.** This is the declaration that invites 5.1.1(ix) scrutiny — see `auth-plan.md` §4 decision 3 |
| User Content → Photos or Videos | **Re-check today's answer** — photos already leave the device for the API and for Anthropic, so this may already be under-declared before any auth work |
| Identifiers → Device ID | Re-check when `install_id` ships |

These need no app update, which is exactly why they get forgotten. `auth-plan.md` §5 step 12 gives
this a named checklist line rather than a follow-up.
