import { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, Linking } from "react-native";
import { TERMS_URL, PRIVACY_URL } from "../lib/legal";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import FeedbackSheet from "../components/FeedbackSheet";
import Reveal from "../components/Reveal";
import { useAuth } from "../lib/auth/account";

/**
 * Welcome — the first screen after the Terms, and home every time after.
 *
 * Redesigned 2026-09-28 from Sean's UX list: lead with the question the app
 * answers ("Have high cholesterol?") instead of a tagline, and replace the four
 * feature chips with three numbered steps — the chips described features, the
 * steps describe what you'll actually do. The brand mark is the app icon
 * itself rather than an emoji, so it matches what's on the home screen.
 *
 * One primary action. Saved scans is secondary, and the account link is a
 * quiet text link: scanning never needs an account, so the screen shouldn't
 * suggest otherwise. Sized so the primary button sits above the fold on the
 * smallest supported phone (iPhone SE, 667pt).
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);
  const accountsOn = useAuth((s) => s.status !== "unavailable");
  const signedIn = useAuth((s) => s.userId !== null && !s.isAnonymous);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Staggered entrance, top to bottom, ~80ms apart — settled in under
            half a second, so it never delays a tap. Off under Reduce Motion. */}

        <Reveal delay={0}>
          <View className="flex-row items-center">
            <Image
              source={require("../assets/brand/mark.png")}
              style={{ width: 44, height: 44 }}
              accessible={false}
            />
            <Text className="text-lg font-bold text-brand-900 ml-3">Eat Out Better</Text>
          </View>
        </Reveal>

        <Reveal delay={80}>
          <Text
            className="text-3xl font-bold text-gray-900 mt-6 leading-tight"
            accessibilityRole="header"
          >
            Have high cholesterol?
          </Text>
          <Text className="text-base text-gray-600 mt-2 leading-relaxed">
            Photograph any restaurant menu and see which dishes fit your heart
            health — ranked, with the reasons why.
          </Text>
        </Reveal>

        <Reveal delay={160}>
          <View className="bg-white rounded-2xl p-5 mt-6 shadow-sm border border-gray-100">
            <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
              How it works
            </Text>
            <Step n={1} title="Photograph the menu" body="One photo per page — up to 10." />
            <Step
              n={2}
              title="Every dish gets a score"
              body="Green, yellow or red, and what drives it."
            />
            <Step
              n={3}
              title="Order with confidence"
              body="Easy swaps to ask your server for."
              last
            />
          </View>
        </Reveal>

        <Reveal delay={240}>
          <TouchableOpacity
            className="bg-brand-900 rounded-xl items-center justify-center flex-row mt-6"
            style={{ height: 52 }}
            onPress={() => router.push("/capture")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Scan a menu"
          >
            <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
            <Text className="text-white font-semibold text-base ml-2">Scan a menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-gray-300 bg-white rounded-xl items-center justify-center flex-row mt-3"
            style={{ height: 52 }}
            onPress={() => router.push("/history")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View your saved scans"
          >
            <Ionicons name="time-outline" size={20} color="#1B4332" />
            <Text className="text-brand-900 font-semibold text-base ml-2">Saved scans</Text>
          </TouchableOpacity>

          {accountsOn ? (
            <TouchableOpacity
              className="items-center justify-center mt-2"
              style={{ minHeight: 44 }}
              onPress={() => router.push("/account?from=home")}
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold text-brand-900">
                {signedIn ? "Account" : "Sign in to back up your scans"}
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text className="text-sm text-gray-600 text-center mt-2">
            Not medical advice — always consult your doctor.
          </Text>
        </Reveal>

        <Reveal delay={320}>
          <View className="flex-row flex-wrap items-center justify-center gap-3 mt-6">
            <TouchableOpacity
              onPress={() => setShowFeedback(true)}
              accessibilityRole="button"
              accessibilityLabel="Send feedback"
              hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
            >
              <Text className="text-xs text-gray-600 underline">Feedback</Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-400">·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(TERMS_URL)}
              accessibilityRole="link"
              accessibilityLabel="Read the Terms of Service. Opens in your browser."
              hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
            >
              <Text className="text-xs text-gray-600 underline">Terms</Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-400">·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(PRIVACY_URL)}
              accessibilityRole="link"
              accessibilityLabel="Read the Privacy Policy. Opens in your browser."
              hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
            >
              <Text className="text-xs text-gray-600 underline">Privacy Policy</Text>
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

/** Same step treatment as the "How it works" screen, so the two read as one. */
function Step({
  n,
  title,
  body,
  last = false,
}: {
  n: number;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row ${last ? "" : "mb-4"}`}
      accessible
      accessibilityLabel={`Step ${n}: ${title}. ${body}`}
    >
      <View className="w-8 h-8 rounded-full bg-brand-900 items-center justify-center">
        <Text className="text-white text-sm font-bold">{n}</Text>
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold text-gray-900">{title}</Text>
        <Text className="text-sm text-gray-600 leading-snug mt-0.5">{body}</Text>
      </View>
    </View>
  );
}
