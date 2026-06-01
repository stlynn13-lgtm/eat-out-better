/**
 * Anthropic SDK singleton.
 *
 * Import from this file everywhere — never instantiate Anthropic() directly.
 * Ensures a single connection pool and clean error surface if the API key is missing.
 *
 * This module is server-only (used only in API routes).
 * The API key is never exposed to the browser.
 */

import Anthropic from "@anthropic-ai/sdk";

function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env.local file. " +
        "See .env.local.example for the required format."
    );
  }

  return new Anthropic({
    apiKey,
    // Default timeout per request. Individual calls can override this.
    timeout: 60_000, // 60 seconds
    maxRetries: 0, // We handle retries ourselves for better error control
  });
}

// Singleton — reuse across serverless function invocations within the same instance
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = createClient();
  }
  return client;
}

// Model constants — change here, nowhere else
export const MODELS = {
  /** Claude Haiku: fast, cheap. Used for OCR and V0 ranking. */
  HAIKU: "claude-haiku-4-5-20251001",
  /** Claude Sonnet: higher quality. Used for V1 ranking tier. */
  SONNET: "claude-sonnet-4-6",
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];
