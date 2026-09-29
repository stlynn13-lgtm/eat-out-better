/**
 * The one Supabase client. Import it from here; never call createClient
 * anywhere else.
 *
 * `supabase` is NULL when the build carries no Supabase config. That is a
 * supported state, not an error: every caller checks for it, accounts simply
 * don't appear, and scanning and on-device history work exactly as they did
 * before accounts existed. It is what lets this code ship in a binary before
 * the Supabase project is switched on.
 *
 * ## Sessions persist until the user signs out
 *
 * Tokens live in the iOS Keychain (expo-secure-store), not AsyncStorage —
 * AsyncStorage is a plaintext file, and a refresh token is a password.
 * `autoRefreshToken` keeps the access token fresh while the app is in the
 * foreground; Supabase refresh tokens don't expire on their own, so a user
 * stays signed in until they tap Sign out (or delete their account).
 *
 * Keychain items survive deleting the app, so a reinstall comes back signed in
 * as the same user — the same property lib/identity/installId.ts relies on.
 */

import "./polyfills";
import { AppState } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const extra = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL: string | undefined = extra.supabaseUrl || undefined;
const SUPABASE_KEY: string | undefined = extra.supabasePublishableKey || undefined;

/**
 * Kill switch, separate from the config. `extra` ships over the air, so
 * setting `accountsEnabled: false` and publishing an update hides every
 * account surface and stops creating accounts — without a new build.
 */
const ACCOUNTS_ENABLED: boolean = extra.accountsEnabled !== false;

const SESSION_STORAGE_KEY = "eatoutbetter.supabase.auth";

/**
 * Keychain-backed storage in the shape supabase-js wants. Every call is
 * wrapped: a locked or unavailable keychain must degrade to "signed out",
 * never throw into the auth client.
 */
const keychainStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        // Readable after the first unlock since boot, so a token refresh that
        // happens with the screen locked doesn't fail and sign the user out.
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch (error) {
      console.warn("[auth] Could not persist session to the keychain:", error);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Nothing to remove, or the keychain is unavailable — either way the
      // session is gone from the client's point of view.
    }
  },
};

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY && ACCOUNTS_ENABLED
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storage: keychainStorage,
          // Keychain key names may only use [A-Za-z0-9._-].
          storageKey: SESSION_STORAGE_KEY,
          autoRefreshToken: true,
          persistSession: true,
          // Native app: there is no page URL to read a session out of.
          detectSessionInUrl: false,
          // PKCE for the Google browser flow — the code comes back through the
          // app's own URL scheme and is exchanged here, never exposed as tokens
          // in a redirect.
          flowType: "pkce",
        },
      })
    : null;

export const accountsAvailable = supabase !== null;

/**
 * Whether ANY session is stored on this phone, read straight from the
 * keychain with no network and no refresh attempt.
 *
 * This is the guard against the worst failure in anonymous-first auth:
 * `getSession()` returns null when an expired token can't be refreshed —
 * including when the phone is simply offline. Treat that as "nobody is signed
 * in", create an anonymous user the moment the network comes back, and a real
 * account has been silently replaced by an empty one. So an anonymous account
 * is only ever created when this says there is nothing stored at all.
 */
export async function hasStoredSession(): Promise<boolean> {
  return (await keychainStorage.getItem(SESSION_STORAGE_KEY)) !== null;
}

// Supabase's React Native guidance: refresh tokens only while in the
// foreground. iOS suspends timers in the background anyway; this makes the
// client resume cleanly (and refresh immediately if needed) on return.
if (supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** The API base URL, shared with the scan pipeline. */
export const API_URL: string =
  Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3000";
