-- pgTAP tests for public.menu_sessions (auth-plan.md §5 step 5).
--
-- Run locally:  supabase db start && supabase test db
-- Runs in CI:   .github/workflows/supabase-db-tests.yml on every PR touching supabase/
--
-- These are the tests that turn "test it as two real users" from a chore
-- nobody does into a command. If one fails, a user can read, rewrite or keep
-- someone else's history — do not merge around it.

begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- ---------------------------------------------------------------------------
-- Fixtures: two permanent users and one anonymous user.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com', false),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com', false),
  ('33333333-3333-3333-3333-333333333333', null, true);

-- Rows the app inserts must carry a valid scanSig (20261003000000_signed_scans).
-- Security definer so the signature is computed as the test's superuser, the
-- way /api/analyze gets one from api_sign_scan, before acting as a user.
create function pg_temp.signed(p_id uuid, p_payload jsonb default '{"dishes": []}')
returns jsonb language sql security definer as $$
  select p_payload || jsonb_build_object('scanSig', private.scan_signature(p_id));
$$;

create function pg_temp.act_as(uid uuid, anonymous boolean default false)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', anonymous)::text,
    true
  );
end;
$$;

-- 1
select ok(
  (select relrowsecurity from pg_class where oid = 'public.menu_sessions'::regclass),
  'RLS is enabled on menu_sessions'
);

-- ---------------------------------------------------------------------------
-- User A writes their own row.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- 2
select lives_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     values ('aaaaaaaa-0000-0000-0000-000000000001',
             '11111111-1111-1111-1111-111111111111',
             now(), pg_temp.signed('aaaaaaaa-0000-0000-0000-000000000001')) $$,
  'a user can insert their own scan'
);

-- 3
select lives_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     values ('aaaaaaaa-0000-0000-0000-000000000001',
             '11111111-1111-1111-1111-111111111111',
             now(), pg_temp.signed('aaaaaaaa-0000-0000-0000-000000000001'))
     on conflict (user_id, id) do nothing $$,
  're-uploading the same scan (upsert, ignoreDuplicates) does not raise'
);

-- 4
select is(
  (select count(*) from public.menu_sessions),
  1::bigint,
  'the re-upload did not create a second row'
);

-- 5
select throws_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     values ('aaaaaaaa-0000-0000-0000-000000000002',
             '22222222-2222-2222-2222-222222222222',
             now(), pg_temp.signed('aaaaaaaa-0000-0000-0000-000000000002')) $$,
  '42501', null,
  'a user cannot insert a scan into someone else''s history'
);

-- 6
select throws_ok(
  $$ update public.menu_sessions set payload = '{"dishes": ["rewritten"]}'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null,
  'history cannot be rewritten: authenticated has no UPDATE grant'
);

-- 7
select throws_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     values ('aaaaaaaa-0000-0000-0000-000000000003',
             '11111111-1111-1111-1111-111111111111',
             now(), pg_temp.signed('aaaaaaaa-0000-0000-0000-000000000003',
                                   '{"healthCondition": "high_cholesterol", "dishes": []}')) $$,
  '23514', null,
  'a payload still carrying healthCondition is refused'
);

-- ---------------------------------------------------------------------------
-- User B cannot see or touch A's row.
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');

-- 8
select is(
  (select count(*) from public.menu_sessions),
  0::bigint,
  'another user sees none of A''s scans'
);

delete from public.menu_sessions where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- Anonymous users get the same own-rows treatment.
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.act_as('33333333-3333-3333-3333-333333333333', true);

-- 9
select lives_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     values ('aaaaaaaa-0000-0000-0000-000000000001',
             '33333333-3333-3333-3333-333333333333',
             now(), pg_temp.signed('aaaaaaaa-0000-0000-0000-000000000001')) $$,
  'an anonymous user can save their own scan, even one whose id another account also holds'
);

-- 10
select is(
  (select count(*) from public.menu_sessions),
  1::bigint,
  'an anonymous user sees only their own scan'
);

-- ---------------------------------------------------------------------------
-- Signed-out callers (the anon role, no JWT) get nothing at all.
-- ---------------------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

-- 11
select throws_ok(
  $$ select count(*) from public.menu_sessions $$,
  '42501', null,
  'the anon role cannot read menu_sessions'
);

-- ---------------------------------------------------------------------------
-- Back to superuser for the structural checks.
-- ---------------------------------------------------------------------------

reset role;

-- 12
select is(
  (select count(*) from public.menu_sessions
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
     and user_id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'B''s delete of A''s row did nothing — A''s scan survived'
);

-- Keep-newest-500: give A 505 scans with ascending timestamps.
insert into public.menu_sessions (id, user_id, created_at, payload)
select gen_random_uuid(),
       '11111111-1111-1111-1111-111111111111',
       timestamptz '2026-01-01' + (n || ' minutes')::interval,
       '{"dishes": []}'
from generate_series(1, 505) as n;

-- 13
select is(
  (select count(*) from public.menu_sessions
   where user_id = '11111111-1111-1111-1111-111111111111'),
  500::bigint,
  'a user''s history is capped at their newest 500 scans'
);

-- 14
select is(
  (select min(created_at) from public.menu_sessions
   where user_id = '11111111-1111-1111-1111-111111111111'),
  -- A also holds the scan from test 2 (created now()), so the newest 500 are
  -- that one plus Jan minutes 7..505.
  timestamptz '2026-01-01' + interval '7 minutes',
  'the cap dropped the oldest scans, not the newest'
);

-- Account deletion is `delete from auth.users` (via auth.admin.deleteUser).
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

-- 15
select is(
  (select count(*) from public.menu_sessions
   where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'deleting the account deletes its scans (cascade), without raising'
);

select * from finish();
rollback;
