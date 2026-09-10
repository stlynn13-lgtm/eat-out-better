# App Store Connect — legal and privacy setup

**What this is:** everything App Store Connect needs from the legal side, what to paste
where, and the App Privacy answers derived from what the code actually does rather than
from memory. Written 2026-09-10.

**Read with:** `apps/api/src/app/terms/page.tsx` (the Terms) · `legal/eula-app-store.txt`
(the paste-ready copy) · `apps/api/src/app/privacy/page.tsx` · `plan.md`.

---

## The correction that matters most

**App Store Connect's custom license agreement takes pasted plain text, not a URL.**

There is no "EULA URL" field. If you supply your own agreement, you paste its full text
into App Store Connect and Apple renders it on the product page. That is why
`legal/eula-app-store.txt` exists.

The hosted page at `/terms` is still needed — it is what the in-app links open, and
Guideline 3.1.2 requires a functional link to the Terms inside the binary once a
subscription exists — but it is not what you give Apple.

### Keeping the two copies honest

Two hand-maintained copies of one contract is how you end up with an App Store EULA that
contradicts your website, which is worse than having no custom EULA at all: two
agreements, and nothing saying which governs.

So the text file is **generated** from the same React component the web page renders:

```bash
npm --prefix apps/api run eula
```

Re-run it after any change to `terms/page.tsx`, then re-paste. They cannot drift.

---

## 1. License Agreement

**Where:** App Store Connect → My Apps → Eat Out Better → **App Information** (under
General) → **License Agreement** → Edit.

**Choose:** Custom License Agreement, then paste the entire contents of
`legal/eula-app-store.txt` (~24,600 characters). Apply to all territories.

**Why not Apple's standard EULA:** it is the default if you do nothing, and it contains
**no medical disclaimer, no allergen disclaimer, and no AI-accuracy disclaimer.** For a
health-adjacent app that is the worst available option — you would be shipping under
terms written for a calculator.

**What makes the custom one acceptable to Apple:** Section 20 of the Terms carries the
minimum terms Apple requires of any custom EULA — Apple is not a party, has no
maintenance or support obligation, has no warranty obligation beyond refunding the
purchase price, is not responsible for product or IP claims, the export/sanctions
representation, and Apple as third-party beneficiary entitled to enforce.

---

## 2. URLs

**Where:** App Information → the same page as the License Agreement, plus the per-version
page for the marketing URL.

| Field | Value | Status |
|---|---|---|
| **Privacy Policy URL** (required) | `https://eat-out-better-api.vercel.app/privacy` | live |
| **Support URL** (required) | `https://eat-out-better-api.vercel.app/support` | **new in this change** |
| **Marketing URL** (optional) | — | none yet; leave blank rather than point at a 404 |

A reviewer clicks these. Before submitting, open each one in a private window and confirm
it loads — a Support URL that 404s is a straightforward rejection.

**When you have a real domain,** move all three to it and update `lib/legal.ts` and the
`SITE` constant in `apps/api/scripts/generate-eula-text.tsx` together.

---

## 3. App Privacy — the nutrition label

**Where:** App Store Connect → your app → **App Privacy** → Get Started.

These answers are derived from the code as it stands on `main`, not from recollection.
Each row names what produces it.

### Data you collect

| Category | Type | Source in code | Purpose | Linked? | Tracking? |
|---|---|---|---|---|---|
| Identifiers | Device ID | PostHog `distinct_id`, random per install | Analytics, App Functionality | see note | **No** |
| Usage Data | Product Interaction | PostHog: screen views + app lifecycle (automatic), plus the typed scan-funnel and feedback events in `lib/analytics.ts` | Analytics, App Functionality | No | **No** |
| Diagnostics | Crash Data | Sentry | App Functionality | No | **No** |
| Diagnostics | Performance Data | Sentry | App Functionality | No | **No** |
| Diagnostics | Other Diagnostic Data | Sentry error events and on-error session replay | App Functionality | No | **No** |
| User Content | Other User Content | Feedback text and rating → Google Sheet (`FeedbackSheet.tsx`) | App Functionality (customer support) | No | **No** |

**Verified in code, worth knowing:** `PostHogProvider` is mounted with no `autocapture`
prop. Reading the provider's logic, that means **screen views and app-lifecycle events
are captured automatically** while touch autocapture is off. So Product Interaction is
broader than the six typed events — answer accordingly.

### Data you do NOT collect — and why that is defensible

- **Health & Fitness — do not declare.** There is no condition picker anywhere in the
  app; `useAnalysis.ts:185` passes a hardcoded `DEFAULT_CONDITION`. The only health-ish
  value is a constant identical for every user. Keeping Health off the label is a real
  benefit and worth protecting.
  ⚠️ **But the privacy policy currently contradicts this.** Section 3 says "You may input
  a health condition," describing a feature that does not exist. Fix that paragraph
  *before* you answer this questionnaire, or your label and your policy will disagree in
  writing.
- **Photos — do not declare, on the current architecture.** Apple defines "collect" as
  transmitting data off device in a way that lets you access it *for longer than necessary
  to service the request in real time*. Menu photos are processed in memory and discarded;
  nothing is written to storage.
  ⚠️ **This is the answer most worth being able to defend.** It depends on your AI
  provider not retaining inputs. Confirm Anthropic's retention terms for your account
  before you rely on it, and keep the confirmation.
- **Contact Info, Financial Info, Location, Contacts, Browsing History, Search History,
  Purchases, Sensitive Info** — none collected.

### App Tracking Transparency

**No ATT prompt is required.** There is no IDFA, no advertising SDK, no data broker, and
no sharing for cross-app or cross-site advertising. Answer **"No"** to "used for tracking"
on every row above.

If that ever changes — including adding an attribution SDK — ATT becomes mandatory and
this section is wrong.

**Do not answer "Data Not Collected."** It is the tempting shortcut and it is false here:
PostHog, Sentry and the feedback sheet all collect. A label that says otherwise is the
kind of discrepancy Apple and the FTC both act on.

---

## 4. Age rating

**Where:** App Information → Age Rating → Edit.

Your Terms (§2) and Privacy Policy (§2) both assert **18+**. Set the rating to match.

Two things to know before you do:

- Apple's questionnaire asks about **medical or treatment information**. Answering it
  honestly for this app tends to push the rating up on its own.
- A higher minimum age reduces discoverability. If 18+ is stricter than you actually need,
  the fix is to lower it **and** change both legal documents to agree — not to leave the
  rating and the documents saying different things.

Whatever you choose, the rating and both documents must say the same number.

---

## 5. Before you hit Submit

- [ ] Paste `legal/eula-app-store.txt` as the Custom License Agreement
- [ ] Privacy Policy URL set and loads
- [ ] Support URL set and loads
- [ ] App Privacy questionnaire completed per section 3
- [ ] Age rating matches the Terms and Privacy Policy
- [ ] **Fix the health-input paragraph in the privacy policy** (blocks section 3)
- [ ] **Add the apartment number** to the address in Terms §24 — see below
- [ ] Confirm Apple Developer enrollment is **Organization**, not Individual (Guideline
      5.1.1(ix): health apps should be submitted by a legal entity)
- [ ] Confirm Dine Right LLC is in **good standing** on the Colorado registry
- [ ] EU: complete **DSA trader verification**, which needs the postal address
- [ ] Confirm `support@eatoutbetter.com` receives mail — both legal documents commit to it

---

## Two open items on the address

**The apartment number is missing.** Terms §24 currently reads "2811 Vallejo St Apt" with
no unit. That is the address for legal notices under §23 and the developer address Apple
requires under §20, so an incomplete one is a real defect — service of notice can fail on
it. Fix before submission.

**It is a residential address, and `/terms` is a public page.** Colorado already publishes
a registered agent address on the Secretary of State site, so this may add little; but
once it is on a public web page it is scraped, indexed and archived indefinitely. If you
would rather it not be, the usual answers are a registered agent service or a virtual
business address, either of which can replace it in §24 without changing anything else.
Not urgent, but easier to decide now than to unpublish later.
