import { View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import type { LoginProvider } from "../../lib/auth/account";

/**
 * The three ways in, stacked. Apple first and at full size: when an app offers
 * a third-party login like Google, App Store Guideline 4.8 wants Sign in with
 * Apple offered as an equivalent option, and HIG places it first.
 *
 * All three share one height (52pt) and radius (12pt) so they read as a set.
 * Google's button follows Google's own branding rules: white fill, a 1px
 * #747775 border, #1F1F1F text, the unmodified full-colour "G" (cropped from
 * Google's official sign-in asset pack at native @2x/@3x — never redrawn or
 * recoloured). The email button borrows the same treatment so the stack
 * doesn't look like two brands and an afterthought.
 */

export const LOGIN_BUTTON_HEIGHT = 52;
const OUTLINE = "#747775";
const ON_WHITE = "#1F1F1F";

export default function LoginButtons({
  providers,
  busy,
  onApple,
  onGoogle,
  onEmail,
}: {
  providers: LoginProvider[];
  /** Which button is working, if any. Every button is disabled while one is. */
  busy: LoginProvider | "other" | null;
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
}) {
  const locked = busy !== null;

  return (
    <View style={{ gap: 12 }}>
      {providers.includes("apple") ? (
        <View
          pointerEvents={locked ? "none" : "auto"}
          style={{ opacity: busy === "apple" ? 0.6 : locked ? 0.45 : 1 }}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={{ width: "100%", height: LOGIN_BUTTON_HEIGHT }}
            onPress={onApple}
          />
        </View>
      ) : null}

      {providers.includes("google") ? (
        <OutlineButton
          label="Continue with Google"
          busy={busy === "google"}
          disabled={locked}
          onPress={onGoogle}
          icon={
            <Image
              source={require("../../assets/brand/google-g.png")}
              style={{ width: 20, height: 20 }}
              accessible={false}
            />
          }
        />
      ) : null}

      {providers.includes("email") ? (
        <OutlineButton
          label="Continue with email"
          busy={busy === "email"}
          disabled={locked}
          onPress={onEmail}
          icon={<Ionicons name="mail-outline" size={20} color={ON_WHITE} />}
        />
      ) : null}
    </View>
  );
}

function OutlineButton({
  label,
  icon,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      className="flex-row items-center justify-center rounded-xl bg-white"
      style={{
        height: LOGIN_BUTTON_HEIGHT,
        borderWidth: 1,
        borderColor: OUTLINE,
        opacity: disabled && !busy ? 0.45 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={ON_WHITE} />
      ) : (
        <>
          {icon}
          <Text
            className="font-semibold"
            style={{ color: ON_WHITE, fontSize: 17, marginLeft: 12 }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
