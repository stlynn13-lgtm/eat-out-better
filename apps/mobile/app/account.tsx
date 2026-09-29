import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { TERMS_URL, PRIVACY_URL } from "../lib/legal";
import {
  useAuth,
  continueWithApple,
  continueWithGoogle,
  sendEmailCode,
  verifyEmailCode,
  signOut,
  deleteAccount,
  isAppleSignInAvailable,
  friendlyAuthError,
  SignInCancelled,
  type EmailCodeMode,
  type LoginProvider,
} from "../lib/auth/account";

/**
 * Account: sign in (Apple, Google, or a 6-digit email code), sign out, delete.
 *
 * Everyone already HAS an account — a silent anonymous one from first launch —
 * so "signing in" here means attaching a login to it, which is what lets saved
 * scans follow the person to a new phone. Nothing on this screen is required
 * to scan a menu (App Store 5.1.1(v)).
 *
 * Sign in with Apple is listed first and at full size: when an app offers a
 * third-party login like Google, Guideline 4.8 wants Apple offered as an
 * equivalent option.
 */

type Busy = null | LoginProvider | "verify" | "signout" | "delete";

const PROVIDER_LABEL: Record<LoginProvider, string> = {
  apple: "Apple",
  google: "Google",
  email: "Email",
};

export default function AccountScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [emailStep, setEmailStep] = useState<"closed" | "address" | "code">("closed");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeMode, setCodeMode] = useState<EmailCodeMode>("link");

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const signedIn = auth.userId !== null && !auth.isAnonymous;

  async function run(key: Busy, action: () => Promise<void>, failTitle = "Couldn't sign in") {
    if (busy) return;
    setBusy(key);
    try {
      await action();
    } catch (error) {
      if (!(error instanceof SignInCancelled)) {
        Alert.alert(failTitle, error instanceof Error && key === "delete" ? error.message : friendlyAuthError(error));
      }
    } finally {
      setBusy(null);
    }
  }

  const onSendCode = () =>
    run("email", async () => {
      const address = email.trim();
      if (!/^\S+@\S+\.\S+$/.test(address)) {
        Alert.alert("Check your email", "That email address doesn't look right.");
        return;
      }
      const mode = await sendEmailCode(address);
      setCodeMode(mode);
      setCode("");
      setEmailStep("code");
    });

  const onVerify = () =>
    run("verify", async () => {
      if (code.replace(/\D/g, "").length !== 6) {
        Alert.alert("Enter the code", "The code in the email is 6 digits.");
        return;
      }
      await verifyEmailCode(email, code, codeMode);
      setEmailStep("closed");
      setCode("");
    });

  const confirmSignOut = () =>
    Alert.alert(
      "Sign out?",
      "Your saved scans stay in your account. This phone will start a fresh, empty history until you sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", onPress: () => run("signout", signOut, "Couldn't sign out") },
      ]
    );

  const confirmDelete = () =>
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your account and every scan saved to it — on this phone and on our servers. It can't be undone." +
        (auth.providers.includes("apple")
          ? "\n\nApple will ask you to confirm once more so we can disconnect Sign in with Apple."
          : ""),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () =>
            run(
              "delete",
              async () => {
                await deleteAccount();
                Alert.alert("Account deleted", "Your account and saved scans have been deleted.", [
                  { text: "OK", onPress: () => router.back() },
                ]);
              },
              "Couldn't delete your account"
            ),
        },
      ]
    );

  // Logins not yet attached — offered to signed-in users as a backup way in.
  // Matters most for "Hide My Email" users, whose Apple address won't match
  // anything else they own.
  const unlinked = (["apple", "google", "email"] as LoginProvider[]).filter(
    (p) => !auth.providers.includes(p) && (p !== "apple" || appleAvailable)
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text className="text-base text-brand-900">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Account</Text>
        <View className="w-14" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {auth.status === "unavailable" ? (
            <Text className="text-base text-gray-600 text-center mt-8">
              Accounts aren't available in this version of the app.
            </Text>
          ) : signedIn ? (
            <>
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <Text className="text-sm text-gray-500 mb-1">Signed in</Text>
                <Text className="text-lg font-semibold text-gray-900">
                  {auth.displayName ?? auth.email ?? "Your account"}
                </Text>
                {auth.displayName && auth.email ? (
                  <Text className="text-base text-gray-600 mt-0.5">{auth.email}</Text>
                ) : null}
                {auth.providers.length > 0 ? (
                  <Text className="text-sm text-gray-500 mt-2">
                    Signs in with {auth.providers.map((p) => PROVIDER_LABEL[p]).join(" · ")}
                  </Text>
                ) : null}
                <Text className="text-base text-gray-600 mt-3 leading-relaxed">
                  Your saved scans are backed up to this account and will be here
                  on any phone you sign in on.
                </Text>
              </View>

              {unlinked.length > 0 && emailStep === "closed" ? (
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Add another way to sign in
                  </Text>
                  <LoginButtons
                    providers={unlinked}
                    busy={busy}
                    onApple={() => run("apple", continueWithApple)}
                    onGoogle={() => run("google", continueWithGoogle)}
                    onEmail={() => setEmailStep("address")}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-gray-100">
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  Keep your scans on every phone
                </Text>
                <Text className="text-base text-gray-600 leading-relaxed">
                  Sign in to back up your saved scans and get them back if you
                  change or lose your phone. You don't need an account to scan
                  menus.
                </Text>
              </View>

              {emailStep === "closed" ? (
                <LoginButtons
                  providers={appleAvailable ? ["apple", "google", "email"] : ["google", "email"]}
                  busy={busy}
                  onApple={() => run("apple", continueWithApple)}
                  onGoogle={() => run("google", continueWithGoogle)}
                  onEmail={() => setEmailStep("address")}
                />
              ) : null}
            </>
          )}

          {emailStep !== "closed" ? (
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              {emailStep === "address" ? (
                <>
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    Your email
                  </Text>
                  <Text className="text-sm text-gray-600 mb-3">
                    We'll email you a 6-digit code. No password.
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-3"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={onSendCode}
                    accessibilityLabel="Email address"
                  />
                  <PrimaryButton label="Send code" busy={busy === "email"} onPress={onSendCode} />
                </>
              ) : (
                <>
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    Enter the code
                  </Text>
                  <Text className="text-sm text-gray-600 mb-3">
                    We sent a 6-digit code to {email.trim()}. It can take a minute
                    to arrive — check spam if you don't see it.
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-2xl tracking-widest text-gray-900 mb-3 text-center"
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    // Lets iOS offer the code from Mail above the keyboard.
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={onVerify}
                    accessibilityLabel="6-digit code"
                  />
                  <PrimaryButton label="Continue" busy={busy === "verify"} onPress={onVerify} />
                  <View className="flex-row justify-between mt-4">
                    <TouchableOpacity onPress={onSendCode} disabled={busy !== null}>
                      <Text className="text-sm text-brand-900 font-medium">Send a new code</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEmailStep("address")} disabled={busy !== null}>
                      <Text className="text-sm text-gray-600">Use a different email</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <TouchableOpacity
                className="items-center mt-4"
                onPress={() => setEmailStep("closed")}
                disabled={busy !== null}
              >
                <Text className="text-sm text-gray-500">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {signedIn ? (
            <>
              <TouchableOpacity
                className="border border-gray-300 bg-white rounded-xl py-4 items-center mt-2"
                onPress={confirmSignOut}
                disabled={busy !== null}
                accessibilityRole="button"
              >
                {busy === "signout" ? (
                  <ActivityIndicator color="#1B4332" />
                ) : (
                  <Text className="text-brand-900 font-semibold text-base">Sign out</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="items-center py-4 mt-6"
                onPress={confirmDelete}
                disabled={busy !== null}
                accessibilityRole="button"
                accessibilityLabel="Delete account permanently"
              >
                {busy === "delete" ? (
                  <ActivityIndicator color="#B91C1C" />
                ) : (
                  <Text className="text-red-700 font-semibold text-base">Delete account</Text>
                )}
              </TouchableOpacity>
            </>
          ) : auth.status !== "unavailable" ? (
            <Text className="text-xs text-gray-600 text-center mt-6 leading-relaxed">
              By continuing you agree to our{" "}
              <Text className="underline" onPress={() => Linking.openURL(TERMS_URL)}>
                Terms
              </Text>{" "}
              and{" "}
              <Text className="underline" onPress={() => Linking.openURL(PRIVACY_URL)}>
                Privacy Policy
              </Text>
              .
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginButtons({
  providers,
  busy,
  onApple,
  onGoogle,
  onEmail,
}: {
  providers: LoginProvider[];
  busy: Busy;
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
}) {
  return (
    <View>
      {providers.includes("apple") ? (
        <View className="mb-3" pointerEvents={busy ? "none" : "auto"}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={{ width: "100%", height: 52, opacity: busy === "apple" ? 0.6 : 1 }}
            onPress={onApple}
          />
        </View>
      ) : null}

      {providers.includes("google") ? (
        <TouchableOpacity
          className="border border-gray-300 bg-white rounded-xl items-center justify-center mb-3"
          style={{ height: 52 }}
          onPress={onGoogle}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {busy === "google" ? (
            <ActivityIndicator color="#1B4332" />
          ) : (
            <Text className="text-gray-900 font-semibold text-base">Continue with Google</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {providers.includes("email") ? (
        <TouchableOpacity
          className="border border-gray-300 bg-white rounded-xl items-center justify-center"
          style={{ height: 52 }}
          onPress={onEmail}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
        >
          <Text className="text-gray-900 font-semibold text-base">Continue with email</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PrimaryButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="bg-brand-900 rounded-xl py-4 items-center"
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-white font-semibold text-base">{label}</Text>
      )}
    </TouchableOpacity>
  );
}
