# Eat Out Better — Change Log

**What this is:** the running, plain-language record of what changed, what we decided, and why. Newest entry on top. Written so a non-developer can skim it and understand the project's history without reading code or commits. This replaces the scattered `session-NN-summary.md` files and the developer-oriented `CHANGELOG.md` going forward.

**How to add an entry** (copy the template at the bottom): date it, say what changed in plain words, why it mattered, and what it sets up next. One entry per working session where something changed.

---

## 2026-06-22 — Documentation system + launch planning

**What changed**
- Established a clear documentation system so our docs stop drifting out of sync (details now in `CLAUDE.md` → Documentation System). Three living docs from now on: `CLAUDE.md` (stable rules), `plan.md` (what's next), `log.md` (this file — what changed).
- Built the **GTM Launch Tracker** (`Eat_Out_Better_GTM_Launch_Tracker.xlsx`): ~70 sequenced activities across 11 phases, with priorities, must-have flags, a cost model, monetization plan, analytics plan, infra checklist, GTM channel sequence, KPIs, and a scoring source-of-truth tab.
- Wrote `Scoring_KB_Generation_Prompt.md` — the prompt that generates a consistent, cuisine-agnostic scoring knowledge base for high cholesterol, hypertension (sodium), and type 2 diabetes/prediabetes.

**Decisions made**
- Scoring will move out of the prompt into a **versioned knowledge base** with deterministic math, so the same dish scores the same every time. (Root-cause fix for inconsistent ratings.)
- We'll **stay accounts-free for launch**, but the "identity trigger point" is now an explicit decision on the roadmap, not an accident.
- Next two conditions after cholesterol: **hypertension, then type 2 diabetes/prediabetes** — chosen because they're the same cardiometabolic user and forgiving of directional accuracy. Severe allergy and any dosing decisions are explicitly out of scope.
- Decided to **skip a dietitian for now**; instead the KB prompt forces a self-verification + dangerous-miss audit, and we'll validate against real menus.

**Corrected stale status** (these were marked open in old docs but are actually done)
- The analyze API is **built and deployed**. EAS is **configured** (recent commit pins react-dom for EAS). The v1 spec (`write-spec`) and competitive brief are **done** (in Drive). Only the app icon's final-vs-placeholder status is still unconfirmed.

**What this sets up next**
- The P0 list in `plan.md`: spend cap, API auth + rate limiting, image cap, the three AI validation tests, the scoring KB, and crash reporting.

**Also done this session**
- Archived the deprecated docs to `archive/` (CHANGELOG, V0-launch-checklist, session-01..05) with a README; verified nothing in code/config reads them. Root folder now shows only canonical docs.

**Still needs Sean**
- Confirm app icon is final or replace it. Run the three AI validation tests. Set the Anthropic spend cap. Decide on LLC. Skim `backlog.md` and fold any still-live ideas into the GTM Launch Tracker.

---

## Entry template (copy me)

```
## YYYY-MM-DD — <short title>

**What changed**
- ...

**Decisions made**
- ... (and why)

**What this sets up next**
- ...

**Still needs Sean**
- ...
```
