"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { track } from "@vercel/analytics";
import { SAMPLE_MENU, tierOf } from "@/lib/sample-menu";
import DishCard, { TIER_STYLES } from "./DishCard";

/**
 * The page's "try it" moment: tap a dish on a printed menu, get the app's
 * answer. No install, no network. This is the strongest desire-builder on the
 * page, because it's the product's actual value delivered in one tap.
 */
export default function MenuDemo() {
  const [selected, setSelected] = useState(SAMPLE_MENU[5].id);
  const [touched, setTouched] = useState(false);
  const reduce = useReducedMotion();
  const resultRef = useRef<HTMLDivElement>(null);
  const dish = SAMPLE_MENU.find((d) => d.id === selected)!;

  const pick = (id: string) => {
    setSelected(id);
    if (!touched) {
      setTouched(true);
      track("demo_interact");
    }
    // On phones the answer sits below the menu; bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }),
      );
    }
  };

  const sections = ["Starters & Salads", "Mains"] as const;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
      {/* The printed menu */}
      <div className="relative rounded-[28px] bg-[#fbf6e9] p-6 text-[#2f261d] shadow-[0_30px_60px_-30px_rgb(60_40_20/0.45)] ring-1 ring-[#e9dfc8] sm:p-9 dark:bg-[#f4ecd8]">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl italic">The Larder</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.35em] text-[#7a6a58]">Sample menu · tap any dish</p>
        </div>
        {sections.map((section) => (
          <div key={section} className="mb-5 last:mb-0">
            <p className="mb-2 border-b border-[#e3d7bd] pb-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#7a6a58]">
              {section}
            </p>
            <ul className="space-y-1" aria-label={`${section}: choose a dish to see its score`}>
              {SAMPLE_MENU.filter((d) => d.section === section).map((d) => {
                const active = d.id === selected;
                const t = TIER_STYLES[tierOf(d.score)];
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => pick(d.id)}
                      className={`group flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${
                        active ? "bg-[#efe5cc]" : "hover:bg-[#f3ead4]"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`size-2.5 shrink-0 rounded-full transition-transform duration-300 ${
                          active ? `${t.dot} scale-125` : "bg-[#d6c8a8] group-hover:bg-[#bfae88]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[17px] font-semibold leading-tight">{d.name}</span>
                        <span className="block truncate text-[13px] text-[#6d5d4b]">{d.description}</span>
                      </span>
                      <svg aria-hidden viewBox="0 0 20 20" className={`size-4 shrink-0 transition-all duration-200 ${active ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:opacity-60"}`} fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* The answer */}
      <div ref={resultRef} className="scroll-mt-24 lg:sticky lg:top-28">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-leaf" />
          </span>
          What Eat Out Better tells you
        </p>
        <div aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={dish.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <DishCard dish={dish} />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          Illustrative dishes and scores. In the app, every dish on the real menu gets this, ranked best to worst.
        </p>
      </div>
    </div>
  );
}
