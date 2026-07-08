# POST /api/analyze — Endpoint Spec
**Eat Out Better · v0 / v0.5 / v1**

Authors: Sean Flynn, Ray (implementation), Claude (spec)  
Last Updated: 2026-06-09  
Status: **Draft — pending Sean review before implementation begins**

---

## Product Summary (non-technical)

This endpoint is the brain of the app. When a user taps "Analyze Menu," the app sends their menu photos here and gets back a ranked list of dishes. Each dish has a score (1–10), a one-sentence explanation referencing a specific health factor, and eventually a substitution suggestion.

**What changes across versions:**

| Capability | v0 | v0.5 | v1 |
|---|---|---|---|
| Send photos | ✅ JPEG only | ✅ Any format | ✅ Any format + PDF |
| Delete a photo before analyzing | ❌ (mobile-only feature) | ✅ | ✅ |
| Health condition | High cholesterol only, hardcoded | Same | User-selectable (DB-driven) |
| Substitution suggestions | ❌ | ✅ | ✅ |
| Image quality warnings | ❌ | ✅ | ✅ |
| Restaurant field | ❌ | ✅ optional | ✅ optional (GPS + search) |
| Ranked output | ✅ | ✅ richer | ✅ with caching |
| User account / auth | ❌ | ❌ | ✅ |
| Stores results to database | ❌ (local only) | ❌ (local only) | ✅ Supabase |
| API path | `/api/v0/analyze` | `/api/v0/analyze` | `/api/v1/analyze` |

---

## Versioning Strategy

Endpoints are versioned from day one. v0 and v0.5 share the same path — v0.5 adds optional fields backward-compatibly. v1 is a new path because it changes auth, persistence, and request shape materially.

```
/api/v0/analyze   ← v0 and v0.5 share this (v0.5 adds optional fields only)
/api/v1/analyze   ← v1 (new path; adds auth header, persistence, multi-condition)
```

> **Action item for Ray:** Rename the existing route from `apps/api/src/app/api/analyze/route.ts` to `apps/api/src/app/api/v0/analyze/route.ts`.

---

## Auth Strategy (v1 recommendation)

v0 and v0.5 require no auth. v1 uses **Supabase Auth** with the following login methods:

- Email + password
- Google OAuth
- Apple Sign In — **required by Apple App Store rules if any OAuth is offered**
- Phone number (SMS OTP) — optional, for users who prefer phone-as-identifier

**How it works with the API:**  
The user's identity travels in the `Authorization: Bearer <JWT>` header — not in the request body. The server reads the JWT, extracts the `userId`, and associates the session with that user. The request body never includes a `userId`.

One account per email. Phone number can be linked to an account as a secondary identifier or primary login method (Supabase supports both).

---

## Image Handling Philosophy

**The OCR step does one thing: extract text from the image.** It does not interpret photos, logos, ambiance, or anything non-textual. The system prompt instructs Claude Vision to read dish names and descriptions only.

**Image format:** The API accepts any standard image format (`image/jpeg`, `image/png`, `image/heic`, `image/webp`). In v1, `application/pdf` will also be accepted for uploaded PDF menus. The mobile app currently always compresses to JPEG before sending, but the API should not assume this — MIME type is passed per image.

**Image deletion (mobile feature, not API feature):** The user's ability to delete a photo from the list before submitting is handled client-side in the mobile app. The API never sees deleted images — it only receives the final array after the user confirms. The `index` field in the request preserves the original order so the UI can show "Page 1, Page 2, Page 3" even if the user deleted page 4 before submitting.

---

## v0 Spec

### Corrections to Ray's implementation

These need to change before v0 is tested. None are architectural rewrites — all are small adjustments:

1. **Route path:** Move from `/api/analyze` → `/api/v0/analyze`
2. **`images` field shape:** Change from `string[]` (raw base64) to `Array<{ data: string; mimeType: string; index: number }>`. This unlocks non-JPEG support and preserves ordering. The OCR function must read `img.mimeType` instead of hardcoding `"image/jpeg"`.
3. **Max image size:** Code says 5MB, ARCHITECTURE.md says 10MB. Confirm with Ray — defaulting to **5MB per image** in this spec as the conservative choice.
4. **`id` vs `sessionId`:** Code uses `id`. Architecture doc used `sessionId`. Keep `id` — the code is correct.
5. **Validation of new image shape:** The `validateRequest()` function checks `typeof img !== "string"` — this must be updated to validate the object shape.

---

### v0 Request Body

```typescript
POST /api/v0/analyze
Content-Type: application/json

{
  images: Array<{
    data: string;     // Raw base64 — NOT a data URI. Strip the "data:image/jpeg;base64," prefix before sending.
    mimeType: "image/jpeg" | "image/png" | "image/heic" | "image/webp";
    index: number;    // Client-assigned order, 0-based. Preserved across multi-page menus.
  }>;               // Min: 1 image. Max: 10 images. Max 5MB per image (post-compression).

  healthCondition: "high_cholesterol";  // Hardcoded for v0. Only valid value.
}
```

**Constraints:**
- `images`: 1–10 items. Each item's `data` must be a non-empty base64 string ≤ 5MB (estimated by `Math.ceil(data.length * 3 / 4)`).
- `healthCondition`: must be the string `"high_cholesterol"` exactly.
- No auth header required.

**Example:**
```json
{
  "images": [
    {
      "data": "/9j/4AAQSkZJRgAB...",
      "mimeType": "image/jpeg",
      "index": 0
    },
    {
      "data": "/9j/4AAQSkZJRgAB...",
      "mimeType": "image/jpeg",
      "index": 1
    }
  ],
  "healthCondition": "high_cholesterol"
}
```

---

### v0 Response Body — Success (HTTP 200)

```typescript
{
  success: true;
  data: {
    id: string;               // UUID. Stored in AsyncStorage as the session identifier.
    dishes: RankedDish[];     // Sorted best to worst (rank 1 = best for heart health).
    rawDishes: ExtractedDish[];  // What OCR extracted before ranking. Returned now for v0.5 use; not shown in UI yet.
    dishCount: number;        // Length of dishes array.
    processingTimeMs: number; // Wall clock: receipt of request → response sent.
    healthCondition: string;  // Echoes back the condition used.
    createdAt: string;        // ISO 8601 UTC timestamp.
  }
}
```

**RankedDish shape:**
```typescript
{
  id: string;              // UUID assigned server-side.
  name: string;            // Exact dish name from the menu.
  description?: string;    // Menu description, if extracted.
  score: number;           // Float 1.0–10.0. 10 = best for heart health. Display with 1 decimal.
  rank: number;            // 1-based. Rank 1 = best choice.
  explanation: string;     // One sentence. Specific factor. Non-judgmental. E.g. "High saturated fat from cream sauce."
  substitution?: string;   // null in v0. Populated in v0.5.
  tier: "green" | "yellow" | "red";  // Derived from score. Green ≥7.0, Yellow 4.0–6.9, Red ≤3.9.
  tag: "top-pick" | "enjoy-occasionally" | null;  // top-pick if score ≥7, enjoy-occasionally if ≤3.9.
  ocrConfidence?: "high" | "medium" | "low";  // null in v0. Populated in v0.5.
}
```

**ExtractedDish shape:**
```typescript
{
  name: string;
  description?: string;
}
```

**Example success response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "dishes": [
      {
        "id": "a1b2c3d4-...",
        "name": "Grilled Salmon",
        "description": "Atlantic salmon, lemon butter, seasonal vegetables",
        "score": 9.0,
        "rank": 1,
        "explanation": "Rich in omega-3s with grilled preparation — low saturated fat.",
        "substitution": null,
        "tier": "green",
        "tag": "top-pick",
        "ocrConfidence": null
      },
      {
        "id": "b2c3d4e5-...",
        "name": "Ribeye Steak (12oz)",
        "description": null,
        "score": 3.0,
        "rank": 5,
        "explanation": "High saturated fat from marbled cut — significant cardiovascular load.",
        "substitution": null,
        "tier": "red",
        "tag": "enjoy-occasionally",
        "ocrConfidence": null
      }
    ],
    "rawDishes": [
      { "name": "Grilled Salmon", "description": "Atlantic salmon, lemon butter, seasonal vegetables" },
      { "name": "Ribeye Steak (12oz)" }
    ],
    "dishCount": 5,
    "processingTimeMs": 14200,
    "healthCondition": "high_cholesterol",
    "createdAt": "2026-06-09T18:45:00.000Z"
  }
}
```

---

### v0 Response Body — Error

```typescript
{
  success: false;
  error: {
    code: "OCR_EMPTY" | "CLAUDE_ERROR" | "INVALID_IMAGE" | "RATE_LIMIT" | "UNKNOWN";
    message: string;  // Human-readable. Safe to show to user.
  }
}
```

**Error code reference:**

| Code | HTTP Status | When | What to show the user |
|---|---|---|---|
| `OCR_EMPTY` | 200 | Zero dishes extracted from all images | "We couldn't read any dishes. Try a better-lit photo." |
| `INVALID_IMAGE` | 400 | Bad base64, wrong MIME, image too large | "One of your photos couldn't be processed. Try again." |
| `CLAUDE_ERROR` | 500 | Claude API returned an error | "Analysis failed. Check your connection and try again." |
| `RATE_LIMIT` | 429 | Claude rate limit hit | "We're busy right now. Try again in a moment." |
| `UNKNOWN` | 500 | Unexpected server error | "Something went wrong. Try again." |

> Note: `OCR_EMPTY` intentionally returns HTTP 200 with `dishCount: 0` in the `data` object when the images are valid but contain no readable dishes. This is distinct from `INVALID_IMAGE` (malformed request). The error case above is for when zero dishes are extracted after valid OCR attempts.

---

## v0.5 Spec

v0.5 shares the `/api/v0/analyze` path. All new request fields are optional — a v0 client sending the old shape still works. All new response fields are additive.

### What changes

**Request additions:**
- `restaurant.name` — optional. User types it in or it's pre-filled from OCR header detection (future).
- `overrides` — optional. If the user corrected OCR results in the manual correction UI, send the corrected dish list here. When present, the API skips the OCR step and runs ranking directly on `overrides`.

**Response additions:**
- `substitution` on each `RankedDish` is now populated (was always null in v0).
- `ocrConfidence` on each `RankedDish` is now populated.
- `imageQuality` array on the top-level `data` object — one entry per image, flagging quality issues.
- `restaurant.name` on the top-level `data` object if provided in the request.

---

### v0.5 Request Body

```typescript
POST /api/v0/analyze
Content-Type: application/json

{
  images: Array<{
    data: string;
    mimeType: "image/jpeg" | "image/png" | "image/heic" | "image/webp";
    index: number;
  }>;

  healthCondition: "high_cholesterol";

  // NEW — optional. Skip OCR and rank from corrected list instead.
  overrides?: Array<{
    name: string;
    description?: string;
  }>;

  // NEW — optional. Never blocks submission if absent.
  restaurant?: {
    name?: string;  // User-typed. Future: pulled from menu header OCR or geolocation.
  };
}
```

---

### v0.5 Response Body — Success (HTTP 200)

```typescript
{
  success: true;
  data: {
    id: string;
    dishes: RankedDish[];        // substitution and ocrConfidence now populated
    rawDishes: ExtractedDish[];
    dishCount: number;
    processingTimeMs: number;
    healthCondition: string;
    createdAt: string;

    // NEW in v0.5:
    imageQuality?: Array<{
      index: number;             // matches the index field sent in request
      quality: "good" | "blurry" | "partial" | "unreadable";
      message?: string;          // e.g. "Photo appears out of focus — retake for better results"
    }>;

    restaurant?: {
      name: string;              // echoed back if provided in request
    };
  }
}
```

**v0.5 RankedDish — populated fields:**
```typescript
{
  // All v0 fields, plus:
  substitution: string | null;  // e.g. "Ask for grilled instead of fried" — null if no improvement available
  ocrConfidence: "high" | "medium" | "low";  // how confident OCR was on this dish name
}
```

---

## v1 Spec

New path: `/api/v1/analyze`. Adds auth, backend persistence, multi-condition support, restaurant linkage with geolocation, and scoring rule versioning.

### What changes materially

1. **Auth required** — `Authorization: Bearer <Supabase JWT>` header. Server derives `userId` from token.
2. **Persistence** — results written to Supabase `menu_sessions` + `dishes` tables.
3. **Multi-condition** — `healthCondition` is now a free string validated against the `health_conditions` DB table (not a hardcoded enum).
4. **Restaurant field expanded** — accepts Google Place ID and coordinates for GPS-sourced restaurant attribution.
5. **`sessionOptions`** — control whether to persist and whether to check cache.
6. **`rulesVersion`** in response — the version identifier of the scoring rubric used, enabling consistency auditing.

### v1 Request Body

```typescript
POST /api/v1/analyze
Content-Type: application/json
Authorization: Bearer <Supabase JWT>   ← Required for authenticated users. Anonymous calls allowed but not persisted.

{
  images: Array<{
    data: string;
    mimeType: "image/jpeg" | "image/png" | "image/heic" | "image/webp" | "application/pdf";
    index: number;
  }>;

  healthCondition: string;  // DB-validated. E.g. "high_cholesterol", "diabetes", "gluten_free"

  overrides?: Array<{
    name: string;
    description?: string;
  }>;

  // Expanded restaurant context
  restaurant?: {
    name?: string;          // User-typed or OCR-extracted from menu header
    placeId?: string;       // Google Place ID — provided when user selects from search/GPS
    address?: string;       // Human-readable address string
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  sessionOptions?: {
    persist?: boolean;      // Default: true for authed users, false for anonymous. Set false to skip DB write.
    useCache?: boolean;     // Default: true. If a cached result exists for this restaurant+condition, return it.
  };
}
```

---

### v1 Response Body — Success (HTTP 200)

```typescript
{
  success: true;
  data: {
    id: string;                  // Session UUID. Matches the row ID in menu_sessions table.
    dishes: RankedDish[];        // Full ranked list with substitutions and confidence.
    rawDishes: ExtractedDish[];
    dishCount: number;
    processingTimeMs: number;
    healthCondition: string;
    createdAt: string;

    // Present if auth header was valid:
    userId?: string;

    // Present if restaurant was provided or inferred:
    restaurant?: {
      id: string;                // Supabase restaurants.id (created if new)
      name: string;
      placeId?: string;
      address?: string;
    };

    imageQuality?: Array<{
      index: number;
      quality: "good" | "blurry" | "partial" | "unreadable";
      message?: string;
    }>;

    // Scoring rubric version — for consistency auditing across sessions:
    rulesVersion: string;        // e.g. "high_cholesterol_v2"

    // Was this result served from cache (same restaurant + condition, <24h old)?
    cached: boolean;
    cachedAt?: string;           // ISO 8601. Present if cached: true.
  }
}
```

---

### v1 Error additions

New error codes added to the existing set:

| Code | HTTP Status | When |
|---|---|---|
| `UNAUTHORIZED` | 401 | JWT invalid or expired |
| `CONDITION_NOT_FOUND` | 400 | `healthCondition` string not in DB |
| `QUOTA_EXCEEDED` | 429 | User has hit their plan limit for analyses |

---

## Full Delta Table (developer reference)

| Field | v0 | v0.5 | v1 |
|---|---|---|---|
| **REQUEST** | | | |
| `images[].data` | ✅ | ✅ | ✅ |
| `images[].mimeType` | ✅ JPEG/PNG/HEIC/WEBP | ✅ same | ✅ + PDF |
| `images[].index` | ✅ | ✅ | ✅ |
| `healthCondition` | ✅ hardcoded enum | ✅ same | ✅ DB-validated string |
| `overrides[]` | ❌ | ✅ optional | ✅ optional |
| `restaurant.name` | ❌ | ✅ optional | ✅ optional |
| `restaurant.placeId` | ❌ | ❌ | ✅ optional |
| `restaurant.coordinates` | ❌ | ❌ | ✅ optional |
| `sessionOptions` | ❌ | ❌ | ✅ optional |
| `Authorization` header | ❌ | ❌ | ✅ required for persistence |
| **RESPONSE** | | | |
| `data.id` | ✅ | ✅ | ✅ |
| `data.dishes[]` | ✅ | ✅ | ✅ |
| `data.dishes[].substitution` | null | ✅ populated | ✅ populated |
| `data.dishes[].ocrConfidence` | null | ✅ populated | ✅ populated |
| `data.rawDishes[]` | ✅ | ✅ | ✅ |
| `data.dishCount` | ✅ | ✅ | ✅ |
| `data.processingTimeMs` | ✅ | ✅ | ✅ |
| `data.healthCondition` | ✅ | ✅ | ✅ |
| `data.createdAt` | ✅ | ✅ | ✅ |
| `data.imageQuality[]` | ❌ | ✅ | ✅ |
| `data.restaurant` | ❌ | ✅ if provided | ✅ with DB ID |
| `data.userId` | ❌ | ❌ | ✅ if authed |
| `data.rulesVersion` | ❌ | ❌ | ✅ |
| `data.cached` | ❌ | ❌ | ✅ |

---

## What Ray Needs to Change Before Testing v0

These are the only code changes required before v0 can be tested end-to-end. Everything else is additive.

**1. Route path** (`apps/api/src/app/api/analyze/route.ts`)  
Move file to: `apps/api/src/app/api/v0/analyze/route.ts`

**2. `AnalyzeRequest` type** (`apps/api/src/lib/types/index.ts`)  
```typescript
// Before:
images: string[];

// After:
images: Array<{
  data: string;
  mimeType: "image/jpeg" | "image/png" | "image/heic" | "image/webp";
  index: number;
}>;
```

**3. `extractDishesFromImages` signature** (`apps/api/src/lib/claude/ocr.ts`)  
```typescript
// Before:
export async function extractDishesFromImages(base64Images: string[]): Promise<ExtractedDish[]>

// After:
export async function extractDishesFromImages(
  images: Array<{ data: string; mimeType: string; index: number }>
): Promise<ExtractedDish[]>
```
And inside `extractFromSingleImage`: replace `media_type: "image/jpeg"` with `media_type: img.mimeType as MediaType`.

**4. Validation in route.ts**  
The `for (const [i, img] of images.entries())` loop currently checks `typeof img !== "string"`. Replace with object shape validation:
```typescript
if (!img || typeof img !== "object" || typeof img.data !== "string" || !img.data) {
  return { valid: false, error: `Image at index ${i} must be an object with a "data" string` };
}
if (!["image/jpeg", "image/png", "image/heic", "image/webp"].includes(img.mimeType)) {
  return { valid: false, error: `Image at index ${i} has unsupported mimeType: ${img.mimeType}` };
}
// Use img.data for size estimation:
const estimatedBytes = Math.ceil((img.data.length * 3) / 4);
```

**5. Mobile `useAnalysis.ts` / `image.ts`**  
The mobile hook currently sends `images: base64Images[]`. Update to send:
```typescript
images: capturedImages.map((img, i) => ({
  data: img.base64,
  mimeType: img.mimeType,   // already on MenuImage type
  index: i,
}))
```

---

## Open Questions — Answer Before v0.5 Build Begins

| Question | Owner | Context |
|---|---|---|
| Should `overrides` replace `rawDishes` in the response when used, or should `rawDishes` always reflect what OCR returned? | Sean | Correction UI probably wants to diff OCR output vs. user corrections — return both. |
| Image quality detection: client-side (sharpness check before upload) or server-side (Claude Vision detects it)? | Ray | Client-side Laplacian variance is faster and saves API calls. Server-side is more reliable. Could do both. |
| `restaurant.name` auto-extraction from OCR: in v0.5, should the OCR prompt be updated to also try to extract the restaurant name from the menu header? | Sean + Ray | Low-effort win if menus reliably print their name at the top. Fallback to user input if not found. |
| Substitution format: `"Ask for grilled instead of fried"` vs. `"Can I get this grilled instead?"` | Sean | Different framings — first is advice, second is a script for the user. Product call. |
