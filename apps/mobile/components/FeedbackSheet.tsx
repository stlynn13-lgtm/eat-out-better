/**
 * FeedbackSheet — reusable bottom sheet for user feedback.
 *
 * Two variants:
 *   "general" (default) — the footer Feedback link. Stars optional, free text
 *                         is enough on its own.
 *   "scan"              — the per-scan prompt on the results screen. "Your
 *                         experience" stars are the ONLY required field; the
 *                         chips and the note are both optional.
 *
 * Every control toggles: tapping a selected star clears the rating, tapping a
 * selected chip deselects it. Closing without submitting is always allowed.
 *
 * Submits to Google Sheets via Apps Script endpoint, tagged by feedback_type so
 * per-scan ratings can be separated from general feedback in the same sheet.
 * Also fires a PostHog event on submit.
 *
 * Usage:
 *   <FeedbackSheet visible={show} onClose={close} screen="results"
 *                  variant="scan" initialRating={4} scanSessionId={id}
 *                  dishCount={12} />
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
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Constants from "expo-constants";
import { usePostHog } from "posthog-react-native";
import {
  trackFeedbackSheetOpened,
  trackFeedbackSubmitted,
  APP_ENVIRONMENT,
  type FeedbackType,
} from "../lib/analytics";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbzkiUBtY6atSGUJeaHOmbuBPaZgcMqxY35YLDvFlAdvvZYX9e29do1abyQTytNe29OPJQ/exec";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MAX_STARS = 5;

/**
 * Chips swap on the rating so each one can be specific. Sentiment is carried by
 * the stars, which means "Speed" doesn't have to stand for both "impressively
 * fast" and "unbearably slow" the way a single neutral list would.
 */
const LOW_TAGS = [
  "Wrong scores",
  "Missed dishes on the menu",
  "Too slow",
  "Confusing explanations",
  "Camera was hard to use",
];

const HIGH_TAGS = [
  "Accurate scores",
  "Caught everything",
  "Helpful swaps",
  "Fast",
  "Clear explanations",
];

const LOW_RATING_MAX = 3;

type Props = {
  visible: boolean;
  onClose: () => void;
  screen: string;
  /** "scan" makes the star rating required and shows the chips. */
  variant?: "general" | "scan";
  /** Pre-selects a rating — used when the results emoji row opens the sheet. */
  initialRating?: number | null;
  /** Scan context, recorded alongside a "scan" rating. */
  scanSessionId?: string;
  dishCount?: number;
};

export default function FeedbackSheet({
  visible,
  onClose,
  screen,
  variant = "general",
  initialRating = null,
  scanSessionId,
  dishCount,
}: Props) {
  const posthog = usePostHog();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const isScan = variant === "scan";

  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
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
      setRating(initialRating);
      setTags([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Tapping the selected star clears the rating rather than re-setting it, so a
  // rating given by accident can be taken back without closing the sheet.
  const handleStarTap = useCallback(
    (value: number) => {
      if (rating === value) {
        // The chips belong to the cleared rating's half of the scale, so they
        // go with it — otherwise "Too slow" could be submitted against 5 stars.
        setRating(null);
        setTags([]);
        return;
      }
      // Crossing between the low and high halves swaps the chip list out from
      // under any current selection; drop selections that no longer exist.
      const crossedHalves =
        rating !== null &&
        (rating <= LOW_RATING_MAX) !== (value <= LOW_RATING_MAX);
      if (crossedHalves) setTags([]);
      setRating(value);
    },
    [rating]
  );

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const activeTags = rating !== null && rating <= LOW_RATING_MAX ? LOW_TAGS : HIGH_TAGS;

  // "scan" requires stars and nothing else. "general" needs something to say.
  const canSubmit = isScan
    ? rating !== null
    : rating !== null || text.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (submitting || !canSubmit) return;
    setSubmitting(true);

    const distinctId = posthog?.getDistinctId() ?? "";
    const feedbackType: FeedbackType = isScan ? "scan_rating" : "general";

    try {
      await fetch(SHEET_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          posthog_distinct_id: distinctId,
          screen,
          // Lets one sheet hold both kinds of feedback and still be filterable.
          feedback_type: feedbackType,
          rating: rating ?? "",
          tags: tags.join(" | "),
          feedback: text.trim(),
          scan_session_id: scanSessionId ?? "",
          dish_count: dishCount ?? "",
          app_version: Constants.expoConfig?.version ?? "",
          environment: APP_ENVIRONMENT,
        }),
      });
    } catch {
      // Best-effort — don't block the user if the sheet is unreachable
    }

    if (posthog)
      trackFeedbackSubmitted(
        posthog,
        screen,
        text.trim().length > 0,
        text.trim().length,
        distinctId,
        feedbackType,
        rating,
        tags
      );

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => closeSheet(), 1500);
  }, [
    submitting,
    canSubmit,
    text,
    rating,
    tags,
    screen,
    posthog,
    closeSheet,
    isScan,
    scanSessionId,
    dishCount,
  ]);

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
              maxHeight: "88%",
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

            {/* Close button — leaving without submitting is always allowed. */}
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
                zIndex: 2,
              }}
              onPress={closeSheet}
              accessibilityRole="button"
              accessibilityLabel="Close without sending feedback"
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280" }}>✕</Text>
            </TouchableOpacity>

            {submitted ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>🙏</Text>
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#1c2b1c" }}>
                  Thanks for the feedback!
                </Text>
                <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
                  It helps us improve.
                </Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingHorizontal: 24,
                  paddingTop: 24,
                  paddingBottom: 40,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#1c2b1c", marginBottom: 4 }}>
                  {isScan ? "Your experience" : "Share feedback"}
                </Text>
                <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                  {isScan
                    ? "How did this menu analysis go? Only the stars are required."
                    : "What's working? What's not? We read everything."}
                </Text>

                {/* Stars */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
                    {isScan ? "Your experience" : "How's it going so far?"}
                    {isScan ? <Text style={{ color: "#dc2626" }}> *</Text> : null}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((value) => {
                      const filled = rating !== null && value <= rating;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => handleStarTap(value)}
                          accessibilityRole="button"
                          accessibilityLabel={`${value} star${value > 1 ? "s" : ""}`}
                          accessibilityState={{ selected: filled }}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          style={{
                            width: 48,
                            height: 48,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 32, opacity: filled ? 1 : 0.28 }}>
                            ⭐️
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Chips — only meaningful once we know which half of the scale
                    the user is on, so they appear with the rating. */}
                {isScan && rating !== null ? (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
                      What did you think?
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {activeTags.map((tag) => {
                        const selected = tags.includes(tag);
                        return (
                          <TouchableOpacity
                            key={tag}
                            onPress={() => toggleTag(tag)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 9,
                              borderRadius: 999,
                              backgroundColor: selected ? "#e0f2e8" : "#f3f4f6",
                              borderWidth: 1.5,
                              borderColor: selected ? "#2a6041" : "transparent",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: selected ? "600" : "500",
                                color: selected ? "#1c2b1c" : "#4b5563",
                              }}
                            >
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* Free text */}
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
                  Tell us more
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Optional — anything else we should know?"
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
                  disabled={submitting || !canSubmit}
                  style={{
                    backgroundColor: submitting || !canSubmit ? "#d1d5db" : "#2a6041",
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

                {isScan && rating === null ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      textAlign: "center",
                      marginTop: 10,
                    }}
                  >
                    Pick a star rating to send — or close this, no hard feelings.
                  </Text>
                ) : null}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
