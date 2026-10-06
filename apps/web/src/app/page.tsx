import Image from "next/image";
import Waitlist from "@/components/Waitlist";
import { content } from "@/content";

const featureIcons = [
  "M4 6h16M4 12h10M4 18h6",
  "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6v-4m0-4h.01",
  "M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3",
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <a href="#" className="flex items-center gap-2.5 font-serif text-lg font-semibold">
          <Image src="/mark.png" alt="" width={36} height={36} priority />
          Eat Out Better
        </a>
        <a
          href="#waitlist"
          className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-brand-900/30 px-5 text-sm font-semibold transition-colors duration-200 hover:bg-brand-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          {content.cta}
        </a>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-16">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-600">
              {content.hero.eyebrow}
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {content.hero.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-900/80">
              {content.hero.subhead}
            </p>
            <div className="mt-8">
              <Waitlist id="waitlist" />
            </div>
          </div>

          <div aria-label="Example dish ratings" className="rounded-3xl bg-brand-900 p-5 shadow-xl sm:p-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-100/80">
              Example results
            </p>
            <ul className="space-y-3">
              {content.exampleResults.map((r) => (
                <li key={r.dish} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className={`h-3 w-3 rounded-full ${r.tone}`} />
                    <span className="text-sm font-semibold">{r.label}</span>
                  </div>
                  <p className="mt-1 font-serif text-lg font-semibold">{r.dish}</p>
                  <p className="mt-1 text-sm text-brand-900/75">{r.why}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-brand-100/70">Illustrative examples, not real scan output.</p>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{content.problem.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-brand-900/80">{content.problem.body}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">How it works</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {content.steps.map((s, i) => (
              <li key={s.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-900 font-serif text-lg font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-serif text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-brand-900/80">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">What you get</h2>
            <ul className="mt-12 grid gap-6 md:grid-cols-3">
              {content.features.map((f, i) => (
                <li key={f.title} className="rounded-2xl border border-brand-900/10 bg-cream p-6">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                    <Icon d={featureIcons[i]} />
                  </span>
                  <h3 className="font-serif text-xl font-semibold">{f.title}</h3>
                  <p className="mt-2 text-brand-900/80">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-brand-900 py-12 text-white">
          <ul className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3">
            {content.principles.map((p) => (
              <li key={p} className="font-serif text-lg leading-snug">
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Questions</h2>
          <div className="mt-8 divide-y divide-brand-900/15 border-y border-brand-900/15">
            {content.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
                  {item.q}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-3 leading-relaxed text-brand-900/80">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-brand-900 py-20 text-white">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{content.finalCta.headline}</h2>
            <div className="mt-8 w-full max-w-md rounded-2xl bg-cream p-5 text-left text-brand-900">
              <Waitlist id="waitlist-footer" />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-brand-900/70 sm:px-6">
        <p className="max-w-2xl">{content.disclaimer}</p>
      </footer>
    </>
  );
}
