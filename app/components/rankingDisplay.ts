import {
  CAMPAIGN_CODES,
  INITIAL_VISIBLE_CAMPAIGN_COUNT,
} from "@/app/site-config";
import type { Campaign } from "@/data/campaigns";

export function getRankTone(rank: number) {
  return rank <= 3 ? rank : "standard";
}

export function isEmployeeReferralCampaign(campaign: Campaign) {
  return campaign.campaignCode === CAMPAIGN_CODES.employeeReferral;
}

export function splitRankedCampaigns(campaigns: readonly Campaign[]) {
  return {
    initiallyVisibleCampaigns: campaigns.slice(
      0,
      INITIAL_VISIBLE_CAMPAIGN_COUNT,
    ),
    collapsedCampaigns: campaigns.slice(INITIAL_VISIBLE_CAMPAIGN_COUNT),
  };
}
