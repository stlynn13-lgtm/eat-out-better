# Eat Out Better — Plan (What's Next)

**What this is:** the plain-language, always-current answer to "what are we doing and what's next?" Written so a non-developer can read it in two minutes and know where we stand. The detailed, filterable version of all this lives in **Eat_Out_Better_GTM_Launch_Tracker.xlsx** — this file is the readable summary that points into it.

**Last updated:** 2026-09-28
**Read with:** `log.md` (what already changed) · the GTM Launch Tracker (full detail) · `CLAUDE.md` (the rules that don't change often).

---

## Where we are right now

**Build 11 (v1.2.0) is on TestFlight** (arrived 22 September) and carries the install ID and the saved-scans screen. Build 9 (v1.1.4) testers still get over-the-air updates from the `ota/1.1.4` branch.

**Merged 2026-09-28** (all live on `main`; the website parts are deployed):

| PR | What | Ships how |
|---|---|---|
| #22 | Terms address gets **Apt B213** and the **phone number (720) 837-1482**; privacy policy stops describing a health-condition input the app doesn't have, and discloses the install ID | Live on the website |
| #23 | Photo preview: **64pt close button** moved in from the corner, **swipe down to close**, **pinch-to-zoom** | Over the air to builds 9 and 11 — not published yet |
| #24 | The **$200/day spend cap**, counted in real dollars, on **Supabase** (no Redis) | Switches on with the Supabase setup |
| #25 | **Accounts**: silent anonymous account on first launch, sign in with Apple, Google, or a 6-digit email code | Needs **build 12** (v1.3.0) and the setup in `ACCOUNTS-SETUP.md` |
| #26 | This file, the log, and the feedback sheet script | — |

**Sign-in and the spend cap are built, not switched on.** Everyone will get an invisible account on first launch; signing in attaches a login to it so saved scans follow you to a new phone; scanning never requires it. Both stay dormant until Sean does the setup in `ACCOUNTS-SETUP.md` (about an hour of clicking, $0/month — the domain `eatoutbetter.com` is already owned, and the spend cap runs on the same Supabase database, so there's no Redis to add). Full reasoning in the `log.md` 2026-09-28 entry.

**Three release lines.** Each build only accepts over-the-air updates published from its own version:
- `ota/1.1.4` → build 9
- `ota/1.2.0` → build 11 (cut from `main` on 2026-09-28 just before accounts merged; already contains the photo viewer)
- `main` (1.3.0) → build 12, once it's built

**Worth knowing:** EAT-9 ("never rank a dish that isn't on the menu") and EAT-17 ("always assume typical ingredients rather than giving up") pull in opposite directions and both are correct. EAT-9 governs which dishes exist and which text belongs to them; EAT-17 governs how hard to think about a dish that really is on the menu. Keep them apart when either is touched again.

---

## ⏰ Before cutting the next build (build 12) — Sean asked to be reminded

Build 12 is the next chance to ship anything native. Decide these first:

1. **Welcome screen design** — feature chips → numbered steps, the "have high cholesterol?" headline, and whether the background reads too dark (couldn't be reproduced — it's near-white). Pure app code, so it can also go out over the air later, but the design is still owed.
2. **Landscape photo capture (EAT-14)** — **this one can only ship in a build.** The app is locked to portrait in native config, so if landscape is wanted in build 12, the design has to exist before the build is cut. Otherwise it waits for build 13.
3. **The Google button's logo.** "Continue with Google" is text-only today. Google's branding guidelines want their "G" mark on it; it needs an image asset (a design decision, and a download).

(The Terms phone number, the fourth item here, is done — (720) 837-1482, a Google Voice number.)

---

## NOW

1. **Accounts + spend-cap setup** — `ACCOUNTS-SETUP.md`, in order. It switches on both. Then build 12, and on the day it reaches testers: deploy the accounts privacy policy (`privacy-policy-accounts-release.md`) and change the App Store privacy answers. Until the setup is done, the Anthropic account limit is the only global spend ceiling (confirmed set, 2026-09-28).
2. **Paste the feedback script** — `scripts/feedback-sheet/README.md`, 5 minutes, signed in as eatoutbetter@gmail.com. Until then the six extra feedback fields keep arriving and going nowhere.
3. **Publish the photo-viewer update** over the air to build 11 (from `ota/1.2.0`, which already has it) and, if wanted, build 9 (copy `PhotoViewer.tsx` onto `ota/1.1.4` first). Try it on a phone first.
4. **Push the database-test workflow.** `.github/workflows/supabase-db-tests.yml` exists locally but GitHub refused it: the saved GitHub login lacks the `workflow` permission. After `gh auth refresh -h github.com -s workflow`, commit and push it — then the database security tests (saved scans + spend cap) run on every PR.
5. **Real-menu scoring** — Sean and Ray are testing it themselves and will report what looks wrong. The open question from the rubric rewrite still stands: should a restaurant omelet show **green**? The target counted only the eggs' saturated fat (~3g), not the butter it's cooked in (1–2 tsp brings it to ~6–8g, which is honestly yellow). Worth watching on real brunch menus.
6. **Calibrate the zoom buttons** (30 seconds, real phone). Pinch until the framing looks like a true 2×, read the percentage badge, divide by 100; same for 3×. Those two numbers ship over the air.

**Don't undo:** scoring runs at `temperature: 0`. At 0.2 roughly a quarter of a real menu had coin-flip tier colours. Don't raise it without re-running `npm run test:repeatability`.

---

## Closed this week (so nobody chases them again)

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
