# Eat Out Better — Session 01 Context Handoff
*Created: 2026-05-20 | Use this file to start a new conversation with full context*

---

## What We're Building

"Eat Out Better" is a menu analysis web app that helps people with dietary restrictions make informed, confident meal choices at restaurants. User inputs their health profile + a restaurant menu; app returns per-dish risk ratings, explanations of why, and substitution suggestions.

**v1 condition:** High cholesterol only.
**v1 input:** Menu text (paste or type).
**v1 output:** Per-dish risk rating (high/medium/low), specific explanation (e.g. "cream sauce = saturated fat"), substitution suggestion (e.g. "ask for grilled, no butter").
**No user accounts in v1.** Profile stored in browser localStorage.

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | Web app (not native) | Faster to ship, one codebase, mobile-responsive |
| Framework | Next.js (React) | Web-first, Vercel-native, strong ecosystem |
| Hosting | Vercel | Free tier, zero config, Next.js native |
| Backend/DB | Supabase | Managed Postgres + auth + storage, free tier generous |
| AI Analysis | Claude API | Haiku for volume calls ($0.25/MTok), Sonnet for quality-critical |
| Dev environment | Local Next.js + GitHub | Not Replit — too fragile for production-bound work |
| V1 profile storage | Browser localStorage | No auth friction |
| Monthly budget | $20–50 | Enough for Haiku at volume; Sonnet only for critical paths |

---

## Architecture Principles (Non-Negotiable)

1. **Health conditions are records, not code branches.** Each condition (high cholesterol, gluten-free, nut allergy) is a data entry with associated rules — never an if/else in code. Adding a new condition should be additive, not surgical.
2. **Menu input is format-agnostic.** Text paste in v1, OCR image in v2, API lookup in v3. The analysis engine doesn't care how the menu arrived.
3. **User profile is portable.** localStorage in v1, synced to account in v2. Same schema.
4. **v2 authentication is planned, not an afterthought.** Design the data model assuming rows will eventually be owned by a user_id, even if that column is null in v1.

---

## Architecture Layers to Design (For Brainstorming)

- **Frontend:** Next.js, React, UI component system (ui-ux-pro-max skill for design), mobile-first
- **Backend:** Next.js API routes (serverless) → Claude API calls, Supabase client
- **Database:** Supabase (Postgres) — tables needed: conditions, condition_rules, menu_analyses (anonymous for now), user_profiles (v2)
- **AI Layer:** Claude API — prompt engineering is the core IP. Structured JSON output from Claude for reliable parsing.
- **APIs (v1):** Claude API only. No external menu data API yet.
- **Authentication (v2):** Supabase Auth — email magic link or Google OAuth. Design schema for it now, don't ship it v1.

---

## What We Learned About the User in Session 01

- **Primary risk:** Analysis quality. If the recommendations feel vague or untrustworthy, the product has no value. Trust is the product.
- **Usage moment tension:** User said "both at-table AND pre-visit are equally important." This is worth challenging in brainstorming — at-table (phone, 30 seconds, hungry, high anxiety) and pre-visit (desktop, research mode, deliberate) are almost different products with different UX requirements. V1 should pick one and optimize for it.
- **Recommended v1 focus:** At-table use. Highest-anxiety moment, most unique value, clearest design constraint (mobile-first, fast, single clear answer).

---

## Key Open Questions Going Into Brainstorming

1. Do people with high cholesterol actually change their order based on information — or do they know what's bad and order it anyway?
2. Is the substitution more valuable than the rating? ("Ask for grilled instead of fried" vs. "this dish is high risk")
3. How much menu do we need? Full menu vs. just the dishes they're considering?
4. What's the emotional state at ordering time — anxious, resigned, curious?
5. Who else benefits besides the primary user? (Partners ordering with them? Dietitians recommending the tool?)
6. What does "success" look like for the user after using the app? Confident choice? Feeling like they didn't blow their diet? Something to tell their doctor?

---

## Notion Workspace

Hub: https://www.notion.so/36791fcf7cf681008b88f670541c80ec

| Page | URL | Purpose |
|------|-----|---------|
| Product Roadmap | https://www.notion.so/36791fcf7cf681139caaf9dcc9800d4a | Now/Next/Later |
| Architecture Decisions | https://www.notion.so/36791fcf7cf6813899d7dfcdc4e94597 | Stack, schema, open questions |
| PRDs & Feature Specs | https://www.notion.so/36791fcf7cf68184a2baff08f3ebf024 | Specs per feature |
| Competitive Research | https://www.notion.so/36791fcf7cf6812eb64bf69df045c1dd | App landscape analysis |
| Brainstorm & Ideas | https://www.notion.so/36791fcf7cf681e18890c19541699db0 | Session notes, hypotheses |

---

## Backlog

Full RICE-scored backlog: `/Users/sean/Documents/Claude/Projects/Eat Out Better/backlog.md`

Top P0 items by RICE score:
1. Cholesterol knowledge base (RICE: 81) — powers all analysis quality
2. Menu text input + analysis (RICE: 48) — core value prop
3. User profile in localStorage (RICE: 43) — frictionless return visits
4. Substitution suggestions (RICE: 41) — substitution-forward principle
5. Results page UI (RICE: 32) — UX is a differentiator

---

## Pending Actions (Sean)

- [ ] **Restart Cowork** to check if `ui-ux-pro-max` skill registers properly
- [ ] Run `product-management:write-spec` for v1 MVP (after brainstorming)
- [ ] Run `product-management:competitive-brief` for dietary app landscape (before v1 launch)
- [ ] Review and confirm final tech stack decisions
- [ ] Set up GitHub repo for the project
- [ ] Scaffold local Next.js project

---

## How to Use the Brainstorming Skill

In the new chat, paste this as your opening message to the `product-management:product-brainstorming` skill:

---

### BRAINSTORMING PROMPT (copy this into the new chat)

```
/product-management:product-brainstorming

App: "Eat Out Better" — a menu analysis tool for people with dietary restrictions. User inputs their health profile + a restaurant menu; app returns per-dish risk ratings, explanations (specific ingredients/methods), and substitution suggestions. V1 health condition: high cholesterol.

I want to use this session to:
1. Stress-test the core value proposition — do people with dietary restrictions actually change behavior based on information, or do they already know and rationalize?
2. Challenge my usage moment assumption — I said "both at-table and pre-visit use are equally important," but I've been told this might be two different products. Help me pressure-test that and decide what v1 should optimize for.
3. Map the full user journey and find the biggest friction points I'm not accounting for.
4. Surface 2–3 assumptions in my current approach that are most likely to be wrong.
5. Identify what "winning" looks like for this product — what's the metric or outcome that would tell us we've nailed it?

Known context:
- Non-judgmental principle: inform, don't moralize. Users decide for themselves.
- Substitution-forward: always offer a way to make a bad choice less bad.
- Primary risk I'm worried about: analysis quality / trust in the AI's recommendations.
- Architecture is designed to scale to multiple conditions, image input, and history — but v1 is text-only, high cholesterol, no accounts.
- $20–50/month budget for APIs + hosting.
- UI will be designed using the ui-ux-pro-max skill — mobile-first, clean, fast.

Challenge my assumptions before validating them. I want to leave this session with a clearer picture of who the user really is, what they actually need in the moment, and whether my current v1 scope is the right bet.
```

---

## Skills Available for This Project

| Skill | When to Use |
|-------|-------------|
| `product-management:product-brainstorming` | Problem space, assumption stress-testing |
| `product-management:write-spec` | Before any major feature build |
| `product-management:competitive-brief` | Before v1 launch |
| `product-management:roadmap-update` | When priorities shift |
| `product-management:stakeholder-update` | Sharing progress externally |
| `ui-ux-pro-max` | UI/UX design and prototyping |
| `anthropic-skills:docx` / `pptx` | Formal documents and presentations |

---

## Token / Context Management Rules

- Start a new conversation for each distinct work session (brainstorm, spec writing, coding, etc.)
- Always paste a context handoff file (like this one) at the start of a new chat
- Keep Notion as the source of truth — paste URLs, don't re-type context
- Flag to Claude when context feels bloated; ask for a new summary file and start fresh
- Prefer Haiku-class reasoning for quick lookups; Sonnet for analysis and writing

*Session 01 covered: project setup, Notion workspace creation, backlog with RICE scoring, CLAUDE.md project instructions, tech stack decisions, dev environment decision, clarifying questions for brainstorming.*
