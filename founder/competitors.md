# Competitors — Eat Out Better (2026-10-12)

Run of `/founder-competitors`. Public sources only. **Caveat:** apps.apple.com and the iTunes API are blocked from this environment, so App Store facts come from search-engine snippets of the listings and third-party trackers, not the live pages. Re-check prices and ratings on a phone before quoting them.

## 1. Who is there (most direct first)

| Competitor | Type | Price | What it does | Rating |
|---|---|---|---|---|
| [Menu Me AI](https://apps.apple.com/app/id6759431111) | Direct | $29.99/yr, $5.99/mo, 1 free scan/mo | Menu photo, each item scored 1–10 vs your diet profile | n/a |
| [WellMenu](https://apps.apple.com/app/id6757150860) | Direct | Premium = unlimited scans | Menu photo or link → picks by diet goal + allergies | n/a |
| [FoodScan AI](https://apps.apple.com/app/id6761658426) | Direct | n/a | Heart-healthy and low-sodium goals, menu scan | n/a |
| [Menu Scanner – Eat Healthy](https://apps.apple.com/us/app/id6758664227) | Direct | Subscription needed for any result | Macros + swaps per dish | 5.0 (2) |
| [Dishup](https://apps.apple.com/app/id6752625395) | Direct | $19.99/yr, $3.99/mo | Healthy eating out menu scan | n/a |
| [What2Eat](https://apps.apple.com/us/app/-/id6752793894) | Direct | IAPs $3.99–$49.99 | Healthier restaurant picks | 4.6 (60) |
| [MenuFit](https://marlvel.ai/api/llm/apps/health-fitness/com-myhealthymenu-app) | Direct | ~$19.99/yr, $9.99/mo (tracker) | Chain healthy picks | ~33K ratings |
| [MenuScore](https://apps.apple.com/us/app/-/id6759840357) | Direct | Free + IAP | 0–100 scores, 1,000+ chains, seed oils/dyes | 5.0 (1) |
| [Nellie](https://apps.apple.com/us/app/id6748702604) | Direct | Annual after 7-day trial | Gluten, FODMAP, keto, allergens | n/a |
| [Fig](https://foodisgood.com/support/how-much-does-fig-plus-cost/) | Indirect | $39.99/yr, $5.99/mo, 5 free scans/mo | Grocery barcode scanner, 2,800+ diets | 4.7 (16,236) |
| [Cal AI / Menu AI](https://www.eesel.ai/blog/cal-ai-pricing) | Indirect | ~$29.99/yr, hard paywall | Photo calorie/macro tracking | — |
| [Healthy Dining Finder](https://www.obesityaction.org/resources/healthydiningfinder-com-new-online-resource-identifies-healthier-choices-at-restaurants/) | Indirect | Free | Dietitian-vetted chain items (≤8g sat fat), AHA tie-in | — |
| ChatGPT / Gemini / Claude | Substitute | Free | Photo the menu and ask | — |
| Rules of thumb + chain nutrition PDFs | Substitute | Free | "Grilled, not fried; dressing on the side" | — |

At least nine direct menu-scanner apps exist, most launched in 2025–26 and nearly all with tiny rating counts. The category is crowded with apps but has no leader. MenuFit is the only one with real volume.

## 2. Price range (annual plan, comparable app)

Lowest **$19.99** (Dishup, MenuFit) · median **~$29.99** (Menu Me, Cal AI, Menu AI) · highest **$39.99** (Fig). The planned Plus price of $39.99/yr is at the top of the range. The founding price of $29.99 is at the median.

## 3. Positioning map (text)

Axes: **condition depth** (generic "healthy" or macros → a clinical rule for one condition) × **free value before paying** (hard paywall → generous free tier).

- Generic + hard paywall: Menu Scanner – Eat Healthy, Nellie, Cal AI, MenuFit (all paywall at or right after onboarding).
- Generic + some free: Menu Me (1 scan/mo), Fig (5/mo, but grocery not menus), WellMenu.
- Condition-aware + free: Healthy Dining Finder (sat-fat rule, chains only, web, dated), ChatGPT (free, but no rule and no consistency).
- **Condition-specific + free answer at the table: empty.** FoodScan AI is the closest, with a heart-healthy goal inside a general app.

## 4. What their customers complain about (ranked)

1. **Paywall straight after onboarding** (strong, many apps). The MenuFit audit names it the top complaint ([marlvel](https://marlvel.ai/api/llm/apps/health-fitness/com-myhealthymenu-app)). Olive's reviews say the same thing ([marlvel](https://marlvel.ai/apps/olive-holistic-food-scanner/reviews)). Cal AI shows its price only after onboarding ([Nutriscan, competitor blog](https://nutriscan.app/blog/posts/cal-ai-premium-worth-it-2026-photo-scan-vs-price-4b60706465)).
2. **Inaccurate AI estimates, worst on mixed and sauced dishes** (strong). "Anything wrapped, layered, mixed, or sauce-heavy is where every photo-only AI struggles" ([Nutriscan](https://nutriscan.app/blog/posts/cal-ai-premium-worth-it-2026-photo-scan-vs-price-4b60706465)). Eato and FitHub users report wrong counts ([Clarity](https://www.onclarity.com/leaderboard/insight/enerjoy)).
3. **Billing and cancellation trouble** (medium). Users say they were charged after cancelling a trial ([Clarity on Fig](https://www.onclarity.com/leaderboard/insight/figapp)).
4. **Fig's restaurant feature makes you rate a place before you see anything** (thin, one source, [Clarity](https://www.onclarity.com/leaderboard/insight/figapp)).

These themes come from AI-written review aggregators, not primary reviews. Treat them as direction, not counts.

## 5. The gap

**A clinical rule for one condition, explained, with a free answer at the table.** Every scanner is either generic ("healthy", macros, seed oils) or for allergies and intolerances. None is built around saturated fat and LDL with the reason for each dish, and almost all charge before showing value. Two things support this gap: complaint #1 (the paywall comes too early) and complaint #2 (users don't trust generic numbers, while Eat Out Better gives a rating with reasons rather than gram counts that look precise).

**The weak spot in the gap:** the free substitute. Photographing the menu in ChatGPT and asking "what's best for high cholesterol" gets 70–80% of the value for $0. Per `growth-plan.md`, the app matches the dietitian answer key on 75% of dishes. The gap only holds if "What to ask for", consistency (`temperature: 0`) and dietitian sign-off make the answer visibly better than a chatbot's.

## 6. The threat

**MenuFit or Menu Me** could add a "cholesterol" profile in a week, because their engines already score by profile. **Fig** could add menu photos and bring 16K+ ratings of distribution with it. The best protection isn't the feature. It's owning "cholesterol" in search and on clinicians' recommendation lists before they arrive.
