"use server";

export type WaitlistState = { status: "idle" | "ok" | "invalid" | "busy" | "error"; email?: string };

/**
 * Server Action, so the form works before (or without) JavaScript.
 *
 * Calls join_waitlist() with the publishable key. The function, not this code,
 * is the security boundary: it validates, de-duplicates and rate-caps, and the
 * key can't read the list back (supabase/migrations/20261006000000_waitlist.sql).
 */
export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  // Honeypot: hidden from people, filled in by naive bots. Pretend success.
  if (String(form.get("company") ?? "").trim()) return { status: "ok" };

  const email = String(form.get("email") ?? "").trim();
  const source = String(form.get("source") ?? "web").slice(0, 40);
  if (!email || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return { status: "invalid", email };
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error("waitlist: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY not set");
    return { status: "error", email };
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/join_waitlist`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_email: email, p_source: source }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("waitlist: rpc failed", res.status, await res.text());
      return { status: "error", email };
    }
    const result = (await res.json()) as string;
    if (result === "ok" || result === "invalid" || result === "busy") return { status: result, email };
    return { status: "error", email };
  } catch (err) {
    console.error("waitlist: rpc threw", err);
    return { status: "error", email };
  }
}
