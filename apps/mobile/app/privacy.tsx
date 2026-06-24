import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Privacy Policy screen.
 *
 * DRAFT — copy is derived from the app's actual data behavior (see
 * ARCHITECTURE.md → Security). Replace with the final, legally-reviewed text
 * from the Drive doc before App Store submission. App Store review requires a
 * privacy policy that is also hosted at a public URL.
 */
export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-2">
        <TouchableOpacity
          className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
          onPress={() => router.back()}
        >
          <Text className="text-gray-600 text-base">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Privacy Policy</Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs text-gray-400 mb-4">Last updated: June 23, 2026</Text>

        <Section title="The short version">
          Eat Out Better photographs restaurant menus to rank dishes for your
          heart health. We do not require an account, we do not sell your data,
          and your menu photos are analyzed and then discarded — not stored on
          our servers.
        </Section>

        <Section title="What we process">
          When you scan a menu, the photos you take are sent securely to our
          analysis service, which uses AI to read the dish names and assess
          their cholesterol impact. Photos are processed in memory and are not
          written to disk or retained after your results are returned.
        </Section>

        <Section title="What we store">
          Your results (the ranked dishes for a scan) are stored only on your
          device so the app can show them to you. We do not store your name,
          email, or photos on our servers. Clearing the app's data removes this
          local history.
        </Section>

        <Section title="Third parties">
          Menu analysis is performed using the Anthropic (Claude) API via our
          own backend. Images are sent for the sole purpose of generating your
          results and are not used to train models. We do not share your data
          with advertisers.
        </Section>

        <Section title="Permissions">
          The app asks for camera access to photograph menus and photo-library
          access to upload existing menu photos. You can decline either and the
          app will simply offer the other option.
        </Section>

        <Section title="Not medical advice">
          Eat Out Better provides general dietary information, not medical
          advice. Always consult your doctor about your specific health needs.
        </Section>

        <Section title="Contact">
          Questions about this policy? Reach us at seanflynn13@gmail.com.
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-5">
      <Text className="text-base font-semibold text-gray-900 mb-1.5">{title}</Text>
      <Text className="text-sm text-gray-600 leading-relaxed">{children}</Text>
    </View>
  );
}
