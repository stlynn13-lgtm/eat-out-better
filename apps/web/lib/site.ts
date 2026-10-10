/**
 * Facts about the product, in one place. The homepage, JSON-LD, llms.txt and
 * the guide all read from here, so the description an answer engine sees is
 * the same everywhere (consistency across surfaces is what gets a product
 * cited, and a second copy is how it drifts).
 *
 * Only state what the shipped app does. Every line here is backed by the app
 * (apps/mobile/app/how-it-works.tsx, results.tsx) or the scoring code
 * (packages/shared/src/config/scoring.ts).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://eatoutbetter.com").replace(/\/$/, "");

export type LaunchState = "prelaunch" | "live";
export const LAUNCH_STATE: LaunchState =
  process.env.NEXT_PUBLIC_LAUNCH_STATE === "live" && process.env.NEXT_PUBLIC_APP_STORE_URL
    ? "live"
    : "prelaunch";

/** Empty until the listing exists. /get falls back to the waitlist without it. */
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "";

/** Legal pages already live on the API project, which the app links to. One copy, not two. */
export const API_URL = "https://eat-out-better-api.vercel.app";

/**
 * The real-app screen recording shown under "How it works". Null renders
 * nothing, so the site ships fine without it. To turn it on, put the files in
 * public/video/ and fill this in (see README -> "Adding the demo video").
 * Paths are site-relative: media is self-hosted, never a YouTube/Vimeo embed,
 * because the privacy policy promises no third-party cookies.
 */
export type DemoVideoConfig = {
  /** Poster frame. Required: iOS Safari shows nothing until play without one. */
  poster: string;
  /** H.264 MP4 plays everywhere; WebM is an optional smaller file for Chrome/Firefox. */
  mp4: string;
  webm?: string;
  /** WebVTT captions. Most people watch with sound off; also an accessibility need. */
  captions?: string;
  /** "portrait" = phone recording (framed); "landscape" = screen recording. */
  orientation: "portrait" | "landscape";
  /** Width / height of the file, so the box reserves space and the page doesn't jump. */
  width: number;
  height: number;
  /** One-sentence description for screen readers. */
  description: string;
};

export const DEMO_VIDEO: DemoVideoConfig | null = null;

export const SUPPORT_EMAIL = "support@eatoutbetter.com";

/**
 * Real content dates, read by the sitemap and the guide. Bump HOME_MODIFIED when
 * homepage copy changes. Bump GUIDE_REVIEWED only when the guide's claims have
 * actually been re-checked: the page publishes it as "Last reviewed".
 */
export const HOME_MODIFIED = "2026-10-09";
export const GUIDE_REVIEWED = "2026-10-06";

export const PRODUCT = {
  name: "Eat Out Better",
  tagline: "Know what to order before the server comes back.",
  /** The one sentence an extractor should be able to lift verbatim. */
  definition:
    "Eat Out Better is an iPhone app for people managing high cholesterol: photograph any restaurant menu and it scores every dish from 1 to 10 for its likely effect on your cholesterol, explains why in plain English, and suggests a simple swap to make a dish work better for you.",
  shortDescription:
    "Snap a restaurant menu. Every dish gets a 1–10 cholesterol score, the reason why, and an easy swap.",
  platform: "iOS",
  category: "HealthApplication",
  publisher: "Dine Right LLC",
} as const;

export const SCORE_BANDS = [
  { tier: "green", range: "7–10", label: "Top pick", body: "A great choice for your heart." },
  { tier: "yellow", range: "4–6.9", label: "In moderation", body: "Okay now and then. Small swaps help." },
  { tier: "red", range: "1–3.9", label: "Enjoy occasionally", body: "Fine as a treat, not every day." },
] as const;

export const FAQ = [
  {
    q: "What does Eat Out Better do?",
    a: "You take a photo of a restaurant menu and the app reads every dish, scores each one from 1 to 10 for how it's likely to affect your cholesterol, ranks them best to worst, and tells you why in plain English. Where it helps, it suggests a swap, like dressing on the side or grilled instead of fried.",
  },
  {
    q: "How is a dish scored?",
    a: "Mostly on estimated saturated fat, measured against about 13 grams, roughly a full day's heart-healthy budget by American Heart Association guidance. Heart-healthy fats and fiber can lift a score; deep-frying lowers it a little. The AI estimates the grams; the score thresholds are fixed rules in code, not the AI's opinion, so results stay consistent.",
  },
  {
    q: "Does it work at any restaurant?",
    a: "It works on any printed or posted menu you can photograph, from diners to steakhouses to Thai. The app reads dish names and descriptions straight off the page, including small print you can zoom into.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can scan menus without signing up. An optional free account (Apple, Google, or email) backs up your saved scans so they follow you to a new phone.",
  },
  {
    q: "What happens to my menu photos?",
    a: "They're analyzed and then discarded. Menu photos are never stored on our servers.",
  },
  {
    q: "Is this medical advice?",
    a: "No. Scores are informed estimates from a dish's name and description, not lab measurements, and they're general dietary information. Talk to your doctor about your own needs.",
  },
  {
    q: "Is it on Android? What about other conditions?",
    a: "iPhone first. High cholesterol is the first condition; others are planned, but we'd rather do one well before adding more. Join the list and we'll tell you when they arrive.",
  },
] as const;
