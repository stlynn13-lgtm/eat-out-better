-- pgTAP tests for the launch waitlist
-- (supabase/migrations/20261006000000_waitlist.sql).
--
-- Run: supabase db start && supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- ---------------------------------------------------------------------------
-- As the marketing site (publishable key = anon role).
-- ---------------------------------------------------------------------------

set local role anon;

select is(public.join_waitlist('  Sean@Example.com ', 'hero'), 'ok', 'a valid address is accepted');
select is(public.join_waitlist('sean@example.com', 'final'), 'ok',
  'a repeat address also says ok, so the endpoint does not reveal who signed up');
select is(public.join_waitlist('not-an-email', 'hero'), 'invalid', 'a malformed address is refused');
select is(public.join_waitlist(repeat('a', 250) || '@x.com', 'hero'), 'invalid',
  'an address over 254 characters is refused');

select throws_ok(
  'select * from public.waitlist',
  '42501',
  null,
  'the publishable key cannot read the list'
);

-- ---------------------------------------------------------------------------
-- As the dashboard (service role).
-- ---------------------------------------------------------------------------

reset role;
set local role service_role;

select is((select count(*)::int from public.waitlist), 1, 'the repeat did not create a second row');
select is((select email from public.waitlist), 'sean@example.com', 'addresses are stored trimmed and lower-cased');
select is((select source from public.waitlist), 'hero', 'the first signup''s source is kept');

select * from finish();

rollback;
