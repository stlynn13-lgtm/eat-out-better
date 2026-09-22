/**
 * Rate limiting for the public /api/analyze endpoint.
 *
 * Every call bills the Anthropic account (one Vision call per photo, plus a
 * ranking call), so this is a cost control first and an abuse control second.
 *
 * Three layers, because they stop different things:
 *
 *   1. Per-IP burst  — stops one client hammering the endpoint in a tight loop.
 *   2. Per-IP daily  — stops one client grinding away slowly all day, which a
 *                      burst window alone never catches.
 *   3. Global daily  — the actual spend ceiling. Layers 1 and 2 are per-key, so
 *                      they do nothing against a caller rotating IPs; only a
 *                      global counter bounds a day's bill. This is the circuit
 *                      breaker: when it trips, the endpoint stops spending.
 *
 * Storage: Upstash Redis over HTTP (REST), so it works from serverless with no
 * connection pooling. Counters are shared across every instance and survive
 * cold starts — the thing the previous in-memory limiter could not do.
 *
 * Degradation, in order:
 *   - No Redis env vars  → falls back to the old in-memory limiter, so local
 *     dev and any un-provisioned deploy behave exactly as they did before.
 *     Layers 2 and 3 are inert in that mode (they need durable storage).
 *   - Redis configured but unreachable → fails OPEN, matching the rest of this
 *     codebase (the token gate and the client scan quota both fail open). A
 *     Redis outage must not 503 every real user. It logs loudly instead.
 *
 * Tuning: every limit is env-driven so it can be retuned in Vercel without a
 * deploy. Raise GLOBAL_DAILY_MAX before a launch or a press hit; lower it if
 * the Anthropic bill starts moving.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// -----------------------------------------------------------
// Configuration
// -----------------------------------------------------------

const BURST_WINDOW = "10 m" as const;
const BURST_MAX = envInt("RATE_LIMIT_BURST_MAX", 20);
const IP_DAILY_MAX = envInt("RATE_LIMIT_IP_DAILY_MAX", 50);
const GLOBAL_DAILY_MAX = envInt("RATE_LIMIT_GLOBAL_DAILY_MAX", 2000);

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/**
 * Vercel's Upstash integration injects KV_REST_API_*; a directly-provisioned
 * Upstash database injects UPSTASH_REDIS_REST_*. Accept either so the store can
 * be moved without touching code.
 */
function redisFromEnv(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = redisFromEnv();

if (!redis) {
  console.warn(
    "[rateLimit] No Upstash/KV env vars found — falling back to the in-memory " +
      "limiter. Per-IP bursts are still capped per instance, but the daily and " +
      "global spend ceilings are INACTIVE. Provision a store and set " +
      "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in Vercel."
  );
}

/**
 * Sliding window for bursts. `ephemeralCache` lets an instance short-circuit a
 * key it has already seen go over the limit, which keeps a hammering client
 * from costing us a Redis round trip per request.
 */
const burstLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(BURST_MAX, BURST_WINDOW),
      prefix: "eob:burst",
      analytics: false,
      ephemeralCache: new Map(),
    })
  : null;

// -----------------------------------------------------------
// In-memory fallback (previous behaviour, unchanged in spirit)
// -----------------------------------------------------------

const MEMORY_WINDOW_MS = 10 * 60_000;
const hitsByKey = new Map<string, number[]>();

function isRateLimitedInMemory(key: string): boolean {
  const now = Date.now();
  const recent = (hitsByKey.get(key) ?? []).filter(
    (t) => now - t < MEMORY_WINDOW_MS
  );

  if (recent.length >= BURST_MAX) {
    hitsByKey.set(key, recent);
    return true;
  }

  recent.push(now);
  hitsByKey.set(key, recent);

  // Opportunistic cleanup so the map can't grow unbounded within one instance.
  if (hitsByKey.size > 5_000) {
    for (const [k, timestamps] of hitsByKey) {
      if (timestamps.every((t) => now - t >= MEMORY_WINDOW_MS)) {
        hitsByKey.delete(k);
      }
    }
  }

  return false;
}

// -----------------------------------------------------------
// Daily counters
// -----------------------------------------------------------

/**
 * UTC day key. Deliberately not the caller's local day: this bounds *our*
 * spend, and the Anthropic bill is not timezone-aware. (The user-facing scan
 * quota in the mobile app is local-day, which is the right call there — a
 * person's "5 scans today" has to mean their day.)
 */
function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Increments a day-scoped counter and reports whether it is now over `max`.
 * Sets a TTL on first write so keys expire on their own.
 */
async function incrementDaily(
  key: string,
  max: number
): Promise<{ over: boolean; count: number }> {
  if (!redis) return { over: false, count: 0 };

  const count = await redis.incr(key);

  // First write of the day: expire a little after the day rolls over, so a
  // key can never outlive its relevance even if the clock drifts.
  if (count === 1) {
    await redis.expire(key, 60 * 60 * 25);
  }

  return { over: count > max, count };
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      /**
       * `burst` and `ip_daily` are this caller's fault and should read as
       * "slow down". `global_daily` is the circuit breaker — nothing is wrong
       * with this particular caller, the service as a whole is done spending
       * for the day, so it warrants a 503 rather than a 429.
       */
      reason: "burst" | "ip_daily" | "global_daily";
      retryAfterSeconds: number;
    };

/**
 * Checks (and records) one request against all active limits.
 *
 * Order matters: the cheapest and most specific check runs first, so a client
 * in a hot loop is rejected on the burst limit without ever touching the daily
 * counters — which also means a blocked caller cannot burn down the global
 * budget just by being blocked.
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  // ---- No durable store: preserve the old per-instance behaviour. ----
  if (!redis || !burstLimiter) {
    return isRateLimitedInMemory(key)
      ? { allowed: false, reason: "burst", retryAfterSeconds: 600 }
      : { allowed: true };
  }

  try {
    // ---- Layer 1: per-IP burst ----
    const burst = await burstLimiter.limit(key);
    if (!burst.success) {
      const retryMs = Math.max(burst.reset - Date.now(), 0);
      return {
        allowed: false,
        reason: "burst",
        retryAfterSeconds: Math.ceil(retryMs / 1000) || 60,
      };
    }

    const day = utcDayKey();

    // ---- Layer 2: per-IP daily ----
    const ipDaily = await incrementDaily(
      `eob:daily:ip:${day}:${key}`,
      IP_DAILY_MAX
    );
    if (ipDaily.over) {
      return {
        allowed: false,
        reason: "ip_daily",
        retryAfterSeconds: secondsUntilUtcMidnight(),
      };
    }

    // ---- Layer 3: global daily circuit breaker ----
    const globalDaily = await incrementDaily(
      `eob:daily:global:${day}`,
      GLOBAL_DAILY_MAX
    );
    if (globalDaily.over) {
      console.error(
        `[rateLimit] GLOBAL DAILY CAP TRIPPED — ${globalDaily.count} requests ` +
          `today exceeds RATE_LIMIT_GLOBAL_DAILY_MAX=${GLOBAL_DAILY_MAX}. ` +
          `/api/analyze is refusing requests until UTC midnight. Raise the cap ` +
          `in Vercel if this is legitimate traffic.`
      );
      return {
        allowed: false,
        reason: "global_daily",
        retryAfterSeconds: secondsUntilUtcMidnight(),
      };
    }

    return { allowed: true };
  } catch (error) {
    // Fail OPEN. A Redis outage should degrade the cost guard, not the product.
    // The Anthropic spend cap remains the backstop underneath this.
    console.error(
      "[rateLimit] Redis unavailable — failing open, request allowed:",
      error
    );
    return { allowed: true };
  }
}

function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.max(Math.ceil((midnight - now.getTime()) / 1000), 1);
}
