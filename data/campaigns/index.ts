import campaign9001 from "./9001-shop-limited-mnp-market.json";
import campaign9002 from "./9002-referral.json";
import campaign9003 from "./9003-card-member.json";
import campaign9004 from "./9004-bank-member.json";
import campaign9005 from "./9005-card-jcb-mobile.json";
import campaign9006 from "./9006-first-application.json";
import campaign9007 from "./9007-unext.json";
import campaign9008 from "./9008-extra-sim.json";
import campaign9009 from "./9009-returning-user.json";
import campaign9101 from "./9101-iphone-purchase.json";
import campaign9102 from "./9102-android-purchase.json";
import campaign9103 from "./9103-upgrade-program.json";

export type ApplicationType = "mnp" | "newNumber";

export type Campaign = {
  campaignCode: string;
  title: string;
  summary: string;
  points: {
    newNumber: number | null;
    mnp: number | null;
  };
  breakdown: string[];
  target: string;
  conditions: string[];
  channel: string;
  period: string;
  officialUrl: string;
  checkedAt: string;
  notes: string[];
  requiresDevicePurchase: boolean;
};

export const campaigns: Campaign[] = [
  campaign9001,
  campaign9002,
  campaign9003,
  campaign9004,
  campaign9005,
  campaign9006,
  campaign9007,
  campaign9008,
  campaign9009,
  campaign9101,
  campaign9102,
  campaign9103,
];

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
      } => typeof item.points === "number",
    )
    .sort(
      (a, b) =>
        b.points - a.points || a.originalIndex - b.originalIndex,
    )
    .map(({ campaign }) => campaign);
}
