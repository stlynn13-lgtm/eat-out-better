---
name: eob-launch-plan
description: Build a prioritized, wide-range go-to-market and launch plan for Eat Out Better (EOB) — channels, sequencing, budget, metrics and kill criteria — grounded in the repo's current state. Use when asked to plan the launch, prioritize marketing channels, build a GTM plan, or decide what to do before/after App Store release.
---

# EOB Launch Plan

Produce a launch plan Sean can act on this week, not a generic marketing template. Lead with the recommendation. Then support it.

## 1. Ground yourself in the repo before writing anything

Read these, in order. Do not re-ask Sean for facts that live here.

1. `plan.md` — current status, what's in TestFlight, what's blocking the App Store.
2. `CLAUDE.md` — product principles (non-judgmental, substitution-forward) and the rules that constrain claims.
3. `backlog.md` — RICE-scored features. Marketing hooks should map to shipped or near-shipped features, not backlog ideas.
4. `pricing-strategy.md` — monetization model and free-tier ceiling. Acquisition spend must fit this.
5. `apps/web/README.md` and the `apps/web` source — what the waitlist page says, and how the waitlist is captured.
6. `privacy-policy-accounts-release.md` and `app-store-legal-checklist.md` — what claims and data collection are allowed.
7. `log.md` (top entries only) — recent changes that affect timing.

If a fact conflicts between files, `plan.md` wins for status and says so in the output. Flag the conflict.

## 2. Frame the problem in these terms before choosing channels

- **Job to be done:** a person with high cholesterol (v1 condition) who eats out wants to order confidently without a dietitian's chart. Acquisition messaging sells that confidence, not "lower your cholesterol."
- **Activation event:** first completed scan that returns a ranked result with at least one substitution. Everything upstream is measured against getting people there.
- **Wedge:** the photo of a real menu. Competitors that rely on typed search or generic "healthy" tags don't have it. Verify this claim against current competitor pages before using it in copy.
- **Binding constraint:** not awareness. Cost per analysis (Claude API spend, capped at $200/day) and App Store conversion are the real limits. A channel that drives volume into a broken scan funnel is negative value.

## 3. Phases and gates

Use relative timing (T-minus / T-plus weeks from App Store approval) unless Sean gives a date. Each phase has an exit gate. Do not schedule the next phase's spend until the gate is met.

- **Phase 0 — Foundation (now):** finish the open P1 items that marketing depends on: waitlist verification, domain live, privacy policy live, analytics on the core funnel (scan started → photo → result → substitution viewed), a launch-day spend/error dashboard. Gate: a real person can join the waitlist and the funnel events fire.
- **Phase 1 — Seed (TestFlight, 10–20 testers):** friends and family, then condition-adjacent people Sean already knows. Collect structured feedback through the existing feedback sheet. Gate: a measurable share of testers complete a scan on their own, without help, and say they'd use it again.
- **Phase 2 — Pre-launch proof:** waitlist growth, ASO groundwork, a small number of hand-made case studies using real menus (with the restaurant's name removed if the menu is identifiable and not public). Gate: waitlist conversion and the scan-completion rate hold up with people who are not Sean's friends.
- **Phase 3 — Launch week:** App Store release, Product Hunt as a credibility spike, one earned press or newsletter push, coordinated posts in communities where self-promotion is allowed. Gate for the next phase: at least 30 days of retention data.
- **Phase 4 — Compounding growth:** search (SEO content on "healthy options at [cuisine] restaurants" style queries the app can answer), ASO iteration, referral mechanics, paid only if the cost per activated user is below the target set in `pricing-strategy.md`.

## 4. Score every initiative

Use ICE (Impact × Confidence × Ease, each 1–10) and add two gates that override the score:

- **Compliance gate.** Any claim about health outcomes, or any creator/influencer post, must pass before it's scheduled. Rules: never say the app lowers cholesterol or treats anything. Use "informed choices," "lower-saturated-fat options," "ask for it grilled." Paid creators must disclose the paid relationship. Do not publish or seed fabricated testimonials or reviews. Apple's health-app guidelines apply to App Store copy.
- **Measurement gate.** If an initiative can't be tied to one funnel metric, it doesn't go into Phase 1–2 at all.

Channels to score (not exhaustive, add what the analysis calls for): waitlist and email to the existing list; TestFlight seeding; App Store search (ASO: title, subtitle, keywords, screenshots); SEO content; community posts in condition-specific forums and subreddits (read each community's self-promotion rules first); Product Hunt; LinkedIn (Sean's own network, in his voice); newsletter or dietitian partnerships; creator/influencer seeding with disclosure; referral; paid social or search (last, and only after the gate in Phase 4).

## 5. Output format

Write the plan in this order. Use the table for the prioritized list; use prose for the reasoning.

1. **Recommendation in three sentences.** What to do first, what to stop or defer, and the single biggest risk.
2. **Assumptions you made**, each with what would change if it were wrong. Mark the two weakest.
3. **Prioritized initiative table.** Columns: rank, initiative, phase, ICE score, owner (Sean / Claude / Ray / external), cost, time, primary metric, kill criterion. Keep the kill criterion concrete ("under 5% of TestFlight testers complete a scan by day 14 → stop and fix the funnel before any outreach").
4. **Sequenced timeline** by phase with gates, not dates.
5. **Metrics dashboard.** Waitlist signups, waitlist-to-install rate, activation rate (scan completed with a result shown), substitution-view rate, D7 retention, Claude API cost per completed scan, cost per activated user, App Store conversion. Each with a target and a source (Supabase, analytics, App Store Connect, Vercel logs).
6. **Risks and what they cost.** Ranked by expected damage, not by how likely they feel. Include App Store rejection on health claims, a scan-quality incident in public, a privacy-label mismatch when a new data collection lands, and the Individual vs Organization Apple account issue already in `plan.md`.
7. **What Sean has to do personally this month.** Only items he has not confirmed completing. Check `plan.md` before listing them.

## 6. Rules for the writing itself

Be direct. Lead with the recommendation. Put the weakest point in the plan first, not last. Don't validate Sean's framing; if the plan's premise is weak (for example, the wedge is copyable, or waitlist size is a vanity metric), say so in the assumptions section. Prefer a specific, opinionated call with a stated trigger for changing it over a menu of options. When a number is an estimate, label it as an estimate.

Do not invent competitor facts, install counts, conversion benchmarks or press contacts. If a benchmark would change the plan and you can't verify it, say what you'd need to check and mark the dependent decision as provisional.

## 7. Where the output goes

Write the finished plan to `docs/launch-plan.md` only if Sean asks for a file. Otherwise answer in chat. Do not update `plan.md` or `log.md` from this skill; those change only when a working session actually changes status or priorities, per `CLAUDE.md`.
