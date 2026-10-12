# Launch — Eat Out Better (2026-10-12)

Target: **public App Store release Tue 8 Dec 2026**, conditional on Gate 1 (Fri 13 Nov). Owner: Sean unless noted. Builds on `growth-plan.md`. Physical-business steps (permits, fit-out, staff) don't apply and are left out.

## 1. Test before you spend

**The repeat-use test already in `plan.md` is the test.** The panel adds two things to it:

- **Success line (written now):** 8 or more of 20 are repeat users, 3 or more refundable pre-orders, and at least one recruiting source at 50%+ repeat. Unchanged.
- **Compare with the panel:** the panel said 0/20 would pay and ~12/20 would "try the free scan". If real testers come in well above that, trust them. If they match it, the free tier is the product and the paywall plan needs rethinking.
- **Add to the exit calls:** "Did you scan at the table, or before you went?" and "Would a dietitian's name on it change anything?" These are the panel's two biggest flip conditions.

## 2. Countdown (critical path in **bold**)

| Week of | Task | Owner | Due |
|---|---|---|---|
| 12 Oct | **Try 1.5.0 (1) on a phone**; PostHog check | Sean | Mon 12 Oct |
| 12 Oct | **External TestFlight group + Beta App Review**; D-U-N-S request; Small Business Program | Sean | Tue 13 Oct |
| 12 Oct | Point eatoutbetter.com at Vercel; enable Web Analytics | Sean | Wed 14 Oct |
| 12 Oct | **Recruit 21 testers, 7 per source** | Sean | Sun 18 Oct |
| 19 Oct | **Test runs (3 weeks, no nudges)** | — | 19 Oct – 8 Nov |
| 19 Oct | Specs: "What to ask for", share card, free-tier depth gate, **menu link/PDF scan** | Sean + Claude | Fri 23 Oct |
| 26 Oct | **Sign dietitian advisor** | Sean | Fri 30 Oct |
| 2 Nov | Apple featuring nomination (Heart Month) | Sean | Mon 2 Nov |
| 2 Nov | Head-to-head vs ChatGPT on 15 menus, scored by the dietitian | Sean + RD | Fri 13 Nov |
| 9 Nov | Exit calls + pre-order offer | Sean | 9–12 Nov |
| 9 Nov | **GATE 1** | Sean | **Fri 13 Nov** |
| 16 Nov | **Launch build** (What to ask for, share card, sample menu, rating prompt, `ct=` links) | Claude | Fri 27 Nov |
| 16 Nov | Google pre-order test, $24.99 vs $34.99 | Sean | 16–29 Nov |
| 16 Nov | Apple Developer → Organization; App Store screenshots, listing, keywords | Sean | Fri 27 Nov |
| 23 Nov | 10 chain pages live | Sean + RD | Tue 24 Nov |
| 30 Nov | **Submit to App Store (manual release)** | Sean | Mon 30 Nov |
| 30 Nov | Soft open: TestFlight testers + friends on the release candidate | Sean | Thu 3 Dec |
| 7 Dec | **Release** | Sean | **Tue 8 Dec** |

If Apple review rejects the build, the slack between 30 Nov and 8 Dec is the only buffer. Submit by Fri 27 Nov if the build is ready.

## 3. Launch day run sheet — Tue 8 Dec (Mountain Time)

- 07:00 Check the build is "Ready for Distribution"; check the API is healthy (Vercel), the spend cap is counting, and Supabase is up.
- 08:00 Manual release in App Store Connect.
- 08:30 Install from the store on a clean phone; scan one real menu end to end.
- 09:00 Switch the site to "Download" (apps/web README → "Going live"), add the Apple badge and the Smart App Banner.
- 10:00 Apple Ads on at $10/day, exact match.
- 11:00 Text the testers and friends: "It's live. A rating helps more than anything."
- 13:00 Post the hook 1 video.
- 16:00 Check PostHog: installs, completed scans, errors. Check Vercel `/api/analyze` errors.
- If it breaks: scan errors above 5% → publish the fix over the air with `npm run update:production` (Sean runs it). Spend cap hit → raise the cap only after checking for abuse. Bad review about accuracy → reply with the dietitian method page.

## 4. First 30 days

| Weekly number | Target | Change something if |
|---|---|---|
| Installs | 250 by 31 Dec | under 40 a week |
| Install → completed scan in 7 days | 60%+ | under 45% |
| Scans again days 8–30 | 20%+ | under 10% |
| Ratings | 50 at 4.6+ | under 4.3 |
| Share of installs from unpaid sources | 50%+ | under 30% |

**Reviews:** Day 7 (Tue 15 Dec): which `?src`/`ct` source brings users who complete a scan? Day 14 (Tue 22 Dec): saved-photo vs camera scans. Is "before you go" real? Day 30 (Thu 7 Jan): go / no-go on the 4 Jan paywall, which should already be gated on Gate 1 pre-orders.
