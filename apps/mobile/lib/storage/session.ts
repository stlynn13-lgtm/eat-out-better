/**
 * On-device scan history.
 *
 * Until now this was write-only: `saveSession()` had one caller
 * (hooks/useAnalysis.ts:306) and `getSessions()` had no UI caller at all, so
 * every scan since launch has been saved and never shown. The history screen
 * (app/history.tsx) is what finally reads it.
 *
 * ## Why the cap is a constant and the display limit is config
 *
 * The obvious design — one `MAX_SESSIONS` read from `extra`, the way
 * `dailyScanLimit` is — is a data-loss bug waiting for a bad day, and it fires
 * on the recovery path when you are already dealing with something else:
 *
 *   raise the cap to 100 → a user accumulates 40 scans → something unrelated
 *   goes wrong → `eas update:rollback` restores the old cap of 10 → the next
 *   scan silently deletes 31 of them.
 *
 * `extra` ships in the OTA manifest, so a rolled-back config value rewrites
 * the WRITE path. The fix is to take config off the write path entirely:
 *
 *  - `MAX_STORED` is a constant in code. It changes only with a new bundle,
 *    it never shrinks by rollback, and it is what bounds storage.
 *  - `extra.historyLimit` controls only how many rows the screen DISPLAYS.
 *    Retune it with `eas update` as often as you like — it cannot delete
 *    anything, because nothing on the write path reads it.
 *
 * ## Contract (do not change these signatures)
 *
 * All three exports keep byte-identical signatures, because
 * `auth-plan.md` §5 step 14 turns this file into a write-through cache later
 * and the whole point is that `useAnalysis.ts` does not change when it does.
 * At that point `saveSession()` gains a fire-and-forget upsert AFTER the local
 * write, and `getSessions()` stays local-only FOREVER — it must never touch
 * the network, because this app is used standing up in a restaurant on bad
 * wifi.
 *
 * NOTE for that future work: `MenuSession` carries `healthCondition`, so the
 * server upsert must send a redacted projection rather than the object. See
 * `auth-plan.md` §12.3 — it is one function, and it is a one-way door.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { MenuSession } from "@eat-out-better/shared";

const STORAGE_KEY = "eat-out-better:sessions";

/**
 * Hard storage ceiling. A code constant ON PURPOSE — see the header. At a
 * rough ~20KB per session this bounds the store at ~2MB, which AsyncStorage
 * handles comfortably.
 */
const MAX_STORED = 100;

const FALLBACK_DISPLAY_LIMIT = 50;
const configuredDisplayLimit = Number(Constants.expoConfig?.extra?.historyLimit);

/**
 * How many saved scans the history screen shows. Safe to retune over the air:
 * it is read only on the READ path, so lowering it hides rows, never deletes
 * them.
 */
export const HISTORY_DISPLAY_LIMIT: number =
  Number.isFinite(configuredDisplayLimit) && configuredDisplayLimit > 0
    ? configuredDisplayLimit
    : FALLBACK_DISPLAY_LIMIT;

export async function saveSession(session: MenuSession): Promise<void> {
  try {
    const existing = await getSessions();
    // Newest first. The slice is bounded by a constant, so it can only ever
    // trim to MAX_STORED — it can never shrink because a config value did.
    const updated = [session, ...existing].slice(0, MAX_STORED);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    // Deliberately swallowed. `store.setResults()` has already run by the time
    // this is awaited (useAnalysis.ts:306), so the user has their results —
    // failing to archive them must not surface as a scan failure.
    console.warn("Failed to save session:", error);
  }
}

/**
 * Every stored session, newest first. Local storage only — never the network.
 */
export async function getSessions(): Promise<MenuSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Delete all saved scans. This is the ONLY path that removes history, and it
 * is always user-initiated — nothing prunes in the background.
 *
 * Now wrapped: this was the one function in the file without a try/catch, and
 * it acquired its first caller (the history screen's "Clear history") at the
 * same time as this comment. An AsyncStorage failure here should leave the
 * user with their history intact and a visible error, not an unhandled
 * rejection.
 */
export async function clearSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear sessions:", error);
    throw error;
  }
}
