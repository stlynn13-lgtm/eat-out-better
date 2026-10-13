# What to ask for — Feature Spec
**Eat Out Better · per-dish "ask your server" suggestion**

Authors: Sean (owner), Claude (spec)
Last updated: 2026-10-12
Status: **Draft, for Sean's review.** Build only after Gate 1 (the repeat-use test readout, Fri 13 Nov; `growth-plan.md`). Merges backlog #3 ("Dish-level substitution suggestions") and #9 ("Ask for this exactly", RICE 72).

---

## Summary (non-technical)

Under every dish that isn't green, the app shows one thing the person could ask the server for. It's written as the question they'd actually say, and it comes with what the change is likely to save:

> **Ask your server**
> "Could I get the hollandaise on the side?"
> Saves about 9 g saturated fat.

The app never tells someone what to order. It ranks the menu, says why each dish scores the way it does, and now, for the dishes that score low, offers a way to make the one they want less bad. That's `CLAUDE.md` principle 2 ("Substitution-forward: always offer a way to make a bad choice less bad"), which nothing ships today.

## Why build it

- **It's the gap every pre-mortem found.** The app and site stopped promising swaps on 2026-10-10 because the API returns none. The positioning pre-mortem lists "promises a swap the app doesn't show" as failure mode 1. The idea pre-mortem warns that "score a menu photo" is what a free assistant already does. A ready-to-say request with a grams estimate, attached to every low dish, is concrete, specific to this app, and easy to use at the table.
- **It turns a verdict into an action.** A red score with nothing to do about it reads as a scolding, which breaks principle 1 (non-judgmental). A red score plus "here's what to ask for" respects the choice.
- **It's the activation moment.** The `eob-launch-plan` skill defines activation as a completed scan "with at least one substitution". There is nothing to measure that against today.

## What the user sees

**Where:** inside each dish card on the results screen and on saved scans, under the explanation. It replaces the unused "💡 Make it better" box, which reads `dish.substitution` (`apps/mobile/app/results.tsx`, `DishCard`).

**Which dishes get one:** dishes scoring under 7.0 (yellow or red) in the categories main, appetizer, side, dessert and non-alcoholic drink. Green dishes don't need one. Alcohol and standalone sauces are never scored (EAT-20), so they never get one.

**Shown only when it matters:** the saving has to clear a bar, or the box doesn't appear:
- at least 3 g of saturated fat, or
- for desserts and drinks, at least 8 g of added sugar, or
- the change takes the dish out of the deep fryer.

A dish with no realistic ask shows nothing. A missing box is better than a filler one.

**The box:**
- Label: **Ask your server**.
- The question, in quotes. One question, under 20 words, polite, the way you'd say it to a server.
- One line saying what it saves, built by code from the numbers (never written by the model): "Saves about 9 g saturated fat." Add ", and skips the fryer." when it does. For desserts and drinks: "Saves about 20 g added sugar."
- No projected new score and no colour change. A predicted green based on a kitchen change nobody has confirmed is the false-green risk the positioning pre-mortem warns about.

**Loading:** results appear exactly as today. Asks arrive a few seconds later (see "How it works") and fade into the cards that have one. There's no spinner or placeholder; a scan whose asks fail looks the same as today's app.

### Illustrative examples (not model output; numbers are placeholders)

| Dish (score) | Ask | Saving line |
|---|---|---|
| Fettuccine Alfredo (2.1) | "Could I get it with marinara instead of the cream sauce?" | Saves about 14 g saturated fat. |
| Fish & chips (2.8) | "Could the fish be grilled instead of battered?" | Saves about 5 g saturated fat, and skips the fryer. |
| Bacon cheeseburger (2.5) | "Could I get it without the cheese and bacon?" | Saves about 9 g saturated fat. |
| Eggs Benedict (3.4) | "Could I get the hollandaise on the side?" | Saves about 8 g saturated fat. |
| Chocolate shake (3.0) | "Could I get the small size, without whipped cream?" | Saves about 25 g added sugar. |

## Rules for a good ask (go into the prompt and the review checklist)

1. **Same dish, modified.** Never suggest ordering a different dish. Choosing between dishes is the ranking's job. "Order the salmon instead" is out of scope.
2. **Something a normal kitchen does on request:** a different cooking method (grilled, not fried), sauce or dressing on the side, swapping the side, leaving off cheese, butter, bacon or cream, a half or smaller portion, sharing. Nothing exotic.
3. **One ask per dish**, the single biggest saving.
4. **A question to the server**, first person, under 20 words: "Could I…", "Can it be…".
5. **No health language.** No "healthier", "heart-healthy", "for my cholesterol" or "better for you". The user decides what to tell their server; the app supplies the request, not a reason.
6. **No allergy or medical framing**, and nothing that implies the kitchen can guarantee anything.
7. **Never invent menu items** (EAT-9). An ask may swap a side to one the menu lists, or to something generic ("a side salad"). It never names a dish that isn't on the menu.
8. **Assume the typical recipe** (EAT-17), the same assumption the score already makes.
9. **Return null** when no realistic change clears the bar.

## How it works

### A separate call after the scan, not part of scoring

The app gets asks from a new endpoint, `POST /api/ask`, after results are on screen. Folding asks into the scoring call (filling the `substitution` field the prompt already reserves) was considered and rejected for three reasons:

1. **Scores would move.** Any change to the scoring prompt changes the model's gram estimates, and so colours, for every user. It would need a full eval re-run against Ray's answer key. A separate call leaves scoring untouched.
2. **The 60-second budget.** `/api/analyze` runs OCR (up to 25 s) plus ranking (up to 30 s) inside Vercel's 60 s `maxDuration`. Longer outputs per dish push ranking toward the limit.
3. **Installed builds and the repeat-use test.** Builds 13, 14 and 1.5.0 already show `substitution` when it's present. Filling it from the API would change every installed app at once, including mid-test. A new endpoint that only new app code calls changes nothing for them. `substitution` stays empty and is marked deprecated.

### API: `POST /api/ask`

**Request**
```json
{
  "dishes": [
    { "id": "d_12", "name": "Eggs Benedict", "description": "poached eggs, Canadian bacon, hollandaise", "category": "main" }
  ]
}
```
- Only the non-green dishes, at most 100 per request. The app sends what it got back from `/api/analyze`, with no health condition and no account id.
- Same guards as `/api/analyze`: `APP_SHARED_TOKEN`, the durable rate limit (its own, cheaper bucket) and the $200/day spend cap.

**Response**
```json
{
  "success": true,
  "data": {
    "asks": {
      "d_12": { "question": "Could I get the hollandaise on the side?", "savedSatFatG": 8, "skipsFryer": false }
    }
  }
}
```
- Dishes with no ask are left out.
- `savedSatFatG` and `savedSugarG` are whole grams, computed by code. `skipsFryer` is true when the original was fried and the change isn't.

**Model call:** Haiku, the same client and chunking as ranking: chunks of 12, run in parallel, 20 s per-chunk timeout, `maxDuration` 30. For each dish the model returns:
```json
{ "item": 1, "question": "…or null", "before": { "satFatG": 14, "addedSugarG": 0, "fried": false }, "after": { "satFatG": 6, "addedSugarG": 0, "fried": false } }
```
The model estimates the dish before and after in the same call, so the difference is internally consistent even if `before` drifts from the scan's own estimate. Code computes the saving and applies the bar from "What the user sees". The model never writes the saving sentence. The prompt keeps the existing untrusted-content guard: the `<dishes>` block with angle brackets stripped (`stripTagChars`). The new prompt and the chunk resolver live beside the ranking ones, in `apps/api/src/lib/claude/ask.ts` and `prompts.ts`.

**Failure:** any error, timeout or unparseable chunk drops that chunk's asks silently. The endpoint never fails the scan, and the app never shows an error for asks.

### App

- After results render, call `/api/ask` once with the non-green dishes, then merge the answers into each dish's new field: `ask?: { question: string; savedSatFatG?: number; savedSugarG?: number; skipsFryer?: boolean }` on `RankedDish` (`packages/shared/src/types`).
- Persist asks with the scan, so saved scans and history keep them.
- **Account sync:** `menu_sessions` rows can't be updated, only inserted or deleted (that's how rename works). Hold the account upload until the ask request settles, with a 12-second limit, so the uploaded copy includes asks. The local save still happens immediately. Check this against `apps/mobile/lib/sync/sessions.ts` before building. If a scan has already uploaded by then, re-upload it the way rename does (delete, then insert). That works because the scan signature covers the id, not the content.
- Saved scans from before this ships have no asks. Don't fetch them retroactively in v1.

## Privacy

- **No new data collected.** The endpoint receives menu text the app already sent to `/api/analyze`: names, descriptions, categories. No photos, no account, no condition. Nothing is stored server-side.
- **The App Store privacy label doesn't change.** The privacy policy's "how scans are processed" paragraph gets one clause: suggestions are generated the same way, from the same menu text.
- Saved scans carry the asks inside the existing `menu_sessions` payload. The 256 KB size limit has room: about 120 bytes per dish.

## Cost and speed

- **Cost:** about one extra ranking-sized Haiku call per 12 non-green dishes, so roughly +10–20% of a scan's model cost. Measure it on the 16 eval menus before launch rather than trusting this estimate.
- **Speed:** asks should land within 5 seconds of results on a typical menu. Target p90 under 8 s.
- **Scan time:** unchanged. Asks run after results.

## Free or paid

Build it ungated, behind one config flag (`ASK_REQUIRES_PLUS`, default off). `growth-plan.md` proposes "What to ask for" as part of Plus, with the free tier keeping the 3 best picks. That call belongs to the paywall spec and the Gate 1 pre-order result, not this one. Whatever is decided, the first scan shows asks in full, because that's the moment the user sees why the app is worth paying for.

## Measuring it

**Events** (PostHog; add helpers to `apps/mobile/lib/analytics.ts`):
- `ask_loaded` `{ non_green_dishes, dishes_with_ask, ms }`
- `ask_failed` `{ reason }`

**Quality gate before shipping** (Ray, about an hour): run the endpoint on three eval menus (about 60 non-green dishes) and review every ask. Pass:
- 90% or more are realistic to ask for in a normal restaurant
- none changes the dish into a different dish
- none uses health language
- every saving points the right way (the change really lowers fat or sugar)

Add `npm run eval:ask` in `apps/api` so this can be re-run whenever the prompt changes.

**Success, four weeks after it ships:**
- **Coverage:** of scans with at least one non-green dish, 70% or more show at least one ask.
- **Speed:** p90 time to asks under 8 s.
- **Feedback:** the average rating for scans with asks shown is no lower than for scans without.
- **Use at the table:** in follow-up calls, ask "Did you ask your server for anything the app suggested?"

## Copy to restore when it ships

The swap promises were removed on 2026-10-10. Put them back as "what to ask for" in the same release:
- **App home screen, step 3:** "Know what to ask your server for."
- **How it works, step 3:** add "and, for dishes that score low, one thing you could ask for."
- **Feedback sheet:** a positive chip, "Useful 'ask for' tip".
- **Website** (hero, features, FAQ, `lib/site.ts` facts, `llms.txt`): one line, "For dishes that score low, it suggests one thing to ask your server for, like sauce on the side."
- **`CLAUDE.md`:** "Substitution-forward" stays as written; it's true again.

All copy follows the compliance rule in `.claude/skills/eob-launch-plan`: "ask for it grilled", never "lowers cholesterol".

## Rollout

1. **API first, dark.** Ship `/api/ask` and its eval. No installed app calls it, so nothing changes for anyone, including repeat-use testers. This can go out any time.
2. **Quality gate** (Ray's review, above).
3. **App:** the card UI, merge, persist and sync. It's JavaScript only, so it can ship over the air to 1.5.0, but not between 19 Oct and 13 Nov, while the repeat-use test runs. Otherwise ship it in the launch build (`growth-plan.md`: submit Mon 30 Nov).
4. **Copy restore** in the same release.

## Open questions for Sean

1. **Show the saving in grams, or only the question?** Grams make it concrete but are a second estimate the user has to trust. Recommendation: show grams; this spec assumes so.
2. **Plus-only or free?** Decide in the paywall spec. Recommendation: free on the first scan either way.
3. **Read-to-server view?** A large-text "show your server" screen would help at loud tables. Recommendation: v2, only if the follow-up calls show people actually ask.

## Out of scope (v1)

- Suggesting a different dish.
- Asks for green dishes.
- Fetching asks for scans saved before this ships.
- More than one ask per dish.
- Personalisation (likes, allergies).
- Other conditions. When blood pressure arrives the bar and the saving line become per-condition config, not code branches (principle 3).
