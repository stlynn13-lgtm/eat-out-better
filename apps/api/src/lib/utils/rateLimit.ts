/**
 * Best-effort in-memory rate limiter (sliding window, per key).
 *
 * Scope & honesty: this lives in serverless instance memory, so the counter
 * resets on cold starts and is NOT shared across concurrent instances. It is a
 * speed bump against casual abuse of the public /api/analyze endpoint (which
 * bills the Anthropic account per call), not a security boundary. The real
 * backstops remain the APP_SHARED_TOKEN gate and the Anthropic spend cap.
 * V1: replace with Vercel KV / Upstash for a durable shared counter.
 */

const WINDOW_MS = 10 * 60_000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 20; // generous for a human: 1 request = 1 scan

const hitsByKey = new Map<string, number[]>();

/**
 * Records a hit for `key` and reports whether it is over the limit.
 * Returns true if the request should be rejected with 429.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hitsByKey.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hitsByKey.set(key, recent);
    return true;
  }

  recent.push(now);
  hitsByKey.set(key, recent);

  // Opportunistic cleanup so the map can't grow unbounded within one instance.
  if (hitsByKey.size > 5_000) {
    for (const [k, timestamps] of hitsByKey) {
      if (timestamps.every((t) => now - t >= WINDOW_MS)) hitsByKey.delete(k);
    }
  }

  return false;
}
