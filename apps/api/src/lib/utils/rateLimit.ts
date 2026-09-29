/**
 * Rate limiting and the daily spend cap for the public /api/analyze endpoint.
 *
 * Every call bills the Anthropic account (one Vision call per photo, plus a
 * ranking call), so this is a cost control first and an abuse control second.
 *
 * Three layers, because they stop different things:
 *
 *   1. Per-IP burst  — stops one client hammering the endpoint in a tight loop.
 *   2. Per-IP daily  — stops one client grinding away slowly all day, which a
 *                      burst window alone never catches.
 *   3. Global daily  — the actual spend ceiling, in dollars. Layers 1 and 2 are
 *                      per-IP, so they do nothing against a caller rotating
 *                      IPs; only a global counter bounds a day's bill. Every
 *                      Claude call reports what it actually cost (recordSpend,
 *                      priced from the token counts Anthropic returns), and
 *                      once today's total reaches SPEND_GLOBAL_DAILY_USD
 *                      (default $200) the endpoint stops accepting scans until
 *                      UTC midnight. A request-count ceiling sits behind it as
 *                      a backstop in case spend recording ever breaks.
 *
 *                      It is a ceiling, not an exact figure: scans already in
 *                      flight when the cap is reached still finish, so a day
 *                      can close a few dollars over.
 *
 * Storage: the project's Supabase Postgres, through two functions the API
 * calls with its secret key (supabase/migrations/20260929000000_api_limits.sql).
 * One vendor instead of a separate Redis: the API already holds that key for
 * account deletion, and a scan takes 10+ seconds, so one database round trip
 * per scan is invisible. IPs are stored only as a salted hash.
 *
 * An in-memory burst check runs first on every instance, so a client
 * hammering the endpoint is turned away without costing a database call.
 *
 * Degradation, in order:
 *   - No Supabase env vars → only the in-memory burst limit applies, exactly
 *     the behaviour before any of this existed. The per-IP daily limit and the
 *     spend cap are inert, and it says so in the logs on every cold start.
 *   - Supabase configured but slow or down → fails OPEN after 3 seconds,
 *     matching the rest of this codebase (the token gate and the client scan
 *     quota both fail open). A database outage must not 503 every real user.
 *     The Anthropic account's own spend limit is the backstop underneath.
 *
 * Tuning: every limit is env-driven, so it can be retuned in Vercel without a
 * code change.
 */

import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { MODEL_PRICING_PER_MTOK, type ModelName } from "@/lib/claude/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// -----------------------------------------------------------
// Configuration
// -----------------------------------------------------------

const BURST_WINDOW_SECONDS = 600;
const BURST_MAX = envInt("RATE_LIMIT_BURST_MAX", 20);
const IP_DAILY_MAX = envInt("RATE_LIMIT_IP_DAILY_MAX", 50);
/**
 * The spend ceiling, in dollars per UTC day. Set by Sean 2026-09-28. The
 * Anthropic account's own spend limit sits underneath this.
 */
const GLOBAL_DAILY_BUDGET_USD = envNumber("SPEND_GLOBAL_DAILY_USD", 200);
/**
 * Backstop only. The dollar cap above is what should trip; this exists so a
 * bug in spend recording can't leave the day unbounded. Set well above what
 * $200 buys at the ~$0.05 planning cost per scan (~4,000 scans).
 */
const GLOBAL_DAILY_MAX = envInt("RATE_LIMIT_GLOBAL_DAILY_MAX", 10000);
/** A slow database must not hold up a scan. Past this, fail open. */
const DB_TIMEOUT_MS = 3000;

function envInt(name: string, fallback: number): number {
  return Math.floor(envNumber(name, fallback));
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

if (!getSupabaseAdmin()) {
  console.warn(
    "[rateLimit] SUPABASE_URL / SUPABASE_SECRET_KEY not set — only the " +
      "in-memory burst limit is active. The per-IP daily limit and the $" +
      GLOBAL_DAILY_BUDGET_USD + "/day spend cap are INACTIVE until they are " +
      "set in Vercel (see ACCOUNTS-SETUP.md)."
  );
}

// -----------------------------------------------------------
// In-memory burst limit (first line, every instance)
// -----------------------------------------------------------

const MEMORY_WINDOW_MS = BURST_WINDOW_SECONDS * 1000;
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
// Spend (dollars)
// -----------------------------------------------------------

/**
 * Spend is kept in whole micro-dollars so the database adds integers — no
 * float drift across thousands of calls. A price in dollars per million tokens
 * is exactly micro-dollars per token, which is why the maths below is a plain
 * multiply.
 */
const MICRO_USD_PER_USD = 1_000_000;

/** Most expensive row in the table — the fallback for an unpriced model. */
function worstCasePricing(): { input: number; output: number } {
  return Object.values(MODEL_PRICING_PER_MTOK).reduce((worst, p) =>
    p.input + p.output > worst.input + worst.output ? p : worst
  );
}

/**
 * Micro-dollars one response cost, from the usage block Anthropic returns.
 * Cache writes are priced at 2× input (the 1-hour rate) and cache reads at
 * 0.1× input: the app doesn't use prompt caching today, and pricing a write at
 * the higher of the two rates keeps the cap on the safe side if it starts.
 * Rounded up for the same reason.
 */
export function costMicroUsd(model: string, usage: Anthropic.Usage): number {
  const pricing =
    MODEL_PRICING_PER_MTOK[model as ModelName] ?? worstCasePricing();
  const micro =
    usage.input_tokens * pricing.input +
    usage.output_tokens * pricing.output +
    (usage.cache_creation_input_tokens ?? 0) * pricing.input * 2 +
    (usage.cache_read_input_tokens ?? 0) * pricing.input * 0.1;
  return Math.ceil(micro);
}

/**
 * Adds one Claude call's cost to today's global total. Call it right after
 * every `messages.create` that returns.
 *
 * Never throws and never blocks a scan for long: a database hiccup here should
 * cost accuracy on the cap, not a user's result. The request-count backstop
 * and the Anthropic account limit still bound the day if this fails.
 */
export async function recordSpend(
  model: string,
  usage: Anthropic.Usage | null | undefined
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db || !usage) return;

  const micro = costMicroUsd(model, usage);
  if (micro <= 0) return;

  try {
    const { error } = await db
      .rpc("api_record_spend", { p_micro_usd: micro })
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    if (error) throw error;
  } catch (error) {
    console.error("[rateLimit] Could not record spend — cap is under-counting:", error);
  }
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
 * Salted hash, so the database never holds a raw IP address. The salt is a
 * secret (the Supabase secret key unless RATE_LIMIT_IP_SALT is set), so the
 * hashes can't be reversed by trying every IPv4 address.
 */
function hashIp(ip: string): string {
  const salt = process.env.RATE_LIMIT_IP_SALT || process.env.SUPABASE_SECRET_KEY || "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Checks (and records) one request against all active limits.
 *
 * Order matters: the cheapest and most specific check runs first, so a client
 * in a hot loop is rejected on the burst limit without touching the daily
 * counters — which also means a blocked caller can't burn down the global
 * budget just by being blocked. The database function keeps the same order.
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  if (isRateLimitedInMemory(key)) {
    return { allowed: false, reason: "burst", retryAfterSeconds: BURST_WINDOW_SECONDS };
  }

  const db = getSupabaseAdmin();
  if (!db) return { allowed: true };

  try {
    const { data, error } = await db
      .rpc("api_admit_request", {
        p_ip_hash: hashIp(key),
        p_burst_max: BURST_MAX,
        p_ip_daily_max: IP_DAILY_MAX,
        p_budget_micro_usd: Math.round(GLOBAL_DAILY_BUDGET_USD * MICRO_USD_PER_USD),
        p_global_max: GLOBAL_DAILY_MAX,
      })
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    if (error) throw error;

    switch (data as string) {
      case "ok":
        return { allowed: true };
      case "burst":
        return {
          allowed: false,
          reason: "burst",
          retryAfterSeconds:
            BURST_WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % BURST_WINDOW_SECONDS),
        };
      case "ip_daily":
        return {
          allowed: false,
          reason: "ip_daily",
          retryAfterSeconds: secondsUntilUtcMidnight(),
        };
      case "spend":
        console.error(
          `[rateLimit] DAILY SPEND CAP REACHED — $${GLOBAL_DAILY_BUDGET_USD} spent today ` +
            `(SPEND_GLOBAL_DAILY_USD). /api/analyze is refusing scans until UTC ` +
            `midnight. Raise the cap in Vercel if this is legitimate traffic.`
        );
        return {
          allowed: false,
          reason: "global_daily",
          retryAfterSeconds: secondsUntilUtcMidnight(),
        };
      case "backstop":
        console.error(
          `[rateLimit] REQUEST BACKSTOP TRIPPED — more than ` +
            `RATE_LIMIT_GLOBAL_DAILY_MAX=${GLOBAL_DAILY_MAX} requests today before the ` +
            `$${GLOBAL_DAILY_BUDGET_USD} spend cap did. Check that recordSpend is working.`
        );
        return {
          allowed: false,
          reason: "global_daily",
          retryAfterSeconds: secondsUntilUtcMidnight(),
        };
      default:
        console.error("[rateLimit] Unexpected limiter answer, allowing:", data);
        return { allowed: true };
    }
  } catch (error) {
    // Fail OPEN. A database outage should degrade the cost guard, not the
    // product. The Anthropic account limit remains the backstop underneath.
    console.error("[rateLimit] Limits unavailable — failing open, request allowed:", error);
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
