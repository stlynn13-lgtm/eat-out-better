import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { useAnalysisStore } from "../store/useAnalysisStore";
import type { RankedDish, UnreadableItem, UnrankedItem, DishCategory } from "@eat-out-better/shared";

/**
 * The positive badge is COMPARATIVE — "best in its group" — not an endorsement.
 * The card's tier colour still says how good that best actually is, so a
 * "Best Main" on an amber card reads honestly on a menu with no great entrée.
 */
const BEST_IN_CATEGORY_LABEL: Partial<Record<DishCategory, string>> = {
  main: "Best Main",
  side: "Best Side",
  dessert: "Best Dessert",
  drink_non_alcoholic: "Best Drink",
};
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
        <Text className="text-base text-gray-500 text-center mb-8 leading-relaxed">
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

  if (!session && status !== "complete") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500 text-sm">Loading results…</Text>
      </SafeAreaView>
    );
  }

  const dishes = results ?? [];
  const unreadable: UnreadableItem[] = session?.unreadableItems ?? [];
  const unranked: UnrankedItem[] = session?.unrankedItems ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FlatList
        data={dishes}
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
              <Text className="text-xl font-bold text-gray-900">
                {dishes.length > 0 ? "Menu Results" : "We couldn't read your menu"}
              </Text>
              {dishes.length > 0 ? (
                <View className="bg-gray-100 rounded-full px-2.5 py-1">
                  <Text className="text-xs font-semibold text-gray-700">
                    {dishes.length} dish{dishes.length !== 1 ? "es" : ""}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-base text-gray-500">
              {dishes.length > 0
                ? "Ranked best to worst for your heart"
                : "We couldn't confidently read any dishes from your photos."}
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
        ListFooterComponent={
          unranked.length > 0 || unreadable.length > 0 ? (
            <>
              {unranked.length > 0 ? <UnrankedSection items={unranked} /> : null}
              {unreadable.length > 0 ? <UnreadableSection items={unreadable} /> : null}
            </>
          ) : null
        }
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
                  {dish.tag === "best-in-category"
                    ? BEST_IN_CATEGORY_LABEL[dish.category] ?? "Best Choice"
                    : "Enjoy Occasionally"}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-base font-semibold text-gray-900">{dish.name}</Text>
          {dish.description ? (
            <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={2}>
              {dish.description}
            </Text>
          ) : null}
        </View>
        <Text className={`text-lg font-bold tabular-nums ${colors.score}`}>
          {formatScore(dish.score)}/10
        </Text>
      </View>

      <Text className="text-base text-gray-700 leading-relaxed">{dish.explanation}</Text>

      {dish.substitution ? (
        <View className="mt-3 bg-white/70 rounded-xl p-3">
          <Text className="text-xs font-semibold text-gray-600 mb-0.5">
            💡 Make it better
          </Text>
          <Text className="text-sm text-gray-600 leading-relaxed">
            {dish.substitution}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Items read off the menu but deliberately not scored — alcohol, standalone
 * sauces (EAT-20). Minimal on purpose: the grouped results layout is a separate
 * design conversation. What this must NOT do is nothing, because the API now
 * filters these out of the ranked list, and showing neither list nor
 * explanation would silently drop items off the user's menu — the exact bug
 * EAT-9 and EAT-19 were both about, and the invariant this app promises is that
 * what you see equals what was read.
 */
function UnrankedSection({ items }: { items: UnrankedItem[] }) {
  const reasons = [...new Set(items.map((i) => i.reason))];
  return (
    <View className="mt-6">
      <Text className="text-base font-bold text-gray-900 mb-1">
        Not scored
      </Text>
      <Text className="text-sm text-gray-500 mb-3 leading-relaxed">
        {reasons.join(" ")} They're on your menu, so they're listed here.
      </Text>
      {items.map((item) => (
        <View
          key={item.name}
          className="mb-2 rounded-xl border border-gray-200 bg-white p-3"
        >
          <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
          {item.description ? (
            <Text className="text-sm text-gray-500 mt-0.5 leading-relaxed">
              {item.description}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function UnreadableSection({ items }: { items: UnreadableItem[] }) {
  return (
    <View className="mt-6">
      <Text className="text-base font-bold text-gray-900 mb-1">
        Couldn't read these
      </Text>
      {/* Body copy here matches the EAT-15 reading scale (text-base primary,
          text-sm secondary). This section was added after EAT-15 landed and
          came in a step small — the audience is people squinting at a menu in
          dim restaurant light, and this is the copy telling them what we got
          wrong, so it is the last place to shrink text. */}
      <Text className="text-sm text-gray-500 mb-3 leading-relaxed">
        We weren't sure what these said, so we didn't rank them. Here's our best
        guess at the text — double-check the menu yourself.
      </Text>
      {items.map((item, index) => (
        <View
          key={`${item.text}-${index}`}
          className="rounded-2xl border border-gray-200 bg-white p-4 mb-3"
        >
          <Text className="text-base font-semibold text-gray-800">
            "{item.text}"
          </Text>
          <Text className="text-sm text-gray-500 mt-1 leading-relaxed">
            {item.reason
              ? `${item.reason} — can't be ranked.`
              : "We couldn't confidently identify this item, so it can't be ranked."}
          </Text>
        </View>
      ))}
    </View>
  );
}
