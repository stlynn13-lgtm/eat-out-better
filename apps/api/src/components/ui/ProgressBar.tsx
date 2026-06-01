"use client";

interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${className ?? ""}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${clamped}%`,
          background: "linear-gradient(90deg, #15803d 0%, #22c55e 100%)",
        }}
      />
    </div>
  );
}
