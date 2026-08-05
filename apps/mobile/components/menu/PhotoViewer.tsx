import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Image,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PhotoViewerProps {
  /** The capture screen's photo tray, in tray order. */
  photos: string[];
  /** Index to open on; `null` means the viewer is closed. */
  initialIndex: number | null;
  onClose: () => void;
  /** Removes the photo at `index` from the tray. Must be stable (useCallback). */
  onDelete: (index: number) => void;
}

/**
 * Full-screen photo viewer for the capture tray (EAT-13).
 *
 * The 64pt thumbnails are too small to tell a legible menu page from a blurred
 * one, which is the single check worth making before spending a scan. Tapping a
 * thumbnail opens the photo full-bleed with close and delete, and swiping pages
 * through the rest of the tray.
 *
 * Deliberately a Modal over the capture screen rather than a route: the photo
 * list lives in `capture.tsx` local state, so a route would mean lifting it into
 * the store or serialising URIs through params for a view that is always
 * transient.
 */
export default function PhotoViewer({
  photos,
  initialIndex,
  onClose,
  onDelete,
}: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);
  const visible = initialIndex !== null;

  // Open on whichever thumbnail was tapped. RN's Modal renders nothing while
  // hidden, so the list remounts on every open and `initialScrollIndex` below
  // lands on the right page without a visible scroll.
  useEffect(() => {
    if (initialIndex !== null) setIndex(initialIndex);
  }, [initialIndex]);

  // Deleting the only photo leaves nothing to look at — close instead of
  // showing an empty black screen.
  useEffect(() => {
    if (visible && photos.length === 0) onClose();
  }, [visible, photos.length, onClose]);

  const handleDelete = useCallback(() => {
    const removing = index;
    const remaining = photos.length - 1;
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

  if (!visible || photos.length === 0) return null;

  const safeIndex = Math.min(index, photos.length - 1);

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait"]}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex ?? 0, photos.length - 1)}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item }) => (
            <View style={{ width, height }} className="items-center justify-center">
              <Image
                source={{ uri: item }}
                style={{ width, height }}
                resizeMode="contain"
                accessibilityLabel="Menu photo"
              />
            </View>
          )}
        />

        {/* Controls float over the photo so it stays full-bleed. */}
        <SafeAreaView
          edges={["top"]}
          pointerEvents="box-none"
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        >
          <View
            pointerEvents="box-none"
            className="flex-row items-center justify-between px-5 pt-3"
          >
            <TouchableOpacity
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(17,24,39,0.65)" }}
              onPress={onClose}
              accessibilityLabel="Close photo"
            >
              <Text className="text-white text-lg leading-none">×</Text>
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

            <TouchableOpacity
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: "rgba(220,38,38,0.9)" }}
              onPress={handleDelete}
              accessibilityLabel="Delete this photo"
            >
              <Text className="text-white text-sm font-semibold">Delete</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {photos.length > 1 ? (
          <SafeAreaView
            edges={["bottom"]}
            pointerEvents="none"
            style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          >
            <Text className="text-center text-sm text-gray-400 pb-3">
              Swipe to see your other photos
            </Text>
          </SafeAreaView>
        ) : null}
      </View>
    </Modal>
  );
}
