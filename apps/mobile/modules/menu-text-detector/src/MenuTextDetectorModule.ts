import { requireNativeModule } from "expo-modules-core";

export type TextDetectionResult = {
  blockCount: number;
  charCount: number;
  averageConfidence: number;
};

type MenuTextDetectorModuleType = {
  detectText(uri: string): Promise<TextDetectionResult>;
};

// Throws on platforms where the native module isn't linked (e.g. Android).
export default requireNativeModule<MenuTextDetectorModuleType>(
  "MenuTextDetector"
);
