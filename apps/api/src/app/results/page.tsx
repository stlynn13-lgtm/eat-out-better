"use client";

/**
 * Screen 4 — Ranked Results
 *
 * Shows all dishes sorted by rank (1 = best for heart health).
 * Each dish card has: rank, name, score badge, explanation, optional tag.
 *
 * Error state (no results): redirect to capture + error screen.
 * "Analyze New Menu": clears state, returns to capture without reload.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { DishCard } from "@/components/menu/DishCard";
import { Button } from "@/components/ui/Button";
import { dishCount, formatProcessingTime } from "@/lib/utils/format";

export default function ResultsPage() {
  const router = useRouter();
  const { results, session, status, error, reset } = useAnalysisStore();

  // Guard: if no results, redirect to capture
  useEffect(() => {
    if (!results && status !== "complete") {
      router.replace("/capture");
    }
  }, [results, status, router]);

  // Error state
  if (error) {
    return <ErrorScreen error={error.message} onRetry={() => router.push("/capture")} />;
  }

  // Loading (shouldn't normally show — we redirect immediately)
  if (!results || results.length === 0) {
    return (
      <main className="app-shell items-center justify-center px-5">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Loading results…</p>
        </div>
      </main>
    );
  }

  const handleNewMenu = () => {
    reset();
    router.push("/capture");
  };

  return (
    <main className="app-shell px-5 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Menu Results</h1>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
          {dishCount(results.length)}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Ranked best to worst for your heart
      </p>

      {/* Performance note (dev-visible) */}
      {session?.processingTimeMs && (
        <p className="text-xs text-gray-400 mb-4">
          Analysis completed in {formatProcessingTime(session.processingTimeMs)}
        </p>
      )}

      {/* Dish list */}
      <div className="space-y-3">
        {results.map((dish, index) => (
          <DishCard
            key={dish.id}
            dish={dish}
            animationDelay={Math.min(index * 50, 400)} // Cap delay at 400ms
          />
        ))}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-6 pt-3 bg-gradient-to-t from-gray-100 via-gray-100/95 to-transparent">
        <Button fullWidth variant="outline" onClick={handleNewMenu}>
          Analyze New Menu
        </Button>
      </div>
    </main>
  );
}

// ---- Error screen (Screen 5 from mockup) ----

function ErrorScreen({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <main className="app-shell px-5 pt-8 pb-8 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/capture"
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
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        {/* Error icon */}
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Uh oh! We have a slight issue
        </h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          {error || "We couldn't process the menu now; try again!"}
        </p>

        <Button fullWidth onClick={onRetry}>
          Try scanning the menu again
        </Button>
      </div>

      {/* Retry viewfinder hint */}
      <div className="mt-8">
        <p className="text-xs text-gray-400 text-center mb-3 uppercase tracking-wide">
          Camera Viewfinder
        </p>
        <div
          className="camera-viewfinder mx-auto opacity-50"
          style={{ maxWidth: "200px" }}
        >
          <div className="corner-tr" />
          <div className="corner-bl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-gray-500 text-xs">Point at a menu page</p>
            <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider">
              CAMERA
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
