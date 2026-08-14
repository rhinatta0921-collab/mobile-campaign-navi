import type { Campaign } from "@/data/campaigns";

const recommendationOverrides: Record<string, string> = {
  "2162": "一番多くの楽天ポイント特典を獲得したい人",
};

export function getCampaignRecommendation(campaign: Campaign) {
  return recommendationOverrides[campaign.campaignCode] ?? campaign.target;
}
