# Eat Out Better — Growth Plan (proposed)

**Status:** proposed 2026-10-11, not yet decided by Sean. Built from the three `kill-my-idea` runs (idea 2026-10-04; pricing and go-to-market 2026-10-10, all in `plan.md`), `pricing-strategy.md`, `backlog.md`, the website code, and the GTM Launch Tracker (last edited 2026-06-29, so older than everything else here). The interactive checklist version (dated tasks that save when ticked, gates, templates with copy buttons) is a private claude.ai artifact: https://claude.ai/artifact/XWocfwxFrSpHgoJaD7Xmnk. This file is the record.

**How it relates to the other docs:** `plan.md` stays the "what's next" summary and points here. The repeat-use test spec in `plan.md` is unchanged and is Phase 0 of this plan. Where this file disagrees with `pricing-strategy.md`, this file is newer, but nothing in either is decided until a gate below passes.

---

## The call

Interest is not the constraint. Three things are, and every pre-mortem found the same ones: nobody outside Sean and Ray has shown they come back; one scan covers a whole restaurant visit, so use is occasional and a paywall at scan 4 rarely fires; and at today's prices a paid install loses money. Spending to "maximize interest" before fixing those fills a leaky bucket faster.

So the plan does four things, in this order:

1. **Prove repeat use in four weeks** (the existing test, run now, as a channel test too). Hard gate on Friday 13 November 2026.
2. **Fix the money model to work on day 0.** Gate how much of each menu is free, not how many scans. The paywall then appears on every free scan instead of almost never.
3. **Grow on near-free channels that reach diagnosed 45–65-year-olds:** clinicians, "what to order at [chain]" search pages, short-form video, and a share card inside the app. Paid ads only measure until a payer costs under $20.
4. **Ride the calendar:** public launch Tuesday 8 December to bank ratings, paywall live for the January resolution wave, the big push in February (American Heart Month).

**On 1 million users:** not reachable on cholesterol-only iPhone. About 86 million US adults have total cholesterol above 200 mg/dL ([CDC](https://www.cdc.gov/cholesterol/data-research/facts-stats)); after iPhone share and "eats out twice a week", the reachable pool is roughly 15 million (my estimate), so 1 million would be about 7% of it. Plan for 100,000 installs on "heart health" (cholesterol plus blood pressure) by the end of 2027, and 1 million on multiple conditions plus Android in 2028.

**On "failure is not an option":** the plan treats failure as cheap and early, not forbidden. Each gate has its numbers written down before the data exists, so a fail is caught in weeks, not after a year of building.

---

## Weaknesses and their fixes

| # | Weakness (source) | Fix | Owner, date |
|---|---|---|---|
| 1 | No evidence anyone outside Sean and Ray comes back (idea pre-mortem) | Run the repeat-use test now, recruiting 7 testers from each of three sources | Sean, recruit by Sun 18 Oct |
| 2 | One scan = one restaurant visit, so use is rare (pricing pre-mortem #3) | Add home use: tell testers it works on delivery-app screenshots (the photo-library picker already exists), and add a "Try it on a sample menu" button for the launch build | Sean/Claude, screenshot check by Wed 14 Oct |
| 3 | Paywall at scan 4 rarely fires; about 82% of paid-app trials start on install day ([RevenueCat via SaaStr](https://www.saastr.com/of-trials-start-on-day-0-dont-waste-your-shot)) | Free forever: the 3 best picks on any menu, with reasons. Plus: every dish, "What to ask for", full history. First scan fully unlocked. | Spec by Fri 23 Oct; build only after Gate 1 |
| 4 | A paid install costs more than it returns (pricing pre-mortem #2): about $2.38 per Apple Ads install ([SplitMetrics, US Health & Fitness, Q2 2026](https://www.splitmetrics.com/blog/apple-search-ads)) against about $1.47 returned | Organic and clinician channels first; paid only for measurement until cost per payer is under $20 | Standing rule |
| 5 | Channels reach Sean's network, not the user (GTM pre-mortem #1) | Clinicians, chain-menu pages, short-form video, share card. LinkedIn only for partners, press and second-degree tester referrals | From Tue 13 Oct |
| 6 | Thin difference from a free assistant: swaps were removed and the app matches the dietitian answer key on 75% of dishes | Build "What to ask for" (backlog #9, RICE 72, the highest-scored unbuilt item) for launch; sign a named dietitian advisor; run the blind head-to-head | Spec by Fri 23 Oct, advisor by Fri 30 Oct |
| 7 | Waitlist is a dead end: one email, no referral, no offer | Founding price for waitlist members; refer 2 friends to lock it. Update the privacy policy and form copy first, since they promise one email only | Before Mon 30 Nov |
| 8 | **The waitlist does not record `?src=`.** `/get?src=X` redirects to `/?ref=X`, but the form saves `source` as the button placement ("hero" or "final"), so the channel test can't attribute signups | Pass `ref` into the form's `source` (for example `hero.rd-smith`) | Before the first tagged link goes out |
| 9 | The pricing pre-mortem's $300 test sends Apple Ads to a web page, which Apple Ads can't do: its ads only lead to a live App Store listing | Pre-launch, run the price test on Google Search to a web page with a refundable pre-order. Use Apple Ads after 8 December | Nov |

Also stale in `plan.md`: the repeat-use spec says "there is no analytics yet", but the app already sends PostHog funnel events (`menu_scan_started`, `menu_analysis_completed`, `welcome_account_choice` and others, `apps/mobile/lib/analytics.ts`). Check they arrive, then use them as a second usage source in the test.

---

## Timeline and gates

Times are Mountain Time unless marked. Dates assume Gate 1 passes; a 5–7 result pushes everything after it back about four weeks.

### Phase 0 — Prove it (12 Oct – 13 Nov 2026): 2 users → 20 strangers

- **Mon 12 Oct:** try 1.5.0 (1) on a phone (NOW item 0). Publish the pending copy update over the air. Check PostHog shows `menu_analysis_completed` from that scan.
- **Tue 13 Oct:** create the external TestFlight group and submit for Beta App Review. Request a D-U-N-S number for Dine Right LLC (free, starts the Apple Organization switch; see NEXT in `plan.md`). Enroll in the App Store Small Business Program (15% instead of 30%).
- **Tue 13 Oct, 11:00:** LinkedIn recruiting post (template below). Through Thursday, DM 15 registered dietitians, preventive cardiology and cardiac rehab practices, 11:00–13:00.
- **Wed 14 Oct:** ask the moderators of 3 cholesterol communities (one subreddit, two Facebook groups) for permission to post a volunteer request. Test 3 delivery-app screenshots through the app; if they score cleanly, add one line to the tester welcome message: "Works on printed menus and on screenshots of delivery-app menus."
- **Thu 15 Oct:** $150 Meta ad to a tester sign-up page (`?src=meta-test`), running Thursday to Saturday.
- **Sun 18 Oct:** 21 screened testers, 7 per source, each with its own tag.
- **19 Oct – 8 Nov:** test runs. Sunday check-in text at 18:00 local. No nudges.
- **By Fri 23 Oct:** specs for "What to ask for", the share card and the free-tier depth gate. Keyword research on about 30 cholesterol, menu and chain terms (Google Keyword Planner is free); write the pass threshold down before looking.
- **By Fri 30 Oct:** dietitian advisor signed ($500 or 0.25–0.5% advisor equity) to review the guide and the chain pages. First 10 chain pages drafted.
- **By Mon 2 Nov:** Apple featuring nomination for February 2027 (American Heart Month). Apple recommends up to three months ahead, minimum two weeks ([Apple](https://developer.apple.com/app-store/getting-featured)).
- **9–12 Nov:** exit calls, adding "Did you decide what to order before arriving or at the table?" Offer the refundable $29.99 founding annual pre-order (Stripe link) to all 20.

**Gate 1 — Fri 13 Nov.**
- Pass: 8 or more of 20 are repeat users (definition in `plan.md`), at least one source has 50%+ repeat users, and at least 3 pre-orders. Go to Phase 1.
- 5–7: fix the top complaint, re-run with 10 new testers, launch moves to January.
- 4 or fewer: stop feature work; two weeks on a clinician-led or planning-moment version, or stop.

### Phase 1 — Seed (16 Nov 2026 – 15 Jan 2027): 20 → 1,000

- **16–27 Nov:** launch build: "What to ask for", share card ("Top 3 at [restaurant]" image with a link), "Try it on a sample menu", a rating prompt after the second completed scan, and App Store campaign links (`ct=`) for every channel.
- **Mon 30 Nov:** submit to the App Store.
- **Tue 8 Dec:** release (manual release, so the date is ours). Apple Ads at $10/day, exact match on cholesterol, heart-healthy and menu-scanner terms, weighted Thursday to Sunday.
- **Thu 10 Dec, 10:00 ET:** waitlist launch email, timed to land before the weekend's restaurant meals so the first scan happens within 72 hours.
- **By Tue 15 Dec:** 5 practices handing out a QR card (`/get?src=rd-<name>`); 25 chain pages live.
- **1–18 Dec:** paywall build (RevenueCat, founding $29.99/yr with a 7-day trial, shown after the first result). Submit the in-app purchases by Fri 18 Dec, before Apple's holiday slowdown. Ship it only if Gate 1 passed with 3+ pre-orders.
- **Weekly from 8 Dec:** 3 short videos (Tue, Thu, Sat): "I scanned the [chain] menu for high cholesterol."

**Gate 2 — Fri 15 Jan.** 1,000 installs; 60%+ of installs complete a scan within 7 days; 20%+ scan again between days 8 and 30; 50+ ratings averaging 4.6+; half or more of installs from unpaid sources; shares on 5%+ of completed scans.

### Phase 2 — Amplify (Jan – Apr 2027): 1,000 → 10,000

- **Mon 4 Jan:** paywall live for the resolution wave. Health & Fitness installs have run about 89% above the December average in the first week of January ([Adjust, 2021](https://athletechnews.com/adjust-sales-vp-retention-strategies-wellness-apps/)). Raise Apple Ads to $30/day for 1–14 January while cost per install stays under $4.
- **4–15 Jan:** pitch Heart Month stories to Colorado media (Denver Post, 5280, local TV morning health segments), with the dietitian advisor as the quotable expert.
- **Fri 5 Feb (National Wear Red Day):** Heart Month push: press, partner practices' newsletters, the featuring window.
- **Sat 13 Feb:** Valentine's dinner night (the 14th is a Sunday). "Date night" content and ad creative.
- **March (National Nutrition Month):** dietitian partner content push; target 20 referring practices.
- **Chain pages:** 50 by 15 Jan, 100 by 31 Mar.
- **Ad angle test:** $100 each on three angles, to the website: self ("for people watching their cholesterol"), caregiver ("eating out with someone watching their cholesterol"), and GLP-1 (Google Search only, no drug names in ad text; check Google's healthcare policy first). Scale one only if its cost per payer is under $20.

**Gate 3 — Fri 30 Apr.** 10,000 installs; 8%+ of installs start a trial; 35%+ of trials convert; 3%+ of installs pay; 300+ payers; every channel still receiving money has a cost per payer under $20.

### Phase 3 — Expand (May – Dec 2027): 10,000 → 100,000

- Knowledge-base architecture first (CLAUDE.md rule), then blood pressure (sodium), repositioned as "heart health". Target 31 July.
- GLP-1 mode only if the Phase 2 GLP-1 angle beats the cholesterol angle by 2× on signups.
- Clinician program to 50 practices; build a dietitian "Pro" seat only if 10 practices ask for one.
- Android once Android visitors are 30%+ of `/get` traffic (already logged by user agent).
- September 2027 (National Cholesterol Education Month) push.

**Gate 4 — Fri 31 Dec 2027.** 100,000 installs; 4%+ pay (about 4,000 payers, about $120,000 a year at roughly $30 net each); 60%+ of installs unpaid.

### Phase 4 — 1 million (2028)

Diabetes and prediabetes, GLP-1, Android, employer and health-plan distribution, Family plan. 1 million installs at 5% paying is about 50,000 payers, about $1.5 million a year.

---

## Money

- **Prices:** founding annual $29.99 (first 90 days, held while continuous), then $39.99/yr; monthly $6.99 as the decoy; lifetime $79.99 as the anchor. Week pass and Family wait until Phase 3.
- **Paywall:** after the first full result, on every later scan, over the dishes past the top 3.
- **Break-even:** cash costs (about $54/month fixed plus about $0.04 a scan) are covered by about 17 payers. $5,000/month of revenue needs about 2,000 payers, roughly 50,000 installs at 4%. Expect Q3–Q4 2027 if Gates 1–3 pass.
- **Paid-install rule:** at about $28 net per payer in year one, a $2.38 install only pays back above about 8.5% of installs paying. Until a channel shows a cost per payer under $20, it is a measurement budget, not a growth budget.
- **Cash through January:** about $2,700 (tester gift cards $500, recruiting ad $150, Meta angle test $300, Google price test $300, dietitian advisor $500, QR cards $100, Apple Ads 8 Dec–31 Jan about $850).

## Metrics (review every Monday, 09:00)

- North star: weekly scanning users (a completed scan in the last 7 days).
- Activation: share of installs with a completed scan within 7 days. Target 60%+.
- Repeat: scans on 2+ days, one at least 3 days after install. Target 40%+ in the test, 25%+ after launch.
- Share rate: shares per completed scan. Target 5%+.
- Waitlist: 300 signups by Mon 7 Dec; 30%+ of the list installs within 14 days of the launch email.
- Install → trial 8%+, trial → paid 35%+, install → paid 3%+ by April and 4%+ by December 2027.
- Cost per payer by source, under $20.
- Ratings count and average.

Sources: PostHog (app funnel), App Store Connect campaign links (installs by `ct`), the waitlist table once item 8 is fixed, RevenueCat (once live).

## Timing

| What | When | Why |
|---|---|---|
| Ads and content | Thu–Sat, 15:00–20:00 local | When people decide where to eat. A hypothesis: after two weeks of public data, re-time to the actual scan peaks in PostHog |
| LinkedIn | Tue 11:00–17:00, Wed 11:00–16:00, Thu 13:00–17:00 local | Sprout Social's 2026 peaks ([Sprout](https://sproutsocial.com/insights/best-times-to-post-on-linkedin/)); never weekends |
| Emails to users | Thursday 10:00 ET | Lands before weekend meals |
| App releases | Tuesday | Leaves the week to build toward weekend use |
| Rating prompt | After the second completed scan | After value has repeated, not on first use |
| Reminder push (test after Gate 2, opt-in) | Friday 16:30 local | "Eating out this weekend?" A/B against no push |
| Seasonal | Thanksgiving week, 1–14 Jan, 5 and 13 Feb, March, September | Calendar moments for this audience |

## Rules that keep this legal

- **Meta ad copy can't assert a health condition** ("Do you have high cholesterol?" is out); describe the product instead ([summary of Meta's personal-attributes rule](https://www.jonloomer.com/can-we-use-the-words-you-and-your-in-facebook-ads-copy/)).
- **Meta may limit health apps to optimizing for landing-page views**, since its 2025 health and wellness data changes ([vendor summary](https://cardinaldigitalmarketing.com/healthcare-resources/blog/meta-announces-major-changes-healthcare-advertising)); plan Meta as a traffic channel to the website.
- **No ad-network SDKs or pixels in the app.** The FTC's amended Health Breach Notification Rule treats sharing health-app data with platforms like Facebook and Google without authorization as a breach ([FTC](https://www.ftc.gov/node/78112)). Attribute installs with App Store campaign links instead.
- **Privacy label rule** (`plan.md`): any new data collected (a health question on the waitlist, a condition picker, push tokens) updates the policy and the App Store label first.

## Templates

**LinkedIn recruiting post (Tue 13 Oct, 11:00):**

> I built an iPhone app that reads a restaurant menu and scores every dish for its likely effect on cholesterol, with the reason behind each score.
>
> Before launch I need to know if it's useful to people who aren't me. I'm looking for 20 people who have been told by a clinician their cholesterol or LDL is high (or take a statin), eat at a restaurant or order takeout at least twice a week, use an iPhone, and don't know me.
>
> Three weeks. Use it however you like, or not at all, and answer two quick questions each Sunday. Everyone who finishes gets a $25 gift card, used or not.
>
> If that's you, or someone you'd forward this to, comment "menu" or message me. And if you're a registered dietitian or work in a cardiology or cardiac rehab practice, I'd value 20 minutes of your time.

**Dietitian or practice DM:**

> Hi [name], I'm building Eat Out Better, an iPhone app that scores each dish on a restaurant menu for saturated fat and explains why. Eating out is a common sticking point for heart-healthy diets, and I'd like to know whether this would help your patients or get in the way. Could I have 20 minutes this week? If it's useful, I'd send QR cards you could hand to patients. It's free for them, and I'm happy to pay for your time.

**Community moderator message:**

> Hi, I'm the developer of a small iPhone app for people managing cholesterol when they eat out. Before launch I'm running a three-week study with 20 people and paying everyone who finishes a $25 gift card. Would you allow one post asking for volunteers? I'll follow any format you prefer, or drop it if it's not a fit.

**Meta ad (policy-safe):**

> Snap any restaurant menu. Every dish gets a 1–10 score for saturated fat and the reason why. Built for people watching their cholesterol.
> Headline: Know what to order before the server comes back.

## Where this plan is weakest

- **Everything after 13 November depends on Gate 1.** If it fails, the December launch doesn't happen, and that's the point of the gate.
- **Clinicians are slow.** Practices take weeks to say yes and may not refer to an app that matches a dietitian on 75% of dishes. The advisor review and a plain accuracy note on the site are the mitigation.
- **Chain pages compete with established "healthiest order at X" content** and take 3–6 months to rank. Use each chain's published nutrition data, not model estimates, and have the advisor review them.
- **Short-form video needs Sean on camera three times a week.** If that won't happen, cut it and move the hours to clinicians and chain pages.
- **The depth-gated free tier is untested.** It could dampen word of mouth. The pre-order and Gate 3 numbers are the check.
- **Time:** Phases 0–1 need about 15 hours a week from Sean.

## Questions this plan raises

- **Is cholesterol the right wedge for paying users?** About 11% of US adults now take a GLP-1 for weight loss ([Gallup via Becker's](https://www.beckershospitalreview.com/glp-1s/glp-1-use-hits-record-high-in-us-as-obesity-rates-fall-6-things-to-know/)), chains are adding GLP-1 menus ([Tasting Table](https://www.tastingtable.com/2112138/glp1-menu-trend-2026/)), and the existing saturated-fat and deep-fried scoring covers part of that guidance. The Phase 2 angle test answers it for $100.
- **Who owns a wrong green?** One viral "the app told me this was fine" post can do more damage than any channel can repair. Decide the accuracy disclosure before launch.
- **Swaps:** CLAUDE.md still lists "Substitution-forward" as a principle and nothing ships it. Building "What to ask for" resolves that; otherwise rewrite the principle.
