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
 * `eas.json`'s per-profile `env` blocks and EAS's secret store both apply to
 * `eas build`, which runs on EAS servers. They do NOT apply to `eas update`,
 * which evaluates this file on the machine you run it from — and APP_TOKEN is
 * a *secret*-visibility EAS variable, so it cannot be pulled down locally at
 * all. A bare `eas update` therefore strips the token without saying a word.
 *
 * This turns that into a loud failure. Use the `update:*` npm scripts, which
 * set APP_ENV for you; supply APP_TOKEN from your own environment.
 */
function resolveAppToken(environment: string): string | undefined {
  const token = process.env.APP_TOKEN;
  if (token) return token;

  // Local development never needs it — the API is fail-open, and requiring a
  // secret to run `expo start` would be hostile.
  if (environment === "development") return undefined;

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
      `  'extra.appToken' ships in the update manifest. Publishing now would\n` +
      `  strip the API token from every device that takes this artifact.\n\n` +
      `  eas.json's env blocks and the EAS secret store only apply to\n` +
      `  'eas build' — 'eas update' evaluates this config locally, and\n` +
      `  APP_TOKEN is secret-visibility so it cannot be read off EAS.\n\n` +
      `  Fix: APP_TOKEN='<token>' npm run update:${environment}\n` +
      `  Or, to publish deliberately without one: ALLOW_MISSING_APP_TOKEN=1\n`
  );
}

const APP_ENVIRONMENT = process.env.APP_ENV ?? "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Eat Out Better",
  slug: "eat-out-better",
  scheme: "eat-out-better",
  version: "1.1.4",
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
    buildNumber: "10",
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
    // Shared secret sent to the API as the `x-app-token` header. Supplied by
    // the APP_TOKEN env var so the real value never lives in committed source;
    // must match the API's APP_SHARED_TOKEN env var in Vercel. Guarded — see
    // resolveAppToken() above for why a missing value is a publish-blocker
    // rather than a silent `undefined`.
    appToken: resolveAppToken(APP_ENVIRONMENT),
  },
});
