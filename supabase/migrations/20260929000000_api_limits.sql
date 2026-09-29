-- Durable counters for /api/analyze: the $200/day spend cap and the per-IP
-- limits (apps/api/src/lib/utils/rateLimit.ts).
--
-- These used to be planned for Upstash Redis. They live here instead so the
-- project runs on one vendor: the API already holds the Supabase secret key
-- for account deletion, and a scan takes 10+ seconds, so one database round
-- trip per scan costs nothing a user can feel.
--
-- ONLY the API touches these, with the secret key. RLS is on with no policies
-- and every grant to the app's roles is revoked, so the publishable key in the
-- app can neither read nor move a counter.
--
-- IP addresses are stored hashed (salted SHA-256, done in the API), never raw,
-- and every per-IP row expires within about a day.

create table public.api_usage_daily (
  day              date primary key,
  requests         integer not null default 0,
  spend_micro_usd  bigint  not null default 0
);

comment on table public.api_usage_daily is
  'One row per UTC day: scans admitted and dollars spent (micro-USD). Written only by /api/analyze.';

create table public.api_ip_counters (
  ip_hash     text        not null,
  bucket      text        not null,   -- 'burst:<10-minute window>' or 'day:<UTC date>'
  count       integer     not null default 0,
  expires_at  timestamptz not null,
  primary key (ip_hash, bucket)
);

create index api_ip_counters_expires_idx on public.api_ip_counters (expires_at);

alter table public.api_usage_daily enable row level security;
alter table public.api_ip_counters enable row level security;
revoke all on public.api_usage_daily, public.api_ip_counters from anon, authenticated;

-- ---------------------------------------------------------------------------
-- api_admit_request: one call per scan, before any Claude call.
--
-- Checks and counts, cheapest and most specific first, so a client in a tight
-- loop is refused on the burst limit without ever touching the daily counters
-- (a blocked caller can't burn down the global budget by being blocked).
--
-- Returns 'ok', 'burst', 'ip_daily', 'spend' (today's dollars are at the cap)
-- or 'backstop' (request-count ceiling — means spend recording is broken).
-- ---------------------------------------------------------------------------

create or replace function public.api_admit_request(
  p_ip_hash          text,
  p_burst_max        integer,
  p_ip_daily_max     integer,
  p_budget_micro_usd bigint,
  p_global_max       integer
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_now    timestamptz := now();
  v_day    date := (v_now at time zone 'utc')::date;
  v_window bigint := floor(extract(epoch from v_now) / 600);
  v_count  integer;
  v_spend  bigint;
begin
  -- Housekeeping: per-IP rows are only useful for a day. Indexed, and at this
  -- scale the delete touches a handful of rows.
  delete from public.api_ip_counters where expires_at < v_now;

  -- Refuse before counting once the day's money is spent.
  select spend_micro_usd into v_spend from public.api_usage_daily where day = v_day;
  if coalesce(v_spend, 0) >= p_budget_micro_usd then
    return 'spend';
  end if;

  insert into public.api_ip_counters as c (ip_hash, bucket, count, expires_at)
  values (p_ip_hash, 'burst:' || v_window, 1, v_now + interval '20 minutes')
  on conflict (ip_hash, bucket) do update set count = c.count + 1
  returning c.count into v_count;
  if v_count > p_burst_max then
    return 'burst';
  end if;

  insert into public.api_ip_counters as c (ip_hash, bucket, count, expires_at)
  values (p_ip_hash, 'day:' || v_day, 1, v_now + interval '26 hours')
  on conflict (ip_hash, bucket) do update set count = c.count + 1
  returning c.count into v_count;
  if v_count > p_ip_daily_max then
    return 'ip_daily';
  end if;

  insert into public.api_usage_daily as u (day, requests)
  values (v_day, 1)
  on conflict (day) do update set requests = u.requests + 1
  returning u.requests into v_count;
  if v_count > p_global_max then
    return 'backstop';
  end if;

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- api_record_spend: after every Claude call, add what it actually cost.
-- ---------------------------------------------------------------------------

create or replace function public.api_record_spend(p_micro_usd bigint)
returns void
language sql
set search_path = ''
as $$
  insert into public.api_usage_daily as u (day, spend_micro_usd)
  values ((now() at time zone 'utc')::date, greatest(p_micro_usd, 0))
  on conflict (day) do update
    set spend_micro_usd = u.spend_micro_usd + greatest(p_micro_usd, 0);
$$;

-- Functions in `public` are executable by everyone unless revoked — and
-- PostgREST would expose them to the app's publishable key. Service role only.
revoke all on function public.api_admit_request(text, integer, integer, bigint, integer)
  from public, anon, authenticated;
revoke all on function public.api_record_spend(bigint)
  from public, anon, authenticated;
grant execute on function public.api_admit_request(text, integer, integer, bigint, integer)
  to service_role;
grant execute on function public.api_record_spend(bigint) to service_role;
