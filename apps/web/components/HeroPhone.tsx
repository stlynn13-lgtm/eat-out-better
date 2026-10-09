"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { RANKED, SAMPLE_MENU } from "@/lib/sample-menu";
import DishCard from "./DishCard";

type Phase = "menu" | "reading" | "results";
const DURATION: Record<Phase, number> = { menu: 2800, reading: 1500, results: 5600 };
const NEXT: Record<Phase, Phase> = { menu: "reading", reading: "results", results: "menu" };

const spring = { type: "spring", stiffness: 260, damping: 30 } as const;

/**
 * The product, explained in one loop: a menu photo → the scan → dishes sorted
 * best to worst with colors. It pauses when scrolled away (no wasted frames)
 * and holds the final, most informative frame for reduced-motion users.
 */
export default function HeroPhone() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("menu");

  useEffect(() => {
    if (reduce || !inView) return;
    const t = setTimeout(() => setPhase((p) => NEXT[p]), DURATION[phase]);
    return () => clearTimeout(t);
  }, [phase, inView, reduce]);

  const shown: Phase = reduce ? "results" : phase;

  return (
    <div ref={ref} className="relative mx-auto w-[300px] sm:w-[320px]">
      {/* Phone frame */}
      <div className="relative aspect-[9/19.2] rounded-[52px] bg-[#0b0f0d] p-[11px] shadow-phone ring-1 ring-black/40">
        <div className="relative h-full overflow-hidden rounded-[42px] bg-[#f9fafb] dark:bg-[#f9fafb]">
          {/* Dynamic Island */}
          <div aria-hidden className="absolute left-1/2 top-2.5 z-20 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
          {/* Status bar */}
          <div aria-hidden className="relative z-10 flex items-center justify-between px-7 pt-3 text-[12px] font-semibold text-black">
            <span>7:42</span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-[3px] border border-black/80 p-px">
                <span className="block h-full w-3/4 rounded-[1px] bg-black/80" />
              </span>
            </span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {shown === "results" ? (
              <motion.div
                key="results"
                className="absolute inset-0 px-3.5 pt-12"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
                transition={spring}
              >
                <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">Menu results</p>
                <p className="px-1 font-display text-[22px] font-semibold leading-tight text-gray-900">The Larder</p>
                <p className="mb-2.5 px-1 text-[11px] text-gray-500">6 dishes · ranked best to worst for your heart</p>
                <div className="space-y-2 [--ink:#13221c] [--ink-2:#48554e] [--card:#fffdf7] [--line:rgb(19_34_28/0.12)] [--green-ink:#166534] [--green-bg:#e2f0e4] [--amber-ink:#92400e] [--amber-bg:#fbecd2] [--red-ink:#991b1b] [--red-bg:#f8e0dc]">
                  {RANKED.slice(0, 5).map((dish, i) => (
                    <motion.div
                      key={dish.id}
                      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...spring, delay: reduce ? 0 : 0.12 + i * 0.09 }}
                    >
                      <DishCard dish={dish} rank={i + 1} compact />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                className="absolute inset-0 pt-11"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.3 } }}
              >
                {/* Camera view of a printed menu */}
                <div className="absolute inset-x-0 bottom-0 top-11 bg-[#2a2622]">
                  <div className="absolute inset-x-5 top-6 bottom-28 rotate-[-1.5deg] rounded-sm bg-[#fbf6e9] px-5 py-5 shadow-2xl">
                    <p className="text-center font-display text-[17px] italic text-[#3b2f24]">The Larder</p>
                    <p className="mb-3 text-center text-[8px] uppercase tracking-[0.3em] text-[#7a6a58]">Dinner</p>
                    <ul className="space-y-2.5">
                      {SAMPLE_MENU.map((d) => (
                        <li key={d.id}>
                          <p className="font-display text-[11px] font-semibold leading-tight text-[#2f261d]">{d.name}</p>
                          <p className="text-[8.5px] leading-snug text-[#7a6a58]">{d.description}</p>
                        </li>
                      ))}
                    </ul>
                    {shown === "menu" && !reduce ? (
                      <div
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-[#40916c]/35 to-transparent"
                        style={{ animation: "scan 2.4s cubic-bezier(.45,0,.55,1) infinite" }}
                      />
                    ) : null}
                  </div>
                  {/* Viewfinder corners */}
                  {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "left-3 bottom-24 border-b-2 border-l-2", "right-3 bottom-24 border-b-2 border-r-2"].map((c) => (
                    <span key={c} aria-hidden className={`absolute size-6 rounded-[4px] border-white/90 ${c}`} />
                  ))}
                  {/* Shutter / status */}
                  <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2">
                    <AnimatePresence mode="wait">
                      {shown === "reading" ? (
                        <motion.div
                          key="reading"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[12px] font-semibold text-gray-900"
                        >
                          <span className="relative flex size-2.5">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#40916c] opacity-75" />
                            <span className="relative inline-flex size-2.5 rounded-full bg-[#2d6a4f]" />
                          </span>
                          Reading 6 dishes…
                        </motion.div>
                      ) : (
                        <motion.div
                          key="shutter"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="grid size-14 place-items-center rounded-full border-[3px] border-white"
                        >
                          <span className="size-11 rounded-full bg-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="sr-only">
        Animation: a phone photographs a restaurant menu, reads six dishes, and ranks them best to worst for
        cholesterol, from Cedar-Grilled Salmon at 8.7 out of 10 down to Fettuccine Alfredo at 1.8.
      </p>
    </div>
  );
}
