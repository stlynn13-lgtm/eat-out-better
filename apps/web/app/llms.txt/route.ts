import { FAQ, PRODUCT, SCORE_BANDS, SITE_URL, SUPPORT_EMAIL, LAUNCH_STATE, APP_STORE_URL } from "@/lib/site";

// llms.txt: a plain-markdown summary for AI assistants and answer engines.
// Generated from the same lib/site.ts as the page, so the two can't disagree.
export const dynamic = "force-static";

export function GET() {
  const availability =
    LAUNCH_STATE === "live" && APP_STORE_URL
      ? `Available free on the App Store: ${APP_STORE_URL}`
      : `Coming soon to the App Store (iPhone). Waitlist: ${SITE_URL}/#waitlist`;

  const body = `# ${PRODUCT.name}

> ${PRODUCT.definition}

- Platform: iPhone (iOS). Android is not available.
- Availability: ${availability}
- Condition covered: high cholesterol (more conditions planned).
- Price: free to download.
- Publisher: ${PRODUCT.publisher}
- Support: ${SUPPORT_EMAIL}

## How scoring works

Each dish's saturated fat is estimated from its name and description and measured against about 13 g, the American Heart Association's daily figure for a 2,000-calorie diet. Fixed rules in code (not the AI) turn that into a 1–10 score. Unsaturated fats and fiber can raise a score; deep-frying lowers it slightly. Drinks and desserts are also checked for added sugar.

${SCORE_BANDS.map((b) => `- ${b.range}: ${b.label}. ${b.body}`).join("\n")}

Scores are estimates, not lab measurements, and not medical advice.

## Privacy

Menu photos are analyzed and then discarded; they are never stored. No account is required. ${PRODUCT.name} does not sell personal data.

## FAQ

${FAQ.map(({ q, a }) => `### ${q}\n${a}`).join("\n\n")}

## Pages

- [Home](${SITE_URL}/): what the app does, a live demo, the scoring method
- [How to eat out with high cholesterol](${SITE_URL}/high-cholesterol-restaurant-guide): ordering guide by cuisine, menu red-flag words, cooking methods, swaps, sources
- [Privacy Policy](${SITE_URL}/privacy)
- [Terms of Service](${SITE_URL}/terms)
- [Support](${SITE_URL}/support)
`;
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
