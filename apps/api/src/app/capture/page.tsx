"use client";

/**
 * Screen 2 — Menu Capture
 *
 * Handles:
 * - Camera viewfinder with capture button
 * - File upload from gallery (alternative input)
 * - Multi-photo support (up to 10 pages)
 * - Thumbnail strip showing added photos
 * - "Analyze Menu" CTA that triggers the pipeline
 */

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CameraViewfinder } from "@/components/menu/CameraViewfinder";
import { PhotoThumbnail, AddPhotoButton } from "@/components/menu/PhotoThumbnail";
import { Button } from "@/components/ui/Button";
import { compressImage } from "@/lib/utils/image";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { useAnalysis } from "@/hooks/useAnalysis";
import type { MenuImage } from "@/lib/types";

const MAX_PHOTOS = 10;

export default function CapturePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const store = useAnalysisStore();
  const { startAnalysis } = useAnalysis();

  // Local image state (before submitting to store)
  const [localImages, setLocalImages] = useState<{ file: File; preview: string }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionError, setCompressionError] = useState<string | null>(null);

  const canAddMore = localImages.length < MAX_PHOTOS;

  // ---- Photo management ----

  const addPhoto = useCallback(async (file: File) => {
    if (localImages.length >= MAX_PHOTOS) return;
    setIsCompressing(true);
    setCompressionError(null);

    try {
      const compressed = await compressImage(file);
      setLocalImages((prev) => [
        ...prev,
        { file, preview: compressed.previewUrl },
      ]);
    } catch (error) {
      setCompressionError(
        error instanceof Error ? error.message : "Failed to process image"
      );
    } finally {
      setIsCompressing(false);
    }
  }, [localImages.length]);

  const removePhoto = useCallback((index: number) => {
    setLocalImages((prev) => {
      const updated = [...prev];
      // Revoke the object URL to free memory
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  // ---- Camera capture ----

  const handleCameraCapture = useCallback(
    (file: File) => {
      addPhoto(file);
    },
    [addPhoto]
  );

  // ---- Gallery upload ----

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      // Add each file, respecting the max
      for (const file of files.slice(0, MAX_PHOTOS - localImages.length)) {
        await addPhoto(file);
      }

      // Reset input so same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addPhoto, localImages.length]
  );

  // ---- Submit ----

  const handleAnalyze = useCallback(async () => {
    if (localImages.length === 0) return;
    store.clearImages();
    await startAnalysis(localImages.map((img) => img.file));
  }, [localImages, store, startAnalysis]);

  return (
    <main className="app-shell px-5 pt-8 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Scan Menu</h1>
      </div>

      {/* Instruction */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Photograph the menu</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          One photo per page — we will do the rest.
        </p>
      </div>

      {/* Camera viewfinder */}
      <CameraViewfinder onCapture={handleCameraCapture} />

      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Upload from photos link */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="mt-3 w-full text-center text-sm text-green-700 font-medium py-2 hover:text-green-800 transition-colors"
      >
        Upload from Photos
      </button>

      {/* Error */}
      {compressionError && (
        <p className="mt-2 text-sm text-red-600 text-center">{compressionError}</p>
      )}

      {/* Photo strip */}
      {localImages.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Added photos
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {localImages.map((img, i) => (
              <PhotoThumbnail
                key={img.preview}
                src={img.preview}
                index={i}
                onRemove={removePhoto}
              />
            ))}
            {canAddMore && (
              <AddPhotoButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
              />
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto pt-6">
        <Button
          fullWidth
          onClick={handleAnalyze}
          disabled={localImages.length === 0 || isCompressing}
          loading={isCompressing}
        >
          {isCompressing
            ? "Processing photo…"
            : localImages.length === 0
            ? "Add a photo to continue"
            : `Analyze Menu (${localImages.length} page${localImages.length > 1 ? "s" : ""})`}
        </Button>
      </div>
    </main>
  );
}
