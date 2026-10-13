import { useWindowDimensions } from "react-native";

/**
 * Cap on how far text follows the phone's text-size setting, for screens whose
 * layout is mostly fixed in place (capture screen, the sign-in code field).
 * 1.3x is still well past default. Use this rather than a new number on any
 * screen that needs a cap. (The full-screen photo viewer predates it and still
 * has its own caps.)
 */
export const MAX_FONT_SCALE = 1.3;

/**
 * Scale factor for fixed-size assets, following the phone's text-size setting.
 *
 * Text already tracks that setting on its own — React Native's `allowFontScaling`
 * defaults to true and nothing in this app turns it off. Images, icons and touch
 * targets do NOT: they're declared in fixed points and stay put while the text
 * around them grows, so at large accessibility sizes the photo thumbnails end up
 * dwarfed by their own captions. EAT-15 asks for both halves.
 *
 * Clamped rather than raw. iOS accessibility sizes reach ~3.1×, which would blow
 * a 64pt thumbnail out to 200pt and break the tray it sits in; the text beside
 * it can keep growing past this cap without hurting anything. The lower bound
 * keeps assets from shrinking to un-tappable at the smallest setting.
 */
export function useAssetScale(max = 1.6): number {
  const { fontScale } = useWindowDimensions();
  if (!Number.isFinite(fontScale) || fontScale <= 0) return 1;
  return Math.min(Math.max(fontScale, 0.9), max);
}

/** Convenience: a fixed point size scaled and rounded for layout. */
export function useScaledSize(size: number, max?: number): number {
  return Math.round(size * useAssetScale(max));
}
