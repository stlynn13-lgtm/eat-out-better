/**
 * POST /api/account/delete — permanently delete the caller's account.
 *
 * App Store Guideline 5.1.1(v): an app that creates accounts must let people
 * delete them in the app, and Apple's FAQ says that includes automatically
 * created "guest" accounts — which is every install, since accounts are
 * anonymous-first. The app also calls this to tidy up the throwaway anonymous
 * account left behind when someone signs into an account they already had.
 *
 * Auth is the caller's own Supabase access token (Authorization: Bearer). This
 * route holds the Supabase SECRET key, which is why deletion lives here and
 * not in the app: the app only ever has the publishable key.
 *
 * What it does, in order:
 *   1. Verify the token and resolve the user.
 *   2. If the app sent a fresh Sign in with Apple authorization code, revoke
 *      the user's Apple tokens (Apple requires this for apps that offer Sign in
 *      with Apple). Best-effort: a revocation failure never blocks deletion.
 *   3. Delete the auth user. `menu_sessions` rows go with it (ON DELETE
 *      CASCADE) — there is nothing else to clean up.
 *
 * Idempotent: deleting an account that's already gone returns success, so a
 * retry after a dropped response can't strand the user on an error screen.
 *
 * Env (Vercel):
 *   SUPABASE_URL, SUPABASE_SECRET_KEY                    — required
 *   APPLE_TEAM_ID, APPLE_SIGN_IN_KEY_ID,
 *   APPLE_SIGN_IN_PRIVATE_KEY (the .p8 contents)         — for Apple revocation
 *   APPLE_CLIENT_ID (defaults to the iOS bundle id)
 */

import { NextRequest, NextResponse } from "next/server";
import { createPrivateKey, sign } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID ?? "com.eatoutbetter.app";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[account/delete] SUPABASE_URL / SUPABASE_SECRET_KEY not set");
    return json(503, {
      success: false,
      error: { code: "ACCOUNTS_UNAVAILABLE", message: "Accounts are not set up yet." },
    });
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "Sign in first." } });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    // A valid token for a user that no longer exists means a previous
    // deletion already succeeded — report success, not an error.
    if (userError?.code === "user_not_found" || userError?.status === 404) {
      return json(200, { success: true, alreadyDeleted: true });
    }
    return json(401, {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Your session has expired. Sign in again." },
    });
  }
  const userId = userData.user.id;

  let appleAuthorizationCode: string | undefined;
  try {
    const body = (await req.json()) as { appleAuthorizationCode?: unknown };
    if (typeof body?.appleAuthorizationCode === "string" && body.appleAuthorizationCode) {
      appleAuthorizationCode = body.appleAuthorizationCode;
    }
  } catch {
    // No body is fine — most accounts never used Apple.
  }

  if (appleAuthorizationCode) {
    const outcome = await revokeAppleTokens(appleAuthorizationCode).catch(
      (error: unknown) => `failed: ${error instanceof Error ? error.message : String(error)}`
    );
    if (outcome !== "revoked") {
      console.warn(`[account/delete] Apple revocation ${outcome} for ${userId}`);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError && deleteError.status !== 404) {
    console.error("[account/delete] deleteUser failed:", deleteError.message);
    return json(500, {
      success: false,
      error: { code: "DELETE_FAILED", message: "We couldn't delete your account. Please try again." },
    });
  }

  return json(200, { success: true });
}

// ---------------------------------------------------------------------------
// Sign in with Apple revocation
// ---------------------------------------------------------------------------

/**
 * The client secret Apple's REST API wants: a short-lived ES256 JWT signed with
 * the Sign in with Apple key (.p8). Minted per request, so there is no
 * six-month secret to rotate — the .p8 itself doesn't expire.
 */
function appleClientSecret(): string | null {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_SIGN_IN_KEY_ID;
  const privateKey = process.env.APPLE_SIGN_IN_PRIVATE_KEY;
  if (!teamId || !keyId || !privateKey) return null;

  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signingInput =
    encode({ alg: "ES256", kid: keyId }) +
    "." +
    encode({
      iss: teamId,
      iat: now,
      exp: now + 300,
      aud: "https://appleid.apple.com",
      sub: APPLE_CLIENT_ID,
    });
  const key = createPrivateKey(privateKey.replace(/\\n/g, "\n"));
  // JWS wants the raw r||s signature, not DER.
  const signature = sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${signature.toString("base64url")}`;
}

async function revokeAppleTokens(authorizationCode: string): Promise<string> {
  const clientSecret = appleClientSecret();
  if (!clientSecret) return "skipped (APPLE_* env not set)";

  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return `failed: token exchange ${tokenRes.status}`;
  const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) return "failed: no token returned";

  const revokeRes = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? "refresh_token" : "access_token",
    }),
  });
  return revokeRes.ok ? "revoked" : `failed: revoke ${revokeRes.status}`;
}
