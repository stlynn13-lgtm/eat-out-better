/**
 * Campaign tags: the label on our own links (`/get?src=rd-smith`, which
 * redirects to `/?ref=rd-smith#waitlist` before launch), so a waitlist signup
 * says which channel sent it, not just which button was pressed.
 *
 * The waitlist row stores both in its one `source` column as
 * `<placement>__<tag>`, e.g. `final__rd-smith`. join_waitlist() only keeps
 * `[a-z0-9_-]` and 40 characters (anything else becomes `web`), so the
 * separator has to be built from those characters; tags are cleaned to never
 * contain `_`, which keeps `__` unambiguous for `split_part(source, '__', 2)`.
 */

/** Same cap as join_waitlist() in supabase/migrations/20261006000000_waitlist.sql. */
const SOURCE_MAX = 40;

/** Lower-case letters, digits and hyphens only. Underscores become hyphens. */
export function cleanCampaign(raw: string | null | undefined): string {
  return (raw ?? "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, SOURCE_MAX);
}

/** The tag from the page URL: `ref` (set by /get) or `src` (a direct link). */
export function campaignFromSearch(search: string): string {
  const q = new URLSearchParams(search);
  return cleanCampaign(q.get("ref") || q.get("src"));
}

/** The value stored in the waitlist row's `source`: placement, plus the tag when there is one. */
export function waitlistSource(placement: string, campaign: string): string {
  const where = placement.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, SOURCE_MAX) || "web";
  const tag = cleanCampaign(campaign);
  return (tag ? `${where}__${tag}` : where).slice(0, SOURCE_MAX);
}
