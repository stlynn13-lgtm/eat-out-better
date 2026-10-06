import Link from "next/link";
import { Logo } from "./Chrome";
import { PRODUCT, SUPPORT_EMAIL } from "@/lib/site";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-2">{PRODUCT.shortDescription}</p>
        </div>
        <nav aria-label="Product" className="text-sm">
          <p className="mb-3 font-semibold">Product</p>
          <ul className="space-y-1">
            <li><a className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink" href="/#how">How it works</a></li>
            <li><a className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink" href="/#method">How we score</a></li>
            <li><Link className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink" href="/high-cholesterol-restaurant-guide">Eating out with high cholesterol</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company" className="text-sm">
          <p className="mb-3 font-semibold">Company</p>
          <ul className="space-y-1">
            <li><a className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink" href="/privacy">Privacy Policy</a></li>
            <li><a className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink" href="/terms">Terms of Service</a></li>
            <li><a className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink" href="/support">Support</a></li>
            <li><a className="inline-flex min-h-10 items-center text-ink-2 hover:text-ink" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl border-t border-line px-4 pt-6 pb-28 md:pb-6 text-xs leading-relaxed text-ink-2 sm:px-6">
        <p>
          Eat Out Better offers general dietary information, not medical advice. Scores are estimates from a
          dish&rsquo;s name and description, not lab measurements. Always talk to your doctor about your own health needs.
        </p>
        <p className="mt-2">© {year} {PRODUCT.publisher}. iPhone is a trademark of Apple Inc.</p>
      </div>
    </footer>
  );
}
