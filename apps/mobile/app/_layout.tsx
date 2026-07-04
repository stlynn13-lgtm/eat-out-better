import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { POSTHOG_API_KEY, POSTHOG_HOST, registerSuperProperties } from "../lib/analytics";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://74924b2ec6ad00460d3750eaa7fef985@o4511660296765440.ingest.us.sentry.io/4511672110022656',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function AnalyticsBootstrap() {
  const posthog = usePostHog();
  useEffect(() => {
    if (posthog) registerSuperProperties(posthog);
  }, [posthog]);
  return null;
}

export default Sentry.wrap(function RootLayout() {
  return (
    <PostHogProvider apiKey={POSTHOG_API_KEY} options={{ host: POSTHOG_HOST }}>
      <AnalyticsBootstrap />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="capture" />
          <Stack.Screen
            name="processing"
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="results" />
          <Stack.Screen name="how-it-works" options={{ presentation: "modal" }} />
        </Stack>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
});
