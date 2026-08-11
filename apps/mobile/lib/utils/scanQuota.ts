/**
 * Per-device daily scan cap.
 *
 * Every scan costs real money (one Claude Vision call per photo, plus a ranking
 * call), and the API's own limiter is in-memory per serverless instance — it
 * resets on cold starts and isn't shared between them, so it cannot bound a
 * day's spend. This is the client-side half of that: it stops the request
 * before anything is uploaded, so a capped scan costs nothing at all.
 *
 * Scope & honesty: this is a cost guard against ordinary heavy use, NOT a
 * security boundary. It lives in the app's own storage, so deleting and
 * reinstalling the app resets it. The financial backstop remains the Anthropic
 * account spend cap; a true cross-device/global cap needs durable shared
 * storage on the API (deferred — see log.md).
 *
 * The limit is read from `extra.dailyScanLimit`, which ships in the update
 * manifest — so it can be retuned with `eas update`, without a new build.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const STORAGE_KEY = "scan_quota_v1";
const FALLBACK_DAILY_LIMIT = 5;

const configured = Number(Constants.expoConfig?.extra?.dailyScanLimit);
export const DAILY_SCAN_LIMIT: number =
  Number.isFinite(configured) && configured > 0 ? configured : FALLBACK_DAILY_LIMIT;

type StoredQuota = { day: string; count: number };

/**
 * Local calendar date, not UTC — "5 scans per day" has to mean the user's day.
 * A UTC key rolls over mid-evening for US users, which would hand back a fresh
 * allowance in the middle of exactly the dinner the app exists for.
 */
function todayKey(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function readQuota(): Promise<StoredQuota> {
  const fresh: StoredQuota = { day: todayKey(), count: 0 };
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<StoredQuota>;
    if (typeof parsed?.day !== "string" || typeof parsed?.count !== "number") {
      return fresh;
    }
    // A stored day that isn't today (including a clock moved backwards) starts
    // the count over rather than locking the user out.
    return parsed.day === fresh.day ? { day: parsed.day, count: parsed.count } : fresh;
  } catch {
    // Storage unavailable or corrupt: fail OPEN. Blocking a paying-attention
    // user because AsyncStorage hiccuped is worse than letting a scan through.
    return fresh;
  }
}

export type ScanQuota = {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
};

export async function getScanQuota(): Promise<ScanQuota> {
  const { count } = await readQuota();
  const remaining = Math.max(DAILY_SCAN_LIMIT - count, 0);
  return {
    used: count,
    limit: DAILY_SCAN_LIMIT,
    remaining,
    exhausted: remaining === 0,
  };
}

/**
 * Counts one scan against today's allowance. Call this only once the scan is
 * genuinely about to hit the API — a photo rejected on-device as "not a menu"
 * costs nothing, so it must not cost the user a scan either.
 */
export async function recordScan(): Promise<ScanQuota> {
  const current = await readQuota();
  const next: StoredQuota = { day: current.day, count: current.count + 1 };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort. An uncounted scan is a smaller problem than a crashed one.
  }
  const remaining = Math.max(DAILY_SCAN_LIMIT - next.count, 0);
  return {
    used: next.count,
    limit: DAILY_SCAN_LIMIT,
    remaining,
    exhausted: remaining === 0,
  };
}

/** Copy for the native alert shown when the allowance is gone. */
export const QUOTA_ALERT_TITLE = "Daily scan limit reached";
export const QUOTA_ALERT_BODY = `You've used all ${DAILY_SCAN_LIMIT} menu scans for today. Your scans reset tomorrow.`;
