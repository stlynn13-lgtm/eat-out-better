# Eat Out Better — V0 Launch Checklist

**Goal:** Get the app running on your iPhone via TestFlight, shared with Ray.  
**The code already exists** at `~/Documents/Claude/Projects/Eat Out Better/` as a full Expo monorepo.  
**Last updated:** 2026-06-01

---

## Phase 1 — Accounts & Credentials (Do this first, today)
*These are blockers for everything else. Most are one-time setup.*

- [ ] **1.1 Anthropic API key** — get one at https://console.anthropic.com/settings/keys  
  → You need a paid plan ($5 minimum credit). This is your app's core engine cost.  
  → Save the key somewhere safe — you'll add it to Vercel in Phase 3.

- [ ] **1.2 GitHub account** — if you don't have one, create at https://github.com  
  → Your username is `stlynn13-lgtm` (already noted)

- [ ] **1.3 Create GitHub repo**
  ```
  1. Go to https://github.com/new
  2. Repository name: eat-out-better
  3. Set to Private
  4. Do NOT initialize with README (code already exists locally)
  5. Click "Create repository"
  6. Copy the remote URL shown (https://github.com/stlynn13-lgtm/eat-out-better.git)
  ```

- [ ] **1.4 Vercel account** — sign up at https://vercel.com using your GitHub account  
  → This hosts your API layer (the server that calls Claude). Free tier is sufficient.

- [ ] **1.5 Apple Developer Program** — enroll at https://developer.apple.com/programs/  
  → Cost: **$99/year** — required for TestFlight and App Store distribution  
  → Takes up to 48 hours to activate after payment  
  → Use your personal Apple ID

- [ ] **1.6 Expo account** — create at https://expo.dev  
  → Free. Required for EAS Build (the cloud build service that creates your .ipa without needing Xcode)

---

## Phase 2 — Local Dev Setup

- [ ] **2.1 Verify Node.js version**
  ```bash
  node --version
  # Must be 20+. If not: https://nodejs.org
  ```

- [ ] **2.2 Install Expo CLI + EAS CLI**
  ```bash
  npm install -g expo-cli eas-cli
  ```
  → Run this in your **Mac Terminal** (not Claude's shell)

- [ ] **2.3 Log into Expo from terminal**
  ```bash
  eas login
  # Enter your Expo account credentials
  ```

- [ ] **2.4 Install project dependencies**
  ```bash
  cd ~/Documents/Claude/Projects/Eat\ Out\ Better
  npm install
  ```

- [ ] **2.5 Create environment file for the API**
  ```bash
  cd apps/api
  cp .env.local.example .env.local
  # Open .env.local and add your ANTHROPIC_API_KEY
  ```

- [ ] **2.6 Test the API locally**
  ```bash
  npm run api
  # Should start at http://localhost:3000
  # Visit http://localhost:3000/api/health — should return { status: "ok" }
  ```

- [ ] **2.7 Test the mobile app locally with Expo Go**
  ```bash
  npm run mobile
  # Scan the QR code with Expo Go app on your iPhone
  # Expo Go is free on the App Store — good for quick iteration
  # Note: camera features may be limited in Expo Go; EAS Build is the full test
  ```

---

## Phase 3 — Push Code to GitHub

- [x] **3.1 Initialize git and push to your new repo** — ✅ Done. Repo is live on `main` with commit history.
  ```bash
  cd ~/Documents/Claude/Projects/Eat\ Out\ Better
  git init
  git add .
  git commit -m "feat: initial V0 Expo monorepo — 4 screens, Claude Haiku pipeline"
  git branch -M main
  git remote add origin https://github.com/stlynn13-lgtm/eat-out-better.git
  git push -u origin main
  ```

- [x] **3.2 Verify repo is visible at** https://github.com/stlynn13-lgtm/eat-out-better — ✅ confirmed

---

## Phase 4 — Deploy the API to Vercel

The API (`apps/api`) is a Next.js app that your mobile app calls. It lives on Vercel.

- [ ] **4.1 Import the repo into Vercel**
  ```
  1. Go to https://vercel.com/new
  2. Import your GitHub repo (eat-out-better)
  3. Vercel will ask for the root directory — set it to: apps/api
  4. Framework: Next.js (auto-detected)
  5. Do NOT deploy yet — add env vars first
  ```

- [ ] **4.2 Add environment variable in Vercel**
  ```
  Key:   ANTHROPIC_API_KEY
  Value: [your key from Phase 1.1]
  Environment: Production, Preview, Development
  ```

- [ ] **4.3 Deploy**
  → Click Deploy. Takes ~60 seconds.  
  → You'll get a URL like: `https://eat-out-better-api.vercel.app`  
  → Test it: visit `https://your-vercel-url/api/health` — should return `{ status: "ok" }`

- [x] **4.4 Update mobile app to point to your Vercel URL** — ✅ The API URL lives in **`apps/mobile/app.config.ts`** under `extra.apiUrl` (currently `https://eat-out-better-api.vercel.app`, overridable via the `API_URL` env var). There is no `lib/config.ts`.

---

## Phase 5 — Build the iOS App with EAS

This creates the actual `.ipa` file that goes to TestFlight. No Xcode required.

- [ ] **5.1 Configure EAS in the project**
  ```bash
  cd ~/Documents/Claude/Projects/Eat\ Out\ Better
  eas build:configure
  # Select: iOS only (for V0)
  # This creates/updates eas.json
  ```

- [ ] **5.2 Link your Apple Developer account to EAS**
  ```bash
  eas credentials
  # Follow prompts to connect your Apple Developer account
  # EAS will generate your provisioning profile and signing certificate
  ```

- [ ] **5.3 Run your first EAS Build (TestFlight profile)**
  ```bash
  eas build --platform ios --profile preview
  # "preview" profile = TestFlight distribution
  # First build takes ~15-20 minutes (EAS cloud servers)
  # You'll get a build URL to monitor progress
  # Free tier: 30 builds/month — sufficient for V0
  ```

- [ ] **5.4 Download the .ipa when build completes**
  → EAS dashboard shows the download link  
  → Or use: `eas build:list` to see status

---

## Phase 6 — Submit to TestFlight

- [ ] **6.1 Submit to App Store Connect**
  ```bash
  eas submit --platform ios
  # EAS handles the upload to Apple directly
  # Requires your Apple Developer credentials
  ```

- [ ] **6.2 Set up TestFlight in App Store Connect**
  ```
  1. Go to https://appstoreconnect.apple.com
  2. Find your app under "My Apps"
  3. Go to TestFlight tab
  4. Add yourself and Ray as internal testers (email invite)
  5. Apple sends a TestFlight invite — install TestFlight app, accept invite
  ```

- [ ] **6.3 Test the full flow on a real device**
  → Open the app from TestFlight (not Expo Go)  
  → Go to a restaurant (or use a printed menu at home)  
  → Photograph a menu, tap Analyze, verify results  
  → Log every failure mode for V0.5 fix list

---

## Phase 7 — Iteration Loop (How coding continues)

Once everything above is done, this is your ongoing workflow:

- [ ] **For JS/UI changes (copy, scores, colors, layout):**
  ```bash
  # Make changes in Claude Cowork session
  # Push to GitHub: git add . && git commit -m "..." && git push
  # Run: eas update --branch production
  # Change appears on user's device within minutes — NO App Store review
  ```

- [ ] **For API changes (Claude prompts, scoring logic):**
  ```bash
  # Push to GitHub main
  # Vercel auto-deploys in ~60 seconds
  # No app rebuild needed
  ```

- [ ] **For native code changes (new Expo modules, permissions):**
  ```bash
  # Requires new EAS Build + TestFlight resubmission
  # Plan ~30 min per cycle
  ```

---

## Costs Summary

| Item | Cost | When |
|------|------|------|
| Apple Developer Program | $99/year | Phase 1 — pay now |
| Anthropic API credits (app usage) | ~$0.01–0.04/menu scan | Pay-as-you-go |
| Anthropic API credits (coding sessions) | ~$5–50 total for V0 build | Pay-as-you-go |
| Vercel (API hosting) | Free (Hobby tier) | Free |
| EAS Build | Free (30 builds/month) | Free |
| GitHub | Free (private repo) | Free |
| Expo account | Free | Free |
| Domain name (optional — not needed for V0) | ~$12/year | Skip for now |
| Supabase (not needed until V1) | Free tier when needed | Skip for now |

**Total to get V0 into TestFlight: ~$100–105** (Apple dev account + small API credits)

---

## Timeline (working at 2–3 sessions/week)

| Milestone | Estimated time from today |
|-----------|--------------------------|
| Accounts set up (Phase 1) | Today — 1–2 hours |
| Local dev running + code on GitHub (Phases 2–3) | Today — 1 hour |
| API live on Vercel (Phase 4) | Today — 30 min |
| First EAS Build submitted to TestFlight (Phases 5–6) | Day 2–3 (waiting on Apple dev activation) |
| First real restaurant test with Ray | End of week 1 |
| V0.5 build starts | 2–4 weeks after V0 test |

---

## Open Questions (remaining before Ray review)

| Question | Owner | Status |
|----------|-------|--------|
| Are the Claude Haiku prompts accurate for cholesterol ranking? | Ray | Test in V0 |
| Is <30s processing time acceptable on real restaurant WiFi? | Sean + Ray | Test in V0 |
| Is OCR accuracy ≥80% on printed menus? | Ray | Test in V0 |
| What API_URL config file path to update for Vercel URL? | Sean | Phase 4.4 |

---

## What I Still Need to Confirm

- [x] Where exactly is the `API_URL` constant set in `apps/mobile/`? — **Resolved:** `apps/mobile/app.config.ts` → `extra.apiUrl`.
- [ ] Does `apps/api/.env.local.example` exist? (verify)
- [x] Does `eas.json` already exist in the project? — **Yes**, at `apps/mobile/eas.json` (dev/preview/production iOS profiles + production submit config).

> **Status note (2026-06-23):** Phases 1–4 are effectively complete (accounts, repo on GitHub, API on Vercel, mobile pointed at it). Current work is the **v1.1.0** product-improvement release (logo, camera zoom, 12-photo limit, fun facts, privacy policy, "how it works", bug fixes) on branch `release/v1.1.0`. EAS build/submit (Phases 5–6) remains the path to TestFlight.
