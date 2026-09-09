# Authentication & accounts — plan

**Status:** draft / not started
**Author:** drafted 2026-09-07 · substantially revised the same day after verification
**Recommendation:** Supabase Auth stands as the vendor. **Anonymous-first is CUT from this round.**
Ship a local identity now; ship real accounts later, as one release, on a product trigger.
**Read with:** `ARCHITECTURE.md` (V1 schema — superseded in part by §6 here) ·
`monetization-strategy.md` (§7, the entitlement bridge) ·
`app-attest-migration.md` (device identity — a *different* problem) ·
`cost-and-golive-requirements.md` (the cost blockers this touches) ·
`privacy-policy-accounts-release.md` (the policy rewrite this plan requires, staged)

---

## 0. What changed from the first draft, and why you should care

The first version of this document was written from memory. It was then checked against live
sources and against this repo. **Three of its technical claims were wrong**, one of them
destructively, and one repo fact inverts its entire risk model.

| First draft said | Actually |
|---|---|
| Upgrade an anonymous user with `signInWithIdToken()` | **This silently orphans the account.** `signInWithIdToken()` does not link — it signs into a *different* `auth.users` row. No error; it looks like a successful sign-in, and the user's history is simply gone. The correct call is `linkIdentity({ provider, token })`. Two popular GitHub threads still claim native linking is impossible; they are stale. |
| `expo-secure-store` rejects values over ~2 KB, so write a chunking adapter | Expo's docs say "Expo does not enforce a limit"; the byte-limit check was removed in v55. Both community chunking packages are abandoned. Supabase's documented pattern is `LargeSecureStore` (AES key in SecureStore, ciphertext in AsyncStorage) — but test first: it may not be needed at all. |
| Collision is one case; merge quietly | Three distinct error codes, needing different copy. Worse: **Supabase's own documented merge snippet is a silent no-op under the RLS this plan specifies** — the `USING` clause hides the rows being reparented, so the `UPDATE` matches zero rows and returns success. Total history loss on the one path you cannot test without two accounts and two devices. |

**And the repo fact that changes everything:** `getSessions()` has no UI caller and
`clearSessions()` has no caller at all. Scan history is **write-only dead code, capped at 10
items**. §13 of the first draft called the backfill "the main risk" — it was proposing to
carefully protect data that no user has ever seen.

Two more things surfaced that outrank everything the first draft worried about:

1. **Guideline 3.1.2(a): "Subscriptions must work on all of the user's devices where the app is
   available."** A device-local entitlement cannot satisfy that. Real sign-in is an App Store
   *prerequisite* of the paywall, not a product preference. This converts "when should we do
   identity?" from a judgment call into a dependency.
2. **Since 3 June 2026, new Supabase Free projects on the default email provider cannot edit auth
   email templates at all.** The 6-digit code this plan prefers is therefore *impossible* without
   custom SMTP — which needs a domain. That is the only new recurring cost in this document.

---

## 1. Why (unchanged, and still right)

Everything a user has lives in `AsyncStorage` on one device
(`apps/mobile/lib/storage/session.ts`, `lib/utils/scanQuota.ts`). Delete the app, get a new phone,
it is gone. Blocked on fixing that: retention measurement, saved history and multi-condition
profiles (backlog #4, #7, #8, #12, #13), and subscriptions — where
`monetization-strategy.md` §7 warns that shipping a paywall before an identity bridge **orphans
your first payers' data**.

What has changed is not the *why*. It is the *how much, how soon, and in what order*.

---

## 2. Why Supabase Auth (the vendor choice stands)

`ARCHITECTURE.md` already names Supabase Postgres + Auth + RLS, and both `session.ts` files carry
a "swap this for Supabase" seam. Verification did not dislodge it. The reason it holds is **RLS**:
the user's JWT goes to Postgres and the database itself enforces row isolation, rather than the
API layer having to remember to be correct on every query, forever, on health-adjacent data.

Clerk (nicer DX, second user store, per-MAU past ~10k), Firebase (pulls toward Firestore or
hand-syncing UIDs), Auth0 (enterprise-priced) all lose on the same point: a second vendor means
either giving up RLS or hand-rolling JWT templates to get it back. Roll-your-own: no.

**But the free-tier shape is different from what §12 of the first draft implied.** See §7.

---

## 3. The re-cut: NOW, HOLD, TRIGGER

The first draft front-loaded every App Store obligation the app has, for a benefit no user can
perceive. This version separates the work that is cheap and reversible from the work that is a
one-way door.

### NOW — local identity only. No server, no Supabase project, no account.

Mint a UUID into `expo-secure-store` as `install_id` and attach it to PostHog. That is it.

This delivers what anonymous-first uniquely provides — a stable pre-signup identity for retention
and, later, for reconciling entitlements — at a fraction of the cost, and it creates **no
server-side collection, no account, and no new vendor**.

Two corrections to make honestly, because the first framing of this was too rosy:

- **It is a new build, not an OTA update.** `expo-secure-store` is not currently in
  `apps/mobile/package.json`. So: `version` 1.1.4 → 1.2.0, `buildNumber` → 10, an EAS build, a
  TestFlight upload — and under `runtimeVersion: { policy: "appVersion" }`, **build-9 testers stop
  receiving OTA updates until they install the new binary.** Do not spend two binaries on this;
  merge it with the throwaway dependency build in §5 step 8 if the accounts work is close, or
  accept one build now if it is not.
- **Re-check the privacy answers before shipping it.** The id persists across app uninstall on
  iOS. That is a stronger claim than the "anonymous usage analytics" the live policy asserts at
  `apps/api/src/app/privacy/page.tsx:47`. Identifiers → Device ID / User ID is at minimum worth
  re-examining. It is probably fine; "probably" is not a reason to skip looking.

Alongside it, two things that need no identity at all and are the cheapest product wins available:
**ship the history screen that already has data behind it**, and do the iCloud hygiene in §5 step 3.

### HOLD — do not create a hosted Supabase project yet.

Everything above is $0, reversible, and creates no App Store surface. Creating the hosted project
early starts the clock on free-tier pausing, on privacy obligations, and — if anonymous sign-in is
enabled — on an anonymous-row accumulation problem with no automatic cleanup.

### TRIGGER — then ship real accounts as ONE release.

The trigger is a product event, not a date: **the paywall build starting** (3.1.2(a) makes it
mandatory then), or **cross-device history becoming the next feature to build**.

When it fires, ship in a single release: Supabase + RLS + Sign in with Apple + email OTP + in-app
account deletion + the consent screen + the privacy rewrite + the App Store Connect answers.

### Why anonymous-first is cut

The argument for it was that `user_id` never changes, so nothing is orphaned. True — but it buys
the *user* nothing perceivable while buying the *builder*, immediately and permanently:

- an RLS correctness surface over health-adjacent data, before any user benefit exists;
- an unauthenticated signup endpoint on `supabase.co` that App Attest structurally cannot reach —
  different host;
- Apple's **guest-account deletion obligation** (their FAQ is explicit: automatically generated
  "guest" accounts must be deletable), plus a 5.1.1(ii) consent screen, plus a privacy-label
  change — all in a release whose entire design goal is to be invisible;
- a merge problem with no first-party support, whose only documented solution is the silent no-op
  described in §0;
- an anonymous-user table with no automatic cleanup, whose documented cleanup query will happily
  destroy a dormant real user's data.

Cut it, and every one of those disappears at once: when the user explicitly asks for an account,
there is no conversion, so there is no collision, no merge route, no guest-account ambiguity, no
cleanup chore. **Doing less, sooner, is the right answer here.**

---

## 4. The five decisions, resolved

**1 — Is now the trigger point?** *Yes for local identity, no for accounts.* Ship `install_id` +
the history screen now (~1 day, one build, $0). Hold accounts for a product trigger. The genuinely
new argument for doing the accounts half properly *before* monetization is 3.1.2(a): cross-device
subscriptions are an App Store requirement, so this is a dependency of the paywall, not a
preference. Reversibility is the deciding factor — step (a) is inert if unused; the accounts
release is the one-way door (once health-adjacent rows exist, the privacy answers, the policy and
the deletion obligation are permanent).

**2 — Account-collision policy?** *Dissolved by decision 1.* With no anonymous users there is no
conversion and no collision. If anonymous-first is ever revived, the answer is still "merge
quietly," but implemented as: snapshot local sessions **before** any auth call (signing into the
existing account replaces the session and supabase-js cannot hold two); branch on `error.code`
across all three cases — `identity_already_exists` (422), `email_exists` (400), and
`email_not_confirmed` (422, where GoTrue commits the identity row anyway, so the UI must not say
linking failed); then merge by **re-uploading the local snapshot** with `upsert` on the existing
client-side session UUID and `ignoreDuplicates` — a set union, needing no `service_role` route at
all. Never run Supabase's documented client-side reassignment.

**3 — Does the health profile move server-side?** ***No — and go further.*** Syncing scan history
moves health data too, because the `MenuSession` payload carries the health condition. Under this
re-cut nothing health-related leaves the device until the accounts release; when it does, store
the condition server-side only if a server-side feature actually needs it, and keep it out of
PostHog and Sentry permanently.

The reason is sharper than "privacy labels are annoying." **Guideline 5.1.1(ix):** apps in
"highly regulated fields (such as banking and financial services, healthcare...)" or that "require
sensitive user information should be submitted by a legal entity that provides the services, and
not by an individual developer." Declaring Health on the nutrition label is the flag that makes a
reviewer look, and the remedy is not an appeal — it is re-enrolling as an Organization, which
needs a D-U-N-S number and a formed legal entity. Keeping the condition on-device costs $0 and
keeps the app out of that blast radius entirely.

*(Correction to the first draft's reasoning: 5.1.3(i) is a weaker hook than it looks — its text
carves out use "other than improving health management." The argument rests on 5.1.1 and 5.1.2.)*

**4 — Facebook?** *Settled: skip. And drop Google from V1 too.* Ship **Sign in with Apple + email
OTP only.** Guideline 4.8 is triggered by offering a third-party social login and exempts apps
using "exclusively your company's own account setup and sign-in systems" — and Sign in with Apple
independently satisfies it. So Apple + email OTP has **no 4.8 obligation at all**. Dropping Google
removes: two Google Cloud OAuth client IDs and the ordering trap in Supabase's Client IDs field; a
Google OAuth consent screen that itself requires live privacy *and terms-of-service* URLs (the ToS
does not exist yet — see §8); Supabase's "Skip Nonce Check" toggle, a documented security
downgrade; and `@react-native-google-signin`, which repackages an SDK on Apple's
privacy-manifest-and-signature list where a stale pin fails at upload rather than in review. Add
Google later only if signup drop-off data asks for it — the same test §4 of the first draft
applied to Facebook. **Note the flip side: adding Google makes Sign in with Apple mandatory that
same release.**

**5 — Web app later?** *No change now. Configure Apple native-only.* Verified verbatim: "If you're
building a native app only, you do not need to configure the OAuth settings," and native-only
implementations "don't require secret key rotation" — so no Services ID, no `.p8`, and no
six-month rotation chore a solo builder will not remember. The one rule to record for future-you:
**if a web app is ever added, the Services ID must be listed FIRST in Supabase's Client IDs
field** — "if a native App ID comes before the Services ID, native sign-in keeps working but web
sign-in is rejected by Apple." That is a one-line dashboard edit, not a migration. Also: Supabase
does not support Apple's server-to-server notification endpoint; leave that field blank.

---

## 5. How to migrate — the runbook

Five distinct migrations are bundled in this change: **A** on-device history → Postgres, **B**
no-identity → an identity, **C** identity → permanent account, **D** client storage layer →
server-backed, **E** scan quota → server-side.

Ordered. Everything through step 6 is $0, reversible, and creates no App Store surface.

### Step 0 — Resolve the operating entity. ✅ **DONE 2026-09-09.** `$0, one lookup.`

**Dine Right LLC is registered in Colorado** (confirmed by Sean). The shipped privacy policy at
`apps/api/src/app/privacy/page.tsx:15` was accurate; `plan.md` and `log.md` were the stale
documents and have been corrected. 5.1.1(ix) and EU DSA trader status are unblocked on the
operating-entity side, and the privacy rewrite can proceed on the assumption the entity is real.

**What this step did *not* settle, and what now carries it:** App Store Connect → Agreements →
Entity Type. Guideline 5.1.1(ix) is about who *submits* a health app, so an Individual enrollment
still trips it even with the LLC formed. Also open: the policy names the entity but publishes no
registered address or entity number, which DSA trader verification asks for. Colorado is also now
the natural governing-law answer for the Terms of Service in §8.

*It gates the accounts release (step 8 onward). It does not gate steps 1–6.*

### Step 1 — `install_id` (migration B′). `New build. ~1 day.`

`lib/identity/installId.ts`: read-or-generate a UUID in `expo-secure-store` under
`eatoutbetter:install_id`, behind a module-level single-flight promise so concurrent callers await
one result. Read-before-write; reading an existing value never overwrites it.

**Do not call `posthog.identify(install_id)`.** Attach it as a person **property** instead.
PostHog documents that an alias "must not have been previously used as the `distinct_id` argument
of an `identify()` or `alias()` call" — so identifying with `install_id` now makes it permanently
impossible to alias to the Supabase user id later, leaving only `$merge_dangerously`, which
PostHog warns is irreversible. Following the obvious path here severs the very retention series
this work exists to create.

*Failure:* SecureStore throws or returns null (first-launch race, keychain unavailable) → fall
back to an in-memory ephemeral id for the session; do not persist a second one.
*Verify:* cold-start twice with a force-quit between; same id. Delete and reinstall; on iOS the id
persists — which is the desired behaviour, and is also why the privacy answers need a re-check.
*Rollback:* `eas update:rollback` for the wiring; the value is inert if nothing reads it.

### Step 2 — Ship the history that already exists (migration D, cheap half). `OTA.`

`getSessions()` has no UI caller; `clearSessions()` has none at all. Raise `MAX_SESSIONS` above 10
and build the screen. This is the cheapest product win available, needs no account and no server,
and "saved history" is what `monetization-strategy.md` plans to sell.

**⚠ Rolling this back destroys user data unless you change the write path first.**
`session.ts:9-11` does `[session, ...existing].slice(0, MAX_SESSIONS)` on *every save*. Raise the
cap to 100, let a user accumulate 40 sessions, then `eas update:rollback` restores
`MAX_SESSIONS = 10` — and the next scan silently deletes 31 of them. It fires on the recovery
path, when you are already dealing with something else.
**Fix before shipping:** read the cap from `extra` the way `dailyScanLimit` already does, and make
the slice one-directional — `slice(0, Math.max(MAX_SESSIONS, existing.length))` — or drop the
slice from the write path entirely and prune only on an explicit user action. Also wrap
`clearSessions()` in try/catch before giving it a caller; it is the one function in the file
without one.

### Step 3 — iCloud hygiene (5.1.3(ii)). `OTA or build. Independent of auth.`

Guideline 5.1.3(ii): apps "may not store personal health information in iCloud." AsyncStorage
lives in the app container, which is in the iCloud device backup by default — **so the health
condition may already be reaching iCloud today, at build 9, before any auth work.** Determine
whether it does; if so, move it to SecureStore with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`
or exclude the path with `NSURLIsExcludedFromBackupKey`. Migration is copy-then-delete, so neither
direction destroys data if the delete is last.

While in there: add the "check with your doctor" line to `results.tsx`, which is the one screen
missing it (`index.tsx:80` and `how-it-works.tsx:118` already have it). Guideline 1.4.1, and it is
part of what keeps a reviewer classifying this as a nutrition tool rather than a medical app —
which is what keeps 5.1.1(ix) from firing.

### Step 4 — Schema, on the laptop. `Nothing ships. ~half a day.`

`supabase init && supabase start`. Write the schema as **one table with a jsonb payload**, not
ARCHITECTURE.md's normalised pair:

```sql
menu_sessions(
  id          uuid primary key,               -- the client's existing UUID. NO default.
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  source      text,
  payload     jsonb not null,
  check (octet_length(payload::text) < 262144)
)
```

Two reasons the normalised draft is wrong here. It has **no column for `rawDishes`,
`unreadableItems` (EAT-9) or `unrankedItems` (EAT-20)** — it would silently drop exactly what
those tickets exist to preserve. And both `menu_sessions.id` and `dishes.id` default to
`gen_random_uuid()`, which **re-mints the primary key at insert and destroys the
upsert-on-client-uuid strategy every migration below depends on.**

RLS: four policies (select/insert/update/delete), all `using (auth.uid() = user_id) with check
(auth.uid() = user_id)`.

**Two schema notes that are easy to miss:**
- **`ON DELETE CASCADE`, deliberately.** ARCHITECTURE.md declares `ON DELETE SET NULL`; §6's
  amendment makes the column `NOT NULL`. Those are mutually exclusive — `delete from auth.users`
  would *raise* rather than delete, and that is the exact code path behind the mandatory Delete
  Account button App Review will press.
- **Menu caching and `restaurants` are NOT own-rows tables.** `cost-and-golive-requirements.md`
  §3 makes menu caching the #1 cost lever, and the whole point is that user B benefits from user
  A's scan. That needs its own RLS design — readable by any authenticated user, writable by
  service-role only, no `user_id` column, no personal data — and it should be designed *before*
  this migration file is written, not retrofitted onto an own-rows model.

### Step 5 — Prove the RLS with pgTAP. `Nothing ships.`

Install `basejump/supabase_test_helpers`. Write four tests: (a) `tests.rls_enabled('public')`;
(b) two-user isolation — as A insert, as B assert zero rows *and* that B can neither update nor
delete A's row; (c) idempotency — same upsert twice, one row; (d) cascade — delete the
`auth.users` row, assert the sessions go with it and nothing raises.

Make `supabase db reset && supabase test db` the pre-push ritual. This converts "test as two real
users" from a chore nobody does into a command, and test (d) is what catches the FK problem above.

### Step 6 — HOLD.

Stop here until a product trigger fires. Everything above is free, reversible, and invisible to
Apple.

---

### Step 7 — Provision. `Server-only.`

Region is **fixed at provisioning** — changing it means a new project and a migration, and it is a
real data-residency decision for health-adjacent data. Put dev and prod in **separate free
organizations**: Fair Use restrictions apply org-wide, so a neglected dev project can put
production into read-only mode. (Verify that actually yields two projects — free project limits
count members who are Owner or Admin, so a second org owned by the same person may not.) Use the
new `sb_publishable_` / `sb_secret_` key format.

### Step 8 — Email prerequisites, before a line of sign-in code. `Server-only. ~$10-15/yr.`

Three independent failures converge here, which is why this comes first:

1. Supabase's built-in sender caps at **2 emails/hour** *and refuses any address not on the
   project team* — email OTP fails 100% for real testers, not merely slowly.
2. **Since 3 June 2026, new Free projects on the default provider cannot edit auth email templates
   at all** — so the 6-digit code needs custom SMTP to exist.
3. **Apple private-relay addresses bounce from unregistered sending domains** — which fails
   precisely for the privacy-conscious users a health app attracts, and looks like a broken login.

So: register a domain, add it to Resend, add SPF/DKIM, configure Supabase custom SMTP (included on
Free), *then* edit the Magic Link template to `{{ .Token }}`. Separately register that same domain
under Certificates, Identifiers & Profiles → Sign in with Apple → Email Communication, with its
SPF TXT record. Note Supabase's own OTP cap of 30/hour project-wide binds before Resend's free
tier does.

*Verify:* send an OTP to an address definitively **not** on the project team and confirm delivery;
then send one to a `@privaterelay.appleid.com` address and confirm it arrives rather than bounces.

### Step 9 — One throwaway build, before any auth code. `New build, internal only.`

Add the deps with `npx expo install` run **inside `apps/mobile`** (not an npm workspace). npm
`latest` for every Expo module is now 57.x, and a plain `npm install` pulls 57.x into an SDK 56 app
— EAS then dies at config evaluation with a misleading `PluginError`. Correct SDK 56 versions:
`expo-secure-store` 56.0.4, `expo-apple-authentication` 56.0.4.

Fifteen minutes of waiting buys certainty about the riskiest assumptions. **Settle two experiments
here:** does a full Supabase session write to SecureStore without throwing (deciding whether
`LargeSecureStore` is needed at all), and does Hermes on RN 0.85.3 still lack
`crypto.getRandomValues` (the in-repo comment at `lib/analytics.ts:31` says so, but no RN 0.85 doc
confirms it — do not add a native module on the strength of a stale comment).

### Step 10 — The accounts release. `One build.` (migration C)

Sign in with Apple (native `ASAuthorizationAppleIDButton`, no nonce needed on the native path) and
email OTP. Two clearly separated functions in `lib/auth/link.ts` so they cannot be confused;
there is no `upgradeAnonymous()` because there are no anonymous users.

- **Capture Apple's full name on the FIRST authorization** and write it immediately with
  `updateUser({ data: { full_name } })`. It is never sent again.
- **Never disable "Confirm email."** With autoconfirm on, any user can claim any unregistered
  address with no proof of ownership — a pre-account-takeover hole on a health app.
- **Know that Supabase auto-links identities sharing a confirmed email.** Its docs: "Supabase Auth
  automatically links identities with the same email address to a single user." With Apple and
  email OTP both enabled — exactly this configuration — a user who signs in with Apple (relay off)
  and later with email OTP at the same address hits this without the app ever calling
  `linkIdentity`. Verify it: sign in both ways, assert `user.id` is unchanged and both identities
  attach.
- **Sign-out must be specified, and it is the one client-side data-isolation risk.** If sign-out
  clears AsyncStorage, a user switching accounts loses local history. If it does not, the next
  person to sign in on that device reads the previous user's sessions — **and `MenuSession`
  carries the health condition.** That is a cross-user health-data leak that none of the pgTAP work
  above can catch, because it never touches the database. Fix: namespace the key per user
  (`eat-out-better:sessions:<user_id>`), migrate the existing unkeyed blob into the first
  signed-in user's namespace once, switch namespace on sign-out without deleting, and remove only
  that user's namespace on delete-account. Test it: sign in as A, save, sign out, sign in as B,
  assert zero rows.
- *Rollback:* feature-flag the sign-in entry point via `extra` — the same mechanism
  `dailyScanLimit` already uses — so it hides with one `eas update`.

### Step 11 — Account deletion, SAME release. `Build + server route.`

Guideline 5.1.1(v), and Apple's FAQ is explicit that this covers automatically generated "guest"
accounts too. "Only offering to temporarily deactivate or disable an account is insufficient."

Settings → Delete Account → confirmation → POST to a Vercel route holding the secret key that
calls `auth.admin.deleteUser(uid)` (CASCADE does the rest) and POSTs to Apple's `/auth/revoke`
("Apps that support Sign in with Apple should use the Sign in with Apple REST API to revoke user
tokens" — Supabase does not do this for you, and the native `identityToken` flow alone does not
give you a token to revoke with; capture the `authorizationCode` at first authorization and
persist the refresh token server-side). Then clear the Supabase session, every SecureStore key,
and AsyncStorage — **in that order**, so a partial failure leaves the user signed out rather than
half-deleted. Deleting an already-deleted user must return success, not 404-as-error.

Two design questions to answer *before* writing the screen: what the app looks like immediately
after deletion (it must not instantly resurrect an equivalent account, or a reviewer reads it as
deactivation), and what happens to an active StoreKit entitlement whose row was just deleted — the
subscription survives, so Restore Purchases must still work or the user is paying for nothing.

*Verify exactly as a reviewer would:* tap, confirm, force-quit, reinstall, confirm history is
genuinely empty and no credentials survive in the Keychain.

### Step 12 — The compliance package, same release. `Server deploy + App Store Connect + OTA.`

Four items, same day. See §8 for the full checklist and
`privacy-policy-accounts-release.md` for the drafted policy text.

1. Deploy the rewritten privacy policy.
2. Ship the first-run consent screen (5.1.1(ii) and 5.1.2(i)).
3. Update the App Store Connect privacy answers — Identifiers → User ID becomes collected and
   Linked; Contact Info → Email Address becomes collected and Linked. **Health only if decision 3
   is reversed.**
4. Create the App Review demo account (see §8) and fill in App Review Information.

The trap in item 3: privacy answers can be changed with no app update, which sounds like relief
and is actually the risk — nothing in the release process forces it, so they quietly stay wrong.
Give it a named checklist line, not a follow-up.

### Step 13 — Backfill (migration A). `OTA, flag-gated.`

Now trivial, because `MenuSession.id` is already a server-generated v4 UUID
(`apps/api/src/app/api/analyze/route.ts:234`) persisted verbatim into AsyncStorage.

```
upsert({ id: session.id, user_id, created_at: session.createdAt,
         source: 'backfill', payload: session },
       { onConflict: 'id', ignoreDuplicates: true })
```

**Never delete the local copy.** Write the completion marker only *after* all inserts resolve —
the classic bug is writing it first, so a crash mid-run permanently skips the rest. Two
independent idempotency layers in the right order: the primary key on the client UUID prevents the
*damage*; the marker prevents the *work*. Because the PK protects you, a missing marker is always
safe.

*On the "is a failed backfill visible?" question:* no, and this resolves what looks like a
contradiction with step 2. Step 14 keeps `getSessions()` reading local storage **forever**, so the
history screen shows everything regardless of sync state. A failed backfill becomes visible only
on a *second* device — which is exactly when the user expects sync, and exactly when
`syncFromServer()` gets its first caller. Budget the sync-state UI *then*, not now.

*Rollback:* gate on `extra.backfillEnabled`, disable with one `eas update`. Server-side:
`delete from menu_sessions where source='backfill'`.

### Step 14 — Write-through storage (migration D). `OTA, flag-gated.`

Rewrite `lib/storage/session.ts` with all three exports **byte-identical in signature**, so
`hooks/useAnalysis.ts:306` does not change.

- `saveSession()`: await the **AsyncStorage write first** — that is the durability guarantee —
  then fire-and-forget the Postgres upsert; on failure push the id onto a bounded outbox, drained
  on `AppState → active`.
- `getSessions()`: **AsyncStorage only, forever.** Never touches the network.
- Add an additive `syncFromServer()` that nothing calls yet.

**The one way this migration makes the app worse at its job is adding a network await to the
bootstrap or the scan path.** This app is used standing up in a restaurant on bad wifi. The first
draft said "bootstrap auth before the first screen renders" — **do not do that.** The existing
call sites already tolerate silent failure (`saveSession` swallows errors and returns void;
`store.setResults()` runs *before* the await at line 306). The contract is already right; keep it.

**And decide this explicitly:** `/api/analyze` must treat the `Authorization` header as *optional
metadata* and **must not reject a request for a missing, expired or unverifiable JWT.** Today the
scan path touches one host. If the API starts 401ing, scanning depends on a token refresh
succeeding against `supabase.co` — a second host, on hotel wifi, possibly with an expired refresh
token. Attribute the row when you can; write it unattributed when you cannot. Regression test:
stub the Supabase host to hang, assert a scan still completes end-to-end.

### Step 15 — Operational safety net. `Server-only. Before real rows accumulate.`

- **Backups.** Supabase Free includes *none* — the pricing page lists backups as "Not included."
  Nightly GitHub Actions running `supabase db dump` **through the Supavisor session-mode pooler**,
  not the direct host: direct connections are IPv6-only without the paid IPv4 add-on, and GitHub
  runners are IPv4-only. Push the gzip somewhere that is **not** GitHub Actions artifacts — GitHub
  Free includes 500 MB of artifact storage and *blocks* rather than bills overage, so that variant
  stops uploading silently once full. A backup that fails quietly is worse than no backup, because
  it is believed in. **Restore one dump into a local Postgres once**, so they are known-good.
- **Keep-alive.** Free projects pause after ~1 week of low activity. A daily external request that
  touches the database, on every free project. **Not Supabase Cron / pg_cron** — pausing keys off
  *user* database activity, and a paused project's Postgres is not running, so it cannot
  self-resume.
- **Alarm on both, or they will rot.** GitHub disables scheduled workflows after 60 days of no
  repository activity **in public repos** — entirely plausible on a pre-launch solo project, and
  the failure chain is: keep-alive disables itself → project pauses → cannot self-resume →
  restore window (sources conflict; plan for 90 days). Both jobs' real failure mode is *silent
  non-execution*, which an `if: failure()` hook does not catch. Use a dead-man's-switch that
  alarms on absence (healthchecks.io free tier). Fold a `pg_database_size` check into the same job.

### Step 16 — The entitlement bridge, before the paywall. `New build.`

Require sign-in **at the moment of purchase**, not before. Set RevenueCat `appUserID` to the
Supabase user id. Ship Restore Purchases. This is the concrete discharge of
`monetization-strategy.md` §7 and of Guidelines 3.1.2(a) and 3.1.1 — not a product preference. Do
not ship the paywall before this step.

Also upgrade **Vercel to Pro before the paywall flips**: Hobby "restricts users to non-commercial,
personal use only," and the penalty for a fair-use breach is a paused deployment — the whole app
down.

### Step 17 — Scan quota (migration E). `BLOCKED. Do not attempt.`

Leave `scanQuota.ts` exactly as it is, as a UX affordance that avoids uploading photos destined to
be refused. **Do not key the quota on `user_id`** — a user id is free to mint, so that looks
server-side without being true. Real enforcement waits on App Attest's `keyId`.

**A live design conflict to resolve before it is ever built:** `scanQuota.ts` deliberately keys on
the device's **local calendar date**, with an explicit comment that a UTC key "rolls over
mid-evening for US users, which would hand back a fresh allowance in the middle of exactly the
dinner the app exists for" — while `app-attest-migration.md` §8 proposes
`eob:quota:<utc-day>:<keyId>`. Shipping the UTC version reintroduces the exact bug `scanQuota.ts`
was written to prevent, and makes the client UI disagree with the server. When built: send the
client's local date as a header, validate it is within ±26h of the server's UTC day, key on the
validated local date, and run in **shadow mode for two weeks** before enforcing anything.

**Say this plainly rather than absorbing it silently:** `cost-and-golive-requirements.md` §4 lists
the per-user daily scan cap as non-negotiable go-live blocker #2. This plan defers it with no
shipping date. That gap is now visible rather than hidden.

**One free win in the other direction:** blocker #1, the global daily spend kill-switch, is
currently deferred because `plan.md:50` says it "needs durable shared storage (Upstash/Vercel KV)."
**Provisioning Supabase *is* durable shared storage.** A single counter row keyed on UTC day,
read-and-incremented inside the existing circuit breaker in `lib/utils/rateLimit.ts`, closes the
#1 non-negotiable blocker at $0 the moment step 7 happens. Claim it.

---

## 6. Schema amendments to ARCHITECTURE.md

1. **Drop the custom `users` table.** `auth.users` is the user table; add `public.profiles` keyed
   on `id uuid references auth.users(id) on delete cascade` for app-specific fields.
2. **`menu_sessions.user_id` is `NOT NULL`**, references `auth.users`, **`ON DELETE CASCADE`** —
   not the drafted `SET NULL`, which is illegal in combination with `NOT NULL`.
3. **One jsonb payload table, not the normalised pair** — see §5 step 4 for why.
4. **No `gen_random_uuid()` default on `id`.** The client's UUID is the primary key; that is what
   makes every write idempotent.
5. **Menu-cache and `restaurants` tables need their own non-own-rows RLS design.**
6. RLS can read `auth.jwt() ->> 'is_anonymous'` — retained for reference only; unused under this
   re-cut.

---

## 7. Staying free — what is true, and what the ceiling actually is

**Yes, the auth plan runs at $0/month, and will for a long time.** Free includes 50,000 MAU and
all providers with no per-provider surcharge — roughly 500× the near-term user base, so **MAU is
not the forcing function.** (Pro raises it to 100,000 with a small per-MAU overage, so MAU never
becomes an outage risk, only a modest bill.) Under this re-cut the $0 is firmer still, because no
Supabase project exists until a trigger fires.

**The binding constraint is the 500 MB database, and it is lifetime accumulation, not monthly** —
Postgres disk does not shrink on delete without a `VACUUM FULL`. At a rough ~20 KB per stored scan
that is somewhere near 25,000 lifetime scans: years at ~100 users, months at ~1,000, weeks at
~10,000. **Treat that number as unmeasured** — Supabase's own schemas consume a baseline before
your first row, and `auth.refresh_tokens` grows with every refresh forever. Measure one real
session with `pg_total_relation_size` before quoting any threshold, and set the Pro trigger on the
*measured* figure.

**The critical thing to understand: hitting a free-tier limit is an OUTAGE, not a bill.** Fair Use
restrictions include "switching databases to read-only mode" and "responding with a 402 status
code for all API requests," they apply **org-wide**, and a second breach after the grace period
gets no further grace. Pro is not immunity either — "continually exceed Pro Plan quota and have
the spend cap enabled" is itself a Fair Use trigger, so on Pro the live choice is between an
unbounded bill and an outage. Pro buys 16× the disk and managed backups; name that trade rather
than discovering it.

**Two cheap levers roughly triple the free runway:** drop or TTL `raw_ocr_text` (ARCHITECTURE.md
describes it as debugging data), and explicitly rule menu photos **out** of Supabase Storage — at
~500 KB × ~4 per scan the 1 GB ceiling is about 500 scans and the 5 GB egress budget evaporates on
any history browsing.

**And bound the direct-write path.** Step 14 has the client upserting to Postgres with the user's
JWT, which never touches `apps/api` — so `x-app-token`, the IP rate limiter and the global circuit
breaker do not apply, and App Attest never will. The shortest path to taking the app down for
everyone is one authenticated user writing large payloads with a publishable key that ships in the
binary. Hence the `octet_length` CHECK in §5 step 4, plus a per-user row cap.

**First thing that costs money: a domain, ~$10-15/year, when email OTP ships** (§5 step 8). Then,
in order: Supabase Pro $25/mo on a *measured* headroom trigger; Vercel Pro $20/user/mo, not
optional at monetization. Honest post-monetization floor in fixed vendor fees: **~$45/mo**, on top
of Anthropic spend.

**Scope caveat, stated plainly:** this is a statement about the *auth* plan, not the project.
`cost-and-golive-requirements.md` puts the Claude API at ~$0.05/scan — ~$50/mo at 1,000 scans,
~$500/mo at 10,000 — which dwarfs everything here. Auth is cost-neutral; the app is not free and
never was.

**Free substitutes for what Pro would have given:** nightly `supabase db dump` via GitHub Actions
for backups; an external daily ping for pausing; the local Supabase CLI stack as the dev
environment rather than burning one of the two free project slots (branching is paid); PostHog's
free tier plus `install_id` for retention. All covered in §5 step 15.

---

## 8. App Store compliance checklist

Ordered by when it must exist. Every item is a rejection or a pulled app if missed.

| # | Requirement | Guideline | Due |
|---|---|---|---|
| 1 | **Resolve the operating entity.** Healthcare apps "should be submitted by a legal entity... not by an individual developer." Check whether the enrollment is Individual or Organization. | 5.1.1(ix) | **Step 0 — before anything** |
| 2 | **EU DSA trader status** entered and verified in App Store Connect, if EU distribution is intended. Apps without it "will be removed from the App Store in the European Union." Requires publishing a real address, phone and email — interacts directly with #1. | DSA Arts. 30–31 | **Now** — already in force |
| 3 | **Keep health data out of iCloud.** | 5.1.3(ii) | Step 3 — already engaged at build 9 |
| 4 | **"Check with your doctor" on `results.tsx`.** | 1.4.1 | Step 3 |
| 5 | **Explicit permission before sharing personal data with third-party AI.** The policy names Anthropic; the gap is the word *permission* — there is no consent step today, and the app sends photos plus the health condition to Claude on every scan. **This binds today, at build 9, independent of auth.** | 5.1.2(i) | Step 12 at the latest; arguably overdue |
| 6 | **Consent for collection, even when anonymous at the time**, plus an accessible way to withdraw it. This — not 4.8 — is what a silent account would have triggered. | 5.1.1(ii) | Step 12 |
| 7 | **In-app account deletion**, covering automatically generated guest accounts, with Apple token revocation. Deactivation is insufficient. | 5.1.1(v) | **Same release as the first account** |
| 8 | **Accurate privacy policy**, linked in-app and in App Store Connect, explaining retention and deletion. | 5.1.1(i) | **Same deploy** as any server storage |
| 9 | **Updated privacy nutrition labels.** Also re-check today's answers — photos already leave the device, so User Content may already be under-declared. | App privacy details | Step 12 |
| 10 | **Terms of Use / EULA** with the medical disclaimer and liability waiver, hosted and linked. Required for auto-renewable subscriptions and by Google's OAuth consent screen if Google is ever added. `plan.md:60` lists this as an open P1 gate and nothing has claimed it. *(The EULA-link requirement lives in Schedule 2 of the Program License Agreement rather than in 3.1.2's text — treat the citation as unverified; the gap is not.)* | 3.1.2 / PLA Sch. 2 | Step 12; mandatory by step 16 |
| 11 | **App Review demo account.** With Apple + email OTP as the only methods, a reviewer cannot receive an OTP at an inbox you control and cannot be handed an Apple ID. Create a dedicated review email, verify the OTP reaches it, fill in App Review Information, and note that scanning itself needs no login. **Routine, entirely avoidable rejection.** | 2.1 | Step 12 |
| 12 | **Scanning stays usable without a login.** Gating *new* features behind an account is fine; gating today's flow is not. This is affirmative App Store support for the no-sign-in-wall posture. | 5.1.1(v), 5.1.1(x) | Permanent |
| 13 | **Never send the health condition to PostHog or Sentry.** `identify(user.id)` is compatible with the published policy; a condition-derived person property is not. | 5.1.3, 5.1.1(i) | Permanent |
| 14 | **Cross-device subscriptions + Restore Purchases.** The reason accounts are mandatory before the paywall. | 3.1.2(a), 3.1.1 | Step 16 |
| 15 | **Privacy manifest** required-reason API declarations. Builds 5–9 uploaded fine so this is probably satisfied by Expo's per-package files, but `app.config.ts` declares no `ios.privacyManifests`. Verify at the next upload rather than assuming. | ITMS-91053 | Step 9 |
| 16 | **Sign in with Apple prominence** — only if Google is ever added. Use the native `ASAuthorizationAppleIDButton`; Expo warns that customizing `backgroundColor`/`borderRadius` via `style` "will not work and is against the App Store Guidelines." The rejection here is usually placement, not absence. | 4.8 | Only if Google ships |

---

## 9. Risk register

| Risk | Mitigation |
|---|---|
| **`signInWithIdToken` used where `linkIdentity` is needed** — silent, total history loss, no error | Anonymous-first is cut, so the path does not exist. If revived: §4 decision 2. Smoke-test the call before designing UI around it. |
| **Cross-user health-data leak via a shared AsyncStorage key on sign-out** | Per-user namespacing, §5 step 10. No amount of RLS testing catches this. |
| **Rollback of step 2 truncates user history** | Cap from `extra`, one-directional slice. §5 step 2. |
| **A network await enters the scan or bootstrap path** | `getSessions()` local-only forever; `/api/analyze` never 401s. §5 step 14, with a hanging-host regression test. |
| **Free-tier breach = org-wide outage, not a bill** | Payload CHECK, per-user row cap, measured Pro trigger, dev in a separate org. §7. |
| **Backup/keep-alive jobs rot silently** | Dead-man's-switch alarming on absence; 60-day workflow auto-disable in public repos. §5 step 15. |
| **Privacy answers never updated** — no build forces them | Named checklist line with an owner. §5 step 12. |
| **Deletion route errors instead of deleting** (`SET NULL` + `NOT NULL`) | `ON DELETE CASCADE` + pgTAP test (d). §5 steps 4–5. |
| **Email OTP silently fails for real users** | Custom SMTP + private-relay domain registration *before* any sign-in code. §5 step 8. |
| **`apps/mobile` is not an npm workspace** | `npx expo install` run inside it, pinned to 56.x. §5 step 9. |

---

## 10. What Sean must verify himself

I could not confirm these. Each is cheap to check and at least one is load-bearing.

1. ~~**Does Dine Right LLC exist and is it in good standing?**~~ **Existence confirmed 2026-09-09:
   registered in Colorado.** The live legal document was accurate. *Good standing* was not
   separately confirmed — worth a look at the same registry page, since a lapsed periodic report
   is the usual way an otherwise-real LLC stops shielding anyone.
2. **Is the Apple Developer enrollment Individual or Organization?** App Store Connect →
   Agreements → Entity Type. Under a minute.
3. **Is a domain already owned?** The API runs on `eat-out-better-api.vercel.app`, which suggests
   not. This is the difference between $0 and ~$10-15/yr.
4. **Are today's App Store Connect privacy answers accurate?** Photos and the health condition
   already leave the device. Verify before adding new declarations on top of possibly-wrong ones.
5. **Does the on-device health condition reach the iCloud backup?** Engages 5.1.3(ii) today.
6. **Is the GitHub repo public or private?** Decides whether the 60-day workflow auto-disable
   applies.
7. Two Supabase sources contradict each other on the paused-project restore window (1 year vs 90
   days). **Plan for 90.**
8. Whether Supabase counts anonymous users toward billable MAU is undocumented — immaterial at
   500× headroom, moot under this re-cut.

---

## 11. What this does NOT do

- **It is not API security.** A valid JWT proves nothing about whether the caller deserves to
  spend money on the Anthropic account. `x-app-token`, the rate limiter, the global circuit
  breaker and eventually App Attest remain the actual protections. **RLS is an isolation control,
  not a rate limit** — and the direct-to-Postgres write path sits deliberately outside the API's
  protections (§7).
- **It is not a scan quota.** §5 step 17, and that is a deferred go-live blocker, stated openly.
- **It is not a spend cap.** The Anthropic account spend cap remains the only hard financial
  backstop — though §5 step 17 notes how provisioning Supabase closes the *global* daily cap for
  free.
- **It does not make history safe on its own.** Postgres is durable; a bug in the backfill or a
  policy is not. Backups are part of this plan, not an optional extra — and on Free they are
  something you build, not something you buy.
