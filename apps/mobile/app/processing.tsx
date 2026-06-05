/**
 * Screen 3 — Processing
 *
 * Shown during the ~20s analysis window.
 * No back-swipe (gestureEnabled: false in _layout).
 */

import { useEffect, useState } from "react";
import { View, Text, Animated } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAnalysisStore } from "../store/useAnalysisStore";

const TIPS = [
  "Saturated fat raises LDL cholesterol more than dietary cholesterol itself.",
  "Grilling and baking are heart-friendlier cooking methods than frying.",
  "Omega-3 fatty acids in fish like salmon can help lower triglycerides.",
  "Soluble fiber in oats and beans helps remove cholesterol from your bloodstream.",
  "Requesting sauces on the side is one of the easiest ways to reduce hidden fats.",
];

export default function ProcessingScreen() {
  const router = useRouter();
  const { status, progress, progressMessage, images, error } = useAnalysisStore();

  // Rotate educational tip every 8 seconds
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 8_000);
    return () => clearInterval(interval);
  }, []);

  const tip = TIPS[tipIndex];

  // Guard redirects
  useEffect(() => {
    if (images.length === 0 && status === "idle") {
      router.replace("/capture");
    }
  }, [images.length, status, router]);

  useEffect(() => {
    if (status === "error") router.replace("/capture");
  }, [status, router]);

  useEffect(() => {
    if (status === "complete") router.replace("/results");
  }, [status, router]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-5 pt-12 pb-8 items-center">
        {/* Animated logo */}
        <View className="w-24 h-24 rounded-full bg-brand-900 items-center justify-center mb-8">
          <Text className="text-4xl">🥗</Text>
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Analyzing your menu
        </Text>
        <Text className="text-sm text-gray-500 text-center px-4 mb-8 leading-relaxed">
          {progressMessage || "Reading dish names and checking cholesterol impact…"}
        </Text>

        {/* Progress bar */}
        <View className="w-full mb-2">
          <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
        <View className="w-full flex-row justify-between mb-8">
          <Text className="text-sm text-gray-500 font-medium tabular-nums">
            {Math.round(progress)}%
          </Text>
          <Text className="text-xs text-gray-400">Usually 15–20 seconds</Text>
        </View>

        {/* Educational tip */}
        <View className="w-full bg-green-50 border border-green-200 rounded-2xl p-4">
          <Text className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">
            Did you know?
          </Text>
          <Text className="text-sm text-green-900 leading-relaxed">{tip}</Text>
        </View>

        <View className="flex-1" />

        {/* Bounce dots */}
        <View className="flex-row gap-1.5">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-green-500"
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
