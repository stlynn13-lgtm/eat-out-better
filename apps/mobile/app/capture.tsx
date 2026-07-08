import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Linking,
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
  const scanSessionIdRef = useRef<string>("");

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
  // NOTE: expo-camera's `zoom` (0..1) does not map linearly to optical "x"
  // magnification. The preset values below are sensible defaults and should be
  // calibrated on a real device. (No 0.5× pill: the ultra-wide lens isn't
  // exposed via this prop, so a 0.5× option would lie — it did nothing.)
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

  const handleCapture = useCallback(async () => {
    if (localPhotos.length >= MAX_PHOTOS) return;
    const uri = await capturePhoto();
    if (uri) {
      setLocalPhotos((prev) => {
        const next = [...prev, uri];
        if (posthog) trackMenuPhotoCaptured(posthog, scanSessionIdRef.current, next.length);
        return next;
      });
    }
  }, [capturePhoto, localPhotos.length, posthog]);

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

  const handleAnalyze = useCallback(async () => {
    if (localPhotos.length === 0 || isProcessing) return;
    setIsProcessing(true);
    const startedAt = Date.now();
    if (posthog) trackMenuAnalyzeClicked(posthog, scanSessionIdRef.current, localPhotos.length);
    try {
      await startAnalysis(localPhotos, scanSessionIdRef.current, startedAt);
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
        <Text className="text-sm text-gray-500 mb-4">
          One photo per page — we'll do the rest.
        </Text>

        {/* Camera viewfinder */}
        <TouchableOpacity
          className="w-full rounded-2xl overflow-hidden bg-gray-900"
          style={{ height: 280 }}
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
                {/* Custom (pinch) zoom feedback */}
                {activeZoomLabel === null && zoom > 0.001 && (
                  <View
                    className="absolute top-2 right-2 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                  >
                    <Text className="text-white text-xs font-medium">
                      {Math.round(zoom * 100)}%
                    </Text>
                  </View>
                )}
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
            menu being framed (EAT-16). Zoom left, shutter center, gallery right. */}
        {status === "active" ? (
          <View className="flex-row items-center mt-3">
            <View className="flex-1 flex-row gap-1.5">
              {ZOOM_LEVELS.map((lvl) => {
                const active = activeZoomLabel === lvl.label;
                return (
                  <TouchableOpacity
                    key={lvl.label}
                    onPress={() => selectZoomLevel(lvl.value, lvl.label)}
                    className={`px-2.5 py-1.5 rounded-full ${
                      active ? "bg-brand-900" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
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
              className="w-14 h-14 rounded-full bg-white items-center justify-center border-4 border-brand-900"
              onPress={handleCapture}
              accessibilityLabel="Take photo"
            />
            <View className="flex-1 items-end">
              <TouchableOpacity className="py-2 pl-2" onPress={handleGalleryPick}>
                <Text className="text-sm font-medium text-green-700">Photos</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity className="mt-3 py-2" onPress={handleGalleryPick}>
            <Text className="text-center text-sm font-medium text-green-700">
              Upload from Photos
            </Text>
          </TouchableOpacity>
        )}

        {localPhotos.length > 0 && (
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Added photos
              </Text>
              <Text className="text-xs font-semibold text-green-700">
                {localPhotos.length} / {MAX_PHOTOS}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {localPhotos.map((uri, i) => (
                  <View key={`${uri}-${i}`} className="relative">
                    <Image
                      source={{ uri }}
                      className="w-16 h-16 rounded-xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 items-center justify-center"
                      onPress={() => removePhoto(i)}
                    >
                      <Text className="text-white text-xs">×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {localPhotos.length < MAX_PHOTOS && (
                  <TouchableOpacity
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center"
                    onPress={handleGalleryPick}
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

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-4 mb-2 ${
            localPhotos.length === 0 || isProcessing
              ? "bg-gray-300"
              : "bg-brand-900"
          }`}
          onPress={handleAnalyze}
          disabled={localPhotos.length === 0 || isProcessing}
          activeOpacity={0.85}
        >
          <Text
            className={`font-semibold text-base ${
              localPhotos.length === 0 || isProcessing
                ? "text-gray-500"
                : "text-white"
            }`}
          >
            {isProcessing
              ? "Processing…"
              : localPhotos.length === 0
              ? "Add a photo to continue"
              : `Analyze Menu (${localPhotos.length} page${
                  localPhotos.length > 1 ? "s" : ""
                })`}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center justify-center gap-2 mt-2 mb-1">
          <TouchableOpacity onPress={() => setShowFeedback(true)}>
            <Text className="text-xs text-gray-400 underline">Feedback</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-300">·</Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://eat-out-better-api.vercel.app/privacy")}>
            <Text className="text-xs text-gray-400 underline">Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FeedbackSheet
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="capture"
      />
    </SafeAreaView>
  );
}
