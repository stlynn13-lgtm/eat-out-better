import { ScoreBadge } from "./ScoreBadge";
import { TAG_LABEL, TAG_STYLE } from "@/lib/config/scoring";
import type { RankedDish } from "@/lib/types";

interface DishCardProps {
  dish: RankedDish;
  /** Animate in with a delay based on position */
  animationDelay?: number;
}

const tierLeftBorder: Record<RankedDish["tier"], string> = {
  green: "border-l-green-500",
  yellow: "border-l-amber-500",
  red: "border-l-red-500",
};

export function DishCard({ dish, animationDelay = 0 }: DishCardProps) {
  const { name, score, tier, tag, explanation, rank } = dish;

  return (
    <div
      className={`
        card bg-white rounded-2xl p-4 border-l-4 border border-gray-100
        ${tierLeftBorder[tier]}
        animate-fade-in-up
      `}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Rank + Name */}
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold flex items-center justify-center">
            {rank}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">
              {name}
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {explanation}
            </p>
            {tag && (
              <span
                className={`inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full ${TAG_STYLE[tag]}`}
              >
                {TAG_LABEL[tag]}
              </span>
            )}
          </div>
        </div>

        {/* Score badge */}
        <div className="flex-shrink-0">
          <ScoreBadge score={score} tier={tier} size="sm" />
        </div>
      </div>
    </div>
  );
}
