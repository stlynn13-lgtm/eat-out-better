import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, ScrollView, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { useAnalysisStore } from "../store/useAnalysisStore";
import type {
  RankedDish,
  UnreadableItem,
  UnrankedItem,
  DishCategory,
  MenuSession,
} from "@eat-out-better/shared";
import RenameSheet from "../components/RenameSheet";
import { scanName } from "../lib/utils/scanDisplay";

/**
 * The positive badge is COMPARATIVE — "best in its group" — not an endorsement.
 * The card's tier colour still says how good that best actually is, so a
 * "Best Main" on an amber card reads honestly on a menu with no great entrée.
 */
const BEST_IN_CATEGORY_LABEL: Partial<Record<DishCategory, string>> = {
  main: "Best Main",
  appetizer: "Best Appetizer",
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
  trackFeedbackRatingSubmitted,
} from "../lib/analytics";
import FeedbackSheet from "../components/FeedbackSheet";
import SaveScansPrompt from "../components/SaveScansPrompt";
import { TERMS_URL, PRIVACY_URL } from "../lib/legal";

/**
 * Five faces so the inline row maps 1:1 onto the sheet's five stars — tapping
 * the third face opens the sheet on three stars. A four-face row would have to
 * guess at the translation.
 */
const HELPFUL_FACES = [
  { emoji: "😞", value: 1 },
  { emoji: "😕", value: 2 },
  { emoji: "😐", value: 3 },
  { emoji: "🙂", value: 4 },
  { emoji: "😍", value: 5 },
] as const;

/**
 * Category tabs (1.5.0). The list used to be one long run — mains, then sides,
 * then desserts, then drinks, each restarting at #1 with nothing marking where
 * one stopped. Someone deciding on a starter had to scroll past every entrée.
 *
 * "All" stays the default and still shows everything that was read, so the
 * promise that what you see equals what was on the menu (EAT-9) holds on the
 * screen people land on. The other tabs are filters over that same list.
 */
type TabKey = "all" | "main" | "appetizer" | "side" | "dessert" | "drink";

const TABS: readonly { key: TabKey; label: string; heading: string; empty: string }[] = [
  { key: "all", label: "All", heading: "", empty: "" },
  { key: "main", label: "Entrées", heading: "Entrées", empty: "No entrées were found on this menu." },
  {
    key: "appetizer",
    label: "Appetizers",
    heading: "Appetizers",
    empty: "No appetizers section was found on this menu.",
  },
  { key: "side", label: "Sides", heading: "Sides", empty: "No sides were found on this menu." },
  { key: "dessert", label: "Desserts", heading: "Desserts", empty: "No desserts were found on this menu." },
  { key: "drink", label: "Drinks", heading: "Drinks", empty: "No drinks were found on this menu." },
];

/**
 * Which tab an item sits under. Scans saved before categories existed have no
 * category at all — they are mains, which is what the API assumed then too.
 * Alcohol and sauces aren't scored, but they still belong somewhere a person
 * would look for them.
 */
function tabFor(category: DishCategory | undefined): Exclude<TabKey, "all"> {
  switch (category) {
    case "appetizer":
      return "appetizer";
    case "side":
    case "condiment":
      return "side";
    case "dessert":
      return "dessert";
    case "drink_non_alcoholic":
    case "drink_alcoholic":
      return "drink";
    default:
      return "main";
  }
}

type Row =
  | { type: "heading"; key: string; label: string; count: number }
  | { type: "dish"; key: string; dish: RankedDish; rank: number };

export default function ResultsScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  /**
   * This screen renders two different things: the scan you just ran, and a
   * saved scan reopened from history. They look identical and they are NOT
   * analytically identical.
   *
   * `getCurrentScanSessionId()` is a module-level value set once per scan
   * attempt. Reopened from history there is no current scan, so it holds
   * whichever scan ran last — or nothing at all on a cold start. Reading it
   * here attributed a rating of a three-day-old menu to this afternoon's scan,
   * silently, in the one funnel the analytics work exists to measure.
   *
   * So: from history, the scan session id is genuinely UNKNOWN. Send nothing
   * rather than something wrong, and mark the screen so the two cases stay
   * separable in PostHog instead of being averaged together.
   */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromHistory = from === "history";
  const feedbackScreen = fromHistory ? "results_history" : "results";
  const scanSessionId = fromHistory ? undefined : (getCurrentScanSessionId() ?? undefined);
  const { results, session, status, error, reset, clearError, updateSession, requestNewScan } =
    useAnalysisStore();
  const [tab, setTab] = useState<TabKey>("all");
  const [renaming, setRenaming] = useState<MenuSession | null>(null);
  const listRef = useRef<FlatList<Row>>(null);
  // Set when "Analyze New Menu" hands off to the capture screen underneath.
  // From then on this screen is on its way out and must not react to anything.
  const leavingRef = useRef(false);
  const [showFeedback, setShowFeedback] = useState(false);
  // "scan" = the per-menu prompt (stars required); "general" = the footer link.
  const [feedbackVariant, setFeedbackVariant] = useState<"general" | "scan">("general");
  const [inlineRating, setInlineRating] = useState<number | null>(null);
  // The one-time "keep this scan safe" card grows the action bar; the list
  // grows its bottom padding to match so nothing hides behind it.
  const [savePromptVisible, setSavePromptVisible] = useState(false);

  useEffect(() => {
    if (leavingRef.current) return;
    if (!results && status !== "complete") {
      router.replace("/capture");
    }
  }, [results, status, router]);

  // The store is cleared only once this screen is really gone. Clearing it
  // while the screen is still sliding away blanks the results mid-animation.
  useEffect(
    () => () => {
      if (leavingRef.current) reset();
    },
    [reset]
  );

  const dishes = useMemo(() => results ?? [], [results]);
  const unreadable: UnreadableItem[] = session?.unreadableItems ?? [];
  const unranked: UnrankedItem[] = useMemo(() => session?.unrankedItems ?? [], [session]);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: dishes.length + unranked.length,
      main: 0,
      appetizer: 0,
      side: 0,
      dessert: 0,
      drink: 0,
    };
    for (const d of dishes) c[tabFor(d.category)] += 1;
    for (const u of unranked) c[tabFor(u.category)] += 1;
    return c;
  }, [dishes, unranked]);

  // The five Sean asked for are always there, so the bar looks the same on
  // every menu; Sides appears only when a menu has them.
  const tabs = useMemo(() => TABS.filter((t) => t.key !== "side" || counts.side > 0), [counts]);

  const rows = useMemo<Row[]>(() => {
    const toRow = (dish: RankedDish, index: number): Row => ({
      type: "dish",
      key: dish.id,
      dish,
      // Server ranks are sequential within a category as of build 6; fall back
      // to position for sessions saved by older builds.
      rank: dish.rank ?? index + 1,
    });
    if (tab !== "all") {
      return dishes.filter((d) => tabFor(d.category) === tab).map(toRow);
    }
    const groups = TABS.filter((t) => t.key !== "all")
      .map((t) => ({ t, items: dishes.filter((d) => tabFor(d.category) === t.key) }))
      .filter((g) => g.items.length > 0);
    // One group needs no heading — it would only repeat the screen's title.
    if (groups.length <= 1) return dishes.map(toRow);
    return groups.flatMap(({ t, items }) => [
      { type: "heading", key: `heading-${t.key}`, label: t.heading, count: items.length } as Row,
      ...items.map(toRow),
    ]);
  }, [dishes, tab]);

  const unrankedHere = tab === "all" ? unranked : unranked.filter((u) => tabFor(u.category) === tab);

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

  const name = scanName(session);
  const selectTab = (next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  // One tap records the rating on its own, so we still learn something from the
  // large majority who won't fill in a whole sheet. The sheet then opens
  // pre-filled for anyone willing to say more.
  const handleFaceTap = (value: number) => {
    setInlineRating(value);
    if (posthog) trackFeedbackRatingSubmitted(posthog, feedbackScreen, value);
    setFeedbackVariant("scan");
    setShowFeedback(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Fixed above the list, so the tabs stay reachable however far down a
          long menu you are. */}
      <View className="px-5 pt-3">
        {/* Back pops to the capture screen the user came from — it's still
            mounted below us with its photos loaded (EAT-11). Going home
            requires a second back from there, matching the app hierarchy. */}
        <TouchableOpacity
          className="w-9 h-9 items-center justify-center rounded-full bg-gray-100 mb-3"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/capture");
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={fromHistory ? "Back to saved scans" : "Back to menu photos"}
        >
          <Text className="text-gray-600 text-base">←</Text>
        </TouchableOpacity>

        {dishes.length > 0 ? (
          // The title IS the restaurant, and tapping it renames the scan. With
          // no name yet it says what the screen is and offers to add one.
          <TouchableOpacity
            className="flex-row items-center"
            style={{ minHeight: 44 }}
            onPress={() => session && setRenaming(session)}
            disabled={!session}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              name ? `${name}. Rename this menu.` : "Menu results. Add the restaurant's name."
            }
          >
            <View className="flex-1">
              {name ? (
                <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Menu results
                </Text>
              ) : null}
              <Text className="text-2xl font-bold text-gray-900" numberOfLines={2}>
                {name ?? "Menu Results"}
              </Text>
            </View>
            <View
              className={`flex-row items-center justify-center rounded-full ml-3 ${
                name ? "bg-gray-100" : "bg-green-50 border border-green-200 px-3"
              }`}
              style={{ minWidth: 36, height: 36 }}
            >
              <Ionicons name="pencil" size={name ? 16 : 14} color={name ? "#4B5563" : "#1B4332"} />
              {name ? null : (
                <Text className="text-sm font-semibold text-brand-900 ml-1">Name it</Text>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <Text className="text-xl font-bold text-gray-900">We couldn't read your menu</Text>
        )}
      </View>

      {dishes.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}
            accessibilityRole="tablist"
          >
            {tabs.map((t) => {
              const selected = t.key === tab;
              const count = counts[t.key];
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => selectTab(t.key)}
                  className={`flex-row items-center rounded-full px-4 border ${
                    selected ? "bg-brand-900 border-brand-900" : "bg-white border-gray-200"
                  }`}
                  style={{ height: 40 }}
                  hitSlop={{ top: 4, bottom: 4 }}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${t.label}, ${count} ${count === 1 ? "item" : "items"}`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? "text-white" : count === 0 ? "text-gray-500" : "text-gray-800"
                    }`}
                  >
                    {t.label}
                  </Text>
                  <Text
                    className={`text-xs font-semibold ml-1.5 tabular-nums ${
                      selected ? "text-green-100" : "text-gray-500"
                    }`}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View className="h-px bg-gray-200" />
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          // Clears the absolutely-positioned action bar plus the helpful-rating
          // card now sitting at the end of the list.
          paddingBottom: savePromptVisible ? 290 : 130,
        }}
        ListHeaderComponent={
          <View className="mb-4">
            <Text className="text-base text-gray-500">
              {dishes.length > 0
                ? `${dishes.length} dish${dishes.length !== 1 ? "es" : ""} · ranked best to worst for your heart`
                : "We couldn't confidently read any dishes from your photos."}
            </Text>
            {session?.processingTimeMs ? (
              <Text className="text-xs text-gray-500 mt-1">
                Analyzed in {(session.processingTimeMs / 1000).toFixed(1)}s
              </Text>
            ) : null}
            {/* The disclaimer belongs HERE, not only on the welcome and info
                screens. This is the one screen where someone is actually
                choosing what to order, and it is the screen App Store
                Guideline 1.4.1 is about. It sits above the first dish card so
                it lands in the first frame without scrolling. */}
            {dishes.length > 0 ? (
              <Text className="text-sm text-gray-600 leading-relaxed mt-3">
                Scores are estimates read from the menu text, not medical advice —
                check with your doctor about your own needs.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) =>
          item.type === "heading" ? (
            <View className={`flex-row items-baseline mb-3 ${index === 0 ? "" : "mt-6"}`}>
              <Text className="text-lg font-bold text-gray-900" accessibilityRole="header">
                {item.label}
              </Text>
              <Text className="text-sm text-gray-500 ml-2 tabular-nums">{item.count}</Text>
            </View>
          ) : (
            <View className="mb-3">
              <DishCard dish={item.dish} rank={item.rank} />
            </View>
          )
        }
        ListEmptyComponent={
          // A tab with nothing in it says so, rather than showing a blank list
          // that looks like it failed to load. (Never shown on "All" when the
          // menu has dishes; the unreadable-only case has its own title above.)
          tab !== "all" && unrankedHere.length === 0 ? (
            <View className="items-center py-10 px-6">
              <Ionicons name="restaurant-outline" size={28} color="#6B7280" />
              <Text className="text-base text-gray-600 text-center mt-3 leading-relaxed">
                {TABS.find((t) => t.key === tab)?.empty}
              </Text>
              <TouchableOpacity
                className="items-center justify-center mt-2"
                style={{ minHeight: 44 }}
                onPress={() => selectTab("all")}
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-brand-900">See everything</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {unrankedHere.length > 0 ? <UnrankedSection items={unrankedHere} /> : null}
            {tab === "all" && unreadable.length > 0 ? (
              <UnreadableSection items={unreadable} />
            ) : null}
            {/* Asked at the end of the list rather than as a popup over the
                results — the user just waited 20 seconds for these, so nothing
                covers them uninvited. */}
            <HelpfulRating selected={inlineRating} onSelect={handleFaceTap} />
          </>
        }
      />

      <View
        className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3"
        style={{ backgroundColor: "rgba(249,250,251,0.97)" }}
      >
        <SaveScansPrompt
          eligible={!fromHistory && dishes.length > 0}
          onVisibleChange={setSavePromptVisible}
        />
        <TouchableOpacity
          className="w-full border-2 border-gray-300 rounded-xl py-4 items-center"
          onPress={() => {
            // Empty from history: you did come from *a* scan, but its
            // analytics id was never persisted with the session, so it is
            // unknown rather than "the last one that ran".
            const previousSessionId = fromHistory ? "" : (getCurrentScanSessionId() ?? "");
            const newSessionId = generateId();
            setCurrentScanSessionId(newSessionId);
            if (posthog) trackNewScanInitiated(posthog, previousSessionId, newSessionId);
            // A scan you just ran has the capture screen that produced it
            // still underneath, photos and all (that's what makes Back work).
            // Go back to THAT screen and have it start over, rather than
            // stacking a second, empty capture on top of it — which is what
            // this used to do, and why pressing Back on the new scan showed
            // the previous menu's photos sitting in the tray.
            if (!fromHistory && router.canGoBack()) {
              leavingRef.current = true;
              requestNewScan(newSessionId);
              router.back();
              return;
            }
            // Opened from Saved scans (or with nothing underneath): there is no
            // capture screen to reuse. Use replace (not push) so results is
            // removed from the stack before reset() clears the store —
            // otherwise results stays mounted, its guard fires on the cleared
            // state, and capture mounts twice.
            router.replace(`/capture?entry=loop_back&sid=${newSessionId}`);
            reset();
          }}
          activeOpacity={0.8}
        >
          <Text className="text-gray-700 font-semibold">Analyze New Menu</Text>
        </TouchableOpacity>

        <View className="flex-row flex-wrap items-center justify-center gap-2 mt-3">
          <TouchableOpacity
            onPress={() => {
              setFeedbackVariant("general");
              setShowFeedback(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Send feedback"
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text className="text-xs text-gray-600 underline">Feedback</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-300">·</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(TERMS_URL)}
            accessibilityRole="link"
            accessibilityLabel="Read the Terms of Service. Opens in your browser."
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text className="text-xs text-gray-600 underline">Terms</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-300">·</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Read the Privacy Policy. Opens in your browser."
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text className="text-xs text-gray-600 underline">Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <RenameSheet
        session={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={updateSession}
      />

      <FeedbackSheet
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen={feedbackScreen}
        variant={feedbackVariant}
        initialRating={feedbackVariant === "scan" ? inlineRating : null}
        scanSessionId={scanSessionId}
        dishCount={dishes.length}
      />
    </SafeAreaView>
  );
}

function HelpfulRating({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (value: number) => void;
}) {
  return (
    <View className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="text-base font-semibold text-gray-900 text-center mb-1">
        Was this analysis helpful?
      </Text>
      <Text className="text-xs text-gray-500 text-center mb-3">
        {selected !== null
          ? "Thanks — tap another face to change your answer."
          : "One tap. It's how we know the scores are landing."}
      </Text>
      <View className="flex-row items-center justify-center gap-2">
        {HELPFUL_FACES.map(({ emoji, value }) => {
          const isSelected = selected === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => onSelect(value)}
              accessibilityRole="button"
              accessibilityLabel={`Rate this analysis ${value} out of 5`}
              accessibilityState={{ selected: isSelected }}
              className="rounded-full items-center justify-center"
              style={{
                width: 52,
                height: 52,
                backgroundColor: isSelected ? "#e0f2e8" : "#f3f4f6",
                borderWidth: isSelected ? 1.5 : 0,
                borderColor: "#2a6041",
              }}
            >
              {/* Unselected faces are dimmed rather than greyed out — emoji
                  ignore tintColor, so opacity is the only lever. */}
              <Text style={{ fontSize: 26, opacity: selected === null || isSelected ? 1 : 0.4 }}>
                {emoji}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
            <Text className="text-xs font-medium text-gray-600">#{rank}</Text>
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
