import type { MetadataRoute } from "next";
import { HOMEPAGE_DATA_CHECKED_AT, SITE_URL } from "@/app/site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${HOMEPAGE_DATA_CHECKED_AT}T00:00:00+09:00`);
  return [
    {
      url: new URL("/", SITE_URL).href,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
