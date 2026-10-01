import { useCallback, useRef } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import Reveal from "../components/Reveal";
import { useAuth } from "../lib/auth/account";
import { recordWelcomeAnswered } from "../lib/welcome";
import { trackWelcomeAccountChoice } from "../lib/analytics";

/**
 * First-launch account offer — shown once per install, right after the Terms.
 *
 * Added 2026-10-01: the only ways into sign-in were a quiet text link on the
 * home screen and a card after the first scan, and Sean (rightly) couldn't
 * find them. This puts the offer where people expect it, without making it a
 * toll booth: "Continue without an account" is a full-size button, one tap,
 * and scanning never waits on an account (App Store 5.1.1(v)).
 *
 * One primary action. The sign-in sheet (app/account.tsx) does the actual
 * work — this screen only decides whether to open it. Coming back here signed
 * in means it worked, and we move on to home.
 */
export default function WelcomeAccountScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const leaving = useRef(false);

  const finish = useCallback(
    (choice: "created" | "skipped") => {
      if (leaving.current) return;
      leaving.current = true;
      if (posthog) trackWelcomeAccountChoice(posthog, choice);
      void recordWelcomeAnswered();
      if (router.canGoBack()) router.back();
      else router.replace("/");
    },
    [router, posthog]
  );

  // Regaining focus is the sign-in sheet closing. Signed in → done here.
  // Read from the store, not a subscription: this only matters at that moment.
  useFocusEffect(
    useCallback(() => {
      const { userId, isAnonymous } = useAuth.getState();
      if (userId !== null && !isAnonymous) finish("created");
    }, [finish])
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ flexGrow: 1, paddingTop: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
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
            Keep every menu you scan
          </Text>
          <Text className="text-base text-gray-600 mt-2 leading-relaxed">
            A free account backs up your saved scans, so they follow you to a
            new phone. It takes a few seconds.
          </Text>
        </Reveal>

        <Reveal delay={160}>
          <View className="bg-white rounded-2xl p-5 mt-6 shadow-sm border border-gray-100">
            <Point
              icon="cloud-done-outline"
              title="Backed up automatically"
              body="Every menu you scan is saved to your account."
            />
            <Point
              icon="key-outline"
              title="No password, ever"
              body="Use Apple, Google, or a code we email you."
            />
            <Point
              icon="lock-closed-outline"
              title="Private by default"
              body="Your health settings never leave your phone."
              last
            />
          </View>
        </Reveal>

        {/* Pushes the actions to the bottom on tall phones, within thumb reach;
            collapses to nothing when the content needs the room. */}
        <View className="flex-1" style={{ minHeight: 24 }} />

        <Reveal delay={240}>
          <TouchableOpacity
            className="bg-brand-900 rounded-xl items-center justify-center flex-row"
            style={{ minHeight: 52 }}
            onPress={() => router.push("/account?from=welcome")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityHint="Opens sign-in options: Apple, Google, or email."
          >
            <Text className="text-white font-semibold text-base">Create free account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-gray-300 bg-white rounded-xl items-center justify-center mt-3"
            style={{ minHeight: 52 }}
            onPress={() => finish("skipped")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityHint="Goes to the home screen. You can create an account later."
          >
            <Text className="text-brand-900 font-semibold text-base">
              Continue without an account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center justify-center mt-2"
            style={{ minHeight: 44 }}
            onPress={() => router.push("/account?from=welcome")}
            accessibilityRole="button"
            accessibilityLabel="Already have an account? Sign in"
          >
            <Text className="text-sm text-gray-600">
              Already have an account?{" "}
              <Text className="font-semibold text-brand-900">Sign in</Text>
            </Text>
          </TouchableOpacity>

          <Text className="text-xs text-gray-600 text-center mt-1 leading-relaxed">
            You never need an account to scan a menu.
          </Text>
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Same icon-row treatment as the sign-in sheet, so the two read as one. */
function Point({
  icon,
  title,
  body,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-start ${last ? "" : "mb-4"}`}
      accessible
      accessibilityLabel={`${title}. ${body}`}
    >
      <View
        className="rounded-full bg-green-50 items-center justify-center"
        style={{ width: 40, height: 40 }}
      >
        <Ionicons name={icon} size={20} color="#1B4332" />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold text-gray-900">{title}</Text>
        <Text className="text-sm text-gray-600 leading-snug mt-0.5">{body}</Text>
      </View>
    </View>
  );
}
