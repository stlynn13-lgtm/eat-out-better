import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "./PressableScale";
import { PanelGlow, ScoreDots } from "./ScanArt";

/**
 * The way into the account screen from home.
 *
 * Signed out, it is the one dark-green block on an otherwise white screen, and
 * it leads with what's in it for the user — their own scan count when they
 * have one — rather than with the word "account". Signed in, it steps back to
 * a plain white row with their initial: the job is done, so it stops selling.
 */
export default function AccountEntryCard({
  signedIn,
  name,
  scanCount,
  onPress,
}: {
  signedIn: boolean;
  /** Display name or email of the signed-in user, when known. */
  name: string | null;
  scanCount: number;
  onPress: () => void;
}) {
  if (signedIn) {
    const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
    return (
      <PressableScale
        className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 mt-3"
        style={{ minHeight: 64 }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Your account${name ? `, ${name}` : ""}. ${scanCount} saved ${
          scanCount === 1 ? "scan" : "scans"
        } backed up.`}
      >
        <View
          className="rounded-full bg-brand-900 items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Text className="text-white text-base font-bold">{initial}</Text>
        </View>
        <View className="flex-1 ml-3 py-2">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {name ?? "Your account"}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Ionicons name="cloud-done" size={14} color="#15803d" />
            <Text className="text-sm text-gray-600 ml-1">
              {scanCount === 0
                ? "Backup is on"
                : `${scanCount} ${scanCount === 1 ? "scan" : "scans"} backed up`}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </PressableScale>
    );
  }

  const title =
    scanCount > 0
      ? `Back up your ${scanCount} saved ${scanCount === 1 ? "scan" : "scans"}`
      : "Keep every menu you scan";

  return (
    <PressableScale
      className="bg-brand-900 rounded-2xl px-4 py-3 mt-3 overflow-hidden"
      style={{ minHeight: 76 }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Create a free account or sign in.`}
    >
      <PanelGlow />
      <View className="flex-row items-center">
        <View
          className="rounded-full bg-white items-center justify-center"
          style={{ width: 44, height: 44 }}
        >
          <Ionicons name="cloud-upload" size={22} color="#1B4332" />
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center mb-1">
            <ScoreDots size={6} />
            <Text className="text-xs font-semibold text-green-100 uppercase tracking-wider ml-2">
              Free account
            </Text>
          </View>
          <Text className="text-base font-bold text-white">{title}</Text>
          <Text className="text-sm text-green-100 mt-0.5">
            Takes seconds · no password · or sign in
          </Text>
        </View>
        <View
          className="rounded-full bg-white items-center justify-center ml-2"
          style={{ width: 32, height: 32 }}
        >
          <Ionicons name="arrow-forward" size={18} color="#1B4332" />
        </View>
      </View>
    </PressableScale>
  );
}
