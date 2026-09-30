import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CodeInput, { CODE_LENGTH } from "./CodeInput";
import {
  sendEmailCode,
  verifyEmailCode,
  friendlyAuthError,
  type EmailCodeMode,
  type SignInOutcome,
} from "../../lib/auth/account";

/**
 * Email sign-in as two short steps: your address, then the 6-digit code.
 *
 * Progressive disclosure — the code step doesn't exist until there's a code to
 * type. Errors appear under the field they belong to, never in an alert, and
 * are announced to VoiceOver. The code submits itself on the sixth digit so an
 * autofilled code from Mail signs you in with no extra tap.
 */

// Matches Supabase's "minimum interval per user" for emails (60s on the live
// project). Offering "Send a new code" sooner only earns a rate-limit error.
const RESEND_AFTER_SECONDS = 60;

export default function EmailCodeFlow({
  onDone,
  onCancel,
}: {
  onDone: (outcome: SignInOutcome, email: string) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"address" | "code">("address");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<EmailCodeMode>("link");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const startResendTimer = () => {
    setResendIn(RESEND_AFTER_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const send = async () => {
    if (busy) return;
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError("Enter an email address like name@example.com.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setMode(await sendEmailCode(address));
      setCode("");
      setStep("code");
      startResendTimer();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (busy) return;
    if (value.length !== CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits from the email.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const outcome = await verifyEmailCode(email, value, mode);
      onDone(outcome, email.trim().toLowerCase());
    } catch (e) {
      setError(friendlyAuthError(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={step === "code" ? () => { setStep("address"); setError(null); } : onCancel}
        disabled={busy}
        className="flex-row items-center self-start mb-5"
        style={{ minHeight: 44 }}
        accessibilityRole="button"
        accessibilityLabel={step === "code" ? "Change email address" : "Back to sign-in options"}
      >
        <Ionicons name="chevron-back" size={20} color="#1B4332" />
        <Text className="text-base font-medium text-brand-900 ml-1">
          {step === "code" ? "Change email" : "Other ways to sign in"}
        </Text>
      </TouchableOpacity>

      {step === "address" ? (
        <>
          <Text className="text-2xl font-bold text-gray-900 mb-2">What's your email?</Text>
          <Text className="text-base text-gray-600 leading-relaxed mb-5">
            We'll email you a 6-digit code. There's no password to remember.
          </Text>

          <Text nativeID="email-label" className="text-sm font-semibold text-gray-700 mb-2">
            Email address
          </Text>
          <TextInput
            className="bg-white rounded-xl px-4 text-base text-gray-900"
            style={{
              height: 52,
              borderWidth: error ? 2 : 1,
              borderColor: error ? "#dc2626" : "#D1D5DB",
            }}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (error) setError(null);
            }}
            placeholder="name@example.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={send}
            editable={!busy}
            autoFocus
            accessibilityLabelledBy="email-label"
          />
          <FieldError message={error} />

          <PrimaryButton label="Send code" busy={busy} onPress={send} />
        </>
      ) : (
        <>
          <Text className="text-2xl font-bold text-gray-900 mb-2">Check your email</Text>
          <Text className="text-base text-gray-600 leading-relaxed mb-6">
            Enter the 6-digit code we sent to{" "}
            <Text className="font-semibold text-gray-900">{email.trim()}</Text>. It can take a
            minute — check spam if it isn't there.
          </Text>

          <CodeInput
            value={code}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            onComplete={(v) => verify(v)}
            hasError={!!error}
            editable={!busy}
          />
          <FieldError message={error} />

          <PrimaryButton label="Continue" busy={busy} onPress={() => verify()} />

          <View className="items-center mt-4">
            {resendIn > 0 ? (
              <Text className="text-sm text-gray-600" style={{ lineHeight: 44 }}>
                Send a new code in {resendIn}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={send}
                disabled={busy}
                style={{ minHeight: 44, justifyContent: "center" }}
                accessibilityRole="button"
              >
                <Text className="text-sm font-semibold text-brand-900">Send a new code</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return <View className="h-4" />;
  return (
    <View
      className="flex-row items-start mt-2 mb-1"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="alert-circle" size={16} color="#dc2626" style={{ marginTop: 2 }} />
      <Text className="text-sm text-red-700 ml-1.5 flex-1">{message}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  busy = false,
  onPress,
}: {
  label: string;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="bg-brand-900 rounded-xl items-center justify-center mt-4"
      style={{ height: 52 }}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-white font-semibold text-base">{label}</Text>
      )}
    </TouchableOpacity>
  );
}
