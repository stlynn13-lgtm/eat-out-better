import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Eat Out Better",
  slug: "eat-out-better",
  scheme: "eat-out-better",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  jsEngine: "jsc",
  userInterfaceStyle: "light",
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
  ],
  extra: {
    apiUrl: process.env.API_URL ?? "http://localhost:3000",
  },
});
