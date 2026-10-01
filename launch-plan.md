# Eat Out Better — Launch Plan (draft)

_2026-10-01. Draft for Sean to react to. Read with `pricing-strategy.md` (prices and the money model) and `plan.md` (what's next overall). Install, conversion and odds figures here are estimates, not measurements._

**Who it's for at launch:** adults with high cholesterol who eat out. One condition, one message: "Point your phone at the menu and see what fits a low-saturated-fat diet."

**Time budget:** 5–6 hours a week. **Money budget:** up to $500 of one-time tests, on top of the ~$54/month running cost.

## 1. Decisions made

- **The paywall is on from the first public day.** The old rule ("no paywall until day-30 retention passes 20%") is dropped. Reason: that bar is very high for an app people use about once a week, every free scan costs about $0.04, and usage alone never shows whether people will pay.
- **Launch prices are the founding prices** in `pricing-strategy.md`: $29.99/year and $59.99 lifetime, with the 14-day trial shown at scan 4.
- **The risk rating stays free.** 3 full scans, then 2 a month forever.
- **Growth has to be unpaid.** The model's base case earns about $1.50 per install in year one, which is less than an install is likely to cost through ads.

## 2. What must exist before the public launch

Already listed in `plan.md` (NEXT): Organization enrollment, App Store assets, per-dish reasons, basic analytics, light infra. This plan adds:

| Item | Why | Rough effort |
|---|---|---|
| Paywall, trial and purchases (RevenueCat, user ID = Supabase account id) | No revenue without it | 15–25 hrs |
| Scan counter for the free tier (3, then 2/month) | The paywall needs a trigger | Included above |
| Funnel events: install, first scan, scan 3, paywall seen, trial started, paid, day-30 return | The numbers in section 5 depend on them | 3–5 hrs |
| App Store listing written for "high cholesterol" and "saturated fat" searches | App Store search is free installs | 2–3 hrs |
| Privacy label and policy re-checked for purchases and the new analytics | Standing rule in `plan.md` | 1–2 hrs |

## 3. Where installs come from

In order of expected payoff per hour.

### 3a. Search pages on eatoutbetter.com
- **What:** one page per restaurant chain: "What to eat at [chain] with high cholesterol". Five better picks, five to skip, simple swaps, then a link to the app for every other menu.
- **Start with 50 chains.** Add hypertension and diabetes pages only when those conditions ship.
- **Use the chains' published nutrition figures** for saturated fat, not the app's estimates, so the pages can be checked.
- **Each page carries the "not medical advice" line** and names the chain only to describe its menu.
- **Effort:** 15–25 hours once, then about an hour a month. **Cost:** none beyond the domain.
- **Risk:** search pages take 2–4 months to bring visitors, and AI answers in search results may take some of the clicks.

### 3b. Dietitians who see heart patients
- **What:** ask 30 dietitians to try the app with a free Plus code and, if they like it, hand clients a one-page sheet with a QR code.
- **Goal:** 5 who recommend it. One recommending dietitian can mean dozens of installs from people who were just told to change how they eat.
- **Effort:** about 1 hour a week of messages and replies. **Cost:** printing only.
- **Also a test** for the dietitian plan in `pricing-strategy.md` ("test later"): if several ask for a way to see client scans, that plan moves up.

### 3c. Cholesterol communities
- **What:** answer real "what can I order at…" questions in cholesterol groups on Reddit and Facebook, with the app mentioned only where the group's rules allow.
- **Effort:** 1 hour a week. **Cost:** none.
- **Risk:** a post that reads as an ad gets removed and burns the account.

### 3d. Short screen recordings
- **What:** 20–30 second clips of a real menu being scanned ("The 3 green picks at [chain]"). No face, no personality: the app is the subject.
- **Two a week,** posted to Shorts, Reels and TikTok. The same scans feed the search pages.
- **Effort:** 1 hour a week. **Cost:** none.

### 3e. One small paid test
- **What:** up to $300 on Apple Search Ads, exact-match searches only (for example "cholesterol diet app").
- **Purpose:** measure install → trial → paid quickly with people who were looking for this. It is a measurement, not a growth channel.
- **Stop** when the $300 is spent.

## 4. Calendar

| When | What |
|---|---|
| Weeks 1–3 | Build the paywall and funnel events. Finish the `plan.md` NEXT list. Write the first 10 search pages. |
| Week 4 | Submit to the App Store. Send the first 15 dietitian messages. |
| Launch week | Friends and family, LinkedIn post, first clips, start the $300 ad test. |
| Weeks 5–12 | Weekly: 2 clips, 5 search pages, 5 dietitian messages, 1 hour in communities. |
| Day 90 | Review against section 5. |

## 5. Numbers to watch

| Number | Healthy | Act if |
|---|---|---|
| Installs per month | 300+ by day 90 | Under 300: growth is the problem, not price |
| Installs that start a trial | 10%+ | Under 5%, or reviews complain: move the paywall from scan 4 to scan 6 |
| Trials that pay | 30%+ | Under 20%: the trial isn't showing enough value; look at what trial users scanned |
| Install → paid | 3%+ | See below |
| Payers still active at day 30 | Most of them | Low: fix the product before spending more time on installs |

**Day-90 rule:** if installs are under 300 a month **and** install → paid is under 3%, stop adding features, keep the app running as is, and move the weekly hours elsewhere.

## 6. What to expect (estimates)

- **Year one, unpaid channels, 5–6 hours a week:** 200–800 installs a month.
- **On the pricing model's base case:** roughly $300–1,300 a month by month 12.
- **$5,000 a month needs about 3,000 installs a month,** and the model reaches that figure at month 24, not month 12.
- **High cholesterol is less urgent than an allergy,** so plan on the model's low case until real numbers arrive.

## 7. Not decided

- Whether the first paid build is 1.5.x or a new version.
- Which 50 chains.
- Whether dietitian codes are free Plus for 3 months or for a year.
