# Eat Out Better — Plan (What's Next)

**What this is:** the plain-language, always-current answer to "what are we doing and what's next?" Written so a non-developer can read it in two minutes and know where we stand. The detailed, filterable version of all this lives in **Eat_Out_Better_GTM_Launch_Tracker.xlsx** — this file is the readable summary that points into it.

**Last updated:** 2026-10-06
**Read with:** `log.md` (what already changed) · the GTM Launch Tracker (full detail) · `CLAUDE.md` (the rules that don't change often).

---

## Where we are right now

**Build 14 (v1.4.0) is on TestFlight, with sign-in live.** Everyone gets a silent account on first launch; Apple, Google or an emailed 6-digit code attaches a login so saved scans follow them to a new phone. A first-launch screen offers "Create free account" or "Continue without an account". Google and Apple sign-in are both confirmed on Sean's phone; Google now uses its own sheet and names "Eat Out Better". The $200/day spend cap is counting. The App Store privacy label and the matching privacy policy are published. Library photo picks now show a loading tile the moment the picker closes (published to builds 13 and 14, not yet tried on a phone). Details: `log.md`, the 2026-10-01 entries.

**Version 1.5.0 (1) is merged (PR #46), built, and submitted to TestFlight on 2026-10-01; nobody has tried it on a phone yet.** What's in it: restaurant names on saved scans with renaming, a redesigned Saved scans screen, category tabs on results, a redesigned account entry and account screen, a slower logo animation, and the "Analyze New Menu keeps the old photos" fix. Details: `log.md`, 2026-10-01 (night).

**Five release lines.** Each build only accepts over-the-air updates published from its own version:
- `ota/1.1.4` → build 9
- `ota/1.2.0` → build 11
- `ota/1.3.0` → build 13 (accounts, Google through the browser). Up to date: the account-screen label and photo-pick fixes were published 2026-10-01.
- `ota/1.4.0` → build 14 (native Google sign-in).
- `main` (1.5.0) → build 1.5.0 (1). **This is the build testers should move to once it has been tried on a phone.** From 1.5.0 on, a build is named by version and number together ("1.5.0 (1)"), because the number restarted at 1.

**Publishing updates:** Sean runs `npm run update:production -- --message "what changed"` himself; Claude isn't permitted to. Without the message it stops and waits for one, and nothing is published until it's answered. Check the printed runtime version matches the build you mean to reach.

**Worth knowing:** EAT-9 ("never rank a dish that isn't on the menu") and EAT-17 ("always assume typical ingredients rather than giving up") pull in opposite directions and both are correct. EAT-9 governs which dishes exist and which text belongs to them; EAT-17 governs how hard to think about a dish that really is on the menu. Keep them apart when either is touched again.

---

## NOW

**Marketing site (new, 2026-10-06):** built in `apps/web`, deploying to the Vercel project `eat-out-better-web`. To finish:
- **Review the preview** (Vercel dashboard → eat-out-better-web → latest deployment; previews ask you to log in to Vercel). Submit one real email to the waitlist and check it appears in Supabase → Table Editor → `waitlist`.
- **Point eatoutbetter.com at it:** Vercel → eat-out-better-web → Settings → Domains → add `eatoutbetter.com` and `www.eatoutbetter.com`; then in Namecheap → Advanced DNS add exactly the A / CNAME records Vercel shows. **Don't delete the existing MX, TXT (SPF/DKIM) or `send` records**; those carry the sign-in code emails and Resend.
- **Privacy policy:** updated on this branch to cover waitlist emails and the website's cookie-free analytics; goes live when the PR merges (the API project serves `/privacy`). **One promise to keep:** the policy says waitlist emails are deleted within 90 days of the launch announcement.
- **After the domain is live:** verify it in Google Search Console and Bing Webmaster Tools and submit `https://eatoutbetter.com/sitemap.xml` (Bing also feeds several AI assistants).
- **At App Store launch:** follow `apps/web/README.md` → "Going live" (two settings, the official Apple badge, the Smart App Banner).

**Security follow-ups first:** `security-followups.md` has the open items, in order with exact steps. Signed scans are live; the repo is private. Still open: confirm the API token in Vercel and merge #52; merge #51; Supabase anonymous sign-up limit and password settings; lower the spend cap; one phone scan to prove sync.

0. **Try 1.5.0 (1) on a phone.** Check: a scan of a menu that prints the restaurant's name gets that name; renaming from Saved scans and from the results title; the tabs on results; the new Saved scans and account screens on a small phone; and that "Analyze New Menu" then Back no longer shows the old photos. If the TestFlight submission is stuck at "waiting for an available submitter", upload the build file with Transporter, as with build 14.
1. **Finish the phone test of accounts** (build 14). Two things are still unproven: **restore after reinstall** (scan → sign in → delete the app → reinstall → sign in → the scan is back), and **Delete account after signing in with Apple**, the only way to prove the Apple key.
2. **Try the photo-pick fix on a phone**: reopen the app twice so the update applies, pick two library photos, and the "Adding…" tile should appear as soon as the picker closes.
3. **Move Ray to build 14**, so nobody is left on build 13 and the `ota/1.3.0` line can stop being maintained.
4. **Paste the feedback script** — `scripts/feedback-sheet/README.md`, 5 minutes, signed in as eatoutbetter@gmail.com.
5. **Real-menu scoring** — Sean and Ray are testing it themselves. Open question: should a restaurant omelet show **green**? The target counted only the eggs' saturated fat (~3g), not the butter it's cooked in.
6. **Calibrate the zoom buttons** (30 seconds, real phone).
7. **Check the leave-mid-scan fix and the result handoff in the simulator** (PR #69; the API half is live once merged, the app half needs `npm run update:production`): start an analysis, swipe home right away, wait 5 seconds, reopen. It should carry on to results with no error, and the Vercel logs for `/api/analyze` should show `Replayed stored result` rather than a second full scan. Repeat with two leaves in one scan. Details: `log.md`, 2026-10-06.

**Don't undo:** scoring runs at `temperature: 0`. Don't raise it without re-running `npm run test:repeatability`.

**Privacy label rule:** before shipping any build that collects something new (a location prompt, more analytics, a new SDK, a condition picker), update the App Store label and the policy first. Current answers: `privacy-policy-accounts-release.md`.

---

## Closed this week (so nobody chases them again)

- **Hide My Email** — `eatoutbetter.com`, `send.eatoutbetter.com` and `no-reply@eatoutbetter.com` are registered as Sign in with Apple email sources (2026-10-01); Apple shows all three passing SPF. Delivery through Apple's relay has not been tested with a real Hide My Email account.
- **Shutter flash** — confirmed working by Sean.
- **The two P1 bugs** ("go back" stalling the second analysis; two loading screens + results flash) — both fixed back in June/July (`8e59003`, `f0bffd4`, `0e1f312`, `b385f09`) and re-checked in today's code: "Analyze New Menu" replaces the results screen before resetting, and only the processing screen navigates to results. If either is ever seen again, it's a new bug.
- **The root lockfile duplicate-React risk** — closed when PR #7 merged on 21 September: the root lockfile now covers only the API and shared package, with no React Native packages in it. PR #25 added one API dependency and kept it that way.
- **The local `ios/` folder that disagreed with what ships** — gone. The repo now lives at `~/Developer/eat-out-better`, a fresh clone with no `ios/` folder, so `eas update` no longer needs anything moved aside. If `expo prebuild` ever recreates it, it's generated from the config and matches.
- **Dine Right LLC** — in **Good Standing** on the Colorado register (formed 24 June 2026; Sean is the registered agent). The first yearly Periodic Report comes due around June 2027; filing it is the one thing that keeps it that way.
- **Domain** — `eatoutbetter.com` is owned (Namecheap, registered 25 June 2026, email forwarding on).
- **Lawyer review** — Sean's decision: no outside review; the Terms and policy rely on the best current guidance in the docs.
- **Apple Developer enrollment** — stays **Individual** for TestFlight (Sean's decision). See the note in NEXT before the public App Store launch.

---

## NEXT — before we go live to the public (P1)

- **Apple Developer: switch to Organization before the public launch.** Individual is fine for TestFlight. Before the App Store, three things argue for converting (Apple support does it; needs a free D-U-N-S number for Dine Right LLC; existing apps and TestFlight carry over): Guideline 5.1.1(ix) asks health-adjacent apps to be submitted by a legal entity; the App Store lists the *seller* — today that would be Sean personally, not the LLC the Terms are written for; and EU trader rules publish the seller's address and phone on the EU App Store, which for an Individual means the home address.
- **App Store submission assets**: final app icon, screenshots, listing copy (with search keywords), age rating, App Privacy questionnaire (answers drafted in `privacy-policy-accounts-release.md`). ✅ Support URL exists (`/support`). `legal/eula-app-store.txt` is the text to paste as the custom EULA.
- **UI transparency**: per-dish reasons ("High — fried + cream sauce. Try grilled.").
- **Basic analytics**: the core funnel events, so we can see whether people complete a scan.
- **Light infra**: branch protection, separate dev/prod keys, one launch dashboard (spend + errors + uptime).

➡️ GTM Launch Tracker, filter Priority = P1.

---

## LATER — after launch, to grow and scale (P2 / P3)

- **Expanded TestFlight** (10–20 testers — note: external testers trigger Apple's Beta App Review).
- **Go-to-market sequence**: friends & family → ASO → LinkedIn → condition communities → Product Hunt (as a credibility spike, not the growth engine).
- **Monetization prep**: decide the model (free at launch → freemium), set the free-tier ceiling from real cost-per-analysis, scaffold RevenueCat with its user ID set to the Supabase account id (accounts now exist, which is what cross-device subscriptions require).
- **More conditions**: add hypertension (sodium), then type 2 diabetes/prediabetes — same engine, new knowledge-base table. **The day a condition picker stores a per-user choice, revisit the privacy label** — today the "Health: not collected" answer rests on every user sharing one constant condition.
- **Scoring knowledge base** — run the ~10-cent decomposition test first (can the model reliably turn a dish into ingredients + cooking method?), and add per-scan dish logging.

➡️ GTM Launch Tracker, filter Priority = P2 / P3.

---

## How this file stays current

Updated at the end of any working session where priorities or status changed (see the Documentation System section in `CLAUDE.md`). If it contradicts the GTM Launch Tracker, the tracker wins for detail — fix this summary to match.
