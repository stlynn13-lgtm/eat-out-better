# Eat Out Better — Pricing Strategy (v2, rethought from scratch)

_2026-10-01. Replaces the 2026-09-30 version. Inputs: the repo's `monetization-strategy.md`, `cost-and-golive-requirements.md`, `GTM-strategy-phase1.md`. No `founder/` input files or `conventions.md` exist. Benchmarks and competitor prices checked 2026-09-30 / 10-01._

> **Unvalidated: do not quote the profit table (section 5) or the break-even (section 4) as forecasts.** A pre-mortem on 2026-10-10 found that (1) the 2.1% baseline is the all-app median download-to-paid rate, not a freemium rate, so the "recommended" base case implies about 5.25% of installs paying, near the top-10% line; (2) break-even leaves out the cost of paid installs, which exceeds what an install returns at this doc's own numbers; and (3) Plus sells features that aren't built. No paywall or free-tier change until the tests in `plan.md` ("Pricing pre-mortem") come back. This document is otherwise unchanged.

**Who pays:** an adult with a diet-affecting condition who eats out, buying through Apple IAP.

**What changed from v1:** v1 kept a generous free tier (15 scans/month) and hoped ~4% would upgrade. That is the weakest option modelled here. The biggest lever is not price, it is **how early the paywall appears**. Ads do not work at all.

## 0. Every way to make money, ranked

| Option | Verdict | Because |
|---|---|---|
| **Trial-led paywall after 3 free scans** | **Do it** | RevenueCat 2026: hard paywalls convert ~5× freemium (median download→paid is 2.0–2.1%) |
| **Tight free tier (2 scans/month forever)** | **Do it** | Keeps the safety answer free and the word of mouth alive for ~$0.06 per active user |
| **Week pass, $3.99 non-renewing** | **Do it** | Fits episodic use (a trip, a holiday) without the "scan anxiety" of credits |
| **Lifetime, $79.99** | **Do it** | Anchor on the paywall; captures people who refuse subscriptions; costs ~$0.40/month to serve |
| Dietitian referral (Nourish, Fay) | Test later | Aligned with trust, but no public payout figure; unverified |
| Dietitian "Pro" seat, ~$29/month | Test later | Real B2B money, but needs a client dashboard and sales effort |
| Banner / interstitial ads | **No** | ~$0.075 per active user/month against $0.20 of scan cost |
| "Watch an ad for a scan" | **No** | A US iOS rewarded view earns ~$0.015–0.02; a scan costs $0.04 |
| Sponsored restaurant placement | **No** | You grade their menus; taking their money destroys the product |
| Selling data | **No** | Health-adjacent data; contradicts your privacy policy |
| Weekly subscription ($4.99/week) | **No** | Earns well in scanner apps through forgotten renewals; wrong for a health brand |

## 1. Model fit

| Model | Fit | Pros | Cons |
|---|---|---|---|
| Flat subscription (hard paywall) | 4 | Highest revenue per install | Nothing free on a health app; risks reviews and organic growth |
| Usage-based | 2 | Tracks cost | Apple has no metered billing |
| Per-seat | 2 | Works for a dietitian plan | Not the consumer product |
| **Freemium, tight + trial** | **5** | Most of the paywall's conversion, keeps a free answer | Free tier must stay small |
| Credits / passes | 3 | Fits episodic use | No recurring revenue; use as add-on |
| One-time purchase | 3 | Easy sell, good anchor | Recurring API cost; cap fair use |

**Recommendation: tight freemium with a trial-led paywall, plus a week pass and a lifetime option**, because it captures most of a hard paywall's revenue while the risk rating stays free.

## 2. Tiers

### Free — $0
- First 3 scans at full quality, then 2 scans/month forever
- 1 condition
- Risk rating + why + 1 substitution, never gated
- Last 3 scans saved
- **Upgrade trigger:** scan 4 shows the paywall with a 14-day free trial

### Plus — $6.99/mo or $39.99/yr (52% off), 14-day trial on annual
- 100 scans/month
- Up to 3 conditions
- Unlimited history and trends
- All substitutions per dish
- 20 Sonnet deep analyses/month
- Doctor PDF, 4/month
- **Why 14 days:** people eat out about weekly, so 7 days may contain one meal; RevenueCat shows longer trials convert better (42.5% vs 25.5%)

### Family — $11.99/mo or $69.99/yr (51% off), self-serve
- 5 profiles, 250 pooled scans, 50 deep analyses, caregiver view, unlimited PDFs

### Add-ons
- **Week pass $3.99:** 7 days of Plus, no renewal
- **Lifetime $79.99:** Plus forever, 100 scans/month fair use

## 3. Competitors (checked 2026-09-30)

| Competitor | Price | You vs. them |
|---|---|---|
| [Fig](https://foodisgood.com/support/how-much-does-fig-plus-cost/) | $5.99/mo, ~$39.99/yr; free = 5 scans/mo | Match annual; your free tier is tighter because each scan costs you money |
| [Cal AI](https://www.eesel.ai/blog/cal-ai-pricing) | ~$9.99/mo, ~$29.99/yr, 3-day trial, hard paywall (third-party report) | Copy the trial-led flow, not the hard wall |
| [Find Me Gluten Free](https://www.findmeglutenfree.com/premium) | $24.99/yr; Family $39.99 | Above: a directory, no per-dish analysis |
| [Yuka](https://help.yuka.io/l/en/article/hkzw2hkj5w-cost-membership) | $10–20/yr | Above: packaged goods database |

## 4. Unit economics (all costs are estimates)

- Cost to acquire one install's usage: 3 scans × $0.04 + 15% start a trial × $0.24 = **$0.16**
- Active free user: 1.5 scans × $0.04 = **$0.06/month**
- Plus: 12 scans × $0.04 + 4 deep × $0.08 = **$0.80/month**; Family **$2.00**
- Fixed: ~**$54/month** + ~$0.01 per active user

| Product | Net after Apple 15% | Cost | Margin |
|---|---|---|---|
| Plus monthly | $5.94 | $0.80 | 87% |
| Plus annual | $2.83/mo | $0.80 | 72% |
| Family annual | $4.96/mo | $2.00 | 60% |
| Week pass | $3.39 | $0.30 | 91% |
| Lifetime | $67.99 once | $0.40/mo | pays for 170 months |

**Break-even:** 17 Plus subscribers cover fixed costs. Each install costs ~$0.26 over its life and a payer contributes ~$28 in year one, so break-even is **~0.9% of installs paying**. v1 needed ~1.5% and lost money below it.

**Target blended ARPU:** $0.79 per monthly active user (base case).

## 5. Scenario model

Monthly figures at month 24 of steady installs, cash basis, $0.04/scan. Format: revenue / cost / **profit**.

- **Low:** 1% baseline conversion, 20% monthly churn, 25% annual renewal
- **Base:** 2.1% (RevenueCat median), 15% churn, 35% renewal
- **High:** 3.5%, 10% churn, 50% renewal

Baseline conversion is what generous freemium gets. Assumed multipliers: hard paywall 4×, recommended 2.5×. **These multipliers are the model's biggest assumption.**

| Installs/mo | Case | Generous freemium (v1) | Hard paywall | **Recommended** | Ads only |
|---|---|---|---|---|---|
| 500 | Low | $187 / $265 / **−$78** | $746 / $322 / **$425** | $537 / $280 / **$257** | **−$147** |
| 500 | Base | $452 / $391 / **$61** | $1,808 / $566 / **$1,243** | $1,248 / $447 / **$801** | **−$191** |
| 500 | High | $918 / $588 / **$330** | $3,672 / $971 / **$2,702** | $2,444 / $714 / **$1,730** | **−$257** |
| 2,000 | Low | $746 / $898 / **−$151** | $2,986 / $1,124 / **$1,862** | $2,149 / $960 / **$1,189** | **−$428** |
| 2,000 | Base | $1,808 / $1,402 / **$406** | $7,234 / $2,100 / **$5,133** | $4,992 / $1,624 / **$3,368** | **−$603** |
| 2,000 | High | $3,672 / $2,189 / **$1,483** | $14,690 / $3,720 / **$10,969** | $9,775 / $2,694 / **$7,081** | **−$867** |
| 10,000 | Low | $3,732 / $4,273 / **−$541** | $14,928 / $5,405 / **$9,524** | $10,743 / $4,583 / **$6,159** | **−$1,922** |
| 10,000 | Base | $9,042 / $6,795 / **$2,247** | $36,168 / $10,286 / **$25,882** | $24,959 / $7,905 / **$17,054** | **−$2,800** |
| 10,000 | High | $18,362 / $10,731 / **$7,631** | $73,448 / $18,385 / **$55,062** | $48,875 / $13,256 / **$35,619** | **−$4,118** |

**What it says**
- **Conversion dominates.** At 2,000 installs, moving baseline conversion 1% → 3% takes recommended profit from ~$1,400 to ~$5,000.
- **Paid retention is second.** Churn 25%/renewal 20% gives $2,669; churn 8%/renewal 55% gives $4,473.
- **Scan cost barely matters once the free tier is tight:** halving it adds ~$240 at 2,000 installs.
- **Hard paywall wins on paper** but only if it keeps at least 65% of the installs the recommended model gets. With Reddit word of mouth as the only channel, that is the risk.
- **Not modelled:** free users converting months later, referrals, Family, and any install growth.

## 6. Psychology

- **Anchor:** Lifetime $79.99 beside annual $39.99, because it makes a year look like half price.
- **Decoy:** monthly $6.99 ($83.88/yr) makes annual obvious.
- **Framing:** "14 days free, then $3.33/mo billed yearly", with a reminder on day 12, because trial transparency protects a health brand's reviews.

## 7. Launch vs. scale

- **Precondition unchanged:** no paywall until D30 > 20%.
- **Launch (90 days):** founding annual $29.99, lifetime $59.99, because early payers are data. A/B the paywall position (after scan 3 vs. scan 6) first: it is the biggest lever.
- **Grandfathering:** founding price holds while the subscription is continuous.
- **Raise prices when:** install→paid > 6% for 2 months → annual $49.99; lifetime share > 25% of purchases → lifetime $99.99; trial→paid > 45% → test monthly $8.99.

Sources: [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps), [RevenueCat benchmarks summary](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026), [AdMob eCPM benchmarks 2026](https://www.revenuelab.fyi/blog/admob-ecpm-benchmarks-2026), [Playwire AdMob eCPM](https://www.playwire.com/blog/admob-ecpm-benchmarks-what-publishers-should-expect).
