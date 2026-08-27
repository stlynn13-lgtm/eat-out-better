import { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";

/**
 * Fade-and-rise entrance for a block of content.
 *
 * Deliberately a content-agnostic wrapper rather than an animation baked into
 * the welcome screen's markup: the welcome screen's layout is due to be
 * redesigned, and this survives that intact.
 *
 * Both animated properties (opacity, translateY) are native-driver eligible, so
 * the whole thing runs on the UI thread — nothing here can be stuttered by JS
 * work happening at launch.
 */
export default function Reveal({
  children,
  delay = 0,
  distance = 14,
  duration = 420,
  style,
}: {
  children: React.ReactNode;
  /** Stagger, in ms. Keep steps ~70-90ms apart; beyond ~400ms total it drags. */
  delay?: number;
  /** How far the block rises into place, in points. */
  distance?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, duration]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
