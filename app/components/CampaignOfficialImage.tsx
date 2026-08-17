import type { Campaign } from "@/data/campaigns";
import { requireCampaignImage } from "@/data/campaigns/images";

type CampaignOfficialImageProps = {
  campaign: Campaign;
  className: string;
  variant?: "responsive" | "detail";
};

export const requireOfficialImage = requireCampaignImage;

export function CampaignOfficialImage({
  campaign,
  className,
  variant = "responsive",
}: CampaignOfficialImageProps) {
  const image = requireOfficialImage(campaign);
  const responsiveImage = image.responsive;
  if (variant === "responsive" && !responsiveImage) {
    throw new Error(
      `キャンペーン ${campaign.campaignCode} にレスポンシブ画像がありません。`,
    );
  }
  const primaryImage =
    variant === "detail" ? image.detail : responsiveImage!.desktop;

  return (
    <picture
      className={`official-campaign-picture ${className}`}
      data-campaign-code={campaign.campaignCode}
    >
      {variant === "responsive" && responsiveImage?.mobile ? (
        <source
          media="(max-width: 860px)"
          srcSet={responsiveImage.mobile.path}
          width={responsiveImage.mobile.width}
          height={responsiveImage.mobile.height}
        />
      ) : null}
      <img
        src={primaryImage.path}
        width={primaryImage.width}
        height={primaryImage.height}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
