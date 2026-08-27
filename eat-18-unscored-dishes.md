# EAT-18 — Real dishes are coming back as "We couldn't score this one"

**Status:** fixed on `fix/eat-18-unscored-dishes`, not yet merged or deployed
**Found:** 2026-08-10, playing with build 8 (v1.1.3)
**Affects:** production right now — `/api/health` reports commit `d83c44f`, which is what's live
**Severity:** high. It silently replaces good scores with a non-answer, and it hits ordinary menus.

> **What shipped vs. what's below.** The diagnosis stands as written. The fix
> changed during implementation: keying off the item number *alone* would have
> traded a visible failure for an invisible one, so the number is now
> cross-checked against the name before it's trusted. See "The fix" for what was
> actually built.

---

## The short version

Some dishes show "We couldn't score this one — treat this as a neutral score" and a flat 5.0.

**Those dishes were scored correctly. We threw the score away by accident.**

This is not the AI failing to understand a dish. It's a plumbing bug in our own code, one step after the AI did its job properly.

---

## How the analyzer actually works

A scan makes **two separate calls** to Claude:

1. **Read the menu.** Photos in, a list of dish names out. ("Grilled Salmon", "Crème Brûlée", "Fish & Chips"…)
2. **Score the dishes.** That list goes in, a score + explanation for each one comes out.

The two calls don't share any memory. Call 2 has to hand its results back to us, and we have to work out which result belongs to which dish. **We match them up by name** — we compare the name we sent with the name that came back.

That matching step is where this breaks.

---

## The coat check analogy

Think of it as a coat check.

- You hand in your coat (we send a dish name to be scored)
- You get a paper ticket (the name is how we'll find it again)
- You come back and hand over the ticket (the AI returns the name with the score)
- We match ticket to coat and give it back

Now imagine the ticket gets slightly smudged in your pocket — one character different. Our coat check has a rule: **no ticket match, no coat.** Your coat is hanging right there, three feet away, correctly tagged. We won't give it to you, because the ticket doesn't match exactly.

That's what's happening. The score exists. We refuse to use it because the name came back slightly different from how we sent it.

---

## Why the names come back different

Before comparing two names, we simplify both: lowercase them, and delete anything that isn't a plain letter or number.

The problem is "delete." Accented letters aren't plain letters, so they get **deleted entirely** rather than turned into their normal letter. `é` doesn't become `e` — it vanishes.

Run the real code on real menu names and this is what you get:

| On the menu | We turn it into | AI sends back | That becomes | Match? |
|---|---|---|---|---|
| Crème Brûlée | `crmebrle` | Creme Brulee | `cremebrulee` | ❌ |
| Sautéed Spinach | `sautedspinach` | Sauteed Spinach | `sauteedspinach` | ❌ |
| Fish & Chips | `fishchips` | Fish and Chips | `fishandchips` | ❌ |
| Mac 'n' Cheese | `macncheese` | Mac and Cheese | `macandcheese` | ❌ |
| Shrimp Scampi (GF) | `shrimpscampigf` | Shrimp Scampi | `shrimpscampi` | ❌ |
| Entrée Salad | `entresalad` | Entree Salad | `entreesalad` | ❌ |
| FETTUCCINE ALFREDO | `fettuccinealfredo` | Fettuccine Alfredo | `fettuccinealfredo` | ✅ |
| Grilled Salmon\* | `grilledsalmon` | Grilled Salmon | `grilledsalmon` | ✅ |

**8 of the 11 realistic pairs I tested failed.** Any menu with accents, an ampersand, or a "(GF)" marker will hit this.

Note the AI isn't doing anything wrong here. Writing "Creme Brulee" instead of "Crème Brûlée" is a reasonable thing for it to do. We're the ones being rigid.

---

## Why it costs us twice

When a name doesn't match, two bad things happen back to back:

1. **The real score is thrown out.** We added a rule in EAT-9 that any dish name we don't recognise must be discarded — that rule exists to stop the AI inventing dishes that aren't on the menu, which is a genuinely serious problem. But a slightly-renamed real dish looks *identical* to an invented one from the code's point of view. So it gets binned.
2. **The dish is added back with nothing.** Separately, we make sure every dish we read off the menu appears in the results. This dish is now missing, so it gets re-added — with a placeholder 5.0 and "We couldn't score this one."

Net effect: a correct score goes in, a shrug comes out.

---

## Why this started with build 8

This is a real regression. Two changes we shipped in build 8 combined badly:

**EAT-9 made the matching strict.** Before, an unrecognised name was just kept as-is. You'd see the dish scored properly, under a very slightly different spelling — a cosmetic wart, and honestly nobody would have noticed. Now it's deleted.

**The new menu-reading prompt made mismatches more likely.** We told the reader to transcribe *verbatim* — "do not paraphrase, expand, translate, or correct spelling." That was deliberate and it's the right call for accuracy. But it means dish names now arrive with all their accents, ampersands, `(GF)` tags and ALL-CAPS intact — which is exactly the material most likely to get tidied up by the scoring call one step later.

So one change made names messier, and the other made the matching unforgiving. Either alone would have been fine.

**The judgement call in EAT-9 wasn't wrong.** Inventing a dish that isn't on the menu destroys trust instantly; leaving a real dish unscored is annoying but honest. Trading the first for the second was the right direction. The mistake is that we're paying that price constantly, on ordinary menus, when we don't have to — the matching is just too crude to tell a rename from a hallucination.

---

## The fix

**Stop making the name the identifier. Use the number — but don't trust it blindly.**

We already number the dishes when we send them. The scoring call literally receives:

```
1. Grilled Salmon
2. Crème Brûlée
3. Fish & Chips
```

We just never asked for the number back. Now we do, and we match on it. A number can't be de-accented or re-spelled.

**The catch, and why the number alone isn't enough.** Swapping one key for another only helps if the new key fails in a *better* way. It doesn't, by default:

- A **name mismatch fails safely** — we know we don't know, and you see "We couldn't score this one." Wrong, but honest and visible.
- An **index drift fails dangerously** — a wrong number puts a real score on the wrong dish. "Grilled Salmon — 2.1, high saturated fat from the cream sauce." Silently wrong, confidently wrong, in a health app.

So the number is **cross-checked against the name before it's trusted**. If item 2 comes back holding a name that looks like dish 2, we accept it — that's what rescues "Creme Brulee". If the number and the name disagree, we trust neither and fall back to exact name matching. If that fails too, the dish is left unscored. We never guess which dish a score belongs to.

**Three supporting changes:**

1. **We stopped asking the model to sort.** The prompt used to demand results sorted best-to-worst — which meant carrying each number correctly *through a re-sort* of up to 35 items, exactly the bookkeeping that makes indexes drift. And we threw that ordering away anyway: the code re-sorts by score and reassigns ranks before anyone sees them. The model now returns dishes in input order, so drift is trivially detectable.
2. **The name comparison is less destructive**, since it's still the fallback: `é` folds to `e` instead of vanishing, `&` and `'n'` read as "and", and `(GF)`-style tags are ignored.
3. **The number never reaches the user.** It's an internal join key — it's the model's line number, not a menu position, and showing it would read as a rank nobody could explain. It's resolved to a dish and discarded inside the scoring step; it's never stored on any object, and a test asserts no scored dish carries it.

**What does not change:** the anti-hallucination guard stays exactly as strict. A dish that genuinely isn't on the menu is still dropped. We fixed how we recognise dishes, not what we allow.

**One deliberate side effect.** `normalizeDishName` is shared with the menu-reading step, so folding `&` into "and" also merges them there. A menu photographed twice that transcribed "Fish & Chips" once and "Fish and Chips" once now collapses to one dish instead of showing you both. That's a fix, not a regression — but it did change an existing test, which was updated to match.

## Tests

`npm run test:dishmatch` (new, no API key needed) — 25 checks covering the ten name pairs that used to break, the "different dishes must never merge" guards, an end-to-end re-spelling that must keep its real score, an index drift that must not mis-assign one, and the no-leak assertion.

`npm run test:dedupe` — 11/11, with two cases updated for the shared-normalizer change.

---

## How to confirm it's this and not something else

There's a log line that tells the two cases apart:

- `[Ranking] Dropped off-menu dish (not in OCR extraction): "..."` → it's this bug, and the dish name in the message is the one that got mangled
- No such line, but you still see "We couldn't score this one" → the AI genuinely skipped that dish, which is a different (and much rarer) problem

That's a Vercel dashboard check — the `vercel` CLI isn't installed on this machine.

---

## Worth flagging for the build-8 validation pass

`plan.md` has "run a real menu through the new scoring" as the top NOW item, to check whether EAT-17's ingredient assumptions are any good.

**This bug will pollute that test.** Every dish this hits shows up as an unscored 5.0, which looks exactly like EAT-17 failing to make an assumption — the symptom EAT-17 was built to eliminate. Testing before this is fixed risks concluding EAT-17 doesn't work when the real problem is name matching.

Recommend fixing EAT-18 first, then running the validation.

---

## Where the code lives

| What | Where |
|---|---|
| The "couldn't score this one" message | `apps/api/src/lib/claude/ranking.ts:256` |
| The rule that drops unrecognised names | `apps/api/src/lib/claude/ranking.ts:217-223` |
| The name-simplifying function | `apps/api/src/lib/claude/dishName.ts:17` |
| Where dishes get numbered on the way out | `apps/api/src/lib/claude/prompts.ts` (`getRankingUserPrompt`) |
| The "match exactly / don't rename" instruction | `apps/api/src/lib/claude/prompts.ts` (ranking rules) |
