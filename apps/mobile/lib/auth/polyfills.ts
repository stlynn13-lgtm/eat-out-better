/**
 * Globals supabase-js expects that React Native / Hermes may not provide.
 * Import this ONCE, before anything imports `@supabase/supabase-js` — lib/auth/
 * supabase.ts does it on its first line.
 *
 * Why each one exists:
 *
 *  - URL: RN ships a partial URL implementation (no working `searchParams`),
 *    and supabase-js builds its auth and REST URLs with it. Supabase's own
 *    Expo guide still installs this polyfill.
 *
 *  - crypto.getRandomValues: auth-js's PKCE code verifier does
 *    `if (typeof crypto === 'undefined') { ...Math.random fallback }` and
 *    otherwise calls `crypto.getRandomValues` unconditionally. A `crypto`
 *    global WITHOUT getRandomValues — which lib/analytics.ts records Hermes
 *    having — is a TypeError in the middle of Google sign-in. expo-crypto
 *    supplies a real CSPRNG.
 *
 *  - crypto.subtle.digest: without it auth-js logs "WebCrypto API is not
 *    supported" and silently downgrades PKCE from S256 to `plain`, which
 *    sends the verifier in the clear. expo-crypto's `digest` is the same
 *    SHA-256, natively.
 *
 * Only the missing pieces are filled in; anything the runtime already has is
 * left alone.
 */

import "react-native-url-polyfill/auto";
import * as ExpoCrypto from "expo-crypto";

type MutableCrypto = {
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
  subtle?: { digest?: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer> };
};

const g = globalThis as unknown as { crypto?: MutableCrypto };
if (!g.crypto) g.crypto = {};
const c = g.crypto;

if (typeof c.getRandomValues !== "function") {
  c.getRandomValues = (<T extends ArrayBufferView | null>(array: T): T => {
    if (array) {
      ExpoCrypto.getRandomValues(
        array as unknown as Parameters<typeof ExpoCrypto.getRandomValues>[0]
      );
    }
    return array;
  }) as MutableCrypto["getRandomValues"];
}

if (!c.subtle) c.subtle = {};
if (typeof c.subtle.digest !== "function") {
  c.subtle.digest = async (algorithm: string, data: BufferSource) => {
    const name = String(algorithm).toUpperCase().replace("-", "");
    if (name !== "SHA256") {
      throw new Error(`crypto.subtle.digest polyfill supports SHA-256 only, got ${algorithm}`);
    }
    return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
  };
}
