"use client";

import { track } from "@vercel/analytics";
import { LAUNCH_STATE } from "@/lib/site";

/**
 * The one primary action, wherever it appears. Pre-launch it jumps to the
 * waitlist; once live it goes through /get?src=<placement> (never straight to
 * the store) so every placement's conversions are countable.
 *
 * TODO(launch): Apple requires its official "Download on the App Store" badge
 * artwork (developer.apple.com/app-store/marketing/guidelines). Drop the SVG
 * into public/app-store-badge.svg and use it for the live state.
 */
export default function Cta({
  placement,
  size = "md",
  tone = "light",
  className = "",
}: {
  placement: string;
  size?: "sm" | "md";
  tone?: "light" | "dark";
  className?: string;
}) {
  const live = LAUNCH_STATE === "live";
  const href = live ? `/get?src=${placement}` : "#waitlist";
  const pad = size === "sm" ? "min-h-11 px-4 text-sm" : "min-h-13 px-6 text-[15px]";
  const colors =
    tone === "dark"
      ? "bg-cream text-forest-deep hover:bg-white"
      : "bg-forest text-on-forest hover:bg-forest-deep dark:hover:bg-leaf";

  return (
    <a
      href={href}
      onClick={() => track("cta_click", { placement, state: LAUNCH_STATE })}
      className={`group inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.97] ${pad} ${colors} ${className}`}
    >
      {live ? (
        <>
          <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
            <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-3.9ZM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4Z" />
          </svg>
          {size === "sm" ? "Get the app" : "Download on the App Store"}
        </>
      ) : (
        <>
          {size === "sm" ? "Join waitlist" : "Join the waitlist"}
          <svg aria-hidden viewBox="0 0 20 20" className="hidden size-4 sm:block transition-transform duration-200 group-hover:translate-y-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10 4v11m-4.5-4L10 15.5 14.5 11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </a>
  );
}
