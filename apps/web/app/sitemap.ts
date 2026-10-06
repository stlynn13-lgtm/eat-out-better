import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: "2026-10-06", changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/high-cholesterol-restaurant-guide`, lastModified: "2026-10-06", changeFrequency: "monthly", priority: 0.8 },
  ];
}
