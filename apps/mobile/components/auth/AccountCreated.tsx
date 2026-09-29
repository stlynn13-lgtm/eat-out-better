import { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, AccessibilityInfo } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSessions } from "../../lib/storage/session";
import type { LoginProvider, SignInOutcome } from "../../lib/auth/account";
import { PrimaryButton } from "./EmailCodeFlow";

/**
 * The moment after signing in: confirmation that it worked and what it means.
 *
 * "You're all set" for a login attached to this phone's account; "Welcome
 * back" for someone who signed into an account they already had (their scans
 * from this phone were merged in). One primary action, and the check mark is
 * the only thing that moves — skipped entirely under Reduce Motion.
 */

const PROVIDER_NAME: Record<LoginProvider, string> = {
  apple: "Apple",
  google: "Google",
  email: "email",
};

export default function AccountCreated({
  outcome,
  provider,
  email,
  onDone,
  doneLabel = "Done",
}: {
  /** `added` = a backup login attached to an account that already had one. */
  outcome: SignInOutcome | "added";
  provider: LoginProvider;
  email: string | null;
  onDone: () => void;
  doneLabel?: string;
}) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [scanCount, setScanCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getSessions().then((s) => active && setScanCount(s.length));
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        scale.setValue(1);
        opacity.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      active = false;
    };
  }, [scale, opacity]);

  const title =
    outcome === "created" ? "You're all set" : outcome === "added" ? "Sign-in added" : "Welcome back";
  const lead =
    outcome === "created"
      ? "Your free account is ready. Every scan you save is backed up from now on."
      : outcome === "added"
        ? `You can now sign in with ${PROVIDER_NAME[provider]} too — handy if you ever lose access to your other login.`
        : "You're signed in. Scans from this phone have been added to your account.";
  const scansLine =
    scanCount === null
      ? "Your saved scans are backed up"
      : scanCount === 0
        ? "Scans you save from now on are backed up"
        : `${scanCount} saved ${scanCount === 1 ? "scan" : "scans"} backed up`;

  return (
    <View className="items-center pt-6">
      <Animated.View
        className="rounded-full bg-brand-900 items-center justify-center mb-6"
        style={{ width: 88, height: 88, opacity, transform: [{ scale }] }}
        accessible={false}
      >
        <Ionicons name="checkmark" size={48} color="#FFFFFF" />
      </Animated.View>

      <Text className="text-2xl font-bold text-gray-900 text-center mb-2" accessibilityRole="header">
        {title}
      </Text>
      <Text className="text-base text-gray-600 text-center leading-relaxed mb-8 px-2">
        {lead}
      </Text>

      <View className="w-full bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-8">
        <CheckRow text={scansLine} />
        <CheckRow
          text={
            email && provider !== "apple"
              ? `Signed in with ${PROVIDER_NAME[provider]} as ${email}`
              : `Signed in with ${PROVIDER_NAME[provider]}`
          }
        />
        <CheckRow text="Sign in on any phone to get your scans back" last />
      </View>

      <View className="w-full">
        <PrimaryButton label={doneLabel} onPress={onDone} />
      </View>
    </View>
  );
}

function CheckRow({ text, last = false }: { text: string; last?: boolean }) {
  return (
    <View className={`flex-row items-start ${last ? "" : "mb-4"}`}>
      <Ionicons name="checkmark-circle" size={22} color="#16a34a" style={{ marginTop: 1 }} />
      <Text className="text-base text-gray-800 ml-3 flex-1 leading-snug">{text}</Text>
    </View>
  );
}
