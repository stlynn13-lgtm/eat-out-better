import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * "What goes into your score" — presented as a slide-up sheet (presentation:
 * "modal" in _layout.tsx), reachable from the global ScoringInfoButton on
 * every screen except processing/how-it-works/itself. Plain-English version
 * of RANKING_SYSTEM_BASE in apps/api/src/lib/claude/prompts.ts.
 */
export default function ScoringExplainedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">What goes into your score</Text>
        <TouchableOpacity
          className="px-3 py-1.5 rounded-full bg-gray-100"
          onPress={() => router.back()}
        >
          <Text className="text-gray-700 text-sm font-medium">Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-base text-gray-500 leading-relaxed mb-6">
          Every score comes down to one question: how is this dish likely to
          affect your cholesterol? Here's what we weigh, in plain terms.
        </Text>

        <Factor
          emoji="🧈"
          title="Saturated fat is the main lever"
          body={`We estimate a dish's saturated fat and measure it against about 13g — a full day's heart-healthy budget from the American Heart Association. A dish that blows past that in one sitting scores low; a dish with just a little scores high.`}
        />
        <Factor
          emoji="🔍"
          title="We read between the lines"
          body={`Menus rarely list cream, butter, or coconut milk by name. We infer likely hidden fat from the dish itself — a curry, an alfredo, anything "crispy" — even if the menu calls it fresh or a salad.`}
        />
        <Factor
          emoji="🐟"
          title="Good fats and fiber can raise a score"
          body={`Omega-3s, olive oil, avocado, beans, and other fiber-rich or unsaturated-fat ingredients actively help your cholesterol, so they can lift a score even when a dish isn't low-fat. That's why grilled salmon can outscore a "light" salad drowning in dressing.`}
        />
        <Factor
          emoji="🍳"
          title="How it's cooked matters, a little"
          body="Fried or breaded dishes score a bit lower for the extra fat that cooking method adds. Grilled, baked, steamed, or poached is neutral to favorable."
        />
        <Factor
          emoji="✅"
          title="Two things we don't over-penalize"
          body={`Trans fat has been banned in U.S. restaurants since 2018–2021, so "fried" no longer automatically means trans fat. And current guidelines no longer treat dietary cholesterol (eggs, shellfish) as a major risk for most people — those dishes are judged on their saturated fat instead, not docked just for being an egg dish.`}
        />

        <Text className="text-xs text-gray-400 leading-relaxed mt-2">
          These are informed estimates from a dish's name and description, not
          a lab measurement. Not medical advice — always consult your doctor
          about your specific health needs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Factor({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <View className="flex-row gap-3 mb-5">
      <View className="w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center">
        <Text className="text-base">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 mb-1">{title}</Text>
        <Text className="text-base text-gray-600 leading-relaxed">{body}</Text>
      </View>
    </View>
  );
}
