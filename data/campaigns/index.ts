/// <reference types="vite/client" />

import campaignIndex from "./index.json";

export type ApplicationType = "mnp" | "newNumber";
export type CampaignCodeType = "campaign" | "initiative" | "generated";
export type CampaignAudience = "applicant" | "member" | "both";
export type CampaignCategory =
  | "simOnly"
  | "device"
  | "service"
  | "homeInternet"
  | "memberBenefit"
  | "option"
  | "other";

export type CampaignBenefit = {
  type: string;
  amount: number | null;
  unit: string | null;
  description: string;
};

export type CampaignSourceCard = {
  listingIndex: number;
  title: string;
  description: string;
  url: string;
};

export type Campaign = {
  campaignCode: string;
  codeType: CampaignCodeType;
  title: string;
  summary: string;
  benefit: CampaignBenefit;
  points: {
    newNumber: number | null;
    mnp: number | null;
  };
  breakdown: {
    newNumber: string[] | null;
    mnp: string[] | null;
  };
  target: string;
  conditions: string[];
  channel: string;
  category: CampaignCategory;
  audience: CampaignAudience;
  period: string;
  officialUrl: string;
  listingUrl: string;
  checkedAt: string;
  notes: string[];
  requiresDevicePurchase: boolean;
  rankingEligible: boolean;
  sourceCards: CampaignSourceCard[];
};

const campaignModules = import.meta.glob<Campaign>("./*.campaign.json", {
  eager: true,
  import: "default",
});

export const campaigns: Campaign[] = Object.entries(campaignModules)
  .sort(([left], [right]) => left.localeCompare(right, "en"))
  .map(([, campaign]) => campaign);

export const campaignDataMeta = campaignIndex;

export function getCampaignPoints(
  campaign: Campaign,
  applicationType: ApplicationType,
) {
  return campaign.points[applicationType];
}

export function rankCampaigns(
  items: readonly Campaign[],
  applicationType: ApplicationType,
) {
  return items
    .map((campaign, originalIndex) => ({
      campaign,
      originalIndex,
      points: getCampaignPoints(campaign, applicationType),
    }))
    .filter(
      (
        item,
      ): item is {
        campaign: Campaign;
        originalIndex: number;
        points: number;
      } =>
        item.campaign.rankingEligible &&
        typeof item.points === "number",
    )
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.campaign.campaignCode.localeCompare(
          b.campaign.campaignCode,
          "en",
        ) ||
        a.originalIndex - b.originalIndex,
    )
    .map(({ campaign }) => campaign);
}
