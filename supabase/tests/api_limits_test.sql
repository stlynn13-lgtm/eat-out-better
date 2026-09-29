-- pgTAP tests for the API's rate limits and spend cap
-- (supabase/migrations/20260929000000_api_limits.sql).
--
-- Run: supabase db start && supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- ---------------------------------------------------------------------------
-- As the API (service role).
-- ---------------------------------------------------------------------------

set local role service_role;

-- Burst: max 2 per window for ipA.
select is(public.api_admit_request('ipA', 2, 100, 1000000, 1000), 'ok', 'first scan admitted');
select is(public.api_admit_request('ipA', 2, 100, 1000000, 1000), 'ok', 'second scan admitted');
select is(public.api_admit_request('ipA', 2, 100, 1000000, 1000), 'burst',
  'third scan inside the window is refused on the burst limit');

-- Per-IP daily: max 1 for ipB.
select is(public.api_admit_request('ipB', 100, 1, 1000000, 1000), 'ok', 'ipB first scan admitted');
select is(public.api_admit_request('ipB', 100, 1, 1000000, 1000), 'ip_daily',
  'ipB second scan is refused on the per-IP daily limit');

-- Spend: record $0.50, then a $0.50 budget is exhausted.
select public.api_record_spend(500000);
select is(public.api_admit_request('ipC', 100, 100, 500000, 1000), 'spend',
  'once today''s spend reaches the budget, scans are refused');

-- Backstop: 3 requests have been admitted and counted so far (ipA x2, ipB x1);
-- refused ones never count. A ceiling of 3 makes the next one trip it.
select is(public.api_admit_request('ipD', 100, 100, 10000000, 3), 'backstop',
  'the request-count backstop trips when exceeded');

select is(
  (select spend_micro_usd from public.api_usage_daily
   where day = (now() at time zone 'utc')::date),
  500000::bigint,
  'recorded spend is summed in micro-dollars'
);

-- ---------------------------------------------------------------------------
-- The app's keys can't see or move any of it.
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;

select throws_ok(
  $$ select * from public.api_usage_daily $$,
  '42501', null,
  'a signed-in app user cannot read the spend table'
);

select throws_ok(
  $$ select public.api_record_spend(-999999999) $$,
  '42501', null,
  'a signed-in app user cannot call api_record_spend'
);

reset role;
set local role anon;

select throws_ok(
  $$ select public.api_admit_request('x', 1, 1, 1, 1) $$,
  '42501', null,
  'the anon role cannot call api_admit_request'
);

select * from finish();
rollback;
