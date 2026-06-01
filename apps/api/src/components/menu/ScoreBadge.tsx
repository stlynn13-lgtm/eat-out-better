import { formatScore } from "@/lib/config/scoring";
import type { ScoreTier } from "@/lib/types";

interface ScoreBadgeProps {
  score: number;
  tier: ScoreTier;
  size?: "sm" | "md";
}

const tierStyle: Record<ScoreTier, string> = {
  green: "text-green-700 bg-green-50 border-green-200",
  yellow: "text-amber-700 bg-amber-50 border-amber-200",
  red: "text-red-700 bg-red-50 border-red-200",
};

const sizeStyle = {
  sm: "text-sm px-2.5 py-0.5",
  md: "text-base px-3 py-1 font-semibold",
};

export function ScoreBadge({ score, tier, size = "md" }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium tabular-nums whitespace-nowrap ${tierStyle[tier]} ${sizeStyle[size]}`}
    >
      {formatScore(score)}/10
    </span>
  );
}
