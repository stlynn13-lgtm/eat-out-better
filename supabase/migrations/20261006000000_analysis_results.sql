-- Hand a finished scan to the app's retry instead of paying for it twice.
--
-- When the user leaves the app mid-analysis, iOS cuts the phone's connection
-- but /api/analyze keeps working and finishes. Before this migration that
-- result was thrown away, and the app's automatic retry re-uploaded every
-- photo and paid for the whole analysis again.
--
-- Now the app sends one id per scan (`x-request-id`) on every attempt, and the
-- API claims it here before doing any work:
--
--   claimed  → this request runs the pipeline, then stores the final response
--              (api_finish_analysis) or, on a transient failure, gives the
--              claim back (api_release_analysis) so a retry recomputes.
--   pending  → another request with this id is still working; the API polls
--              until it finishes.
--   done     → the stored response, returned as-is. Costs nothing, so it skips
--              the rate limits and the spend cap.
--
-- A pending claim older than 75 seconds is taken over: /api/analyze is killed
-- at 60, so its owner is gone. Each claim carries a random token, and only the
-- current holder can finish or release it, so a request that was taken over
-- can't overwrite the one that replaced it.
--
-- Privacy: a row holds the request id, the response and timestamps. No IP, no
-- user id, and no health condition (the API strips `healthCondition` before
-- storing and re-attaches it from the request). Rows are deleted 15 minutes
-- after they were last written. Photos are never stored.
--
-- Service role only, like the rate-limit functions.

create table public.api_analysis_results (
  request_id   uuid        primary key,
  claim_token  uuid        not null,
  status       text        not null default 'pending' check (status in ('pending', 'done')),
  http_status  integer,
  response     jsonb,
  claimed_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '15 minutes',
  check ((status = 'done') = (response is not null and http_status is not null))
);

comment on table public.api_analysis_results is
  'Short-lived /api/analyze results keyed by the app''s per-scan request id, so a retry collects the finished result instead of re-running the scan. Written only by /api/analyze.';

create index api_analysis_results_expires_idx on public.api_analysis_results (expires_at);

alter table public.api_analysis_results enable row level security;
revoke all on public.api_analysis_results from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Claim.
-- ---------------------------------------------------------------------------

create or replace function public.api_claim_analysis(p_request_id uuid, p_claim_token uuid)
returns table (state text, http_status integer, response jsonb)
language plpgsql
set search_path = ''
as $$
declare
  v_row public.api_analysis_results%rowtype;
begin
  -- Housekeeping. Indexed, and at this scale a handful of rows.
  delete from public.api_analysis_results r where r.expires_at < now();

  insert into public.api_analysis_results (request_id, claim_token)
  values (p_request_id, p_claim_token)
  on conflict (request_id) do nothing;
  if found then
    return query select 'claimed'::text, null::integer, null::jsonb;
    return;
  end if;

  select * into v_row
  from public.api_analysis_results r
  where r.request_id = p_request_id
  for update;

  if v_row.status = 'done' then
    return query select 'done'::text, v_row.http_status, v_row.response;
    return;
  end if;

  if v_row.claimed_at < now() - interval '75 seconds' then
    update public.api_analysis_results r
    set claim_token = p_claim_token,
        claimed_at  = now(),
        expires_at  = now() + interval '15 minutes'
    where r.request_id = p_request_id;
    return query select 'claimed'::text, null::integer, null::jsonb;
    return;
  end if;

  return query select 'pending'::text, null::integer, null::jsonb;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finish (store the final response) or release (let a retry recompute).
-- Both are no-ops unless the caller still holds the claim.
-- ---------------------------------------------------------------------------

create or replace function public.api_finish_analysis(
  p_request_id  uuid,
  p_claim_token uuid,
  p_http_status integer,
  p_response    jsonb
)
returns void
language sql
set search_path = ''
as $$
  update public.api_analysis_results r
  set status      = 'done',
      http_status = p_http_status,
      response    = p_response,
      expires_at  = now() + interval '15 minutes'
  where r.request_id = p_request_id
    and r.claim_token = p_claim_token
    and r.status = 'pending';
$$;

create or replace function public.api_release_analysis(p_request_id uuid, p_claim_token uuid)
returns void
language sql
set search_path = ''
as $$
  delete from public.api_analysis_results r
  where r.request_id = p_request_id
    and r.claim_token = p_claim_token
    and r.status = 'pending';
$$;

revoke all on function public.api_claim_analysis(uuid, uuid) from public, anon, authenticated;
revoke all on function public.api_finish_analysis(uuid, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.api_release_analysis(uuid, uuid) from public, anon, authenticated;
grant execute on function public.api_claim_analysis(uuid, uuid) to service_role;
grant execute on function public.api_finish_analysis(uuid, uuid, integer, jsonb) to service_role;
grant execute on function public.api_release_analysis(uuid, uuid) to service_role;
