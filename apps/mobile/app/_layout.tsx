import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
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
  );
}
