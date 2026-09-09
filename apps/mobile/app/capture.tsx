import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { usePostHog } from "posthog-react-native";
import { useCamera } from "../hooks/useCamera";
import { useAnalysis } from "../hooks/useAnalysis";
import { useAnalysisStore } from "../store/useAnalysisStore";
import FeedbackSheet from "../components/FeedbackSheet";
import PhotoViewer from "../components/menu/PhotoViewer";
import { useAssetScale } from "../lib/utils/scale";
import {
  getScanQuota,
  QUOTA_ALERT_TITLE,
  QUOTA_ALERT_BODY,
  type ScanQuota,
} from "../lib/utils/scanQuota";
import {
  generateId,
  setCurrentScanSessionId,
  trackMenuScanStarted,
  trackMenuPhotoCaptured,
  trackMenuAnalyzeClicked,
} from "../lib/analytics";

// Must not exceed the API's MAX_IMAGES (10) — the previous value of 12 let
// users build a scan the server always rejected with a 400.
const MAX_PHOTOS = 10;

export default function CaptureScreen() {
  const router = useRouter();
  const { entry, sid } = useLocalSearchParams<{ entry?: string; sid?: string }>();
  const posthog = usePostHog();
  const { status, cameraRef, requestPermission, capturePhoto, facing } = useCamera();
  const { startAnalysis } = useAnalysis();
  const analysisError = useAnalysisStore((s) => s.error);
  const setStatus = useAnalysisStore((s) => s.setStatus);
  const clearError = useAnalysisStore((s) => s.clearError);

  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  // Index of the photo open in the full-screen viewer; null = closed (EAT-13).
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const scanSessionIdRef = useRef<string>("");
  // null until the first read resolves — the Analyze button must not flash
  // "limit reached" for a frame before we actually know.
  const [quota, setQuota] = useState<ScanQuota | null>(null);

  // Photo tray sizing follows the phone's text-size setting (EAT-15). Text
  // scales on its own; fixed-point images and their controls don't, so without
  // this the thumbnails stay small while their caption grows past them.
  const assetScale = useAssetScale();
  const thumbSize = Math.round(96 * assetScale);
  const removeBtnSize = Math.round(26 * assetScale);
  // The remove button hangs off the thumbnail's top-right corner, which the
  // horizontal ScrollView clips at its content bounds — the reported "top of
  // the circle is cut off". Reserve the overhang as content padding instead of
  // moving the button inside the photo, where it would cover the menu.
  const trayOverhang = Math.ceil(removeBtnSize / 2) + 2;

  // Viewfinder height scales with the screen instead of a fixed 280pt. The
  // controls and tray below grew in this pass, and on a short phone (SE) a
  // fixed height pushed the Analyze button off the bottom — this screen has no
  // ScrollView, so the flex spacer just collapsed and content was cut.
  const { height: screenHeight } = useWindowDimensions();
  const viewfinderHeight = Math.round(
    Math.min(360, Math.max(240, screenHeight * 0.38))
  );

  // Fire menu_scan_started once on mount. Re-uses the session ID passed from
  // results ("Analyze New Menu" flow); generates a fresh one for cold starts.
  useEffect(() => {
    const sessionId = sid ?? generateId();
    scanSessionIdRef.current = sessionId;
    setCurrentScanSessionId(sessionId);
    const entryPoint = entry === "loop_back" ? "loop_back" : "cold_start";
    if (posthog) trackMenuScanStarted(posthog, sessionId, entryPoint);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native camera zoom (expo-camera `zoom` is 0..1). Two ways in, like the iOS
  // camera: tappable level pills and a pinch gesture. Pinch runs on the JS
  // thread (runOnJS) so it needs no Reanimated worklet/babel plugin.
  //
  // CALIBRATION REQUIRED — these values are placeholders, not measurements.
  //
  // expo-camera documents `zoom` as "a percentage of the device's max zoom",
  // and there is no API to read what that maximum is (getAvailableLensesAsync
  // returns lens names, not zoom factors). Max zoom ranges from roughly 16× to
  // 123× depending on the iPhone and the active format, so 0.02 is somewhere
  // between ~1.3× and ~3.4× — the label cannot be trusted on an arbitrary
  // device, and no constant chosen here can fix that.
  //
  // To calibrate: open the camera, pinch until the framing matches what a real
  // 2× should look like, and read the live percentage badge on the viewfinder.
  // That number ÷ 100 is the value to put here. Because this is plain JS, the
  // corrected values ship as an `eas update` — no new build required.
  //
  // (No 0.5× pill: the ultra-wide lens isn't exposed via this prop, so a 0.5×
  // option would lie — it did nothing.)
  const ZOOM_LEVELS = [
    { label: "1×", value: 0 },
    { label: "2×", value: 0.02 },
    { label: "3×", value: 0.04 },
  ] as const;

  const [zoom, setZoom] = useState(0);
  const [activeZoomLabel, setActiveZoomLabel] = useState<string | null>("1×");
  const zoomRef = useRef(0);
  const zoomStartRef = useRef(0);

  const selectZoomLevel = useCallback((value: number, label: string) => {
    zoomRef.current = value;
    setZoom(value);
    setActiveZoomLabel(label);
  }, []);

  const pinchGesture = useRef(
    Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        zoomStartRef.current = zoomRef.current;
      })
      .onUpdate((event) => {
        // event.scale: 1 = unchanged, >1 zoom in, <1 zoom out.
        const next = Math.min(
          Math.max(zoomStartRef.current + (event.scale - 1) * 0.25, 0),
          1
        );
        zoomRef.current = next;
        setZoom(next);
        setActiveZoomLabel(null); // pinch = custom zoom, no preset highlighted
      })
  ).current;

  const handleViewfinderPress = useCallback(async () => {
    if (status === "idle") {
      await requestPermission();
    }
  }, [status, requestPermission]);

  // Shutter-flash feedback (EAT-12): a white overlay on the viewfinder blinks
  // when a photo is successfully taken and added to the tray, confirming the
  // capture without the user having to spot the new thumbnail.
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const triggerCaptureFlash = useCallback(() => {
    flashOpacity.setValue(0.85);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [flashOpacity]);

  const handleCapture = useCallback(async () => {
    if (localPhotos.length >= MAX_PHOTOS) {
      // The tray caption already explains the cap, but a shutter that does
      // nothing at all reads as a broken button — say why (EAT-12).
      Alert.alert(
        "Photo limit reached",
        `You can analyze up to ${MAX_PHOTOS} photos at once. Remove one to add another.`
      );
      return;
    }
    const uri = await capturePhoto();
    if (uri) {
      triggerCaptureFlash();
      setLocalPhotos((prev) => {
        const next = [...prev, uri];
        if (posthog) trackMenuPhotoCaptured(posthog, scanSessionIdRef.current, next.length);
        return next;
      });
    } else {
      // capturePhoto() swallows failures and returns null. Without this the
      // shutter tap produced no flash, no thumbnail and no message — the
      // exact "did that work?" ambiguity EAT-12 exists to remove.
      Alert.alert(
        "That photo didn't save",
        "Something went wrong taking the picture. Please try again."
      );
    }
  }, [capturePhoto, localPhotos.length, posthog, triggerCaptureFlash]);

  const handleGalleryPick = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // MediaTypeOptions is deprecated in SDK 52+
      allowsMultipleSelection: true,
      // Guard against 0: iOS treats selectionLimit 0 as "unlimited".
      selectionLimit: Math.max(MAX_PHOTOS - localPhotos.length, 1),
      quality: 1,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setLocalPhotos((prev) => {
        const next = [...prev, ...uris].slice(0, MAX_PHOTOS);
        // Fire one event per photo added from the gallery
        const added = next.slice(prev.length);
        added.forEach((_, i) => {
          if (posthog) trackMenuPhotoCaptured(posthog, scanSessionIdRef.current, prev.length + i + 1);
        });
        return next;
      });
    }
  }, [localPhotos.length, posthog]);

  const removePhoto = useCallback((index: number) => {
    setLocalPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Confirmed — this throws away every photo the user just took, and the tray
  // is the only place they exist.
  const clearAllPhotos = useCallback(() => {
    Alert.alert(
      "Remove all photos?",
      "This clears every photo you've added to this scan.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove all",
          style: "destructive",
          onPress: () => {
            setLocalPhotos([]);
            setViewerIndex(null);
          },
        },
      ]
    );
  }, []);

  // Retake = drop this photo and return to the camera, which is already behind
  // the viewer (EAT-13's viewer is a Modal over this screen, not a route).
  const retakePhoto = useCallback((index: number) => {
    setLocalPhotos((prev) => prev.filter((_, i) => i !== index));
    setViewerIndex(null);
  }, []);

  // Stable so PhotoViewer's close-on-empty effect doesn't re-fire every render.
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  // Re-read on every mount, which covers both of the moments the cap has to
  // hold: coming back here after a scan ("Analyze New Menu"), and a cold start
  // the next time the app is opened.
  useEffect(() => {
    let cancelled = false;
    getScanQuota().then((q) => {
      if (!cancelled) setQuota(q);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (localPhotos.length === 0 || isProcessing) return;

    // Checked here rather than in useAnalysis so a capped scan never compresses
    // or uploads a single byte. Re-read rather than trusting mount-time state:
    // the app may have been open across midnight, or scans spent elsewhere.
    const current = await getScanQuota();
    setQuota(current);
    if (current.exhausted) {
      Alert.alert(QUOTA_ALERT_TITLE, QUOTA_ALERT_BODY);
      return;
    }

    setIsProcessing(true);
    const startedAt = Date.now();
    if (posthog) trackMenuAnalyzeClicked(posthog, scanSessionIdRef.current, localPhotos.length);
    try {
      await startAnalysis(localPhotos, scanSessionIdRef.current, startedAt);
      setQuota(await getScanQuota());
    } finally {
      // Always release the lock, even if startAnalysis throws — otherwise the
      // Analyze button stays disabled forever and the screen looks stuck.
      setIsProcessing(false);
    }
  }, [localPhotos, isProcessing, startAnalysis, posthog]);

  // Surface a failed analysis to the user. The analysis flow navigates back
  // here and sets `status: "error"` on the store; show it and reset the status
  // so the alert isn't re-fired on the next render.
  useEffect(() => {
    if (analysisError) {
      Alert.alert(
        "We couldn't analyze your menu",
        analysisError.message,
        [
          {
            text: "OK",
            onPress: () => {
              // Clear the error object too — leaving it set caused stale
              // errors to resurface (e.g. on the results screen) and re-fire.
              clearError();
              setStatus("idle");
            },
          },
        ]
      );
    }
  }, [analysisError, setStatus, clearError]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-5 pt-4">
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-5">
          <TouchableOpacity
            className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
            onPress={() => router.back()}
          >
            <Text className="text-gray-600 text-base">←</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Scan Menu</Text>
        </View>

        <Text className="text-xl font-bold text-gray-900 mb-1">
          Photograph the menu
        </Text>
        <Text className="text-base text-gray-500 mb-4">
          One photo per page — we'll do the rest.
        </Text>

        {/* Camera viewfinder */}
        <TouchableOpacity
          className="w-full rounded-2xl overflow-hidden bg-gray-900"
          style={{ height: viewfinderHeight }}
          onPress={handleViewfinderPress}
          activeOpacity={status === "active" ? 1 : 0.8}
        >
          {status === "active" ? (
            <GestureDetector gesture={pinchGesture}>
              <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing={facing}
                zoom={zoom}
              >
                {/* Zoom readout. Shown for preset taps as well as pinch (it
                    used to appear only for pinch), so the viewfinder always
                    says whether it is zoomed — and so the presets above can be
                    calibrated by pinching to the right framing and reading the
                    number off the screen. */}
                {zoom > 0.001 && (
                  <View
                    className="absolute top-2 right-2 rounded-full px-2.5 py-1"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                  >
                    <Text className="text-white text-xs font-semibold">
                      {Math.round(zoom * 100)}%
                    </Text>
                  </View>
                )}

                {/* `StyleSheet.absoluteFillObject` was removed in React Native
                    0.85 — from the runtime, not just the types. It evaluated to
                    `undefined`, and a falsy entry in a style array is silently
                    ignored, so this overlay lost its absolute positioning and
                    collapsed to 0×0: the shutter flash has not been visible
                    since the SDK bump. `absoluteFill` is the same object
                    ({ position: "absolute", top/left/right/bottom: 0 }) and is
                    the supported name. */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: "#ffffff", opacity: flashOpacity },
                  ]}
                />
              </CameraView>
            </GestureDetector>
          ) : (
            <View className="flex-1 items-center justify-center">
              {status === "denied" ? (
                <Text className="text-white text-sm text-center px-8">
                  Camera access denied.{"\n"}Tap to open Settings, or use the
                  upload option below.
                </Text>
              ) : (
                <>
                  <Text className="text-white text-4xl mb-3">📷</Text>
                  <Text className="text-white text-sm">
                    Tap to enable camera
                  </Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Camera controls live BELOW the viewfinder so they never block the
            menu being framed (EAT-16). Split across two rows: the zoom and
            gallery controls both grew in this pass and no longer fit either
            side of the shutter on a 390pt-wide phone without shrinking back
            down to the sizes this change exists to fix. */}
        {status === "active" ? (
          <>
            <View className="flex-row items-center justify-between mt-3">
              <View className="flex-row gap-2">
                {ZOOM_LEVELS.map((lvl) => {
                  const active = activeZoomLabel === lvl.label;
                  return (
                    <TouchableOpacity
                      key={lvl.label}
                      onPress={() => selectZoomLevel(lvl.value, lvl.label)}
                      className={`px-4 py-2.5 rounded-full ${
                        active ? "bg-brand-900" : "bg-gray-100"
                      }`}
                      accessibilityLabel={`Zoom ${lvl.label}`}
                    >
                      <Text
                        className={`text-sm font-bold ${
                          active ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {lvl.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                className="px-4 py-2.5 rounded-full border border-green-200 bg-green-50"
                onPress={handleGalleryPick}
                accessibilityLabel="Add your photos from your library"
              >
                <Text className="text-sm font-semibold text-green-700">
                  Add your photos
                </Text>
              </TouchableOpacity>
            </View>

            <View className="items-center mt-3">
              <TouchableOpacity
                className="rounded-full bg-white items-center justify-center border-4 border-brand-900"
                style={{ width: 68, height: 68 }}
                onPress={handleCapture}
                accessibilityLabel="Take photo"
              />
            </View>
          </>
        ) : (
          <TouchableOpacity
            className="mt-3 py-3 rounded-full border border-green-200 bg-green-50"
            onPress={handleGalleryPick}
          >
            <Text className="text-center text-base font-semibold text-green-700">
              Add your photos
            </Text>
          </TouchableOpacity>
        )}

        {localPhotos.length > 0 && (
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Added photos
              </Text>
              <View className="flex-row items-center gap-3">
                <Text className="text-xs font-semibold text-green-700">
                  {localPhotos.length} / {MAX_PHOTOS}
                </Text>
                <TouchableOpacity
                  onPress={clearAllPhotos}
                  accessibilityLabel="Remove all photos"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-xs font-semibold text-red-600">
                    Clear all
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              // Without this the ScrollView clips the remove buttons hanging off
              // each thumbnail's top-right corner (and the last one's right edge).
              contentContainerStyle={{
                paddingTop: trayOverhang,
                paddingRight: trayOverhang,
              }}
            >
              <View className="flex-row gap-2">
                {localPhotos.map((uri, i) => (
                  <View key={`${uri}-${i}`} className="relative">
                    {/* Tap to inspect full-screen — a 64pt thumbnail can't tell
                        you whether the page is actually legible (EAT-13). */}
                    <TouchableOpacity
                      onPress={() => setViewerIndex(i)}
                      activeOpacity={0.7}
                      accessibilityLabel={`View photo ${i + 1} full screen`}
                    >
                      <Image
                        source={{ uri }}
                        className="rounded-xl"
                        style={{ width: thumbSize, height: thumbSize }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="absolute rounded-full bg-gray-800 items-center justify-center border-2 border-gray-50"
                      style={{
                        width: removeBtnSize,
                        height: removeBtnSize,
                        // Offsets are derived from the button size rather than
                        // fixed, so the overhang and the ScrollView padding
                        // reserved for it stay in step at any text scale.
                        top: -Math.round(removeBtnSize / 3),
                        right: -Math.round(removeBtnSize / 3),
                      }}
                      onPress={() => removePhoto(i)}
                      accessibilityLabel={`Remove photo ${i + 1}`}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text
                        className="text-white font-semibold leading-none"
                        style={{ fontSize: Math.round(removeBtnSize * 0.55) }}
                      >
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {localPhotos.length < MAX_PHOTOS && (
                  <TouchableOpacity
                    className="rounded-xl border-2 border-dashed border-gray-300 items-center justify-center"
                    style={{ width: thumbSize, height: thumbSize }}
                    onPress={handleGalleryPick}
                    accessibilityLabel="Add photos from your library"
                  >
                    <Text className="text-gray-400 text-2xl">+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            <Text className="text-xs text-gray-400 mt-2">
              {localPhotos.length >= MAX_PHOTOS
                ? `Maximum of ${MAX_PHOTOS} photos reached`
                : `Up to ${MAX_PHOTOS} photos per scan`}
            </Text>
          </View>
        )}

        <View className="flex-1" />

        {/* Warn only when the allowance is nearly gone. Showing a counter from
            the first scan makes a generous limit feel like a meter running. */}
        {quota && !quota.exhausted && quota.remaining <= 2 ? (
          <Text className="text-xs text-amber-700 text-center mt-4">
            {quota.remaining} scan{quota.remaining === 1 ? "" : "s"} left today
          </Text>
        ) : null}

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-4 mb-2 ${
            localPhotos.length === 0 || isProcessing || quota?.exhausted
              ? "bg-gray-300"
              : "bg-brand-900"
          }`}
          onPress={handleAnalyze}
          // Not disabled when the quota is spent: the button still needs to be
          // tappable so it can explain why, which is the whole point of the
          // native alert. A dead button explains nothing.
          disabled={localPhotos.length === 0 || isProcessing}
          activeOpacity={0.85}
        >
          <Text
            className={`font-semibold text-base ${
              localPhotos.length === 0 || isProcessing || quota?.exhausted
                ? "text-gray-500"
                : "text-white"
            }`}
          >
            {isProcessing
              ? "Processing…"
              : quota?.exhausted
              ? "Daily scan limit reached"
              : localPhotos.length === 0
              ? "Add a photo to continue"
              : `Analyze Menu (${localPhotos.length} page${
                  localPhotos.length > 1 ? "s" : ""
                })`}
          </Text>
        </TouchableOpacity>

        {/* Privacy Policy deliberately not repeated here — it lives on the
            welcome and results screens only, so the mid-flow screens stay
            focused on the task. */}
        <View className="flex-row items-center justify-center gap-2 mt-2 mb-1">
          <TouchableOpacity onPress={() => setShowFeedback(true)}>
            <Text className="text-xs text-gray-400 underline">Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FeedbackSheet
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="capture"
      />

      <PhotoViewer
        photos={localPhotos}
        initialIndex={viewerIndex}
        onClose={closeViewer}
        onDelete={removePhoto}
        onRetake={retakePhoto}
      />
    </SafeAreaView>
  );
}
