import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/Chrome";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";
import { JsonLd } from "@/lib/jsonld";
import { GUIDE_REVIEWED, PRODUCT, SITE_URL } from "@/lib/site";

/**
 * The search / answer-engine page. Structure is deliberate:
 *  - every H2 is the question people actually type,
 *  - the first paragraph under it is a direct 40–60 word answer an engine can
 *    quote on its own, then detail,
 *  - any number cites a primary source, linked in the page.
 * Bump GUIDE_REVIEWED (lib/site.ts) whenever the content is checked again.
 *
 * TITLE stays under ~60 characters and DESCRIPTION under ~155 so neither is
 * cut off in search results.
 */
const REVIEWED = GUIDE_REVIEWED;
const PATH = "/high-cholesterol-restaurant-guide";
const TITLE = "How to Eat Out With High Cholesterol: Ordering Guide";
const DESCRIPTION =
  "What to order at steakhouses, Italian, Mexican, Asian and breakfast spots with high cholesterol: menu words that hide saturated fat, and easy swaps.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "article", url: `${SITE_URL}${PATH}`, title: TITLE, description: DESCRIPTION },
};

const SOURCES = {
  aha: {
    label: "American Heart Association, “Saturated Fat”",
    url: "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats",
  },
  ahaChol: {
    label: "Carson et al., “Dietary Cholesterol and Cardiovascular Risk: A Science Advisory From the American Heart Association,” Circulation, 2019",
    url: "https://doi.org/10.1161/CIR.0000000000000743",
  },
  fda: {
    label: "U.S. FDA, “Final Determination Regarding Partially Hydrogenated Oils (Removing Trans Fat)”",
    url: "https://www.fda.gov/food/food-additives-petitions/final-determination-regarding-partially-hydrogenated-oils-removing-trans-fat",
  },
};

function Cite({ s, n }: { s: keyof typeof SOURCES; n: number }) {
  return (
    <sup>
      <a href={`#src-${s}`} className="ml-0.5 text-leaf no-underline hover:underline" aria-label={`Source ${n}`}>
        [{n}]
      </a>
    </sup>
  );
}

const RED_FLAGS = [
  ["Creamy, cream sauce, alfredo, carbonara, vodka sauce", "Heavy cream and cheese"],
  ["Buttery, beurre blanc, butter-basted, scampi", "Butter, often a lot of it"],
  ["Crispy, battered, tempura, fried, golden", "Deep-fried, usually in batter"],
  ["Au gratin, smothered, loaded, cheesy, queso", "Melted cheese on top or throughout"],
  ["Hollandaise, béarnaise, aioli, ranch, Caesar", "Butter- or egg-yolk-and-oil-based sauces"],
  ["Coconut curry, korma, makhani, tikka masala", "Coconut milk, cream, butter or ghee"],
  ["Marbled, prime rib, ribeye, belly, sausage, bacon", "Fattier cuts and processed meats"],
] as const;

const METHODS = [
  ["Grilled, broiled, blackened", "Usually a good pick", "Little added fat; watch for butter brushed on at the end."],
  ["Steamed, poached, baked, roasted", "Usually a good pick", "Gentle methods that don't add much fat on their own."],
  ["Sautéed, stir-fried, seared", "Depends on the fat", "Fine in olive oil; less so in butter. Ask which."],
  ["Pan-fried, braised in cream", "Often heavier", "Cream, butter and lard are common here."],
  ["Deep-fried, battered, crispy", "Usually the heaviest", "Batter soaks up frying oil, and fries usually come alongside."],
] as const;

const CUISINES = [
  {
    id: "steakhouse",
    name: "Steakhouse",
    good: "Sirloin, filet or flank steak in a smaller portion; grilled fish or chicken; a baked potato or vegetables on the side.",
    watch: "Ribeye and prime rib, butter melted on top, creamed spinach, loaded potatoes, wedge salads with blue cheese.",
    swap: "Ask for the steak without the finishing butter, and trade the loaded potato for vegetables.",
  },
  {
    id: "italian",
    name: "Italian",
    good: "Pasta with marinara, arrabbiata or garlic and olive oil; grilled fish; minestrone; bruschetta.",
    watch: "Alfredo, carbonara, vodka sauce, anything parmigiana or baked with cheese, sausage-heavy dishes.",
    swap: "Keep the pasta you want and switch the sauce to a tomato- or olive-oil-based one.",
  },
  {
    id: "mexican",
    name: "Mexican",
    good: "Fajitas, grilled fish or chicken tacos, black beans, pico de gallo, guacamole.",
    watch: "Queso, sour cream, chimichangas and other fried dishes, refried beans made with lard.",
    swap: "Skip the cheese and sour cream; double the pico and guacamole. Ask if the refried beans are made with lard.",
  },
  {
    id: "asian",
    name: "Chinese, Thai and Indian",
    good: "Steamed dishes, stir-fries heavy on vegetables, tandoori-cooked meats, dal, broth-based soups.",
    watch: "General Tso's and other battered-and-fried dishes, coconut curries, korma and butter chicken.",
    swap: "Choose a tomato- or broth-based curry over a coconut or cream one, and steamed rice over fried rice.",
  },
  {
    id: "burgers",
    name: "Burgers and pub food",
    good: "A grilled chicken sandwich, a bean or veggie burger, a single patty with lots of vegetables.",
    watch: "Double patties, bacon and cheese stacked together, fish and chips, onion rings, loaded fries.",
    swap: "Hold the cheese or the bacon (even one makes a difference), and get a side salad instead of fries.",
  },
  {
    id: "breakfast",
    name: "Breakfast and brunch",
    good: "Oatmeal, fruit, whole-grain toast, an omelet cooked with vegetables, smoked salmon.",
    watch: "Biscuits and gravy, eggs Benedict with hollandaise, bacon and sausage platters, pastries.",
    swap: "Ask for eggs cooked in olive oil rather than butter, and hold the hollandaise or get it on the side.",
  },
  {
    id: "sushi",
    name: "Sushi and seafood",
    good: "Sashimi, nigiri, salmon or tuna rolls, edamame, miso soup, grilled fish.",
    watch: "Tempura and “crunchy” rolls, rolls topped with spicy mayo or cream cheese, fried calamari.",
    swap: "Swap one tempura roll for a salmon or tuna roll; ask for spicy mayo on the side.",
  },
];

const SWAPS = [
  ["Sauce or dressing on the side", "You decide how much goes on, and it's usually much less than the kitchen would add."],
  ["Grilled instead of fried", "The same protein without the batter and frying oil."],
  ["Side salad or vegetables instead of fries", "One of the easiest changes, and most kitchens will do it."],
  ["Tomato or olive-oil sauce instead of cream", "Keeps the dish you wanted and changes most of the saturated fat."],
  ["Hold one of: cheese, bacon, butter", "You don't have to strip a dish bare. Losing one rich topping matters."],
] as const;

export default function Guide() {
  const articleLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: TITLE,
        description: DESCRIPTION,
        url: `${SITE_URL}${PATH}`,
        datePublished: REVIEWED,
        dateModified: REVIEWED,
        author: { "@type": "Organization", name: PRODUCT.name, url: SITE_URL },
        publisher: { "@id": `${SITE_URL}/#org` },
        citation: Object.values(SOURCES).map((s) => s.url),
        about: [{ "@type": "MedicalCondition", name: "Hypercholesterolemia" }],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Eating out with high cholesterol", item: `${SITE_URL}${PATH}` },
        ],
      },
    ],
  };

  const h2 = "scroll-mt-24 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.25rem] mt-16 mb-4";
  const answer = "text-lg leading-relaxed text-ink";

  return (
    <>
      <JsonLd data={articleLd} />
      <SiteChrome />
      <main id="main" className="pt-28 sm:pt-36">
        <article className="mx-auto max-w-[44rem] px-4 pb-24 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-2">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span aria-hidden className="mx-2">/</span>
            <span aria-current="page">Eating out with high cholesterol</span>
          </nav>

          <h1 className="font-display text-[clamp(2.4rem,6vw,3.75rem)] font-semibold leading-[1.02] tracking-tight text-balance">
            How to eat out with high cholesterol
          </h1>
          <p className="mt-5 text-xl leading-relaxed text-ink-2">
            A practical guide to ordering at restaurants: what to look for on the menu, what to ask, and the swaps
            that make the biggest difference without giving up the meal.
          </p>
          <p className="mt-6 text-sm text-ink-2">
            By the {PRODUCT.name} team · Last reviewed{" "}
            <time dateTime={REVIEWED}>{new Date(REVIEWED + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>
          </p>

          <aside className="mt-10 rounded-3xl bg-green-bg p-6 sm:p-8" aria-label="Short answer">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-green-ink">The short answer</p>
            <p className="text-lg leading-relaxed">
              Focus on saturated fat. Choose grilled, baked, steamed or poached dishes; favor fish, beans, vegetables
              and olive-oil-based sauces; and watch for cream, butter, cheese and deep-frying, which menus often don&rsquo;t
              name. You rarely need to skip a dish entirely: one swap, like sauce on the side or salad instead of fries,
              usually does most of the work.
            </p>
          </aside>

          <h2 id="what-to-order" className={h2}>What should I order at a restaurant if I have high cholesterol?</h2>
          <p className={answer}>
            Pick dishes built around fish, poultry, beans or vegetables, cooked by grilling, baking, steaming or
            poaching, with tomato- or olive-oil-based sauces. The American Heart Association suggests keeping saturated
            fat under 6% of daily calories, about 13 grams on a 2,000-calorie day,
            <Cite s="aha" n={1} /> and a single rich restaurant dish can use most of that.
          </p>
          <p className="mt-4 leading-relaxed text-ink-2">
            That&rsquo;s why saturated fat is the most useful thing to estimate when you scan a menu. It is the main dietary
            lever on LDL cholesterol for most people, and it&rsquo;s the one restaurants hide best.
          </p>

          <h2 id="menu-words" className={h2}>What menu words signal hidden saturated fat?</h2>
          <p className={answer}>
            Words like creamy, buttery, crispy, battered, au gratin, loaded and smothered usually mean cream, butter,
            cheese or deep-frying, even when those ingredients aren&rsquo;t listed. A dish described as fresh or light can
            still carry a rich sauce, so read the description, not just the name.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-line">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Menu words and what they usually mean</caption>
              <thead className="bg-paper-2 text-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">If the menu says…</th>
                  <th scope="col" className="px-4 py-3 font-semibold">It usually means</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-card">
                {RED_FLAGS.map(([words, means]) => (
                  <tr key={words}>
                    <td className="px-4 py-3 align-top italic">{words}</td>
                    <td className="px-4 py-3 align-top text-ink-2">{means}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="cooking-methods" className={h2}>Which cooking methods are best for high cholesterol?</h2>
          <p className={answer}>
            Grilled, broiled, baked, roasted, steamed and poached are usually the best choices because they add little
            fat. Deep-fried and battered dishes are usually the heaviest. For sautéed and stir-fried dishes, the cooking
            fat decides it: olive oil is a better sign than butter.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-line">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Cooking methods compared</caption>
              <thead className="bg-paper-2 text-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Method</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Verdict</th>
                  <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-card">
                {METHODS.map(([m, v, why]) => (
                  <tr key={m}>
                    <td className="px-4 py-3 align-top font-medium">{m}</td>
                    <td className="px-4 py-3 align-top text-ink-2">
                      {v}
                      <span className="mt-1 block text-sm sm:hidden">{why}</span>
                    </td>
                    <td className="hidden px-4 py-3 align-top text-ink-2 sm:table-cell">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="by-restaurant" className={h2}>How do I order at different kinds of restaurants?</h2>
          <p className={answer}>
            Every cuisine has dependable picks and predictable traps. The pattern is the same everywhere: favor grilled
            proteins, vegetables and tomato- or olive-oil-based sauces, and treat cream, cheese, butter and deep-frying
            as the things to trade down.
          </p>
          <div className="mt-8 space-y-4">
            {CUISINES.map((c) => (
              <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`} className="scroll-mt-24 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-7">
                <h3 id={`${c.id}-h`} className="font-display text-2xl font-semibold">{c.name}</h3>
                <dl className="mt-4 space-y-3 text-[15px] leading-relaxed">
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-green-ink">Good picks</dt>
                    <dd className="text-ink-2">{c.good}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-amber-ink">Watch for</dt>
                    <dd className="text-ink-2">{c.watch}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink">Easy swap</dt>
                    <dd className="text-ink-2">{c.swap}</dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>

          <h2 id="swaps" className={h2}>What are the easiest swaps when eating out?</h2>
          <p className={answer}>
            The five swaps that do the most: sauce or dressing on the side, grilled instead of fried, a salad or
            vegetables instead of fries, a tomato or olive-oil sauce instead of cream, and holding one rich topping like
            cheese, bacon or butter. Most kitchens hear these requests every day.
          </p>
          <ol className="mt-6 space-y-3">
            {SWAPS.map(([t, b], i) => (
              <li key={t} className="flex gap-4 rounded-2xl bg-card p-5 ring-1 ring-line">
                <span className="font-display text-3xl font-semibold italic leading-none text-leaf">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="mt-1 block text-ink-2">{b}</span>
                </span>
              </li>
            ))}
          </ol>

          <h2 id="eggs-shellfish" className={h2}>Do I need to avoid eggs and shrimp?</h2>
          <p className={answer}>
            Not automatically. The American Heart Association&rsquo;s current guidance focuses on overall eating patterns,
            such as Mediterranean-style and DASH diets, rather than a specific daily limit on dietary cholesterol.
            <Cite s="ahaChol" n={2} /> In practice, judge an egg or shrimp dish by what it&rsquo;s cooked with: shrimp scampi in
            butter is a very different dish from grilled shrimp.
          </p>

          <h2 id="trans-fat" className={h2}>Do I still need to worry about trans fat when eating out?</h2>
          <p className={answer}>
            Much less than you used to. The FDA determined in 2015 that partially hydrogenated oils, the main source of
            artificial trans fat, are no longer generally recognized as safe, with compliance phased in from 2018.
            <Cite s="fda" n={3} /> So &ldquo;fried&rdquo; no longer automatically means trans fat in the U.S. Fried food still
            soaks up a lot of oil, which is why it still matters.
          </p>

          <h2 id="how-we-rate-dishes" className={h2}>How does Eat Out Better rate dishes?</h2>
          <p className={answer}>
            {PRODUCT.name} estimates each dish&rsquo;s saturated fat from its name and description and measures it against
            about 13 grams, the American Heart Association&rsquo;s daily figure for a 2,000-calorie diet.<Cite s="aha" n={1} />{" "}
            Fixed rules in code then turn that into a 1–10 score.
          </p>
          <ul className="mt-5 space-y-2.5 leading-relaxed text-ink-2">
            <li><strong className="text-ink">7 to 10, top pick.</strong> Low in saturated fat, often with heart-healthy fats or fiber.</li>
            <li><strong className="text-ink">4 to 6.9, in moderation.</strong> A reasonable choice, usually improved by one swap.</li>
            <li><strong className="text-ink">1 to 3.9, enjoy occasionally.</strong> Likely a large share of a day&rsquo;s saturated fat in one dish.</li>
            <li>Unsaturated fats (olive oil, avocado, omega-3s from fish) and fiber can lift a score. Deep-frying lowers it a little.</li>
            <li>Drinks and desserts are also checked for added sugar.</li>
            <li>The AI estimates the grams; it does not pick the score. The same scan always gives the same result.</li>
          </ul>
          <p className="mt-5 leading-relaxed text-ink-2">
            Scores are informed estimates, not lab measurements. Restaurant recipes and portions vary, and only the
            kitchen knows exactly what goes into a dish.
          </p>

          <div className="mt-14 rounded-[28px] bg-forest-deep p-8 text-cream sm:p-10">
            <p className="font-display text-3xl font-semibold leading-tight">Do this for any menu in about 30 seconds.</p>
            <p className="mt-3 text-cream/75">
              Snap the menu and {PRODUCT.name} ranks every dish for your cholesterol, with the reason and a swap.
            </p>
            <Cta placement="guide" tone="dark" className="mt-6" />
          </div>

          <p className="mt-12 rounded-2xl bg-paper-2 p-5 text-sm leading-relaxed text-ink-2">
            This guide is general information, not medical advice. Your doctor or a registered dietitian can tell you
            what&rsquo;s right for you, especially if you take cholesterol-lowering medication or have other conditions.
          </p>

          <section aria-labelledby="sources-h" className="mt-12 border-t border-line pt-8">
            <h2 id="sources-h" className="font-display text-xl font-semibold">Sources</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
              {(["aha", "ahaChol", "fda"] as const).map((k) => (
                <li key={k} id={`src-${k}`}>
                  <a href={SOURCES[k].url} rel="noopener" className="underline decoration-line underline-offset-4 hover:text-ink">
                    {SOURCES[k].label}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
