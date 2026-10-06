import { NextResponse, type NextRequest } from "next/server";
import { APP_STORE_URL, LAUNCH_STATE } from "@/lib/site";

/**
 * Every download link and the QR code point here, never at the store directly.
 * That keeps the QR permanent (it was printed before the listing existed) and
 * makes each placement countable: `src` shows up in Vercel's request logs and
 * in App Store Connect via the `ct` campaign token.
 *
 * Pre-launch, and for anyone not on iOS, this lands on the waitlist instead of
 * a dead end.
 */
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const src = (req.nextUrl.searchParams.get("src") ?? "direct").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "direct";
  const ua = req.headers.get("user-agent") ?? "";
  const ios = /iPhone|iPad|iPod|Macintosh/i.test(ua);

  console.log(JSON.stringify({ event: "get_redirect", src, ios, state: LAUNCH_STATE }));

  if (LAUNCH_STATE === "live" && APP_STORE_URL && ios) {
    const store = new URL(APP_STORE_URL);
    store.searchParams.set("ct", src);
    store.searchParams.set("mt", "8");
    return NextResponse.redirect(store, 302);
  }

  const back = new URL("/", req.nextUrl);
  back.searchParams.set("ref", src);
  back.hash = "waitlist";
  return NextResponse.redirect(back, 302);
}
