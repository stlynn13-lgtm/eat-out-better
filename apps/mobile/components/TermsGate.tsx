/**
 * First-run acceptance gate — the clickwrap.
 *
 * Everything protective in the Terms depends on the user having actually agreed
 * to them. A link in a footer is "browsewrap" and is regularly held
 * unenforceable; an affirmative tap against visible, working links to the full
 * text is "clickwrap" and is regularly enforced. This component is the
 * difference between those two, so a few of its choices are deliberate and
 * should not be "simplified" away:
 *
 *   - It blocks. There is no way past it except the button.
 *   - It cannot be swiped away or dismissed with the hardware back gesture.
 *   - The links are real, they open the hosted documents, and they are placed
 *     ABOVE the button so they are on screen at the moment of assent.
 *   - The two things most likely to hurt someone — no allergen detection, not
 *     medical advice — are stated here in full, not just linked to.
 *   - The button says what it does ("I Agree"), not "Continue" or "Got it".
 *
 * It renders nothing at all once the current Terms version is on record, so the
 * cost to a returning user is one AsyncStorage read.
 */

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TERMS_URL,
  PRIVACY_URL,
  TERMS_VERSION,
  hasAcceptedCurrentTerms,
  recordAcceptance,
} from "../lib/legal";

type Status = "checking" | "needed" | "accepted";

export default function TermsGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasAcceptedCurrentTerms().then((accepted) => {
      if (!cancelled) setStatus(accepted ? "accepted" : "needed");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAgree = async () => {
    setSaving(true);
    // A failed write is not a reason to block someone out of the app — it would
    // strand them behind a gate they cannot pass. Let them through; the worst
    // case is being asked again next launch.
    await recordAcceptance();
    setStatus("accepted");
  };

  // Render the app underneath from the start so there is no blank flash, and
  // overlay the gate when it is needed.
  return (
    <>
      {children}
      <Modal
        visible={status === "needed"}
        animationType="fade"
        transparent={false}
        presentationStyle="fullScreen"
        // No onRequestClose handler that dismisses: the Android back button and
        // the iOS swipe must not be a way around agreeing.
        onRequestClose={() => {}}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="px-5 pt-4 pb-2">
            <Text
              className="text-2xl font-bold text-gray-900"
              accessibilityRole="header"
            >
              Before you start
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              Please read this — it matters for your health.
            </Text>
          </View>

          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
            showsVerticalScrollIndicator={true}
          >
            <Point
              emoji="🩺"
              title="This is not medical advice"
              body="Eat Out Better gives general dietary information to help you think about a menu. It is not a substitute for your doctor or dietitian, and using it does not create a professional relationship. Talk to your own provider about your health."
            />

            <View className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4">
              <Text className="text-base font-bold text-red-900 mb-1">
                ⚠️ It does not detect allergens
              </Text>
              <Text className="text-sm text-red-900 leading-relaxed">
                The app does not identify peanuts, tree nuts, shellfish, eggs, milk,
                soy, wheat, sesame, gluten, or any other allergen. It cannot tell you
                whether a dish is safe for you.
              </Text>
              <Text className="text-sm font-semibold text-red-900 leading-relaxed mt-2">
                If you have a food allergy or intolerance, ask the restaurant directly,
                every time.
              </Text>
            </View>

            <Point
              emoji="🤖"
              title="Scores are AI estimates, and can be wrong"
              body="The app reads your photo with AI and estimates a dish's likely saturated fat from its name and description. It has no access to the kitchen or the recipe. It can misread a menu, miss a dish, or guess wrong."
            />

            <Point
              emoji="❤️"
              title="It looks at cholesterol only"
              body="Scores address the likely effect on blood cholesterol. They say nothing about sodium, sugar, calories, portion size, or any other condition."
            />

            <View className="h-px bg-gray-200 my-2" />

            <Text className="text-sm text-gray-600 leading-relaxed mt-3">
              Tapping "I Agree" means you accept our Terms of Service and Privacy
              Policy. The Terms include a limitation of our liability and an agreement
              to resolve disputes by individual arbitration, which you can opt out of
              within 30 days.
            </Text>

            <View className="flex-row items-center gap-4 mt-4 mb-2">
              <TouchableOpacity
                onPress={() => Linking.openURL(TERMS_URL)}
                accessibilityRole="link"
                accessibilityLabel="Read the Terms of Service. Opens in your browser."
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <Text className="text-base font-semibold text-brand-800 underline">
                  Terms of Service
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL(PRIVACY_URL)}
                accessibilityRole="link"
                accessibilityLabel="Read the Privacy Policy. Opens in your browser."
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <Text className="text-base font-semibold text-brand-800 underline">
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-600 leading-relaxed mt-2">
              You must be 18 or older to use this app. If you do not agree to these
              terms, please close and delete the app.
            </Text>
          </ScrollView>

          <View className="px-5 pb-6 pt-3 border-t border-gray-200 bg-gray-50">
            <TouchableOpacity
              className="w-full bg-brand-900 rounded-xl py-4 items-center"
              onPress={handleAgree}
              disabled={saving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
              accessibilityState={{ disabled: saving }}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-base">I Agree</Text>
              )}
            </TouchableOpacity>
            <Text className="text-xs text-gray-600 text-center mt-3">
              Terms version {TERMS_VERSION}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function Point({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <View className="flex-row gap-3 mb-4">
      <View
        className="w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text className="text-base">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 mb-0.5">{title}</Text>
        <Text className="text-sm text-gray-600 leading-relaxed">{body}</Text>
      </View>
    </View>
  );
}
