// @ts-nocheck — runs under Node via tsx; the app's tsconfig has no Node types
// and shouldn't grow them for one test script.
/**
 * Scenario test for the leave-and-return retry in hooks/useAnalysis.ts, with
 * React, AppState, fetch and the app's other dependencies faked. No device.
 *
 *   npm run test:suspend
 *
 * Replays what iOS does when the user swipes home mid-analysis and comes
 * back: the suspended fetch either rejects with "Network request failed" the
 * moment the app returns, or hangs until the hook aborts it. Each case asserts
 * the scan still completes, with no error and no wasted extra request.
 */
import Module from "module";

// ── Fakes ───────────────────────────────────────────────────────────────────
let appState = "active";
let uuidCount = 0;
let listeners: Array<(s: string) => void> = [];
const AppState = {
  get currentState() {
    return appState;
  },
  addEventListener(_: string, fn: (s: string) => void) {
    listeners.push(fn);
    return { remove: () => (listeners = listeners.filter((l) => l !== fn)) };
  },
};
/** Deliver an AppState change the way RN does: update currentState, then notify. */
function setAppState(next: string) {
  appState = next;
  for (const l of [...listeners]) l(next);
}

const storeState = { status: "idle", error: null, results: null };
const store = {
  ...storeState,
  setStatus: (s) => (storeState.status = s),
  setProgress: () => {},
  setError: (e) => ((storeState.error = e), (storeState.status = "error")),
  setResults: (r) => ((storeState.results = r), (storeState.status = "complete")),
  clearImages: () => {},
  addImage: () => {},
};

const fakes = {
  react: {
    useRef: (v) => ({ current: v }),
    useCallback: (fn) => fn,
    useEffect: (fn) => void fn(),
  },
  "react-native": { AppState },
  "expo-router": { useRouter: () => ({ push: () => {} }) },
  "posthog-react-native": { usePostHog: () => null },
  "@sentry/react-native": { captureException: () => {} },
  "expo-constants": { __esModule: true, default: { expoConfig: { extra: {} } } },
  "expo-crypto": { randomUUID: () => `id-${++uuidCount}` },
  "../store/useAnalysisStore": { useAnalysisStore: () => store },
  "../lib/utils/image": {
    compressImageUri: async () => ({ base64: "x" }),
    perImageByteTarget: () => 1,
  },
  "../lib/utils/menuTextCheck": { hasMenuText: async () => ({ hasText: true }) },
  "../lib/storage/session": { saveSession: async () => {} },
  "../lib/utils/scanQuota": { recordScan: async () => {} },
  "@eat-out-better/shared": { DEFAULT_CONDITION: "high_cholesterol" },
  "../lib/analytics": {
    trackMenuAnalysisCompleted: () => {},
    trackMenuAnalysisFailed: () => {},
  },
};
const M = Module as unknown as { _load: (...args: unknown[]) => unknown };
const orig = M._load;
M._load = function (request: string, ...rest: unknown[]) {
  if (request in fakes) return fakes[request];
  return orig.call(this, request, ...rest);
};

// Each fetch call is handed to the scenario, which decides how it ends.
type Call = {
  resolve: () => void;
  reject: (e: Error) => void;
  signal: AbortSignal;
  requestId: string;
};
let calls: Call[] = [];
const okBody = JSON.stringify({ success: true, data: { dishCount: 3, dishes: [] } });
globalThis.fetch = (_url, init) =>
  new Promise((resolve, reject) => {
    const call = {
      resolve: () => resolve({ status: 200, statusText: "OK", text: async () => okBody }),
      reject,
      signal: init.signal,
      requestId: init.headers["x-request-id"],
    };
    init.signal.addEventListener("abort", () => {
      const e = new Error("Aborted");
      e.name = "AbortError";
      reject(e);
    });
    calls.push(call);
  });

const networkFailed = () => new TypeError("Network request failed");
const tick = () => new Promise((r) => setTimeout(r, 0));

// ── Harness ─────────────────────────────────────────────────────────────────
const { useAnalysis } = require("../hooks/useAnalysis");

let failures = 0;
async function scenario(name: string, run: () => Promise<void>, expect: { calls: number; ok: boolean }) {
  appState = "active";
  listeners = [];
  calls = [];
  Object.assign(storeState, { status: "idle", error: null, results: null });
  const { startAnalysis } = useAnalysis();
  const done = startAnalysis(["file://menu.jpg"], "scan-1", Date.now());
  await tick();
  await run();
  await done;
  const ok = storeState.status === "complete";
  // Every attempt of one scan carries the same id, so the server can hand a
  // retry the result it already worked out instead of running it again.
  const ids = new Set(calls.map((c) => c.requestId));
  const sameId = ids.size === 1 && !ids.has(undefined);
  const pass = ok === expect.ok && calls.length === expect.calls && sameId;
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}` +
      (pass ? "" : `\n      expected ok=${expect.ok} calls=${expect.calls}; got ok=${ok} calls=${calls.length} ids=${[...ids]} error=${JSON.stringify(storeState.error)}`)
  );
}

/** Swipe home, then come back. `onReturn` runs where iOS would kill the socket. */
async function leaveAndReturn(onReturn: "reject-before-event" | "reject-after-event" | "hang") {
  setAppState("inactive");
  setAppState("background");
  await tick();
  const suspended = calls[calls.length - 1];
  if (onReturn === "reject-before-event") {
    // The rejection reaches JS before the AppState "active" event does.
    suspended.reject(networkFailed());
    await tick();
    setAppState("active");
  } else if (onReturn === "reject-after-event") {
    setAppState("active");
    suspended.reject(networkFailed());
  } else {
    setAppState("active"); // the listener aborts the hung request
  }
  await tick();
}

const finishLatest = async () => {
  calls[calls.length - 1].resolve();
  await tick();
};

(async () => {
  await scenario(
    "returns before the 'active' event: one silent retry, scan completes",
    async () => {
      await leaveAndReturn("reject-before-event");
      await finishLatest();
    },
    { calls: 2, ok: true }
  );

  await scenario(
    "returns after the 'active' event: one silent retry, scan completes",
    async () => {
      await leaveAndReturn("reject-after-event");
      await finishLatest();
    },
    { calls: 2, ok: true }
  );

  await scenario(
    "request hangs on return: aborted and retried, scan completes",
    async () => {
      await leaveAndReturn("hang");
      await finishLatest();
    },
    { calls: 2, ok: true }
  );

  await scenario(
    "backgrounded three times in one scan: still completes",
    async () => {
      await leaveAndReturn("reject-before-event");
      await leaveAndReturn("reject-after-event");
      await leaveAndReturn("reject-before-event");
      await finishLatest();
    },
    { calls: 4, ok: true }
  );

  await scenario(
    "suspension budget exhausted (4 returns): fails with an error",
    async () => {
      for (let i = 0; i < 4; i++) await leaveAndReturn("reject-before-event");
    },
    { calls: 4, ok: false }
  );

  await scenario(
    "genuinely offline (never left the app): one retry, then fails",
    async () => {
      calls[0].reject(networkFailed());
      await tick();
      calls[1].reject(networkFailed());
      await tick();
    },
    { calls: 2, ok: false }
  );

  await scenario(
    "notification banner (inactive → active): request left alone",
    async () => {
      setAppState("inactive");
      setAppState("active");
      await tick();
      await finishLatest();
    },
    { calls: 1, ok: true }
  );

  // A second scan must get a fresh id, or it could be handed the first
  // scan's stored result.
  calls = [];
  appState = "active";
  listeners = [];
  const { startAnalysis } = useAnalysis();
  const second = startAnalysis(["file://other.jpg"], "scan-2", Date.now());
  await tick();
  const before = uuidCount;
  await finishLatest();
  await second;
  const fresh = calls.length === 1 && calls[0].requestId === `id-${before}`;
  const distinct = calls[0].requestId !== "id-1";
  if (!(fresh && distinct)) failures++;
  console.log(`${fresh && distinct ? "PASS" : "FAIL"}  a new scan gets a new request id`);

  console.log(failures ? `\n${failures} scenario(s) failed` : "\nAll scenarios passed");
  process.exit(failures ? 1 : 0);
})();
