/**
 * Scenario test for the scan result handoff (src/lib/supabase/analysisCache.ts).
 *
 * The database side has its own pgTAP tests
 * (supabase/tests/analysis_results_test.sql); this pins the API side against
 * an in-memory stand-in for the same three functions: who runs, who gets the
 * stored result, who waits, what is stored, and that every database problem
 * falls back to running the scan as before.
 *
 * Needs no API key, no Supabase and no network.
 *
 *   npm run test:cache
 */

import Module from "module";

// ── In-memory api_claim/finish/release_analysis ─────────────────────────────
type Row = { claim: string; status: "pending" | "done"; http_status?: number; response?: unknown };
const rows = new Map<string, Row>();
let rpcCalls: string[] = [];
let failRpc = false;
/** Called on each claim, so a scenario can finish the first attempt mid-poll. */
let onClaim: (() => void) | null = null;

const fakeDb = {
  rpc(name: string, args: Record<string, unknown>) {
    rpcCalls.push(name);
    const run = async () => {
      if (failRpc) return { data: null, error: new Error("db down") };
      const id = args.p_request_id as string;
      const token = args.p_claim_token as string;
      const row = rows.get(id);
      if (name === "api_claim_analysis") {
        onClaim?.();
        const current = rows.get(id);
        if (!current) {
          rows.set(id, { claim: token, status: "pending" });
          return { data: [{ state: "claimed", http_status: null, response: null }], error: null };
        }
        if (current.status === "done")
          return {
            data: [{ state: "done", http_status: current.http_status, response: current.response }],
            error: null,
          };
        return { data: [{ state: "pending", http_status: null, response: null }], error: null };
      }
      if (name === "api_finish_analysis") {
        if (row && row.claim === token && row.status === "pending")
          Object.assign(row, { status: "done", http_status: args.p_http_status, response: args.p_response });
        return { data: null, error: null };
      }
      if (name === "api_release_analysis") {
        if (row && row.claim === token && row.status === "pending") rows.delete(id);
        return { data: null, error: null };
      }
      throw new Error(`unknown rpc ${name}`);
    };
    return { abortSignal: () => run() };
  },
};

let dbConfigured = true;
const M = Module as unknown as { _load: (...args: unknown[]) => unknown };
const orig = M._load;
M._load = function (request: unknown, ...rest: unknown[]) {
  if (request === "./admin") return { getSupabaseAdmin: () => (dbConfigured ? fakeDb : null) };
  return orig.call(this, request, ...rest);
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { claimAnalysis, withHealthCondition } = require("../src/lib/supabase/analysisCache");

// ── Harness ─────────────────────────────────────────────────────────────────
const ID = "11111111-2222-4333-8444-555555555555";
const result = {
  success: true,
  data: { id: "scan-1", dishCount: 3, dishes: [], healthCondition: "high_cholesterol", scanSig: "sig" },
};
const later = () => Date.now() + 60_000;

let failures = 0;
async function check(name: string, fn: () => Promise<boolean | string>) {
  rows.clear();
  rpcCalls = [];
  failRpc = false;
  dbConfigured = true;
  onClaim = null;
  let outcome: boolean | string;
  try {
    outcome = await fn();
  } catch (e) {
    outcome = String(e);
  }
  const pass = outcome === true;
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass ? "" : `\n      ${outcome}`}`);
}

(async () => {
  await check("first attempt runs; a retry gets the stored result, not a second run", async () => {
    const first = await claimAnalysis(ID, later());
    if (first.kind !== "run") return `first: ${first.kind}`;
    await first.settle(200, result);
    const retry = await claimAnalysis(ID, later());
    if (retry.kind !== "replay") return `retry: ${retry.kind}`;
    return retry.status === 200 && retry.body.data.id === "scan-1" && retry.body.data.scanSig === "sig"
      ? true
      : JSON.stringify(retry);
  });

  await check("the health condition is never stored, and is re-attached on replay", async () => {
    const first = await claimAnalysis(ID, later());
    await first.settle(200, result);
    const stored = rows.get(ID)!.response as typeof result;
    if ("healthCondition" in stored.data) return "healthCondition was stored";
    if (result.data.healthCondition !== "high_cholesterol") return "caller's object was mutated";
    const retry = await claimAnalysis(ID, later());
    const served = withHealthCondition(retry.body, "high_cholesterol");
    return served.data.healthCondition === "high_cholesterol" ? true : JSON.stringify(served);
  });

  await check("a retry while the first attempt is still running waits for it", async () => {
    const first = await claimAnalysis(ID, later());
    let polls = 0;
    // The first attempt finishes on the retry's third look.
    onClaim = () => {
      if (++polls === 3) void first.settle(200, result);
    };
    const retry = await claimAnalysis(ID, later());
    return retry.kind === "replay" && polls >= 3 ? true : `${retry.kind} after ${polls} polls`;
  });

  await check("a retry stops waiting at its deadline", async () => {
    await claimAnalysis(ID, later());
    const retry = await claimAnalysis(ID, Date.now() + 1500);
    return retry.kind === "timeout" ? true : retry.kind;
  });

  await check("'not a menu' (422) is a final answer and is stored", async () => {
    const first = await claimAnalysis(ID, later());
    await first.settle(422, { success: false, error: { code: "NOT_A_MENU", message: "x" } });
    const retry = await claimAnalysis(ID, later());
    return retry.kind === "replay" && retry.status === 422 ? true : retry.kind;
  });

  for (const status of [429, 500, 503]) {
    await check(`a transient failure (${status}) is released, so the retry runs again`, async () => {
      const first = await claimAnalysis(ID, later());
      await first.settle(status, { success: false, error: { code: "CLAUDE_ERROR", message: "x" } });
      const retry = await claimAnalysis(ID, later());
      return retry.kind === "run" ? true : retry.kind;
    });
  }

  await check("no request id (older app builds): runs, never touches the database", async () => {
    const claim = await claimAnalysis(null, later());
    await claim.settle(200, result);
    return claim.kind === "run" && rpcCalls.length === 0 ? true : `${claim.kind}, ${rpcCalls}`;
  });

  await check("a malformed request id: runs, never touches the database", async () => {
    const claim = await claimAnalysis("'; drop table x; --", later());
    return claim.kind === "run" && rpcCalls.length === 0 ? true : `${claim.kind}, ${rpcCalls}`;
  });

  await check("Supabase not configured: runs as before", async () => {
    dbConfigured = false;
    const claim = await claimAnalysis(ID, later());
    return claim.kind === "run" ? true : claim.kind;
  });

  await check("database down (or migration not applied): runs, and settling doesn't throw", async () => {
    failRpc = true;
    const claim = await claimAnalysis(ID, later());
    await claim.settle(200, result);
    return claim.kind === "run" ? true : claim.kind;
  });

  console.log(failures ? `\n${failures} case(s) failed` : "\nAll cases passed");
  process.exit(failures ? 1 : 0);
})();
