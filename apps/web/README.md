# apps/web — eatoutbetter.com

The marketing site: pre-launch waitlist today, App Store download once the listing exists. Next.js 16 (App Router, static), Tailwind 4, `motion` for the two animated pieces. Deployed as its own Vercel project, `eat-out-better-web` (root directory `apps/web`), separate from the API.

**Not an npm workspace on purpose.** It has its own `package-lock.json` so installing or upgrading it can never change what the API project installs or builds.

```bash
cd apps/web
npm install
cp .env.example .env.local   # fill SUPABASE_PUBLISHABLE_KEY
npm run dev
```

## Going live (when the App Store listing exists)

Set two env vars on the Vercel project and redeploy. No code change:

- `NEXT_PUBLIC_APP_STORE_URL` = the listing URL (`https://apps.apple.com/app/id<ID>`)
- `NEXT_PUBLIC_LAUNCH_STATE` = `live`

Every CTA becomes a download button, `/get` redirects iPhones to the store (with `ct=<placement>` so App Store Connect shows which button converted), and the QR code, which always encodes `eatoutbetter.com/get?src=qr`, starts landing on the store. Printed QR codes keep working.

Also at launch: swap the CTA's placeholder badge for Apple's official badge artwork (see the TODO in `components/Cta.tsx`) and uncomment the Smart App Banner in `app/layout.tsx`.

## Where things live

| What | File |
|---|---|
| Product facts (single source for page, JSON-LD, llms.txt) | `lib/site.ts` |
| Sample menu for the hero and demo (illustrative, labeled as such) | `lib/sample-menu.ts` |
| Waitlist form → Supabase `join_waitlist()` | `app/actions.ts`, `components/WaitlistForm.tsx`, `supabase/migrations/20261006000000_waitlist.sql` |
| Tracked download redirect | `app/get/route.ts` |
| SEO / AI search | `app/robots.ts`, `app/sitemap.ts`, `app/llms.txt/route.ts`, `lib/jsonld.tsx`, `app/high-cholesterol-restaurant-guide/` |
| Privacy / Terms / Support | redirect to the API project's pages (one copy of each) — `next.config.ts` |

## Adding the demo video

The "See it for real" block under How it works renders only when `DEMO_VIDEO` in `lib/site.ts` is set. It's `null` today, so nothing shows.

1. Compress a screen recording to H.264 MP4 (`ffmpeg -i in.mov -vf scale=-2:1280 -c:v libx264 -crf 26 -preset slow -an -movflags +faststart public/video/demo.mp4`; drop `-an` if it has audio). Aim for under 5 MB. `+faststart` lets it start before it finishes downloading.
2. Export one frame as the poster (`public/video/demo-poster.jpg`) and, ideally, a `.vtt` caption file.
3. Fill in `DEMO_VIDEO` (paths, width, height, one-sentence description) and redeploy.

Files live in `public/`, so keep them small: git history never forgets a big binary. Anything over about 10 MB should go in Vercel Blob instead, with its host added to `media-src` in `next.config.ts`. Don't embed YouTube/Vimeo: the CSP blocks it, and it would break the cookie-free promise in the privacy policy.

Events: `video_play` and `video_complete` (once each per page view) in Vercel Analytics.

## Reading the waitlist

Supabase dashboard → Table Editor → `waitlist_signups` (newest first, numbered; "Export to CSV" in the same screen). That is the only copy: there are no per-signup emails. The publishable key can only add rows, never read them.
