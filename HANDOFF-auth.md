# Handoff — sign-in / accounts (kickoff for whoever picks this up)

**What this is:** a one-shot kickoff doc so the next person — or the next Claude session — can pick up the authentication work without re-deriving it. **Transient:** once the work lands, fold anything still true into `plan.md` and delete this file. It does not replace `CLAUDE.md`, `plan.md` or `log.md`.

**Created:** 2026-09-07. **Author:** the session that wrote `auth-plan.md`.
**Web version (same content, nicer to read/send):** https://claude.ai/code/artifact/499ee55f-90a2-42e4-b894-f0fc3acc3649

---

## State of play

| | |
|---|---|
| **Branch** | `feat/durable-rate-limit`, pushed, in sync with its remote. **Two commits ahead of `main`, unmerged** — `6ccf0dd` durable rate limiting + global daily spend cap, `f7a70af` lockfile regen. That work predates this session. |
| **Uncommitted** | 5 files from this session sit on top. **Commit or stash before switching branches.** |
| **App code** | Untouched. No dependency added, no build run, nothing shipped. |
| **Live app** | v1.1.4 / build 9 on TestFlight. No accounts, no database, no server-side storage. |

**Files changed this session** — `auth-plan.md` (new, 685 lines, the plan), `privacy-policy-accounts-release.md` (new, staged policy rewrite, **not deployed**), `apps/api/src/app/privacy/page.tsx` (present-tense corrections only), `log.md` + `plan.md` (updated per the doc rule).

---

## Read first, change nothing

1. `CLAUDE.md` → `plan.md` → `log.md`. Canonical and current.
2. `auth-plan.md` — the plan. §5 is the runbook (per-step idempotency, failure mode, rollback, verification). §10 is what only Sean can check.
3. `ARCHITECTURE.md` — **its V1 schema at lines 226–300 is partly superseded** by `auth-plan.md` §6. Read the amendments first.
4. `apps/mobile/CLAUDE.md` and `apps/mobile/AGENTS.md` — scoped instruction files that apply only inside `apps/mobile` and win over the root `CLAUDE.md` where they overlap.

---

## Three corrections — do not re-introduce these

Two of them are what the obvious search result tells you to do.

1. **`signInWithIdToken()` does not link an account.** It signs into a *different* `auth.users` row and abandons the original — no error, looks like a successful sign-in, history gone. Use `linkIdentity({ provider, token })`. Two well-ranked GitHub threads still say native linking is impossible; they are stale.
2. **The `expo-secure-store` 2KB limit no longer exists** (check removed in v55; Expo's docs say no limit is enforced). Don't build a chunking adapter — both community packages are abandoned. Test whether `LargeSecureStore` is needed at all.
3. **Supabase's documented client-side merge snippet is a silent no-op** under own-rows-only RLS — the `USING` clause hides the rows being reparented, so the `UPDATE` matches nothing and returns success. Total history loss on the one path you can't test without two accounts on two devices.

**And the repo fact that re-cut the plan:** `getSessions()` has no UI caller and `clearSessions()` has none at all. Scan history is write-only dead code capped at 10 items.

---

## The plan in three phases

- **NOW** (~1 day, one build, $0) — `install_id` in SecureStore + PostHog person property; ship the history screen; iCloud hygiene. No server, no account, no App Store surface.
- **HOLD** — do not create a hosted Supabase project until a product trigger.
- **TRIGGER** (paywall build starts, or cross-device history) — accounts as **one** release: Supabase + RLS + Sign in with Apple + email OTP + in-app deletion + consent + privacy rewrite + App Store Connect answers.

**Anonymous-first is cut.** **Google sign-in is dropped from v1** (Apple + email OTP has no Guideline 4.8 obligation at all). **The timing isn't a preference:** Guideline 3.1.2(a) requires subscriptions to work on all a user's devices, so sign-in is a prerequisite of the paywall.

---

## Where to look in the codebase

### `/` (repo root)
| File | Next step |
|---|---|
| `auth-plan.md` | The plan. Start at §3 (the re-cut) then §5 (the runbook). |
| `privacy-policy-accounts-release.md` | Deploy **only** on the day accounts ship. |
| `cost-and-golive-requirements.md` | Names two non-negotiable go-live cost blockers; one is still deferred. |
| `app-attest-migration.md` | Read before touching the scan quota. Different problem from auth. |

### `apps/mobile/`
| File | Next step |
|---|---|
| `package.json` | **Not an npm workspace.** Run `npx expo install` *inside this dir* or EAS dies at config eval. Pin SDK 56 versions — npm `latest` is now 57.x. |
| `app.config.ts` | Steps 1 & 9: `ios.usesAppleSignIn`, bump `version` → 1.2.0 / `buildNumber` → 10, Supabase URL + publishable key into `extra`. Put the history cap in `extra` too so it ships OTA. |
| `tailwind.config.js` | The design system — `brand.900/800/600`, `score` green/amber/red. Use these. |

### `apps/mobile/lib/`
| File | Next step |
|---|---|
| `identity/installId.ts` | **CREATE** (step 1). UUID in `expo-secure-store` under `eatoutbetter:install_id`, behind a single-flight promise. In-memory fallback if SecureStore throws. |
| `analytics.ts` | Step 1: attach `install_id` as a PostHog person **property**. **Do not call `posthog.identify(install_id)`** — it permanently blocks the later alias to the Supabase user id. Line 31 documents the Hermes `crypto.getRandomValues` gap; verify it still holds on RN 0.85. |
| `storage/session.ts` | Steps 2 & 14. **Fix the truncating slice before raising the cap** — lines 9–11 slice on every save, so raising `MAX_SESSIONS` then rolling back silently deletes the excess. Later: write-through, all three signatures byte-identical, `getSessions()` local-only forever. `clearSessions()` has no try/catch. |
| `utils/scanQuota.ts` | **Do not touch.** Step 17 blocked on App Attest. Its local-calendar-date key conflicts with the UTC key proposed in `app-attest-migration.md` §8. |
| `supabase.ts` | **CREATE** (step 10). SecureStore adapter, `persistSession`, `autoRefreshToken`, `detectSessionInUrl: false`. |
| `auth/link.ts` | **CREATE** (step 10). Sign-in only — no `upgradeAnonymous()`. |

### `apps/mobile/app/` (expo-router; register new screens in `_layout.tsx`)
| File | Next step |
|---|---|
| `history.tsx` | **CREATE** (step 2). The cheapest product win in the repo — scans have been saved since launch and no screen reads them. |
| `_layout.tsx` | Register history, bootstrap identity, add the `AppState` listener for token refresh. **Do not await the network before first paint.** |
| `results.tsx` | Step 3: add the "check with your doctor" line (Guideline 1.4.1). The only screen missing it. |
| `index.tsx` | Privacy link at lines 93–94 already satisfies the in-app link requirement. Leave it. |

### `apps/mobile/hooks/`
| File | Next step |
|---|---|
| `useAnalysis.ts` | Line 306 calls `saveSession()` — **this call site must not change**; that's why the storage rewrite keeps identical signatures. `store.setResults()` runs *before* that await, so silent save failure is already tolerated. Line 185 sets `healthCondition: DEFAULT_CONDITION`. |

### `apps/api/src/`
| File | Next step |
|---|---|
| `app/api/analyze/route.ts` | Step 14: **decide explicitly that this never 401s.** Treat `Authorization` as optional metadata — if it rejects, scanning depends on a token refresh against a second host on restaurant wifi. `isAuthorized()` (~line 334) is the existing `x-app-token` gate; leave it. Line 234 mints the `MenuSession` UUID every upsert depends on — **don't re-mint ids.** |
| `lib/utils/rateLimit.ts` | Leave the IP limiter and circuit breaker — auth replaces neither. **Free win:** once Supabase exists, move the global daily counter into one Postgres row here and go-live blocker #1 closes at no cost. |
| `app/privacy/page.tsx` | Amended this session. Line 15 asserts *Dine Right LLC* — **verified 2026-09-09: registered in Colorado.** Still lacks a registered address / entity number. |
| `app/api/account/delete/route.ts` | **CREATE** (step 11). Secret key, `auth.admin.deleteUser()`, Apple `/auth/revoke`. **Mandatory in the same release as the first account** (5.1.1(v)). |
| `lib/claude/prompts.ts` | **Don't touch as part of this work.** Scoring runs at `temperature: 0` deliberately. |

### `supabase/` — **CREATE** at repo root (steps 4–5, laptop only, nothing ships)
- `migrations/` — **one table with a jsonb payload**, not ARCHITECTURE.md's normalised pair (no column for `rawDishes`/`unreadableItems`/`unrankedItems`, and its `gen_random_uuid()` defaults re-mint the PK and break every upsert). `ON DELETE CASCADE` + an `octet_length` CHECK.
- `tests/` — pgTAP via `basejump/supabase_test_helpers`: RLS enabled, two-user isolation, upsert idempotency, cascade-on-delete. Make `supabase db reset && supabase test db` the pre-push ritual.

---

## Where this stopped

Docs only. Nothing committed. Nothing verified by running it — the API typecheck was run and surfaced only pre-existing `TS6053` missing-generated-file errors, none in the edited file. The last open question was whether to commit; it was never answered.

## Blocked on Sean

Full list in `auth-plan.md` §10. The two that gate everything:

1. ~~**Does Dine Right LLC exist?**~~ **Answered 2026-09-09 — yes, registered in Colorado.** The privacy policy was accurate; `plan.md` and `log.md` were stale and have been corrected. 5.1.1(ix) and EU DSA trader status are unblocked on the operating-entity side.
2. **Is the Apple Developer enrollment Individual or Organization?** App Store Connect → Agreements → Entity Type. **Now the one that gates 5.1.1(ix)** — the guideline is about who submits the app, so an Individual enrollment still trips it even with the LLC in place.

## One correction to the plan's own framing

`useAnalysis.ts:185` passes a hardcoded `DEFAULT_CONDITION` ("high_cholesterol", from `packages/shared/src/config/health.ts:33`) and **no condition picker exists in any screen**. So the health condition is not user input today — the only health-ish value on disk is a constant identical for every user. That makes the iCloud/5.1.3(ii) question narrower than `auth-plan.md` §5 step 3 implies, and it means the live privacy policy describes an input ("You may input a health condition") the app does not have.
