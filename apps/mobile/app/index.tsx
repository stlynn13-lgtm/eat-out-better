import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { TERMS_URL, PRIVACY_URL } from "../lib/legal";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import FeedbackSheet from "../components/FeedbackSheet";
import Reveal from "../components/Reveal";

export default function WelcomeScreen() {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 48, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Staggered entrance, top to bottom. Steps are ~80ms apart so the
            whole screen has settled in under half a second — long enough to
            read as deliberate, short enough that it never delays a tap. */}

        {/* Logo */}
        <Reveal delay={0}>
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-brand-900 items-center justify-center mb-4">
              <Text className="text-white text-3xl">🥗</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">Eat Out Better</Text>
            <Text className="text-base text-gray-500 mt-1 text-center">
              Smart dining for your heart health
            </Text>
          </View>
        </Reveal>

        {/* Value prop card */}
        <Reveal delay={80}>
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              What we do
            </Text>
            <Text className="text-base text-gray-600 leading-relaxed">
              Photograph any restaurant menu and get every dish ranked for your
              specific health goals — with clear explanations and ways to make any
              choice work better for you.
            </Text>
          </View>
        </Reveal>

        {/* Feature pills */}
        <Reveal delay={160}>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {[
              "📸 Photograph any menu",
              "📊 Per-dish risk rating",
              "✏️ Substitution tips",
              "❤️ Heart health focus",
            ].map((feature) => (
              <View
                key={feature}
                className="bg-green-50 border border-green-200 rounded-full px-3 py-1.5"
              >
                <Text className="text-xs font-medium text-green-800">{feature}</Text>
              </View>
            ))}
          </View>
        </Reveal>

        {/* CTA */}
        <Reveal delay={240}>
          <TouchableOpacity
            className="bg-brand-900 rounded-xl py-4 items-center"
            onPress={() => router.push("/capture")}
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold text-base">Get Started</Text>
          </TouchableOpacity>

          <Text className="text-sm text-gray-600 text-center mt-4">
            Not medical advice — always consult your doctor.
          </Text>
        </Reveal>

        {/* Footer entry points. "How it works →" used to live here as well;
            it now shares the single "?" in the top-right corner with the
            scoring explainer, which is the same question asked twice. */}
        <Reveal delay={320}>
          <View className="flex-row flex-wrap items-center justify-center gap-3 mt-6">
            <TouchableOpacity
              onPress={() => setShowFeedback(true)}
              accessibilityRole="button"
              accessibilityLabel="Send feedback"
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text className="text-xs text-gray-500 underline">Feedback</Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-300">·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(TERMS_URL)}
              accessibilityRole="link"
              accessibilityLabel="Read the Terms of Service. Opens in your browser."
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text className="text-xs text-gray-500 underline">Terms</Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-300">·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(PRIVACY_URL)}
              accessibilityRole="link"
              accessibilityLabel="Read the Privacy Policy. Opens in your browser."
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text className="text-xs text-gray-500 underline">Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </Reveal>
      </ScrollView>

      <FeedbackSheet
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="index"
      />
    </SafeAreaView>
  );
}
