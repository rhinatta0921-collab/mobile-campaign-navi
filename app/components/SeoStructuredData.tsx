import { SITE_NAME, SITE_URL } from "@/app/site-config";
import type { ApplicationType, Campaign } from "@/data/campaigns";

type StructuredRanking = {
  applicationType: ApplicationType;
  campaigns: readonly Campaign[];
  name: string;
};

type SeoStructuredDataProps = {
  description: string;
  rankings: readonly StructuredRanking[];
  title: string;
};

export function SeoStructuredData({
  description,
  rankings,
  title,
}: SeoStructuredDataProps) {
  const pageUrl = new URL("/", SITE_URL).href;
  const rankingIds = Object.fromEntries(
    rankings.map(({ applicationType }) => [
      applicationType,
      `${pageUrl}#ranking-${applicationType}`,
    ]),
  ) as Record<ApplicationType, string>;
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
        mainEntity: rankings.map(({ applicationType }) => ({
          "@id": rankingIds[applicationType],
        })),
        inLanguage: "ja-JP",
      },
      ...rankings.map(({ applicationType, campaigns, name }) => ({
        "@type": "ItemList",
        "@id": rankingIds[applicationType],
        name,
        numberOfItems: campaigns.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: campaigns.map((campaign, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Thing",
            name: campaign.title,
            url: campaign.officialUrl,
          },
        })),
      })),
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
