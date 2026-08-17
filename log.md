# Eat Out Better — Change Log

**What this is:** the running, plain-language record of what changed, what we decided, and why. Newest entry on top. Written so a non-developer can skim it and understand the project's history without reading code or commits. This replaces the scattered `session-NN-summary.md` files and the developer-oriented `CHANGELOG.md` going forward.

**How to add an entry** (copy the template at the bottom): date it, say what changed in plain words, why it mattered, and what it sets up next. One entry per working session where something changed.

---

## 2026-08-17 — Categories, and the discovery that scores weren't repeatable

**What changed**

Two things shipped or landed, and one investigation stopped short on purpose.

**Scores now repeat.** Chasing why the new category groups looked wobbly, the ranking call turned out to run at `temperature: 0.2`, commented "low but not zero — allows nuanced scoring". Measured, that comment was wrong. `test:repeatability` had existed since July to answer exactly this and had never been run for want of an API key; Ray got one. At 0.2 a cheese pizza spanned a full point across 12 runs and a spinach omelet changed tier colour. On Sean's real 24-dish menu it was far worse: Lox Benedict ranged 3.0–5.0, and **roughly a quarter of the menu had score ranges straddling a tier boundary** — whether you saw red or amber depended on which scan you happened to run. At temperature 0 every one of the 24 dishes returned range 0.0 across 8 runs. One character. **Live on main.**

**Dishes are grouped by category, and alcohol is no longer ranked (EAT-20).** The rubric is saturated-fat-driven, so anything with near-zero fat scores near 10 whether or not it is food — which is why Sean's top four were two mimosas, seasonal fruit and half an avocado. Dishes now carry a category and are ranked within it; alcohol and standalone sauces are filtered out before the ranking call and returned separately, shown and labelled. Categorisation is deterministic code rather than a model call, so all 44 of its cases are tested with no API key. **On `feat/eat-20-dish-categories`, pushed but deliberately not merged** — merging would break TestFlight build 8, which would render "Enjoy Occasionally" on every category winner and silently drop the five drinks.

**Decisions made**

- **The positive badge is comparative, not evaluative.** "Best main" on an amber card, awarded to the top dish in each category regardless of tier, with the colour carrying how good that best actually is. A green-only rule left a menu with no green entrée offering no steer toward a meal at all, and this app's job is a defensible option rather than a perfect one.
- **Categorisation is code, not prompt.** OCR reads the section heading (a fact); `config/categories.ts` maps heading plus item name to a category (judgment as rules). Deterministic, offline-testable, and traceable when a dish lands in the wrong group.
- **The description never moves a dish's category.** "Steak, brandy cream sauce" stays a main — losing a real meal option is the worst outcome available. The brandy still affects the score, which is a separate path.
- **Scan volume is the gate on the scoring KB, not conviction.** See open questions.

**Open questions**

- **The KB investigation stopped short of the one test that matters.** The whole architecture assumes the model reliably decomposes a dish name into ingredients and a cooking method; if it decomposes "hot honey" into butter, a lookup table faithfully scores butter. Nobody has tested that. It is ~10 cents against the existing 29-dish corpus. Also note temperature 0 spent the *determinism* argument for a KB — what survives is multi-condition scaling (adding hypertension today means a second 1,450-token rubric tuned blind; with a table, sodium is another column), bounded fabrication, auditable weights, and one fewer model call.
- **There is no server-side scan persistence**, so a KB cannot be grown from real misses and every unrecorded scan is gone permanently. That logging is the same work as the per-scan cost logging already flagged ship-before-launch in `cost-gtm-condensed.md`.
- **EAT-20 needs a results-screen update** to display the groups — Ray is taking that to Sean. Until then the branch stays unmerged.
- **Still open from EAT-19:** four OCR transcription slips, and suspected inflated saturated-fat figures on the bacon and the sweet potato fries.

---

## 2026-08-15 — EAT-19: every dish with a menu description was coming back unscored

**What changed**

Sean scanned a brunch menu and got a screenshot Ray described as "pretty terrible results" — 29 dishes found, 8 with real scores, **21 showing "We couldn't score this one" at a flat 5.0.** The working theory was that Haiku wasn't good enough and we should try Sonnet.

It wasn't a model problem. Cross-referencing all 29 results against the menu photo, the split was perfect and had nothing to do with dish difficulty: **every dish printed with a description failed; every dish printed as a bare name scored.** All 8 that worked (Bottomless Classic Orange, Half Avocado, Seasonal Fruit, Home Fries, the bacon, the sausage, the sweet potato fries) are bare names on that menu. "2 Eggs" is the tell — an ordinary side like the others, but it carries "VITAL Farms Pasture Raised," and it failed.

The cause: the ranking prompt printed each dish as `2. 2 EGGS — VITAL Farms Pasture Raised` on one line, immediately next to a rule saying to copy the input dish name exactly. The model read the whole line as the name and echoed it back. We compared that to `2 EGGS`, found no match, discarded it as an off-menu hallucination, and re-added it unscored. A bare name has nothing to conflate, so it survived.

**Two fixes.** The prompt now puts the description on its own labelled line, so there is nothing to conflate. And the matcher recognises a name echoed with that dish's own description as a match — the prompt change is prevention, the matcher change is the safety net, and neither depends on the other working.

**Decisions made**

- **Not Sonnet.** OCR delivered all 29 dishes with legible, correct names and descriptions, no "couldn't read" items, and a count matching the menu exactly — the loss happened downstream in our own code. Switching models could have *masked* it (a different model might echo the name cleanly) at 3× the cost per scan, while leaving the defect live for every other menu. Worth stating plainly because the screenshot was genuinely persuasive in the other direction.
- **You cannot evaluate model quality through this bug.** Two thirds of the ranking output was discarded before reaching the screen, so that screenshot showed the fallback text, not Haiku's judgement. Any Haiku-vs-Sonnet comparison run before this fix would have measured both models through the same lossy filter.
- **The rescue is two narrow checks, not one loose one.** A general "the input name is a prefix of the echo" rule would have been simpler and would also accept "HOUSE SALAD LARGE" for a slot holding "HOUSE SALAD" on a menu listing both — a confident score on the wrong dish, which on a health app is worse than an unscored dish. The description check is an exact comparison against that dish's own name+description.
- **An ambiguous echo is discarded, not guessed.** If the item number says slot 1 but the name is plainly dish 2, neither is trusted and both dishes fall back. Pinned by a test.
- **Sean's menu is now the second eval corpus** (`edible-beats-brunch.json`), and the better of the two: 21 of its 29 dishes carry descriptions. `bcd.json` is names-only — it would have passed at 100% through this entire bug, and now carries a note saying so.

**Open questions**

- **This fix makes 29 scores appear; it does not make them right.** Whether they're any good is still the unanswered EAT-17 question and still needs an API key. `npm run eval -- --menu edible-beats-brunch` answers it for about 4 cents.
- **The prompt half is unverified.** `npm run replay:eat19` proves the matcher rescues the exact 8/29 → 29/29 case with no key or network, but whether the model now stops conflating needs a real call. It doesn't gate the merge, because the matcher catches it either way.
- **Ray has no API key** — the Anthropic key is Sean's, and `client.ts` requires a static key with no OAuth-profile fallback. Every eval run currently routes through Sean, which is the same friction that left six prior prompt changes unmeasured. A personal dev key for Ray removes it permanently.
- **Separate, smaller, real: OCR made four transcription errors** on a clean, well-lit menu — "Crumpet"→"Cornmeal", "Masala Potatoes"→"Potato Potatoes", "Tender Belly Ham"→"Smoked Ham", "Short Rib"→"Short Ribs". Vision quality *is* where Sonnet would help, but note `image.ts` caps uploads at 1568px while Sonnet 5 reads to 2576px, and raising that runs into Vercel's ~4.5MB body limit. Needs its own ticket.

---

## 2026-08-10 — EAT-18: real dishes were coming back "We couldn't score this one"

**What changed**

Ray pulled build 8 and, playing with it, noticed some dishes showing "We couldn't score this one — treat this as a neutral score" and a flat 5.0. **Those dishes had been scored correctly. We were throwing the score away.**

Scoring a menu takes two AI calls — one reads the photos, one scores the dish list. They share no memory, so when the second call hands back its scores we have to work out which result belongs to which dish. We were matching them **by name**. Before comparing, both names were stripped down to plain letters and numbers — and that step *deleted* accented characters instead of folding them. "Crème Brûlée" became `crmebrle`; the scorer's perfectly reasonable "Creme Brulee" became `cremebrulee`. No match. EAT-9's anti-hallucination guard then did exactly what it was built to do — discard a dish it didn't recognise — and the dish was re-added, unscored. Eight of eleven realistic menu names failed this way; anything with an accent, an `&`, or a "(GF)" tag.

**This was a genuine regression from build 8, caused by two changes that were each individually correct.** EAT-9 made the matching strict (before, an unrecognised name was just kept, so a rename was a harmless cosmetic wart). And the new menu-reading prompt started demanding *verbatim* transcription — the right call for accuracy, but it deliberately pushes accents, ampersands and ALL-CAPS into dish names, which is exactly the material the scoring call tidies up one step later. One change made names messier; the other made matching unforgiving.

The fix keys off the **item number** we already print next to each dish (`1. Grilled Salmon`) rather than the name. We were numbering the dishes all along and simply never asked for the number back.

**Decisions made**

- **The number is cross-checked against the name, not trusted on its own.** This was the important call, and it changed the plan mid-implementation. Swapping keys only helps if the new key fails *better*, and an index doesn't: a name mismatch fails **visibly** ("we couldn't score this"), while a drifted index fails **invisibly** — it puts a real score on the wrong dish. On a health app that's a worse bug than the one being fixed. So: the number finds the candidate, the name confirms it, and if they disagree we fall back to exact name matching. If that fails too, the dish goes unscored. We never guess which dish a score belongs to.
- **We stopped asking the model to sort the results.** The prompt demanded results sorted best-to-worst, which meant carrying each item number correctly *through a re-sort* of up to 35 dishes — precisely the bookkeeping that makes indexes drift. And the code threw that ordering away anyway, re-sorting by score before anyone saw it. We were paying the risk for nothing.
- **The item number never reaches the user** (Ray's requirement). It's an internal join key — the model's line number, not a menu position — and showing it would read as a rank nobody could explain. It's resolved to a dish and discarded inside the scoring step, never stored on any object, and a test asserts no scored dish carries it.
- **The anti-hallucination guard is untouched.** A dish that genuinely isn't on the menu is still dropped. We changed how dishes are recognised, not what's allowed through.
- **One deliberate side effect:** the name-folding rule is shared with the menu-reading step, so treating `&` as "and" also merges them there. A menu photographed twice that transcribed "Fish & Chips" once and "Fish and Chips" once now collapses to one dish instead of listing both. That's a fix; it changed an existing test, which was updated.

**Open questions**

- **We had no evals — a harness now exists, but it has never been run.** Ray flagged the gap while this was in flight. The repo's three test scripts couldn't answer "did this prompt change help?": two check plumbing (`test:dedupe`, the new `test:dishmatch` — pure logic, no API key) and the third measures score *wander* between identical runs (`test:repeatability`). There was no menu corpus and no reference scores; the closest thing, `rubric-ab-test.ts`, was deleted on 2026-08-04. So the rubric rewrite, EAT-17 and today's change all shipped unmeasured.

  Built `apps/api/evals/` — `npm run eval`, with Ray's usual BCD Tofu House menu as the first corpus (32 dishes, transcribed from a photo). It asserts **tiers, not exact scores** (scores wander, and a flaky eval gets ignored), takes a median across several runs, and drives the real `rankDishes()` so it covers the live prompt *and* the name matching — EAT-18 would have shown up here as a tier flip.

  **Two things stop it being trustworthy yet, both needing a human, not a model:** the dish names were read off a photo and need checking, and the *expected* tiers are the one part an AI must not write — otherwise the eval marks its own homework. Four uncontroversial ones are seeded as proposals; the rest is baseline-only until someone has an opinion. Not run yet — no API key on this machine.
- Build 8 is live in production (`/api/health` reports `d83c44f`). This fix is on `fix/eat-18-unscored-dishes` and is **not** deployed — merging redeploys the API.

---

## 2026-08-05 — Reviewed the five "In Review" tickets, found four things that weren't actually finished; built EAT-13

**What changed**

Sean asked for a review of the tickets sitting in **In Review** (EAT-15, EAT-12, EAT-10) and for EAT-9, EAT-17 and EAT-13 to be finished. Reading each ticket against the code turned up six real gaps — in most cases the ticket's headline behaviour worked and a case around it didn't, and in two cases **the ticket asked for something that was never built at all**.

- **EAT-10 (leave-and-return during analysis) was aborting scans that were perfectly healthy.** The app listened for "came back to the foreground" and killed the in-flight request. But iOS fires that same signal for Control Center, the notification shade, an incoming call banner and permission dialogs — none of which actually interrupt anything. So pulling down a notification mid-scan threw away a good analysis, re-uploaded every photo and paid for a second round of AI calls. The budget is three retries, so **four notifications during one scan failed the scan outright.** Now only a genuine background→return counts.
- **EAT-10 had a second hole in a place nobody had looked: reading the reply.** The fix covered sending the request, but not downloading the answer. iOS suspends that download exactly the same way — and because the app had already "released" the request by then, nothing could interrupt it. Leaving the app during those few seconds froze it at 92% forever, which is the original EAT-10 complaint, just later in the process. The reply is now downloaded while the request can still be interrupted.
- **EAT-9's wrong-description guard could be walked around two ways.** The guard drops a dish's description when the same dish turns up with two different ones (that's the "coffee shown as an arugula salad" bug). But it only ever compared a dish against the first copy it happened to meet, so: a bare "Coffee" arriving *before* the wrongly-described one let the bad description in unopposed, and — worse — once a conflict had cleaned a description off, the *next* page repeating it put it straight back. A three-page menu could re-poison the dish the guard had just fixed. Now all descriptions for a dish are gathered first and kept only if they agree, which can't depend on page order.
- **EAT-9 could also silently lose a real dish.** The menu-reading step and the ranking step were matching dish names by different rules, so "Caesar Salad" and "Caesar-Salad" counted as two dishes in one step and one in the other. The odd one out had nowhere to go and vanished from the results with no warning — which quietly breaks EAT-9's actual promise, that what you see is exactly what was read off the menu. Both steps now use one shared rule.
- **EAT-12 (capture flash) confirmed success but never failure.** If taking the photo failed, the app caught the error and said nothing at all — no flash, no thumbnail, no message. And at the 10-photo limit the shutter simply did nothing, which reads as a broken button. Both now say what happened.
- **EAT-15 (bigger reading text) had already regressed, and half of it was never built.** The "Couldn't read these" section added by EAT-9 two weeks later came in at the smallest text size in the app — below even the pre-EAT-15 baseline. That is the copy telling someone what we failed to read off their menu, shown to people squinting at small print in a dim restaurant. Raised to match, along with the results error message. **Separately, the ticket is titled "Support larger text and *asset scaling* with phone zoom settings" and asks for font *and image* sizes to follow the phone's setting.** Only the text half was done. Text does scale by itself, so the comment closing the ticket out was right about that — but there was no size-scaling code in the app at all, and the photo thumbnails stayed a fixed 64pt while the captions above them grew past them. The tray thumbnails, their remove buttons and the add tile now follow the phone's text-size setting, capped so a triple-size accessibility setting doesn't tear the tray apart.
- **EAT-17 was the opposite problem: the app was being *too* careful.** The ticket asks that a scan always assume what an item is and what a restaurant typically puts in it, and score on that — giving up only when the item genuinely can't be read. The EAT-9 work had over-corrected in exactly this direction: the real bug there was a dish carrying *another item's* description, but the fix also banned inferring anything about a dish from its name, which is a different thing and is precisely what EAT-17 wants. The scoring instructions had also started contradicting themselves — the worked example was "High saturated fat from cream sauce" while the next line forbade naming any ingredient the menu hadn't printed. Now: assume the typical restaurant preparation of the named dish (an Alfredo arrives with cream and butter; a restaurant kitchen is not a home kitchen), and the one hard rule is that assumptions may never be borrowed from a *different* item on the same menu. Explanations must flag an assumption as an assumption ("typically", "usually") rather than stating it as though the menu said it — on a health app the user has to be able to tell the two apart.
- **EAT-13 (tap a photo to see it full-screen) is built.** Tap a thumbnail to open the photo full-bleed, with close, delete, and swipe to page through the rest. Deleting moves you to the next photo and closes the viewer when the last one goes. Both controls are icons, per the ticket.

**Why it mattered**

- Most of this was sitting in "In Review" or already shipped. Each ticket did the thing it was written for and then fell over one step to the side of it — the sort of gap that only shows up when someone reads the code against the ticket rather than checking the happy path.
- **EAT-9 and EAT-17 pull in opposite directions and both are right.** EAT-9 governs *which dishes exist and which text belongs to them*; EAT-17 governs *how hard to think about a dish that is genuinely on the menu*. Conflating them is what produced both bugs. Worth keeping straight: the fix for one keeps re-breaking the other otherwise.
- The two EAT-9 gaps put wrong information in front of someone choosing food for a heart condition, which is the failure mode this app can least afford.

**Decisions made**

- **EAT-13 was built without the Figma design it was paused for.** Sean asked for it finished. The layout is deliberately conventional (the iOS Photos pattern) and uses existing colors and control styles, so a design can later replace the look without touching the wiring. Flagging it rather than burying it: this is the one piece of work here that wasn't specified.
- **Added `npm run test:dedupe`** — ten cases pinning the EAT-9 description behaviour, including both walk-arounds above. No API key, no network. Writing it caught a wrong assumption in my own first attempt at the name-matching fix, which is the argument for having it.

**Verified / not verified**

- API typecheck clean; mobile typecheck unchanged at its two known pre-existing errors; the dedupe suite passes 10/10.
- **Nothing was checked on a device.** This machine has no iOS simulator runtime installed at all, so there was nothing to boot. EAT-13, EAT-12 and EAT-15 are visual and still need a real look — see the verification list in `plan.md`.
- **The EAT-17 scoring change has not been run against a real menu.** No `ANTHROPIC_API_KEY` in this environment, same as the earlier rubric sessions. It is a prompt-only change so it cannot crash, but whether the assumptions it now makes are *good* assumptions needs a live scan. This folds into the ~15-dish ingredient-guessing validation that has been outstanding since the rubric rewrite — EAT-17 is that validation's most direct use case.

---

## 2026-07-28 — Menu analysis no longer invents dishes (EAT-9); unreadable text gets its own section

**What changed**
- **The analyzer can no longer rank a dish that wasn't on the photographed menu.** Previously the two-step pipeline (read the menu, then rank what was read) could occasionally output a dish the restaurant never listed — the reading step or the ranking step would "helpfully" fill in something plausible. On a health app that reads as the app making things up, and it quietly erodes trust. Two fixes now prevent it:
  - **A hard, deterministic guard in the ranking step.** Every dish the ranker returns is matched by name back to the exact list of dishes we actually read off the menu. Anything that doesn't match is dropped. This is code, not a polite instruction to the model — the ranked results can now only ever be a subset of what was really on the menu.
  - **A stricter reading prompt.** The menu reader is told to transcribe text verbatim and never infer dishes a restaurant "would" have.
- **Text we can't confidently read now gets surfaced honestly instead of guessed or dropped.** When the reader can see something that looks like a menu item but can't make it out (blur, glare, handwriting), it no longer either invents a dish name or silently discards it. That text goes into a separate "Couldn't read these" section on the results screen, showing our best-guess transcription and a plain note that it couldn't be ranked. If a photo is *only* unreadable text (no clearly readable dishes), the app now shows that section rather than a dead-end "we couldn't read any dishes" error.
- **Every analysis is still computed only from the photos in that one request.** No results carry over from a previous scan or another user — this was already true server-side and stays that way.

**Added in review (Opus, same day) — the second half of the bug Sean reported**
- EAT-9 as written stops *off-menu dishes*. It did not stop the other symptom Sean saw: a real menu item carrying **someone else's description** ("coffee" presented as an arugula salad with feta). That comes from the reading step pairing a name from one part of a dense menu with a description printed elsewhere, and from the ranker inferring ingredients for a bare dish name. Three additions close it:
  - The reading prompt now requires a description to be the text printed **with that specific dish**, and to be omitted entirely if that association isn't certain — an empty description is always preferable to a borrowed one.
  - The ranking prompt now forbids inventing ingredients for a dish whose description is absent, and requires the explanation to reference only what the name and description actually state.
  - `deduplicateDishes` no longer lets a described duplicate silently overwrite a bare one when the descriptions disagree.

**Why it mattered**
- A single hallucinated dish is worse than a missing one: the user can't tell it's wrong, and it undermines confidence in every other recommendation. The guarantee is now structural, not "the model usually behaves."

**Where the work landed**
- API: the reader (`ocr.ts`) now returns readable dishes *and* an "unreadable" list; the ranker (`ranking.ts`) enforces the subset guard; prompts hardened; the analyze route passes the unreadable list through to the app.
- App: the results screen renders the new "Couldn't read these" section; iOS build number bumped 6 → 7 (app version stays 1.1.3).

**Note on the ticket**
- The original EAT-9 fix plan was written against an earlier version of the code and assumed things that had since changed (e.g. an older menu-reading format, a lower build number, and the old developer `CHANGELOG.md`). The *intent* was implemented faithfully and merged into the current code rather than applied verbatim; this log entry replaces the CHANGELOG entry the plan called for, since CHANGELOG.md is retired in favor of this file.

---

## 2026-07-27 (later) — Second-opinion review of the rubric fixes; 3 of 6 revised, tier bands re-cut, test scripts made runnable

**What changed**
- **Confirmed the thing that was previously unverified: the unvalidated rubric IS live in production.** `a82fe94` is the current head of `origin/main`, Vercel auto-builds `main`, and `https://eat-out-better-api.vercel.app/api/health` returns `"environment":"production"`. Real users are being scored by the rewrite right now, with no live-menu validation behind it.
- **Found that the test scripts could never have been run non-interactively.** `tsx` isn't installed in this repo, so the documented command (`npx tsx scripts/repeatability-test.ts`) drops into npx's "Ok to proceed? (y)" prompt and hangs forever in any non-interactive shell — which is exactly what a background agent or CI job gets. Added `npm run test:repeatability`, using `npx --yes`, and verified it executes and stops cleanly at the API-key guard. This is plausibly a large part of *why* the validation never happened.
  - Deliberately did **not** add `tsx` as a devDependency: doing so meant regenerating the root `package-lock.json` (a 15k-line, 11.7k-deletion diff), which is precisely the change Ray deferred on 2026-07-26 because it alters how Vercel installs the API. Reverted it. `apps/api/package.json` now changes by exactly two script lines and the lockfile is untouched. (Mobile `node_modules` verified undamaged afterwards — React still 19.2.3.)
- **Re-cut the saturated-fat tier bands.** The previous fix closed the two gaps by moving the band floors *down* (2–6g became 6.0–7.5). That dragged the 2–6g band below the app's 7.0 green line — which is where the Spinach & Egg Omelet sits, the single dish whose red→green move was the whole point of Ray's rewrite. Closed the gaps *upward* instead (`4.5–6.5 / 6.5–8.0 / 8.0–10.0`), so the bands are contiguous **and** the 7.0 line sits inside the 2–6g band rather than above it.
- **Fixed an internal contradiction in the cooking-fat rule.** It instructed the model to assume added cooking fat for anything not "raw, steamed, boiled, or dry-roasted" — which excluded *grilled*, while the very next paragraph calls grilled "neutral to slightly favorable." Grilled salmon and grilled chicken, the app's flagship green dishes, were being told to add butter and not to, in adjacent sentences. Grilled/broiled/baked/poached are now explicitly on the no-added-fat list.
- **Fixed the protective-factor arithmetic.** The previous version said base band 6.0–7.5 plus a 1.0–2.0 bump, then asserted salmon "lands at 8.5–9.5" — unreachable from the band floor. It also let the top band (7.5–10.0) plus a 2.0 bump imply a score of 12.0. Now: bump is 0.5–1.5, capped at 10.0, and the salmon example resolves cleanly (~5g sat fat → base 6.5–8.0 → ~9.0, matching the proposal's own target).
- **Trimmed the prompt.** The rubric section went 2,816 → 3,937 chars in the previous fix; it is now 3,517 — same corrections, ~420 chars less. Token cost was never the real concern (~$0.0008/scan on Haiku); instruction dilution was.

**What was confirmed as correct in the previous review**
- The Eggs Benedict / Shrimp Scampi concern is **real**, though for a sharper reason than was given: Ray's wording asserted these dishes' saturated fat "is usually low," which is factually false for a butter-sauce preparation (hollandaise ≈ 10–15g; scampi ≈ 14–29g at 2–4 Tbsp butter, USDA butter = 7.3g sat fat/Tbsp). Correcting it was warranted. Kept, tightened.
- The `<dishes>` tag-injection fix is **sound and safe to keep.** Verified no code path breaks: `normalizeDishName()` in `ranking.ts` already strips non-alphanumerics for matching, and both fallback paths return the *original* unstripped name to the client, so what the user sees is unaffected.
- Nutrition figures spot-checked against USDA: butter 7.3g sat/Tbsp ✓, farmed Atlantic salmon 3.1g/100g → ~5.3g per 6oz ✓ (the proposal's 5.25g holds), one large egg ~1.6g ✓, AHA ~13g/day ✓.

**What was wrong in the previous review**
- **The "double-counting" finding was a misdiagnosis.** The `or fat that is mostly UNSATURATED: 8.0-10.0` clause wasn't a redundant second credit — it was Ray's *primary* mechanism for salmon reaching ~9.0, with the protective paragraph as the prose explanation. Removing it broke salmon's calibration, which is precisely why a bump magnitude then had to be invented to restore it. Two fixes chasing one self-inflicted problem. The removal is fine *now* only because the bands were re-cut to make the arithmetic work.
- **The dead-zone fix solved a cosmetic problem and created a real one.** The gaps (6.0–6.5, 7.5–8.0) were genuine, but both sat entirely *within* a single tier, so neither could ever change a dish's green/yellow/red outcome. The fix for them did.
- **The AHA characterisation was overcorrected on a wrong premise.** The 2019 advisory *did* report that observational studies generally show no significant CVD association; it separately declined to set a numeric target and noted intervention data linking above-average intakes to higher LDL. Ray's original wording was closer to correct than credited. Current wording reflects both halves.

**Why it mattered**
- The previous review's own headline fix and its band change collided on the omelet — the one dish the entire rewrite was built around — and neither the collision nor its direction was noticed. That is the kind of error a manual walk-through cannot catch.

**Open question for Sean (needs a decision, not more analysis)**
- **Should a restaurant omelet actually be green?** Ray's proposal predicted 7.0/green from 3.2g saturated fat — counting only the eggs, not the pan butter. At a realistic 1–2 tsp of butter it's ~6–8g total, which is honestly yellow. So either the proposal's target is wrong, or omelets should be scored as cooked with minimal fat. This is a nutrition call, and the "red→green omelet" headline of the whole rewrite depends on it.

**What this sets up next**
- Still outstanding: the ~15-dish real-menu ingredient-guessing validation (proposal §8).
- Not pushed, not merged, not redeployed — same as before. Production still runs the unfixed rubric.

---

## 2026-07-27 — Critical review of the cholesterol rubric rewrite; 6 fixes made before shipping as build 7

**What changed**
- **Found that Ray's rubric rewrite (`0e2b761`) had already reached `origin/main`** via the `a82fe94` merge — despite the 2026-07-26 log entry explicitly stating "nothing merges until someone runs real menus through the new prompt." No live-menu validation had happened yet. Flagged to Sean immediately; Vercel deploy status of `main` needs manual confirmation (no `.vercel` link or CLI available in this environment to check directly).
- **Ran a critical accuracy review of the rubric** (no `ANTHROPIC_API_KEY` available in this environment, so this was a manual walk-through of the exact prompt text against real nutrition figures and adversarial dish examples, not a live API test — a live-API repeatability/validation pass per `rubric-prompt-change-proposal.md` §8 is still outstanding). Found and fixed 6 issues in `apps/api/src/lib/claude/prompts.ts`:
  1. **Real accuracy risk:** the "eggs/shellfish are de-emphasized" language sat right next to the scoring instruction with no separation from preparation — a dish like Eggs Benedict (hollandaise = butter) or Shrimp Scampi (garlic butter sauce) risked getting a pass on cholesterol grounds while the actual butter-heavy sauce went uncounted. Rewrote to explicitly cover the protein only, and added hollandaise/scampi to the hidden-fat inference examples.
  2. **Structural bug:** the saturated-fat tier bands had two gaps (6.0–6.5g and 7.5–8.0g) where no score was reachable — a dish estimated at 5.9g vs 6.1g (indistinguishable at estimation precision) could swing 2+ points. Made the bands contiguous.
  3. **Double-counting:** "mostly unsaturated fat" was both a base-tier trigger and a protective-factor bump — same signal credited twice. Now credited in one place only.
  4. **Unquantified adjustment:** the protective-factor bump had no stated size (unlike the preparation adjustment, which does) — the prompt's own salmon example implied a magnitude it never stated. Quantified it (~1.0–2.0 points).
  5. **Narrow cooking-fat inference:** only alfredo/curry/fried-breaded triggered a cooking-fat assumption; anything else pan-cooked (e.g. an omelet) risked only counting named ingredients. Broadened to a general rule.
  6. **Minor:** softened "no general cardiovascular link" (overstates the 2019 AHA advisory's actual finding of weak/insufficient evidence, not zero risk) to avoid overclaiming certainty for an app whose users specifically have high cholesterol.
- **Also fixed a pre-existing, unrelated security gap** noticed while in the file: `getRankingUserPrompt` interpolated OCR'd dish names/descriptions into the `<dishes>...</dishes>` block with no sanitization — a crafted menu photo containing literal `</dishes>` text could close the tag early and defeat the prompt-injection guardrail. Added angle-bracket stripping. This predates Ray's rubric change; not part of the rubric logic.

**Why it mattered**
- This is a health-scoring feature; getting the cholesterol logic right matters more than most bugs in this app. The Eggs Benedict/scampi risk was the most serious: it could make the score *less* accurate for exactly the dishes where restaurant butter content is highest, in the opposite direction from what the rewrite intended.

**Decisions made**
- Fixed in place on `feat/scoring-explained-ui` rather than a new branch, since that branch and `origin/main` currently point at the same commit — committed as a new, separate commit on top so the fix is reviewable independently of Ray's original change.
- Did not push. Did not merge/redeploy. Sean to review and decide.

**What this sets up next**
- **Still outstanding (per the original proposal, unchanged by this review):** run `apps/api/scripts/repeatability-test.ts` against the fixed prompt with a real `ANTHROPIC_API_KEY`, and do the ~15-dish ingredient-guessing validation against real restaurant menus, before this becomes build 7.
- **Confirm whether `origin/main`'s current (pre-fix) prompt is live on Vercel right now** — if so, the Eggs Benedict/scampi-style underestimate may be affecting real users until this fix ships.
- Bump `apps/mobile/app.config.ts` to version `1.1.4` / buildNumber `7` once merged, then EAS build + TestFlight submit (same flow as build 6).

**Still needs Sean**
- Review the 6 prompt fixes (diff in `apps/api/src/lib/claude/prompts.ts` on `feat/scoring-explained-ui`).
- Run the repeatability test with a real API key, or say go-ahead to run it another way.
- Confirm Vercel's current deployed state of `main`.
- Decide whether to merge now or wait for the live-menu validation pass.

---

## 2026-07-26 — Launch crash root-caused and fixed (duplicate React); scoring UI verified on simulator

**What changed**
- **Found and fixed the real cause of the app not launching.** It was never Sentry (see the correction below) and never the sandbox — it was two copies of React and two copies of React Native in the dependency tree. In plain terms: the project's root config says "the mobile app is not part of this workspace," but the root lockfile still said it was. So installing from the root quietly placed NativeWind (our styling library) next to the *website's* React 18 instead of the app's React 19 — and npm, trying to be helpful, gave NativeWind its own private copies of React and React Native. The app then had two of each, which breaks in two stages: the duplicate React Native made the app's startup code run twice and abort with a red `[runtime not ready]` error, and the duplicate React made the styling library crash with "Invalid hook call," leaving a blank white screen. Fixed by installing the mobile app's dependencies from its own (correct) lockfile and deleting the stray root copy. **No app code was involved.**
- **Fixed a silent styling bug that had been latent for weeks.** Our Tailwind config only looked for styles inside the `app/` folder, so any style used *only* in a shared component in `components/` was never generated and silently did nothing. This is why the new "?" button rendered on the wrong side of the screen — the "align right" instruction was simply never built. Now `components/` is scanned too. (Checked the one pre-existing shared component, `FeedbackSheet`, for affected styles: none, so nothing else changes visually.)
- **Verified the "What goes into your score" feature on the simulator**, which had never been possible before: the "?" button appears top-right, opens the sheet, all five scoring factors and the disclaimer render, the sheet scrolls, "Done" closes it, and the button correctly hides itself on the info screens. Ray also clicked through it on the capture and results screens.

**Correction to the 2026-07-25 entry below**
- That entry named `Sentry.init()` as the likely trigger for the launch crash. **That was wrong.** The error came from inside React Native's own startup sequence, which runs before any of our code — so Sentry could never have caused it. Sentry needed no changes and none were made.

**Why it mattered**
- This crash had blocked all on-simulator verification and had been written off as an unfixable quirk of the sandbox. It was a real bug that would bite anyone doing a fresh install, and it took minutes to find once we read the actual error text instead of guessing.
- The Tailwind blind spot is the more insidious one: it fails *silently*. Styles just don't apply, with no error anywhere.

**Decisions made**
- Fix the mobile side now; **leave the stale root lockfile alone for now** (Ray's call). It's the underlying cause and will recreate this problem on the next root install, but regenerating it changes how Vercel installs the API — that deserves its own change with the API build verified, not a drive-by fix. Flagged below.
- Don't rebuild native to test JS changes. This is a JS-only reload: start Metro and deep-link the dev client. The previous session burned 30+ min on native rebuilds that could never have helped.

**Also decided: the rubric rewrite and the UI that explains it are one change, not two**
- The two branches were folded into one (`feat/scoring-explained-ui` now contains both). They were only separate because of how the work happened across sessions — nobody decided they were independent, and the 2026-07-25 entry left it as an open question.
- Why they can't ship apart: the scoring screen tells users we measure against a ~13g saturated-fat budget and that we no longer penalize dishes for trans fat or dietary cholesterol. `main`'s deployed prompt still docks dishes for "high dietary cholesterol" and flags "trans fat present," and has no 13g budget at all. Shipping the UI alone would have the app confidently explaining a methodology it isn't using — on a health app, the worst kind of wrong.
- Consequence: the tested UI is now gated behind the **untested** rubric. That's the right trade — but nothing merges until someone runs real menus through the new prompt.

**What this sets up next**
- **Before merging:** validate the new rubric against real menus (and ideally run `apps/api/scripts/repeatability-test.ts`). Merging to `main` redeploys the API and changes live scoring for users the moment it lands.
- **Known trap, not yet fixed:** root `package-lock.json` still lists `apps/*` as workspaces while root `package.json` lists only `apps/api` + `packages/*`. The next root `npm install` will recreate the duplicate-React crash. Fixing it means regenerating the root lockfile and confirming the Vercel API still installs and builds.

---

## 2026-07-25 — Cholesterol rubric rewrite branched off; "What goes into your score" UI built; simulator crash misattributed to Sentry

**What changed**
- Found a Cowork instance had made substantive uncommitted edits directly on `main` (the cholesterol scoring rubric rewrite in `apps/api/src/lib/claude/prompts.ts` — saturated-fat budget model, drops outdated trans-fat/dietary-cholesterol assumptions — see the rubric entry below for the detail). Moved that work onto `feat/cholesterol-rubric-rewrite` (commit `0e2b761`) so `main` stays clean. Nothing was lost, just relocated.
- Built the P1 backlog item "a simple 'how scores work' screen" (see `plan.md`'s NEXT section): a global "?" button (top-right, every screen except processing/how-it-works/scoring-explained) opening a new modal, `apps/mobile/app/scoring-explained.tsx`, with plain-English scoring factors matching the rewritten rubric. Lives on `feat/scoring-explained-ui`, uncommitted — ready for Sean to pull and test on his own simulator.
- While trying to verify the UI change on-device (per this repo's manual-verification convention), hit a reproducible `[runtime not ready]` crash on app launch in this sandbox. Confirmed via a clean-`main` baseline test that the crash is **not** caused by the new UI code. Root-cause debugging (disabling Sentry's replay integration, then `Sentry.init()` entirely) pointed at `Sentry.init()` — specifically its early, synchronous runtime patching in `_layout.tsx` — as the likely trigger, but this was **not fully confirmed** before the investigation was cut short (see below) and `_layout.tsx` was reverted back to the clean, Sentry-enabled state. No code changes were kept from this investigation.

**Why it mattered**
- Uncommitted work sitting on `main` (twice in one session — once from Cowork, once when Claude Code itself briefly repeated the mistake) risks being lost or accidentally shipped. Both instances are now cleanly isolated on branches.
- The "how scores work" UI directly answers the P1 backlog item already in `plan.md`.

**Decisions made**
- Ray flagged that the Sentry crash investigation went on an unprompted, unbounded tangent after a simple "why did it crash" question — should have proposed a bounded diagnostic plan and checked in before burning ~30+ min of build cycles. Noted for future sessions (see `feedback_debugging_approach` memory).
- Stopped the Sentry investigation short of a confirmed root cause. The lead (Sentry.init's early patching) is real but unverified — someone should pick this up deliberately, not as a tangent.

**What this sets up next**
- Sean: pull `feat/scoring-explained-ui` and `feat/cholesterol-rubric-rewrite`, test both on his own machine, decide on merge.
- If the Sentry crash matters for local dev (vs. just this sandbox), someone should deliberately reproduce and fix it — not clear yet whether it's sandbox-specific or would also hit Sean's machine.
- Open question: are these two branches meant to ship together or independently? *(Answered 2026-07-26: together — see the top entry.)*

---

## 2026-07-25 — Regrounded the cholesterol ranking prompt (saturated-fat budget + science fixes)

**What changed**
- Rewrote `RANKING_SYSTEM_BASE` in `apps/api/src/lib/claude/prompts.ts` — the live prompt that scores each dish 1–10 for high cholesterol. It now:
  - Makes saturated fat the explicit primary lever, anchored to the real AHA daily budget (~13g/day), with gram-based tier bands instead of vague qualitative ones.
  - Adds protective factors (unsaturated/omega-3 fat quality, soluble fiber, plant sterols) as a real second axis that can raise a score even when saturated fat is moderate.
  - Demotes trans fat from the default worst-case trigger to an edge-case flag (partially hydrogenated oils have been out of US food since 2018–2021). "Fried/crispy" now routes to a preparation penalty, not trans fat.
  - Demotes dietary cholesterol (egg yolk, shellfish) per the 2015 Dietary Guidelines / 2019 AHA advisory — these are now judged on their (usually low) saturated fat.
- Persona, one-sentence non-judgmental explanation rules, and the prompt-injection guardrail were left unchanged. OCR prompt, scoring thresholds, and pipeline untouched.

**Why it mattered**
- The old rubric's two worst-case triggers rested on outdated science: trans fat (effectively banned) and dietary cholesterol (de-emphasized). The clearest behavior change is an egg omelet moving from red to green.
- The old scoring bands were qualitative and ungrounded; anchoring to the 13g/day budget replaces invented precision with a defensible reference. Component-level nutrient decomposition also showed several of Sean's KB per-ingredient point weights were the same saturated-fat lever double-counted.
- Reviewed with Sean before implementing.

**Decisions made**
- Stayed on the single-LLM-call approach (Option A); did NOT build a deterministic scoring engine (Option B).
- Sean's 30-page Scoring Knowledge Base was confirmed to have never been wired into the live system — it's reference-only and was banner'd as such. This work targets the live prompt, not the KB.

**What this sets up next**
- Run the repeatability test (`apps/api/scripts/repeatability-test.ts`) to measure score drift at temp 0.2 vs 0.
- Higher-value follow-up: the ingredient-guessing validation (~15 ambiguous real-restaurant dish names vs. assumed hidden ingredients).
- Optional: USDA FoodData Central rigor pass on the per-ingredient saturated-fat numbers used to design the bands.

**Reference docs added**
- `rubric-prompt-change-proposal.md` — the full proposal (rationale + before/after + open questions).
- `prompts-snapshot.md` — verbatim baseline of all live prompts before this change.

---

## 2026-07-08 (later) — Build 6 UI enhancements: 5 of 7 Linear tickets done

**What changed**
- Read the 7 Linear tickets (EAT-10 through EAT-16) and triaged them: five buildable directly, two need a design first. Built the five on branch `feat/build6-ui-enhancements` (one commit per ticket):
  - **EAT-16 — camera controls moved out of the viewfinder.** Zoom pills and the shutter button now sit below the camera preview (zoom left, shutter center, gallery link right), so nothing blocks the menu while framing. Pinch-to-zoom still works on the preview itself.
  - **EAT-12 — capture flash.** The viewfinder blinks white when a photo is successfully taken and added to the tray, so you know the shot landed.
  - **EAT-11 — back from results keeps your photos.** The results screen now has a back button that returns to the same capture screen with photos still loaded (previously the only way back was the iOS swipe gesture; the failure-path half of this was already fixed in the build-6 sweep).
  - **EAT-15 — bigger reading text.** All primary body copy (instructions, dish explanations, substitutions, tips) went up one size step. Text already scales with the phone's accessibility text-size setting — nothing in the app disables that — so larger-text users get larger text automatically.
  - **EAT-10 — leave-and-return during analysis: already fixed.** The build-6 sweep added exactly this: when you return to the app, the suspended request is aborted and automatically retried (up to 3 leave/return cycles per scan). No new code needed — just verify on TestFlight. The unfixable case is iOS killing the app entirely while backgrounded.
- **Two tickets are paused for design:** EAT-13 (tap a photo to view it full-screen with close/delete) and EAT-14 (landscape photo capture). Both introduce new layouts with no precedent in the app — building them without a design risks clashing UI.

**Decisions made**
- EAT-12 is a pure visual flash — no haptics — to avoid adding a new native dependency (`expo-haptics`) right before the EAS build.
- EAT-15 stayed deliberately conservative: body copy only, one step; labels/pills/footers untouched. A full type-scale pass can ride along with the EAT-13/14 design work.

**What this sets up next**
- Sean provides designs (Figma or mockups to react to) for EAT-13 and EAT-14 → build them → merge the branch → EAS build + TestFlight submit for build 6.

**Still needs Sean**
- Designs for EAT-13 and EAT-14.
- On-device sanity pass of the five changes (especially the new camera control row on a small-screen iPhone).
- Everything from the previous entry (EAS build, Vercel deploy check) still stands.

---

## 2026-07-08 — Build 6 (v1.1.3) shipped: whole-app bug sweep + docs reconciled

**What changed**
- **Fixed ~20 real bugs across the whole app**, almost all in the "things go wrong" paths — the cases most likely to bite a real user at a restaurant. The happy path was already solid; this hardened everything around it. Highlights in plain terms:
  - **Multi-page scans stopped silently failing.** Uploads now stay under the size limit our host (Vercel) enforces, so photographing several menu pages no longer gets rejected before it even reaches us. Photos are also compressed smarter (no more accidentally *enlarging* small photos).
  - **Photo limit is now honestly 10.** The app used to let you add 12 photos, but the server rejected anything over 10 — so an 11–12 page scan always failed. Now both agree on 10.
  - **Dense menus no longer get told "that's not a menu."** A packed menu produced more text than our reader was allowed to return, which broke it and made the app wrongly reject a real menu. Fixed, plus it now recovers partial results instead of throwing everything away.
  - **A big menu can't quietly turn into all-neutral scores anymore.** Long menus are now scored in parallel batches, which also keeps us inside the time limit; if one batch fails, only those dishes fall back, not the whole list.
  - **A failed analysis no longer loses your photos.** It now returns you to the same capture screen with your photos intact, instead of dumping you on a blank one. Error messages are friendly ("that's more than we can analyze in one scan…") instead of raw technical text; the technical detail goes to Sentry.
- **Privacy policy corrected** to disclose the services we actually use (PostHog analytics, Sentry crash reports + session replay, Google Sheets for feedback). The old text claimed we shared nothing with third parties, which was no longer true.
- **Added a light rate limit** on the analysis endpoint (a speed bump against abuse while the token gate is off).
- **Reconciled the repo and the docs.** Build 6 was written against the pre-doc-system `main`, so it had logged itself in the old `CHANGELOG.md`. Integrated build 6 with the new doc system, moved its summary here (where change history now lives), and folded in the local EAS workspace fix that hadn't been pushed. The archived `CHANGELOG.md` now ends at build 5; everything from build 6 on lives in this file.

**Decisions made**
- **We only rotate `APP_SHARED_TOKEN` when it leaks, not every build.** It's a static shared secret — set it once, reuse across all builds. Build 5's value is burned only because it was pasted into a chat once; the next fresh value is permanent unless it leaks again.
- **`CHANGELOG.md` is fully retired.** Change history lives in `log.md` from build 6 onward; the archived copy is frozen at build 5.

**What this sets up next**
- Build 6 is code-complete on `main` but **not built or on TestFlight yet** — needs an EAS build + submit (Sean runs it; version/build number already set to 1.1.3 / 6).
- We're adding **new features into build 6 before it goes out** — scope comes from the Linear tickets Sean created (2026-07-08). UI for those may need Figma designs to avoid clashing layouts; that triage happens once the tickets are readable.

**Still needs Sean**
- Run the EAS build + TestFlight submit for build 6.
- Verify the Vercel deploy of `main` picked up the API + privacy-page changes.
- (App Store, later — not blocking TestFlight) add "Usage Data / Diagnostics" to the privacy nutrition labels to match the updated policy.
- Decide whether the stray `my-app/` scaffold and the GTM `.xlsx` in the repo root should be deleted / git-ignored / committed (left untracked for now).

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
