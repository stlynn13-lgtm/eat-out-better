import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useScaledSize } from "../../lib/utils/scale";

interface PhotoViewerProps {
  /** The capture screen's photo tray, in tray order. */
  photos: string[];
  /** Index to open on; `null` means the viewer is closed. */
  initialIndex: number | null;
  onClose: () => void;
  /** Removes the photo at `index` from the tray. Must be stable (useCallback). */
  onDelete: (index: number) => void;
  /**
   * Removes the photo at `index` AND closes the viewer, returning the user to
   * the camera to shoot it again. Distinct from `onDelete`, which keeps the
   * viewer open on the next photo. Must be stable (useCallback).
   */
  onRetake: (index: number) => void;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
// Below this a pinch counts as "not zoomed" and springs back to fit, so a
// photo can't be left at 1.02× with paging silently disabled.
const ZOOMED_THRESHOLD = 1.05;
// A drag past this distance, or a flick faster than this, closes the viewer.
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

/**
 * Full-screen photo viewer for the capture tray (EAT-13).
 *
 * The 64pt thumbnails are too small to tell a legible menu page from a blurred
 * one, which is the single check worth making before spending a scan. Tapping a
 * thumbnail opens the photo full-bleed; from there:
 *
 *   - swipe sideways to page through the rest of the tray
 *   - pinch (or double-tap) to zoom in and check the small print
 *   - swipe down, or tap ×, to go back to the tray — the photo stays in it
 *
 * Deliberately a Modal over the capture screen rather than a route: the photo
 * list lives in `capture.tsx` local state, so a route would mean lifting it into
 * the store or serialising URIs through params for a view that is always
 * transient.
 *
 * Pure JS on native modules both release lines already carry (gesture-handler,
 * reanimated, worklets), so this ships over the air to build 9 and build 11.
 */
export default function PhotoViewer({
  photos,
  initialIndex,
  onClose,
  onDelete,
  onRetake,
}: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  // Controls track the phone's text-size setting like the rest of the app's
  // fixed-size assets (EAT-15). The close button is the one control people
  // reach for with a thumb in a hurry, so it is deliberately large; its cap is
  // lower than the default so the largest text size doesn't blow it out to a
  // quarter of the screen.
  const closeSize = useScaledSize(64, 1.25);
  const deleteSize = useScaledSize(40);
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);
  // Paging is disabled while a photo is zoomed, so a pan inside the zoomed
  // photo moves the photo instead of flipping to the next one.
  const [zoomed, setZoomed] = useState(false);
  // Shared by every page, written only by the one being dragged. Drives the
  // backdrop and controls fading out as a swipe-down gathers pace.
  const dismissY = useSharedValue(0);
  const visible = initialIndex !== null;

  // Open on whichever thumbnail was tapped. RN's Modal renders nothing while
  // hidden, so the list remounts on every open and `initialScrollIndex` below
  // lands on the right page without a visible scroll.
  useEffect(() => {
    if (initialIndex !== null) {
      setIndex(initialIndex);
      setZoomed(false);
      dismissY.value = 0;
    }
  }, [initialIndex, dismissY]);

  // A swipe-down leaves the drag offset at the bottom of the screen when the
  // viewer closes. Reset it while nothing is on screen, so the next open
  // doesn't paint one frame of a faded, pushed-down photo before the effect
  // above runs.
  useEffect(() => {
    if (!visible) dismissY.value = 0;
  }, [visible, dismissY]);

  // Deleting the only photo leaves nothing to look at — close instead of
  // showing an empty black screen.
  useEffect(() => {
    if (visible && photos.length === 0) onClose();
  }, [visible, photos.length, onClose]);

  const handleDelete = useCallback(() => {
    const removing = index;
    const remaining = photos.length - 1;
    setZoomed(false);
    onDelete(removing);
    // The list shrinks underneath us. Hold the same slot so the next photo
    // slides into view, except when the last one was removed — then step back.
    // At zero the effect above closes the viewer.
    if (remaining <= 0) return;
    const nextIndex = Math.min(removing, remaining - 1);
    setIndex(nextIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: nextIndex, animated: false });
    });
  }, [index, photos.length, onDelete]);

  // Paging is driven by scroll offset rather than onViewableItemsChanged: the
  // viewability config can't be swapped after mount, and offset maths is exact
  // for a full-width pager.
  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndex(Math.max(0, Math.min(next, photos.length - 1)));
    },
    [width, photos.length]
  );

  // Fade the chrome with the drag, so it reads as "letting go of the photo"
  // rather than the photo sliding over a fixed black sheet.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dismissY.value, [0, 320], [1, 0.15], Extrapolation.CLAMP),
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dismissY.value, [0, 120], [1, 0], Extrapolation.CLAMP),
  }));

  if (!visible || photos.length === 0) return null;

  const safeIndex = Math.min(index, photos.length - 1);
  const barThickness = Math.max(3, Math.round(closeSize / 18));

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait"]}
      statusBarTranslucent
    >
      {/* A Modal is a separate native root on iOS, so gestures inside it need
          their own root view — the one in _layout.tsx doesn't reach in here. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
            { backgroundColor: "black" },
            backdropStyle,
          ]}
        />

        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex ?? 0, photos.length - 1)}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item }) => (
            <ZoomablePhoto
              uri={item}
              width={width}
              height={height}
              zoomed={zoomed}
              dismissY={dismissY}
              onZoomChange={setZoomed}
              onDismiss={onClose}
            />
          )}
        />

        {/* Controls float over the photo so it stays full-bleed. */}
        <Animated.View
          pointerEvents="box-none"
          style={[{ position: "absolute", top: 0, left: 0, right: 0 }, chromeStyle]}
        >
          <SafeAreaView edges={["top"]} pointerEvents="box-none">
            <View
              pointerEvents="box-none"
              className="flex-row items-center justify-between"
              // Held well off the screen corners: the old 36pt button sat in the
              // rounded corner of the display, which is exactly where a thumb
              // lands least accurately.
              style={{ paddingHorizontal: 24, paddingTop: 16 }}
            >
              <TouchableOpacity
                className="rounded-full items-center justify-center"
                style={{
                  width: closeSize,
                  height: closeSize,
                  backgroundColor: "rgba(17,24,39,0.72)",
                }}
                hitSlop={8}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close photo"
                accessibilityHint="Returns to your photos. This photo stays in the scan."
              >
                {/* Drawn rather than a "×" glyph: a glyph sits on the font's
                    baseline and never centres exactly in a large circle. */}
                <View
                  style={{
                    position: "absolute",
                    width: closeSize * 0.42,
                    height: barThickness,
                    borderRadius: barThickness,
                    backgroundColor: "white",
                    transform: [{ rotate: "45deg" }],
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    width: closeSize * 0.42,
                    height: barThickness,
                    borderRadius: barThickness,
                    backgroundColor: "white",
                    transform: [{ rotate: "-45deg" }],
                  }}
                />
              </TouchableOpacity>

              {photos.length > 1 ? (
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: "rgba(17,24,39,0.65)" }}
                >
                  <Text className="text-white text-sm font-medium">
                    {safeIndex + 1} of {photos.length}
                  </Text>
                </View>
              ) : null}

              {/* Icon, not a text button — EAT-13 asks for clear icons. Kept
                  smaller than close on purpose: the big target is the safe
                  action, the destructive one takes aim. */}
              <TouchableOpacity
                className="rounded-full items-center justify-center"
                style={{
                  width: deleteSize,
                  height: deleteSize,
                  backgroundColor: "rgba(220,38,38,0.92)",
                }}
                onPress={handleDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete this photo"
              >
                <Text className="text-white text-base leading-none">🗑</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Retake sits at the bottom rather than in the top row: it is the one
            action here whose meaning isn't obvious from an icon, so it carries
            a label, and putting it under the thumb keeps the top row's
            close/delete pairing intact (EAT-13 asked for icons there). */}
        <Animated.View
          pointerEvents="box-none"
          style={[{ position: "absolute", bottom: 0, left: 0, right: 0 }, chromeStyle]}
        >
          <SafeAreaView edges={["bottom"]} pointerEvents="box-none">
            <View pointerEvents="box-none" className="items-center pb-3">
              <TouchableOpacity
                className="flex-row items-center rounded-full px-5 py-3 mb-2"
                style={{ backgroundColor: "rgba(17,24,39,0.65)" }}
                onPress={() => onRetake(safeIndex)}
                accessibilityRole="button"
                accessibilityLabel="Retake this photo"
              >
                <Text className="text-white text-base mr-2">📷</Text>
                <Text className="text-white text-base font-semibold">Retake</Text>
              </TouchableOpacity>

              <Text className="text-center text-sm text-gray-400">
                {photos.length > 1 ? "Swipe sideways for your other photos\n" : ""}
                Pinch to zoom · Swipe down to close
              </Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

interface ZoomablePhotoProps {
  uri: string;
  width: number;
  height: number;
  /** Whether any photo is zoomed — decides which job a one-finger drag does. */
  zoomed: boolean;
  dismissY: SharedValue<number>;
  onZoomChange: (zoomed: boolean) => void;
  onDismiss: () => void;
}

/**
 * One page of the viewer: pinch/double-tap zoom, panning while zoomed, and
 * swipe-down-to-close while not.
 *
 * Transforms are applied as translate-then-scale about the centre, so a screen
 * point is `centre + t + s·(p − centre)`. Keeping the content under the pinch
 * focal point therefore needs `t₁ = f − k·(f − t₀)`, where `f` is the focal
 * point relative to the centre and `k` the scale ratio.
 */
function ZoomablePhoto({
  uri,
  width,
  height,
  zoomed,
  dismissY,
  onZoomChange,
  onDismiss,
}: ZoomablePhotoProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const gesture = useMemo(() => {
    const clampT = (value: number, s: number, size: number) => {
      "worklet";
      const max = Math.max(0, (size * s - size) / 2);
      return Math.min(max, Math.max(-max, value));
    };

    const resetZoom = () => {
      "worklet";
      scale.value = withTiming(1);
      tx.value = withTiming(0);
      ty.value = withTiming(0);
      savedScale.value = 1;
      savedTx.value = 0;
      savedTy.value = 0;
    };

    const pinch = Gesture.Pinch()
      .onStart((e) => {
        focalX.value = e.focalX - width / 2;
        focalY.value = e.focalY - height / 2;
        // Lock paging for the whole pinch, not just once it ends — otherwise a
        // two-finger pinch that drifts sideways can flip the page mid-zoom.
        scheduleOnRN(onZoomChange, true);
      })
      .onUpdate((e) => {
        const next = Math.min(MAX_SCALE, Math.max(0.8, savedScale.value * e.scale));
        const k = next / savedScale.value;
        scale.value = next;
        tx.value = focalX.value - k * (focalX.value - savedTx.value);
        ty.value = focalY.value - k * (focalY.value - savedTy.value);
      })
      .onEnd(() => {
        if (scale.value < ZOOMED_THRESHOLD) {
          resetZoom();
          scheduleOnRN(onZoomChange, false);
          return;
        }
        savedScale.value = scale.value;
        savedTx.value = clampT(tx.value, scale.value, width);
        savedTy.value = clampT(ty.value, scale.value, height);
        tx.value = withTiming(savedTx.value);
        ty.value = withTiming(savedTy.value);
        scheduleOnRN(onZoomChange, true);
      });

    // One finger does one of two jobs, decided by whether the photo is zoomed.
    // Zoomed: move around the photo. Not zoomed: drag down to close — and only
    // down, and only when the drag is clearly vertical, so a sideways swipe
    // still reaches the list underneath and pages to the next photo.
    const pan = zoomed
      ? Gesture.Pan()
          .maxPointers(1)
          .onStart(() => {
            savedTx.value = tx.value;
            savedTy.value = ty.value;
          })
          .onUpdate((e) => {
            tx.value = clampT(savedTx.value + e.translationX, scale.value, width);
            ty.value = clampT(savedTy.value + e.translationY, scale.value, height);
          })
          .onEnd(() => {
            savedTx.value = tx.value;
            savedTy.value = ty.value;
          })
      : Gesture.Pan()
          .maxPointers(1)
          .activeOffsetY(12)
          .failOffsetX([-12, 12])
          .onUpdate((e) => {
            dismissY.value = Math.max(0, e.translationY);
          })
          .onEnd((e) => {
            if (dismissY.value > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
              dismissY.value = withTiming(height, { duration: 180 }, (finished) => {
                if (finished) scheduleOnRN(onDismiss);
              });
            } else {
              dismissY.value = withSpring(0, { damping: 18, stiffness: 220 });
            }
          });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd((e) => {
        if (savedScale.value > 1) {
          resetZoom();
          scheduleOnRN(onZoomChange, false);
          return;
        }
        // Zoom in on the spot that was tapped, the way Photos does.
        const fx = e.x - width / 2;
        const fy = e.y - height / 2;
        const s = DOUBLE_TAP_SCALE;
        const nextTx = clampT(fx - s * fx, s, width);
        const nextTy = clampT(fy - s * fy, s, height);
        scale.value = withTiming(s);
        tx.value = withTiming(nextTx);
        ty.value = withTiming(nextTy);
        savedScale.value = s;
        savedTx.value = nextTx;
        savedTy.value = nextTy;
        scheduleOnRN(onZoomChange, true);
      });

    return Gesture.Simultaneous(pinch, pan, doubleTap);
  }, [
    zoomed,
    width,
    height,
    dismissY,
    onZoomChange,
    onDismiss,
    scale,
    savedScale,
    tx,
    ty,
    savedTx,
    savedTy,
    focalX,
    focalY,
  ]);

  const photoStyle = useAnimatedStyle(() => {
    // Shrinks a little as it's dragged down, like letting go of a photo in
    // the Photos app.
    const dragScale = interpolate(
      dismissY.value,
      [0, height],
      [1, 0.7],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value + dismissY.value },
        { scale: scale.value * dragScale },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }} className="items-center justify-center">
        <Animated.Image
          source={{ uri }}
          style={[{ width, height }, photoStyle]}
          resizeMode="contain"
          accessibilityLabel="Menu photo"
        />
      </View>
    </GestureDetector>
  );
}
