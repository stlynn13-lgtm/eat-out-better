import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { trackScoringInfoOpened } from "../lib/analytics";

// Rendered once, globally, above the Stack — not per-screen. Hidden on
// processing (avoid distracting mid-scan) and on the info screen itself.
const HIDDEN_ROUTES = ["/processing", "/how-it-works"];

export default function ScoringInfoButton() {
  const router = useRouter();
  const pathname = usePathname();
  const posthog = usePostHog();

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <SafeAreaView
      edges={["top", "right"]}
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0 }}
    >
      <View pointerEvents="box-none" className="flex-row justify-end px-5 pt-3">
        {/* Light fill, not the old charcoal rgba(17,24,39,0.55): every screen
            this floats over has a near-white background, so a dark disc read
            as a smudge rather than a control. */}
        <TouchableOpacity
          className="w-9 h-9 rounded-full items-center justify-center bg-white border border-gray-200"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
          onPress={() => {
            if (posthog) trackScoringInfoOpened(posthog, pathname);
            router.push("/how-it-works");
          }}
          accessibilityRole="button"
          accessibilityLabel="How it works and what goes into your score"
        >
          <Text className="text-brand-900 text-base font-bold">?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
