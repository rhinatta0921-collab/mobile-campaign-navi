import type { Campaign } from "@/data/campaigns";

export function getCampaignRecommendation(campaign: Campaign) {
  if (
    campaign.eligibility.repeatApplication &&
    !campaign.eligibility.firstApplication
  ) {
    return "追加回線・再契約で条件を満たす方";
  }
  if (
    campaign.eligibility.firstApplication &&
    !campaign.eligibility.repeatApplication
  ) {
    return `初回申込で${campaign.target.replace(/方$/, "")}方`;
  }
  return campaign.target;
}
