import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="capture" />
        <Stack.Screen
          name="processing"
          options={{ gestureEnabled: false }} // No swipe-back during analysis
        />
        <Stack.Screen name="results" />
      </Stack>
    </>
  );
}
