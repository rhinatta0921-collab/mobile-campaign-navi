import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/site-config";
import { campaignCatalog } from "@/data/campaigns";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(
    `${campaignCatalog.lastSuccessfulCheckAt}T12:00:00+09:00`,
  );
  return [
    {
      url: new URL("/", SITE_URL).href,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
