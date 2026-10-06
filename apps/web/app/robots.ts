import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Search and answer-engine crawlers are welcome: being cited by them is a goal.
// Training-only crawlers (GPTBot, Google-Extended, Applebot-Extended, CCBot)
// fall under the default rule and are also allowed; to opt out of training,
// add them here with `disallow: "/"` — it doesn't affect search visibility.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/get"] },
      {
        userAgent: [
          "Googlebot", "Bingbot", "Applebot", "DuckDuckBot",
          "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Perplexity-User",
        ],
        allow: "/",
        disallow: ["/get"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
