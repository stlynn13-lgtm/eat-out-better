-- pgTAP tests for the scan result handoff
-- (supabase/migrations/20261006000000_analysis_results.sql).
--
-- The properties under test: one request id is worked on by one request at a
-- time, a finished result is handed back as-is, only the claim holder can
-- finish or release it, a dead owner's claim is taken over, and the app's
-- roles can't touch any of it.
--
-- Run: supabase db start && supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

set local role service_role;

-- 1
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001')),
  'claimed',
  'the first request with an id claims it'
);

-- 2
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002')),
  'pending',
  'a retry while the first is still working is told to wait'
);

-- 3: a stranger's finish is ignored
select public.api_finish_analysis(
  'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002',
  200, '{"success": true, "data": {"id": "wrong"}}'::jsonb);
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003')),
  'pending',
  'only the claim holder can finish'
);

-- 4-6: the holder finishes, and a retry gets exactly that response
select public.api_finish_analysis(
  'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  200, '{"success": true, "data": {"id": "right"}}'::jsonb);
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004')),
  'done',
  'after the holder finishes, a retry is handed the result'
);
select is(
  (select http_status from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004')),
  200,
  'with the stored HTTP status'
);
select is(
  (select response -> 'data' ->> 'id' from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004')),
  'right',
  'and the stored response'
);

-- 7: finishing twice can't overwrite
select public.api_finish_analysis(
  'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
  500, '{"success": false}'::jsonb);
select is(
  (select http_status from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000005')),
  200,
  'a finished result is never overwritten'
);

-- 8-9: release lets a retry recompute; a stranger's release is ignored
select public.api_claim_analysis(
  'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000010');
select public.api_release_analysis(
  'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000099');
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000011')),
  'pending',
  'only the claim holder can release'
);
select public.api_release_analysis(
  'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000010');
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000011')),
  'claimed',
  'after a release, the retry claims and recomputes'
);

-- 10-11: a dead owner's claim is taken over, and the dead owner can't finish
select public.api_claim_analysis(
  'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000020');
update public.api_analysis_results
set claimed_at = now() - interval '76 seconds'
where request_id = 'cccccccc-0000-0000-0000-000000000003';
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000021')),
  'claimed',
  'a claim older than 75 seconds is taken over'
);
select public.api_finish_analysis(
  'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000020',
  200, '{"success": true}'::jsonb);
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000022')),
  'pending',
  'the replaced owner can no longer finish'
);

-- 12: expired rows are cleared and the id starts over
update public.api_analysis_results
set expires_at = now() - interval '1 second'
where request_id = 'cccccccc-0000-0000-0000-000000000001';
select is(
  (select state from public.api_claim_analysis(
    'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000030')),
  'claimed',
  'an expired result is deleted, not handed out'
);

-- 13: a done row must carry a response
select throws_ok(
  $$ update public.api_analysis_results set status = 'done'
     where request_id = 'cccccccc-0000-0000-0000-000000000002' $$,
  '23514',
  null,
  'a row cannot be marked done without a response'
);

-- 14-16: the app's roles can't reach any of it
reset role;
set local role authenticated;

select throws_ok(
  $$ select * from public.api_analysis_results $$,
  '42501',
  null,
  'the app''s signed-in role cannot read stored results'
);
select throws_ok(
  $$ select * from public.api_claim_analysis(
       'cccccccc-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000009') $$,
  '42501',
  null,
  'the app''s signed-in role cannot claim'
);

reset role;
set local role anon;

select throws_ok(
  $$ select * from public.api_analysis_results $$,
  '42501',
  null,
  'the anonymous role cannot read stored results'
);

select * from finish();

rollback;
