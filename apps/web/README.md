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

## Reading the waitlist

Supabase dashboard → Table Editor → `waitlist` (or SQL: `select * from waitlist order by created_at`). The publishable key can only add rows, never read them.
