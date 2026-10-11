import { tierOf, TIER_LABEL, type SampleDish, type Tier } from "@/lib/sample-menu";

/**
 * Web twin of the app's DishCard (apps/mobile/app/results.tsx): rank, badge,
 * name, score out of 10, the reason, then "Make it better" if the dish has a
 * swap (none do yet; see lib/sample-menu.ts). Color is never the only signal:
 * every card also carries the tier's words.
 */
export const TIER_STYLES: Record<Tier, { card: string; ink: string; dot: string; chip: string }> = {
  green: { card: "bg-green-bg", ink: "text-green-ink", dot: "bg-green-dot", chip: "bg-green-dot/15 text-green-ink" },
  yellow: { card: "bg-amber-bg", ink: "text-amber-ink", dot: "bg-amber-dot", chip: "bg-amber-dot/15 text-amber-ink" },
  red: { card: "bg-red-bg", ink: "text-red-ink", dot: "bg-red-dot", chip: "bg-red-dot/15 text-red-ink" },
};

export function ScorePill({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const tier = tierOf(score);
  const s = TIER_STYLES[tier];
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={`font-display font-semibold tabular-nums ${text} ${s.ink}`}>
      {score.toFixed(1)}
      <span className="text-[0.6em] font-medium">/10</span>
    </span>
  );
}

export function TierLabel({ tier }: { tier: Tier }) {
  const s = TIER_STYLES[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.chip}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${s.dot}`} />
      {TIER_LABEL[tier]}
    </span>
  );
}

export default function DishCard({
  dish,
  rank,
  compact = false,
}: {
  dish: SampleDish;
  rank?: number;
  compact?: boolean;
}) {
  const tier = tierOf(dish.score);
  const s = TIER_STYLES[tier];
  return (
    <article className={`rounded-2xl ${s.card} ${compact ? "p-3" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {rank ? <span className="text-[11px] font-medium text-ink-2">#{rank}</span> : null}
            <TierLabel tier={tier} />
          </div>
          <h3 className={`font-display font-semibold leading-tight text-ink ${compact ? "text-[15px]" : "text-xl"}`}>
            {dish.name}
          </h3>
          {!compact ? <p className="mt-1 text-sm text-ink-2">{dish.description}</p> : null}
        </div>
        <ScorePill score={dish.score} size={compact ? "sm" : "lg"} />
      </div>
      {compact ? (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-ink-2">{dish.reason}</p>
      ) : (
        <>
          <p className="mt-4 text-[15px] leading-relaxed text-ink">{dish.reason}</p>
          {dish.swap ? (
            <div className="mt-4 rounded-xl bg-card/70 p-3.5 ring-1 ring-line">
              <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">
                <svg aria-hidden viewBox="0 0 20 20" className="size-3.5" fill="currentColor">
                  <path d="M10 2a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.2v.5h6V14c0-.4.2-.9.6-1.2A6 6 0 0 0 10 2Zm-3 14.5h6V17a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-.5Z" />
                </svg>
                Make it better
              </p>
              <p className="text-[15px] leading-relaxed text-ink">{dish.swap}</p>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
