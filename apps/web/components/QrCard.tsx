import QRCode from "qrcode";
import { LAUNCH_STATE, SITE_URL } from "@/lib/site";

/**
 * Desktop-only "scan to get it on your phone" card.
 *
 * The code points at our own /get?src=qr, never the App Store directly, so it
 * never needs regenerating: today /get lands on the waitlist, and the day the
 * listing exists it redirects to the store. It also makes QR scans countable.
 *
 * Rendered to SVG at build time (server component): no client library, crisp
 * at any size. Error correction H so it still scans if partly obscured.
 */
export default async function QrCard({ tone = "light" }: { tone?: "light" | "dark" }) {
  const url = `${SITE_URL}/get?src=qr`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: { dark: "#0e332e", light: "#ffffff" },
  });
  const live = LAUNCH_STATE === "live";
  const dark = tone === "dark";

  return (
    // Hidden on touch devices and small screens: you can't scan your own screen.
    <div className="hidden [@media(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:flex items-center gap-4">
      <div
        className="size-[112px] shrink-0 rounded-2xl bg-white p-2 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] ring-1 ring-black/5 [&_svg]:size-full"
        role="img"
        aria-label={live ? "QR code to download Eat Out Better from the App Store" : "QR code to open this page on your iPhone"}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className={`max-w-[190px] text-sm leading-snug ${dark ? "text-cream/80" : "text-ink-2"}`}>
        <p className={`mb-1 font-semibold ${dark ? "text-cream" : "text-ink"}`}>
          {live ? "Scan to download" : "On your laptop?"}
        </p>
        {live
          ? "Point your iPhone camera here to get the app."
          : "Scan with your iPhone camera to open this on your phone."}
        <span className="mt-1 block font-mono text-[11px] opacity-80">{url.replace(/^https?:\/\//, "")}</span>
      </div>
    </div>
  );
}
