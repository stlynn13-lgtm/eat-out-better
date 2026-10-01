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
import { historyStats, type HistoryStats } from "../lib/utils/scanDisplay";
import Reveal from "../components/Reveal";
import { PanelGlow, ScanStack, ScoreDots, StatTile } from "../components/ScanArt";
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
 *
 * Redesigned for 1.5.0 (Sean: "much more exciting and less bland"). Both the
 * sign-in and the signed-in states now open on a dark-green panel — the pitch
 * with the user's own scan count, or their profile with what they've built up
 * — instead of a small logo over grey cards. What did NOT change: the three
 * login buttons and their order, "Not now", the legal line, one login per
 * account, and Sign out / Delete account kept apart at the bottom.
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
  const [stats, setStats] = useState<HistoryStats | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // What the user has saved so far: the pitch when signed out ("Keep your 7
  // scans safe"), the scoreboard when signed in. Re-read when the account
  // changes, because signing in can merge in scans from the account.
  useEffect(() => {
    let active = true;
    getSessions().then((sessions) => {
      if (active) setStats(historyStats(sessions));
    });
    return () => {
      active = false;
    };
  }, [auth.userId, auth.isAnonymous]);

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
      <SignedInView onClosed={close} stats={stats} />
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
        scanCount={stats?.scans ?? 0}
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
  scanCount,
}: {
  providers: LoginProvider[];
  busy: Busy;
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  onNotNow: () => void;
  /** From the first-launch offer, which already made the case: skip the pitch. */
  compact?: boolean;
  /** Scans already on this phone — the most concrete reason to sign in. */
  scanCount: number;
}) {
  const headline = compact
    ? "Create your free account"
    : scanCount > 0
      ? `Keep your ${scanCount} saved ${scanCount === 1 ? "scan" : "scans"} safe`
      : "Keep every menu you scan";

  return (
    <View>
      <Reveal>
        <View className="bg-brand-900 rounded-3xl px-5 pt-6 pb-6 mb-5 overflow-hidden">
          <PanelGlow />
          {compact ? (
            <Image
              source={require("../assets/brand/mark.png")}
              style={{ width: 56, height: 56, borderRadius: 14, alignSelf: "center" }}
              accessibilityIgnoresInvertColors
              accessible={false}
            />
          ) : (
            <View className="items-center">
              <ScanStack />
            </View>
          )}
          <Text
            className="text-2xl font-bold text-white text-center mt-5"
            accessibilityRole="header"
          >
            {headline}
          </Text>
          <Text className="text-base text-green-100 text-center leading-relaxed mt-2">
            {compact
              ? "Pick how you'd like to sign in. Already have an account? The same buttons sign you back in."
              : "A free account takes seconds. You never need one to scan a menu."}
          </Text>
        </View>
      </Reveal>

      {compact ? null : (
        <Reveal delay={90}>
          {/* One row, not three stacked cards: the login buttons are the point
              of this screen and have to stay on it without scrolling. */}
          <View className="flex-row mb-5" style={{ gap: 8 }}>
            <Benefit icon="cloud-done" tint="#DCFCE7" color="#166534" title="Backed up automatically" />
            <Benefit icon="phone-portrait" tint="#DBEAFE" color="#1E40AF" title="Ready on a new phone" />
            <Benefit icon="key" tint="#FEF3C7" color="#92400E" title="No password, ever" />
          </View>
        </Reveal>
      )}

      <Reveal delay={compact ? 90 : 180}>
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
      </Reveal>
    </View>
  );
}

function Benefit({
  icon,
  tint,
  color,
  title,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  /** Tile fill and icon colour. Three different ones, so the row isn't grey. */
  tint: string;
  color: string;
  title: string;
}) {
  return (
    <View
      className="flex-1 items-center bg-white rounded-2xl px-2 py-3 border border-gray-100"
      accessible
      accessibilityLabel={title}
    >
      <View
        className="items-center justify-center"
        style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: tint }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="text-sm font-semibold text-gray-900 text-center leading-snug mt-2">
        {title}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Signed in
// ---------------------------------------------------------------------------

function SignedInView({
  onClosed,
  stats,
}: {
  onClosed: () => void;
  stats: HistoryStats | null;
}) {
  const auth = useAuth();
  const [working, setWorking] = useState<null | "signout" | "delete">(null);
  const scanCount = stats?.scans ?? null;

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
      <Reveal>
        <View className="bg-brand-900 rounded-3xl px-5 pt-6 pb-5 mt-2 mb-4 overflow-hidden">
          <PanelGlow />
          <View className="items-center">
            {/* The ring is the three score colours' neutral cousin: white on
                green, so the initial reads at a glance. */}
            <View
              className="rounded-full items-center justify-center"
              style={{ width: 84, height: 84, backgroundColor: "rgba(255,255,255,0.18)" }}
              accessible={false}
            >
              <View
                className="rounded-full bg-white items-center justify-center"
                style={{ width: 68, height: 68 }}
              >
                <Text className="text-brand-900 text-3xl font-bold">{initial}</Text>
              </View>
            </View>
            <Text
              className="text-xl font-bold text-white text-center mt-3"
              numberOfLines={1}
              accessibilityRole="header"
            >
              {name}
            </Text>
            {auth.displayName && auth.email ? (
              <Text className="text-sm text-green-100 text-center mt-0.5" numberOfLines={1}>
                {auth.email}
              </Text>
            ) : null}
            {auth.currentProvider ? (
              <View
                className="flex-row items-center rounded-full px-3 py-1.5 mt-3"
                style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
              >
                <ScoreDots size={6} />
                <Text className="text-xs font-semibold text-white ml-2">
                  Signed in with {PROVIDER_LABEL[auth.currentProvider]}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row mt-5" style={{ gap: 8 }}>
            <StatTile
              onDark
              value={stats?.scans ?? null}
              label={stats?.scans === 1 ? "menu saved" : "menus saved"}
            />
            <StatTile onDark value={stats?.dishes ?? null} label="dishes scored" />
            <StatTile onDark value={stats?.greens ?? null} label="green picks" />
          </View>
        </View>
      </Reveal>

      <Reveal delay={90}>
        <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-6 flex-row items-center">
          <View
            className="items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#DCFCE7" }}
          >
            <Ionicons name="cloud-done" size={22} color="#166534" />
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
      </Reveal>

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
