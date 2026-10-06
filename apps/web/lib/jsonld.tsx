import { FAQ, PRODUCT, SITE_URL, SUPPORT_EMAIL, APP_STORE_URL } from "./site";

/** Rendered as <script type="application/ld+json">. Never mark up ratings we don't have. */
export function homeJsonLd() {
  const org = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: PRODUCT.name,
    legalName: PRODUCT.publisher,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    email: SUPPORT_EMAIL,
  };

  const app: Record<string, unknown> = {
    "@type": "MobileApplication",
    "@id": `${SITE_URL}/#app`,
    name: PRODUCT.name,
    description: PRODUCT.definition,
    applicationCategory: PRODUCT.category,
    operatingSystem: PRODUCT.platform,
    url: SITE_URL,
    image: `${SITE_URL}/icon-512.png`,
    publisher: { "@id": `${SITE_URL}/#org` },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  if (APP_STORE_URL) app.installUrl = APP_STORE_URL;

  return {
    "@context": "https://schema.org",
    "@graph": [
      org,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#site`,
        url: SITE_URL,
        name: PRODUCT.name,
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      app,
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here except for "</script>" sequences.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
