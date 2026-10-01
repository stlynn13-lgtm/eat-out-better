import { useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable } from "react-native";

/**
 * The app icon on the home screen — and a small reward for tapping it.
 *
 * A tap spins the mark once with a springy bounce while six dots in the three
 * score colours (green, yellow, red) pop out and fade: the app's own traffic
 * lights, as confetti. Purely decorative, so it is hidden from VoiceOver, and
 * under Reduce Motion a tap does nothing at all. Everything animated is
 * opacity/transform on the native driver; nothing here moves layout.
 */

const SIZE = 44;
const DOTS = [
  { color: "#16a34a", angle: -90 },
  { color: "#d97706", angle: -30 },
  { color: "#dc2626", angle: 30 },
  { color: "#16a34a", angle: 90 },
  { color: "#d97706", angle: 150 },
  { color: "#dc2626", angle: 210 },
];
const BURST_DISTANCE = 34;

export default function BrandMark() {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const running = useRef(false);

  const play = async () => {
    if (running.current) return;
    if (await AccessibilityInfo.isReduceMotionEnabled().catch(() => false)) return;
    running.current = true;
    spin.setValue(0);
    burst.setValue(0);
    Animated.parallel([
      Animated.timing(spin, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.18,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      ]),
      Animated.timing(burst, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      running.current = false;
    });
  };

  return (
    <Pressable
      onPress={play}
      accessible={false}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{ width: SIZE, height: SIZE }}
    >
      {DOTS.map((dot, i) => {
        const rad = (dot.angle * Math.PI) / 180;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: SIZE / 2 - 4,
              top: SIZE / 2 - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dot.color,
              opacity: burst.interpolate({
                inputRange: [0, 0.15, 0.7, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateX: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(rad) * BURST_DISTANCE],
                  }),
                },
                {
                  translateY: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sin(rad) * BURST_DISTANCE],
                  }),
                },
                { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
            }}
          />
        );
      })}
      <Animated.Image
        source={require("../assets/brand/mark.png")}
        style={{
          width: SIZE,
          height: SIZE,
          transform: [
            { scale },
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
          ],
        }}
      />
    </Pressable>
  );
}
