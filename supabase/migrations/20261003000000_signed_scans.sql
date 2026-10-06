-- Saved scans must come from a real scan.
--
-- The app writes `menu_sessions` directly with the user's JWT, and every
-- install gets a free anonymous account. Before this migration, nothing tied a
-- row to an actual /api/analyze call, so the only bound on what a script could
-- store was "accounts it can create × 500 rows × 256 KB". The API's rate limits
-- and spend cap — the things that make a scan cost something — never applied.
-- And because those limits keep their counters in this same database, filling
-- it to its disk quota would also switch them off (rateLimit.ts fails open on a
-- database error).
--
-- Now:
--
--   1. The API asks the database to sign each scan id it mints
--      (`api_sign_scan`, service role only) and returns the signature with the
--      scan as `scanSig`. The app stores the API's response whole and uploads
--      it whole, so `scanSig` reaches the payload from every build that has
--      accounts — no app update needed for new scans.
--   2. INSERT is allowed only when `payload.scanSig` is a valid HMAC of the
--      row's id. Storing a row therefore costs one admitted, rate-limited,
--      spend-capped scan. One signature can be reused across accounts, but
--      only as one row per account — the cost per stored row stays a real scan.
--
-- The key is generated here, inside the database, and never leaves it: there
-- is no environment variable to set and nothing to copy between services. It
-- lives in a `private` schema that PostgREST does not expose, readable only by
-- the security-definer functions below.
--
-- Existing rows are signed in place, so a scan already in an account can still
-- be re-uploaded (e.g. into another account on sign-in). Scans that exist only
-- on a phone and were never uploaded have no signature and stay on that phone
-- — the app skips them rather than letting one bad row block a whole upload.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The signing key: exactly one row, 32 random bytes, generated per database.
-- ---------------------------------------------------------------------------

create table private.scan_signing_key (
  singleton boolean primary key default true check (singleton),
  secret    bytea   not null default extensions.gen_random_bytes(32)
);

insert into private.scan_signing_key default values;

revoke all on private.scan_signing_key from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Signing and checking.
-- ---------------------------------------------------------------------------

create or replace function private.scan_signature(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(extensions.hmac(convert_to(p_id::text, 'UTF8'), k.secret, 'sha256'), 'hex')
  from private.scan_signing_key k;
$$;

revoke all on function private.scan_signature(uuid) from public, anon, authenticated;

-- The only function the app's role may call, and only from the RLS check: it
-- answers yes/no and never reveals a signature.
create or replace function private.scan_signature_valid(p_id uuid, p_sig text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_sig is not null and p_sig = private.scan_signature(p_id);
$$;

revoke all on function private.scan_signature_valid(uuid, text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.scan_signature_valid(uuid, text) to authenticated;

-- For /api/analyze. In `public` so PostgREST can reach it as an RPC; executable
-- by the service role only, like api_admit_request.
create or replace function public.api_sign_scan(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.scan_signature(p_id);
$$;

revoke all on function public.api_sign_scan(uuid) from public, anon, authenticated;
grant execute on function public.api_sign_scan(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Sign what's already stored, then require signatures on every new row.
-- ---------------------------------------------------------------------------

update public.menu_sessions
set payload = payload || jsonb_build_object('scanSig', private.scan_signature(id))
where not (payload ? 'scanSig');

drop policy "menu_sessions: insert own" on public.menu_sessions;

create policy "menu_sessions: insert own signed scans"
  on public.menu_sessions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and private.scan_signature_valid(id, payload ->> 'scanSig')
  );
