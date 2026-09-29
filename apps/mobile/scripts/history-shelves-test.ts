// @ts-nocheck — runs under Node via tsx; the app's tsconfig has no Node types
// and shouldn't grow them for one test script.
/**
 * Scenario test for the per-account history shelves in lib/storage/session.ts
 * (auth-plan.md §12.4), with AsyncStorage faked in memory. No device needed.
 *
 *   npm run test:history
 *
 * The cases that matter most: an upgrade from the pre-accounts key keeps every
 * scan, and after a sign-out the next person on the phone sees nothing.
 */
import Module from "module";

const store = new Map<string, string>();
const fakeAsyncStorage = {
  getItem: async (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: async (k: string, v: string) => void store.set(k, v),
  removeItem: async (k: string) => void store.delete(k),
};
const M = Module as unknown as { _load: (...args: unknown[]) => unknown };
const orig = M._load;
M._load = function (request: unknown, ...rest: unknown[]) {
  if (request === "@react-native-async-storage/async-storage")
    return { __esModule: true, default: fakeAsyncStorage };
  if (request === "expo-constants")
    return { __esModule: true, default: { expoConfig: { extra: {} } } };
  return orig.call(this, request, ...rest);
};

const scan = (id: string, day: number) => ({
  id,
  healthCondition: "high_cholesterol",
  dishes: [],
  rawDishes: [],
  dishCount: 0,
  processingTimeMs: 1,
  createdAt: `2026-09-${String(day).padStart(2, "0")}T12:00:00.000Z`,
});

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  " + JSON.stringify(detail)}`);
  if (!cond) failures++;
}

(async () => {
  // A pre-accounts phone: two scans under the legacy key.
  store.set("eat-out-better:sessions", JSON.stringify([scan("s2", 2), scan("s1", 1)]));

  const s = await import(
    "../lib/storage/session"
  );

  const first = await s.getSessions();
  check("upgrade: legacy history still visible before any account", first.map((x: any) => x.id).join() === "s2,s1", first);
  check("upgrade: legacy key removed after copy", !store.has("eat-out-better:sessions"));

  // Anonymous account X arrives and claims the device shelf.
  await s.setActiveHistoryUser("X");
  await s.claimDeviceShelf("X");
  check("claim: X sees the legacy scans", (await s.getSessions()).length === 2);
  check("claim: device shelf emptied", !store.has("eat-out-better:sessions:device"));

  await s.saveSession(scan("s3", 3) as any);
  const afterSave = (await s.getSessions()).map((x: any) => x.id).join();
  check("save: newest first on X's shelf", afterSave === "s3,s2,s1", afterSave);

  // Duplicate save of the same id does not duplicate.
  await s.saveSession(scan("s3", 3) as any);
  check("save: same id twice stays one row", (await s.getSessions()).length === 3);

  // X signs out -> no account -> empty device shelf.
  await s.setActiveHistoryUser(null);
  check("sign-out: next person sees nothing", (await s.getSessions()).length === 0);
  await s.saveSession(scan("d1", 4) as any);
  check("no-account scan lands on device shelf", store.has("eat-out-better:sessions:device"));

  // New anonymous Y claims it; X's shelf untouched.
  await s.setActiveHistoryUser("Y");
  await s.claimDeviceShelf("Y");
  check("Y sees only the post-sign-out scan", (await s.getSessions()).map((x: any) => x.id).join() === "d1");
  check("X's shelf still intact on the phone", JSON.parse(store.get("eat-out-better:sessions:X")!).length === 3);

  // Clear only clears the active shelf.
  await s.clearSessions();
  check("clear: Y empty", (await s.getSessions()).length === 0);
  check("clear: X untouched", JSON.parse(store.get("eat-out-better:sessions:X")!).length === 3);

  // Cap at 100.
  await s.setActiveHistoryUser("Z");
  for (let i = 0; i < 105; i++) {
    await s.saveSession({ ...scan(`z${i}`, 1), createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() } as any);
  }
  const z = await s.getSessions();
  check("cap: 100 kept", z.length === 100, z.length);
  check("cap: oldest dropped", z[z.length - 1].id === "z5", z[z.length - 1].id);

  console.log(`\n${failures === 0 ? "all passed" : failures + " failed"}`);
  process.exit(failures ? 1 : 0);
})();
