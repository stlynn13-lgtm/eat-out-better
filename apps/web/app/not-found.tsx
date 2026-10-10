import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="font-display text-7xl font-semibold italic text-leaf">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">That page isn&rsquo;t on the menu.</h1>
        <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-forest px-6 font-semibold text-on-forest">
          Back to the homepage
        </Link>
      </div>
    </main>
  );
}
