import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { POSTHOG_API_KEY, POSTHOG_HOST, registerSuperProperties } from "../lib/analytics";
import ScoringInfoButton from "../components/ScoringInfoButton";
import TermsGate from "../components/TermsGate";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://74924b2ec6ad00460d3750eaa7fef985@o4511660296765440.ingest.us.sentry.io/4511672110022656',

  // Deliberately OFF. The default (true) attaches IP address and user context
  // to every event, which contradicts both the privacy policy and the whole
  // point of a stateless app that never asks who you are.
  sendDefaultPii: false,

  // Enable Logs
  enableLogs: true,

  // Session Replay: on error ONLY.
  //
  // `replaysSessionSampleRate` was 0.1 — one in ten sessions recorded whether
  // or not anything went wrong. The privacy policy says replay happens "when an
  // error occurs" (apps/api/src/app/privacy/page.tsx §3), so the sampled
  // recording made a published document untrue. It also meant routinely filming
  // a camera screen pointed at a restaurant menu for no diagnostic return.
  //
  // Keep this at 0. Error replays are the ones with debugging value, and
  // replaysOnErrorSampleRate: 1 already captures every one of those.
  replaysSessionSampleRate: 0,
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
        {/* Wraps the whole navigator, so the gate covers every entry point —
            including a deep link straight into /capture. Renders nothing once
            the current Terms version is on record. */}
        <TermsGate>
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
        </TermsGate>
        <ScoringInfoButton />
      </GestureHandlerRootView>
    </PostHogProvider>
  );
});
