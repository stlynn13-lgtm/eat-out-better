import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MenuSession } from "@eat-out-better/shared";
import { formatScore } from "@eat-out-better/shared";
import { useAnalysisStore } from "../store/useAnalysisStore";
import {
  getSessions,
  clearSessions,
  HISTORY_DISPLAY_LIMIT,
} from "../lib/storage/session";
import { useAuth } from "../lib/auth/account";
import { Ionicons } from "@expo/vector-icons";
import Reveal from "../components/Reveal";
import PressableScale from "../components/PressableScale";
import RenameSheet from "../components/RenameSheet";
import { ScanStack, StatTile } from "../components/ScanArt";
import {
  scanName,
  topDish,
  tierCounts,
  historyStats,
  tileColor,
  monogram,
  UNNAMED_SCAN,
} from "../lib/utils/scanDisplay";

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
 *
 * Redesigned for 1.5.0 from Sean's feedback that it was flat and the scans
 * were hard to tell apart: each scan now leads with the restaurant's name
 * (read off the menu, or typed by the user — tap the pencil), a coloured
 * monogram, and a green/yellow/red bar showing how the whole menu scored. A
 * stats row on top makes the collection feel like something you're building.
 */

const TIER_DOT: Record<string, string> = {
  green: "bg-score-green",
  yellow: "bg-score-yellow",
  red: "bg-score-red",
};

const TIER_HEX = { green: "#16a34a", yellow: "#d97706", red: "#dc2626" } as const;

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

/** Only the first screenful rises into place; the rest is already there. */
const STAGGERED_ROWS = 6;

export default function HistoryScreen() {
  const router = useRouter();
  const setResults = useAnalysisStore((s) => s.setResults);
  const [sessions, setSessions] = useState<MenuSession[] | null>(null);
  const [renaming, setRenaming] = useState<MenuSession | null>(null);
  const accountsOn = useAuth((s) => s.status !== "unavailable");
  const signedIn = useAuth((s) => s.userId !== null && !s.isAnonymous);
  // The entrance plays once per visit. FlatList recycles rows, and a card that
  // re-animated every time it scrolled back into view would read as a glitch.
  const entranceDone = useRef(false);

  // Reload on focus rather than on mount: coming back from a scan should show
  // it, and this screen is cheap enough that re-reading is free.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessions().then((stored) => {
        if (active) setSessions(stored);
      });
      const timer = setTimeout(() => {
        entranceDone.current = true;
      }, 900);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [])
  );

  const openSession = (session: MenuSession) => {
    // Reuse the results screen wholesale rather than building a second
    // renderer that would drift from it. `setResults` populates exactly what
    // results.tsx reads (status "complete", dishes, session).
    setResults(session);
    // `?from=history` is load-bearing, not cosmetic. results.tsx reads a
    // module-level "current scan session id" for its analytics, and a session
    // opened from here has no current scan — without this flag it would
    // attribute feedback to whichever scan happened last, or to nothing at all
    // on a cold start. Same pattern capture.tsx already uses for `entry`/`sid`.
    router.push("/results?from=history");
  };

  const confirmClear = () => {
    Alert.alert(
      "Clear scan history?",
      accountsOn
        ? "This removes every saved scan from this phone and from your account. It can't be undone."
        : "This removes every saved scan from this phone. It can't be undone.",
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

  const visible = useMemo(() => sessions?.slice(0, HISTORY_DISPLAY_LIMIT) ?? [], [sessions]);
  const stats = useMemo(() => historyStats(sessions ?? []), [sessions]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* The "?" button floats over the top-right corner of every screen, so
          nothing of this screen's own lives there (Clear used to, underneath
          it). Clear now sits at the end of the list, away from everything. */}
      <View className="flex-row items-center px-5 pt-2 pb-1" style={{ minHeight: 44 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text className="text-base text-brand-900">‹ Back</Text>
        </TouchableOpacity>
      </View>

      {sessions === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1B4332" />
        </View>
      ) : visible.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Reveal>
            <View className="items-center">
              <ScanStack />
            </View>
          </Reveal>
          <Reveal delay={120}>
            <Text
              className="text-2xl font-bold text-gray-900 mt-8 mb-2 text-center"
              accessibilityRole="header"
            >
              Your menus will live here
            </Text>
            <Text className="text-base text-gray-600 text-center leading-relaxed mb-8">
              Every menu you scan is saved automatically, so the next time
              you're at the same place your picks are already waiting.
            </Text>
            <TouchableOpacity
              className="bg-brand-900 rounded-xl items-center justify-center flex-row self-center px-8"
              style={{ height: 52 }}
              onPress={() => router.push("/capture")}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base ml-2">Scan your first menu</Text>
            </TouchableOpacity>
          </Reveal>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="mb-2">
              <Reveal>
                <Text className="text-3xl font-bold text-gray-900" accessibilityRole="header">
                  Saved scans
                </Text>
                <Text className="text-base text-gray-600 mt-1">
                  {stats.scans === 1
                    ? "Your first menu, ready for next time."
                    : `${stats.scans} menus, ready for next time.`}
                </Text>
              </Reveal>

              <Reveal delay={70}>
                <View className="flex-row mt-4" style={{ gap: 10 }}>
                  <StatTile value={stats.scans} label={stats.scans === 1 ? "menu" : "menus"} />
                  <StatTile value={stats.dishes} label="dishes scored" />
                  <StatTile value={stats.greens} label="green picks" />
                </View>
              </Reveal>

              {accountsOn && !signedIn ? (
                // The quiet, permanent way in once the one-time post-scan card
                // has been answered. Everything on this screen is what an
                // account would back up, so this is where the offer makes sense.
                <Reveal delay={140}>
                  <TouchableOpacity
                    className="flex-row items-center bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mt-4"
                    style={{ minHeight: 56 }}
                    onPress={() => router.push("/account?from=history")}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Back up your saved scans with a free account"
                  >
                    <Ionicons name="cloud-upload-outline" size={22} color="#1B4332" />
                    <View className="flex-1 ml-3">
                      <Text className="text-base font-semibold text-brand-900">
                        Back up your saved scans
                      </Text>
                      <Text className="text-sm text-gray-700">Free account · no password</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#1B4332" />
                  </TouchableOpacity>
                </Reveal>
              ) : null}

              <View className="h-4" />
            </View>
          }
          renderItem={({ item, index }) => {
            const card = (
              <ScanCard
                session={item}
                onOpen={() => openSession(item)}
                onRename={() => setRenaming(item)}
              />
            );
            return index < STAGGERED_ROWS && !entranceDone.current ? (
              <Reveal delay={200 + index * 50}>{card}</Reveal>
            ) : (
              card
            );
          }}
          ListFooterComponent={
            // Destructive, so it is kept apart from the cards and from the
            // header, and is the last thing on the screen.
            <TouchableOpacity
              className="items-center justify-center mt-4"
              style={{ minHeight: 48 }}
              onPress={confirmClear}
              accessibilityRole="button"
              accessibilityLabel="Clear all saved scans"
            >
              <Text className="text-sm font-semibold text-gray-600">Clear all saved scans</Text>
            </TouchableOpacity>
          }
        />
      )}

      <RenameSheet
        session={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={(updated) =>
          setSessions((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? prev)
        }
      />
    </SafeAreaView>
  );
}

function ScanCard({
  session,
  onOpen,
  onRename,
}: {
  session: MenuSession;
  onOpen: () => void;
  onRename: () => void;
}) {
  const name = scanName(session);
  const best = topDish(session);
  const counts = tierCounts(session);
  const scored = counts.green + counts.yellow + counts.red;
  const when = formatWhen(session.createdAt);
  const letter = monogram(name);
  const dishLabel = `${session.dishCount} ${session.dishCount === 1 ? "dish" : "dishes"}`;

  return (
    <PressableScale
      className="bg-white rounded-3xl p-4 mb-3 border border-gray-100"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${name ?? UNNAMED_SCAN}, ${when}, ${dishLabel}. ${counts.green} green, ${counts.yellow} yellow, ${counts.red} red. Open it.`}
    >
      <View className="flex-row items-center">
        <View
          className="items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: name ? tileColor(session.id) : "#E5E7EB",
          }}
          accessible={false}
        >
          {letter ? (
            <Text className="text-white text-xl font-bold">{letter}</Text>
          ) : (
            <Ionicons name="restaurant-outline" size={22} color="#4B5563" />
          )}
        </View>

        <View className="flex-1 ml-3">
          <Text
            className={`text-lg font-bold ${name ? "text-gray-900" : "text-gray-600"}`}
            numberOfLines={2}
          >
            {name ?? UNNAMED_SCAN}
          </Text>
          <Text className="text-sm text-gray-600 mt-0.5">
            {when} · {dishLabel}
          </Text>
        </View>

        {/* Its own target inside the card: the card opens the scan, this names
            it. An unnamed scan spells the action out; a named one needs only
            the pencil. */}
        <TouchableOpacity
          onPress={onRename}
          className={`flex-row items-center justify-center rounded-full ml-2 ${
            name ? "" : "bg-green-50 border border-green-200 px-3"
          }`}
          style={{ minWidth: 44, height: 44 }}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={name ? `Rename ${name}` : "Add the restaurant's name"}
        >
          <Ionicons name="pencil" size={name ? 18 : 14} color={name ? "#4B5563" : "#1B4332"} />
          {name ? null : <Text className="text-sm font-semibold text-brand-900 ml-1">Name</Text>}
        </TouchableOpacity>
      </View>

      {scored > 0 ? (
        <>
          {/* How the whole menu scored, at a glance. The counts underneath say
              the same thing in words, so the bar never relies on colour alone. */}
          <View
            className="flex-row rounded-full overflow-hidden mt-4"
            style={{ height: 8, gap: 2 }}
            accessible={false}
          >
            {(["green", "yellow", "red"] as const).map((tier) =>
              counts[tier] > 0 ? (
                <View
                  key={tier}
                  style={{ flex: counts[tier], backgroundColor: TIER_HEX[tier], borderRadius: 4 }}
                />
              ) : null
            )}
          </View>
          <Text className="text-xs text-gray-600 mt-1.5" accessible={false}>
            {counts.green} green · {counts.yellow} yellow · {counts.red} red
          </Text>
        </>
      ) : null}

      <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
        {best ? (
          <>
            <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wider mr-2">
              Top pick
            </Text>
            <View
              className={`w-2.5 h-2.5 rounded-full mr-1.5 ${TIER_DOT[best.tier] ?? "bg-gray-300"}`}
            />
            <Text className="text-sm font-semibold text-gray-900 flex-1" numberOfLines={1}>
              {best.name}
            </Text>
            <Text className="text-sm font-bold text-gray-800 ml-2 tabular-nums">
              {formatScore(best.score)}
            </Text>
          </>
        ) : (
          <Text className="text-sm text-gray-600 flex-1">No dishes scored</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color="#6B7280" style={{ marginLeft: 6 }} />
      </View>
    </PressableScale>
  );
}
