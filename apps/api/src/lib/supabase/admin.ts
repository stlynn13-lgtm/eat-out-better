/**
 * The API's Supabase client, holding the SECRET key.
 *
 * Server-only. The secret key bypasses row-level security, which is exactly
 * why it lives here and never in the app (the app only has the publishable
 * key). Used by account deletion and by the durable rate limits / spend cap.
 *
 * Returns null when SUPABASE_URL / SUPABASE_SECRET_KEY aren't set, so every
 * caller can degrade instead of crashing a deploy that predates the setup.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  client =
    url && secretKey
      ? createClient(url, secretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return client;
}
