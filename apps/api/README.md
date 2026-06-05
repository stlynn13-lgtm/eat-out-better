# Eat Out Better — V0 Setup Guide

## Prerequisites

Before starting, you need:
- **Node.js 20+** — check with `node --version`. Install from [nodejs.org](https://nodejs.org) if needed.
- **An Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com/settings/keys)
- **VS Code** (recommended) with the ESLint and Prettier extensions

---

## First-time setup (5 minutes)

### 1. Open a terminal in this folder

If you're in VS Code: `View → Terminal` (or `` Ctrl+` ``).  
You should be in the `eat-out-better/` directory. Confirm with `pwd`.

### 2. Install dependencies

```bash
npm install
```

This installs Next.js, React, Zustand, the Anthropic SDK, and dev tools.  
Takes ~30s. You'll see a `node_modules/` folder appear — don't commit it.

### 3. Create your environment file

```bash
cp .env.local.example .env.local
```

Then open `.env.local` in VS Code and replace the placeholder with your real API key:

```
ANTHROPIC_API_KEY=sk-ant-api03-...your-actual-key-here...
```

**Important:** `.env.local` is in `.gitignore`. Never push it to GitHub.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the Eat Out Better welcome screen.

---

## Testing the app on mobile

The camera feature requires a real mobile device (not a desktop browser —  
desktop camera access has different limitations).

**To test on your phone:**

1. Make sure your laptop and phone are on the same WiFi network.
2. Find your laptop's local IP: run `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows).
3. Open `http://YOUR_IP:3000` on your phone's browser (Safari on iOS, Chrome on Android).
4. iOS Safari will prompt for camera access — approve it.

**Alternative for desktop testing:**
- Use a menu photo from your Photos library (the "Upload from Photos" option)
- Download any restaurant menu image from Google and upload it

---

## Project structure (quick reference)

```
src/
  app/               ← Next.js pages (4 screens + API routes)
  components/        ← UI components
  lib/
    claude/          ← OCR and ranking logic (server-side only)
    config/          ← Scoring thresholds, tips, health conditions
    types/           ← TypeScript interfaces
    storage/         ← localStorage session management
    utils/           ← Image compression, formatting
  hooks/             ← useCamera, useAnalysis
  store/             ← Zustand global state
```

---

## Common issues

**"ANTHROPIC_API_KEY is not set"**  
Make sure `.env.local` exists and has the correct key. Restart the dev server after editing it.

**Camera shows "access denied"**  
On desktop Chrome: Settings → Privacy & Security → Site Settings → Camera → allow localhost.  
On iOS Safari: Settings → Safari → Camera → Ask (then re-open the page).

**Analysis takes longer than 30s**  
Haiku processes most menus in 15–25s. If it's taking longer:
- Check your Anthropic API key is valid and has credits
- Large images slow OCR — the app compresses before sending, but very busy menus take longer
- Check Anthropic's status page: [status.anthropic.com](https://status.anthropic.com)

**"Failed to compress image"**  
The image may be a format that `createImageBitmap` doesn't support in your browser.  
Try a JPEG or PNG photo taken with your phone camera.

---

## Deploying to Vercel (when ready)

```bash
# Install Vercel CLI once
npm install -g vercel

# Deploy
vercel

# Follow prompts — link to your Vercel account, create a new project
```

After deploying, add `ANTHROPIC_API_KEY` to your Vercel project:  
Vercel Dashboard → Your Project → Settings → Environment Variables.

---

## Architecture reference

See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the complete system design,  
database schema, API specs, and V0→V1 migration path.

---

## Next steps after V0 validation

Once you and Ray have tested on real menus:

1. Log every failure mode (bad OCR, wrong rankings, slow processing)
2. Those failures become the V0.5 fix list (already designed — see ARCHITECTURE.md)
3. V0.5 adds: substitution suggestions, image quality detection, session history, manual OCR correction

The spec and backlog live in Google Drive → https://drive.google.com/drive/project/1w64UTHj8fF50nvfLySNTy9Rl-gnHxTlC?usp=sharing
