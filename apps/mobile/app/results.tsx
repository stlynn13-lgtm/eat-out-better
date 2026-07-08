import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { useAnalysisStore } from "../store/useAnalysisStore";
import type { RankedDish } from "@eat-out-better/shared";
import { getTier, formatScore } from "@eat-out-better/shared";
import {
  generateId,
  getCurrentScanSessionId,
  setCurrentScanSessionId,
  trackNewScanInitiated,
} from "../lib/analytics";
import FeedbackSheet from "../components/FeedbackSheet";

export default function ResultsScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { results, session, status, error, reset, clearError } = useAnalysisStore();
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!results && status !== "complete") {
      router.replace("/capture");
    }
  }, [results, status, router]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-5">
        <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
          <Text className="text-3xl">⚠️</Text>
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
          Something went wrong
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
          {error.message}
        </Text>
        <TouchableOpacity
          className="w-full bg-brand-900 rounded-xl py-4 items-center"
          onPress={() => {
            // Clear the stale error and go BACK to the existing capture screen
            // — push() stacked a fresh empty capture on top of the old one.
            clearError();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/capture");
            }
          }}
        >
          <Text className="text-white font-semibold">Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!results || results.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500 text-sm">Loading results…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 32,
          paddingBottom: 100,
        }}
        ListHeaderComponent={
          <View className="mb-6">
            {/* Back pops to the capture screen the user came from — it's still
                mounted below us with its photos loaded (EAT-11). Going home
                requires a second back from there, matching the app hierarchy. */}
            <TouchableOpacity
              className="w-8 h-8 items-center justify-center rounded-full bg-gray-100 mb-4"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/capture");
                }
              }}
              accessibilityLabel="Back to menu photos"
            >
              <Text className="text-gray-600 text-base">←</Text>
            </TouchableOpacity>
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xl font-bold text-gray-900">Menu Results</Text>
              <View className="bg-gray-100 rounded-full px-2.5 py-1">
                <Text className="text-xs font-semibold text-gray-700">
                  {results.length} dish{results.length !== 1 ? "es" : ""}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-500">
              Ranked best to worst for your heart
            </Text>
            {session?.processingTimeMs ? (
              <Text className="text-xs text-gray-400 mt-1">
                Analyzed in {(session.processingTimeMs / 1000).toFixed(1)}s
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          // Server ranks are guaranteed sequential (1..n) as of build 6; fall
          // back to list position for sessions saved by older builds.
          <DishCard dish={item} rank={item.rank ?? index + 1} />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
      />

      <View
        className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3"
        style={{ backgroundColor: "rgba(249,250,251,0.97)" }}
      >
        <TouchableOpacity
          className="w-full border-2 border-gray-300 rounded-xl py-4 items-center"
          onPress={() => {
            const previousSessionId = getCurrentScanSessionId() ?? "";
            const newSessionId = generateId();
            setCurrentScanSessionId(newSessionId);
            if (posthog) trackNewScanInitiated(posthog, previousSessionId, newSessionId);
            // Use replace (not push) so results is removed from the stack before
            // reset() clears the store — otherwise results stays mounted, its
            // guard fires on the cleared state, and capture mounts twice.
            router.replace(`/capture?entry=loop_back&sid=${newSessionId}`);
            reset();
          }}
          activeOpacity={0.8}
        >
          <Text className="text-gray-700 font-semibold">Analyze New Menu</Text>
        </TouchableOpacity>

        <View className="flex-row items-center justify-center gap-2 mt-3">
          <TouchableOpacity onPress={() => setShowFeedback(true)}>
            <Text className="text-xs text-gray-400 underline">Feedback</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-300">·</Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://eat-out-better-api.vercel.app/privacy")}>
            <Text className="text-xs text-gray-400 underline">Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FeedbackSheet
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="results"
        showRating
      />
    </SafeAreaView>
  );
}

function DishCard({ dish, rank }: { dish: RankedDish; rank: number }) {
  const tier = getTier(dish.score);

  const tierColors = {
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      badge: "bg-green-100",
      badgeText: "text-green-800",
      score: "text-green-700",
    },
    yellow: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100",
      badgeText: "text-amber-800",
      score: "text-amber-700",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100",
      badgeText: "text-red-800",
      score: "text-red-700",
    },
  };

  const colors = tierColors[tier];

  return (
    <View className={`rounded-2xl border p-4 ${colors.bg} ${colors.border}`}>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2 mb-0.5">
            <Text className="text-xs font-medium text-gray-400">#{rank}</Text>
            {dish.tag && (
              <View className={`rounded-full px-2 py-0.5 ${colors.badge}`}>
                <Text className={`text-xs font-semibold ${colors.badgeText}`}>
                  {dish.tag === "top-pick" ? "Top Pick" : "Enjoy Occasionally"}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-base font-semibold text-gray-900">{dish.name}</Text>
          {dish.description ? (
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
              {dish.description}
            </Text>
          ) : null}
        </View>
        <Text className={`text-lg font-bold tabular-nums ${colors.score}`}>
          {formatScore(dish.score)}/10
        </Text>
      </View>

      <Text className="text-sm text-gray-700 leading-relaxed">{dish.explanation}</Text>

      {dish.substitution ? (
        <View className="mt-3 bg-white/70 rounded-xl p-3">
          <Text className="text-xs font-semibold text-gray-600 mb-0.5">
            💡 Make it better
          </Text>
          <Text className="text-xs text-gray-600 leading-relaxed">
            {dish.substitution}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
