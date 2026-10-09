// Emails Sean when someone joins the launch waitlist.
//
// Called by the waitlist_notify trigger (supabase/migrations/20261009000000_waitlist_notify.sql)
// on every insert. The request body is ignored on purpose: the function reads
// un-notified rows from the table itself and marks them sent. So anyone who
// finds this public URL can only cause emails about real signups that were
// about to be sent anyway, and a retried call never sends twice.
//
// Secrets: RESEND_API_KEY (Edge Function secret). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

const NOTIFY_TO = "eatoutbetter@gmail.com";
const FROM = "Eat Out Better <no-reply@eatoutbetter.com>";

type Row = { email: string; source: string; created_at: string };

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!url || !serviceKey || !resendKey) {
    console.error("notify-waitlist: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY");
    return new Response("not configured", { status: 500 });
  }
  const db = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

  // Claim pending rows atomically so overlapping calls can't double-send.
  const claim = await fetch(`${url}/rest/v1/rpc/claim_waitlist_notifications`, {
    method: "POST",
    headers: db,
    body: "{}",
  });
  if (!claim.ok) {
    console.error("notify-waitlist: claim failed", claim.status, await claim.text());
    return new Response("claim failed", { status: 500 });
  }
  const rows = (await claim.json()) as Row[];
  if (rows.length === 0) return new Response("nothing to send");

  const total = await fetch(`${url}/rest/v1/waitlist?select=email`, {
    method: "HEAD",
    headers: { ...db, Prefer: "count=exact" },
  });
  const count = total.headers.get("content-range")?.split("/")[1] ?? "?";

  const lines = rows.map((r) => `${r.email}  (button: ${r.source}, ${r.created_at})`).join("\n");
  const subject = rows.length === 1
    ? `New waitlist signup: ${rows[0].email}`
    : `${rows.length} new waitlist signups`;

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [NOTIFY_TO],
      subject,
      text: `${lines}\n\nWaitlist total: ${count}\n`,
    }),
  });
  if (!sent.ok) {
    // Hand the rows back so the next signup's call retries them.
    console.error("notify-waitlist: resend failed", sent.status, await sent.text());
    await fetch(`${url}/rest/v1/rpc/release_waitlist_notifications`, {
      method: "POST",
      headers: db,
      body: JSON.stringify({ p_emails: rows.map((r) => r.email) }),
    });
    return new Response("send failed", { status: 502 });
  }
  return new Response(`sent ${rows.length}`);
});
