import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCamera } from "../hooks/useCamera";
import { useAnalysis } from "../hooks/useAnalysis";

const MAX_PHOTOS = 10;

export default function CaptureScreen() {
  const router = useRouter();
  const { status, cameraRef, requestPermission, capturePhoto, facing } = useCamera();
  const { startAnalysis } = useAnalysis();

  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleViewfinderPress = useCallback(async () => {
    if (status === "idle") {
      await requestPermission();
    }
  }, [status, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (localPhotos.length >= MAX_PHOTOS) return;
    const uri = await capturePhoto();
    if (uri) {
      setLocalPhotos((prev) => [...prev, uri]);
    }
  }, [capturePhoto, localPhotos.length]);

  const handleGalleryPick = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - localPhotos.length,
      quality: 1,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setLocalPhotos((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
    }
  }, [localPhotos.length]);

  const removePhoto = useCallback((index: number) => {
    setLocalPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (localPhotos.length === 0 || isProcessing) return;
    setIsProcessing(true);
    await startAnalysis(localPhotos);
    setIsProcessing(false);
  }, [localPhotos, isProcessing, startAnalysis]);

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
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing}>
              <View className="flex-1" />
              <View className="items-center pb-4">
                <TouchableOpacity
                  className="w-16 h-16 rounded-full bg-white items-center justify-center border-4 border-gray-200"
                  onPress={handleCapture}
                />
              </View>
            </CameraView>
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

        <TouchableOpacity className="mt-3 py-2" onPress={handleGalleryPick}>
          <Text className="text-center text-sm font-medium text-green-700">
            Upload from Photos
          </Text>
        </TouchableOpacity>

        {localPhotos.length > 0 && (
          <View className="mt-4">
            <Text className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
              Added photos
            </Text>
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
      </View>
    </SafeAreaView>
  );
}
