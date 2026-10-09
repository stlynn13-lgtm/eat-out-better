-- Email Sean on each waitlist signup (supabase/functions/notify-waitlist).
--
-- An AFTER INSERT trigger pings the edge function through pg_net (async, so a
-- slow or failed email never slows or fails the signup). The function ignores
-- the request body and claims rows with notified_at still null, so the public
-- function URL can't be used to send anything but real, not-yet-sent signups.

create extension if not exists pg_net with schema extensions;

alter table public.waitlist add column notified_at timestamptz;

-- Rows from before this migration count as already seen.
update public.waitlist set notified_at = now() where notified_at is null;

create or replace function public.claim_waitlist_notifications()
returns table (email text, source text, created_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  update public.waitlist w
     set notified_at = now()
   where w.email in (
     select w2.email from public.waitlist w2
      where w2.notified_at is null
      order by w2.created_at
      limit 50
      for update skip locked)
  returning w.email, w.source, w.created_at;
$$;

create or replace function public.release_waitlist_notifications(p_emails text[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.waitlist set notified_at = null where email = any(p_emails);
$$;

-- Only the edge function (service role) may call these.
revoke all on function public.claim_waitlist_notifications() from public, anon, authenticated;
revoke all on function public.release_waitlist_notifications(text[]) from public, anon, authenticated;
grant execute on function public.claim_waitlist_notifications() to service_role;
grant execute on function public.release_waitlist_notifications(text[]) to service_role;

create or replace function public.waitlist_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://dindkgcknjexggqqgoll.supabase.co/functions/v1/notify-waitlist',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return null;
end;
$$;

create trigger waitlist_notify
  after insert on public.waitlist
  for each statement
  execute function public.waitlist_notify();
