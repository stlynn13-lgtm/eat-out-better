import { useRef } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

/**
 * A tappable block that dips slightly under the finger and springs back.
 *
 * Used for cards, where TouchableOpacity's fade makes a large surface look
 * like it is disappearing. Transform only, on the native driver, so pressing
 * never moves the layout around it.
 */
export default function PressableScale({
  children,
  style,
  className,
  pressedScale = 0.97,
  ...rest
}: Omit<PressableProps, "style" | "children"> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  pressedScale?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: value === 1 ? 6 : 0,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable {...rest} onPressIn={() => to(pressedScale)} onPressOut={() => to(1)}>
      <Animated.View className={className} style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
