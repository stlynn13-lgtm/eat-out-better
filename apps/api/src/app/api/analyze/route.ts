/**
 * POST /api/analyze
 *
 * Main analysis pipeline:
 *   1. Validate request
 *   2. Claim the scan's request id: a retry of a scan that already finished
 *      (or is still running) gets that result instead of paying again
 *   3. OCR: images → extracted dishes (parallel, Claude Vision)
 *   4. Rank: dishes → ranked dishes (single call, Claude text)
 *   5. Return results (and store them for a retry)
 *
 * Server-only. ANTHROPIC_API_KEY is never exposed to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extractDishesFromImages } from "@/lib/claude/ocr";
import { rankDishes } from "@/lib/claude/ranking";
import { categorizeDish, isRanked, UNRANKED_REASON } from "@/lib/config/categories";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { signScan } from "@/lib/supabase/scanSignature";
import { claimAnalysis, withHealthCondition } from "@/lib/supabase/analysisCache";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeResponseData,
  AnalysisErrorCode,
} from "@/lib/types";

// Runtime config
// 60s per invocation. The pipeline is budgeted to fit: OCR ≤25s (parallel per
// image) + ranking ≤30s (parallel chunks) ≈ 55s worst case. If the Vercel
// project has Fluid Compute enabled this can be raised for more headroom.
export const maxDuration = 60;

// -----------------------------------------------------------
// Validation constants
// -----------------------------------------------------------

// NOTE: Vercel enforces a hard ~4.5MB request-body limit on route handlers
// (regardless of any Next.js config), so the REAL payload ceiling is the
// client's total-upload budget (see apps/mobile lib/utils/image.ts). These
// limits are a server-side backstop for direct API callers.
const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image (backstop)
const VALID_CONDITIONS = ["high_cholesterol"];

/**
 * How long a retry waits for an earlier attempt at the same scan to finish,
 * measured from when the retry arrived. Leaves headroom under maxDuration.
 */
const REPLAY_WAIT_MS = 50_000;

// -----------------------------------------------------------
// Route handler
// -----------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // Shared-secret gate. The mobile app sends APP_SHARED_TOKEN in the
  // `x-app-token` header; requests without it are rejected. This protects the
  // public endpoint, which bills the Anthropic account on every call. It is NOT
  // unbreakable — the token ships inside the app bundle and a determined
  // attacker can extract it — so it's paired with Vercel rate-limiting and an
  // Anthropic spend cap (the real financial backstop).
  //
  // Fail-OPEN only when APP_SHARED_TOKEN is unset, so a forgotten Vercel env var
  // doesn't 401 every real user. Set it in Vercel to activate the gate.
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
      { status: 401 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_IMAGE", "Invalid request body — expected JSON.", 400);
  }

  // Validate request shape
  const validation = validateRequest(body);
  if (!validation.valid) {
    return errorResponse("INVALID_IMAGE", validation.error!, 400);
  }

  const { images, healthCondition } = body as AnalyzeRequest;

  // A retry of a scan this API already finished, or is still working on, gets
  // that result: no second upload to Claude, no second bill (see
  // analysisCache.ts). Requests without an id (app versions before this change) always run.
  const claim = await claimAnalysis(
    req.headers.get("x-request-id"),
    startTime + REPLAY_WAIT_MS
  );
  if (claim.kind === "replay") {
    console.log(`[/api/analyze] Replayed stored result (HTTP ${claim.status})`);
    return NextResponse.json(withHealthCondition(claim.body, healthCondition), {
      status: claim.status,
    });
  }
  if (claim.kind === "timeout") {
    return errorResponse(
      "CLAUDE_ERROR",
      "The analysis took too long. Try again — fewer pages usually helps.",
      504
    );
  }

  const response = await admitAndAnalyze(req, images, healthCondition, startTime);
  await claim.settle(response.status, (await response.clone().json()) as AnalyzeResponse);
  return response;
}

/**
 * Rate limits, then the pipeline. Everything here costs money, which is why a
 * replayed result never reaches it.
 */
async function admitAndAnalyze(
  req: NextRequest,
  images: AnalyzeRequest["images"],
  healthCondition: AnalyzeRequest["healthCondition"],
  startTime: number
): Promise<NextResponse> {
  // Durable rate limiting (see rateLimit.ts). Matters most while the
  // shared-token gate is fail-open — right now this is the only thing standing
  // between a stranger who finds this URL and the Anthropic bill.
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = await checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    // The global cap is not this caller's fault — the service as a whole has
    // spent its budget for the day — so it reads as "temporarily unavailable"
    // (503) rather than "you did too much" (429).
    if (rateLimit.reason === "global_daily") {
      return errorResponse(
        "RATE_LIMIT",
        "Menu analysis is temporarily unavailable. Please try again tomorrow.",
        503,
        { "Retry-After": String(rateLimit.retryAfterSeconds) }
      );
    }

    const message =
      rateLimit.reason === "ip_daily"
        ? "You've reached today's scan limit. Your scans reset tomorrow."
        : "Too many scans in a short time. Please wait a few minutes and try again.";

    return errorResponse("RATE_LIMIT", message, 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  try {
    // Step 1: OCR — extract dishes from all images
    let ocrResult;
    try {
      ocrResult = await extractDishesFromImages(images);
    } catch (error) {
      console.error("[/api/analyze] OCR failed:", error);
      const message = error instanceof Error ? error.message : "OCR failed";

      if (isRateLimitError(error)) {
        return errorResponse(
          "RATE_LIMIT",
          "Analysis service is busy. Please try again in a moment.",
          429
        );
      }

      return errorResponse("CLAUDE_ERROR", message, 500);
    }

    const { isMenu, dishes: rawDishes, unreadable: unreadableItems, restaurantName } = ocrResult;

    // The image didn't look like a menu at all — distinct from "a menu we
    // couldn't read". HTTP 422 (Unprocessable Entity): valid request, but the
    // content can't be analyzed.
    if (!isMenu) {
      return errorResponse(
        "NOT_A_MENU",
        "That doesn't look like a menu. Try snapping the menu itself.",
        422
      );
    }

    // Looked like a menu but we couldn't read any dishes clearly. If OCR
    // surfaced unreadable text (blur/glare/handwriting), return SUCCESS with an
    // empty ranked list so the client can show the "couldn't read" section
    // (EAT-9). Only when there is truly nothing to show do we error OCR_EMPTY.
    if (rawDishes.length === 0) {
      if (unreadableItems.length > 0) {
        return successResponse({
          id: randomUUID(),
          restaurantName,
          dishes: [],
          rawDishes: [],
          unreadableItems,
          unrankedItems: [],
          dishCount: 0,
          processingTimeMs: Date.now() - startTime,
          healthCondition,
          createdAt: new Date().toISOString(),
        });
      }
      return errorResponse(
        "OCR_EMPTY",
        "We couldn't read any dishes. Try again with better lighting.",
        422
      );
    }

    // Step 1b: categorise every dish, then split off the ones we deliberately
    // don't score (EAT-20). Alcohol and standalone sauces are filtered out BEFORE
    // the ranking call rather than scored-then-hidden: it's cheaper, and a score
    // that doesn't exist can't leak into the UI. They are still returned to the
    // client in `unrankedItems` — EAT-9's promise is that what the user sees
    // equals what was read off their menu, so nothing may silently disappear.
    const categorized = rawDishes.map((dish) => ({
      ...dish,
      category: dish.category ?? categorizeDish(dish),
    }));

    const rankableDishes = categorized.filter((d) => isRanked(d.category));
    const unrankedItems = categorized
      .filter((d) => !isRanked(d.category))
      .map((d) => ({
        name: d.name,
        description: d.description,
        category: d.category,
        reason: UNRANKED_REASON[d.category] ?? "Not scored for this condition.",
      }));

    // Every dish was alcohol or condiments — nothing to rank, but there IS
    // something to show, so this is a success with an empty ranked list rather
    // than an error.
    if (rankableDishes.length === 0) {
      return successResponse({
        id: randomUUID(),
        restaurantName,
        dishes: [],
        rawDishes: categorized,
        unreadableItems,
        unrankedItems,
        dishCount: 0,
        processingTimeMs: Date.now() - startTime,
        healthCondition,
        createdAt: new Date().toISOString(),
      });
    }

    // Step 2: Rank dishes
    let rankedDishes;
    try {
      rankedDishes = await rankDishes(rankableDishes, healthCondition);
    } catch (error) {
      console.error("[/api/analyze] Ranking failed:", error);
      const message = error instanceof Error ? error.message : "Ranking failed";

      if (isRateLimitError(error)) {
        return errorResponse(
          "RATE_LIMIT",
          "Analysis service is busy. Please try again in a moment.",
          429
        );
      }

      return errorResponse("CLAUDE_ERROR", message, 500);
    }

    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[/api/analyze] Success: ${rankedDishes.length} ranked, ${unrankedItems.length} unranked in ${processingTimeMs}ms`
    );

    return successResponse({
      id: randomUUID(),
      restaurantName,
      dishes: rankedDishes,
      rawDishes: categorized,
      unreadableItems,
      unrankedItems,
      dishCount: rankedDishes.length,
      processingTimeMs,
      healthCondition,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/analyze] Unexpected error:", error);
    return errorResponse(
      "UNKNOWN",
      "An unexpected error occurred. Please try again.",
      500
    );
  }
}

// -----------------------------------------------------------
// Response helpers
// -----------------------------------------------------------

/**
 * Every successful scan goes out with `scanSig`, the database's signature of
 * its id. The app saves the response whole and uploads it whole, so this is
 * what lets the scan be stored in the user's account (see scanSignature.ts).
 * Callers return this promise without awaiting it; signScan never rejects.
 */
async function successResponse(
  data: Omit<AnalyzeResponseData, "scanSig">
): Promise<NextResponse> {
  const scanSig = await signScan(data.id);
  const body: AnalyzeResponse = {
    success: true,
    data: scanSig ? { ...data, scanSig } : data,
  };
  return NextResponse.json(body, { status: 200 });
}

function errorResponse(
  code: AnalysisErrorCode,
  message: string,
  status: number,
  headers?: Record<string, string>
): NextResponse {
  const body: AnalyzeResponse = {
    success: false,
    error: { code, message },
  };
  return NextResponse.json(body, { status, headers });
}

// -----------------------------------------------------------
// Validation
// -----------------------------------------------------------

function validateRequest(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const { images, healthCondition } = body as Record<string, unknown>;

  if (!Array.isArray(images)) {
    return { valid: false, error: '"images" must be an array' };
  }

  if (images.length === 0) {
    return { valid: false, error: "At least one image is required" };
  }

  if (images.length > MAX_IMAGES) {
    return {
      valid: false,
      error: `Maximum ${MAX_IMAGES} images per request`,
    };
  }

  for (const [i, img] of images.entries()) {
    if (typeof img !== "string" || img.length === 0) {
      return {
        valid: false,
        error: `Image at index ${i} must be a non-empty base64 string`,
      };
    }

    // Estimate size: base64 length → byte count
    const estimatedBytes = Math.ceil((img.length * 3) / 4);
    if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (estimatedBytes / 1024 / 1024).toFixed(1);
      return {
        valid: false,
        error: `Image at index ${i} is too large (${sizeMB}MB). Maximum 5MB per image after compression.`,
      };
    }
  }

  if (typeof healthCondition !== "string") {
    return { valid: false, error: '"healthCondition" must be a string' };
  }

  if (!VALID_CONDITIONS.includes(healthCondition)) {
    return {
      valid: false,
      error: `Unknown health condition: "${healthCondition}". Valid: ${VALID_CONDITIONS.join(", ")}`,
    };
  }

  return { valid: true };
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.APP_SHARED_TOKEN;
  if (!expected) {
    console.warn(
      "[/api/analyze] APP_SHARED_TOKEN is not set — endpoint is UNPROTECTED. " +
        "Set it in Vercel env vars to require the app token."
    );
    return true;
  }
  return req.headers.get("x-app-token") === expected;
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("rate limit") || msg.includes("429") || msg.includes("too many");
}
