import { ExpoConfig, ConfigContext } from "expo/config";

/**
 * `extra` ships inside the update manifest, so whatever this file resolves at
 * publish time is what every device gets. Two of those values come from env
 * vars with no usable fallback, and both fail SILENTLY when absent:
 *
 *   APP_TOKEN  — the `x-app-token` shared secret. Absent, it publishes as
 *                `undefined` and the app sends no token at all. Harmless only
 *                while the API's APP_SHARED_TOKEN gate is unset (fail-open);
 *                the day that gate is switched on, every device carrying such
 *                an update is 401'd on every scan, with nothing to fall back
 *                to. See project memory on the build-5 token rotation.
 *   APP_ENV    — tags every analytics event. Absent it defaults to
 *                "development", which quietly files TestFlight traffic under
 *                the wrong environment in PostHog.
 *
 * `eas.json`'s per-profile `env` blocks apply to `eas build`, which runs on
 * EAS servers. They do NOT apply to `eas update`, which evaluates this file on
 * the machine you run it from. So a bare `eas update` resolves APP_TOKEN to
 * `undefined` and strips the token without saying a word. The guard below
 * turns that into a loud failure instead.
 *
 * Publish with:
 *
 *   npm run update:production -- --message "..."
 *
 * which routes through scripts/publish-update.sh. That wrapper runs the update
 * inside `eas env:exec`, which is what puts APP_TOKEN into the environment of
 * the subprocess that evaluates this file. `--environment production` on
 * `eas update` alone does NOT reach that subprocess. Remembering to type
 * `env:exec` by hand used to be the only protection, and forgetting it did not
 * fail loudly — it shipped a tokenless update.
 *
 * CORRECTION (2026-09-22): this comment previously said APP_TOKEN is a
 * *secret*-visibility EAS variable that "cannot be pulled down locally at
 * all". That is wrong, and it is wrong in the direction that makes the
 * problem look unsolvable. APP_TOKEN is **sensitive**, not secret — sensitive
 * values CAN be read off the build servers (`eas env:list production` prints
 * "To access it, run command with --include-sensitive flag"), which is exactly
 * what makes `env:exec` work. SENTRY_AUTH_TOKEN is the genuinely secret one,
 * and it is readable only on an EAS builder.
 *
 * When checking a resolved config by hand, strip ANSI codes first —
 * `expo config` colourises, so the escape sequence sits between `appToken:`
 * and the value and a naive grep reports the token as EMPTY. That is
 * indistinguishable from the real failure this guard exists to prevent.
 */
function resolveAppToken(environment: string): string | undefined {
  const token = process.env.APP_TOKEN;
  if (token) return token;

  // Local development never needs it — the API is fail-open, and requiring a
  // secret to run `expo start` would be hostile.
  if (environment === "development") return undefined;

  // `eas build` is NOT the dangerous case, and the first version of this guard
  // wrongly blocked it.
  //
  // EAS applies a build profile's `env` block when it evaluates this config —
  // including on your own machine, before the build is queued. That is how
  // APP_TOKEN_FROM_EAS arrives. But APP_TOKEN itself is an EAS *environment
  // variable*, and those are resolved on the builder rather than pulled down
  // during local config evaluation, so it is absent here. (Not because it is
  // secret-visibility — it is sensitive; see the header. `eas env:exec` can
  // inject it locally, which is what the update path does. `eas build` simply
  // does not need it to, because the builder re-evaluates this config with the
  // real value.) So a missing token during the local half of a build
  // is expected, not a fault, and throwing there just prevents anyone from
  // cutting a release.
  //
  // APP_TOKEN_FROM_EAS is set only in eas.json's build profiles, so it means
  // exactly "a builder will supply the real value later". `eas update` does not
  // read build profiles at all — that is the whole reason this guard exists —
  // so it is unset during an update, which is the case we must still block.
  //
  // On the builder itself (EAS_BUILD=true) the token really should be there, so
  // a missing one is a genuine failure and still throws.
  const builderWillSupply = process.env.APP_TOKEN_FROM_EAS === "1";
  const onBuilder = process.env.EAS_BUILD === "true";
  if (builderWillSupply && !onBuilder) return undefined;

  // Deliberate escape hatch: a preview build for someone who shouldn't be
  // handed the token. Must be asked for explicitly.
  if (process.env.ALLOW_MISSING_APP_TOKEN === "1") {
    console.warn(
      `\n⚠️  APP_TOKEN is missing and ALLOW_MISSING_APP_TOKEN=1 is set.\n` +
        `   Publishing "${environment}" with NO API token. Devices taking this\n` +
        `   artifact will send no x-app-token header.\n`
    );
    return undefined;
  }

  throw new Error(
    `APP_TOKEN is not set, but APP_ENV="${environment}".\n\n` +
      `  (If you are running 'eas build', this should not happen — check that\n` +
      `  APP_TOKEN_FROM_EAS=1 is still in the profile's env block in eas.json.)\n\n` +
      `  'extra.appToken' ships in the update manifest. Publishing now would\n` +
      `  strip the API token from every device that takes this artifact.\n\n` +
      `  eas.json's env blocks only apply to 'eas build' — 'eas update'\n` +
      `  evaluates this config on THIS machine, and nothing has injected\n` +
      `  APP_TOKEN into it.\n\n` +
      `  Fix: npm run update:${environment}\n` +
      `  That routes through scripts/publish-update.sh, which wraps the\n` +
      `  publish in 'eas env:exec ${environment}' and supplies the token.\n` +
      `  Do NOT paste the token on a command line — that is how the build-5\n` +
      `  token was burned. See scripts/rotate-app-token.sh.\n` +
      `  Or, to publish deliberately without one: ALLOW_MISSING_APP_TOKEN=1\n`
  );
}

const APP_ENVIRONMENT = process.env.APP_ENV ?? "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Eat Out Better",
  slug: "eat-out-better",
  scheme: "eat-out-better",
  // 1.1.4 -> 1.2.0 because expo-secure-store is a NEW NATIVE MODULE (see
  // lib/identity/installId.ts). Under `runtimeVersion: { policy: "appVersion" }`
  // below, bumping this is what stops an OTA payload that imports SecureStore
  // from reaching a binary that has no SecureStore to import. Build 9 testers
  // stop receiving OTA updates until they install this build.
  version: "1.2.0",
  // Explicit, because `...config` above spreads app.json — which still carries a
  // `web` key from the Expo template. Without this, `eas update` exports for web
  // too and dies on a missing react-native-web that this app has never needed:
  //
  //   CommandError: It looks like you're trying to use web support but don't
  //   have the required dependencies installed.
  //
  // There is no web target and never has been. Naming the platforms here is
  // cheaper than deleting keys out of app.json, which app.config.ts overrides
  // wholesale anyway.
  platforms: ["ios", "android"],
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  // Over-the-air updates. Anything that is pure JS/TS (copy, layout, colors,
  // animations) can now ship with `eas update` instead of a TestFlight build —
  // testers pick it up on the next cold start.
  //
  // `appVersion` policy: an update only reaches builds whose `version` matches
  // the one it was published from. That is the point — a native change (a new
  // Expo module, an app.config native key, an SDK bump) must NOT be delivered
  // as an OTA payload to a binary that lacks the native side, and bumping
  // `version` is what fences it off. So: bump `version` whenever the native
  // project changes, and leave it alone for JS-only work.
  //
  // NOTE: this is inert for anyone on build 8 or earlier — expo-updates only
  // exists from build 9 on, so testers must install build 9 once before any
  // OTA update can reach them.
  runtimeVersion: { policy: "appVersion" },
  updates: {
    url: "https://u.expo.dev/00762885-6323-4fbb-9220-32bee3194ea0",
    // Never hold the splash screen waiting on the network. A new update is
    // fetched in the background and applied on the next launch.
    fallbackToCacheTimeout: 0,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.eatoutbetter.app",
    // 11, not 10: buildNumber 10 was committed on 2026-09-10 and never built,
    // and the docs already refer to that never-built binary as "build 10".
    // Incrementing keeps one number from meaning two different things.
    buildNumber: "11",
    infoPlist: {
      NSCameraUsageDescription:
        "Eat Out Better needs camera access to photograph restaurant menus for analysis.",
      NSPhotoLibraryUsageDescription:
        "Eat Out Better needs photo library access to upload existing menu photos.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      backgroundColor: "#1B4332",
    },
    package: "com.eatoutbetter.app",
  },
  plugins: [
    "expo-router",
    [
      "expo-camera",
      {
        cameraPermission:
          "Eat Out Better needs camera access to photograph restaurant menus.",
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "eat-out-better",
        organization: "eat-out-better",
      },
    ],
    "./plugins/with-mlkit-simulator-patch",
  ],
  extra: {
    ...config.extra,
    apiUrl: process.env.API_URL ?? "https://eat-out-better-api.vercel.app",
    environment: APP_ENVIRONMENT,
    // Per-device daily scan cap (see lib/utils/scanQuota.ts). Lives here rather
    // than as a constant so it can be retuned with `eas update` — `extra` ships
    // in the update manifest — instead of needing a new TestFlight build.
    dailyScanLimit: Number(process.env.DAILY_SCAN_LIMIT ?? 5),
    // How many saved scans the history screen DISPLAYS. Display-only by
    // design — lib/storage/session.ts caps what is STORED with a constant in
    // code, so this can be retuned with `eas update` and can never delete a
    // scan if it is rolled back. See that file's header for why that split
    // exists; the naive single-cap version destroys history on rollback.
    historyLimit: Number(process.env.HISTORY_LIMIT ?? 50),
    // Shared secret sent to the API as the `x-app-token` header. Supplied by
    // the APP_TOKEN env var so the real value never lives in committed source;
    // must match the API's APP_SHARED_TOKEN env var in Vercel. Guarded — see
    // resolveAppToken() above for why a missing value is a publish-blocker
    // rather than a silent `undefined`.
    appToken: resolveAppToken(APP_ENVIRONMENT),
  },
});
