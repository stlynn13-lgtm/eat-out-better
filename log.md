# Eat Out Better — Change Log

**What this is:** the running, plain-language record of what changed, what we decided, and why. Newest entry on top. Written so a non-developer can skim it and understand the project's history without reading code or commits. This replaces the scattered `session-NN-summary.md` files and the developer-oriented `CHANGELOG.md` going forward.

**How to add an entry** (copy the template at the bottom): date it, say what changed in plain words, why it mattered, and what it sets up next. One entry per working session where something changed.

---

## 2026-10-06 (later) — A retry collects the scan the server already finished

**Status: merged 2026-10-06 with the entry below (PR #69), at Sean's request.** The database migration was applied to the live database and checked there: a claim/finish/replay round trip works, and the app's roles can't read or call any of it. The API half went live when Vercel deployed `main`. **The app half was published as an over-the-air update by Sean on 2026-10-06** (production branch, runtime 1.5.0, from commit `4f3155f`, update group `60a0e0d0`). It reaches 1.5.0 (1) phones on their second launch after that. Builds 13 and 14 are on their own `ota/` lines and don't get it. Not yet tried in the simulator or on a phone.

**That update also carried one earlier change for the first time:** saved-scan sync skips scans from before signing (`db06a68`, from the signed-scans work on 10-03). It was merged then but never published to 1.5.0. It's covered by `npm run test:sync`, but check that saved scans still back up during the phone test.

**What changed**

- **When you leave the app mid-scan, the server keeps going and finishes the scan. That result used to be thrown away**, and the app's retry re-uploaded every photo and paid for the whole analysis again: roughly 5 cents and 30 seconds per leave-and-return.
- **Now the app gives each scan an id and sends it on every attempt.** If the server has already finished that scan, the retry gets the result back in about a second, free. If it's still working (the usual case: you come back after 5 seconds of a 30-second scan), the retry waits for it instead of starting a second one.
- **Only real answers are kept for the retry:** a result, "that's not a menu" and "no dishes found". Errors that might go away on a second try (the AI service being busy, a timeout) are not kept, so the retry runs fresh.
- **Collecting a stored result doesn't count against the daily scan limits or the $200 spend cap**, because it costs nothing.
- **Privacy:** what's kept is the analysis result only: no photos, no IP address, no account, and no health condition (stripped before saving, as the privacy policy promises). It's deleted after 15 minutes. The policy's wording doesn't need to change, but this is server-side storage, so it's noted here per the privacy-label rule.
- **If anything about this breaks, scans run exactly as before.** That covers the database being down, the migration not being applied, or an older app build that doesn't send an id.
- **Tests:** `npm run test:cache` in `apps/api` (12 cases) and 16 new database tests (`supabase/tests/analysis_results_test.sql`, run in CI and checked locally on Postgres 16). `npm run test:suspend` in `apps/mobile` now also checks that every retry of a scan carries the same id and that a new scan gets a new one.

**One assumption to know about:** this relies on Vercel finishing the scan after the phone disconnects. That's Vercel's default; it only stops a function early if `supportsCancellation` is switched on, and it isn't. If that ever changes, a retry would wait up to 50 seconds on a scan that's no longer running and then show "took too long".

---

## 2026-10-06 — Leaving the app mid-scan no longer fails or double-charges the scan (EAT-10, third pass)

**Status: merged 2026-10-06 (PR #69), not yet tried in the simulator or on a phone.** JavaScript-only, so it reaches phones with the next over-the-air update.

**What changed**

- **When you come back to the app, iOS often reports the interrupted request as "Network request failed" before the app even knows it's back in front.** The old code only recognised "I stopped the request myself" as an interruption, so it treated this as a real connection problem. Real connection problems get one retry, not three, so **leaving the app twice during one scan failed it** with "Check your connection".
- **Each return also sent the scan twice.** The failed request had already been retried when the "you're back" signal arrived, and that signal then killed the healthy retry and started a third request. That re-uploaded every photo and paid for a second round of AI calls for nothing.
- **Now:** "Network request failed" counts as an interruption when the app actually left the screen during that request. It's retried silently, once, as soon as the app is back in front, and the "you're back" signal only stops the request that was actually interrupted. Up to three leave-and-returns per scan still complete.
- **Being genuinely offline is unchanged:** iOS uses the same "Network request failed" message for that, so it still gets one retry and then the connection error. Retrying it three times would just spend longer failing.
- **Added `npm run test:suspend`** (in `apps/mobile`): seven leave-and-return cases with no phone needed. Against the old code, three fail: the double request, the second leave-and-return failing the scan, and the retry limit being hit early.

**Still to do:** the simulator check. Start an analysis, swipe to the home screen straight away, wait 5 seconds, reopen. The progress bar should keep going and results should appear, with no error. Do it twice in one scan as well, since that's the case that used to fail.

---
## 2026-10-06 — Marketing site built (eatoutbetter.com, pre-launch)

**Status: built and deploying as a Vercel preview. Not on eatoutbetter.com yet — that needs a DNS change only Sean can make.**

**What changed**

- **A new website at `apps/web`**, built from `landing-page-prompt.md`. Its own Vercel project (`eat-out-better-web`), separate from the API, so nothing on the site can break scans.
- **Design: "warm editorial."** Cream paper background, the app icon's forest green, a large serif headline, real app UI as the hero. Sean picked this over "bold & vibrant" and "dark premium."
- **The page explains the product by showing it.** The hero phone plays a loop: a menu photo → scanning → dishes sorted green to red. Further down, visitors tap dishes on a sample menu and see exactly what the app would say (score, reason, "Make it better" swap). The sample dishes are made up and labeled that way; their scores follow the app's real rules.
- **Pre-launch, every button leads to an email waitlist** (Sean's call over a public TestFlight link). Emails go into a new Supabase table, `waitlist`, which the website can add to but never read back.
- **The QR code is permanent.** It points at `eatoutbetter.com/get?src=qr`, not the App Store. Today that lands on the waitlist; once the listing exists, flipping two settings makes it, and every button, go straight to the App Store. It only appears on desktop, since you can't scan your own phone.
- **Built to be found and quoted by search and AI assistants:** a 1,000-word guide, "How to eat out with high cholesterol," with every heading phrased as the question people ask and three cited sources (AHA, FDA, an AHA science advisory); structured data; a sitemap; and an `llms.txt` summary for AI tools. All product facts live in one file so the page, the structured data and llms.txt can't disagree.
- **Privacy, Terms and Support redirect to the existing pages** on the API project rather than copying them. Two copies of a privacy policy is how one goes stale.

**How it measured (Lighthouse, local build)**

- Accessibility 100, SEO 100 on both pages. Desktop performance 100. Mobile performance 83–92 on a throttled slow-4G simulation; the remaining gap is mostly font download time, and it should improve on Vercel's CDN.
- Dropping one optional font feature (Fraunces' "SOFT" axis) cut the font download from 270KB to 149KB and mobile load time by ~2 seconds. The headline is now slightly crisper, which is barely visible.

**Privacy policy updated (same day).** The policy now covers the website: what the waitlist stores (email, which button, when) and that it's used only for the launch email; that website analytics are cookie-free and don't identify anyone; Vercel and Supabase's roles for the site; and that waitlist emails are deleted within 90 days of the launch email. The App Store privacy label doesn't change, since it describes the app, not the website.

**Not done / needs a decision**

- The site isn't on eatoutbetter.com until DNS is pointed at Vercel (steps in `plan.md`).
- Before sending traffic: done. The privacy policy covers the waitlist and website analytics (above).
- The waitlist form couldn't be tested end-to-end from Claude's sandbox (Supabase is blocked there); the database side was tested directly. Test one signup on the preview.
- AI training crawlers (GPTBot, Google-Extended and similar) are allowed by default. One line in `apps/web/app/robots.ts` blocks them without affecting search or AI-answer visibility, if Sean prefers.

## 2026-10-05 — Scoring rebuilt: the model estimates grams, code decides the colour

**Status: merged 2026-10-05 (PR #57), without a test on a real scan (Ray's call).** Vercel blocked the first production deploy because the repo was private and the commits were Ray's; the repo is now public, and this log update re-triggers the deploy. Once live, it changes the scores every user sees; the app itself doesn't need an update.

**What changed**

- **The AI no longer picks the 1–10 score.** It estimates what it actually knows about each dish: grams of saturated fat, grams of added sugar, whether it's deep-fried, and whether its fat is mostly the heart-healthy kind. Code turns those into the score, using thresholds anyone can read in `scoring.ts`.
- **The thresholds:** green at 5g of saturated fat or less, red over 11g. Heart-healthy fat or fibre adds up to 1.5 points. Deep-fried loses a point. For drinks and desserts, more than 15g of added sugar is red. Ray approved 11g on 2026-10-05.
- **Sugar now counts for drinks and desserts** (Ray's decision, 2026-10-04).
- **The AI now sees each dish's section heading.** A bare "Vanilla" under SHAKES used to be read as 0g of fat.
- **Dishes are scored in batches of 12, not 35.** Large batches pulled estimates toward the middle.
- **The scoring prompt is 15% shorter.**

**How it measured (against Ray's 202-dish answer key)**

- **75% of dishes match Ray** (old prompt: 74%). Misses are now balanced: 27 greener than Ray, 22 redder. The old prompt was greener on 41 and redder on only 11, so it flattered dishes.
- **The same dish changes colour depending on what else is on the menu for 30 of 196 dishes**, down from 46. These are only borderline dishes, and only by one colour step. Ray's call: acceptable for now, since the same scan always gives the same result. Scoring each dish on its own call would remove it completely, at about 4× the cost.
- **Ray's answers stand as the answer key.** The 49 dishes where the app still disagrees are the app's to fix. Some can't be fixed without a scope decision: if Ray marked a poke bowl yellow for sodium or white rice, the cholesterol score doesn't measure those.

**Tooling**

- `npm run eval` now saves the AI's gram estimates for every dish. `npm run eval:calibrate` tests different thresholds against the answer key for free, with no AI calls. `npm run eval:context` measures how much colours depend on the rest of the menu.

**Not done**

- **Menus over 100 dishes still lose their tail.** Parked until PostHog shows how often real scans are that long.
- **Likely estimation errors to fix next:** Falafel at 14g, and Lox Benedict lifted out of red by a "salmon is heart-healthy" bonus despite its hollandaise.

---

## 2026-10-04 (later) — Answer key in, grouping fixed, first measurement: 74%

**Status: merged with PR #57 on 2026-10-05.**

**What changed**

- **Ray's answer key is in the eval.** 202 dishes across 16 menus now carry Ray's colour call and the tab each dish belongs under, made blind on a review page (the app's score appeared only after each pick).
- **Two rules came out of the review:** added sugar counts for drinks and desserts; and an explicit menu heading decides the tab, while anything ambiguous goes under Sides.
- **Eight grouping bugs fixed** (shrimp cocktail and raw-bar oysters were treated as alcohol and never scored; Heineken Zero was alcohol; shakes were mains; Korean BBQ meats were sides; "A Little Something Before" wasn't read as starters; plain rice, beans, naan and raita under vague headings were mains). 31 new automatic checks, all passing.
- **The eval now checks tabs as well as colours**, keeps same-name dishes apart, and prints an overall match rate.
- **The review page now keeps each person's first pick**, so a change made after seeing the app's score can't overwrite the blind call.

**What we learned (first full run, ~$3)**

- **The app matches Ray on 74% of dishes (148 of 200). When it's wrong it's usually too generous: greener than Ray on 41 of 52 misses.**
- **The biggest problem: a dish's score depends on what else is on the menu.** The same dish scored alone and inside its full menu changed colour 46 times out of 194 (Thai iced tea 9.0 vs 6.0; carnitas 2.0 vs 4.0). The model grades on a curve against the dishes next to it. Until that's fixed, the same dish can get different colours at two restaurants, or from two vs five photos of one menu.
- **The scoring bands straddle the red/yellow line**, which is why 14 misses sit at exactly 4.0.
- **Menus over 100 dishes get cut off**: the scoring step stops at 100, so the last dishes on big menus (a whole sushi section, all the desserts and drinks) get no score.
- **Grouping now matches Ray almost everywhere**; the 4 differences left are judgement calls no heading rule can make.

**Next (proposed, not started):** make scoring absolute (fixed reference dishes in the prompt) and measure how often colours change with context; then align the bands; then count sugar; then lift the 100-dish cap. One eval run per step.

---

## 2026-10-04 — Eval set: 15 real restaurant menus with photos

**Status: merged with PR #57 on 2026-10-05.**

**What changed**

- **15 new test menus** in `apps/api/evals/menus/`, each with its page photos in `evals/photos/`: Italian-American, Chinese-American, Sichuan (bilingual), Thai ×2, steakhouse, Greek tri-fold, Indian, burgers & beer, seafood, golf-club breakfast, Japanese hibachi (127 items), sushi (134 items), Tex-Mex, Korean BBQ (Hangul). 1,242 dishes, 45 photos, 19 MB. All from the restaurants' own website PDFs, with the source link and date in each file.
- **Each menu records what a correct reading looks like**: every dish, its description, the section heading it sits under, and the restaurant name — or "no name" when the page doesn't print one. This is for a photo-reading test we don't have yet: today nothing checks whether the model reads a menu photo correctly, which is where Sean saw it invent dishes on big menus in August and where wrong groupings start.
- **Deliberate traps** in the set: dishes with the same name in two sections (they must both survive), photo captions that repeat dish names, add-on and topping lists that aren't dishes, a restaurant name that only appears inside a dish name, a cover page with no dishes, alcohol next to non-alcoholic shakes, and one PDF with text that's invisible on the page.
- **The scoring eval now skips menus that have no answer key or baseline yet**, so `npm run eval` costs what it did before. `--menu <id>` still runs any of them on purpose.

**Decisions and why**

- **Website PDFs, not Yelp photos.** Yelp's terms forbid scraping, and a restaurant's own PDF carries its own text, which is a better answer key than anything read off an image.
- **Clean PDFs flatter the model.** Real photos have glare and angles. The set needs our own phone photos too (the brunch menu and BCD originals are on Sean's and Ray's phones; nothing in our system keeps scan photos).

**Not done**

- **No expected tiers on any new menu.** Those are a human call. The brunch answer-key form (29 dishes) is still waiting on Ray.
- **The photo-reading eval itself isn't built.** Next step: a runner that sends each menu's photos through the real reading step and reports dishes missed, dishes invented, wrong descriptions, wrong sections and the restaurant name.
- **The scoring runner keys dishes by name**, so menus with genuine duplicates (e.g. two Chicken Parmigianas) need a fix before they can be scored.
- **Spot-check needed:** the dish-to-description pairing on several pages was checked by Claude reading the images, which is close to a model writing its own key. List in `evals/README.md`.

---

## 2026-10-04 — Security quick fixes (PR #56)

**What changed**

- **Five smaller fixes from the 2026-10-03 security audit, in one PR (#56).** The feedback form's spreadsheet script now treats every submission as hostile: text that would run as a spreadsheet formula is stored as plain text, fields are limited to the values the app actually sends, and errors are no longer shown to whoever sent the request. The API now gives a plain "couldn't analyze this menu" message instead of passing on raw error text from Claude, refuses uploads that aren't photos before paying for a Claude call, reveals less on its public health check, and sends stricter browser security headers.
- **One planned fix was changed after testing.** The suggested browser security policy would have shown a **blank page** for the privacy policy, terms and support pages, and the privacy URL is what App Store Connect links to. Those pages don't need any scripts, so the policy now blocks scripts entirely, and all three pages were checked and render fully.
- **`security-followups.md` was removed from the repo (2026-10-06).** The repo went public again on 10-05, and that file listed open weaknesses; its own rule was to delete it if that happened. The open security items are now tracked outside the repo (Sean's private copy). Git history still contains the old version.

**Not done**

- After #56 merges, Sean pastes the new feedback script into the sheet (`scripts/feedback-sheet/README.md`).

---

## 2026-10-03 — Security fixes: signed scans, a required API token, patched dependencies

**Status (updated 2026-10-03 evening):** signed scans (PR #53) is merged and live. Its migration was applied to the live database and verified: all existing scans signed; unsigned and forged scans refused. The repo was made private the same day. The token PR (#52) and dependency PR (#51) are open and green, waiting on Sean's steps. Open items are tracked privately, outside the repo.

**What changed**

- **Saved scans now have to come from a real scan.** The app saves scans to your account by writing to the database directly, and every install gets a free account. Until now nothing checked that a saved scan had ever been through the API, so a script could store data without paying for a scan or meeting any of the scan limits. Now the API asks the database to sign each scan it produces, and the database accepts a saved scan only with that signature. The signing key is generated inside the database and never leaves it. Scans already in accounts were signed in place. The app already saves the API's whole response, so the signature reaches the database from every build with accounts, without an app update. The app on `main` also skips scans that predate signing, so one old scan can't hold up the rest. (PR: signed scans.)
- **New anonymous accounts are limited to 5 per hour per network**, down from 30. One person makes one per install.
- **The API's token check no longer lets everyone through when the token isn't configured.** On Vercel, a missing `APP_SHARED_TOKEN` now stops scans with a clear error in the logs instead of quietly opening an endpoint that bills the Anthropic account. The comparison is also timing-safe. (PR: require app token.)
- **Next.js and its image library were updated** past published security advisories, and the API's `uuid` package was replaced with Node's built-in equivalent. Dependabot now opens a weekly grouped update PR for the API and security-only PRs for the app. (PR: dependency updates.)

**Worth knowing**

- **The 256 KB size limit on saved scans stays.** Lowering it to 64 KB was considered and dropped: real scans run about 480 bytes per dish, so a 10-photo menu can legitimately reach 200 KB. With signatures in place, the size limit matters much less anyway.
- **Scans made before signing that were never uploaded stay on the phone only.** In practice that's almost none: the app uploads every scan right after it's saved.

**Not done**

- The medium and low findings from the same audit (spend cap size, feedback endpoint, repo visibility, alerting, error messages, headers) are next, separately.

---

## 2026-10-01 (night) — Pricing strategy rethought; new doc `pricing-strategy.md`

**What changed**

- **New doc: `pricing-strategy.md`.** A from-scratch look at every realistic way to make money from the app, with a model of revenue, cost and profit at different install, conversion and retention levels. It is a decision input, not a committed plan. Nothing in the app changed.
- **The recommendation moved.** `monetization-strategy.md` (July) kept a generous free tier. The new doc recommends 3 free scans at full quality, then a paywall with a 14-day free trial of Plus ($6.99/mo or $39.99/yr), a small free tier of 2 scans a month forever, a $3.99 week pass and a $79.99 lifetime option. The risk rating stays free.
- **Why:** in the model, how early the paywall appears matters far more than the price. At 2,000 installs a month (base case) the generous free tier earns about $400 a month; the recommended plan about $3,400.
- **Ruled out:** ads (they earn less than a scan costs), sponsored restaurant placement, selling data, weekly subscriptions.

**Worth knowing**

- **The model rests on assumptions.** The conversion multipliers (hard paywall 4×, recommended 2.5× a 2.1% baseline) are estimates built on RevenueCat's 2026 report, and every cost comes from `cost-and-golive-requirements.md`, not from measured scans.
- **The July doc's free-scan cost ($0.015) disagrees with the cost doc ($0.04).** The new doc uses $0.04.
- **Unchanged:** no paywall until day-30 retention passes 20%.

**Not done**

- Sean has not decided on any of this. Nothing is built: no paywall, no RevenueCat, no trial.

---

## 2026-10-01 (night) — Version 1.5.0 started: restaurant names, a livelier Saved scans, category tabs, a new account look

**Status: merged (PR #46) and built. Version 1.5.0 (1) finished building on 2026-10-01 and was handed to Expo's automatic TestFlight submission. Not yet seen on a phone.** The menu-reading change, the appetizer group and the privacy wording went live on the API at the merge. Build 14's updates now come from the `ota/1.4.0` branch, not `main`.

**What changed**

- **Version is now 1.5.0 (1)** — Sean's call, to mark a new round of design changes. Nothing in it needs new phone-level parts, but a version number is also what decides which installed app an update can reach, so this work arrives only in a new 1.5.0 build. Build 14 keeps getting small updates from a new `ota/1.4.0` line.
- **Saved scans are named after the restaurant.** When a menu prints the restaurant's name, the app reads it and uses it as the scan's name. It is told never to guess: no printed name, no suggestion.
- **Any scan can be renamed.** Tap the pencil on a saved scan, or the title on the results screen. If the menu printed a name, the rename box offers it back as a one-tap suggestion. The name is backed up with the scan when you have an account.
- **Saved scans looks different.** Each scan has a coloured letter tile, the restaurant name, a green/yellow/red bar showing how the whole menu scored (with the counts in words under it), and its top pick. Three totals sit at the top: menus, dishes scored, green picks. "Clear" moved to the bottom of the list; it used to sit underneath the "?" button.
- **Results has tabs: All, Entrées, Appetizers, Desserts, Drinks** (and Sides when a menu has them). "All" is still the first thing you see and still shows everything, now with a heading over each group. An empty tab says so.
- **Appetizers are a real group now.** A dish printed under "Appetizers", "Starters", "Small Plates" and similar headings is ranked among appetizers and can win "Best Appetizer". With no such heading it stays an entrée, as before.
- **The account entry on the home screen is a card, not a text link**, and it uses the person's own number ("Back up your 7 saved scans"). The account screen opens on a dark-green panel: the pitch when signed out, a profile with your totals when signed in. The sign-in buttons, "Not now", Sign out and Delete account are unchanged.
- **The logo's tap animation is about a third slower**, same design.
- **Bug fixed: "Analyze New Menu" left the old photos behind.** After a scan, tapping "Analyze New Menu" and then Back showed the previous menu's photos. The app was opening a second scan screen on top of the first one, which still held them. It now returns to the one scan screen and empties it.
- **Privacy policy wording** now says a saved scan includes the restaurant's name. It goes live when this branch is merged.

**Decisions and why**

- **The restaurant name is read by the same step that reads the dishes**, so it adds no extra AI call and no extra cost per scan.
- **A rename reaches the account as "delete the old copy, upload the new one"**, because the database deliberately does not allow saved scans to be edited in place. If the phone is offline it retries on the next sync.
- **Nothing new was installed** (no new packages), so there is nothing new that can fail in the build.

**Not done / not proven**

- **Nobody has seen these screens on a phone.** They were type-checked, the app bundle was built, and the automatic tests pass (58 category checks, 23 saved-scan checks including renaming). Layout, spacing and the feel of the animations are untested.
- **The menu-reading change was checked against the real AI (same day).** Two test menu pages were read with the old instructions and the new ones: the same 17 dishes came back, with identical names, descriptions and section headings. The new version also returned the restaurant's name from the page that printed it, returned no name for the page that didn't, and put the three "Starters" dishes under Appetizers. The test pages were computer-drawn, clean and easy to read; a real photo in dim light has not been tried.
- **The scoring evaluation shows three flags, and they are not from this work**: the same three appear on the unchanged 1.4.0 code. Galbi scores yellow (5.5) where the answer key says red, and two brunch dishes (Korean Fried Chicken Bao, Chicken & Pandan Waffle) have moved from red to yellow, sitting right at the 4.0 line. Worth a look as part of the real-menu scoring work.
- **Scans saved before 1.5.0 have no name** until one is typed, and show as "Unnamed menu".
- **A rename made on one phone does not change a copy already sitting on a second phone.**

---

## 2026-10-01 (evening) — Photos picked from the library now show a loading tile straight away

**What changed**

- **"Add your photos" no longer looks like it did nothing** (PR #43). Sean picked two photos from his library and the tray stayed empty; picking the same two again showed all four. The likely cause, worked out from the photo picker's own code rather than reproduced on a phone: the iPhone picker closes the moment you tap Add, but the app only receives the photos afterwards, one at a time, and a photo kept in iCloud is downloaded first. The screen showed nothing during that wait.
- **What the app does now:** as soon as the picker closes, the tray shows a spinner tile labelled "Adding…" and the main button reads "Adding your photos…". Taps on "Add your photos" are ignored while a pick is still loading, so the same photos can't be added twice. If the photos can't be loaded (for example an iCloud photo with no connection), an alert says so instead of nothing happening.
- **Published to both builds** by Sean: build 14 from `main` and build 13 from `ota/1.3.0`. Claude checked both by downloading the live update each build receives and finding the new wording in it.
- **Build 13 also picked up the account-screen label fix** (PR #41), which had been sitting unpublished on `ota/1.3.0`.

**Worth knowing**

- The photos themselves still can't appear instantly when the phone has to fetch them from iCloud; the app has no access to them until that finishes. The change is that the screen reacts immediately.
- **`npm run update:production` stops and asks for a message** unless one is passed. A first attempt sat at that question and published nothing. Use `npm run update:production -- --message "what changed"`.

**Not done**

- **Not yet tried on a phone.** It was type-checked and the live updates were inspected; nobody has picked photos with the update installed. If the tile shows but the photos still take very long, or the photos were never in iCloud to begin with, the cause is something else and needs another look.

---

## 2026-10-01 (later) — Build 14 on TestFlight, native Google sign-in confirmed on a phone

**What changed**

- **Build 14 (v1.4.0) is on TestFlight.** The build finished normally, but Expo's free submission queue sat for over an hour without starting, so Sean uploaded the finished app file with Apple's Transporter app instead. Apple processed it and it went to the same three tester groups as build 13. If a build is ever stuck at "waiting for an available submitter" again, Transporter is the way around it.
- **Native Google sign-in works** (PR #37), confirmed by Sean on build 14: Google's own sheet, naming "Eat Out Better" rather than the Supabase address. Behind it: a second Google client for the iPhone app, and the Supabase Google provider now accepts both clients with "Skip nonce checks" on (Supabase's documented setting for iPhone sign-in).
- **Sign in with Apple works on a phone** too: the database shows Sean's Apple login created from build 14.
- **Account screen names the login in use** (PR #41). Sean signed in with Apple, signed out, signed in with Google, and the screen said "Signs in with Apple". Nothing was wrong with the sign-in: his Apple ID and Google account share one email, and Supabase treats logins with the same verified email as one account, so both logins sit on one account and the screen listed every one. It now shows a single "Signed in with …" label for the most recent login. Published over the air to build 14 and checked by downloading the live update.
- **One sign-in method per account in the app's screens** (Sean's decision, in PR #36): the account page no longer offers to add a second login. Supabase still joins logins that share an email behind the scenes, which is what makes "same scans whichever button you tap" work.

**Not done**

- ~~**Build 13 does not have the account-label fix.** It is on the `ota/1.3.0` branch but not published; simplest is for testers to move to build 14.~~ Published to build 13 later the same day; see the evening entry above.
- **Delete account after an Apple sign-in** has still never been run. It is the only thing that proves the Apple key in Vercel belongs to the right team.
- **Restore after reinstall with a real scan** has not been tried on a phone: scan, sign in, delete the app, reinstall, sign in, scan is back.
- The fixes from PRs #35, #36 and #41 were type-checked and bundled, then tried by Sean on his phone. There are no automated tests for these screens.

---

## 2026-10-01 — Accounts live for build 13, the App Store privacy label, and what was actually tested

**What changed**

- **Sign-in is on for build 13.** Sean finished the outside setup (Google client secret in Supabase; Supabase and Apple keys in Vercel; redeploy) and published the over-the-air update himself, because Claude isn't permitted to run the publish command. The update carries the Supabase address and public key, and the accounts switch.
- **First run on a phone, and the fixes from it** (PRs #35, #36): a first-launch "Create free account" screen; the code field became one visible box so Paste works (the six drawn boxes couldn't be pasted into, and the logs show the phone asked for a code twice and never submitted one); account page and home layout tidied; code email reworded. Published to build 13.
- **Native Google sign-in** (PR #37) so Google's sheet says "Eat Out Better" instead of the Supabase address. It needs a new build: **main is now v1.4.0 / build 14**, and build 13 gets updates from `ota/1.3.0`.
- **App Store privacy label filled in and published** (it had never been started). Eleven data types, all "linked to you", none used for tracking. "Linked" is deliberate: analytics, feedback and crash reports carry a random device ID, and Apple counts that as linked. The privacy policy was corrected to match (PR #38): analytics are no longer called "anonymous", the IP-derived approximate location is disclosed, and so is Anthropic keeping safety-flagged content for up to two years.
- **Unused Redis connection removed** from Vercel. PR #28 (old docs) closed; this entry replaces it.

**Tested against the live services (by Claude, 2026-10-01)**

| What | Result |
|---|---|
| Silent anonymous account | Created |
| Scan upload, in the same request shape the app sends | Saved |
| A scan carrying a health condition | Refused by the database, as designed |
| Email code attached to the anonymous account | Email arrived, code accepted, same account kept |
| Sign out, new code, sign back in (the reinstall path) | Same account, scan restored |
| Reading another account's scans | Nothing returned |
| Delete account through the live website | Account and scan gone |
| Google sign-in | Worked on Sean's phone (Google login attached at 15:36 UTC) |
| $200/day spend cap | Counting: one scan recorded at $0.015 |
| Apple key in Vercel | Well-formed: it signed a request and Apple answered. A fake code can't prove the key belongs to the right team — only a real Apple sign-in then Delete account can |
| Sentry error replays | Text, images and vectors are masked by default; never seen with a real error |

**Not tested, and why**

- **Sign in with Apple** needs a real iPhone and Apple ID.
- **The app's own screens** (the prompt after a scan, restore after reinstall on a phone). The server side of each is proven above; the taps are Sean's to try. No scan has been made on a phone since accounts went on, so no real scan has been backed up yet.
- **Hide My Email:** was not set up when checked; Claude registered `eatoutbetter.com`, `send.eatoutbetter.com` (the subdomain Resend sends from) and `no-reply@eatoutbetter.com` the same day, and Apple shows all three passing SPF. Delivery through Apple's relay is untested: it needs an Apple account using Hide My Email.

**Judgment calls on the label (no outside review):** Health and Photos are not declared — nobody enters health data and the condition is the same for everyone; photos are analysed and not kept. Both change the day a condition picker or photo storage ships. Rule going forward: edit the label before shipping any build that collects something new.

---

## 2026-09-29 — Sign-in screens, welcome redesign, landscape photos, and build 13 blocked on Apple

**What changed** (PR #29, merged)

- **The sign-in experience** is designed and built: a sheet with the benefits, Apple / Google / email buttons, a two-step 6-digit code flow, then "You're all set" (or "Welcome back" / "Sign-in added"), and an account page with Sign out and Delete account.
- **Where it appears on first use:** once, right after the first scan ("Keep this scan safe"), in the results action bar rather than over the dishes. Before a first scan there's nothing to keep, so asking earlier would just be a hurdle. There's also a quiet banner on Saved scans and a link on the welcome screen.
- **Google button** uses Google's official "G", cut from their own asset pack (downloaded with Sean's OK), per their branding rules.
- **Welcome screen redesigned:** "Have high cholesterol?", three numbered steps, the app icon instead of an emoji, and one primary "Scan a menu" button.
- **Landscape photos (EAT-14), decided:** the app stays portrait, but the camera follows the phone, so holding it sideways takes a wide photo, with a "Landscape" badge. It turned out to be one camera setting, not a redesign.
- **Photo preview:** not published over the air to build 11. It ships in build 13 instead, because it has never been seen running and a TestFlight build is opt-in, while an update reaches everyone.
- **Setup cut down:** `scripts/setup-supabase.sh` does the whole Supabase side in one command; `ACCOUNTS-SETUP.md` now lists only what Sean has to do (four sign-ups at outside services).
- **Database tests ran for the first time** in CI: 26/26 pass (PR #27, plus again on #29).

**Build 13 (v1.3.0) failed at signing:** Apple's provisioning profile doesn't include Sign in with Apple. Fixing it needs Sean's Apple login, so he runs the build once interactively and EAS regenerates the profile. Build number 12 had already been used by 5840b746 (v1.2.0, the Terms header fix), and there's no TestFlight email for it, so it probably was never submitted.

## 2026-09-28 — Accounts built, a real $200/day cap, a better photo preview, and a lot of decisions closed

**What changed**

Sean worked through the open-decisions list in one pass. Most of it was deciding; the rest became five pull requests, none merged yet (#22–#25 plus this docs PR).

**Sign-in is built.** Sean's call, reversing the earlier plan to hold accounts back: every install silently gets an anonymous account the first time it opens, and saved scans back up to it from that moment. Signing in — **Sign in with Apple, Google, or a 6-digit code by email** — attaches a login to that same account, so nothing moves and nothing is lost when someone decides to sign in. Scanning never asks for it. People stay signed in until they tap Sign out. There's an Account screen with Sign out and **Delete account**, which Apple requires. (PR #25.)

The email option is a **code, not a link** — Sean left that choice open ("whichever is easier for the user"). A code wins on a phone: iOS offers it from Mail above the keyboard, you never leave the app, and work email scanners can't "click" it first and use it up.

**Nothing visible changes until the setup is done.** Without the Supabase settings the app behaves exactly like build 11. `ACCOUNTS-SETUP.md` lists every click outside the code — about an hour, $0 a month. The domain email needs (`eatoutbetter.com`) turned out to be owned already, registered on 25 June.

**The daily spend cap now counts dollars.** It used to count requests (2,000 a day), which treated a one-page scan and a ten-page scan as the same. It now adds up what each Claude call actually cost and stops accepting scans for the day at **$200** — about 3,100 scans. (PR #24.)

It was first written against Upstash Redis, which is what the older limiter from PR #7 used. Sean pointed out the plan was always Supabase, so before merging it was moved onto the Supabase database: two small database functions the API calls with its secret key, IPs stored only as a salted hash, and the two Upstash packages removed. One vendor instead of two, and the cap switches on with the same Supabase setup as accounts — no separate Redis step. A scan takes 10+ seconds, so one extra database round trip per scan is invisible; if the database is slow or down, the limiter gives up after 3 seconds and lets the scan through rather than blocking users.

**The photo preview got the three fixes Sean asked for.** The close button is 64pt instead of 36 and sits away from the screen's rounded corner; swiping down closes the preview and keeps the photo in the scan; pinch (or double-tap) zooms in to check the small print. It's pure app code, so it can go out over the air to builds 9 and 11 with no new build. (PR #23.)

**Legal fixes, now.** The Terms address gets its apartment number (B213). The privacy policy stops saying "you may input a health condition" — no screen ever took one — and now discloses the install ID from build 11, including that it can survive deleting the app. (PR #22.)

**Decisions recorded**

- **No lawyer review.** Sean's decision; the docs use the best current guidance and say where judgment was used.
- **Home address stays only where it's legally required.** It's on the Terms (Apple's EULA rules require a developer address — *and a phone number*, which the Terms don't have yet; Sean is choosing which number). The support page already leaves it off, and nothing inside the app shows it.
- **Apple Developer stays Individual for TestFlight.** Before the public App Store launch, converting to an Organization is recommended — see `plan.md` NEXT for the three reasons.
- **Anthropic account spend limit is set** (confirmed by Sean). The global cap in PR #24 sits on top of it.

**Things that turned out to be done already**

- **Both P1 bugs** — the "go back" stall on the second analysis, and the double loading screen with a results flash — were fixed in June and July. `plan.md` still listed them because the tracker they came from was last edited on 22 June. Re-checked in today's code.
- **The duplicate-React lockfile risk** closed when PR #7 merged on 21 September.
- **The stray `ios/` folder** went away when the repo moved to a fresh clone at `~/Developer/eat-out-better`.
- **Dine Right LLC is in Good Standing** on Colorado's public register, looked up directly (formed 24 June 2026). Sean asked why it might not be: an LLC that's never touched after formation is exactly how it lapses, because Colorado wants a short yearly Periodic Report around the formation anniversary. The first is due around June 2027.

**How the accounts work, in more detail**

Worth recording, because each item is a way this goes wrong silently:

- **Linking, not signing in.** Signing into Apple or Google the "obvious" way creates a *new*, empty account and quietly abandons the anonymous one — no error, looks like success. The code links the login to the existing account instead.
- **If the login already has an account** (a reinstall, a second phone), the app signs into that account and re-uploads this phone's scans under it, then deletes the throwaway anonymous account. The database is keyed per account, so those re-uploaded scans can't collide with the anonymous copies.
- **The offline trap.** When a signed-in person opens the app offline with an expired login, the sign-in library reports "nobody signed in". Acting on that would create a new anonymous account over a real one. The app only ever creates an anonymous account when the phone has no saved login at all.
- **Shared phones.** Each account's saved scans live on their own shelf on the phone. After Sign out, the next person starts empty. Existing testers' history moves onto their first account automatically. `npm run test:history` checks all of this (14 scenarios, all passing).
- **Health data never reaches the server.** The health setting is removed from each scan before upload, and the database rejects any scan that still has it. That's what lets the App Store privacy label say Health is not collected.
- **The database protects itself**, because the app talks to it directly: nobody can rewrite past scans, rows are size-capped, each account keeps its newest 500, and deleting the account deletes the scans. 15 database tests check this. They need Docker, so they're meant to run in GitHub Actions — but GitHub refused the workflow file, because the saved GitHub login lacks the `workflow` permission. It's in the repo folder, uncommitted, waiting for `gh auth refresh -s workflow`.

**The feedback sheet**

The script that writes feedback into the Google Sheet lives inside the sheet, owned by eatoutbetter@gmail.com, which no tool here can reach. Two attempts to do it for Sean were blocked by the permission system (it wouldn't allow driving his Chrome to edit and redeploy it). So the full script now lives in the repo (`scripts/feedback-sheet/`) with a five-minute paste-and-redeploy guide. The script matches columns by name, so the six fields the app has sent since build 9 will finally land.

**Verified / not verified**

- ✅ Typecheck clean in both apps; the app bundles for iOS with accounts switched on; `npm run test:spend` 6/6; `npm run test:history` 14/14; the photo viewer's gesture code compiles to UI-thread worklets.
- ❌ **Nothing ran on a phone** — the simulator can't start until the Xcode licence is accepted on this Mac.
- ❌ **No real Supabase project yet**, so sign-in has never actually signed anyone in.
- ❌ **The 15 database tests haven't run** (see above).

**What's next**

All five PRs merged the same evening, with `ota/1.2.0` cut from `main` just before accounts moved it to 1.3.0. The Terms also got their phone number: (720) 837-1482, a Google Voice number. What's left is Sean's hour in `ACCOUNTS-SETUP.md` (it switches on accounts and the spend cap), the feedback script, the workflow permission, and the reminders `plan.md` keeps for build 12: the welcome screen design, the landscape-capture decision (it can't ship over the air), and the Google logo asset.

---

## 2026-09-28 — Fixed the overlapping header on the first-run Terms screen

**What changed**

On the "Before you start" screen (the one you must accept before using the app), the title was rendering underneath the phone's status bar area instead of sitting below it, so it looked like it overlapped other text. The screen now gets its own safe-area handling and a bit more space above the title and between the title and subtitle. Build number bumped to 12 so this ships in the next build.

**Why it happened**

That screen is a pop-up layer, and pop-ups on iPhone don't reliably inherit the "keep clear of the notch" measurements from the rest of the app on first paint. It measured zero and drew the title too high.

**Still to do:** confirm on a real device or simulator after build 12 — this was fixed from the code, not eyeballed.

---

## 2026-09-22 — Sign-in decided, the free half built, and build 11 cut

**What changed**

Nothing shipped and no code moved. What changed is that the three open questions in the sign-in plan are now *answered*, and four pieces of architecture the plan leaned on but never designed are now designed. All of it lives in `auth-plan.md` — §4 was rewritten and a new §12 was added.

**The decisions, in plain words**

- **Two ways to sign in: Apple, and a 6-digit code by email.** That is the whole list. Sign in with Apple means Apple's own login sheet; the code is the kind you get texted a version of everywhere else — you type six digits into the app and you are in.
- **Google is a "link," not a login.** Once you are already signed in, Settings will let you attach your Google account. It does *not* appear on the sign-in screen and it cannot, yet, let anyone in. That sounds pointless until you see what it is for — see below.
- **A typed code, not a "magic link" email.** The original plan assumed this and never said why, which is how a decision quietly becomes a habit. Written down now: a link makes you leave the app and come back, and corporate email scanners routinely click links before you do and burn the one-time token — producing a login failure nobody can reproduce. You are standing in a restaurant on bad wifi; the flow that never leaves the app is the one that finishes.
- **iOS only for the next year**, which keeps Apple's setup on the simple path — no certificate to rotate every six months, which is exactly the chore a solo builder forgets.
- **Still no Supabase project.** The hold stands. A Supabase *account* exists; nothing is inside it, and that is correct — creating the project starts clocks on free-tier pausing and privacy obligations for no user benefit.

**Why Google-as-a-link is not decoration**

Supabase quietly merges accounts that share the same confirmed email address. So if you sign up with your Gmail address and Google sign-in arrives later, you are merged automatically and none of this matters. **It matters for the people whose Google address is not their account address — which is everyone who used Apple's "Hide My Email."** Those users would otherwise wake up one day to a brand-new, empty account. A health app attracts exactly those privacy-minded users, so that group is not a rounding error.

It also means the expensive, risky part gets built while the user base is small: attaching a second identity to an existing account is the one operation the last session proved everyone gets wrong.

**One thing the old plan got wrong, caught here**

The plan said health data never leaves the device. But the plan *also* said to upload each saved scan as-is — **and a saved scan carries the health condition inside it.** Those two instructions cannot both be followed. Left alone, the first sync would have put health data in the database and turned on the "Health" label in the App Store listing, which is the single flag that makes a reviewer scrutinise a health app. The fix is one small function that strips the condition before upload, and it has to exist *before* the first sync, because once those rows exist the privacy commitments are permanent.

**Three more design gaps, now closed** (detail in `auth-plan.md` §12)

- **The menu cache** — the biggest cost saver in the project — was going to be keyed per health condition, which would have split it into fragments and stopped saving money exactly as the app grew. It now caches the expensive part that is the *same* for everyone (reading the menu, working out ingredients) and scores per condition on the fly.
- **Scans made while signed out** had nowhere defined to go. Left alone, the next person to sign in on that phone would inherit the previous person's scans — with their health condition attached. There is now a three-line rule for who may claim them.
- **The app will write to the database directly**, which skips every protection the API has. Since a database cannot rate-limit, the answer is to make the worst case small: a size cap, a per-user row cap, and deliberately *not* granting permission to overwrite history.

**Why this matters more than it looks:** on the free tier, going over a limit does not send you a bill — it switches the database to read-only. The failure mode is the app going down, not an invoice.

**What then got built (same day)**

The cheap tier of the sign-in plan — the part that needs no server, no account and no Supabase project. On branch `feat/local-identity-and-history`.

- **The app now has an install ID.** A random, anonymous identifier stored in the iPhone Keychain. It answers a question the app currently cannot answer at all: *did anyone come back?* Every analytics event today is stateless, so there is no way to tell one person scanning ten menus from ten people scanning one. It is not an account, it has no name or email attached, and nothing is sent anywhere new.
- **Saved scans are finally visible.** The app has quietly saved every scan since launch to the phone, and no screen has ever read them back. There is now a "Saved scans" button on the home screen, a list of past scans with the date and the top dish, and tapping one reopens the full results. There is also a "Clear" option, with a confirmation.
- **A data-loss trap was closed first.** The old save code trimmed history to the last 10 on *every* save, with the limit set by a value that ships over the air. Had that limit been raised and then rolled back — which is exactly what happens on a bad day — the next scan would have silently deleted everything past the old limit. The storage cap is now a fixed number in the app's code that an over-the-air update cannot shrink; the over-the-air setting now controls only how many are *shown*. Config can no longer delete anything.

**Two things turned out to be already done**

Worth recording, because both were on the list as work:

- **Health data was never reaching iCloud.** The plan flagged this as a live App Store problem. The storage library the app uses has excluded itself from iCloud backup by default all along — verified by reading its iOS source, and the app has never overridden that. No work needed, and the guideline was never breached.
- **The results screen already carries the "check with your doctor" line.** It shipped in the first over-the-air update on 10 September. The plan was written on 7 September and said it was the one screen missing it; that was true for three days.

**What this costs: one TestFlight build.** The Keychain feature is a new native module, so it can't go out over the air — the app version moves to 1.2.0 (build 11). The practical consequence: **testers on build 9 stop receiving over-the-air updates until they install this one.** The saved-scans screen would have shipped over the air on its own; the install ID is what forces a build. Both are on the branch, so they can still be split if that trade isn't worth it.

**Verified:** typechecks clean, and the app config evaluates to 1.2.0 / build 11 with the new setting present. **Not verified: nothing has been run.** No simulator runtime on this machine, so the install ID has never actually been created or read back, and the saved-scans screen has never been looked at. The reinstall test — delete the app, reopen it, confirm the ID survived — is the whole point of putting it in the Keychain and is the one thing that most needs a real phone.

**Shipped over the air the same day**

The saved-scans half went out to build 9 testers as update group `c122b253`, runtime 1.1.4, published from commit `c2a379f`. Anyone on build 9 picks it up on the next cold start. The install-ID half did not go out and cannot — it needs the new binary.

This is the first time the two-commit split earned its keep: the history commit was checked out on its own and published from there, because `eas update` bundles the *working tree*, not a commit. Publishing from the branch tip would have sent a 1.2.0 bundle importing a native module that build 9 does not have, to a runtime version nobody is running.

**The publish command, finally written down.** `plan.md` claimed it was in this file and it wasn't:

```
cd apps/mobile
npm run update:production -- --message "..."
```

(That is the form as of the same day. The update that shipped was published with the longer
`npx eas-cli env:exec production 'npm run update:production -- ...'`; `env:exec` has since been
folded into `scripts/publish-update.sh` so the npm script is correct on its own and the wrapper
cannot be forgotten.)

`env:exec` is what supplies `APP_TOKEN` to the subprocess that evaluates `app.config.ts`. It works because `APP_TOKEN` is a **sensitive** EAS variable, not a *secret* one — sensitive values can be read off the build servers, secrets cannot. The long comment at the top of `app.config.ts` still says it is a secret that "cannot be pulled down locally at all"; that was true once and is now stale. `SENTRY_AUTH_TOKEN` is the one that is genuinely secret.

**One verification worth copying.** A first check appeared to show the token resolving empty, which would have stripped it from every device that installed the update. It was a false alarm — `expo config` colourises its output, and the ANSI escape codes sat between `appToken:` and the value, so the pattern could not match. Strip colour codes before grepping config output, or a passing check and a failing one look identical.

**A bug shipped, was caught, and was fixed the same day**

The saved-scans screen reuses the results screen to show an old scan — the right call, since a second copy would drift from the first within a build. But the results screen reads a "current scan session id" that only exists during an actual scan. Reopened from history there isn't one, so it used whichever scan ran last, or nothing at all on a cold start.

Nothing looked broken. A rating of a three-day-old menu was simply filed against this afternoon's scan, and the funnel gained a step between two scans nobody navigated between — quietly corrupting the one measurement the install-ID work exists to create. Shipped as update group `fff4ebfd`, runtime 1.1.4, so build 9 testers get it on the next cold start.

**This produced a second release branch, which is worth knowing about.** `ota/1.1.4` now tracks what build 9 testers are actually running. It exists because `main` has moved on to 1.2.0, and an update published from a 1.2.0 tree cannot reach a 1.1.4 binary. Anything that needs to reach today's testers is published from `ota/1.1.4`; anything that needs the new binary waits for build 11.

**And the new publish wrapper paid for itself immediately, twice.** The first attempt ran from `ota/1.1.4` before the wrapper existed there, so npm ran the old bare script — which died at config eval with no token, exactly the failure the wrapper was written to remove, and separately chopped the `--message` in half at the first space. Both were fixed by bringing the wrapper onto that branch.

**Merged, and build 11 is cut**

All of it merged to `main` (PR #18, eight commits kept rather than squashed, plus PR #19 correcting a claim about build 10). **EAS build `46feb5ce` finished** — v1.2.0, build 11, production profile — and was submitted to TestFlight. *At the time of writing the submission was still uploading; Apple's own processing runs after that, so it does not appear for testers immediately. Confirm it arrived before treating it as delivered.*

**It turned out build 10 had been built after all.** `plan.md` said it never was, and that claim had been copied into a source comment and a commit message before anyone ran `eas build:list` — which shows build `7af8814d` finished on 10 September as v1.1.4 build 10. Choosing build number 11 was right either way, and is better justified now: 10 was genuinely taken, so reusing it would have collided. Corrected in all three places. Still unverified, and a separate question the old note conflated: whether build 10 was ever *submitted*. **The general rule: EAS is the record of what was built. The docs are a secondary source and were wrong here.**

**Nothing about build 11 has been run.** No simulator runtime on this machine, so the install ID has never been minted or read back and the saved-scans screen has never been looked at on a device.

**What's next**

Two lookups only Sean can do: whether the Apple Developer account is enrolled as an Individual or an Organization, and whether a domain is owned (email sign-in is impossible without one — about $10–15/yr). Then, on a phone: cold-start the app twice and confirm the install ID holds, delete and reinstall and confirm it *still* holds, and look at the saved-scans screen — none of which has been seen running. After that the plan's next step is schema work on the laptop, which ships nothing and creates no Supabase project.

---

## 2026-09-09 / 09-10 — A liability review, the Terms we never had, and the first over-the-air update

**What changed**

Sean was warned about "getting sued with a vibe-coded app" and handed a 19-item checklist. The app was reviewed against it. Most of the list was a *website* checklist — cookies, embeds, refunds, form consent — and four items simply do not apply to a native iOS app whose entire web surface is three pages. But two real problems came out of it, and neither was on the list.

**The first: the app had no Terms of Service.** It has been an open legal gate since June and nothing had ever picked it up. The one-line "not medical advice" in the UI is a disclaimer with no contract behind it — and the default was worse than nothing, because with no EULA of our own, Apple's standard EULA applies, and that one says nothing about medical guidance at all.

There are Terms now, at `/terms`, written for a Colorado LLC running a health-adjacent AI app on Apple's platform. The parts that matter: claims lie against Dine Right LLC only and not against Sean or Ray personally; liability is capped; warranties are disclaimed; disputes go to individual arbitration with a 30-day opt-out; and Apple's required EULA terms are carried so Apple's own agreement does not govern instead.

**The biggest gap it closed was not on the checklist either: allergens.** The worst realistic injury from a menu app is not a cholesterol score being a point off — it is someone with a nut allergy assuming that an app which reads ingredients knows about nuts. It does not. It estimates saturated fat. That now says so in three places, including its own red block on the first screen anyone sees.

And Terms nobody agreed to are close to worthless, so the app now opens with a blocking "I Agree" screen with working links above the button. Acceptance is stored with the Terms *version*, so a future change re-prompts only the people who accepted the older text.

**The second: Sentry was recording sessions nobody had agreed to.** It was set to film one in ten sessions whether or not anything went wrong, and to attach IP addresses — while the published privacy policy told users replay only happened on errors. A published document said one thing and the code did another. Two lines fixed it, and the fix was made in the code rather than the policy: cheaper, and it means holding less rather than merely disclosing more.

**A real bug fell out of the review.** `StyleSheet.absoluteFillObject` was deleted from React Native 0.85 — from the runtime, not just the types — so the camera's shutter flash overlay collapsed to nothing and has been invisible since the SDK bump. The type error was the only thing saying so, and it had been sitting in a failing `tsc` that nobody was reading.

**Everything legally significant was also unreadable.** Every disclaimer in the app was grey-on-grey at 12px — 2.43:1 contrast, the least readable text in the app. "The warning was there, in grey, below the fold" is a plaintiff's exhibit, not a defence. Now 7.23:1.

**Why it mattered**

Three of the four serious findings are now closed: tracking, business details, and the disclaimers. The Terms were the fourth and largest, and they exist. What is left is smaller and mostly administrative.

**The LLC question is settled.** Dine Right LLC is registered in Colorado. The privacy policy has said so since June while `plan.md` and `log.md` both still listed it as undecided — the published legal document was the accurate one and five project files were stale. They agree now.

**Shipping it turned into its own project**

The changes were merged and then reached nobody for a day, because publishing an over-the-air update had never actually been done before. Four separate things blocked it, each real:

1. **The API token could not be read.** `APP_TOKEN` was stored in EAS with `secret` visibility, which EAS only ever decrypts on its own build servers. An update publishes from a laptop, so it could never resolve the token — it would have shipped an update with *no* token, silently, stripping it from every device that installed it. Harmless today while the API gate is open; a field outage the day that gate is switched on.
2. **The token needed rotating anyway** — the old value was burned months ago by being pasted into a chat transcript. It has been rotated and is now `sensitive`, which is what makes routine updates possible. `scripts/rotate-app-token.sh` does it without the value ever being shown; deliberately so, given how the last one leaked.
3. **The update tried to build for the web**, because `app.config.ts` spreads `app.json`, which still carries a `web` key from the original Expo template. Platforms are now stated explicitly.
4. **The local `ios/` folder disagrees with what actually ships.** It is untracked and gitignored, and claims the app uses JSC while the config's default — and what EAS really builds — is Hermes. It has to be moved aside for every publish until someone runs `npx expo prebuild --clean`.

**The first over-the-air update in the project's history is live** on the `production` branch at runtime 1.1.4, which is what build 9 runs. Everything above reaches the phone in Sean's pocket on the next cold start, with no new build.

**What this sets up**

Build 10 has a version bump committed but was never actually built — new TestFlight installs still get a two-week-old binary that picks these changes up on first launch. The App Store package is ready and waiting: `/support` exists because App Store Connect requires a support URL that resolves and there wasn't one, and `legal/eula-app-store.txt` is generated from the same component the website renders, because App Store Connect takes pasted text rather than a URL and two hand-maintained copies of one contract is how they end up disagreeing.

`app-store-legal-checklist.md` has the rest, including App Privacy answers derived from the code rather than from memory.

**Still open, and worth doing before an App Store submission:** get the Terms reviewed by a Colorado attorney; add the apartment number to the address in Terms §24; fix the privacy policy paragraph that describes a health-condition input the app does not have; confirm the Apple Developer enrollment is an Organization rather than an Individual, because Guideline 5.1.1(ix) is about who *submits*; and decide whether a residential address should stay on a public page.

---

## 2026-09-07 — Sign-in: planned it, checked it, and cut most of it

**What changed**

Three documents: `auth-plan.md` (rewritten), `privacy-policy-accounts-release.md` (new), and the live privacy policy (amended). No app code.

The morning's version of the plan said: use Supabase, give every user a silent invisible account from first launch, then upgrade it when they sign up. That plan was then checked against live sources and against this repo, and **the checking changed the answer**.

**Three things in the first draft were wrong.** The most serious: the method it recommended for upgrading a silent account into a real one *does not upgrade anything* — it quietly signs the person into a different, empty account and abandons everything they had saved. No error message. It looks like a successful sign-in. Had that shipped, the first person to sign in would have lost their history and we'd have had no idea why. The other two were a storage limit that no longer exists (so a workaround was planned for a problem that was fixed) and a merge routine, copied from the vendor's own documentation, that silently does nothing under the security rules this plan requires.

**And one fact about our own app changed the whole risk picture:** nothing in the app has ever displayed scan history. The code that saves it runs on every scan; the code that reads it has no caller. So we have been carefully saving the last 10 scans for every user since launch, and no user has ever seen one. The first draft called protecting that data "the main risk" of the project.

**So the plan is now much smaller.** Do two cheap things now: give each install a random id so returning users can be counted, and *ship the history screen that already has data waiting behind it*. Then stop. Don't create a database, don't create accounts, don't put anything on a server until there's a product reason. When that reason arrives, ship accounts as one complete release rather than dribbling the obligations out.

**Two things worth knowing that we didn't before:**

- **Apple decides the timing, not us.** Subscriptions must work on all of a user's devices. A subscription remembered only on one phone doesn't satisfy that. So real sign-in isn't a product preference we can schedule — it's a prerequisite of charging money.
- **Google sign-in is being dropped from v1.** Offering Google is what forces us to also offer Sign in with Apple, plus a Google consent screen that needs a Terms of Service we don't have. Apple sign-in plus an emailed code removes that entire obligation instead of satisfying it. Google can be added later if signup numbers ask for it.

**Why it mattered**

The re-cut keeps the project at $0/month, removes every failure mode that fails *silently*, and stops us from taking on Apple's account-deletion, consent and privacy-label obligations months before any user benefits from them. Cheaper, safer and less work, in that order.

**Two live problems this surfaced that have nothing to do with sign-in**

1. ~~**The privacy policy says the app is operated by Dine Right LLC.**~~ **Resolved 2026-09-09.** **Dine Right LLC is registered in Colorado** (confirmed by Sean, 2026-09-09), so `apps/api/src/app/privacy/page.tsx:15` has been accurate all along and the entity question is closed. The policy was right and the to-do lists were stale. Still open underneath it: whether the Apple Developer enrollment is Individual or Organization, and the fact that the policy names the entity without a registered address or entity number.
2. **The health condition may already be syncing to iCloud**, today, on build 9 — app storage is included in the device backup by default, and Apple's rules say health information may not be stored in iCloud. Worth checking regardless of anything in this plan.

**What changed in the privacy policy**

The live one was amended for what is true *today*: Vercel and Expo were added as service providers (both handle user data and neither was disclosed), and a section was added explaining how to delete your data, which Apple requires. Account language was deliberately **not** added — describing accounts we don't have would be inaccurate in the other direction. That version is drafted and waiting in `privacy-policy-accounts-release.md`, to deploy the same day accounts ship.

**Verified / not verified**

- The three corrections and the "no screen reads history" finding were each confirmed directly against the repo, not taken on trust.
- Pricing, free-tier limits and App Store guideline text were checked against live sources; roughly 17 items could not be confirmed and are listed as such in `auth-plan.md` §10 rather than asserted.
- **Nothing was built or tested.** No app code changed.
- The privacy policy's CCPA section is drafted, not lawyer-reviewed, and the draft flags which clauses need that review.
- Written on `feat/durable-rate-limit`, not `main`. Not committed.

---

## 2026-08-26 — Build 9 merged and submitted to TestFlight

**What changed**

Build 9 finally went out. The UX pass had been sitting on `feat/build9-ux-pass` since 10 August, committed but never pushed, while a separate line of scoring work (EAT-18, EAT-19, EAT-20 and the temperature-0 fix) landed on `main` in the meantime. Nobody had combined them. This session merged the two and submitted the result.

The merge needed three real decisions rather than a rubber stamp:

- **The results screen wanted two different footers.** The UX pass added the five-face "Was this analysis helpful?" prompt at the end of the list; the EAT-20 work added the section for items the API deliberately doesn't rank (alcohol, standalone sauces). Both were correct and neither knew about the other. The footer now shows the unranked section, then the unreadable section, then the rating.
- **The plan's "what's next" list was half-stale.** It still told the reader to merge EAT-18, EAT-19 and EAT-20 — all three had already merged. Rewritten to what is actually outstanding.
- **The change log had two competing "newest" entries.** Reordered by date; nothing was dropped.

**Why it mattered**

Build 8 is what is on the testers' phones, and it predates every one of the scoring fixes — including the one where roughly a quarter of a real menu had coin-flip tier colours, and the one where 21 of 29 dishes on a brunch menu came back "We couldn't score this one." Build 9 carries all of that plus the UX pass, so this is a substantially different app from what testers currently have.

**What it sets up**

Build 9 is the first build with over-the-air updates compiled in. Once testers install it once, the whole "blocked on designs" list — the welcome redesign, the camera sizing, the zoom calibration numbers — ships with `eas update` instead of another TestFlight round trip.

**Verified / not verified**

- Mobile typecheck is back at its two known pre-existing errors and no new ones; API typecheck clean; the Expo config evaluates to v1.1.4 / build 9 with the update URL and the appVersion runtime policy set.
- `main` pushed as `2c40cc9`. **Note this redeploys the API**, since the merge carries the EAT-18/19/20 changes into whatever Vercel builds from `main`.
- **Still nothing seen running.** No iOS simulator runtime on this machine, so none of the merged UI — including the new footer ordering above — has been looked at. That check moves to the device once build 9 lands in TestFlight.

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

## 2026-08-10 — UX pass for build 9, and the app can now be updated without a new build

**What changed**

Sean brought a list of UX improvements screen by screen and asked whether they could ship without an App Store release. Two answers came out of that:

- **There was no way to update the app without a full build, and now there is.** The app had never included Expo's over-the-air update support, so every change — even a single word of copy — required a new TestFlight build. Build 9 adds it. From build 9 onward, anything that is purely app code (copy, layout, colours, animations) can be pushed straight to testers' phones with one command; they pick it up the next time they open the app. Changes that touch the phone's native side still need a real build. **This does nothing for anyone still on build 8 — testers have to install build 9 once before any over-the-air update can reach them.**
- **To be clear about the App Store question:** nothing here needs one. TestFlight is not an App Store release, and the app is not publicly launched yet, so build 9 goes out exactly the way build 8 did.

The list itself was split. Everything unambiguous was built; everything that would have meant inventing a design was deliberately left alone (see "Still waiting on you" below).

**Built:**

- **The camera screen's photos and buttons are bigger.** Thumbnails went from 64pt to 96pt, the zoom buttons and shutter grew, and the viewfinder now sizes itself to the screen instead of being pinned at 280pt. That last one was also a latent bug: on a short phone the fixed height plus the photo tray pushed the Analyze button off the bottom of a screen that has no scrolling.
- **The "×" that removes a photo is no longer cut off.** It hangs off the corner of each thumbnail, and the sideways-scrolling strip was clipping anything outside its bounds — so the top of the circle was sliced. The strip now reserves that space.
- **A "Clear all" button**, with a confirmation, since it throws away every photo in one tap.
- **"Photos" now reads "Add your photos."**
- **"Retake" added to the full-screen photo view**, alongside close and delete — it drops the photo and returns you to the camera.
- **The loading screen's progress bar is rebuilt.** It counts through every number instead of jumping in 4% steps, runs as a real animation on the phone's display thread rather than being computed as it goes, and is tuned to feel fast — a quick run to 90%, then a slow creep, then straight to 100 when the analysis actually lands. The percentage is now the biggest thing on the screen, which is what people watch while waiting.
- **The "Did you know?" facts are shorter.** They were long enough that they changed before you could finish reading. One of them also contradicted the app's own scoring explanation — it warned about trans fats, which the same app correctly says have been banned in U.S. restaurants since 2018–2021. Replaced.
- **The Privacy Policy link now appears only on the welcome and results screens**, not mid-flow.
- **The two "explain the app" screens are now one.** The welcome screen had a "How it works →" link in the footer *and* a floating "?" in the corner leading somewhere else — the same question with two answers. They're merged into a single screen behind the one "?". That "?" was also a dark charcoal circle sitting on a near-white screen, which read as a smudge rather than a button; it's now light.
- **The welcome screen animates in**, staggered top to bottom, built as a reusable wrapper so it survives the redesign that screen is still due.
- **A per-scan rating on the results screen.** "Was this analysis helpful?" with five faces at the end of the results. One tap records an answer on its own — so we hear from the majority who won't fill in a form — and opens the fuller prompt already filled in for anyone willing to say more.
- **The feedback prompt is rebuilt** as "Your experience" (five stars, the only required field), "What did you think" (quick options that change depending on whether the rating was low or high, so each one can be specific), and "Tell us more". Everything toggles: tap a selected star to clear it, tap a chosen option to unchoose it. Closing without sending is always allowed.
- **Scan ratings are now tagged separately in the same Google Sheet**, with the scan's session ID, dish count, app version and environment alongside — so per-menu ratings can be told apart from general feedback.
- **A daily cap of 5 scans per device**, with a native alert on the sixth. It's checked before anything is uploaded, so a blocked scan costs nothing at all, and it survives closing the app. The limit is deliberately readable from config, which means it can be retuned over the air without a build.

**Decisions made**

- **A global daily cost cap was NOT built.** It can't be, on the current setup: the API's rate limiter lives in each serverless instance's memory, so it resets on cold starts and isn't shared between instances — it cannot bound a day's spend across users. A real one needs durable shared storage (Upstash/Vercel KV). Sean chose to ship the per-device cap now and keep the Anthropic account spend cap as the financial backstop — which is still an unconfirmed P0 in `plan.md` and is now the *only* global limit. Worth confirming it's actually set.
- **The per-device cap is a cost guard, not a security boundary.** It lives in the app's own storage, so deleting and reinstalling resets it. That's an acceptable trade for something whose job is to bound ordinary heavy use.
- **The 2×/3× zoom buttons are wrong and were left alone on purpose.** Sean asked to confirm them. They don't do what they say: expo-camera's zoom setting is documented as "a percentage of the device's max zoom", and there is no way to ask the phone what its maximum is. That maximum ranges from about 16× to 123× depending on the iPhone, so the current 0.02 is somewhere between ~1.3× and ~3.4× and the labels can't be trusted on any given device. Guessing a new number would just be wrong in a different way. Instead the viewfinder's zoom percentage now shows for button taps as well as pinching, so calibration takes about thirty seconds on a real phone: pinch until the framing looks like a true 2×, read the number, divide by 100. **Those corrected values can then ship over the air — no build.**
- **Landscape photos will not be rejected by the analyzer.** Sean flagged this as needing confirmation before any landscape work. Checked: the photo compression already handles both orientations (it resizes by the long edge either way) and the menu-reading prompt judges whether something is a menu by its content, not its shape. The real risk is a *rotated* photo — phone held upright, menu sideways in the frame — which is a framing-guidance problem, not a rejection one. Note also that the app is locked to portrait in its native config, so the vertical/horizontal swap can never ship as an over-the-air update.

**Still waiting on you**

Deliberately not built, because doing them without a design meant guessing:

- **The welcome screen's redesign** — the four feature chips becoming numbered steps 1-3, and the "have high cholesterol?" targeted headline. Also: "background too dark" could not be reproduced — that screen's background is already near-white, and the only genuinely dark thing on it was the "?" button, which has been lightened. A screenshot would settle it.
- **The camera filling most of the screen** — the biggest change on the list, and a full re-layout of what sits above and below the viewfinder.
- **Vertical/horizontal swap (EAT-14)** — still the ticket that has always been waiting on a design.
- **The condition dropdown** — deferred; the API only accepts high cholesterol today.
- **The Google Apps Script needs new columns.** The app now sends `feedback_type`, `tags`, `scan_session_id`, `dish_count`, `app_version` and `environment`. The script that writes to the sheet lives outside this repo, so until someone adds those columns there, the new fields arrive and go nowhere.

**Verified / not verified**

- Mobile typecheck is back to its two known pre-existing errors and no new ones; API typecheck clean; the dedupe suite passes 10/10; the Expo config evaluates to v1.1.4 / build 9 with the update policy and scan limit set.
- **Nothing was seen running.** This machine still has no iOS simulator runtime installed (`xcrun simctl list runtimes` is empty). Every visual change above — the bigger controls, the fixed "×", the new progress bar, the rebuilt feedback sheet, the merged info screen, the welcome animation — is unverified on a device.
- **The zoom values are known-wrong and still wrong**, by choice, pending calibration. Note a simulator would not help here even if one were installed — it has no camera.

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
- Confirm app icon is final or replace it. Run the three AI validation tests. Set the Anthropic spend cap. ~~Decide on LLC.~~ (Closed 2026-09-09 — Dine Right LLC is registered in Colorado.) Skim `backlog.md` and fold any still-live ideas into the GTM Launch Tracker.

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
