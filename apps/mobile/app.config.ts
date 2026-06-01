import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Eat Out Better",
  slug: "eat-out-better",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#1B4332",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.eatoutbetter.app",
    buildNumber: "1",
    infoPlist: {
      NSCameraUsageDescription:
        "Eat Out Better needs camera access to photograph restaurant menus for analysis.",
      NSPhotoLibraryUsageDescription:
        "Eat Out Better needs photo library access to upload existing menu photos.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1B4332",
    },
    package: "com.eatoutbetter.app",
    permissions: ["CAMERA", "READ_EXTERNAL_STORAGE"],
  },
  web: {
    bundler: "metro",
  },
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission:
          "Eat Out Better needs camera access to photograph restaurant menus.",
      },
    ],
    "expo-router",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // API URL — override with EAS environment variable in production
    apiUrl: process.env.API_URL ?? "http://localhost:3000",
  },
});
