/**
 * FeedbackSheet — reusable bottom sheet for user feedback.
 *
 * Submits to Google Sheets via Apps Script endpoint.
 * Also fires PostHog events for sheet open, submission, and emoji rating.
 *
 * Usage:
 *   <FeedbackSheet visible={show} onClose={() => setShow(false)} screen="results" />
 */

import { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { usePostHog } from "posthog-react-native";
import {
  trackFeedbackSheetOpened,
  trackFeedbackSubmitted,
  trackFeedbackRatingSubmitted,
} from "../lib/analytics";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbzkiUBtY6atSGUJeaHOmbuBPaZgcMqxY35YLDvFlAdvvZYX9e29do1abyQTytNe29OPJQ/exec";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const RATINGS = [
  { emoji: "😕", value: 1 },
  { emoji: "😐", value: 2 },
  { emoji: "🙂", value: 3 },
  { emoji: "😊", value: 4 },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  screen: string;
  showRating?: boolean;
};

export default function FeedbackSheet({ visible, onClose, screen, showRating = false }: Props) {
  const posthog = usePostHog();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [text, setText] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 100 || vy > 0.5) {
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 25,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setText("");
      setSelectedRating(null);
      setSubmitted(false);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 28,
          stiffness: 320,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (posthog) trackFeedbackSheetOpened(posthog, screen);
    }
  }, [visible]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose]);

  const handleRatingTap = useCallback(
    (rating: number) => {
      setSelectedRating(rating);
      if (posthog) trackFeedbackRatingSubmitted(posthog, screen, rating);
    },
    [posthog, screen]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    const distinctId = posthog?.getDistinctId() ?? "";

    try {
      await fetch(SHEET_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          posthog_distinct_id: distinctId,
          screen,
          feedback: text.trim(),
          rating: selectedRating ?? "",
        }),
      });
    } catch {
      // Best-effort — don't block the user if the sheet is unreachable
    }

    if (posthog)
      trackFeedbackSubmitted(posthog, screen, text.trim().length > 0, text.trim().length, distinctId);

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => closeSheet(), 1500);
  }, [submitting, text, selectedRating, screen, posthog, closeSheet]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeSheet}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1 }}>
          {/* Overlay */}
          <Animated.View
            style={{
              ...{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
              opacity: overlayOpacity,
            }}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={closeSheet}
              activeOpacity={1}
            />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#fafaf9",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "80%",
              transform: [{ translateY }],
            }}
            {...panResponder.panHandlers}
          >
            {/* Handle */}
            <View
              style={{
                width: 36,
                height: 5,
                borderRadius: 3,
                backgroundColor: "#d1d5db",
                alignSelf: "center",
                marginTop: 10,
              }}
            />

            {/* Close button */}
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 14,
                right: 16,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#e5e7eb",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={closeSheet}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280" }}>✕</Text>
            </TouchableOpacity>

            <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
              {submitted ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={{ fontSize: 32, marginBottom: 12 }}>🙏</Text>
                  <Text style={{ fontSize: 17, fontWeight: "600", color: "#1c2b1c" }}>
                    Thanks for the feedback!
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
                    It helps us improve.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: "#1c2b1c", marginBottom: 4 }}>
                    Share feedback
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                    What's working? What's not? We read everything.
                  </Text>

                  {/* Emoji rating (results screen only) */}
                  {showRating && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
                        Was this analysis helpful?
                      </Text>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        {RATINGS.map(({ emoji, value }) => (
                          <TouchableOpacity
                            key={value}
                            onPress={() => handleRatingTap(value)}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: selectedRating === value ? "#e0f2e8" : "#f3f4f6",
                              borderWidth: selectedRating === value ? 1.5 : 0,
                              borderColor: "#2a6041",
                            }}
                          >
                            <Text style={{ fontSize: 24 }}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Text input */}
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Tell us what you think…"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    style={{
                      backgroundColor: "#fff",
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14,
                      color: "#1c2b1c",
                      minHeight: 100,
                      textAlignVertical: "top",
                      marginBottom: 16,
                    }}
                  />

                  {/* Submit */}
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting || (text.trim().length === 0 && selectedRating === null)}
                    style={{
                      backgroundColor:
                        submitting || (text.trim().length === 0 && selectedRating === null)
                          ? "#d1d5db"
                          : "#2a6041",
                      borderRadius: 12,
                      height: 48,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                        Send Feedback
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
