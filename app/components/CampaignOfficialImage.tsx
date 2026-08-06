import type { Campaign, CampaignOfficialImage as OfficialImageData } from "@/data/campaigns";

type CampaignOfficialImageProps = {
  campaign: Campaign;
  className: string;
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
}: CampaignOfficialImageProps) {
  const image = requireOfficialImage(campaign);

  return (
    <picture
      className={`official-campaign-picture ${className}`}
      data-campaign-code={campaign.campaignCode}
    >
      {image.mobile ? (
        <source
          media="(max-width: 860px)"
          srcSet={image.mobile.path}
          width={image.mobile.width}
          height={image.mobile.height}
        />
      ) : null}
      <img
        src={image.desktop.path}
        width={image.desktop.width}
        height={image.desktop.height}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
