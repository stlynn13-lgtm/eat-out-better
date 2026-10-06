"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Cta from "./Cta";
import { LAUNCH_STATE } from "@/lib/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 rounded-lg ${className}`} aria-label="Eat Out Better home">
      <Image src="/mark.png" alt="" width={32} height={32} className="rounded-[9px]" priority />
      <span className="font-display text-[17px] font-semibold tracking-tight sm:text-[19px]">Eat Out Better</span>
    </Link>
  );
}

/**
 * Header that condenses once you scroll, and a slim bottom bar on phones that
 * appears after the hero CTA scrolls out of view and hides again when the
 * final call-to-action (or any waitlist form) is on screen, so the page
 * never shows two identical buttons at once.
 */
export function SiteChrome() {
  const [scrolled, setScrolled] = useState(false);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const hero = document.getElementById("hero-cta");
    const forms = Array.from(document.querySelectorAll("[data-hide-sticky]"));
    const visible = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visible.set(e.target, e.isIntersecting);
      const heroVisible = hero ? (visible.get(hero) ?? true) : false;
      const formVisible = forms.some((f) => visible.get(f));
      setShowBar(!heroVisible && !formVisible);
    });
    if (hero) io.observe(hero);
    forms.forEach((f) => io.observe(f));

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
          scrolled ? "bg-paper/80 shadow-[0_1px_0_var(--line)] backdrop-blur-xl" : "bg-transparent"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[72px] sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink-2 transition-colors hover:text-ink md:inline-flex">
              How it works
            </a>
            <a href="#try" className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink-2 transition-colors hover:text-ink md:inline-flex">
              Try it
            </a>
            <Link href="/high-cholesterol-restaurant-guide" className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink-2 transition-colors hover:text-ink lg:inline-flex">
              Guide
            </Link>
            <Cta placement="header" size="sm" className={showBar ? "max-md:hidden" : ""} />
          </nav>
        </div>
      </header>

      <div
        aria-hidden={!showBar}
        inert={!showBar}
        className={`fixed inset-x-3 z-40 transition-[transform,opacity] duration-300 ease-out-expo md:hidden ${
          showBar ? "translate-y-0 opacity-100" : "translate-y-[140%] opacity-0"
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex items-center gap-3 rounded-full bg-card/90 p-1.5 pl-4 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] ring-1 ring-line backdrop-blur-xl">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{LAUNCH_STATE === "live" ? "Free on iPhone" : "Coming soon to iPhone"}</p>
          <Cta placement="sticky" size="sm" />
        </div>
      </div>
    </>
  );
}
