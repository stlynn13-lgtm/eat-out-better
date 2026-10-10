"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { track } from "@vercel/analytics";

/** Scene cuts in public/video/brag.mp4 (see the brag plan's timing table). */
const CHAPTERS = [
  { label: "The menu", start: 0 },
  { label: "Meet the app", start: 4 },
  { label: "Snap", start: 7 },
  { label: "Analyze", start: 10 },
  { label: "Scores", start: 11.5 },
  { label: "Order", start: 17 },
] as const;
const DURATION = 20;

/**
 * The 20-second launch reel, as a living part of the page rather than a player
 * to press. It loops silently while on screen and pauses when scrolled away,
 * like a GIF that costs nothing off-screen. Nothing downloads until it's close
 * to the viewport (the page is LCP-sensitive). Tap to pause, flip the sound on,
 * or jump between scenes on the chapter rail. Reduced-motion users get the
 * poster and a play button: it never moves on its own for them.
 */
export default function BragReel({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const near = useInView(wrap, { once: true, margin: "600px 0px" });
  const visible = useInView(wrap, { amount: 0.4 });
  const reduce = useReducedMotion();

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [time, setTime] = useState(0);
  const tracked = useRef<Set<string>>(new Set());

  const once = (event: string, props?: Record<string, string>) => {
    if (tracked.current.has(event)) return;
    tracked.current.add(event);
    track(event, { id: "brag", ...props });
  };

  // Autoplay while visible, unless the viewer paused it or prefers no motion.
  useEffect(() => {
    const v = video.current;
    if (!v || !near) return;
    if (!visible) v.pause();
    else if (!userPaused && !reduce) v.play().catch(() => setPlaying(false));
  }, [near, visible, userPaused, reduce]);

  // Smooth chapter-rail progress (timeupdate only fires ~4x a second).
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (video.current) setTime(video.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      setUserPaused(false);
      v.play().catch(() => {});
      once("video_play");
    } else {
      setUserPaused(true);
      v.pause();
    }
  };

  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) {
      once("video_unmute");
      if (v.paused) {
        setUserPaused(false);
        v.play().catch(() => {});
      }
    }
  };

  const jump = (i: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = CHAPTERS[i].start;
    setTime(CHAPTERS[i].start);
    once("video_chapter", { chapter: CHAPTERS[i].label });
    if (v.paused) {
      setUserPaused(false);
      v.play().catch(() => {});
    }
  };

  // Not findLastIndex: it throws on iOS < 15.4.
  const active = CHAPTERS.reduce((a, c, i) => (time >= c.start ? i : a), 0);

  return (
    <figure ref={wrap} className={`mx-auto w-full max-w-4xl ${className}`}>
      <div className="group relative overflow-hidden rounded-[28px] bg-forest-deep shadow-2xl ring-1 ring-white/15">
        <video
          ref={video}
          muted
          loop
          playsInline
          preload={near ? "auto" : "none"}
          poster="/video/brag-poster.jpg"
          width={1920}
          height={1080}
          aria-label="Twenty-second tour of Eat Out Better: a brunch menu is photographed, every dish gets a green, yellow or red score with the reason why, and the best options rise to the top."
          className="block aspect-video h-auto w-full cursor-pointer"
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => once("video_complete")}
          onTimeUpdate={(e) => {
            // The loop wrapping back to 0 counts as one full watch.
            if (e.currentTarget.currentTime < 0.3 && time > DURATION - 1) once("video_complete");
          }}
        >
          {near && <source src="/video/brag.mp4" type="video/mp4" />}
        </video>

        {/* Big play button: reduced motion, or the viewer paused it. */}
        {!playing && (reduce || userPaused) && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play the 20-second tour"
            className="absolute inset-0 grid place-items-center bg-black/25 transition-colors hover:bg-black/15"
          >
            <span className="grid size-20 place-items-center rounded-full bg-cream text-forest-deep shadow-xl transition-transform group-hover:scale-105">
              <svg aria-hidden viewBox="0 0 24 24" className="ml-1 size-8" fill="currentColor">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
              </svg>
            </span>
          </button>
        )}

        {/* Sound toggle. Bottom-left: the one corner every scene leaves empty. */}
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/70 sm:bottom-4 sm:left-4 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-xs"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
            {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
          </svg>
          <span>{muted ? "Tap for sound" : "Sound on"}</span>
        </button>
      </div>

      {/* Chapter rail: each segment is as wide as its scene, and fills as it plays. */}
      <div role="group" aria-label="Jump to a scene" className="mt-4 flex gap-1.5">
        {CHAPTERS.map((c, i) => {
          const end = CHAPTERS[i + 1]?.start ?? DURATION;
          const fill = Math.min(1, Math.max(0, (time - c.start) / (end - c.start)));
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => jump(i)}
              aria-current={i === active ? "step" : undefined}
              className="group/ch min-w-0 text-left"
              style={{ flexGrow: end - c.start, flexBasis: 0 }}
            >
              <span className="block h-1.5 overflow-hidden rounded-full bg-white/15 transition-colors group-hover/ch:bg-white/25">
                <span className="block h-full origin-left rounded-full bg-[#8fd0b4]" style={{ transform: `scaleX(${fill})` }} />
              </span>
              <span
                className={`mt-2 hidden truncate text-xs font-medium transition-colors sm:block ${
                  i === active ? "text-cream" : "text-cream/50 group-hover/ch:text-cream/80"
                }`}
              >
                {c.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Phones: segments are too narrow for every label, so name the current scene. */}
      <p aria-hidden className="mt-2 text-xs font-medium text-cream/70 sm:hidden">
        {active + 1}/{CHAPTERS.length} · {CHAPTERS[active].label}
      </p>
    </figure>
  );
}
