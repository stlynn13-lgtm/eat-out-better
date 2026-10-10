-- Waitlist: one list, no per-signup emails.
--
-- Replaces 20261009000000_waitlist_notify.sql. Sean reads the list in one
-- place (Supabase → Table Editor → waitlist_signups, or export CSV) instead of
-- an email per signup. Removing the email path also means signup addresses no
-- longer pass through Resend or sit in a Gmail inbox: the waitlist table is
-- the only copy.

drop trigger if exists waitlist_notify on public.waitlist;
drop function if exists public.waitlist_notify();
drop function if exists public.claim_waitlist_notifications();
drop function if exists public.release_waitlist_notifications(text[]);
alter table public.waitlist drop column if exists notified_at;

-- Newest first, with a running position, for reading at a glance.
-- security_invoker: the view has the caller's rights, so the app's roles
-- (anon/authenticated) still can't read the list through it.
create or replace view public.waitlist_signups
with (security_invoker = true) as
select
  row_number() over (order by created_at) as signup_number,
  email,
  source as signed_up_from,
  created_at as signed_up_at
from public.waitlist
order by created_at desc;

comment on view public.waitlist_signups is
  'Read-only view of the launch waitlist, newest first. Dashboard / secret key only.';

revoke all on public.waitlist_signups from anon, authenticated;
