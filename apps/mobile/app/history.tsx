import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MenuSession, RankedDish } from "@eat-out-better/shared";
import { formatScore } from "@eat-out-better/shared";
import { useAnalysisStore } from "../store/useAnalysisStore";
import {
  getSessions,
  clearSessions,
  HISTORY_DISPLAY_LIMIT,
} from "../lib/storage/session";

/**
 * Saved scans.
 *
 * Every scan since launch has been written to AsyncStorage and, until now,
 * never read back — `getSessions()` had no UI caller at all. This screen is
 * the cheapest product win in the repo: the data already exists on every
 * tester's device.
 *
 * It needs no account and no server, and it is what `monetization-strategy.md`
 * plans to sell, so it is worth getting right before anything is charged for.
 */

const TIER_DOT: Record<string, string> = {
  green: "bg-score-green",
  yellow: "bg-score-yellow",
  red: "bg-score-red",
};

/** "Today" / "Yesterday" / "12 Mar" — a scan is remembered by when you ate. */
function formatWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);

  if (days === 0) {
    return `Today, ${then.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The best-ranked dish, which is what the user actually remembers the scan by. */
function topDish(session: MenuSession): RankedDish | null {
  if (!Array.isArray(session.dishes) || session.dishes.length === 0) return null;
  return session.dishes.reduce((best, d) => (d.rank < best.rank ? d : best));
}

export default function HistoryScreen() {
  const router = useRouter();
  const setResults = useAnalysisStore((s) => s.setResults);
  const [sessions, setSessions] = useState<MenuSession[] | null>(null);

  // Reload on focus rather than on mount: coming back from a scan should show
  // it, and this screen is cheap enough that re-reading is free.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessions().then((stored) => {
        if (active) setSessions(stored);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const openSession = (session: MenuSession) => {
    // Reuse the results screen wholesale rather than building a second
    // renderer that would drift from it. `setResults` populates exactly what
    // results.tsx reads (status "complete", dishes, session).
    setResults(session);
    router.push("/results");
  };

  const confirmClear = () => {
    Alert.alert(
      "Clear scan history?",
      "This removes every saved scan from this phone. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearSessions();
              setSessions([]);
            } catch {
              Alert.alert(
                "Couldn't clear history",
                "Your saved scans are still here. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const visible = sessions?.slice(0, HISTORY_DISPLAY_LIMIT) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text className="text-base text-brand-900">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Saved scans</Text>
        {/* Balances the back button so the title stays optically centred. */}
        <View className="w-14 items-end">
          {visible.length > 0 && (
            <TouchableOpacity
              onPress={confirmClear}
              accessibilityRole="button"
              accessibilityLabel="Clear all saved scans"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text className="text-sm text-gray-500">Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {sessions === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1B4332" />
        </View>
      ) : visible.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-4">
            <Text className="text-3xl">📖</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
            No saved scans yet
          </Text>
          <Text className="text-base text-gray-600 text-center leading-relaxed mb-8">
            Every menu you scan is saved here automatically, so you can look it
            up again next time you're at the same place.
          </Text>
          <TouchableOpacity
            className="bg-brand-900 rounded-xl py-4 px-8 items-center"
            onPress={() => router.push("/capture")}
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold text-base">Scan a menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const best = topDish(item);
            return (
              <TouchableOpacity
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
                onPress={() => openSession(item)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Scan from ${formatWhen(item.createdAt)}, ${item.dishCount} dishes. Open it.`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm text-gray-500">{formatWhen(item.createdAt)}</Text>
                  <Text className="text-sm text-gray-400">
                    {item.dishCount} {item.dishCount === 1 ? "dish" : "dishes"}
                  </Text>
                </View>

                {best ? (
                  <View className="flex-row items-center mt-1">
                    <View
                      className={`w-2.5 h-2.5 rounded-full mr-2 ${TIER_DOT[best.tier] ?? "bg-gray-300"}`}
                    />
                    <Text
                      className="text-base font-semibold text-gray-900 flex-1"
                      numberOfLines={1}
                    >
                      {best.name}
                    </Text>
                    <Text className="text-sm font-semibold text-gray-700 ml-2">
                      {formatScore(best.score)}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-base text-gray-500 mt-1">No dishes scored</Text>
                )}

                <Text className="text-xs text-gray-400 mt-2">Top pick from this menu</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
