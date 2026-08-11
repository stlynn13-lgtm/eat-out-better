import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * The app's single info screen — a slide-up sheet (presentation: "modal" in
 * _layout.tsx) reached from the one "?" button in the top-right corner.
 *
 * Merged from the former how-it-works and scoring-explained screens. Two
 * entry points sat within a thumb's width of each other on the welcome screen
 * ("How it works →" in the footer and the floating "?"), which read as two
 * different answers to the same question. Content is drawn from
 * ARCHITECTURE.md (Claude Pipeline) and RANKING_SYSTEM_BASE in
 * apps/api/src/lib/claude/prompts.ts.
 */
export default function HowItWorksScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">How it works</Text>
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
          Eat Out Better turns a photo of a menu into a heart-smart ranking in
          about half a minute. Here's what happens behind the scenes.
        </Text>

        <Step
          n="1"
          title="Snap the menu"
          body="Photograph each page of the menu — up to 10 photos per scan. No typing, no searching. You can pinch or tap to zoom in on small print for a clearer shot."
        />
        <Step
          n="2"
          title="We read it"
          body="Your photos are sent securely to our AI, which reads every dish name and description straight off the page — even with varied fonts, angles, and lighting."
        />
        <Step
          n="3"
          title="We rank it for your heart"
          body="Each dish is scored from 1 to 10 for its impact on cholesterol, then ordered best to worst. Every score comes with a plain-English reason and, where it helps, a simple swap to make a dish work better for you."
        />

        <View className="bg-white rounded-2xl p-4 mt-2 mb-8 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-900 mb-2">
            How to read the scores
          </Text>
          <Legend color="#16a34a" label="7–10 · Top pick — a great choice for your heart" />
          <Legend color="#d97706" label="4–6.9 · Okay in moderation — small swaps help" />
          <Legend color="#dc2626" label="1–3.9 · Enjoy occasionally, not every day" />
        </View>

        <SectionDivider />

        <Text className="text-xl font-bold text-gray-900 mb-1">
          What goes into your score
        </Text>
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

        <Text className="text-xs text-gray-400 leading-relaxed mt-2 mb-8">
          These are informed estimates from a dish's name and description, not a
          lab measurement.
        </Text>

        <SectionDivider />

        <Text className="text-base font-semibold text-gray-900 mb-1">
          Your privacy
        </Text>
        <Text className="text-base text-gray-600 leading-relaxed mb-6">
          Menu photos are analyzed and then discarded — they're never stored on
          our servers, and the app works without an account.
        </Text>

        <Text className="text-xs text-gray-400 leading-relaxed">
          Eat Out Better offers general dietary information, not medical advice.
          Always consult your doctor about your specific health needs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionDivider() {
  return <View className="h-px bg-gray-200 mb-6" />;
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <View className="flex-row gap-3 mb-5">
      <View className="w-8 h-8 rounded-full bg-brand-900 items-center justify-center">
        <Text className="text-white text-sm font-bold">{n}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 mb-1">{title}</Text>
        <Text className="text-base text-gray-600 leading-relaxed">{body}</Text>
      </View>
    </View>
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-1.5">
      <View
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text className="text-sm text-gray-600 flex-1">{label}</Text>
    </View>
  );
}
