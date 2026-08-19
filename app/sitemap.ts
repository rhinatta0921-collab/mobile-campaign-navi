import type { MetadataRoute } from "next";
import {
  APPLICATION_PATHS,
  HOMEPAGE_DATA_CHECKED_AT,
  SITE_URL,
} from "@/app/site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${HOMEPAGE_DATA_CHECKED_AT}T00:00:00+09:00`);
  return [
    {
      url: new URL(APPLICATION_PATHS.mnp, SITE_URL).href,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL(APPLICATION_PATHS.newNumber, SITE_URL).href,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
