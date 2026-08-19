import { APPLICATION_PATHS, SITE_NAME, SITE_URL } from "@/app/site-config";
import {
  getCampaignApplicationUrl,
  type ApplicationType,
  type Campaign,
} from "@/data/campaigns";

type SeoStructuredDataProps = {
  applicationType: ApplicationType;
  description: string;
  rankedCampaigns: readonly Campaign[];
  title: string;
};

export function SeoStructuredData({
  applicationType,
  description,
  rankedCampaigns,
  title,
}: SeoStructuredDataProps) {
  const pageUrl = new URL(APPLICATION_PATHS[applicationType], SITE_URL).href;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: "ja-JP",
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: { "@id": `${pageUrl}#ranking` },
        inLanguage: "ja-JP",
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#ranking`,
        name: `${title}の順位一覧`,
        numberOfItems: rankedCampaigns.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: rankedCampaigns.map((campaign, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Thing",
            name: campaign.title,
            url: getCampaignApplicationUrl(campaign),
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replaceAll("<", "\\u003c"),
      }}
    />
  );
}
