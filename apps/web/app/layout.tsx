import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PRODUCT, SITE_URL } from "@/lib/site";
import "./globals.css";

// Fraunces: a warm "old-style" display serif with an optical-size axis, so the
// 88px hero and 20px card titles each get the right letterforms from one file.
// Inter for UI and body. Both self-hosted by next/font (no Google request at
// runtime, metric-matched fallbacks so no layout shift). The SOFT/WONK axes
// were dropped on purpose: SOFT alone nearly doubled the preloaded font bytes
// (270KB -> 149KB without it) and pushed mobile LCP past 5s.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

// The italic is a separate file used for a handful of accent words. Not
// preloaded, so it doesn't compete with the upright face and the JS for
// bandwidth on a slow phone connection; until it lands, the accent words show
// in the upright face (still in the accent color).
const frauncesItalic = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: "italic",
  variable: "--font-fraunces-italic",
  display: "swap",
  preload: false,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const title = "Eat Out Better — Restaurant menus, scored for high cholesterol";
const description =
  "Snap any restaurant menu. Every dish gets a 1–10 score for your cholesterol, a plain-English reason, and an easy swap. iPhone app, coming soon.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s · Eat Out Better" },
  description,
  applicationName: PRODUCT.name,
  alternates: { canonical: "/" },
  keywords: [
    "high cholesterol restaurant",
    "eating out with high cholesterol",
    "heart healthy restaurant menu",
    "low saturated fat restaurant food",
    "menu scanner app",
    "cholesterol diet app",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: PRODUCT.name,
    title,
    description,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
  // Add the Apple Smart App Banner when the listing exists:
  // other: { "apple-itunes-app": "app-id=<id>" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1613" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${frauncesItalic.variable} ${inter.variable}`}>
      <body className="min-h-dvh overflow-x-clip">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-on-forest"
        >
          Skip to content
        </a>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
