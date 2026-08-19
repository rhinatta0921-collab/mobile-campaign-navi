import imageManifest from "./images.json";
import type { Campaign } from ".";

export type CampaignImageVariant = {
  path: string;
  sourceUrl: string;
  width: number;
  height: number;
};

export type CampaignDisplayImage = {
  detail: CampaignImageVariant;
  responsive?: {
    desktop: CampaignImageVariant;
    mobile: CampaignImageVariant | null;
  };
  checkedAt: string;
};

const images = imageManifest.campaigns as Record<
  string,
  CampaignDisplayImage | undefined
>;

export function requireCampaignImage(campaign: Campaign) {
  const image = images[campaign.campaignCode];
  if (!image) {
    throw new Error(
      `ランキング対象キャンペーン ${campaign.campaignCode} に公式画像データがありません。`,
    );
  }
  return image;
}
