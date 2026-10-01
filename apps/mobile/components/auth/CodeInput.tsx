import { useState } from "react";
import { TextInput } from "react-native";

/**
 * The emailed code, in ONE ordinary, visible text field.
 *
 * This used to be six drawn boxes over a nearly invisible input. It looked
 * tidy and broke the thing people actually do: copy the code in their mail app
 * and paste it. An input you can't see doesn't reliably offer the system Paste
 * menu. A plain field does — tap it and Paste is there — and it still gets the
 * code suggested above the keyboard (`textContentType="oneTimeCode"`). Wide
 * letter-spacing keeps the digits reading as six separate characters.
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
  const [focused, setFocused] = useState(true);

  const handleChange = (text: string) => {
    // Pasted text may carry spaces or a sentence around the code; keep digits.
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(digits);
    if (digits.length === CODE_LENGTH && value.length !== CODE_LENGTH) {
      onComplete(digits);
    }
  };

  return (
    <TextInput
      value={value}
      onChangeText={handleChange}
      editable={editable}
      autoFocus
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      placeholder="000000"
      placeholderTextColor="#D1D5DB"
      selectionColor="#1B4332"
      maxFontSizeMultiplier={1.3}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityLabel={`${CODE_LENGTH}-digit code`}
      accessibilityHint="The code is in the email we just sent you. You can paste it."
      className="bg-white rounded-xl text-gray-900 font-semibold"
      style={{
        height: 60,
        fontSize: 28,
        letterSpacing: 10,
        textAlign: "center",
        // No maxLength: iOS applies it BEFORE onChangeText, which would cut a
        // pasted "Your code is 123456" down to its first six characters.
        borderWidth: hasError || focused ? 2 : 1,
        borderColor: hasError ? "#dc2626" : focused ? "#1B4332" : "#D1D5DB",
      }}
    />
  );
}
