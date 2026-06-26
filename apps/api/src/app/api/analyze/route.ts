/**
 * POST /api/analyze
 *
 * Main analysis pipeline:
 *   1. Validate request
 *   2. OCR: images → extracted dishes (parallel, Claude Vision)
 *   3. Rank: dishes → ranked dishes (single call, Claude text)
 *   4. Return results
 *
 * Server-only. ANTHROPIC_API_KEY is never exposed to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { extractDishesFromImages } from "@/lib/claude/ocr";
import { rankDishes } from "@/lib/claude/ranking";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisErrorCode,
} from "@/lib/types";

// Runtime config
export const maxDuration = 60; // Vercel: allow up to 60s per invocation

// -----------------------------------------------------------
// Validation constants
// -----------------------------------------------------------

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB compressed
const VALID_CONDITIONS = ["high_cholesterol"];

// -----------------------------------------------------------
// Route handler
// -----------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

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

    const { isMenu, dishes: rawDishes } = ocrResult;

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

    // Looked like a menu but we couldn't read any dishes (poor lighting, blur).
    if (rawDishes.length === 0) {
      return errorResponse(
        "OCR_EMPTY",
        "We couldn't read any dishes. Try again with better lighting.",
        422
      );
    }

    // Step 2: Rank dishes
    let rankedDishes;
    try {
      rankedDishes = await rankDishes(rawDishes, healthCondition);
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
      `[/api/analyze] Success: ${rankedDishes.length} dishes in ${processingTimeMs}ms`
    );

    return successResponse({
      id: uuidv4(),
      dishes: rankedDishes,
      rawDishes,
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

function successResponse(data: AnalyzeResponse["data"]): NextResponse {
  const body: AnalyzeResponse = { success: true, data };
  return NextResponse.json(body, { status: 200 });
}

function errorResponse(
  code: AnalysisErrorCode,
  message: string,
  status: number
): NextResponse {
  const body: AnalyzeResponse = {
    success: false,
    error: { code, message },
  };
  return NextResponse.json(body, { status });
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

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("rate limit") || msg.includes("429") || msg.includes("too many");
}
