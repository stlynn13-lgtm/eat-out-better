import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MenuSession } from "@eat-out-better/shared";
import { renameSession, SCAN_NAME_MAX } from "../lib/storage/session";
import { scanName } from "../lib/utils/scanDisplay";

/**
 * Name (or rename) a saved scan.
 *
 * The name read off the menu is only ever a suggestion: menus often don't
 * print it, and when they do it can be the parent company or a slogan. So the
 * field is always editable, and when a printed name exists and isn't what's in
 * the field it is offered back as a one-tap chip.
 *
 * A custom dialog rather than `Alert.prompt`, which is iOS-only and can't show
 * the suggestion.
 */
export default function RenameSheet({
  session,
  onClose,
  onRenamed,
}: {
  /** The scan being named; `null` keeps the sheet closed. */
  session: MenuSession | null;
  onClose: () => void;
  onRenamed: (updated: MenuSession) => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refill each time it opens, for whichever scan it opened on.
  useEffect(() => {
    if (!session) return;
    setValue(scanName(session) ?? "");
    setError(null);
    setSaving(false);
  }, [session]);

  const printed = session?.restaurantName?.trim() || null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  const showSuggestion = printed !== null && trimmed.toLowerCase() !== printed.toLowerCase();

  const save = async () => {
    if (!session || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Typing the printed name back in is not a custom name — store nothing,
      // so the scan keeps following what was read off the menu.
      const custom = printed && trimmed.toLowerCase() === printed.toLowerCase() ? "" : trimmed;
      const updated = await renameSession(session.id, custom);
      if (!updated) {
        setError("This scan isn't saved on this phone, so it can't be named.");
        return;
      }
      onRenamed(updated);
      onClose();
    } catch {
      setError("That name didn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={session !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          className="items-center justify-center px-5"
          onPress={onClose}
          accessibilityLabel="Close without saving"
        >
          {/* Swallows taps so touching the card doesn't dismiss it. */}
          <Pressable
            className="w-full bg-white rounded-3xl p-5"
            style={{ maxWidth: 420 }}
            onPress={() => {}}
            accessible={false}
          >
            <Text className="text-xl font-bold text-gray-900" accessibilityRole="header">
              Name this menu
            </Text>
            <Text className="text-sm text-gray-600 mt-1 leading-snug">
              So you can find it next time you're there. Only you see it.
            </Text>

            <Text className="text-sm font-semibold text-gray-700 mt-4 mb-1.5">
              Restaurant name
            </Text>
            <View
              className="flex-row items-center border border-gray-300 rounded-xl bg-white px-3"
              style={{ minHeight: 52 }}
            >
              <TextInput
                className="flex-1 text-base text-gray-900"
                style={{ paddingVertical: 12 }}
                value={value}
                onChangeText={(text) => {
                  setValue(text);
                  if (error) setError(null);
                }}
                placeholder="e.g. Luigi's Trattoria"
                placeholderTextColor="#6B7280"
                maxLength={SCAN_NAME_MAX}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={save}
                selectTextOnFocus
                accessibilityLabel="Restaurant name"
              />
              {value.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setValue("")}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear the name"
                >
                  <Ionicons name="close-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>

            {error ? (
              <Text className="text-sm text-red-700 mt-2" accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            {showSuggestion ? (
              <TouchableOpacity
                className="flex-row items-center self-start bg-green-50 border border-green-200 rounded-full px-3 mt-3"
                style={{ minHeight: 44 }}
                onPress={() => setValue(printed)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Use the name from the menu: ${printed}`}
              >
                <Ionicons name="sparkles-outline" size={16} color="#1B4332" />
                <Text className="text-sm font-semibold text-brand-900 ml-1.5" numberOfLines={1}>
                  From the menu: {printed}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View className="flex-row mt-5" style={{ gap: 12 }}>
              <TouchableOpacity
                className="flex-1 border border-gray-300 rounded-xl items-center justify-center"
                style={{ height: 52 }}
                onPress={onClose}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-brand-900 rounded-xl items-center justify-center"
                style={{ height: 52 }}
                onPress={save}
                disabled={saving}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Save name"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
