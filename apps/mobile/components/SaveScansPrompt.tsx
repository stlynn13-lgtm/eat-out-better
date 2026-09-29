import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, AccessibilityInfo } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth/account";

/**
 * The one moment the app asks about an account: right after the first scan.
 *
 * Why here and not at first launch: before a scan there is nothing to keep, so
 * "create an account" is a toll booth in front of the thing you came for. After
 * the first scan it's a real offer — this result is saved, here's how not to
 * lose it. It also keeps the app honest with App Store 5.1.1(v): scanning never
 * waits on an account.
 *
 * It lives in the results screen's bottom action bar, never over the dishes —
 * the same rule the results screen already follows for its rating prompt.
 * Shown once per install: whichever way it's answered (or ignored), it doesn't
 * come back. The home screen link and the Saved scans banner stay as the quiet
 * ways in afterwards.
 */

const SEEN_KEY = "eat-out-better:save-prompt-seen:v1";
const APPEAR_AFTER_MS = 1200;

export default function SaveScansPrompt({
  eligible,
  onVisibleChange,
}: {
  /** The results screen's say-so: a fresh scan (not from history) with dishes. */
  eligible: boolean;
  onVisibleChange?: (visible: boolean) => void;
}) {
  const router = useRouter();
  const accountsOn = useAuth((s) => s.status !== "unavailable");
  const signedIn = useAuth((s) => s.userId !== null && !s.isAnonymous);
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!eligible || !accountsOn || signedIn) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if ((await AsyncStorage.getItem(SEEN_KEY)) || cancelled) return;
        // Recorded as soon as it's shown: an ignored prompt is an answer too.
        await AsyncStorage.setItem(SEEN_KEY, new Date().toISOString());
      } catch {
        return; // Can't remember showing it — then don't risk showing it forever.
      }
      if (cancelled) return;
      setVisible(true);
      onVisibleChange?.(true);
      const reduce = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      Animated.timing(progress, {
        toValue: 1,
        duration: reduce ? 0 : 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, APPEAR_AFTER_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eligible, accountsOn, signedIn, progress, onVisibleChange]);

  // Signing in from the sheet answers the question; tidy the card away.
  useEffect(() => {
    if (signedIn && visible) {
      setVisible(false);
      onVisibleChange?.(false);
    }
  }, [signedIn, visible, onVisibleChange]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    onVisibleChange?.(false);
  };

  return (
    <Animated.View
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-sm"
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row items-start">
        <View
          className="rounded-full bg-green-50 items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#1B4332" />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-gray-900">Keep this scan safe</Text>
          <Text className="text-sm text-gray-600 leading-snug mt-0.5">
            It's saved on this phone. A free account backs it up, so a new phone
            doesn't mean starting over.
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
        <TouchableOpacity
          className="flex-1 bg-brand-900 rounded-xl items-center justify-center"
          style={{ height: 44 }}
          onPress={() => {
            dismiss();
            router.push("/account?from=first-scan");
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold text-base">Create free account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center justify-center px-4"
          style={{ height: 44 }}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Text className="text-base font-semibold text-gray-600">Not now</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
