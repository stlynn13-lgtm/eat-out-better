/**
 * Signs a scan id so the app may store that scan in the user's account.
 *
 * The app writes saved scans straight to `menu_sessions` with the publishable
 * key, and the database accepts a row only when `payload.scanSig` is a valid
 * HMAC of its id (supabase/migrations/20261003000000_signed_scans.sql). This is
 * the one place that HMAC is issued, so every stored row traces back to a scan
 * that passed this route's token gate, rate limits and spend cap.
 *
 * The key never leaves the database: `api_sign_scan` computes the signature
 * there, callable by the secret-key client only.
 *
 * Never throws and never blocks a result for long. Without a signature the
 * user still gets their scan; it just stays on their phone instead of syncing.
 */

import { getSupabaseAdmin } from "./admin";

const SIGN_TIMEOUT_MS = 3000;

export async function signScan(id: string): Promise<string | undefined> {
  const db = getSupabaseAdmin();
  if (!db) return undefined;

  try {
    const { data, error } = await db
      .rpc("api_sign_scan", { p_id: id })
      .abortSignal(AbortSignal.timeout(SIGN_TIMEOUT_MS));
    if (error) throw error;
    return typeof data === "string" && data ? data : undefined;
  } catch (error) {
    console.error("[scanSignature] Could not sign scan — it won't sync:", error);
    return undefined;
  }
}
