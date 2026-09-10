import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, Animated, Easing, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { useAnalysisStore } from "../store/useAnalysisStore";
import { getCurrentScanSessionId, trackMenuProcessingStarted } from "../lib/analytics";
import FeedbackSheet from "../components/FeedbackSheet";

// Kept short on purpose: these swap every ROTATE_MS, and a fact you can't
// finish reading before it changes is worse than no fact at all. Aim for ~12
// words. They also have to agree with the app's own rubric — an earlier tip
// warned about trans fats, which the info screen correctly says have been
// banned in U.S. restaurants since 2018–2021.
const TIPS = [
  "Saturated fat raises LDL more than dietary cholesterol does.",
  "Grilled, baked, steamed or poached adds no cooking fat.",
  "Omega-3s in fish like salmon help lower triglycerides.",
  "Soluble fiber in oats and beans clears cholesterol out.",
  "Ask for sauce on the side — the easiest win on any menu.",
  "Cream, coconut and cheese sauces carry most of a dish's fat.",
  "A small handful of nuts most days is linked to lower LDL.",
  "Olive oil instead of butter trades saturated fat for better fat.",
  "Sweet drinks can raise triglycerides. Water or tea is safer.",
  "\"Crispy\" and \"breaded\" nearly always mean fried.",
];

const ROTATE_MS = 6_500;
const FADE_MS = 300;

// The bar is a pure animation, not a readout of real work — deliberately. It
// used to step in ~4% jumps off the store's simulated progress, which both
// looked mechanical and cost a re-render per step. Now: a fast ease-out to 90%
// (most of the perceived speed), then a slow creep so it never sits still, then
// a snap to 100 when the analysis actually lands.
const SPRINT_TO = 0.9;
const SPRINT_MS = 9_000;
const CREEP_TO = 0.97;
const CREEP_MS = 18_000;
const FINISH_MS = 350;

export default function ProcessingScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { status, progressMessage, images } = useAnalysisStore();
  const [tipIndex, setTipIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const tipOpacity = useRef(new Animated.Value(1)).current;

  // 0..1, drives both the bar's scaleX (on the native driver) and the counter.
  const fill = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);
  const lastPercentRef = useRef(0);

  useEffect(() => {
    const sessionId = getCurrentScanSessionId() ?? "";
    if (posthog) trackMenuProcessingStarted(posthog, sessionId, images.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every whole number gets shown, and only whole numbers cause a re-render —
  // at most 100 over the whole screen, versus one per animation frame. The bar
  // itself is unaffected either way; it runs on the UI thread.
  useEffect(() => {
    const id = fill.addListener(({ value }) => {
      const next = Math.round(value * 100);
      if (next !== lastPercentRef.current) {
        lastPercentRef.current = next;
        setPercent(next);
      }
    });
    return () => fill.removeListener(id);
  }, [fill]);

  useEffect(() => {
    const run = Animated.sequence([
      Animated.timing(fill, {
        toValue: SPRINT_TO,
        duration: SPRINT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fill, {
        toValue: CREEP_TO,
        duration: CREEP_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);
    run.start();
    return () => run.stop();
  }, [fill]);

  // Real completion overrides the animation — run it home to 100.
  useEffect(() => {
    if (status !== "complete") return;
    Animated.timing(fill, {
      toValue: 1,
      duration: FINISH_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [status, fill]);

  const rotateTip = useCallback(() => {
    Animated.timing(tipOpacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
      Animated.timing(tipOpacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start();
    });
  }, [tipOpacity]);

  useEffect(() => {
    const interval = setInterval(rotateTip, ROTATE_MS);
    return () => clearInterval(interval);
  }, [rotateTip]);

  useEffect(() => {
    if (images.length === 0 && status === "idle") {
      router.replace("/capture");
    }
  }, [images.length, status, router]);

  useEffect(() => {
    // Pop BACK to the capture screen the user came from (photos intact) rather
    // than replacing with a fresh instance — replace() stacked an empty
    // duplicate capture screen and threw away the user's photos on every
    // failure. Fallback replace covers the no-history edge (deep link).
    if (status === "error") {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/capture");
      }
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "complete") router.replace("/results");
  }, [status, router]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-5 pt-12 pb-8 items-center">
        <View className="w-24 h-24 rounded-full bg-brand-900 items-center justify-center mb-8">
          <Text className="text-4xl">🥗</Text>
        </View>

        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Analyzing your menu
        </Text>
        <Text className="text-base text-gray-500 text-center px-4 mb-8 leading-relaxed">
          {progressMessage || "Reading dish names and checking cholesterol impact…"}
        </Text>

        {/* Percentage above the bar and large enough to be the focal point —
            it's the thing people watch while they wait. */}
        <View className="w-full flex-row items-end justify-between mb-2">
          <Text className="text-3xl font-bold text-brand-900 tabular-nums">
            {percent}
            <Text className="text-xl font-semibold text-gray-500">%</Text>
          </Text>
          <Text className="text-xs text-gray-500 mb-1.5">
            Usually 15–20 seconds
          </Text>
        </View>

        <View className="w-full mb-8">
          <View className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            {/* scaleX rather than an animated `width`: width can't run on the
                native driver, so it would animate on the JS thread and stutter
                whenever the analysis work interrupts it. transformOrigin pins
                the growth to the left edge (RN 0.74+). */}
            <Animated.View
              className="h-full bg-brand-900 rounded-full"
              style={{
                width: "100%",
                transformOrigin: "left",
                transform: [{ scaleX: fill }],
              }}
            />
          </View>
        </View>

        <View className="w-full bg-green-50 border border-green-200 rounded-2xl p-4">
          <Text className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">
            Did you know?
          </Text>
          {/* Fixed height so a one-line fact followed by a two-line one doesn't
              make the card jump while the user is mid-sentence. */}
          <Animated.View style={{ opacity: tipOpacity, minHeight: 48 }}>
            <Text className="text-base text-green-900 leading-relaxed">
              {TIPS[tipIndex]}
            </Text>
          </Animated.View>
        </View>

        <View className="flex-1" />

        {/* Privacy Policy intentionally omitted mid-flow — it lives on the
            welcome and results screens. */}
        <View className="flex-row items-center justify-center gap-2 mt-6">
          <TouchableOpacity onPress={() => setShowFeedback(true)}>
            <Text className="text-xs text-gray-600 underline">Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FeedbackSheet
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="processing"
      />
    </SafeAreaView>
  );
}
