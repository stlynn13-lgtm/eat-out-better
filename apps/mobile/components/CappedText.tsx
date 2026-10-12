import { Text, type TextProps } from "react-native";
import { MAX_FONT_SCALE } from "../lib/utils/scale";

/**
 * A Text whose size follows the phone's text-size setting only up to
 * MAX_FONT_SCALE. For screens where most of the layout is fixed in place and
 * unbounded text would push controls off screen (the capture screen). A
 * positive maxFontSizeMultiplier passed in still wins.
 */
export default function CappedText(props: TextProps) {
  // After the spread, so an explicit undefined/0 can't silently lift the cap.
  return (
    <Text {...props} maxFontSizeMultiplier={props.maxFontSizeMultiplier || MAX_FONT_SCALE} />
  );
}
