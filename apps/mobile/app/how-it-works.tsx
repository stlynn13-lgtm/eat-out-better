import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * "How it works" — presented as a slide-up sheet (presentation: "modal" in
 * _layout.tsx). Plain-English explanation of the scan -> read -> rank logic,
 * drawn from ARCHITECTURE.md (Claude Pipeline + Scoring Configuration).
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

        <View className="bg-white rounded-2xl p-4 mt-2 mb-6 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-900 mb-2">
            How to read the scores
          </Text>
          <Legend color="#16a34a" label="7–10 · Top pick — a great choice for your heart" />
          <Legend color="#d97706" label="4–6.9 · Okay in moderation — small swaps help" />
          <Legend color="#dc2626" label="1–3.9 · Enjoy occasionally, not every day" />
        </View>

        <Text className="text-sm font-semibold text-gray-900 mb-1">
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
