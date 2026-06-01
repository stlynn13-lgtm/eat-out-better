"use client";

/**
 * Screen 3 — Processing
 *
 * Shown during the ~20s analysis window.
 * Displays:
 * - Animated logo (pulsing)
 * - Progress bar with percentage
 * - Status message
 * - Rotating educational tip
 *
 * Navigation: No back button during processing (per PRD).
 * If the user has no images in the store (e.g., direct URL access),
 * redirects to /capture.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProcessingTipCard } from "@/components/menu/ProcessingTip";

// Animated logo for processing screen
function ProcessingLogo() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      {/* Outer pulsing ring */}
      <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
      {/* Main logo */}
      <div className="relative w-24 h-24 rounded-full bg-brand-900 flex items-center justify-center">
        <svg
          className="w-12 h-12"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Target rings — animating rotation */}
          <circle
            cx="24"
            cy="24"
            r="14"
            stroke="#22C55E"
            strokeWidth="2"
            fill="none"
            className="animate-spin-logo"
            style={{ transformOrigin: "24px 24px", animationDuration: "8s" }}
          />
          <circle cx="24" cy="24" r="8" stroke="#22C55E" strokeWidth="2" fill="none" />
          <circle cx="24" cy="24" r="3" fill="#22C55E" />
          {/* Leaf/sprout icon */}
          <path
            d="M24 18 C24 18, 20 14, 18 18 S22 24 24 24 C26 24 28 20 28 18"
            fill="#22C55E"
            opacity="0.8"
          />
        </svg>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  const router = useRouter();
  const { status, progress, progressMessage, images, error } = useAnalysisStore();

  // Guard: if no images and not actively processing, redirect to capture
  useEffect(() => {
    if (images.length === 0 && status === "idle") {
      router.replace("/capture");
    }
  }, [images.length, status, router]);

  // Guard: if error occurred, redirect to capture
  useEffect(() => {
    if (status === "error") {
      router.replace("/capture");
    }
  }, [status, router]);

  // Guard: if complete, redirect to results
  useEffect(() => {
    if (status === "complete") {
      router.replace("/results");
    }
  }, [status, router]);

  return (
    <main className="app-shell px-5 pt-12 pb-8 flex flex-col">
      {/* Processing logo */}
      <div className="mb-8">
        <ProcessingLogo />
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Analyzing your menu
        </h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed px-4">
          {progressMessage || "Reading dish names and checking cholesterol impact for each item…"}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <ProgressBar value={progress} />
      </div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 tabular-nums font-medium">
          {Math.round(progress)}%
        </p>
        <p className="text-xs text-gray-400">Usually takes 15–20 seconds</p>
      </div>

      {/* Educational tip */}
      <ProcessingTipCard />

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Processing indicator dots */}
      <div className="flex justify-center gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </main>
  );
}
