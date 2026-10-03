// @ts-nocheck — runs under Node via tsx; the app's tsconfig has no Node types
// and shouldn't grow them for one test script.
/**
 * Scenario test for signed-scan uploads in lib/sync/sessions.ts, with
 * AsyncStorage and Supabase faked in memory. No device needed.
 *
 *   npm run test:sync
 *
 * The fake database refuses an upload chunk containing any row without a
 * `scanSig`, the way the real one does since
 * supabase/migrations/20261003000000_signed_scans.sql. What must hold: unsigned
 * scans never reach an upload (so they can't stall the signed ones behind
 * them), and renaming an unsigned scan never deletes its server copy.
 */
import Module from "module";

const USER = "U";

const store = new Map<string, string>();
const fakeAsyncStorage = {
  getItem: async (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: async (k: string, v: string) => void store.set(k, v),
  removeItem: async (k: string) => void store.delete(k),
};

const uploads: string[][] = [];
const deletes: string[][] = [];
const fakeSupabase = {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: USER } } } }),
  },
  from: () => ({
    upsert: async (rows: any[]) => {
      uploads.push(rows.map((r) => r.id));
      return rows.every((r) => r.payload?.scanSig)
        ? { error: null }
        : { error: { message: "new row violates row-level security policy" } };
    },
    delete: () => ({
      eq: () => ({
        in: async (_col: string, ids: string[]) => {
          deletes.push(ids);
          return { error: null };
        },
      }),
    }),
  }),
};

const M = Module as unknown as { _load: (...args: unknown[]) => unknown };
const orig = M._load;
M._load = function (request: unknown, ...rest: unknown[]) {
  if (request === "@react-native-async-storage/async-storage")
    return { __esModule: true, default: fakeAsyncStorage };
  if (request === "expo-constants")
    return { __esModule: true, default: { expoConfig: { extra: {} } } };
  if (request === "@eat-out-better/shared")
    return { DEFAULT_CONDITION: "high_cholesterol" };
  if (typeof request === "string" && request.endsWith("/auth/supabase"))
    return { supabase: fakeSupabase };
  return orig.call(this, request, ...rest);
};

const scan = (id: string, day: number, signed: boolean) => ({
  id,
  healthCondition: "high_cholesterol",
  dishes: [],
  rawDishes: [],
  dishCount: 0,
  processingTimeMs: 1,
  createdAt: `2026-10-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  ...(signed ? { scanSig: `sig-${id}` } : {}),
});

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  " + JSON.stringify(detail)}`);
  if (!cond) failures++;
}

(async () => {
  const shelf = await import("../lib/storage/session");
  const sync = await import("../lib/sync/sessions");

  // Newest first: a signed scan, an old unsigned one, another signed one.
  await shelf.mergeIntoShelf(USER, [
    scan("new", 3, true),
    scan("legacy", 2, false),
    scan("older", 1, true),
  ]);

  await sync.syncUp(USER);
  const sent = uploads.flat();
  check("signed scans are uploaded", sent.includes("new") && sent.includes("older"), uploads);
  check("the unsigned scan is never sent", !sent.includes("legacy"), uploads);
  check("one upload, and it was accepted (no stalled chunk)", uploads.length === 1, uploads);

  uploads.length = 0;
  await sync.syncUp(USER);
  check("a second sync has nothing left to send", uploads.length === 0, uploads);

  // Rename one signed and one unsigned scan.
  await sync.markRenamed(USER, "older");
  await sync.markRenamed(USER, "legacy");
  await sync.syncUp(USER);
  check("the renamed signed scan's old copy is deleted", deletes.flat().includes("older"), deletes);
  check("the renamed unsigned scan's server copy is left alone", !deletes.flat().includes("legacy"), deletes);
  check("the renamed signed scan is re-uploaded", uploads.flat().includes("older"), uploads);

  uploads.length = 0;
  deletes.length = 0;
  await sync.syncUp(USER);
  check("the rename queue is empty afterwards", deletes.length === 0 && uploads.length === 0, { deletes, uploads });

  console.log(failures ? `\n${failures} failed` : "\nall passed");
  process.exit(failures ? 1 : 0);
})();
