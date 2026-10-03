# /brag plan — Eat Out Better

**What it is:** Photograph a restaurant menu; every dish gets a green/yellow/red heart-health score with the reason why. For people with high cholesterol.
**Angle:** Brunch menus are a minefield of 29 decisions. One photo turns it into a ranked list.
**Hook:** Real dish names from a real scanned menu (Edible Beats brunch eval) slam onto a dark-green screen, then "Have high cholesterol?" — the app's own home-screen headline.
**Highlights (the app's own 3 steps):** 1 Photograph the menu → 2 Every dish gets a score → 3 Order with confidence.
**Punchline:** "Order with confidence." + logo burst (the BrandMark tap animation, traffic-light confetti).
**Tone:** default — punchy, playful, clean. 120 BPM, cuts on the beat.
**Identity:** brand-900 #1B4332, brand-800 #2D6A4F, brand-600 #40916C; score green #16a34a / amber #d97706 / red #dc2626; gray-50 canvas; Inter standing in for SF Pro. Screens rebuilt 1:1 from app/index.tsx, capture.tsx, processing.tsx, results.tsx (Tailwind classes → CSS).
**Data:** dish names, descriptions and scores are the recorded medians in apps/api/evals/baselines/edible-beats-brunch.json. Explanation sentences are illustrative UI text written to the rubric's rules (one sentence, "typically" for assumptions). No "Make it better" box — the API returns substitution: null today.

| # | Time | Scene | Left column | Phone |
|---|------|-------|-------------|-------|
| 1 | 0.0–4.0 | Hook | Dish names pile in on beats 0/0.5/1/1.5; "Have high cholesterol?" at 2.0 | — (full-bleed green) |
| 2 | 4.0–7.0 | Reveal (drop) | Mark spins + confetti, "Eat Out Better", "Photograph any restaurant menu." | Phone rises, home screen staggers in; tap "Scan a menu" |
| 3 | 7.0–10.0 | Snap | ① Photograph the menu | Camera over the paper menu; shutter + flash; thumbnail lands; tap Analyze |
| 4 | 10.0–11.5 | Analyze | ② Every dish gets a score | Processing 0→100%, tip card |
| 5 | 11.5–17.0 | Results | + "Green, yellow or red, and what drives it." | Entrées stagger in → scroll to reds → tap Sides → greens |
| 6 | 17.0–20.0 | Outro | Green panel wipe; mark burst; "Order with confidence."; eatoutbetter.com | — |

**Share caption:** see share-copy.txt
