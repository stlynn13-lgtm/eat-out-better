# Eat Out Better — Project Instructions

## What We're Building
"Eat Out Better" is a menu analysis tool that helps people with dietary restrictions make informed, confident meal choices at restaurants. Users input their health profile and a restaurant menu; the app returns ranked dish recommendations with explanations and substitution suggestions.

**v1 scope:** Single health condition (high cholesterol). Web app. Menu text input. No user accounts. Core output: per-dish risk rating, explanation of why (specific ingredients/cooking methods), and substitution suggestions.

## Tech Stack (Decided)
- **Frontend:** Next.js (React) — web-first, mobile-responsive
- **Hosting:** Vercel — zero config, free tier
- **Backend/DB:** Supabase — Postgres + auth + storage, managed
- **AI Analysis:** Claude API — Haiku for cost efficiency, Sonnet for quality-critical calls
- **V1 profile storage:** Browser localStorage (no account required)

## Google Drive Workspace
All documentation lives in Google Drive. Project folder (source of truth):

| Resource | URL |
|----------|-----|
| **Project Folder** | https://drive.google.com/drive/project/1w64UTHj8fF50nvfLySNTy9Rl-gnHxTlC?usp=sharing |

Always reference this Google Drive project for specs, PRDs, roadmap, architecture decisions, competitive research, and brainstorm docs. Use the Google Drive MCP tools (`mcp__247ec016-17f2-476c-97d4-91ee74017aad__*`) to read and update documents. Do not reference or write to Notion.

## Backlog
Feature backlog with RICE scores lives at: `/Users/sean/Documents/Claude/Projects/Eat Out Better/backlog.md`
Reference this before suggesting new features. Add new ideas here before building them.

## Skills to Use (Already Installed)
- `product-management:product-brainstorming` — problem space exploration, assumption stress-testing
- `product-management:write-spec` — PRDs and feature specs (use before any major feature build)
- `product-management:competitive-brief` — deep competitive analysis (run before v1 launch)
- `product-management:roadmap-update` — when priorities shift
- `product-management:stakeholder-update` — when sharing progress externally
- `anthropic-skills:docx` / `pptx` — for any formal documents or presentations

## Product Principles
1. **Non-judgmental:** Inform, don't moralize. Users decide for themselves.
2. **Substitution-forward:** Always offer a way to make a bad choice less bad.
3. **Scalable architecture:** Health conditions are records, not code branches. Menu input is format-agnostic. Design for multi-condition, image input, and history from day one — even if v1 doesn't ship those.
4. **Confidence over perfection:** Users don't need the "best" option. They need a defensible option they feel good about.

## Builder Context
Sean is a Senior PM building his first app. He's learning as he goes on the engineering side. Always:
- Explain the *why* behind architectural and technical decisions, not just the what
- Challenge assumptions and push back before agreeing
- Flag when something will create future debt or limit scalability
- Remind Sean of any actions he needs to take that he hasn't confirmed completing
- Track pending tasks Sean has expressed intent to do (write-spec, competitive brief, etc.)

## Pending Actions (Sean to Complete)
- [ ] Run `product-management:write-spec` for v1 MVP feature
- [ ] Run `product-management:competitive-brief` for the dietary restriction app landscape
- [ ] Decide on Replit vs. local dev environment for building
- [ ] Create Replit account if going that route
- [ ] Review and confirm tech stack decisions above

## Context Window & Token Management
- If this conversation exceeds ~80 messages or feels slow, ask Claude to summarize the session into a markdown file and start a new conversation
- For quick factual lookups, Claude should use lighter reasoning where possible
- Keep Google Drive as the source of truth for decisions — don't re-explain context Claude already has stored there
- Paste Google Drive file URLs into chat rather than re-typing context

## What NOT to Do
- Don't start building before a spec exists for the feature
- Don't add a new health condition without updating the knowledge base architecture first
- Don't paint into corners: no hardcoded cholesterol logic, no single-use components
