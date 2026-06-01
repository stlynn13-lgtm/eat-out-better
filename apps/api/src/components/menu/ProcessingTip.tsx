"use client";

import { useEffect, useState } from "react";
import { PROCESSING_TIPS, type ProcessingTip } from "@/lib/config/tips";

export function ProcessingTipCard() {
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Rotate tips every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out → swap → fade in
      setVisible(false);
      setTimeout(() => {
        setTipIndex((i) => (i + 1) % PROCESSING_TIPS.length);
        setVisible(true);
      }, 300);
    }, 8_000);

    return () => clearInterval(interval);
  }, []);

  const tip: ProcessingTip = PROCESSING_TIPS[tipIndex];

  return (
    <div
      className={`
        rounded-2xl p-4 transition-opacity duration-300
        bg-green-50 border border-green-200
        ${visible ? "opacity-100" : "opacity-0"}
      `}
    >
      <p className="text-xs font-semibold text-green-700 mb-1 uppercase tracking-wide">
        While you wait…
      </p>
      <p className="text-sm text-green-800 font-medium leading-relaxed">
        {tip.headline}
      </p>
      <p className="text-xs text-green-700 mt-1 leading-relaxed">
        {tip.body}
      </p>
    </div>
  );
}
