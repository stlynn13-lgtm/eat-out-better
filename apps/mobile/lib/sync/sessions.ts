/**
 * Copies saved scans between this phone and the user's account.
 *
 * The phone is the source of truth for what the history screen shows
 * (lib/storage/session.ts). This module only mirrors it:
 *
 *   syncUp    — upload any scan on this user's shelf the server hasn't got.
 *               Runs after every save, on launch, and on return to foreground,
 *               so a scan saved on restaurant wifi gets there eventually.
 *   syncDown  — pull the account's scans onto this phone. Signed-in (not
 *               anonymous) users only: it's what makes history follow you to a
 *               new phone.
 *   deleteRemoteHistory — the server half of "Clear history".
 *   markRenamed — a renamed scan is queued to be replaced on the server.
 *
 * Nothing here throws to a caller, and nothing here is awaited by a scan or by
 * the history screen. A failed sync costs a retry, never a result.
 *
 * ## Health data never leaves the phone (auth-plan.md §12.3)
 *
 * A saved scan carries `healthCondition`. `toServerPayload()` strips it, and
 * it is the ONLY way a row is built — the database also rejects any payload
 * that still has one. Today the condition is the same constant for every user,
 * but the moment a condition picker exists this is the line between "saved
 * scans" and "health records" on the App Store privacy label.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_CONDITION } from "@eat-out-better/shared";
import type { MenuSession } from "@eat-out-better/shared";
import { supabase } from "../auth/supabase";
import { readShelf, mergeIntoShelf, onHistoryChange } from "../storage/session";

type ServerPayload = Omit<MenuSession, "healthCondition">;

/** The redacted projection. The one and only way a scan becomes a row. */
export function toServerPayload(session: MenuSession): ServerPayload {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { healthCondition, ...rest } = session;
  return rest;
}

/**
 * Back from the server. The condition was stripped on the way up; every scan
 * so far has been scored for the app's single condition, so that is what it
 * gets back. When more conditions exist, the scoring profile a scan used must
 * be stored as a non-health field (e.g. a rubric version) before this line is
 * allowed to guess.
 */
function fromServerPayload(payload: ServerPayload): MenuSession {
  return { ...payload, healthCondition: DEFAULT_CONDITION } as MenuSession;
}

/**
 * The database stores a scan only with the API's signature of its id
 * (`scanSig`, supabase/migrations/20261003000000_signed_scans.sql). Scans saved
 * before signing existed don't have one; they stay on this phone. Filtering
 * them out here matters because the upload is chunked — one refused row fails
 * its whole chunk, which would otherwise stall every scan after it.
 */
function isUploadable(session: MenuSession): boolean {
  return typeof session.scanSig === "string" && session.scanSig.length > 0;
}

const UPLOAD_CHUNK = 20;
const DOWNLOAD_LIMIT = 100;

function syncedKey(userId: string): string {
  return `eat-out-better:synced:${userId}`;
}

async function readSynced(userId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(syncedKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

async function markSynced(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const synced = await readSynced(userId);
  ids.forEach((id) => synced.add(id));
  // Bounded: only ids still on the shelf matter, and the shelf holds 100.
  const keep = Array.from(synced).slice(-500);
  try {
    await AsyncStorage.setItem(syncedKey(userId), JSON.stringify(keep));
  } catch {
    // Worst case the next sync re-uploads, and the upsert ignores duplicates.
  }
}

export async function forgetSynced(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(syncedKey(userId));
  } catch {
    // Harmless — see markSynced.
  }
}

// ---------------------------------------------------------------------------
// Renamed scans
//
// The table has no UPDATE grant on purpose (see the migration: history can be
// added to or deleted, never rewritten in place). So a rename reaches the
// account as a delete followed by the ordinary upload. The ids waiting for
// that are kept here until the delete succeeds, which makes it survive a bad
// connection: every syncUp tries again.
// ---------------------------------------------------------------------------

function renamedKey(userId: string): string {
  return `eat-out-better:renamed:${userId}`;
}

async function readRenamed(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(renamedKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRenamed(userId: string, ids: string[]): Promise<void> {
  try {
    if (ids.length === 0) await AsyncStorage.removeItem(renamedKey(userId));
    else await AsyncStorage.setItem(renamedKey(userId), JSON.stringify(ids.slice(-200)));
  } catch {
    // Worst case the account keeps the old name; the phone still has the new one.
  }
}

async function unmarkSynced(userId: string, ids: string[]): Promise<void> {
  const synced = await readSynced(userId);
  ids.forEach((id) => synced.delete(id));
  try {
    await AsyncStorage.setItem(syncedKey(userId), JSON.stringify(Array.from(synced)));
  } catch {
    // See markSynced.
  }
}

export async function markRenamed(userId: string, id: string): Promise<void> {
  const ids = await readRenamed(userId);
  if (!ids.includes(id)) await writeRenamed(userId, [...ids, id]);
}

/**
 * Remove the account's old copy of each renamed scan so the upload that
 * follows carries the new name. Only called from inside syncUp.
 */
async function replaceRenamed(userId: string): Promise<void> {
  if (!supabase) return;
  const queued = await readRenamed(userId);
  if (queued.length === 0) return;
  // Only scans that can be re-uploaded (see isUploadable) may have their old
  // copy deleted — otherwise a rename would remove the scan from the account.
  // An unsigned scan keeps its old name on the server and leaves the queue.
  const uploadable = new Set(
    (await readShelf(userId)).filter(isUploadable).map((s) => s.id)
  );
  const ids = queued.filter((id) => uploadable.has(id));
  if (ids.length < queued.length) {
    await writeRenamed(userId, ids);
  }
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("menu_sessions")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);
  if (error) {
    console.warn("[sync] Rename sync failed, will retry later:", error.message);
    return;
  }
  // Unmark first: if the app dies between these two writes, the worst case is
  // an upload the server already has, which the upsert ignores.
  await unmarkSynced(userId, ids);
  const remaining = (await readRenamed(userId)).filter((id) => !ids.includes(id));
  await writeRenamed(userId, remaining);
}

/** True only while the client's session really belongs to `userId`. */
async function sessionIs(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id === userId;
}

const inflightUp = new Map<string, Promise<void>>();

export function syncUp(userId: string): Promise<void> {
  const existing = inflightUp.get(userId);
  if (existing) return existing;
  const run = (async () => {
    if (!supabase || !(await sessionIs(userId))) return;
    await replaceRenamed(userId);
    const synced = await readSynced(userId);
    const pending = (await readShelf(userId)).filter(
      (s) => !synced.has(s.id) && isUploadable(s)
    );

    for (let i = 0; i < pending.length; i += UPLOAD_CHUNK) {
      const chunk = pending.slice(i, i + UPLOAD_CHUNK);
      const { error } = await supabase.from("menu_sessions").upsert(
        chunk.map((s) => ({
          id: s.id,
          user_id: userId,
          created_at: s.createdAt,
          payload: toServerPayload(s),
        })),
        // ON CONFLICT (user_id, id) DO NOTHING — needs INSERT only, which is
        // all the database grants. Retries and re-runs are free.
        { onConflict: "user_id,id", ignoreDuplicates: true }
      );
      if (error) {
        console.warn("[sync] Upload failed, will retry later:", error.message);
        return;
      }
      await markSynced(userId, chunk.map((s) => s.id));
    }
  })()
    .catch((error) => console.warn("[sync] Upload error:", error))
    .finally(() => inflightUp.delete(userId));
  inflightUp.set(userId, run);
  return run;
}

export async function syncDown(userId: string): Promise<void> {
  try {
    if (!supabase || !(await sessionIs(userId))) return;
    const { data, error } = await supabase
      .from("menu_sessions")
      .select("id, payload")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(DOWNLOAD_LIMIT);
    if (error || !data) {
      if (error) console.warn("[sync] Download failed:", error.message);
      return;
    }
    const sessions = data.map((row) =>
      fromServerPayload({ ...(row.payload as ServerPayload), id: row.id as string })
    );
    await mergeIntoShelf(userId, sessions);
    await markSynced(userId, sessions.map((s) => s.id));
  } catch (error) {
    console.warn("[sync] Download error:", error);
  }
}

export async function deleteRemoteHistory(userId: string): Promise<void> {
  try {
    if (!supabase || !(await sessionIs(userId))) return;
    const { error } = await supabase.from("menu_sessions").delete().eq("user_id", userId);
    if (error) console.warn("[sync] Remote clear failed:", error.message);
    else {
      await forgetSynced(userId);
      await writeRenamed(userId, []);
    }
  } catch (error) {
    console.warn("[sync] Remote clear error:", error);
  }
}

let wired = false;

/**
 * Hook the history store's change events to the server. Idempotent; called
 * once from the auth bootstrap.
 */
export function wireHistorySync(): void {
  if (wired || !supabase) return;
  wired = true;
  onHistoryChange((change) => {
    // `device` is the no-account shelf; nothing to sync it to.
    if (change.shelf === "device") return;
    const userId = change.shelf;
    if (change.type === "saved") void syncUp(userId);
    else if (change.type === "renamed") {
      void markRenamed(userId, change.session.id).then(() => syncUp(userId));
    } else void deleteRemoteHistory(userId);
  });
}
