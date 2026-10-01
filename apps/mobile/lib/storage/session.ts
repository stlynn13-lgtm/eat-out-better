/**
 * On-device scan history — the source of truth for what the history screen
 * shows, with or without an account.
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
 *
 * ## One shelf per account (auth-plan.md §12.4)
 *
 * Every Supabase user — anonymous or signed in — gets their own key,
 * `eat-out-better:sessions:<userId>`. Signing out switches shelves without
 * deleting anything, so the next person to use the phone starts empty and can
 * never read the previous person's scans. `device` is the shelf used only
 * while there is no account at all (accounts off, or a first launch with no
 * network); the first account on the phone claims it.
 *
 * The pre-accounts blob (`eat-out-better:sessions`, no suffix) is folded into
 * the `device` shelf once, on first read, so nobody's existing history
 * disappears when this version lands.
 *
 * ## Contract (do not change these signatures)
 *
 * `renameSession` (1.5.0) is the one way a stored scan is ever edited, and the
 * only field it touches is `customName`.
 *
 * `saveSession`, `getSessions` and `clearSessions` keep the signatures
 * hooks/useAnalysis.ts and app/history.tsx already call. `getSessions()` is
 * local-only FOREVER — it must never touch the network, because this app is
 * used standing up in a restaurant on bad wifi. Syncing to an account happens
 * AFTER the local write, through `onHistoryChange` listeners
 * (lib/sync/sessions.ts), and can never make a save or a read fail.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { MenuSession } from "@eat-out-better/shared";

/** The pre-accounts key. Read once, folded into `device`, then removed. */
const LEGACY_KEY = "eat-out-better:sessions";
const KEY_PREFIX = "eat-out-better:sessions:";
const ACTIVE_USER_KEY = "eat-out-better:active-user";
/** The shelf used while there is no account at all. */
export const DEVICE_SHELF = "device";

/**
 * Hard storage ceiling per shelf. A code constant ON PURPOSE — see the header.
 * At a rough ~20KB per session this bounds a shelf at ~2MB.
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

// ---------------------------------------------------------------------------
// Which shelf is active
// ---------------------------------------------------------------------------

/** `undefined` = not loaded yet this launch. */
let activeUserCache: string | null | undefined;

/**
 * The ONE resolver every read and write goes through. Three call sites that
 * could each work out "whose history is this" on their own is how a
 * cross-user leak happens; one resolver means they cannot disagree.
 *
 * Reads a locally persisted user id rather than asking Supabase, because the
 * Supabase session may need a network refresh and this path may not wait on
 * the network.
 */
async function activeShelf(): Promise<string> {
  if (activeUserCache === undefined) {
    try {
      activeUserCache = await AsyncStorage.getItem(ACTIVE_USER_KEY);
    } catch {
      activeUserCache = null;
    }
  }
  return activeUserCache ?? DEVICE_SHELF;
}

/** Called by the auth layer whenever the signed-in user changes. */
export async function setActiveHistoryUser(userId: string | null): Promise<void> {
  activeUserCache = userId;
  try {
    if (userId) await AsyncStorage.setItem(ACTIVE_USER_KEY, userId);
    else await AsyncStorage.removeItem(ACTIVE_USER_KEY);
  } catch (error) {
    console.warn("Failed to persist active history user:", error);
  }
}

// ---------------------------------------------------------------------------
// Shelf primitives (used by lib/sync and lib/auth — not by screens)
// ---------------------------------------------------------------------------

function keyFor(shelf: string): string {
  return KEY_PREFIX + shelf;
}

function parseList(raw: string | null): MenuSession[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Newest first, one entry per scan id, never more than MAX_STORED. */
function normalise(sessions: MenuSession[]): MenuSession[] {
  const seen = new Set<string>();
  const unique: MenuSession[] = [];
  for (const s of sessions) {
    if (!s?.id || seen.has(s.id)) continue;
    seen.add(s.id);
    unique.push(s);
  }
  unique.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return unique.slice(0, MAX_STORED);
}

export async function readShelf(shelf: string): Promise<MenuSession[]> {
  await migrateLegacyOnce();
  try {
    return parseList(await AsyncStorage.getItem(keyFor(shelf)));
  } catch {
    return [];
  }
}

/** Adds `incoming` to a shelf, keeping whichever copy is already there. */
export async function mergeIntoShelf(
  shelf: string,
  incoming: MenuSession[]
): Promise<void> {
  if (incoming.length === 0) return;
  const existing = await readShelf(shelf);
  await AsyncStorage.setItem(
    keyFor(shelf),
    JSON.stringify(normalise([...existing, ...incoming]))
  );
}

export async function removeShelf(shelf: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(shelf));
  } catch (error) {
    console.warn("Failed to remove history shelf:", error);
  }
}

/**
 * Hand the no-account `device` shelf to the account now on the phone. Called
 * whenever an account becomes active. Scans made while there was no account
 * belong to whoever is holding the phone now.
 */
export async function claimDeviceShelf(userId: string): Promise<void> {
  const device = await readShelf(DEVICE_SHELF);
  if (device.length === 0) return;
  await mergeIntoShelf(userId, device);
  await removeShelf(DEVICE_SHELF);
}

let legacyMigration: Promise<void> | null = null;

/** Fold the pre-accounts blob into the `device` shelf, once. */
function migrateLegacyOnce(): Promise<void> {
  if (!legacyMigration) {
    legacyMigration = (async () => {
      const raw = await AsyncStorage.getItem(LEGACY_KEY);
      const legacy = parseList(raw);
      if (legacy.length > 0) {
        const device = parseList(await AsyncStorage.getItem(keyFor(DEVICE_SHELF)));
        await AsyncStorage.setItem(
          keyFor(DEVICE_SHELF),
          JSON.stringify(normalise([...device, ...legacy]))
        );
      }
      // Removed only after the copy above succeeded.
      if (raw !== null) await AsyncStorage.removeItem(LEGACY_KEY);
    })().catch((error) => {
      // Leave the legacy key in place and try again next launch.
      legacyMigration = null;
      console.warn("Failed to migrate legacy history:", error);
    });
  }
  return legacyMigration;
}

// ---------------------------------------------------------------------------
// Change notifications (the sync layer subscribes)
// ---------------------------------------------------------------------------

export type HistoryChange =
  | { type: "saved"; shelf: string; session: MenuSession }
  | { type: "renamed"; shelf: string; session: MenuSession }
  | { type: "cleared"; shelf: string };

const listeners = new Set<(change: HistoryChange) => void>();

export function onHistoryChange(listener: (change: HistoryChange) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(change: HistoryChange): void {
  for (const listener of listeners) {
    try {
      listener(change);
    } catch (error) {
      console.warn("History listener failed:", error);
    }
  }
}

// ---------------------------------------------------------------------------
// The public contract
// ---------------------------------------------------------------------------

/**
 * Saves and renames are read-modify-write on one AsyncStorage key, so two of
 * them overlapping would have the second write back a list that never saw the
 * first. That became possible with renaming: the results screen offers it the
 * moment a scan lands, while that scan's own save may still be in flight. One
 * queue, strictly in order, is the whole fix.
 */
let writeQueue: Promise<unknown> = Promise.resolve();
function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

/** Longest name kept. Long enough for "The Cheesecake Factory — Cherry Creek". */
export const SCAN_NAME_MAX = 60;

export function saveSession(session: MenuSession): Promise<void> {
  return enqueueWrite(() => saveSessionNow(session));
}

async function saveSessionNow(session: MenuSession): Promise<void> {
  try {
    const shelf = await activeShelf();
    const existing = await readShelf(shelf);
    // Newest first. The slice is bounded by a constant, so it can only ever
    // trim to MAX_STORED — it can never shrink because a config value did.
    await AsyncStorage.setItem(
      keyFor(shelf),
      JSON.stringify(normalise([session, ...existing]))
    );
    // Only after the local write: sync is best-effort and must never be the
    // reason a scan wasn't saved.
    notify({ type: "saved", shelf, session });
  } catch (error) {
    // Deliberately swallowed. `store.setResults()` has already run by the time
    // this is awaited (useAnalysis.ts), so the user has their results —
    // failing to archive them must not surface as a scan failure.
    console.warn("Failed to save session:", error);
  }
}

/**
 * Give a saved scan the name the user typed. An empty name removes it, which
 * puts the scan back on the name read off the menu (or none).
 *
 * Returns the updated scan, or `null` if it isn't on this phone's shelf.
 * Throws on a storage failure so the caller can say the name didn't stick.
 */
export function renameSession(id: string, name: string): Promise<MenuSession | null> {
  return enqueueWrite(async () => {
    const shelf = await activeShelf();
    const existing = await readShelf(shelf);
    const index = existing.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const customName = name.replace(/\s+/g, " ").trim().slice(0, SCAN_NAME_MAX);
    const updated: MenuSession = { ...existing[index] };
    if (customName) updated.customName = customName;
    else delete updated.customName;

    const next = [...existing];
    next[index] = updated;
    await AsyncStorage.setItem(keyFor(shelf), JSON.stringify(next));
    notify({ type: "renamed", shelf, session: updated });
    return updated;
  });
}

/**
 * Every stored session for whoever is using the phone, newest first. Local
 * storage only — never the network.
 */
export async function getSessions(): Promise<MenuSession[]> {
  try {
    return await readShelf(await activeShelf());
  } catch {
    return [];
  }
}

/**
 * Delete all saved scans for whoever is using the phone. Always
 * user-initiated — nothing prunes in the background. When signed in, the sync
 * layer also deletes the account's copies on the server.
 *
 * Throws on a storage failure so the history screen can show an error rather
 * than pretend the history is gone.
 */
export async function clearSessions(): Promise<void> {
  try {
    const shelf = await activeShelf();
    await AsyncStorage.removeItem(keyFor(shelf));
    notify({ type: "cleared", shelf });
  } catch (error) {
    console.warn("Failed to clear sessions:", error);
    throw error;
  }
}
