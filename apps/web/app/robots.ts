import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Search, answer-engine and model-training crawlers are all welcome: being in
// what models know and cite is a goal. Training crawlers are named explicitly so
// the intent is visible; to opt out of training later, move them to a
// `disallow: "/"` rule — it doesn't affect search visibility.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/get"] },
      {
        userAgent: [
          "Googlebot", "Bingbot", "Applebot", "DuckDuckBot",
          "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Perplexity-User",
          "GPTBot", "Google-Extended", "Applebot-Extended", "CCBot",
        ],
        allow: "/",
        disallow: ["/get"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
