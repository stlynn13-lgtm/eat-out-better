-- Launch waitlist for the marketing site (apps/web).
--
-- The site has no secret key and doesn't need one: it calls join_waitlist()
-- with the publishable key, the same key the app already ships. The table
-- itself is closed to the app's roles (RLS on, no policies, grants revoked),
-- so the publishable key can add an address but can never read the list back.
-- Only the dashboard / secret key can export it.
--
-- Abuse ceiling: anyone can call the function directly, bypassing the site.
-- A global cap of 300 new rows per 10 minutes bounds how fast junk can pile up
-- without needing per-IP state (PostgREST doesn't see the caller's real IP).

create table public.waitlist (
  email       text        primary key,
  source      text        not null default 'web',
  created_at  timestamptz not null default now()
);

comment on table public.waitlist is
  'Launch waitlist from eatoutbetter.com. Written only via join_waitlist(); readable only with the secret key.';

create index waitlist_created_at_idx on public.waitlist (created_at);

alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;

-- Returns 'ok' (added, or already on the list — never says which, so the
-- endpoint can't be used to test whether an address signed up), 'invalid',
-- or 'busy' (global rate cap hit).
create or replace function public.join_waitlist(p_email text, p_source text default 'web')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_source text := lower(left(coalesce(nullif(btrim(p_source), ''), 'web'), 40));
begin
  if length(v_email) > 254
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    return 'invalid';
  end if;

  if v_source !~ '^[a-z0-9_-]+$' then
    v_source := 'web';
  end if;

  if (select count(*) from public.waitlist
      where created_at > now() - interval '10 minutes') >= 300 then
    return 'busy';
  end if;

  insert into public.waitlist (email, source)
  values (v_email, v_source)
  on conflict (email) do nothing;

  return 'ok';
end;
$$;

revoke all on function public.join_waitlist(text, text) from public;
grant execute on function public.join_waitlist(text, text) to anon, authenticated;
