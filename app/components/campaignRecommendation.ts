import type { Campaign } from "@/data/campaigns";

const recommendationOverrides: Record<string, string> = {
  "2162": "2回線目以降・再契約でも高ポイントを狙いたい人",
  "3327": "初回申込でポイント額を最優先する人",
};

export function getCampaignRecommendation(campaign: Campaign) {
  return recommendationOverrides[campaign.campaignCode] ?? campaign.target;
}
