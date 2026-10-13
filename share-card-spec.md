# Share card — Feature Spec
**Eat Out Better · share a menu's best picks as a link with a picture preview**

Authors: Sean (owner), Claude (spec)
Last updated: 2026-10-12
Status: **Draft, for Sean's review.** Build after Gate 1 (Fri 13 Nov, `growth-plan.md`), in the launch build or as an over-the-air update after the repeat-use test ends. Backlog #14 ("Shareable results").

---

## Summary (non-technical)

A **Share** button on the results screen sends the menu's three best picks to anyone: a text message, a group chat, an email. The person receiving it sees a picture card in the message: the restaurant's name, three dishes with their scores and colours, and "Scored by Eat Out Better". Tapping it opens a short page on eatoutbetter.com with the same card and a button to get the app.

It's free for everyone, always. It's the product's only built-in way to spread.

## Why build it

- **It's the only growth loop that costs nothing per user.** The growth plan's paid-acquisition math doesn't work at today's prices (pricing pre-mortem), so installs have to come mostly free. Sharing is the one free channel built into the product. Target: a share on 5% of completed scans (`growth-plan.md`, metrics).
- **The person receiving it is often the right person.** Someone eating out with a partner, a parent or a group sends the picks to the people at the table or the person choosing the restaurant. They're plausibly part of a high-cholesterol household too.
- **It's measurable from day one.** Every link carries `src=share` through `/get`, so the attribution fix merged on 2026-10-12 counts signups and installs from shares like any other channel.

## What the user sees

### Sender (the app)

- **Share button** in the results header, beside the title, using the iOS share icon (square with an up arrow). Also on saved scans, for scans made after this ships.
- **Tap** opens the standard iOS share sheet, through React Native's built-in `Share` API, with the message below.
- **Message text** (it works even where link previews don't show):
  ```
  Lower-saturated-fat picks at Olive Garden:
  1. Herb-Grilled Salmon 8.2
  2. Minestrone 7.9
  3. Chicken Margherita 7.1
  Scored by Eat Out Better: https://eatoutbetter.com/p/eyJ2IjoxLC…
  ```
- **No restaurant name read from the menu:** the first line becomes "Lower-saturated-fat picks from this menu:".
- **Hidden** when the scan has no scored food dishes.

### Recipient

**Link preview (1200×630 image):**
- The restaurant name.
- Three rows: dish name, score and colour dot.
- The mark, and "Scored for saturated fat by Eat Out Better".
- Same look as the site's existing social image (`apps/web/app/opengraph-image.tsx`): cream background, forest green, the three tier colours.

**Share page `/p/<token>`:**
- The same card.
- One line on what the app does.
- **Get the app** button → `/get?src=share`. Before launch that lands on the waitlist and stores `final__share`; after launch it opens the App Store with `ct=share`.
- The page is `noindex`, stays out of the sitemap, and has no other links to it.

### Which dishes

Up to three dishes with the highest scores among **mains and appetizers**. Ties go by rank. Sides, desserts and drinks are left out, because "best pick: a side salad" doesn't help anyone choose a meal.

Scores and colours are shown as they are, even if the best on the menu is yellow or red. The card never relabels or hides a colour.

## Copy rules

- Describe the dishes, never the person: "Lower-saturated-fat picks". Not "my cholesterol picks" or "heart-safe".
- No outcome claims: no "healthy", "lowers cholesterol" or "safe". Same compliance rule as `.claude/skills/eob-launch-plan`.
- The card says "Scored for saturated fat", so a recipient knows what the number measures.

## How it works

### Signed at scan time, by the API

If anyone could build a share link, anyone could publish "Big Mac 10/10 — Scored by Eat Out Better" on our own domain, complete with a preview image. So the API signs the picks when it produces the scan, and the website only renders signed links.

1. In `/api/analyze`, after ranking, build the share payload from the real results:
   `{ "v": 1, "r": "Olive Garden", "d": [["Herb-Grilled Salmon", 8.2], ["Minestrone", 7.9], ["Chicken Margherita", 7.1]] }`
   - `r` is the restaurant name the API read off the menu, trimmed to 50 characters, or absent. A name the user typed in the app is never signed or shared; it could say anything.
   - Dish names are trimmed to 60 characters. Scores have one decimal.
2. Encode the payload as base64url, then sign it with HMAC-SHA256 using a new secret, `SHARE_SIGNING_SECRET`, set on both Vercel projects. Use the first 16 bytes of the signature, base64url-encoded.
3. Return it as a new optional field on the scan: `share?: { token: string }`, where token is `<payload>.<sig>`, on `MenuSession` (`packages/shared/src/types`). It's an extra field, so builds that don't know about it ignore it. The 15-minute replay cache stores it like the rest of the response.

The app builds the URL `https://eatoutbetter.com/p/<token>` and the message text. Payload plus signature comes to roughly 300–400 characters, fine for every messaging app.

### Website: `apps/web/app/p/[token]/`

- **`page.tsx`:** split the token, check the signature with `SHARE_SIGNING_SECRET` using a constant-time compare, decode, then validate the shape: version 1, one to three dishes, scores between 1 and 10. If anything fails, render a plain "This link isn't valid" page with the Get the app button and none of the link's text.
- **`opengraph-image.tsx`:** the same check, then `ImageResponse` with the card. If the check fails, return the site's default social image.
- **Tier colours:** derived from each score with the same thresholds as the app (green 7.0 and up, yellow 4.0–6.9, red below 4.0), reading `packages/shared` constants or a copy kept in `apps/web/lib/site.ts`. Never trust a colour sent in the link.
- **Caching:** both routes are dynamic but can be cached on the edge for a day per token; the token never changes meaning.
- **Analytics:** a Vercel Analytics `share_page_view` event, and `cta_click` with placement `share-page`.

`apps/web` is deliberately not an npm workspace. Either duplicate the three thresholds there with a comment pointing at `packages/shared/src/config/scoring.ts`, or move the website into the workspace. Recommendation: duplicate; they've changed once in five months.

### App

- A share button in the results header, shown when `session.share` exists.
- `Share.share({ message })` with the text above. Put the URL inside the message rather than in the `url` option, so iMessage shows one preview, not a duplicate.
- Saved scans keep `share` in their payload and show the button too.
- JavaScript only, so it can ship over the air to 1.5.0 builds, but not during the repeat-use test (19 Oct – 13 Nov).

## Privacy

- **The link holds only** the restaurant name read off the menu, up to three dish names and their scores. No account, device, location or health condition. A reader could infer the sender cares about saturated fat. The sender chooses to share, and the copy describes dishes, not people.
- **Nothing is stored.** The page decodes the link each time it's opened. Vercel's request logs record the URL like any other page visit.
- **Privacy policy (website section):** add "If someone shares their picks from the app, the link contains the restaurant name, up to three dish names and their scores, and nothing about the person who shared it. We don't store shared links; anyone with the link can view it."
- **App Store privacy label:** unchanged. The app collects nothing new; the share sheet is the operating system's.

## Abuse and failure

- **Forged or edited links:** they fail the signature check, and the page shows none of their text.
- **Real links with odd dish names** from a real menu (an offensive dish name, say): the text was printed on a real menu and went through OCR, the 60-character limit and the existing angle-bracket stripping. The risk is accepted for v1.
- **Secret rotation:** changing `SHARE_SIGNING_SECRET` breaks every earlier link; they fall back to the invalid-link page. Write that down in the README rather than build key versioning now.
- **Missing secret:** `/api/analyze` leaves `share` out and logs it once. It never fails a scan, the same rule as everything else on the scan path.

## Measuring it

**App (PostHog):**
- `share_tapped`
- `share_completed { activity_type }`. iOS reports where it went, e.g. Messages; dismissing the sheet sends nothing.

**Website (Vercel Analytics):**
- `share_page_view`
- `cta_click { placement: "share-page" }`

**Attribution:** the waitlist stores `*__share`; App Store Connect counts installs under `ct=share`.

**Success, four weeks after shipping:**

| Metric | Target |
|---|---|
| Completed scans that are shared | 5%+ |
| Share-page visitors who tap Get the app | 20%+ |
| Signups or installs per 100 shares | 3+ |

Don't chase a k-factor yet. At this scale, shares per scan and installs per share are the numbers to watch.

## Rollout

1. **API and website, dark:** the secret, the `share` field, the `/p/[token]` page and image. Nothing visible changes until an app sends a link. Test a token end to end by pasting a real link into Messages on a phone.
2. **App:** the share button, over the air after the repeat-use test, or in the launch build.
3. **Copy:** add one line to the website features: "Send the best picks to whoever you're eating with."

## Open questions for Sean

1. **Three picks, or best per category** (main, appetizer, dessert)? Recommendation: top three mains and appetizers. A single list is easier to read in a text message.
2. **Show yellow or red picks when a menu has no green?** Recommendation: yes, honestly coloured. Hiding them makes the card look broken.
3. **Image attachment for Instagram Stories etc.?** That needs a native module for screenshots (a new build, not over the air). Recommendation: v2, only if `share_completed` shows people sending to Instagram.

## Out of scope (v1)

- Image attachments.
- Opening the link in the app for recipients who have it (universal links need a new build and an apple-app-site-association file).
- Sharing a single dish or the whole menu.
- Sharing scans saved before this ships.
- Android.
