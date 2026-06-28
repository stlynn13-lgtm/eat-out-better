import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PostHogProvider } from "posthog-react-native";
import { POSTHOG_API_KEY, POSTHOG_HOST } from "../lib/analytics";

export default function RootLayout() {
  return (
    <PostHogProvider apiKey={POSTHOG_API_KEY} options={{ host: POSTHOG_HOST }}>
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
          <Stack.Screen name="privacy" />
          <Stack.Screen name="how-it-works" options={{ presentation: "modal" }} />
        </Stack>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}
