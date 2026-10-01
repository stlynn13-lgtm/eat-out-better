/**
 * Accounts: a silent anonymous account from first launch, upgraded in place
 * when the person signs in with Apple, Google, or a 6-digit email code.
 *
 * Decided by Sean 2026-09-28 (supersedes auth-plan.md's "anonymous-first is
 * cut"): every install gets a real Supabase user on first launch, so saved
 * scans are tied to an account from the start, and signing in later LINKS a
 * login to that same user — same id, nothing moves, nothing is lost. Scanning
 * never requires signing in (App Store 5.1.1(v)).
 *
 * ## The three shapes a sign-in can take
 *
 *   1. Link (the common case). The login is new to us: attach it to the
 *      current anonymous user with `linkIdentity` / `updateUser({ email })`.
 *      The user id doesn't change, so neither does anything keyed on it.
 *
 *      NOT `signInWithIdToken` — that signs into a DIFFERENT, brand-new user
 *      and abandons this one, with no error. It looks exactly like success.
 *
 *   2. Switch. The login already belongs to an account (a reinstall, a second
 *      phone). Linking fails with `identity_already_exists` / `email_exists`,
 *      so sign into that account instead, then merge this phone's anonymous
 *      scans into it — by re-uploading them, never by reassigning rows
 *      server-side (Supabase's documented client-side merge is a silent no-op
 *      under own-rows RLS). The abandoned anonymous account is then deleted.
 *
 *   3. Nothing to link to (no session at all — first launch was offline):
 *      sign in normally; the phone's no-account shelf is claimed on arrival.
 *
 * ## Who gets the anonymous scans on a switch (auth-plan.md §12.4)
 *
 * If someone signed out on this phone earlier, the scans made since then may
 * not be theirs. They are merged only if nobody has ever signed out here, or
 * the person signing in IS the one who last signed out. Otherwise they are
 * dropped rather than handed to a stranger.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as ExpoCrypto from "expo-crypto";
import { AppState } from "react-native";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase, hasStoredSession, API_URL } from "./supabase";
import {
  setActiveHistoryUser,
  claimDeviceShelf,
  readShelf,
  mergeIntoShelf,
  removeShelf,
} from "../storage/session";
import { syncUp, syncDown, wireHistorySync, forgetSynced } from "../sync/sessions";

// ---------------------------------------------------------------------------
// State the screens read
// ---------------------------------------------------------------------------

export type LoginProvider = "apple" | "google" | "email";

export interface AuthState {
  /** `unavailable` = this build has no Supabase config; accounts are hidden. */
  status: "unavailable" | "starting" | "ready" | "offline";
  userId: string | null;
  /** True for the silent first-launch account, before any sign-in. */
  isAnonymous: boolean;
  email: string | null;
  displayName: string | null;
  providers: LoginProvider[];
  /**
   * The login used most recently. An account can hold more than one — Supabase
   * joins logins that share a verified email, so Apple and Google with the
   * same address are ONE account — and the screen names the one in use.
   */
  currentProvider: LoginProvider | null;
}

export const useAuth = create<AuthState>(() => ({
  status: supabase ? "starting" : "unavailable",
  userId: null,
  isAnonymous: true,
  email: null,
  displayName: null,
  providers: [],
  currentProvider: null,
}));

function applyUser(user: User | null): void {
  if (!user) {
    useAuth.setState({
      userId: null,
      isAnonymous: true,
      email: null,
      displayName: null,
      providers: [],
      currentProvider: null,
    });
    return;
  }
  const isLogin = (p: string): p is LoginProvider =>
    p === "apple" || p === "google" || p === "email";
  const identities = (user.identities ?? []).filter((i) => isLogin(i.provider));
  const providers = identities.map((i) => i.provider as LoginProvider);
  // Newest `last_sign_in_at` wins; ISO timestamps sort as text.
  const latest = [...identities].sort((a, b) =>
    (b.last_sign_in_at ?? "").localeCompare(a.last_sign_in_at ?? "")
  )[0];
  useAuth.setState({
    status: "ready",
    userId: user.id,
    isAnonymous: user.is_anonymous === true,
    // Anonymous users converting by email have `new_email` until verified.
    email: user.email || null,
    displayName: (user.user_metadata?.full_name as string | undefined) ?? null,
    providers: Array.from(new Set(providers)),
    currentProvider: (latest?.provider as LoginProvider | undefined) ?? null,
  });
}

// ---------------------------------------------------------------------------
// Sign-out bookkeeping (§12.4)
// ---------------------------------------------------------------------------

const META_KEY = "eat-out-better:auth-meta";

interface AuthMeta {
  everSignedOut: boolean;
  lastSignedOutUserId: string | null;
}

async function readMeta(): Promise<AuthMeta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      everSignedOut: parsed?.everSignedOut === true,
      lastSignedOutUserId: parsed?.lastSignedOutUserId ?? null,
    };
  } catch {
    // Unknown history is treated as "someone has signed out here", so the
    // failure mode is dropping anonymous scans, never leaking them.
    return { everSignedOut: true, lastSignedOutUserId: null };
  }
}

async function writeMeta(meta: AuthMeta): Promise<void> {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.warn("[auth] Could not save sign-out record:", error);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * Set while a sign-in/sign-out is moving shelves around, so the auth-state
 * listener doesn't run its own claim-and-sync against a half-switched state.
 */
let switching = false;
/** After deleting an account, don't mint a replacement until next launch. */
let deletedThisLaunch = false;
let started = false;

/**
 * Called once from app/_layout.tsx. Never awaited before first paint: the app
 * must render and scan with no network, so everything here is background work.
 */
export function startAuth(): void {
  if (started || !supabase) return;
  started = true;
  wireHistorySync();

  supabase.auth.onAuthStateChange((event, session) => {
    applyUser(session?.user ?? null);
    if (switching || !session?.user) return;
    if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "USER_UPDATED") {
      const user = session.user;
      // Deferred: Supabase warns that awaiting other auth calls inside this
      // callback can deadlock the client.
      setTimeout(() => void onUserReady(user), 0);
    }
  });

  void ensureSession();

  AppState.addEventListener("change", (state) => {
    if (state !== "active") return;
    void ensureSession();
    const { userId } = useAuth.getState();
    if (userId) void syncUp(userId);
  });
}

let ensuring: Promise<void> | null = null;

/**
 * Make sure there is a user: restore the stored one, or — only when nothing is
 * stored at all — create the silent anonymous account.
 */
export function ensureSession(): Promise<void> {
  if (!supabase) return Promise.resolve();
  const client = supabase;
  if (!ensuring) {
    ensuring = (async () => {
      const { data } = await client.auth.getSession();
      if (data.session) {
        useAuth.setState({ status: "ready" });
        return;
      }
      // A stored session that couldn't be restored (offline, refresh failed)
      // is a real user we must not replace. Wait for the network instead.
      if (await hasStoredSession()) {
        useAuth.setState({ status: "offline" });
        return;
      }
      if (deletedThisLaunch) return;
      const { error } = await client.auth.signInAnonymously();
      if (error) {
        useAuth.setState({ status: "offline" });
        console.warn("[auth] Anonymous sign-in failed; will retry:", error.message);
      }
    })()
      .catch((error) => {
        useAuth.setState({ status: "offline" });
        console.warn("[auth] Session check failed:", error);
      })
      .finally(() => {
        ensuring = null;
      });
  }
  return ensuring;
}

async function onUserReady(user: User): Promise<void> {
  await setActiveHistoryUser(user.id);
  await claimDeviceShelf(user.id);
  if (!user.is_anonymous) await syncDown(user.id);
  await syncUp(user.id);
}

async function currentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** The user backed out of an Apple sheet or the Google browser. Show nothing. */
export class SignInCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SignInCancelled";
  }
}

/**
 * What a completed sign-in amounted to, from the person's point of view:
 * `created` — this phone's account now has a login (the usual case, or a
 * brand-new account made while offline); `welcomeBack` — they signed into an
 * account they already had, and this phone's scans were merged into it.
 * Drives the "You're all set" vs "Welcome back" screen.
 */
export type SignInOutcome = "created" | "welcomeBack";

/** An account made in the last couple of minutes is new, whatever the path. */
function outcomeForExisting(user: User): SignInOutcome {
  const created = Date.parse(user.created_at ?? "");
  return Number.isFinite(created) && Date.now() - created < 120_000
    ? "created"
    : "welcomeBack";
}

const TAKEN_CODES = new Set([
  "identity_already_exists",
  "email_exists",
  "user_already_exists",
]);

function isTaken(error: unknown): boolean {
  const code = (error as AuthError | undefined)?.code;
  return typeof code === "string" && TAKEN_CODES.has(code);
}

/** Copy for an Alert. Never the raw server message. */
export function friendlyAuthError(error: unknown): string {
  const code = (error as AuthError | undefined)?.code;
  switch (code) {
    case "otp_expired":
      return "That code has expired. Ask for a new one and try again.";
    case "invalid_credentials":
    case "bad_code_verifier":
      return "That code isn't right. Check the email and try again.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute, then try again.";
    case "email_address_invalid":
      return "That email address doesn't look right.";
    case "identity_already_exists":
      return "That login is already used by a different account.";
    default:
      break;
  }
  if (error instanceof TypeError) {
    return "We couldn't reach the sign-in service. Check your connection and try again.";
  }
  return "Something went wrong signing in. Please try again.";
}

// ---------------------------------------------------------------------------
// The switch (shape 2)
// ---------------------------------------------------------------------------

async function switchToExistingAccount(
  signIn: () => Promise<{ error: AuthError | Error | null }>
): Promise<SignInOutcome> {
  if (!supabase) throw new Error("Accounts are not available in this build.");
  const previous = await currentSession();
  switching = true;
  try {
    const { error } = await signIn();
    if (error) throw error;

    const now = await currentSession();
    const user = now?.user;
    if (!user) throw new Error("Sign-in did not complete.");

    if (previous && previous.user.id !== user.id) {
      const meta = await readMeta();
      const claim = !meta.everSignedOut || meta.lastSignedOutUserId === user.id;
      if (claim) {
        await mergeIntoShelf(user.id, await readShelf(previous.user.id));
      }
      await removeShelf(previous.user.id);
      await forgetSynced(previous.user.id);
      // Tidy up the abandoned anonymous account and its server copies. Its
      // access token is still valid for up to an hour; best-effort only.
      if (previous.user.is_anonymous) void deleteWithToken(previous.access_token);
    }
    await onUserReady(user);
    return outcomeForExisting(user);
  } finally {
    switching = false;
  }
}

/** Re-read the user after a link so the screen shows the new login. */
async function afterLink(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.refreshSession();
  const user = data.user ?? data.session?.user ?? null;
  applyUser(user);
  if (user) await onUserReady(user);
}

// ---------------------------------------------------------------------------
// Apple (native sheet; no browser)
// ---------------------------------------------------------------------------

export function isAppleSignInAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

async function appleCredential(
  scopes: AppleAuthentication.AppleAuthenticationScope[]
): Promise<{ credential: AppleAuthentication.AppleAuthenticationCredential; rawNonce: string }> {
  // Apple embeds a hash of the nonce in the identity token; Supabase is given
  // the raw value and checks it matches. Binds the token to this request.
  const rawNonce = ExpoCrypto.randomUUID();
  const hashedNonce = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: scopes,
      nonce: hashedNonce,
    });
    return { credential, rawNonce };
  } catch (error) {
    if ((error as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
      throw new SignInCancelled();
    }
    throw error;
  }
}

export async function continueWithApple(): Promise<SignInOutcome> {
  if (!supabase) throw new Error("Accounts are not available in this build.");
  const client = supabase;
  const { credential, rawNonce } = await appleCredential([
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ]);
  if (!credential.identityToken) throw new Error("Apple did not return a token.");
  const idToken = {
    provider: "apple" as const,
    token: credential.identityToken,
    nonce: rawNonce,
  };

  const current = await currentSession();
  let linked = false;
  if (current) {
    const { error } = await client.auth.linkIdentity(idToken);
    if (!error) linked = true;
    else if (!isTaken(error) || !current.user.is_anonymous) throw error;
  }
  let outcome: SignInOutcome = "created";
  if (linked) await afterLink();
  else outcome = await switchToExistingAccount(() => client.auth.signInWithIdToken(idToken));

  // Apple sends the name on the FIRST authorization only, ever. Save it now or
  // never have it.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(" ");
  if (name) {
    const { data } = await client.auth.updateUser({ data: { full_name: name } }).catch(() => ({
      data: { user: null },
    }));
    if (data.user) applyUser(data.user);
  }
  return outcome;
}

// ---------------------------------------------------------------------------
// Google (system browser, PKCE; no native Google SDK in the binary)
// ---------------------------------------------------------------------------

/** eat-out-better://auth/callback — must be in Supabase's Redirect URLs. */
const AUTH_REDIRECT = Linking.createURL("auth/callback");

interface BrowserResult {
  code: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

async function runBrowserFlow(url: string): Promise<BrowserResult> {
  const result = await WebBrowser.openAuthSessionAsync(url, AUTH_REDIRECT);
  if (result.type !== "success") throw new SignInCancelled();
  const returned = new URL(result.url);
  // Errors can come back in the query or the fragment depending on where in
  // the flow they happened; read both.
  const hash = new URLSearchParams(returned.hash.replace(/^#/, ""));
  const get = (key: string) => returned.searchParams.get(key) ?? hash.get(key);
  return {
    code: get("code"),
    errorCode: get("error_code") ?? get("error"),
    errorDescription: get("error_description"),
  };
}

function browserError(r: BrowserResult): AuthError | Error {
  const error = new Error(r.errorDescription ?? "Google sign-in did not complete.");
  (error as Error & { code?: string }).code = r.errorCode ?? undefined;
  return error;
}

export async function continueWithGoogle(): Promise<SignInOutcome> {
  if (!supabase) throw new Error("Accounts are not available in this build.");
  const client = supabase;
  const options = { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true };

  const current = await currentSession();
  if (current) {
    const { data, error } = await client.auth.linkIdentity({ provider: "google", options });
    if (error) throw error;
    const r = await runBrowserFlow(data.url);
    if (r.code) {
      const exchanged = await client.auth.exchangeCodeForSession(r.code, {
        flowId: data.flowId ?? undefined,
      });
      if (exchanged.error) throw exchanged.error;
      await afterLink();
      return "created";
    }
    const failure = browserError(r);
    if (!isTaken(failure) || !current.user.is_anonymous) throw failure;
  }

  return switchToExistingAccount(async () => {
    const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options });
    if (error) return { error };
    const r = await runBrowserFlow(data.url);
    if (!r.code) return { error: browserError(r) };
    return client.auth.exchangeCodeForSession(r.code, { flowId: data.flowId ?? undefined });
  });
}

// ---------------------------------------------------------------------------
// Email: a 6-digit code, typed into the app (auth-plan.md decision 6)
// ---------------------------------------------------------------------------

/**
 * `link`     — the address is new; the code attaches it to this account.
 * `existing` — the address already has an account; the code signs into it.
 */
export type EmailCodeMode = "link" | "existing";

export async function sendEmailCode(email: string): Promise<EmailCodeMode> {
  if (!supabase) throw new Error("Accounts are not available in this build.");
  const address = email.trim().toLowerCase();
  const current = await currentSession();

  if (current) {
    const { error } = await supabase.auth.updateUser({ email: address });
    if (!error) return "link";
    if (!isTaken(error) || !current.user.is_anonymous) throw error;
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    // With a session, the address is known to exist — never mint a second
    // account here. Without one, this IS account creation (shape 3).
    options: { shouldCreateUser: !current },
  });
  if (error) throw error;
  return "existing";
}

export async function verifyEmailCode(
  email: string,
  code: string,
  mode: EmailCodeMode
): Promise<SignInOutcome> {
  if (!supabase) throw new Error("Accounts are not available in this build.");
  const client = supabase;
  const address = email.trim().toLowerCase();
  const token = code.replace(/\D/g, "");

  if (mode === "link") {
    const { error } = await client.auth.verifyOtp({ email: address, token, type: "email_change" });
    if (error) throw error;
    await afterLink();
    return "created";
  }
  return switchToExistingAccount(() =>
    client.auth.verifyOtp({ email: address, token, type: "email" })
  );
}

// ---------------------------------------------------------------------------
// Sign out, delete
// ---------------------------------------------------------------------------

/**
 * Sign out on this phone only. The account's scans stay on the phone under
 * its own shelf (so signing back in is instant) but are no longer visible;
 * a fresh anonymous account takes over with an empty history.
 */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  const current = await currentSession();
  if (!current) return;
  await writeMeta({ everSignedOut: true, lastSignedOutUserId: current.user.id });
  switching = true;
  try {
    await supabase.auth.signOut({ scope: "local" });
    await setActiveHistoryUser(null);
  } finally {
    switching = false;
  }
  await ensureSession();
}

async function deleteWithToken(
  accessToken: string,
  appleAuthorizationCode?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/account/delete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appleAuthorizationCode }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Permanently delete the account and everything saved to it (App Store
 * 5.1.1(v)). Server first: if that fails, nothing local is touched and the
 * user is told. Then, in order, the session, the keychain and the history —
 * so a partial failure leaves someone signed out, never half-deleted.
 *
 * Deliberately does NOT create a replacement account straight away: App
 * Review reads an instant new account as "deactivated, not deleted". The next
 * launch starts fresh.
 */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error("Accounts are not available in this build.");
  const current = await currentSession();
  if (!current) throw new Error("You're not signed in.");
  const userId = current.user.id;

  // Apple requires revoking Sign in with Apple tokens on deletion, and the
  // native sign-in never hands us a token to revoke — so ask Apple for a fresh
  // authorization code now. Backing out of Apple's sheet still deletes the
  // account; only the revocation is skipped.
  let appleAuthorizationCode: string | undefined;
  if (useAuth.getState().providers.includes("apple")) {
    try {
      const { credential } = await appleCredential([]);
      appleAuthorizationCode = credential.authorizationCode ?? undefined;
    } catch (error) {
      if (!(error instanceof SignInCancelled)) console.warn("[auth] Apple re-auth failed:", error);
    }
  }

  const ok = await deleteWithToken(current.access_token, appleAuthorizationCode);
  if (!ok) {
    throw new Error(
      "We couldn't delete your account just now. Check your connection and try again."
    );
  }

  deletedThisLaunch = true;
  switching = true;
  try {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    await removeShelf(userId);
    await forgetSynced(userId);
    await setActiveHistoryUser(null);
    await writeMeta({ everSignedOut: true, lastSignedOutUserId: null });
  } finally {
    switching = false;
  }
  applyUser(null);
}
