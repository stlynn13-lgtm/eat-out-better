import { View, Text } from "react-native";

/**
 * Small decorative pieces shared by the Saved scans and Account screens, so
 * the two feel like the same product. All of it is hidden from VoiceOver.
 */

const SCORE = { green: "#16a34a", yellow: "#d97706", red: "#dc2626" } as const;

/** The app's traffic lights, as an accent. */
export function ScoreDots({ size = 8 }: { size?: number }) {
  return (
    <View className="flex-row" style={{ gap: size / 2 }} accessible={false}>
      {(["green", "yellow", "red"] as const).map((tier) => (
        <View
          key={tier}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: SCORE[tier] }}
        />
      ))}
    </View>
  );
}

/** Soft circles behind a dark-green panel. Parent needs `overflow-hidden`. */
export function PanelGlow() {
  return (
    <View pointerEvents="none" accessible={false} style={{ position: "absolute", inset: 0 }}>
      <View
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: 90,
          right: -60,
          top: -70,
          backgroundColor: "#40916C",
          opacity: 0.35,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: 60,
          left: -40,
          bottom: -50,
          backgroundColor: "#2D6A4F",
          opacity: 0.6,
        }}
      />
    </View>
  );
}

/** A pretend saved-scan row: a dot, a name, a score. */
export function MiniScanCard({
  tier,
  score,
  width,
  rotate = "0deg",
}: {
  tier: keyof typeof SCORE;
  score: string;
  /** Width of the grey "name" bar, so a stack of these doesn't look cloned. */
  width: number;
  rotate?: string;
}) {
  return (
    <View
      accessible={false}
      className="flex-row items-center bg-white rounded-2xl px-3"
      style={{
        height: 44,
        transform: [{ rotate }],
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: SCORE[tier] }} />
      <View
        style={{ width, height: 8, borderRadius: 4, backgroundColor: "#E5E7EB", marginLeft: 10 }}
      />
      <View className="flex-1" />
      <Text className="text-sm font-bold text-gray-800 tabular-nums ml-3">{score}</Text>
    </View>
  );
}

/** Three of them, fanned. */
export function ScanStack() {
  return (
    <View accessible={false} style={{ width: 220, gap: 8 }}>
      <View style={{ marginRight: 28 }}>
        <MiniScanCard tier="green" score="9.0" width={96} rotate="-3deg" />
      </View>
      <View style={{ marginLeft: 28 }}>
        <MiniScanCard tier="yellow" score="6.5" width={72} rotate="2deg" />
      </View>
      <View style={{ marginRight: 12, marginLeft: 12 }}>
        <MiniScanCard tier="red" score="3.5" width={110} rotate="-1deg" />
      </View>
    </View>
  );
}

/** One number with a label under it. Three of these make a stats row. */
export function StatTile({
  value,
  label,
  onDark = false,
}: {
  value: number | null;
  label: string;
  onDark?: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-2xl px-3 py-3 items-center ${
        onDark ? "" : "bg-white border border-gray-100"
      }`}
      style={onDark ? { backgroundColor: "rgba(255,255,255,0.12)" } : undefined}
      accessible
      accessibilityLabel={`${value ?? 0} ${label}`}
    >
      <Text
        className={`text-2xl font-bold tabular-nums ${onDark ? "text-white" : "text-brand-900"}`}
      >
        {value ?? "–"}
      </Text>
      <Text
        className={`text-xs font-medium text-center mt-0.5 ${
          onDark ? "text-green-100" : "text-gray-600"
        }`}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}
