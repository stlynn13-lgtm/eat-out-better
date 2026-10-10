# Eat Out Better — Plan (What's Next)

**What this is:** the plain-language, always-current answer to "what are we doing and what's next?" Written so a non-developer can read it in two minutes and know where we stand. The detailed, filterable version of all this lives in **Eat_Out_Better_GTM_Launch_Tracker.xlsx** — this file is the readable summary that points into it.

**Last updated:** 2026-10-10
**Read with:** `log.md` (what already changed) · the GTM Launch Tracker (full detail) · `CLAUDE.md` (the rules that don't change often).

---

## Test spec: does anyone come back? (repeat-use test)

**Status:** not started. Written 2026-10-04 after a pre-mortem on the idea (`.claude/skills/kill-my-idea`). Owner: Sean.

**The question.** Will a person with high cholesterol, who has no reason to be polite to us, open this app at a real restaurant more than once? Everything built so far (accounts, history, pricing, scoring) assumes yes. Nothing we have measured shows it. Today the only testers are Sean and Ray.

**What it decides.** Whether the next weeks go into the product as it is, into a different buyer or channel, or into stopping. It does not test willingness to pay, and it does not test whether the app beats a free general-purpose assistant. Those are separate tests (see "Not covered" below).

**Who we recruit (20 people).**
- Adults who say a clinician has told them their cholesterol or LDL is high, or who take a statin or similar. Self-reported is fine; we are not collecting medical records.
- Eat at a restaurant, takeaway counter or café at least twice a week. Screen out anyone who rarely eats out, because they can't produce a result.
- iPhone, iOS version the build supports.
- Not friends, family, or anyone who knows the product. Aim for at most 4 of the 20 coming from Sean's own network. Sources to try: online cholesterol and heart-health communities, a local cardiology or dietitian practice willing to pass the invite on, and ads aimed at "high cholesterol" interests.
- A small thank-you ($25 gift card) paid to everyone who finishes the three weeks whether or not they used the app. Paying only the users would inflate the result.

**What they get.** The current TestFlight build (1.5.0 or later). Outside testers trigger Apple's Beta App Review, so start that early. One welcome message: here is the app, use it however you like, and here is how to reach us if it breaks. No reminders to use it, no tips, no check-in nudges about the app itself. The point is to see what happens without a push.

**What we collect.**
1. App usage from the database: saved scans per account, with dates. Everyone gets a silent account, so this works even for people who skip sign-in. To check before we start: that every saved scan carries a timestamp and the restaurant name where one was printed. There is no analytics yet (it's in NEXT), so this is the only usage source.
2. A two-question text or form each Sunday, the same for everyone: "How many times did you eat at a restaurant or order takeaway this week?" and "At how many of those did you use the app?" This gives the denominator. Raw scan counts alone can't tell "uses it every time" from "tried it once and forgot".
3. A 15-minute call at the end of week three with everyone who used it at least twice, and with up to five who didn't. For the non-users the questions are what they did instead and when the app would have helped. Ask what they did last time, not what they'd do in future.

**Dates.** Week 0: recruit, screen, start Beta App Review (about 5 working days). Weeks 1 to 3: run. Week 4: readout.

**What counts as a repeat user.** Scans on two or more different days, with at least one of them three or more days after install, at a real restaurant meal confirmed in the Sunday check-in. Scans in the first 24 hours are curiosity and don't count toward the two.

**Decision rules (set now, before we see any data).**

| Result | Meaning | Next step |
|---|---|---|
| 8 or more of 20 are repeat users | The need exists in this group. | Go ahead with the paywall smoke test and the head-to-head against a free assistant. Keep building. |
| 5 to 7 | Unclear. | Read the calls: if non-users say the app was slow, wrong or awkward, fix that and re-run with a fresh 10. If they say they didn't need it, treat as a fail. |
| 4 or fewer | The premise doesn't hold as built. | Stop adding features. Spend two weeks on a different buyer (a dietitian or clinic that recommends it) or a different moment (before choosing the restaurant, not at the table), or stop. |

**Second reads, in order of how much we trust them.** Scans per restaurant meal from the Sunday answers (above 50% is strong); the share who say the app changed what they ordered; and, on the call, how they would feel if it disappeared. We read these only to explain the main number, not to rescue a fail.

**Known weaknesses, so nobody over-reads the result.**
- 20 people is small. 8 of 20 is a 40% rate, and the true rate could plausibly sit between about 20% and 60%. The test can kill a bad idea; it can't prove a good one.
- People who answer an invite about cholesterol are more motivated than the average sufferer, and people who know they're being studied use things more. Both push the number up. A pass is therefore weaker evidence than a fail.
- Self-reported meals can be wrong, and the Sunday check-in itself reminds people the app exists. Keep the wording flat and don't mention the app in the first question.

**Data and privacy.** Screening answers and call notes live in one private sheet, with no medical details beyond "told cholesterol is high", and are deleted four weeks after the readout. Tell testers up front what we collect and that scans are tied to their silent account. Nothing new is collected inside the app, so the App Store label doesn't change.

**Cost.** About $500 in thank-you cards, plus a few dollars of scan cost (roughly 4 cents a scan), well under the $200/day cap.

**Needs to be true first.** 1.5.0 (1) tried on a phone (NOW item 0); the one-phone-scan sync check from `security-followups.md`; the usage query above works.

**Not covered here (next tests, only if this one passes).** A paywall smoke test (about $300 of targeted ads to a page with the $39.99 annual price; specced in the pricing pre-mortem below). A blind comparison against a free assistant: 15 real menus, a registered dietitian rating which advice is safer and more useful.

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
- **Review the preview** (Vercel dashboard → eat-out-better-web → latest deployment; previews ask you to log in to Vercel). Submit one real email to the waitlist and check it appears in Supabase → Table Editor → `waitlist_signups` (the one place signups live; no per-signup emails).
- **Point eatoutbetter.com at it:** Vercel → eat-out-better-web → Settings → Domains → add `eatoutbetter.com` and `www.eatoutbetter.com`; then in Namecheap → Advanced DNS add exactly the A / CNAME records Vercel shows. **Don't delete the existing MX, TXT (SPF/DKIM) or `send` records**; those carry the sign-in code emails and Resend.
- **Turn on Vercel Web Analytics:** the code is already in `apps/web` (`@vercel/analytics`, rendered in `app/layout.tsx`), so this is one click: Vercel → eat-out-better-web → **Analytics** tab → **Enable**, then let the next production deploy from `main` go out. It records nothing until enabled, and little until eatoutbetter.com points at the project.
- **Speed Insights: deliberately skipped (2026-10-10).** It needs a paid Vercel plan, so it stays off. The `<SpeedInsights />` tag is still in `app/layout.tsx` and does nothing useful while the feature is off; either remove it and the `@vercel/speed-insights` dependency, or leave it until a plan upgrade makes it worth enabling. Use Search Console's Core Web Vitals report for free field data once the domain is verified.
- **Privacy policy:** live; covers the waitlist (one database table, no copies) and the website's cookie-free analytics. **Run `supabase/migrations/20261010000000_waitlist_single_list.sql` in the Supabase SQL Editor** and delete the `notify-waitlist` edge function. **Paste the regenerated `legal/eula-app-store.txt` (Terms 1.1)** into App Store Connect. **One promise to keep:** the policy says waitlist emails are deleted within 90 days of the launch announcement.
- **Pick a clinical reviewer for the guide** (registered dietitian or clinician). It's the biggest remaining ranking lever for the health guide; see `backlog.md` → "Search / SEO growth".
- **After the domain is live:** verify it in Google Search Console and Bing Webmaster Tools and submit `https://eatoutbetter.com/sitemap.xml` (Bing also feeds several AI assistants).
- **Demo video on the site:** the 20-second launch reel is live under How it works (2026-10-10). The separate real-menu recording slot is built and hidden. Compress the video, add a poster and captions, and fill in `DEMO_VIDEO` (`apps/web/README.md` → "Adding the demo video"). Cut a separate raw screen capture for the App Store App Preview.
- **At App Store launch:** follow `apps/web/README.md` → "Going live" (two settings, the official Apple badge, the Smart App Banner).

**Security follow-ups first:** the open items are tracked privately, outside this repo (the repo is public again since 2026-10-05, so open weaknesses aren't written down here). #52 (token required) and #56 (security quick fixes) merged 2026-10-06. **Next: one phone scan** to prove the Vercel token matches the app's (a failure means fix the token in Vercel, see `log.md` 2026-10-06 evening), check `/privacy` still shows, then paste the feedback script (item 4).

0. **Try 1.5.0 (1) on a phone.** Check: a scan of a menu that prints the restaurant's name gets that name; renaming from Saved scans and from the results title; the tabs on results; the new Saved scans and account screens on a small phone; and that "Analyze New Menu" then Back no longer shows the old photos. If the TestFlight submission is stuck at "waiting for an available submitter", upload the build file with Transporter, as with build 14.
1. **Finish the phone test of accounts** (build 14). Two things are still unproven: **restore after reinstall** (scan → sign in → delete the app → reinstall → sign in → the scan is back), and **Delete account after signing in with Apple**, the only way to prove the Apple key.
2. **Try the photo-pick fix on a phone**: reopen the app twice so the update applies, pick two library photos, and the "Adding…" tile should appear as soon as the picker closes.
3. **Move Ray to build 14**, so nobody is left on build 13 and the `ota/1.3.0` line can stop being maintained.
4. **Paste the feedback script** (PR #56 merged 2026-10-06; the sheet still runs the old one until you do) — `scripts/feedback-sheet/README.md`, 5 minutes, signed in as eatoutbetter@gmail.com. The new version also blocks spreadsheet-formula injection; then search the sheet for cells starting with `=` you didn't write.
5. **Real-menu scoring** — Sean and Ray are testing it themselves. Open question: should a restaurant omelet show **green**? The target counted only the eggs' saturated fat (~3g), not the butter it's cooked in.
6. **Calibrate the zoom buttons** (30 seconds, real phone).
7. **Test the leave-mid-scan fix and result handoff on a 1.5.0 phone** (published over the air 2026-10-06; open the app twice so the update applies): start an analysis, swipe home right away, wait 5 seconds, reopen. It should carry on to results with no error, and the Vercel logs for `/api/analyze` should show `Replayed stored result` rather than a second full scan. Repeat with two leaves in one scan. While there, check a scan still backs up to the account (the update also carried the signed-scan sync change). Details: `log.md`, 2026-10-06.
8. **Run the repeat-use test** (spec at the top of this file). It decides whether more build work on accounts, pricing and scoring is worth doing, so it outranks everything on this list except the security follow-ups and item 0, which it depends on.

**Don't undo:** scoring runs at `temperature: 0`. Don't raise it without re-running `npm run test:repeatability`.

**Privacy label rule:** before shipping any build that collects something new (a location prompt, more analytics, a new SDK, a condition picker), update the App Store label and the policy first. Current answers: `privacy-policy-accounts-release.md`.

---

## Pricing pre-mortem: why `pricing-strategy.md` may not pay (2026-10-10)

**Status:** findings written, tests not started. Owner: Sean. Source: the `kill-my-idea` skill run against `pricing-strategy.md`, with web research (links at the end).

**Bottom line.** Treat the profit table in `pricing-strategy.md` as an unvalidated sketch, not a forecast. Chance that the recommended structure reaches its own base case: under 10%, perhaps 25% if organic installs prove out. The single variable that moves it most is how many installs arrive for free.

**The belief everything rests on.** The doc assumes a tight free tier plus a trial-led paywall converts at 2.5× the 2.1% median, about 5.25% of installs. The doc itself calls this multiplier its biggest assumption, and every row of the scenario table is built on it.

**What could go wrong, most serious first.**
1. **The baseline is mislabeled.** The 2.0–2.1% figure is the median download-to-paid rate across all apps and all pricing models, not the rate for generous freemium. Multiplying it by 2.5 puts the base case at about 5.25%, and the high case (3.5% × 2.5 = 8.75%) at the top-10% line, which one summary puts at 9.1%. The "hard paywall converts about 5× freemium" claim comes from that same secondary summary and is unchecked against RevenueCat's own report.
2. **Break-even leaves out the cost of getting the install.** "About 0.9% of installs paying" counts only what it costs to serve the user. Paid US iPhone install costs for health and nutrition apps range from about $2.51 (one vendor's median) to $3–8 (another's). At the doc's own $28 year-one return per payer and 5.25% conversion, an install returns about $1.47. That loses money against any paid install in the range. Only the high case roughly breaks even. So the plan works only if installs are essentially free, which means word of mouth carries the whole business.
3. **The paywall may rarely appear.** One scan covers a whole menu, so one scan is one restaurant visit. Two free scans a month forever covers anyone who eats out twice a month, and the risk rating and one substitution are never gated. Only heavy restaurant-goers ever hit the wall.
4. **The paid tier sells things that don't exist yet.** Three conditions, trends, doctor PDF and Family's caregiver view aren't built, and v1 is cholesterol only. Today "Plus" means "more scans".
5. **The trial is the whole product.** A 14-day trial holds about two meals, which is all the value a user needs before the first charge. RevenueCat's coverage says over half of trial cancellations happen on day one.

**Smaller things to fix in the doc.** The 15% Apple cut assumes enrolment in the Small Business Program; without it, it's 30%. The "no paywall until day-30 retention is above 20%" gate is probably unreachable for an app people use now and then, so either charging never starts or the gate quietly goes. That second point is my inference; I found no retention benchmark.

**Three cheap tests, in this order.**
1. **Paywall frequency, free.** Use the repeat-use test's data (above): count how many testers would reach scan 4 within 30 days. Pass: 40% or more. Under 20% means the paywall almost never fires and the free tier is too generous.
2. **Real acquisition cost, about $300.** Run targeted Apple Search Ads to a page showing the $39.99 annual price with a checkout. Pass: implied cost per paying customer under $20, about 70% of the $28 return. Fail: the plan only works with free installs, and we know that before building a paywall.
3. **Money on the table, free.** At the end of the repeat-use test, offer the founding annual at $29.99 as a refundable pre-order that unlocks nothing (check Apple's rules on outside purchases first). Pass: 3 of the 20. Fail: 0 or 1. At the doc's base case you'd expect about 1.

**What would change this verdict.** Real traffic showing more than 5% of installs starting a trial, testers using it weekly, or a near-free channel such as a dietitian who recommends it to patients.

**The question to answer first.** The doc files the dietitian seat under "test later" with no numbers. If use is occasional and the person who benefits is the patient, a clinician who recommends the app to many patients may fit better than a consumer subscription. Put a number on it before committing to consumer pricing.

**Don't do yet.** Build a paywall, set up RevenueCat, or change the free tier. All three wait on test 2 and the repeat-use result.

**Sources.** [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) · [summary of its benchmarks](https://arpubrothers.com/blog/revenuecat-subscription-app-report-2026/) · [Adapty Apple Ads benchmarks](https://adapty.io/apple-ads-for-subscription-apps/) · [Idea Equity install-cost benchmarks](https://ideaequity.ai/blog/cost-per-install-benchmarks-2026). Vendor blogs, and they disagree widely; check before quoting any number externally.

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
