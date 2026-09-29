-- Saved scans, one row per scan, owned by one user.
--
-- Design notes (auth-plan.md §5 step 4, §12.2, §12.3) — read before changing:
--
-- * ONE table with a jsonb payload, not a normalised sessions/dishes pair. The
--   payload is the app's MenuSession minus `healthCondition` (the client's
--   toServerPayload() strips it — see lib/sync/sessions.ts). A normalised
--   schema had no home for rawDishes / unreadableItems / unrankedItems.
--
-- * `id` has NO default. It is the UUID the API minted for the scan and the app
--   already stores; every upload is `upsert ... on conflict (user_id, id) do
--   nothing`, which is what makes a retry, a backfill and a cross-device merge
--   idempotent. A gen_random_uuid() default would silently break all three.
--
-- * ON DELETE CASCADE, deliberately: deleting the auth user is how the
--   mandatory "Delete account" button works (App Store 5.1.1(v)), and it must
--   take the scans with it rather than raise.
--
-- * Anonymous users are real auth.users rows with the `authenticated` role, so
--   the same own-rows policies cover them. Nothing here distinguishes them.
--
-- * The client talks to this table directly with the user's JWT, which skips
--   every protection the API has (app token, rate limiter, spend cap). So the
--   worst case is bounded structurally instead (§12.2): a size cap per row, a
--   per-user cap (newest 500 kept), and NO UPDATE grant — history can be added to or
--   deleted, never rewritten.

create table public.menu_sessions (
  id          uuid not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null,
  uploaded_at timestamptz not null default now(),
  payload     jsonb not null,
  constraint menu_sessions_payload_size check (octet_length(payload::text) < 262144),
  -- Belt and braces for §12.3: the app strips the condition before upload, and
  -- the database refuses a row that still carries one. Health data never
  -- lands here by accident.
  constraint menu_sessions_no_health_condition check (not (payload ? 'healthCondition')),
  -- Keyed per user, not globally. When someone signs into an account that
  -- already exists, the scans they made anonymously on this phone are
  -- re-uploaded under that account with the SAME scan ids. With a global key
  -- those inserts would hit the anonymous copies, "succeed" as do-nothing, and
  -- the scans would silently never reach the account.
  primary key (user_id, id)
);

comment on table public.menu_sessions is
  'Saved scans synced from the app. payload = MenuSession without healthCondition.';

-- The primary key already leads with user_id; this one serves "newest first".
create index menu_sessions_user_created_idx
  on public.menu_sessions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security: own rows only.
-- ---------------------------------------------------------------------------

alter table public.menu_sessions enable row level security;

create policy "menu_sessions: read own"
  on public.menu_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "menu_sessions: insert own"
  on public.menu_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "menu_sessions: delete own"
  on public.menu_sessions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No UPDATE policy AND no UPDATE grant. `upsert(..., { ignoreDuplicates: true })`
-- compiles to INSERT ... ON CONFLICT DO NOTHING, which needs INSERT only.
revoke all on public.menu_sessions from anon, authenticated;
grant select, insert, delete on public.menu_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- Per-user row cap, enforced in the database. A cap in the client is not a
-- cap: the publishable key ships in the app binary.
--
-- It KEEPS THE NEWEST 500 rather than rejecting the 501st. A rejecting cap
-- turns into silent sync failure for exactly the most loyal users (500 scans
-- is 100 days at the 5-a-day limit), and the app would have no way to tell
-- them. Pruning bounds storage just as hard: a flood of inserts churns this
-- user's own oldest rows and nobody else's. 500 is 5x the app's local cap.
-- ---------------------------------------------------------------------------

create or replace function public.menu_sessions_keep_newest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.menu_sessions
  where user_id = new.user_id
    and id in (
      select id
      from public.menu_sessions
      where user_id = new.user_id
      order by created_at desc, id desc
      offset 500
    );
  return null;
end;
$$;

revoke all on function public.menu_sessions_keep_newest() from public, anon, authenticated;

create trigger menu_sessions_keep_newest
  after insert on public.menu_sessions
  for each row execute function public.menu_sessions_keep_newest();
