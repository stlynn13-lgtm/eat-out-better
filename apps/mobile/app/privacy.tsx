import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Privacy Policy screen — text supplied by Sean (2026-06-23).
 *
 * DRAFT. Open items before App Store *review* (also tracked in the source doc):
 *   - [ ] Company / LLC name  -> replace [COMPANY NAME]
 *   - [ ] Contact email       -> replace [CONTACT EMAIL]
 *   - [ ] Effective date       -> set when published
 *   - [ ] Remove "Draft" markers
 *   - [ ] Host this policy at a public URL (App Store Connect metadata requires it)
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
        <Text className="text-xs text-gray-400 mb-1">
          Draft — pending company name, contact email, and effective date.
        </Text>
        <Text className="text-xs text-gray-400">Effective Date: [pending publication]</Text>
        <Text className="text-xs text-gray-400 mb-5">Last Updated: June 23, 2026</Text>

        <Section title="1. Overview">
          Eat Out Better ("we," "us," or "our") is operated by [COMPANY NAME].
          This Privacy Policy explains how we handle information when you use our
          mobile application. We built this app with a minimal data footprint by
          design — we don't create accounts, we don't store your photos, and we
          don't retain your health information after your session ends.
        </Section>

        <Section title="2. Who This App Is For">
          Eat Out Better is intended for users 18 years of age or older. By using
          this app, you confirm you are at least 18. We do not knowingly collect
          information from anyone under 18. If we learn a user is under 18, we
          will cease processing their data immediately.
        </Section>

        <Section title="3. What We Collect">
          {""}
        </Section>
        <SubSection title="Camera & Photos">
          When you photograph a restaurant menu, that image is sent to our AI
          analysis service for processing. We do not store your photos on our
          servers. Once the analysis is complete, the image is discarded.
        </SubSection>
        <SubSection title="Health Context">
          You may input a health condition (such as high cholesterol) to
          personalize your results. This information is used only to generate
          your in-session analysis and is not stored, shared, or linked to you in
          any way.
        </SubSection>
        <SubSection title="Device Data">
          We may collect basic technical information (device type, OS version,
          crash reports) to maintain app performance. This data is not linked to
          your health information or photos.
        </SubSection>

        <Section title="4. How We Use Your Information">{""}</Section>
        <Bullet>To analyze menu photos and return personalized dish recommendations</Bullet>
        <Bullet>To maintain and improve app performance</Bullet>
        <Bullet>We do not use your information for advertising</Bullet>
        <Bullet>We do not sell your personal information to anyone, ever</Bullet>
        <View className="mb-5" />

        <Section title="5. Third-Party Services">
          To provide AI-powered analysis, your menu photos and health context are
          processed by Anthropic, PBC via their Claude API. Anthropic acts as a
          data processor on our behalf. Their privacy policy is available at
          https://anthropic.com/privacy. We do not share your data with any other
          third parties.
        </Section>

        <Section title="6. Data Retention">
          We do not retain your photos or health information after your session.
          Device-level session data is stored locally on your device via
          AsyncStorage and is cleared when you uninstall the app.
        </Section>

        <Section title="7. California Residents — CCPA Rights">
          If you are a California resident, you have the right to:
        </Section>
        <Bullet>Know what personal information we collect and how it's used</Bullet>
        <Bullet>Request deletion of your personal information</Bullet>
        <Bullet>
          Opt out of the sale of your personal information (we do not sell
          personal information)
        </Bullet>
        <Text className="text-sm text-gray-600 leading-relaxed mb-5">
          To exercise any of these rights, contact us at [CONTACT EMAIL].
        </Text>

        <Section title="8. Security">
          We use industry-standard practices to protect data in transit. Given
          our stateless architecture — no server-side storage of photos or health
          data — your exposure is minimized by design.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this policy as the app evolves. We'll update the "Last
          Updated" date above. Continued use of the app after changes constitutes
          acceptance.
        </Section>

        <Section title="10. Contact">
          Questions or privacy requests: [CONTACT EMAIL]
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className={children ? "mb-5" : "mb-2"}>
      <Text className="text-base font-semibold text-gray-900 mb-1.5">{title}</Text>
      {children ? (
        <Text className="text-sm text-gray-600 leading-relaxed">{children}</Text>
      ) : null}
    </View>
  );
}

function SubSection({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-3">
      <Text className="text-sm font-semibold text-gray-800 mb-1">{title}</Text>
      <Text className="text-sm text-gray-600 leading-relaxed">{children}</Text>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View className="flex-row gap-2 mb-1.5">
      <Text className="text-sm text-gray-600">•</Text>
      <Text className="text-sm text-gray-600 leading-relaxed flex-1">{children}</Text>
    </View>
  );
}
