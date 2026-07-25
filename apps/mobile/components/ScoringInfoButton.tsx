import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { trackScoringInfoOpened } from "../lib/analytics";

// Rendered once, globally, above the Stack — not per-screen. Hidden on
// processing (avoid distracting mid-scan), and on the two info modals
// themselves (no point opening scoring-explained from on top of itself).
const HIDDEN_ROUTES = ["/processing", "/how-it-works", "/scoring-explained"];

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
        <TouchableOpacity
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: "rgba(17,24,39,0.55)" }}
          onPress={() => {
            if (posthog) trackScoringInfoOpened(posthog, pathname);
            router.push("/scoring-explained");
          }}
          accessibilityLabel="What factors go into the score"
        >
          <Text className="text-white text-sm font-bold">?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
