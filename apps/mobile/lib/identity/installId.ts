/**
 * `install_id` — a stable, anonymous identifier for this installation.
 *
 * This is deliberately the SMALLEST possible step toward identity: no account,
 * no server, no new vendor, nothing that App Review can see. It exists so that
 * retention can be measured at all (today every metric is a stateless event,
 * so "did anyone come back?" is unanswerable), and so that a pre-signup
 * identity exists to reconcile against when accounts eventually ship.
 * See `auth-plan.md` §5 step 1.
 *
 * ## Three things here are load-bearing. Don't "simplify" them.
 *
 * **1. It lives in the Keychain, not AsyncStorage.** `expo-secure-store` is
 * backed by the iOS Keychain, which survives an app uninstall. That is the
 * point — a user who deletes and reinstalls is the same person, and counting
 * them as new is exactly the measurement error this file exists to remove.
 * It is also the reason the privacy answers need re-checking before this
 * ships: "persists across uninstall" is a stronger claim than the
 * "anonymous usage analytics" the live policy currently makes.
 *
 * **2. Read before write, always.** An existing value is never overwritten.
 * Every path that could mint a second id for the same install is a silently
 * broken retention series that looks fine on the dashboard.
 *
 * **3. One single-flight promise.** `_inflight` means concurrent callers on a
 * cold start await ONE resolution instead of racing to mint competing ids.
 * The bootstrap and the first screen can both ask without coordinating.
 *
 * ## Why this never throws
 *
 * Nothing in the app should fail because an analytics id could not be stored.
 * Every SecureStore call is wrapped; if the keychain is unavailable we fall
 * back to an id that lives only in memory for this session, and we do NOT try
 * to persist a replacement. A missing id degrades a metric. A thrown id
 * degrades the app.
 */

import * as SecureStore from "expo-secure-store";
import { generateId } from "../analytics";

const INSTALL_ID_KEY = "eatoutbetter:install_id";

let _cached: string | null = null;
let _inflight: Promise<string> | null = null;
/** True when the id could not be persisted and exists only for this session. */
let _ephemeral = false;

async function resolveInstallId(): Promise<string> {
  // Read first. An existing id always wins.
  try {
    const existing = await SecureStore.getItemAsync(INSTALL_ID_KEY);
    if (existing) {
      _cached = existing;
      return existing;
    }
  } catch {
    // Keychain unreadable (locked, simulator quirk, first-launch race).
    // Fall through and mint — but see the write below: if the write also
    // fails we stay ephemeral rather than minting again next launch.
  }

  // `generateId()` is Math.random-based, not crypto-random. That is a
  // deliberate carry-over from lib/analytics.ts: Hermes has historically
  // lacked `crypto.getRandomValues`, and `auth-plan.md` §5 step 9 defers
  // settling that until a build can actually test it — adding a native crypto
  // module on the strength of a stale comment is what that step exists to
  // prevent. This is an analytics identifier, never a credential and never
  // trusted by a server, so PRNG quality is not a security property here.
  // If step 9 proves crypto is available, swapping the generator is one line
  // and does not invalidate ids already minted.
  const minted = generateId();

  try {
    await SecureStore.setItemAsync(INSTALL_ID_KEY, minted);
  } catch {
    _ephemeral = true;
  }

  _cached = minted;
  return minted;
}

/**
 * Resolve this install's id, minting one on first call. Safe to call from
 * anywhere, any number of times, concurrently.
 */
export async function getInstallId(): Promise<string> {
  if (_cached) return _cached;
  if (_inflight) return _inflight;

  _inflight = resolveInstallId();
  try {
    return await _inflight;
  } finally {
    _inflight = null;
  }
}

/**
 * The id if it has already been resolved, otherwise null. For synchronous call
 * sites (render paths) that must not await. Never triggers a mint.
 */
export function getCachedInstallId(): string | null {
  return _cached;
}

/**
 * True when the id exists only in memory because the keychain write failed —
 * it will differ on the next cold start. Useful for interpreting a retention
 * series that looks wrong, and for a future diagnostics screen.
 */
export function isInstallIdEphemeral(): boolean {
  return _ephemeral;
}
