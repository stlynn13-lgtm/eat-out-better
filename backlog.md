# Eat Out Better — Product Backlog

**Framework:** RICE (Reach × Impact × Confidence ÷ Effort)
- **Reach:** estimated users impacted per month (scale 1–100)
- **Impact:** how much it moves the core metric — informed meal decisions (0.25=minimal, 0.5=low, 1=medium, 2=high, 3=massive)
- **Confidence:** how sure we are the estimate is right (0–100%)
- **Effort:** person-weeks to ship end-to-end

> Assumptions baked in: Users are motivated by *knowledge and empowerment*, not guilt. They will make their own final call — our job is to reduce uncertainty and give them a better starting point. "Least-bad option" is a real and valuable outcome.

**Platform note (updated 2026-06-23):** This backlog was first written during the web-prototype phase. The product is now a **native iOS app** (Expo SDK 56 / React Native). Language below referring to "browser local storage" or "mobile-responsive web" maps to the native equivalents (AsyncStorage, native screens), and item #16 ("Native mobile app") is effectively **shipped** — it's the current platform, not a future bet.

---

## 🚀 v1.1.0 — In Progress (current release)

Product-improvement release on branch `release/v1.1.0`. These are **committed scope**, not RICE-ranked candidates:

| # | Improvement | What / Why |
|---|-------------|------------|
| A | App logo (1024×1024) | Real brand icon for App Store + home screen; replaces placeholder. Store submission requirement. |
| B | Remove camera white square | Stray overlay reads as a bug; restores clean full-frame capture. |
| C | Native pinch-to-zoom | Sharper menu photos (small print, across a table) → better OCR/analysis, fewer retakes. |
| D | 12-photo-per-scan limit | Caps cost/latency/quality degradation; limit communicated clearly in UI per Figma. |
| E | Rotating "fun facts" (processing screen) | Auto-cycles every 8s; makes the wait feel productive and reinforces the health mission. |
| F | Privacy policy + in-app entry point | Trust + App Store requirement for handling camera/photo data. |
| G | "How it works" slide-up | Surfaces the reasoning behind scores → builds trust vs. a black-box verdict. |
| H | Bug fixes | Stability is the retention baseline (specific list TBD). |

---

## 🔴 P0 — MVP (Build First)

| # | Feature | Description | Reach | Impact | Confidence | Effort | RICE Score | Notes |
|---|---------|-------------|-------|--------|------------|--------|------------|-------|
| 1 | **Menu text input + cholesterol analysis** | User pastes or types menu items; Claude API returns per-dish risk rating (high/medium/low), explanation of why, and substitution suggestions | 60 | 3 | 80% | 3 | **48** | Core value prop. Nothing else matters until this works well. |
| 2 | **Cholesterol knowledge base** | Structured data layer defining what raises vs. lowers cholesterol (saturated fat, trans fat, dietary cholesterol, fiber, omega-3s, etc.) used to inform Claude prompts | 60 | 3 | 90% | 2 | **81** | Powers analysis quality. Must be accurate — this is health-adjacent. |
| 3 | **Dish-level substitution suggestions** | For every flagged dish, suggest 1–3 specific swaps ("ask for grilled instead of fried", "skip the cream sauce", "add avocado instead of cheese") | 55 | 2 | 75% | 2 | **41** | Substitution-forward is a core principle. |
| 4 | **User profile (local storage, no account)** | Store user's health condition(s) and preferences in browser local storage so they don't re-enter it each visit | 50 | 1 | 85% | 1 | **43** | No auth needed in v1. Just persist the profile client-side. |
| 5 | **Results page UI** | Clean, scannable output — color-coded risk ratings, dish names, explanations, substitutions. Mobile-responsive. | 60 | 2 | 80% | 3 | **32** | UX is a differentiator. Don't ship something ugly. |

---

## 🟠 P1 — Post-MVP (Next Quarter)

| # | Feature | Description | Reach | Impact | Confidence | Effort | RICE Score | Notes |
|---|---------|-------------|-------|--------|------------|--------|------------|-------|
| 6 | **Menu image upload (OCR)** | User photographs a physical menu; app extracts text and runs same analysis | 70 | 3 | 65% | 4 | **34** | Huge UX unlock — most real menus are physical. OCR accuracy is the risk. |
| 7 | **Search history** | Save past menu analyses so users can revisit restaurants they've scanned before | 40 | 1 | 75% | 2 | **15** | Repeat-use driver. Requires user account or persistent local storage. |
| 8 | **Second health condition (gluten-free)** | Add celiac / gluten sensitivity as a selectable profile condition with its own knowledge base | 55 | 2 | 70% | 3 | **26** | Natural expansion. Validates the multi-condition architecture. |
| 9 | **"Ask for this exactly" output** | Generate a ready-to-say phrase the user can tell their server ("I have high cholesterol — can I get the salmon grilled with no butter and a side salad instead of fries?") | 45 | 2 | 80% | 1 | **72** | High-leverage low-effort feature. Turns insight into action. |
| 10 | **Dish comparison mode** | Select two dishes and get a side-by-side breakdown of which is better for your condition and why | 35 | 1 | 70% | 2 | **12** | Useful for "I'm torn between two things" scenarios. |

---

## 🟡 P2 — Future Roadmap

| # | Feature | Description | Notes |
|---|---------|-------------|-------|
| 11 | **Restaurant search / menu lookup** | Search by restaurant name and auto-pull menu data vs. manual entry | Requires menu data API (Yelp, Google, Locu, etc.) — complexity jump |
| 12 | **Multiple conditions in one profile** | E.g., high cholesterol + gluten-free + tree nut allergy simultaneously | Architecture should support this from day one even if UI hides it |
| 13 | **Saved favorites / restaurant library** | Bookmark restaurants where user found safe options | Requires accounts |
| 14 | **Shareable results** | Generate a link to share your menu analysis with a partner or family member | Social/viral growth lever |
| 15 | **Nutritional data overlay** | Show actual estimated nutrition numbers alongside risk ratings | Data sourcing is the hard part |
| 16 | **Native mobile app (iOS/Android)** | Ship as a native app wrapping the web experience | Only after web version is validated |
| 17 | **Community-contributed menus** | Users submit and tag menus for shared use | UGC moderation complexity — don't touch until significant scale |
| 18 | **API for restaurant partners** | White-label the analysis engine for restaurant apps or reservation platforms | B2B revenue opportunity long-term |

---

## 🧪 Experiments / Ideas Parking Lot

- "Safe bet" badge — one clearly recommended dish per menu, highlighted prominently
- Cuisine-type onboarding (e.g., "you're going to an Italian restaurant — here are common high-cholesterol traps to watch for")
- Pre-meal coaching mode (what to eat before going out to buffer a less healthy meal)
- Seasonal menu flagging (holiday menus are often worse — surface that)
- Integration with wearables/health apps (Apple Health, etc.) — very long-term

---

## Scoring Notes & Assumptions

All RICE scores assume:
- **Target user:** adults aged 35–65 with a diagnosed or self-identified dietary condition who eat out at least 2x/week
- **Core motivation:** reduce anxiety and guesswork when eating out, not to be perfect
- **Key insight:** users don't need the "best" option — they need a *defensible* option they feel good about choosing. The job is confidence, not perfection.

*Last updated: 2026-06-23 (added v1.1.0 release scope + native-platform note; RICE tables below unchanged from 2026-05-20)*
