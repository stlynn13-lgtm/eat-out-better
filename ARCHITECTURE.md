# Eat Out Better — System Architecture

**Authored by:** Claude (Sonnet 4.6)  
**Date:** 2026-05-27  
**PRD version:** v0 / v0.5 / v1 (Google Drive, last updated 2026-05-25)  
**Grounding:** This doc is the authoritative technical reference. When in conflict with Google Drive docs other than the PRD, this wins.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (Mobile Browser)                      │
│         Next.js 14 App Router · React · TypeScript              │
│         Tailwind CSS · Zustand · localStorage                    │
│                                                                  │
│    Screen 1        Screen 2        Screen 3        Screen 4      │
│    Welcome  ──►   Capture   ──►  Processing  ──►  Results       │
│                    (multi-                        (ranked        │
│                     photo)                         dishes)       │
└───────────────────────────────┬─────────────────────────────────┘
                                │  POST /api/analyze
                                │  (base64 images + condition)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               NEXT.JS API ROUTES (Vercel Serverless)            │
│                                                                  │
│   /api/analyze  ──► OCR pipeline ──► Ranking pipeline           │
│   /api/health   (readiness probe)                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼ (V1 only)
          ┌──────────────────┐    ┌──────────────────────┐
          │   Claude API     │    │      Supabase         │
          │   (Anthropic)    │    │  Postgres · Auth      │
          │                  │    │  Storage · Realtime   │
          │  Step 1: OCR     │    │                      │
          │  claude-haiku    │    │  Users               │
          │  (vision input)  │    │  Health Profiles     │
          │                  │    │  Menu Sessions       │
          │  Step 2: Rank    │    │  Dishes              │
          │  claude-haiku    │    │  Restaurants         │
          │  (text input)    │    └──────────────────────┘
          └──────────────────┘
```

---

## Tech Stack Decisions

| Layer | V0 | V0.5 | V1 |
|---|---|---|---|
| Frontend | Next.js 14 App Router | Same | Same |
| Styling | Tailwind CSS | Same | Same |
| State | Zustand + localStorage | Same | Zustand + Supabase |
| API | Next.js route handlers | Same | Same (or extract to FastAPI) |
| OCR | Claude Vision (Haiku) | Claude Vision (Haiku) | Claude Vision (Sonnet) |
| Ranking | Claude Haiku | Claude Haiku | Claude Sonnet |
| Auth | None | None | Supabase Auth |
| Database | None | None | Supabase Postgres |
| Hosting | Vercel | Vercel | Vercel (or AWS ECS) |
| CDN | Vercel Edge | Same | Same |

**Why Claude Vision for OCR (not Tesseract.js or Google Vision):**  
- Single service = one API key, one billing relationship, one failure mode  
- Accuracy on real-world menus (varied fonts, angles, lighting) is significantly better than Tesseract  
- Same provider as ranking step = no latency cost between services  
- Cost: Haiku vision tokens are ~$0.00025/image — negligible for V0, acceptable at scale

**Why two-step (OCR → Rank) vs. one-shot:**  
- V0.5 requires a manual OCR correction UI between extraction and ranking  
- Two-step lets us show real progress (OCR = 0–60%, Rank = 60–100%)  
- Separation of concerns: OCR prompt and ranking prompt can be tuned independently  
- If OCR fails, we return a structured error with zero dishes extracted (not a partial result)

---

## Repository Structure

```
eat-out-better/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (fonts, meta, providers)
│   │   ├── globals.css               # Global styles + CSS variables
│   │   ├── page.tsx                  # Screen 1: Welcome
│   │   ├── capture/
│   │   │   └── page.tsx              # Screen 2: Menu Capture
│   │   ├── processing/
│   │   │   └── page.tsx              # Screen 3: Processing
│   │   ├── results/
│   │   │   └── page.tsx              # Screen 4: Ranked Results
│   │   └── api/
│   │       ├── analyze/
│   │       │   └── route.ts          # POST /api/analyze (main pipeline)
│   │       └── health/
│   │           └── route.ts          # GET /api/health (readiness probe)
│   │
│   ├── components/
│   │   ├── ui/                       # Primitive components (no business logic)
│   │   │   ├── Button.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Badge.tsx
│   │   ├── menu/                     # Feature components (menu-aware)
│   │   │   ├── DishCard.tsx          # Single ranked dish row
│   │   │   ├── ScoreBadge.tsx        # X.X/10 badge with tier color
│   │   │   ├── PhotoThumbnail.tsx    # Added photo preview thumbnail
│   │   │   ├── ProcessingTip.tsx     # Rotating educational tip card
│   │   │   └── CameraViewfinder.tsx  # Camera capture UI
│   │   └── layout/
│   │       └── AppShell.tsx          # Wrapper with safe-area + max-width
│   │
│   ├── lib/
│   │   ├── types/
│   │   │   └── index.ts              # All TypeScript types and interfaces
│   │   ├── config/
│   │   │   ├── scoring.ts            # Score thresholds (centralized, easy to tune)
│   │   │   ├── tips.ts               # Processing screen educational tips
│   │   │   └── health.ts             # Health condition registry (V1-ready)
│   │   ├── claude/
│   │   │   ├── client.ts             # Anthropic SDK singleton
│   │   │   ├── prompts.ts            # System prompts for OCR and ranking
│   │   │   ├── ocr.ts                # Image(s) → ExtractedDish[]
│   │   │   └── ranking.ts            # ExtractedDish[] → RankedDish[]
│   │   ├── storage/
│   │   │   └── session.ts            # localStorage read/write (V1: swap to Supabase)
│   │   └── utils/
│   │       ├── image.ts              # Compression, base64, MIME validation
│   │       └── format.ts             # Score formatting, display helpers
│   │
│   ├── store/
│   │   └── useAnalysisStore.ts       # Zustand global store
│   │
│   └── hooks/
│       ├── useCamera.ts              # Device camera access + capture
│       └── useAnalysis.ts            # Analysis orchestration hook
│
├── public/
│   └── icons/                        # App icon, favicon
│
├── .env.local.example                # Required env vars (never commit .env.local)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── ARCHITECTURE.md                   # This file
```

---

## API Endpoints

### `POST /api/analyze`

Main pipeline. Receives menu photos, orchestrates OCR → ranking, returns results.

**Request:**
```typescript
{
  images: string[];        // base64-encoded images (max 10, each max 10MB compressed)
  healthCondition: string; // 'high_cholesterol' for V0; extensible enum for V1
}
```

**Response (success):**
```typescript
{
  success: true;
  data: {
    sessionId: string;       // UUID, stored in localStorage
    dishes: RankedDish[];    // Ranked best-to-worst (rank 1 = best)
    rawDishes: ExtractedDish[]; // Pre-ranking extract (for V0.5 correction UI)
    dishCount: number;
    processingTimeMs: number;
    healthCondition: string;
  }
}
```

**Response (error):**
```typescript
{
  success: false;
  error: {
    code: 'OCR_EMPTY' | 'CLAUDE_ERROR' | 'INVALID_IMAGE' | 'RATE_LIMIT' | 'UNKNOWN';
    message: string;
  }
}
```

**Error codes:**
- `OCR_EMPTY` → Zero dishes extracted from image(s). Show retry screen.
- `INVALID_IMAGE` → Image failed validation (size, MIME type). Client-side catch first.
- `CLAUDE_ERROR` → Claude API returned an error. Retry once, then surface.
- `RATE_LIMIT` → Claude rate limit hit. Surface with retry-after guidance.

---

### `GET /api/health`

Vercel / uptime monitors. Returns build metadata.

```typescript
{ status: 'ok'; version: string; timestamp: string }
```

---

## Database Schema (V1-ready, not active in V0)

Designed now so V1 migration is an `ALTER TABLE` not a rewrite. V0 uses localStorage with matching shape.

```sql
-- Health conditions registry (avoids hardcoding in code)
CREATE TABLE health_conditions (
  id TEXT PRIMARY KEY,              -- 'high_cholesterol', 'gluten_free', etc.
  name TEXT NOT NULL,               -- 'High Cholesterol'
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (V1 auth, matches Supabase Auth uid)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health profiles (one user can have multiple conditions in V1)
CREATE TABLE health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  condition_id TEXT REFERENCES health_conditions(id),
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  custom_weights JSONB DEFAULT '{}',   -- Per-condition LLM weight overrides
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, condition_id)
);

-- Menu analysis sessions
CREATE TABLE menu_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = anonymous
  health_condition_id TEXT REFERENCES health_conditions(id),
  photo_count INTEGER NOT NULL DEFAULT 1,
  raw_ocr_text TEXT,                   -- Raw OCR before ranking (for debugging)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_code TEXT,
  dish_count INTEGER,
  processing_time_ms INTEGER,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual dishes from a session
CREATE TABLE dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES menu_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  score NUMERIC(3, 1) NOT NULL CHECK (score >= 1.0 AND score <= 10.0),
  rank INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  substitution TEXT,                   -- V0.5+
  tier TEXT NOT NULL CHECK (tier IN ('green', 'yellow', 'red')),
  tag TEXT CHECK (tag IN ('top-pick', 'enjoy-occasionally')),
  ocr_confidence TEXT CHECK (ocr_confidence IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurants (V1 search / pre-loaded menus)
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_place_id TEXT UNIQUE,
  cuisine_type TEXT,
  location JSONB,                      -- { lat, lng, city, state, country }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dishes_session_id ON dishes(session_id);
CREATE INDEX idx_dishes_tier ON dishes(tier);
CREATE INDEX idx_menu_sessions_user_id ON menu_sessions(user_id);
CREATE INDEX idx_menu_sessions_created_at ON menu_sessions(created_at DESC);
CREATE INDEX idx_health_profiles_user_id ON health_profiles(user_id);
```

**RLS Policies (Supabase V1):**
- `menu_sessions`: users can only read/write their own rows
- `dishes`: visible if the linked session is visible to the user
- `health_profiles`: users can only read/write their own profile

---

## Claude Pipeline Design

### Step 1 — OCR (Vision, Haiku)

- **Model:** `claude-haiku-4-5-20251001`
- **Input:** Base64-encoded JPEG/PNG (one at a time for multi-page menus)
- **Max images in parallel:** 5 (Haiku rate limit safe)
- **Timeout:** 30s per image
- **System prompt:** Structured extraction prompt → returns JSON array
- **Retry:** 1x on non-4xx errors with 2s backoff

```
Images → [Promise.all OCR x N] → Merge dish arrays → Deduplicate → Pass to Step 2
```

### Step 2 — Ranking (Text, Haiku)

- **Model:** `claude-haiku-4-5-20251001`
- **Input:** Merged dish list as JSON (max 100 dishes)
- **Output:** Ranked JSON array with score, explanation, tier, tag
- **Timeout:** 45s
- **Retry:** 1x on non-4xx errors

```
Merged dishes → Single ranking call → Parse JSON → Assign IDs → Sort by rank → Return
```

### Prompt Engineering Notes

- System prompt encodes the health condition (V0: always high cholesterol)
- Ranking prompt includes explicit scoring rubric to reduce variance
- Output format is strict JSON with a schema comment — Claude is instructed to return ONLY valid JSON
- Score is requested as a float (1.0–10.0) even though display rounds to 1 decimal — preserves sort precision

---

## State Machine (Client)

```
idle
  │
  ├─ addImage() ──► idle (images.length > 0)
  │
  ├─ startAnalysis() 
  │    │
  │    ▼
  │  uploading (compressing + encoding images)
  │    │
  │    ▼
  │  extracting (OCR step, 0–60%)
  │    │
  │    ├─ error → 'error' state (OCR_EMPTY or CLAUDE_ERROR)
  │    │
  │    ▼
  │  ranking (ranking step, 60–100%)
  │    │
  │    ├─ error → 'error' state
  │    │
  │    ▼
  │  complete (results populated)
  │
  └─ reset() ──► idle (clears images + results)
```

---

## Scoring Configuration

Centralized in `src/lib/config/scoring.ts`. Never hardcoded in components.

```
GREEN  ≥ 7.0  → tier: 'green'  → tag: 'top-pick' (score ≥ 7)
YELLOW  4–6.9 → tier: 'yellow' → tag: null
RED    ≤ 3.9  → tier: 'red'   → tag: 'enjoy-occasionally'
```

Display: 1 decimal place (e.g., `9.0/10`, `4.5/10`)

---

## Performance Targets

| Metric | V0 Target | V0.5 Target |
|---|---|---|
| End-to-end (photo → results) | < 30s | < 20s |
| OCR per image | < 10s | < 8s |
| Ranking (up to 30 dishes) | < 15s | < 10s |
| Image compression | < 500ms | < 500ms |
| Max image size (sent to API) | 5MB | 5MB |
| Max dishes per session | 50 | 100 |

---

## Security

- `ANTHROPIC_API_KEY` lives only in Next.js server context (never exposed to client)
- Images are never written to disk — processed in memory only
- Input validation on `/api/analyze`: MIME type, file size, image count
- No PII stored in V0 (localStorage holds only session results, no email/name)
- V1: Supabase RLS enforces row-level isolation; all DB access goes through Supabase client with user JWT

---

## Scalability Notes

**How this scales to millions of users (V1+):**

1. **API routes as Vercel serverless functions** auto-scale to demand with zero config. Cold start is ~300ms — acceptable for this use case.

2. **Claude API rate limits** will become the binding constraint before server capacity. Mitigation: request-level queuing (BullMQ on Redis, V1), graceful 429 handling with retry-after, and tiered access (free tier gets Haiku, paid tier gets Sonnet).

3. **Database:** Supabase Postgres scales to ~10M rows before needing sharding. Dishes table grows fastest (N dishes per session). Partition by `created_at` when sessions > 1M.

4. **Images:** Never stored in V0. V1 should store originals in Supabase Storage with a 30-day retention policy (not indefinite). Images are not needed after ranking is complete.

5. **Caching:** Restaurant-level dish rankings can be cached (same menu = same results). V1 opportunity: if two users scan the same restaurant within 24h, return cached result. Cache key = perceptual hash of menu image.

6. **The health condition registry** (`health_conditions` table) is the V1 unlock for multi-condition support. Adding a new condition is a DB row + a new system prompt — no code changes required.

---

## Open Questions Resolved in This Doc

| Question (from PRD) | Resolution |
|---|---|
| OCR: client-side or server-side? | Server-side via Claude Vision (Haiku). See rationale above. |
| LLM prompt for multi-page menus? | OCR runs in parallel per image, results merged before ranking call. |
| "Skip" button on Screen 2? | Not built in V0. PRD says answer required — **flagging for Sean to confirm** before Screen 2 is finalized. Default: button not rendered in V0. |
| Score display format | 1 decimal place (e.g., 9.0/10). Confirmed by Sean. |
| Color thresholds | Green ≥7, Yellow 4–6.9, Red ≤3.9. Hardcoded in `scoring.ts`, tunable. |

---

## Backlog Discrepancy

The `backlog.md` file lists "Menu text input + cholesterol analysis" as a P0 feature. **This contradicts the PRD**, which explicitly calls text input out of scope across all phases. The PRD wins. Backlog item #1 should be updated to "Photo capture + OCR + cholesterol analysis." Not blocking V0 build, but worth fixing.

---

## V0 → V0.5 Migration Path

When V0 is validated, these are the additions — no teardown required:

1. **Manual OCR correction UI:** Add a step between OCR and ranking that renders `rawDishes` as an editable list. Already returned in API response — just build the UI.
2. **Substitution suggestions:** Add `substitution` field to ranking prompt output. DB column already in schema.
3. **Session history:** localStorage already stores sessions. Build a "recent menus" UI on the Welcome screen reading from it.
4. **Image quality detection:** Before sending to OCR, run a client-side sharpness check (Laplacian variance). Already a slot in the pipeline — just add the guard.
5. **Returning user flow:** localStorage session check on Welcome screen. If session exists, offer to skip onboarding.

---

## V0.5 → V1 Migration Path

1. Add Supabase: `supabase init`, link to project, run migrations.
2. Swap `src/lib/storage/session.ts` localStorage implementation for Supabase client.
3. Add auth: Supabase Auth UI + email magic link. Gate results behind auth (optional or required — product decision).
4. Add health condition selector to onboarding screen. Reads from `health_conditions` table.
5. API key management: move to Supabase Edge Functions or AWS Lambda if Vercel rate limits become binding.
