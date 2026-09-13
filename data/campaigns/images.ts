import imageManifest from "./images.json";
import presentationPolicy from "./presentation-policy.json";
import type { Campaign } from ".";

export type CampaignImageVariant = {
  path: string;
  sourceUrl: string;
  width: number;
  height: number;
};

export type CampaignDisplayImage = {
  ranking: CampaignImageVariant;
  editorial: {
    desktop: CampaignImageVariant & {
      presentation: "natural" | "contain-16x9";
    };
    mobile: CampaignImageVariant;
  };
  checkedAt: string;
};

if (imageManifest.presentationPolicyVersion !== presentationPolicy.id) {
  throw new Error(
    `画像マニフェストの表示ポリシー ${imageManifest.presentationPolicyVersion} は ${presentationPolicy.id} と一致しません。`,
  );
}

export const campaignPresentationPolicy = presentationPolicy;

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
