import type { MetadataRoute } from "next";
import { GUIDE_REVIEWED, HOME_MODIFIED, SITE_URL } from "@/lib/site";

// Only lastModified is used by Google, so it must be the real date. The other
// fields are ignored by Google and kept only for crawlers that read them.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: HOME_MODIFIED, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/high-cholesterol-restaurant-guide`, lastModified: GUIDE_REVIEWED, changeFrequency: "monthly", priority: 0.8 },
  ];
}
