import type { Campaign } from "@/data/campaigns";
import {
  campaignPresentationPolicy,
  requireCampaignImage,
} from "@/data/campaigns/images";

type CampaignOfficialImageProps = {
  campaign: Campaign;
  className: string;
  purpose: "ranking" | "editorial";
};

export const requireOfficialImage = requireCampaignImage;

export function CampaignOfficialImage({
  campaign,
  className,
  purpose,
}: CampaignOfficialImageProps) {
  const image = requireOfficialImage(campaign);
  const primaryImage =
    purpose === "ranking" ? image.ranking : image.editorial.desktop;

  return (
    <picture
      className={`official-campaign-picture ${className}`}
      data-campaign-code={campaign.campaignCode}
      data-image-purpose={purpose}
      data-presentation-policy={campaignPresentationPolicy.id}
      {...(purpose === "editorial"
        ? {
            "data-desktop-presentation":
              image.editorial.desktop.presentation,
          }
        : {})}
    >
      {purpose === "editorial" ? (
        <source
          media={`(max-width: ${campaignPresentationPolicy.mobileBreakpointPx}px)`}
          srcSet={image.editorial.mobile.path}
          width={image.editorial.mobile.width}
          height={image.editorial.mobile.height}
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
