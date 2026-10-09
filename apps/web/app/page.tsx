import Link from "next/link";
import { SiteChrome } from "@/components/Chrome";
import Cta from "@/components/Cta";
import DemoVideo from "@/components/DemoVideo";
import DishCard from "@/components/DishCard";
import Footer from "@/components/Footer";
import HeroPhone from "@/components/HeroPhone";
import MenuDemo from "@/components/MenuDemo";
import QrCard from "@/components/QrCard";
import WaitlistForm from "@/components/WaitlistForm";
import { homeJsonLd, JsonLd } from "@/lib/jsonld";
import { SAMPLE_MENU } from "@/lib/sample-menu";
import { DEMO_VIDEO, FAQ, LAUNCH_STATE, SCORE_BANDS } from "@/lib/site";

const CUISINES = [
  "Steakhouse", "Italian", "Thai", "Mexican", "Diner breakfast", "Sushi", "Burgers", "Indian",
  "Brunch", "Pizza", "BBQ", "Mediterranean", "Chinese", "Pub food", "Seafood", "Tapas",
];

const BAND_DOT = { green: "bg-green-dot", yellow: "bg-amber-dot", red: "bg-red-dot" } as const;
const BAND_BG = { green: "bg-green-bg", yellow: "bg-amber-bg", red: "bg-red-bg" } as const;
const BAND_INK = { green: "text-green-ink", yellow: "text-amber-ink", red: "text-red-ink" } as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-leaf">{children}</p>
  );
}

export default function Home() {
  const live = LAUNCH_STATE === "live";
  const alfredo = SAMPLE_MENU.find((d) => d.id === "alfredo")!;
  const fajitas = SAMPLE_MENU.find((d) => d.id === "fajitas")!;
  const salmon = SAMPLE_MENU.find((d) => d.id === "salmon")!;

  return (
    <>
      <JsonLd data={homeJsonLd()} />
      <SiteChrome />

      <main id="main">
        {/* ---------------------------------------------------------------- HERO */}
        <section className="relative isolate overflow-hidden pt-28 pb-16 sm:pt-36 lg:pb-28">
          {/* Warm light behind the phone */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute right-[-10%] top-[8%] size-[620px] rounded-full bg-[radial-gradient(closest-side,rgb(64_145_108/0.28),transparent)] blur-2xl" />
            <div className="absolute right-[18%] top-[48%] size-[380px] rounded-full bg-[radial-gradient(closest-side,rgb(217_119_6/0.16),transparent)] blur-2xl" />
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
            <div>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-card/80 px-3.5 py-1.5 text-[13px] font-medium text-ink-2 ring-1 ring-line backdrop-blur">
                <span className="flex gap-1" aria-hidden>
                  <span className="size-2 rounded-full bg-green-dot" />
                  <span className="size-2 rounded-full bg-amber-dot" />
                  <span className="size-2 rounded-full bg-red-dot" />
                </span>
                For people managing high cholesterol
              </p>

              <h1 className="font-display text-[clamp(2.75rem,7.2vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.025em] text-balance">
                Know what to order <em className="font-medium italic text-leaf">before</em> the server comes back.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl text-pretty">
                Eating out with high cholesterol? Snap any restaurant menu. Eat Out Better scores every dish from
                1 to 10, tells you why in plain English, and shows you an easy swap. In about 30 seconds.
              </p>

              <div id="hero-cta" data-hide-sticky className="mt-8 max-w-lg">
                {live ? <Cta placement="hero" /> : <WaitlistForm source="hero" />}
              </div>

              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
                {["Free to download", "No account needed", "Menu photos never stored"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-leaf" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <QrCard />
              </div>
            </div>

            <div className="relative">
              <HeroPhone />
              {/* Floating annotations: desktop only, decorative restatements of the phone. */}
              <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
                <div className="parallax-slow absolute -left-16 top-[6%] xl:-left-24 rounded-2xl bg-card px-4 py-3 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.35)] ring-1 ring-line">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-2">Why it scored low</p>
                  <p className="mt-0.5 max-w-[190px] text-sm leading-snug">Cream, butter &amp; parmesan: likely a full day&rsquo;s saturated fat.</p>
                </div>
                <div className="parallax-slow absolute -right-10 bottom-[8%] xl:-right-16 rounded-2xl bg-card px-4 py-3 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.35)] ring-1 ring-line [animation-direction:reverse]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-2">Make it better</p>
                  <p className="mt-0.5 max-w-[180px] text-sm leading-snug">Dressing on the side, use about half.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- MARQUEE */}
        <section aria-label="Works on any menu" className="marquee border-y border-line bg-paper-2/60 py-5">
          <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
            <ul className="marquee-track flex shrink-0 items-center gap-10 pr-10">
              {[...CUISINES, ...CUISINES].map((c, i) => (
                <li
                  key={`${c}-${i}`}
                  aria-hidden={i >= CUISINES.length}
                  className="flex shrink-0 items-center gap-10 font-display text-2xl italic text-ink-2"
                >
                  {c}
                  <span className="size-1.5 rounded-full bg-leaf/50" />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------- PROBLEM */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="reveal max-w-3xl">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="font-display text-[clamp(2rem,4.6vw,3.5rem)] font-semibold leading-[1.05] tracking-tight text-balance">
              Menus are written to sound delicious, not to tell you what&rsquo;s in them.
            </h2>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              {
                k: "Hidden",
                t: "The richest ingredients go unnamed.",
                b: "Cream, butter and coconut milk rarely make the menu. An alfredo, a curry or a risotto can carry a day's saturated fat without saying so.",
              },
              {
                k: "Misleading",
                t: "“Salad” isn't always the safe bet.",
                b: "Creamy dressing, cheese and croutons can outweigh the greens. Meanwhile grilled salmon, which sounds rich, is often one of the best picks on the page.",
              },
              {
                k: "Rushed",
                t: "And you have about a minute.",
                b: "The table is chatting, the server is waiting, and you're doing nutrition math in your head. So most people just guess.",
              },
            ].map((c, i) => (
              <div
                key={c.k}
                className="reveal rounded-3xl bg-card p-7 ring-1 ring-line"
                style={{ animationRangeStart: `entry ${i * 6}%` }}
              >
                <p className="mb-6 font-display text-sm italic text-leaf">{c.k}</p>
                <h3 className="font-display text-2xl font-semibold leading-tight">{c.t}</h3>
                <p className="mt-3 leading-relaxed text-ink-2">{c.b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- HOW IT WORKS */}
        <section id="how" className="scroll-mt-20 bg-forest-deep py-24 text-cream sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="reveal max-w-2xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#8fd0b4]">How it works</p>
              <h2 className="font-display text-[clamp(2rem,4.6vw,3.5rem)] font-semibold leading-[1.05] tracking-tight text-balance">
                Three steps. About half a minute.
              </h2>
            </div>

            <ol className="mt-16 grid gap-6 lg:grid-cols-3">
              {/* Step 1 */}
              <li className="reveal-scale flex flex-col rounded-[28px] bg-white/[0.06] p-7 ring-1 ring-white/10">
                <div aria-hidden className="relative mb-8 grid h-44 place-items-center overflow-hidden rounded-2xl bg-[#2a2622]">
                  <div className="h-28 w-24 rotate-[-3deg] rounded-sm bg-[#fbf6e9] p-2.5 shadow-xl">
                    {[80, 60, 90, 50, 70, 55].map((w, i) => (
                      <span key={i} className="mb-1.5 block h-1.5 rounded-full bg-[#cdbf9f]" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  {["left-6 top-5 border-l-2 border-t-2", "right-6 top-5 border-r-2 border-t-2", "left-6 bottom-5 border-b-2 border-l-2", "right-6 bottom-5 border-b-2 border-r-2"].map((c) => (
                    <span key={c} className={`absolute size-5 rounded-[3px] border-white/80 ${c}`} />
                  ))}
                </div>
                <p className="font-display text-5xl font-semibold italic text-[#8fd0b4]">1</p>
                <h3 className="mt-3 font-display text-2xl font-semibold">Snap the menu</h3>
                <p className="mt-2 leading-relaxed text-cream/75">
                  Photograph each page. No typing, no searching. Pinch to zoom in on small print.
                </p>
              </li>

              {/* Step 2 */}
              <li className="reveal-scale flex flex-col rounded-[28px] bg-white/[0.06] p-7 ring-1 ring-white/10">
                <div aria-hidden className="mb-8 flex h-44 flex-col justify-center gap-2.5 rounded-2xl bg-white/[0.05] px-6">
                  {["Cedar-Grilled Salmon", "Chicken Fajitas", "Fettuccine Alfredo"].map((n, i) => (
                    <div key={n} className="flex items-center gap-3">
                      <span className="size-6 shrink-0 rounded-md bg-white/10" />
                      <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="absolute inset-y-0 left-0 w-1/2 animate-pulse rounded-full bg-[#8fd0b4]/40 motion-reduce:animate-none"
                          style={{ animationDelay: `${i * 200}ms`, width: `${60 + i * 12}%` }}
                        />
                      </span>
                    </div>
                  ))}
                  <p className="mt-2 text-xs text-cream/60">Reading every dish and description…</p>
                </div>
                <p className="font-display text-5xl font-semibold italic text-[#8fd0b4]">2</p>
                <h3 className="mt-3 font-display text-2xl font-semibold">We read every dish</h3>
                <p className="mt-2 leading-relaxed text-cream/75">
                  The app reads names and descriptions straight off the page, through odd fonts, angles and dim lighting.
                </p>
              </li>

              {/* Step 3 */}
              <li className="reveal-scale flex flex-col rounded-[28px] bg-white/[0.06] p-7 ring-1 ring-white/10">
                <div aria-hidden className="mb-8 flex h-44 flex-col justify-center gap-2 rounded-2xl bg-white/[0.05] px-5">
                  {[salmon, fajitas, alfredo].map((d) => {
                    const tier = d.score >= 7 ? "green" : d.score >= 4 ? "yellow" : "red";
                    return (
                      <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/[0.07] px-3.5 py-2.5">
                        <span className="flex items-center gap-2 text-sm">
                          <span className={`size-2.5 rounded-full ${BAND_DOT[tier]}`} />
                          {d.name}
                        </span>
                        <span className="font-display text-sm font-semibold tabular-nums">{d.score.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="font-display text-5xl font-semibold italic text-[#8fd0b4]">3</p>
                <h3 className="mt-3 font-display text-2xl font-semibold">Ranked for your heart</h3>
                <p className="mt-2 leading-relaxed text-cream/75">
                  Every dish scored 1–10, best to worst, each with a plain-English reason and a swap where one helps.
                </p>
              </li>
            </ol>

            {DEMO_VIDEO && (
              <div className="reveal mt-20 grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
                <div className="max-w-md">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#8fd0b4]">See it for real</p>
                  <h3 className="font-display text-3xl font-semibold leading-tight text-balance">
                    Watch it work on a real menu.
                  </h3>
                  <p className="mt-3 leading-relaxed text-cream/75">
                    From the camera to ranked dishes, start to finish.
                  </p>
                  <div className="mt-6"><Cta placement="how-video" tone="dark" /></div>
                </div>
                <DemoVideo video={DEMO_VIDEO} />
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- DEMO */}
        <section id="try" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="reveal mb-12 max-w-2xl">
            <Eyebrow>Try it here</Eyebrow>
            <h2 className="font-display text-[clamp(2rem,4.6vw,3.5rem)] font-semibold leading-[1.05] tracking-tight text-balance">
              Tap a dish. See what the app would tell you.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-2">
              No guilt, no forbidden foods. Just the reason behind the number, and a way to make it work.
            </p>
          </div>
          <MenuDemo />
        </section>

        {/* -------------------------------------------------------------- METHOD */}
        <section id="method" className="scroll-mt-20 border-y border-line bg-paper-2/50 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
              <div className="reveal">
                <Eyebrow>How we score</Eyebrow>
                <h2 className="font-display text-[clamp(2rem,4.6vw,3.5rem)] font-semibold leading-[1.05] tracking-tight text-balance">
                  A score you can check, not a black box.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-ink-2">
                  The AI&rsquo;s job is narrow: estimate what&rsquo;s in each dish. The score comes from fixed, published
                  rules in our code. Every dish gets one question: how is this likely to affect your cholesterol?
                </p>
                <div className="mt-8 space-y-3">
                  {SCORE_BANDS.map((b) => (
                    <div key={b.tier} className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${BAND_BG[b.tier]}`}>
                      <span className={`font-display text-2xl font-semibold tabular-nums ${BAND_INK[b.tier]} w-20 shrink-0`}>{b.range}</span>
                      <span>
                        <span className={`block font-semibold ${BAND_INK[b.tier]}`}>{b.label}</span>
                        <span className="block text-sm text-ink-2">{b.body}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid content-start gap-10">
              <dl className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
                {[
                  {
                    t: "Saturated fat is the main lever",
                    b: "We estimate each dish's saturated fat against about 13g, roughly a full day's heart-healthy budget by American Heart Association guidance.",
                  },
                  {
                    t: "We read between the lines",
                    b: "Menus rarely name the cream or butter. We infer likely hidden fat from the dish itself: a curry, an alfredo, anything “crispy”.",
                  },
                  {
                    t: "Good fats and fiber help",
                    b: "Omega-3s, olive oil, avocado and beans can lift a score, which is why grilled salmon can beat a “light” salad drowning in dressing.",
                  },
                  {
                    t: "Cooking method matters, a little",
                    b: "Deep-fried dishes lose a point. Grilled, baked, steamed or poached is neutral to favorable.",
                  },
                ].map((f) => (
                  <div key={f.t} className="reveal border-t border-line pt-5">
                    <dt className="font-display text-xl font-semibold leading-snug">{f.t}</dt>
                    <dd className="mt-2 leading-relaxed text-ink-2">{f.b}</dd>
                  </div>
                ))}

              </dl>
                <p className="text-sm leading-relaxed text-ink-2">
                  Scores are informed estimates from a dish&rsquo;s name and description, not lab measurements.{" "}
                  <Link href="/high-cholesterol-restaurant-guide#how-we-rate-dishes" className="font-medium text-ink underline decoration-leaf/50 underline-offset-4 hover:decoration-leaf">
                    Read the full method
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- SWAPS */}
        <section className="mx-auto max-w-6xl overflow-x-clip px-4 py-24 sm:px-6 sm:py-32">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="reveal order-2 lg:order-1">
              <div className="relative mx-auto max-w-md px-2 py-6 sm:p-0">
                <div className="absolute -inset-6 -z-10 rotate-[-3deg] rounded-[36px] bg-amber-bg" aria-hidden />
                <DishCard dish={fajitas} />
              </div>
            </div>
            <div className="reveal order-1 lg:order-2">
              <Eyebrow>Built to help you say yes</Eyebrow>
              <h2 className="font-display text-[clamp(2rem,4.6vw,3.5rem)] font-semibold leading-[1.05] tracking-tight text-balance">
                Not a list of things you can&rsquo;t have.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-2">
                You don&rsquo;t need the perfect order. You need one you feel good about. So most scores come with a
                swap that keeps the dish you wanted and makes it work better for you: sauce on the side, grilled
                instead of fried, salad instead of fries.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Order with the table, not off a separate menu",
                  "See the trade-off, then make your own call",
                  "Never feel lectured about a birthday dessert",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span aria-hidden className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-green-bg text-green-ink">
                      <svg viewBox="0 0 20 20" className="size-3" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path d="M5 10.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-[17px]">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ PRIVACY */}
        <section aria-labelledby="privacy-h" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
          <div className="reveal grid gap-8 rounded-[32px] bg-card p-8 ring-1 ring-line sm:p-12 md:grid-cols-[1fr_2fr] md:gap-12">
            <h2 id="privacy-h" className="font-display text-3xl font-semibold leading-tight">
              Private by default.
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { t: "Photos are discarded", b: "Menu photos are analyzed, then thrown away. Never stored on our servers." },
                { t: "No account needed", b: "Scan right away. Sign in only if you want saved scans on a new phone." },
                { t: "Your data isn't for sale", b: "We don't sell data. Ever. Read the privacy policy for the details." },
              ].map((p) => (
                <div key={p.t}>
                  <p className="font-semibold">{p.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{p.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- FAQ */}
        <section id="faq" aria-labelledby="faq-h" className="scroll-mt-20 mx-auto max-w-3xl px-4 pb-24 sm:px-6 sm:pb-32">
          <Eyebrow>Questions</Eyebrow>
          <h2 id="faq-h" className="font-display text-[clamp(2rem,4.6vw,3.5rem)] font-semibold leading-[1.05] tracking-tight">
            Good to know
          </h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-6 py-5 text-left font-display text-xl font-semibold leading-snug">
                  {q}
                  <span aria-hidden className="faq-icon grid size-8 shrink-0 place-items-center rounded-full bg-paper-2 text-lg transition-transform duration-300">
                    +
                  </span>
                </summary>
                <p className="pb-6 pr-12 leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- FINAL CTA */}
        <section id="waitlist" className="scroll-mt-16 px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="relative isolate overflow-hidden rounded-[36px] bg-forest-deep px-6 py-20 text-cream sm:px-12 sm:py-28">
            <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(143_208_180/0.25),transparent)]" />
            <div aria-hidden className="absolute -bottom-40 left-[-10%] -z-10 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(217_119_6/0.18),transparent)]" />
            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <h2 className="font-display text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-tight text-balance">
                  Your next menu, <em className="font-medium italic text-[#8fd0b4]">sorted.</em>
                </h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-cream/75">
                  {live
                    ? "Free on iPhone. Scan your first menu tonight."
                    : "Eat Out Better is coming to iPhone. Join the list and we'll email you the day it's on the App Store."}
                </p>
              </div>
              <div data-hide-sticky className="space-y-8">
                {live ? <Cta placement="final" tone="dark" /> : <WaitlistForm source="final" tone="dark" />}
                <QrCard tone="dark" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
