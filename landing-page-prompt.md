# Landing Page Build Prompt — eatoutbetter (apps/web)

Paste everything below the line into a fresh Claude Code session at the repo root. It is written to stand alone. Before running: replace the two `TODO` values in "Inputs" (domain, real screenshots). Everything else is already filled from the repo.

---

## ROLE AND GOAL

You are a senior product designer and Next.js engineer. Build and deploy the pre-launch marketing site for Eat Out Better as `apps/web` in this monorepo, hosted on our existing Vercel account.

Single conversion goal: get a visitor to install the iOS app. Everything on the page either builds desire for that action or removes friction from it. Secondary goals, in priority order: (1) rank for and get cited by AI answer engines for "how do I eat out with high cholesterol" type queries, (2) give the App Store a hosted privacy policy URL, (3) be fast and accessible enough that none of this costs us conversions.

Before writing code, read `CLAUDE.md`, `plan.md`, `app-store-legal-checklist.md`, `legal/`, and `pricing-strategy.md`. Obey CLAUDE.md: product principles (non-judgmental, substitution-forward, confidence over perfection) are the brand voice. Do not invent product claims. If a claim is not supported by the repo, leave it out or flag it.

## INPUTS (verify, do not guess)

- App name: Eat Out Better. Platform at launch: iOS only. No Android claims anywhere.
- App Store URL: `https://apps.apple.com/app/id6778498239` (from `ascAppId` in `apps/mobile/eas.json`). Confirm it resolves; if the app is not yet live, build the page in "pre-launch mode" (see Launch states).
- Domain: TODO — Sean to supply (or use the Vercel project's default domain until bought). Use one canonical domain and 301 every alias to it.
- Brand: green palette from `apps/mobile/tailwind.config.js` (900 `#1B4332`, 800 `#2D6A4F`, 600 `#40916C`) plus the traffic-light risk colors (green `#16a34a`, amber `#d97706`, red `#dc2626`). Logo: `apps/mobile/assets/icon.png`. Reuse these; extend into a full tonal scale and a warm off-white background so it feels like food, not a clinic.
- Screenshots: TODO — Sean to export 3–4 real in-app screens (capture, ranked results with colors, a dish detail with a swap, saved scans) into `apps/web/public/shots/`. Until then, build device mockups from HTML/CSS using the real scoring UI language, and mark them clearly as placeholders in a TODO list at the end of your report. Never ship fabricated dish data that implies a real restaurant's menu.
- Facts you may state: photo or text menu in; per-dish green/yellow/red rating for high cholesterol; plain-language reason (saturated fat, added sugar, deep-fried, fat type); swap suggestions that make a dish less bad; no account required to start; optional sign-in with Apple/Google/email to keep saved scans. Scoring is code-driven from estimated grams of saturated fat, not an AI vibe check; thresholds are published in `scoring.ts`. Confirm against `log.md` before claiming anything beyond this.

## STACK AND STRUCTURE

- Next.js (App Router) + TypeScript + Tailwind in `apps/web`, added as an npm workspace. Static-first: every page statically generated, zero client JS except the interactions below. Deploy as its own Vercel project (root directory `apps/web`) via the Vercel MCP. Do not touch the existing `apps/api` project or its `vercel.json` behavior. Check `vercel.json` at repo root so the new project does not break the API deploy.
- Animation: CSS scroll-driven animations (`animation-timeline: view()`) and View Transitions where supported, with `motion` (Framer Motion) only for the hero phone and the live-demo component. Lazy-load anything below the fold. Provide a graceful no-JS, no-animation fallback.
- Fonts: self-hosted variable fonts via `next/font` (one expressive display face for headlines, one clean sans for body). No layout shift.
- Images: `next/image`, AVIF/WebP, explicit dimensions, hero image `priority`.
- Routes: `/` (landing), `/privacy` (hosted privacy policy — render the real text from `privacy-policy-accounts-release.md`/`legal/`, do not paraphrase), `/terms` if a source exists, `/support` (contact + short FAQ), `/high-cholesterol-restaurant-guide` (the SEO/AEO content page, see below), `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/opengraph-image` and `/twitter-image` (generated).

## PAGE DESIGN — the conversion narrative

Design for a mobile-first audience (most traffic will arrive on a phone from social/search and tap straight to the App Store) while making desktop feel intentional. Aesthetic direction for 2026: confident editorial type, generous whitespace, soft depth, a warm food-forward palette, real product UI as the hero, motion that explains rather than decorates. Avoid: stock photos of salads, generic gradient-blob SaaS look, carousels, popups, cookie-banner theatre (no tracking cookies at launch), and any medical-clinic visual language.

Sections, in order:

1. Sticky minimal header. Logo left, one persistent "Download" button right (App Store badge style, official Apple badge artwork and clearance rules). On mobile the button links straight to the App Store.
2. Hero. Headline that names the outcome in the visitor's words, not ours. Starting point to refine (A/B-ready, keep the variants in a typed `copy.ts` so we can swap): "Know what's safe to order. Before the server walks up." Subhead: one sentence, snap a menu, get every dish rated for your cholesterol, with a swap that makes the risky ones better. Primary CTA: App Store badge. Secondary: "See how it works" scroll link. Beside or below: an animated phone mockup that plays the loop — menu photo → scanning shimmer → dishes sort into green/amber/red with a spring settle. Under the CTA, a single trust line (e.g. "No account needed. Free to try.") only if true per `pricing-strategy.md`.
3. QR code (desktop only). On viewports where a QR makes sense (hover-capable pointer + width ≥ 1024px, detect with CSS `@media (hover: hover) and (pointer: fine)` and a width query; never UA-sniff), show the App Store badge AND a QR card side by side: "Scan with your iPhone camera." On touch devices hide the QR entirely and make the badge the full-width tap target. The QR must encode a tracked redirect, not the raw App Store URL: `https://<domain>/get?src=qr` → server-side redirect to the App Store URL with an App Store campaign token (`?pt=<provider>&ct=<campaign>&mt=8` once we have a provider ID; use the plain URL until then). Generate the QR at build time as inline SVG (no client library), high error-correction level, quiet zone and contrast that scan reliably in dark and light themes, with a visible plain-text fallback URL beneath it. Every other download link uses `/get?src=<placement>` the same way, so we know which placement converts. `/get` should also route Android visitors to a "iPhone only for now — email me when Android ships" capture rather than a dead end.
4. Problem in one beat. A relatable moment (menu in hand, partner waiting, no idea what is in the dish) — two or three lines, no medical lecture. Non-judgmental voice: inform, don't moralize.
5. How it works in three steps. Scroll-driven animation: snap → rated → swap. Each step pins a phone state and animates the transition. Use real UI.
6. The "wow" interaction: a live mini-demo. A static sample menu (clearly labeled "sample menu") where the visitor taps a dish and sees its color, the reason, and the swap, with no install and no network call. This is the single biggest desire builder; make it feel like the app. Include a visible "Do this with any menu" CTA directly under it.
7. Why you can trust the rating. Short, specific, honest: thresholds are published, scoring is rule-based on estimated grams, a human-validated answer key, and the explicit boundary "This isn't medical advice; it's a better starting point for your next order." Link to the method section of the guide page. This is also the E-E-A-T block for SEO.
8. Social proof. Only real quotes or real numbers (e.g. TestFlight tester feedback with permission). If none exist yet, omit the section rather than invent. Leave a typed slot ready for testimonials.
9. FAQ (accordion, native `<details>` elements, content also marked up as FAQPage JSON-LD): Is it free? Does it work with any restaurant? Does it need an account? What about conditions other than cholesterol? (honest: cholesterol first, more later — do not promise dates). Is my data private? Is it medical advice?
10. Final CTA band. Full-width, repeat the badge + QR (desktop), one line of reassurance, and a single sentence restating the outcome.
11. Footer: privacy, terms, support, contact email, a short non-medical-advice disclaimer, copyright.

Persistent mobile bottom bar: after the hero scrolls out of view, show a slim sticky "Get the app" bar that links to the App Store; hide it when the final CTA band is in view. Respect safe-area insets.

## MOTION RULES

- Entrance and scroll motion on transform and opacity only; no layout-affecting animation. Target 60fps on a mid-range iPhone.
- Hero phone loop under 6 seconds, pauses off-screen, respects `prefers-reduced-motion` (swap to a static end-state image, keep color information).
- Micro-interactions: badge hover/press, dish-row selection, FAQ open. Total motion budget under 150KB JS gzipped on the landing route.
- Light and dark mode via `prefers-color-scheme`; the traffic-light colors must keep WCAG AA contrast against both backgrounds and never be the only signal (pair with an icon and a text label like "Lower risk / Moderate / Higher risk").

## CONVERSION AND ANALYTICS

- Privacy-first, cookieless analytics (Vercel Web Analytics or Plausible). No third-party trackers. If anything stores a cookie, add proper consent.
- Track: page view, CTA click by placement (`hero`, `sticky`, `final`, `qr`, `demo`), QR scan (via `/get?src=qr` redirect hits), demo interaction, FAQ open, scroll depth 50/90. Send events via a tiny first-party endpoint or the analytics provider's custom events.
- Apple Smart App Banner: add `<meta name="apple-itunes-app" content="app-id=6778498239, app-argument=...">` so Safari on iPhone shows the native install banner. Evaluate whether it duplicates our sticky bar on iOS Safari and suppress our bar there if so.
- A/B-ready copy (`copy.ts` variants) but ship a single winner; do not build experiment infrastructure now.
- Launch states, driven by one env var `NEXT_PUBLIC_LAUNCH_STATE` = `prelaunch | live`: `live` shows App Store badge and QR; `prelaunch` swaps them for a TestFlight link or an email waitlist capture (a single email field posting to a serverless route; store in Supabase only if a table already exists, otherwise a Vercel-hosted append-only store — ask before adding infra).

## SEO

- One H1 per page, logical heading hierarchy, descriptive internal links, semantic landmarks.
- Unique `<title>` (under 60 chars) and meta description (under 155) per route; canonical URLs; Open Graph and Twitter cards with generated images that show the product, not just the logo.
- JSON-LD: `Organization`, `WebSite`, `MobileApplication` (applicationCategory HealthApplication, operatingSystem iOS, offers, link to App Store), `SoftwareApplication` where appropriate, `FAQPage` on the FAQ, and `Article` + `BreadcrumbList` on the guide page. Validate every block with a schema validator before shipping. Do not mark up ratings or reviews we do not have.
- `sitemap.xml` and `robots.txt` generated by Next route handlers. Preview deployments set `noindex` via header so staging never gets indexed.
- Performance budget (these are SEO and conversion requirements): LCP < 2.0s on 4G mobile, CLS < 0.05, INP < 150ms, Lighthouse mobile 95+ in all four categories. Run Lighthouse against the production URL and report the numbers; fix before declaring done.
- Content page `/high-cholesterol-restaurant-guide`: a genuinely useful, non-judgmental guide (800–1,200 words) on ordering at common restaurant types (steakhouse, Italian, Mexican, Chinese, burger, breakfast, sushi), what to scan a menu for, cooking-method red flags, and five reliable swaps, with the app positioned as the faster way to do the same. Written by a human voice, specific, no keyword stuffing. Include a visible "How we rate dishes" method section and a "last reviewed" date. Add a plain-language note that it is general information, not medical advice. Do not state numeric health claims unless you can cite a source (AHA, NIH, USDA) with a link in the page.

## AI SEARCH (AEO / GEO)

Goal: be the passage an answer engine quotes when someone asks about eating out with high cholesterol.

- Answer-first structure: every H2 on the guide page is phrased as the question people ask, followed by a 40–60 word direct answer, then supporting detail. Short paragraphs, specific numbers with sources, lists and one comparison table where it genuinely helps.
- Entity clarity: state in the first 100 words of the homepage and the guide what Eat Out Better is, who it is for, and what it does, in plain declarative sentences (an extractor should be able to lift it verbatim). Keep the name, description, and category identical across the site, JSON-LD, App Store listing, and `llms.txt`.
- `/llms.txt` (and `/llms-full.txt`): concise, accurate markdown description of the product, pages, how scoring works, pricing, support contact, and canonical links. Keep it factual and in sync with the site; generate it from the same `copy.ts` source to prevent drift.
- `robots.txt`: explicitly allow the major AI and search crawlers (Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Applebot, Applebot-Extended, Google-Extended). If any user has not decided on training opt-out, default to allowing search/answer bots and ask Sean before allowing training-only crawlers. Server-render everything important; no content that exists only after client JS.
- Trust signals AI engines weight: named author or team page, "last reviewed" dates, cited primary sources with links, consistent facts across surfaces, and the published scoring method. Add a short `/about` page (who built it, why, how scoring was validated) if there is real content to support it.
- Submit the sitemap to Google Search Console and Bing Webmaster Tools (list exactly what Sean must do to verify the domain; add the verification meta or DNS record request to the TODO list), and note that Bing indexing feeds several AI assistants.

## DEPLOYMENT (use the Vercel MCP)

1. Find the correct team and existing projects first (`list_teams`, `list_projects`); do not guess IDs. Create a separate project for `apps/web` with the root directory set, framework Next.js. Confirm the existing API project is unaffected.
2. Add the custom domain with `add_project_domain`; if the domain is not purchased, ask Sean before buying anything and present the quote (never auto-buy). Redirect `www` to apex (or the reverse) and force HTTPS.
3. Set `NEXT_PUBLIC_LAUNCH_STATE`, analytics, and any other env vars; never print secrets.
4. Add security headers (CSP without inline script where possible, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS) and long-lived immutable cache headers on static assets.
5. Deploy a preview first, run the QA checklist against the preview URL, then promote to production. Inspect build output and runtime logs before and after.
6. Verify post-deploy: `/get?src=qr` redirects correctly, QR scans from a physical phone (tell Sean exactly how to test), sitemap and robots resolve, JSON-LD validates, Smart App Banner shows on iPhone Safari, OG images render in a link-preview checker.

## QA CHECKLIST (all must pass, report evidence)

- Lighthouse mobile and desktop on production: 95+ across Performance, Accessibility, Best Practices, SEO.
- Keyboard-only navigation works; focus states visible; screen-reader landmarks and labels correct; reduced-motion honored; color is never the sole signal.
- Tested at 360px, 390px, 768px, 1280px, 1920px; no horizontal scroll; the QR is hidden on touch devices and visible on desktop.
- QR scans and lands on the right App Store page from iPhone camera in light and dark mode.
- Every CTA placement logs a distinct `src`.
- No console errors; no third-party requests besides analytics; no layout shift on font load.
- Copy audit: no claim in the page that is not backed by the repo; no "cure", "treat", "lower your cholesterol" outcome claims; disclaimer present; tone is informative, not moralizing.

## DOCS TO UPDATE WHEN DONE (per CLAUDE.md)

Add an entry to `log.md` (what shipped, what the URL is, decisions made) and update `plan.md` (what is now done, what remains). Add `apps/web` to `ARCHITECTURE.md`. Record the hosted privacy URL where App Store Connect needs it and tell Sean to paste it there.

## WHAT TO REPORT BACK

The production URL, Lighthouse scores, the list of placeholders still needing real assets or copy decisions, a numbered list of manual steps Sean must do himself (domain/DNS, Search Console, Bing, App Store Connect privacy URL, final screenshots), and any claim you removed because the repo could not support it.

## CONSTRAINTS

Do not modify `apps/mobile` or `apps/api`. Do not commit secrets. Do not buy a domain or enable paid features without confirmation. Do not add a new dependency without saying why. If a requirement here conflicts with CLAUDE.md, CLAUDE.md wins and you flag the conflict.
