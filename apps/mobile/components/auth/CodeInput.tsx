import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";

/**
 * Six boxes for the emailed code, backed by ONE real TextInput laid over them.
 *
 * One input rather than six is what keeps the platform features working:
 * `textContentType="oneTimeCode"` lets iOS offer the code from Mail above the
 * keyboard, paste lands the whole code at once, and backspace behaves. The
 * boxes are only a picture of what's in that input.
 */

export const CODE_LENGTH = 6;

export default function CodeInput({
  value,
  onChange,
  onComplete,
  hasError,
  editable = true,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Fired once when the sixth digit arrives — typed, pasted or autofilled. */
  onComplete: (code: string) => void;
  hasError: boolean;
  editable?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(true);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(digits);
    if (digits.length === CODE_LENGTH && value.length !== CODE_LENGTH) {
      onComplete(digits);
    }
  };

  const activeIndex = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      className="flex-row justify-between"
    >
      {Array.from({ length: CODE_LENGTH }).map((_, i) => {
        const digit = value[i] ?? "";
        const isActive = focused && editable && i === activeIndex;
        const borderColor = hasError ? "#dc2626" : isActive ? "#1B4332" : "#D1D5DB";
        return (
          <View
            key={i}
            className="items-center justify-center rounded-xl bg-white"
            style={{
              width: 48,
              height: 56,
              borderWidth: isActive || hasError ? 2 : 1,
              borderColor,
            }}
          >
            <Text className="text-2xl font-semibold text-gray-900" maxFontSizeMultiplier={1.3}>
              {digit}
            </Text>
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        editable={editable}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={`${CODE_LENGTH}-digit code`}
        accessibilityHint="The code is in the email we just sent you."
        // Laid over the boxes so a tap anywhere focuses it. Nearly invisible
        // rather than fully transparent: iOS won't raise the keyboard for an
        // input with opacity 0.
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.02,
          color: "transparent",
        }}
      />
    </Pressable>
  );
}
