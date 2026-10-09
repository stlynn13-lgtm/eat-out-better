"use client";

import { useRef } from "react";
import { track } from "@vercel/analytics";
import type { DemoVideoConfig } from "@/lib/site";

/**
 * Real-app proof for the "How it works" section: the product on an actual
 * printed menu, which the coded hero loop and the sample-menu demo can't show.
 *
 * Deliberately plain: a native <video> with controls. It never autoplays and
 * preload is "none", so it costs nothing until tapped (the page is static and
 * LCP-sensitive). Native controls give keyboard, captions and fullscreen for
 * free, and respect reduced-motion because nothing moves on its own. Events
 * fire once per page view so the numbers mean "people", not "scrubs".
 */
export default function DemoVideo({ video, className = "" }: { video: DemoVideoConfig; className?: string }) {
  const played = useRef(false);
  const finished = useRef(false);
  const portrait = video.orientation === "portrait";

  return (
    <figure className={`mx-auto ${portrait ? "w-[min(100%,300px)]" : "w-full max-w-3xl"} ${className}`}>
      <div
        className={`overflow-hidden bg-black shadow-2xl ring-1 ring-white/15 ${portrait ? "rounded-[36px] p-[7px]" : "rounded-2xl"}`}
      >
        <video
          controls
          playsInline
          preload="none"
          poster={video.poster}
          width={video.width}
          height={video.height}
          aria-label={video.description}
          className={`block h-auto w-full bg-black ${portrait ? "rounded-[30px]" : "rounded-2xl"}`}
          style={{ aspectRatio: `${video.width} / ${video.height}` }}
          onPlay={() => {
            if (played.current) return;
            played.current = true;
            track("video_play", { id: "demo" });
          }}
          onEnded={() => {
            if (finished.current) return;
            finished.current = true;
            track("video_complete", { id: "demo" });
          }}
        >
          {video.webm && <source src={video.webm} type="video/webm" />}
          <source src={video.mp4} type="video/mp4" />
          {video.captions && <track kind="captions" src={video.captions} srcLang="en" label="English" default />}
          {video.description}
        </video>
      </div>
    </figure>
  );
}
