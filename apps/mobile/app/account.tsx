import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TERMS_URL, PRIVACY_URL } from "../lib/legal";
import { getSessions } from "../lib/storage/session";
import {
  useAuth,
  continueWithApple,
  continueWithGoogle,
  signOut,
  deleteAccount,
  isAppleSignInAvailable,
  friendlyAuthError,
  SignInCancelled,
  type LoginProvider,
  type SignInOutcome,
} from "../lib/auth/account";
import LoginButtons from "../components/auth/LoginButtons";
import EmailCodeFlow from "../components/auth/EmailCodeFlow";
import AccountCreated from "../components/auth/AccountCreated";

/**
 * Account — presented as a sheet over whatever you were doing.
 *
 * Everyone already HAS an account: a silent anonymous one from first launch.
 * So this screen never says "sign up" — it offers to attach a login (Apple,
 * Google, or a 6-digit code by email) so saved scans survive a new phone, then
 * confirms it worked. Nothing here is ever required to scan a menu
 * (App Store 5.1.1(v)), and "Not now" is always one tap away.
 *
 * States: sign in → (email steps) → account created → manage.
 */

type Busy = null | LoginProvider | "other";
type Success = {
  outcome: SignInOutcome;
  provider: LoginProvider;
  email: string | null;
};

const PROVIDER_LABEL: Record<LoginProvider, string> = {
  apple: "Apple",
  google: "Google",
  email: "Email",
};

export default function AccountScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const auth = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [success, setSuccess] = useState<Success | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const signedIn = auth.userId !== null && !auth.isAnonymous;

  const runProvider = async (provider: "apple" | "google") => {
    if (busy) return;
    setBusy(provider);
    try {
      const outcome =
        provider === "apple" ? await continueWithApple() : await continueWithGoogle();
      setSuccess({
        outcome,
        provider,
        email: useAuth.getState().email,
      });
    } catch (error) {
      if (!(error instanceof SignInCancelled)) {
        Alert.alert("Couldn't sign in", friendlyAuthError(error));
      }
    } finally {
      setBusy(null);
    }
  };

  const available: LoginProvider[] = appleAvailable
    ? ["apple", "google", "email"]
    : ["google", "email"];
  let body: React.ReactNode;
  if (auth.status === "unavailable") {
    body = (
      <Text className="text-base text-gray-600 text-center mt-16 px-4">
        Accounts aren't switched on in this version of the app yet. Your saved
        scans are safe on this phone.
      </Text>
    );
  } else if (success) {
    body = (
      <AccountCreated
        outcome={success.outcome}
        provider={success.provider}
        email={success.email}
        doneLabel={
          from === "first-scan"
            ? "Back to my results"
            : from === "welcome"
              ? "Start scanning"
              : "Done"
        }
        onDone={close}
      />
    );
  } else if (emailOpen) {
    body = (
      <EmailCodeFlow
        onCancel={() => setEmailOpen(false)}
        onDone={(outcome, email) => {
          setEmailOpen(false);
          setSuccess({ outcome, provider: "email", email });
        }}
      />
    );
  } else if (signedIn) {
    body = (
      <SignedInView onClosed={close} />
    );
  } else {
    body = (
      <SignInView
        providers={available}
        busy={busy}
        onApple={() => runProvider("apple")}
        onGoogle={() => runProvider("google")}
        onEmail={() => setEmailOpen(true)}
        onNotNow={close}
        compact={from === "welcome"}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      {/* Sheet header: title on the left only when managing an account; the
          close control is always in the same place, top right. */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-lg font-bold text-gray-900" accessibilityRole="header">
          {signedIn && !success && !emailOpen ? "Account" : ""}
        </Text>
        <TouchableOpacity
          onPress={close}
          className="rounded-full bg-gray-200 items-center justify-center"
          style={{ width: 36, height: 36 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Not signed in yet
// ---------------------------------------------------------------------------

function SignInView({
  providers,
  busy,
  onApple,
  onGoogle,
  onEmail,
  onNotNow,
  compact = false,
}: {
  providers: LoginProvider[];
  busy: Busy;
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  onNotNow: () => void;
  /** From the first-launch offer, which already made the case: skip the pitch. */
  compact?: boolean;
}) {
  return (
    <View>
      <View className="items-center mt-2 mb-6">
        <Image
          source={require("../assets/brand/mark.png")}
          style={{ width: 64, height: 64 }}
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <Text
          className="text-2xl font-bold text-gray-900 text-center mt-5 mb-2"
          accessibilityRole="header"
        >
          {compact ? "Create your free account" : "Keep your scans on every phone"}
        </Text>
        <Text className="text-base text-gray-600 text-center leading-relaxed px-2">
          {compact
            ? "Pick how you'd like to sign in. Already have an account? The same buttons sign you back in."
            : "Create a free account in seconds. You never need one to scan a menu."}
        </Text>
      </View>

      {compact ? null : (
      <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
        <Benefit
          icon="cloud-done-outline"
          title="Backed up automatically"
          body="Every menu you scan is saved to your account."
        />
        <Benefit
          icon="phone-portrait-outline"
          title="Back on a new phone"
          body="Sign in and your saved scans are right there."
        />
        <Benefit
          icon="key-outline"
          title="No password, ever"
          body="Use Apple, Google, or a code we email you."
          last
        />
      </View>
      )}

      <LoginButtons
        providers={providers}
        busy={busy}
        onApple={onApple}
        onGoogle={onGoogle}
        onEmail={onEmail}
      />

      <TouchableOpacity
        onPress={onNotNow}
        disabled={busy !== null}
        className="items-center justify-center mt-3"
        style={{ minHeight: 48 }}
        accessibilityRole="button"
      >
        <Text className="text-base font-semibold text-brand-900">Not now</Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-600 text-center mt-3 leading-relaxed">
        By continuing you agree to our{" "}
        <Text
          className="underline"
          accessibilityRole="link"
          onPress={() => Linking.openURL(TERMS_URL)}
        >
          Terms
        </Text>{" "}
        and{" "}
        <Text
          className="underline"
          accessibilityRole="link"
          onPress={() => Linking.openURL(PRIVACY_URL)}
        >
          Privacy Policy
        </Text>
        . Your health settings never leave your phone.
      </Text>
    </View>
  );
}

function Benefit({
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
    <View className={`flex-row items-start ${last ? "" : "mb-4"}`}>
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

// ---------------------------------------------------------------------------
// Signed in
// ---------------------------------------------------------------------------

function SignedInView({ onClosed }: { onClosed: () => void }) {
  const auth = useAuth();
  const [working, setWorking] = useState<null | "signout" | "delete">(null);
  const [scanCount, setScanCount] = useState<number | null>(null);

  useEffect(() => {
    getSessions().then((s) => setScanCount(s.length));
  }, []);

  const name = auth.displayName ?? auth.email ?? "Your account";
  const initial = (auth.displayName ?? auth.email ?? "?").trim().charAt(0).toUpperCase();

  const confirmSignOut = () =>
    Alert.alert(
      "Sign out?",
      "Your saved scans stay in your account. This phone starts a fresh, empty history until you sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          onPress: async () => {
            setWorking("signout");
            try {
              await signOut();
              onClosed();
            } catch (error) {
              Alert.alert("Couldn't sign out", friendlyAuthError(error));
            } finally {
              setWorking(null);
            }
          },
        },
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
          onPress: async () => {
            setWorking("delete");
            try {
              await deleteAccount();
              Alert.alert("Account deleted", "Your account and saved scans have been deleted.", [
                { text: "OK", onPress: onClosed },
              ]);
            } catch (error) {
              Alert.alert(
                "Couldn't delete your account",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setWorking(null);
            }
          },
        },
      ]
    );

  return (
    <View className="flex-1">
      <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mt-2 mb-4">
        <View className="flex-row items-center">
          <View
            className="rounded-full bg-brand-900 items-center justify-center"
            style={{ width: 52, height: 52 }}
            accessible={false}
          >
            <Text className="text-white text-xl font-bold">{initial}</Text>
          </View>
          <View className="flex-1 ml-4">
            <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
              {name}
            </Text>
            {auth.displayName && auth.email ? (
              <Text className="text-sm text-gray-600" numberOfLines={1}>
                {auth.email}
              </Text>
            ) : null}
          </View>
        </View>

        {auth.currentProvider ? (
          <View className="flex-row mt-4">
            <View className="rounded-full bg-gray-100 px-3 py-1">
              <Text className="text-xs font-semibold text-gray-700">
                Signed in with {PROVIDER_LABEL[auth.currentProvider]}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6 flex-row items-center">
        <View
          className="rounded-full bg-green-50 items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Ionicons name="cloud-done-outline" size={20} color="#1B4332" />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-gray-900">Backup is on</Text>
          <Text className="text-sm text-gray-600">
            {scanCount === null
              ? "Your saved scans are backed up."
              : `${scanCount} saved ${scanCount === 1 ? "scan" : "scans"} on this phone, all backed up.`}
          </Text>
        </View>
      </View>

      {/* One login per account, on purpose: once you're signed in, this
          screen doesn't offer another way in. Sign out and Delete sit at the
          bottom of the sheet, away from everything else. */}
      <View className="flex-1" style={{ minHeight: 24 }} />

      <TouchableOpacity
        className="border border-gray-300 bg-white rounded-xl items-center justify-center flex-row"
        style={{ height: 52 }}
        onPress={confirmSignOut}
        disabled={working !== null}
        accessibilityRole="button"
      >
        {working === "signout" ? (
          <ActivityIndicator color="#1B4332" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#1B4332" />
            <Text className="text-brand-900 font-semibold text-base ml-2">Sign out</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Destructive action kept apart from the everyday one. */}
      <View className="mt-6 pt-4 border-t border-gray-200">
        <TouchableOpacity
          className="items-center justify-center"
          style={{ minHeight: 48 }}
          onPress={confirmDelete}
          disabled={working !== null}
          accessibilityRole="button"
          accessibilityLabel="Delete account permanently"
        >
          {working === "delete" ? (
            <ActivityIndicator color="#B91C1C" />
          ) : (
            <Text className="text-red-700 font-semibold text-base">Delete account</Text>
          )}
        </TouchableOpacity>
        <Text className="text-xs text-gray-600 text-center mt-1">
          Permanently removes your account and every saved scan.
        </Text>
      </View>
    </View>
  );
}
