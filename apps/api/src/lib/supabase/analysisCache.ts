/**
 * Hands a finished scan to the app's retry instead of running it twice.
 *
 * When the user leaves the app mid-analysis, iOS cuts the phone's connection,
 * but this function keeps running and finishes the scan. The app then retries.
 * Without this, the retry re-uploads every photo and pays for the whole
 * analysis again, and the first result is thrown away.
 *
 * The app sends one id per scan as `x-request-id` on every attempt. Before
 * doing any work, the route claims that id in Postgres
 * (supabase/migrations/20261006000000_analysis_results.sql):
 *
 *   run     → this request does the work, then calls `settle` with its
 *             response: a final outcome is stored for the retry, and a
 *             transient failure gives the claim back so a retry recomputes.
 *   replay  → the stored response from the earlier attempt. It cost nothing,
 *             so the route skips the rate limits and the spend cap.
 *   timeout → an earlier attempt is still working and didn't finish within
 *             this invocation's budget. Very rare: it means the first attempt
 *             is taking close to the 60-second limit itself.
 *
 * While an earlier attempt with the same id is still working (the common
 * case: the user comes back after 5 seconds of a 30-second scan), this polls
 * until it finishes rather than starting a second one.
 *
 * Fails open, like the rest of the route's database use: no Supabase env vars,
 * the migration not yet applied, a missing or malformed id, or a slow or
 * failing database all mean "run", exactly as before this existed.
 */

import { randomUUID } from "node:crypto";
import type { AnalyzeResponse } from "@/lib/types";
import { getSupabaseAdmin } from "./admin";

const DB_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 1000;

/**
 * HTTP statuses that are the scan's final answer, so a retry should get them
 * too: a result (200), or "not a menu" / "no dishes" (422) for the same
 * photos. Anything else (Claude errors, rate limits, timeouts) may go away on
 * a retry, so it is not stored.
 */
const FINAL_STATUSES = new Set([200, 422]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AnalysisClaim =
  | {
      kind: "run";
      /** Store a final response for retries, or release the claim. Never throws. */
      settle: (status: number, body: AnalyzeResponse) => Promise<void>;
    }
  | { kind: "replay"; status: number; body: AnalyzeResponse }
  | { kind: "timeout" };

const RUN_UNCACHED: AnalysisClaim = { kind: "run", settle: async () => {} };

type ClaimRow = { state: string; http_status: number | null; response: AnalyzeResponse | null };

/**
 * @param requestId the `x-request-id` header, as sent (may be null)
 * @param waitUntil epoch ms after which a still-pending earlier attempt stops
 *   being waited on
 */
export async function claimAnalysis(
  requestId: string | null,
  waitUntil: number
): Promise<AnalysisClaim> {
  const db = getSupabaseAdmin();
  if (!db || !requestId || !UUID_RE.test(requestId)) return RUN_UNCACHED;

  const claimToken = randomUUID();

  for (;;) {
    let row: ClaimRow | undefined;
    try {
      const { data, error } = await db
        .rpc("api_claim_analysis", { p_request_id: requestId, p_claim_token: claimToken })
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
      if (error) throw error;
      row = (Array.isArray(data) ? data[0] : data) as ClaimRow | undefined;
    } catch (error) {
      console.error("[analysisCache] Claim failed — running uncached:", error);
      return RUN_UNCACHED;
    }

    if (row?.state === "claimed") {
      return { kind: "run", settle: (status, body) => settle(requestId, claimToken, status, body) };
    }
    if (row?.state === "done" && row.response && row.http_status) {
      return { kind: "replay", status: row.http_status, body: row.response };
    }
    if (row?.state !== "pending") {
      console.error("[analysisCache] Unexpected claim result — running uncached:", row);
      return RUN_UNCACHED;
    }

    if (Date.now() + POLL_INTERVAL_MS > waitUntil) return { kind: "timeout" };
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function settle(
  requestId: string,
  claimToken: string,
  status: number,
  body: AnalyzeResponse
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;

  try {
    if (FINAL_STATUSES.has(status)) {
      const { error } = await db
        .rpc("api_finish_analysis", {
          p_request_id: requestId,
          p_claim_token: claimToken,
          p_http_status: status,
          p_response: withoutHealthCondition(body),
        })
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
      if (error) throw error;
    } else {
      const { error } = await db
        .rpc("api_release_analysis", { p_request_id: requestId, p_claim_token: claimToken })
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
      if (error) throw error;
    }
  } catch (error) {
    // A retry will wait out the claim (75s) and then recompute. Slower, never wrong.
    console.error("[analysisCache] Could not settle claim:", error);
  }
}

/**
 * The privacy policy promises the health condition is never stored on our
 * servers, so it is stripped here and re-attached from the retry's own request.
 */
function withoutHealthCondition(body: AnalyzeResponse): AnalyzeResponse {
  if (!body.data) return body;
  const { healthCondition: _omit, ...data } = body.data;
  return { ...body, data: data as AnalyzeResponse["data"] };
}

/** Re-attach the requester's health condition to a replayed response. */
export function withHealthCondition(
  body: AnalyzeResponse,
  healthCondition: string
): AnalyzeResponse {
  if (!body.data) return body;
  return { ...body, data: { ...body.data, healthCondition } as AnalyzeResponse["data"] };
}
