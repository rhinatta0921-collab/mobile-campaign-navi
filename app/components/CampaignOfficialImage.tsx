import type { Campaign, CampaignOfficialImage as OfficialImageData } from "@/data/campaigns";

type CampaignOfficialImageProps = {
  campaign: Campaign;
  className: string;
  variant?: "responsive" | "detail";
};

export function requireOfficialImage(
  campaign: Campaign,
): OfficialImageData {
  if (!campaign.officialImage) {
    throw new Error(
      `ランキング対象キャンペーン ${campaign.campaignCode} に公式画像データがありません。`,
    );
  }

  return campaign.officialImage;
}

export function CampaignOfficialImage({
  campaign,
  className,
  variant = "responsive",
}: CampaignOfficialImageProps) {
  const image = requireOfficialImage(campaign);
  const primaryImage = variant === "detail" ? image.detail : image.desktop;

  return (
    <picture
      className={`official-campaign-picture ${className}`}
      data-campaign-code={campaign.campaignCode}
    >
      {variant === "responsive" && image.mobile ? (
        <source
          media="(max-width: 860px)"
          srcSet={image.mobile.path}
          width={image.mobile.width}
          height={image.mobile.height}
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
