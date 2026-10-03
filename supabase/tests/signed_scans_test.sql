-- pgTAP tests for signed scans (supabase/migrations/20261003000000_signed_scans.sql).
--
-- The property under test: the app's role can only store a scan whose id was
-- signed by the API, and can never obtain a signature itself.
--
-- Run: supabase db start && supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email, is_anonymous) values
  ('44444444-4444-4444-4444-444444444444', null, true);

create function pg_temp.act_as(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', true)::text,
    true
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- As the API (service role): it can sign.
-- ---------------------------------------------------------------------------

set local role service_role;

-- 1
select matches(
  public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000001'),
  '^[0-9a-f]{64}$',
  'the service role gets a 64-hex-char HMAC-SHA256 signature'
);

-- 2
select is(
  public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000001'),
  public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000001'),
  'signing is deterministic for the same id'
);

-- 3
select isnt(
  public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000001'),
  public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000002'),
  'different ids get different signatures'
);

-- Capture two signatures for the user-level tests below.
create temp table sigs on commit drop as
select 'bbbbbbbb-0000-0000-0000-000000000001'::uuid as id,
       public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000001') as sig
union all
select 'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
       public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000002');

reset role;
grant select on sigs to authenticated;

-- ---------------------------------------------------------------------------
-- As an anonymous app user: can store signed scans, nothing else.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('44444444-4444-4444-4444-444444444444');

-- 4
select lives_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     select id, '44444444-4444-4444-4444-444444444444', now(),
            jsonb_build_object('dishes', '[]'::jsonb, 'scanSig', sig)
     from sigs where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'a scan carrying the API''s signature for its id is stored'
);

-- 5
select throws_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     values ('bbbbbbbb-0000-0000-0000-000000000003',
             '44444444-4444-4444-4444-444444444444',
             now(), '{"dishes": []}') $$,
  '42501', null,
  'a scan with no signature is refused'
);

-- 6
select throws_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     select 'bbbbbbbb-0000-0000-0000-000000000003',
            '44444444-4444-4444-4444-444444444444', now(),
            jsonb_build_object('dishes', '[]'::jsonb, 'scanSig', sig)
     from sigs where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  '42501', null,
  'a real signature copied onto a different id is refused'
);

-- 7
select throws_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     values ('bbbbbbbb-0000-0000-0000-000000000003',
             '44444444-4444-4444-4444-444444444444', now(),
             jsonb_build_object('dishes', '[]'::jsonb, 'scanSig', repeat('0', 64))) $$,
  '42501', null,
  'a made-up signature is refused'
);

-- 8
select lives_ok(
  $$ insert into public.menu_sessions (id, user_id, created_at, payload)
     select id, '44444444-4444-4444-4444-444444444444', now(),
            jsonb_build_object('dishes', '[]'::jsonb, 'scanSig', sig)
     from sigs where id = 'bbbbbbbb-0000-0000-0000-000000000001'
     on conflict (user_id, id) do nothing $$,
  'the app''s re-upload (upsert, ignoreDuplicates) of a signed scan still works'
);

-- 9
select throws_ok(
  $$ select public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000009') $$,
  '42501', null,
  'the app''s role cannot ask for a signature'
);

-- 10
select throws_ok(
  $$ select private.scan_signature('bbbbbbbb-0000-0000-0000-000000000009') $$,
  '42501', null,
  'the app''s role cannot call the signing function directly'
);

-- 11
select throws_ok(
  $$ select secret from private.scan_signing_key $$,
  '42501', null,
  'the app''s role cannot read the signing key'
);

-- ---------------------------------------------------------------------------
-- Signed-out callers (anon role, no JWT).
-- ---------------------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

-- 12
select throws_ok(
  $$ select public.api_sign_scan('bbbbbbbb-0000-0000-0000-000000000009') $$,
  '42501', null,
  'the anon role cannot ask for a signature'
);

reset role;

select * from finish();
rollback;
