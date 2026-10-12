import { Text, type TextProps } from "react-native";
import { MAX_FONT_SCALE } from "../lib/utils/scale";

/**
 * A Text whose size follows the phone's text-size setting only up to
 * MAX_FONT_SCALE. For screens where most of the layout is fixed in place and
 * unbounded text would push controls off screen (the capture screen). Any
 * maxFontSizeMultiplier passed in still wins.
 */
export default function CappedText(props: TextProps) {
  return <Text maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}
