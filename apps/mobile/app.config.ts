import { ExpoConfig, ConfigContext } from "expo/config";

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
    buildNumber: "9",
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
    environment: process.env.APP_ENV ?? "development",
    // Per-device daily scan cap (see lib/utils/scanQuota.ts). Lives here rather
    // than as a constant so it can be retuned with `eas update` — `extra` ships
    // in the update manifest — instead of needing a new TestFlight build.
    dailyScanLimit: Number(process.env.DAILY_SCAN_LIMIT ?? 5),
    // Shared secret sent to the API as the `x-app-token` header. Injected at
    // build time from the APP_TOKEN env var (set in eas.json / EAS secrets) so
    // the real value never lives in committed source. Must match the API's
    // APP_SHARED_TOKEN env var in Vercel.
    appToken: process.env.APP_TOKEN,
  },
});
