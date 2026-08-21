import {
  getCampaignApplicationUrl,
  getRankingPoints,
  type ApplicationType,
  type Campaign,
  type CampaignEditorial,
} from "@/data/campaigns";
import { INITIAL_VISIBLE_CAMPAIGN_COUNT } from "@/app/site-config";
import { officialLinkAnalyticsAttributes } from "@/app/lib/analytics";
import { formatJapaneseDate, formatPoints } from "@/app/lib/format";
import {
  CampaignOfficialImage,
  requireOfficialImage,
} from "./CampaignOfficialImage";
import { getCampaignRecommendation } from "./campaignRecommendation";
import {
  getRankTone,
  isEmployeeReferralCampaign,
  splitRankedCampaigns,
} from "./rankingDisplay";

type CampaignDetailsProps = {
  applicationType: ApplicationType;
  rankedCampaigns: readonly Campaign[];
};

function requireEditorial(campaign: Campaign): CampaignEditorial {
  if (!campaign.editorial) {
    throw new Error(
      `ランキング対象キャンペーン ${campaign.campaignCode} に編集記事データがありません。`,
    );
  }

  return campaign.editorial;
}

export function CampaignDetails({
  applicationType,
  rankedCampaigns,
}: CampaignDetailsProps) {
  const { initiallyVisibleCampaigns, collapsedCampaigns } =
    splitRankedCampaigns(rankedCampaigns);

  function renderCampaignDetails(
    visibleCampaigns: readonly Campaign[],
    startIndex: number,
  ) {
    return visibleCampaigns.map((campaign, index) => {
      const rank = startIndex + index + 1;
      const rankTone = getRankTone(rank);
      const editorial = requireEditorial(campaign);
      const officialImage = requireOfficialImage(campaign);
      const points = getRankingPoints(campaign, applicationType);
      const recommendation = getCampaignRecommendation(campaign);
      const isEmployeeReferral = isEmployeeReferralCampaign(campaign);
      const articleTitleId = `campaign-title-${applicationType}-${campaign.campaignCode}`;
      const editorialTitleId = `campaign-editorial-${applicationType}-${campaign.campaignCode}`;

      return (
        <article
          className="campaign-detail-article"
          key={campaign.campaignCode}
          aria-labelledby={articleTitleId}
        >
          <header className="campaign-detail-header">
            <p
              className={`campaign-rank-badge campaign-rank-badge--${rankTone}`}
            >
              {rank}位
            </p>
            <div className="campaign-recommendation">
              <p className="campaign-recommendation-label">
                どんな人におすすめか
              </p>
              <p>{recommendation}</p>
            </div>
            <h3 id={articleTitleId}>{campaign.title}</h3>
          </header>

          <figure className="campaign-official-figure">
            <CampaignOfficialImage
              campaign={campaign}
              className="campaign-detail-picture"
              variant="detail"
            />
            <div className="campaign-point-summary">
              <p className="campaign-point-label">獲得可能ポイント</p>
              <p className="campaign-point-value">
                <strong>{formatPoints(points)}</strong>
                <span>ポイント</span>
              </p>
            </div>
            <figcaption>
              画像：
              <a
                href={campaign.officialUrl}
                rel="noopener noreferrer"
                target="_blank"
                aria-label={`${campaign.title}の画像出典：楽天モバイル公式ページ`}
                {...officialLinkAnalyticsAttributes({
                  applicationType,
                  campaignCode: campaign.campaignCode,
                  linkType: "image_source",
                  placement: "details_image",
                })}
              >
                楽天モバイル公式ページ
              </a>
              （{formatJapaneseDate(officialImage.checkedAt)}確認）
            </figcaption>
          </figure>

          <table className="campaign-facts-table">
            <caption>キャンペーン情報</caption>
            <tbody>
              <tr>
                <th scope="row">キャンペーン開催期間</th>
                <td>{campaign.period}</td>
              </tr>
              <tr>
                <th scope="row">キャンペーン適用条件</th>
                <td>
                  <ul>
                    {campaign.conditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>

          <section
            className="campaign-editorial"
            aria-labelledby={editorialTitleId}
          >
            <h4 id={editorialTitleId}>{editorial.headline}</h4>
            <div className="campaign-editorial-copy">
              {editorial.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="campaign-pros-cons">
              <section className="campaign-point-list campaign-point-good">
                <h5>
                  <span aria-hidden="true">✓</span>
                  おすすめなポイント
                </h5>
                <ul>
                  {editorial.goodPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
              <section className="campaign-point-list campaign-point-concern">
                <h5>
                  <span aria-hidden="true">!</span>
                  気になるポイント
                </h5>
                <ul>
                  {editorial.concerns.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              </section>
            </div>

            {isEmployeeReferral ? (
              <div className="campaign-action-group">
                <div className="campaign-action-buttons">
                  <a
                    className="official-link campaign-official-link"
                    href={campaign.officialUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    {...officialLinkAnalyticsAttributes({
                      applicationType,
                      campaignCode: campaign.campaignCode,
                      linkType: "official_information",
                      placement: "details_primary",
                    })}
                  >
                    公式ページの情報を見る
                  </a>
                  <a
                    className="official-link campaign-entry-link"
                    href={getCampaignApplicationUrl(campaign)}
                    rel="sponsored noopener noreferrer"
                    target="_blank"
                    {...officialLinkAnalyticsAttributes({
                      applicationType,
                      campaignCode: campaign.campaignCode,
                      linkType: "referral_application",
                      placement: "details_referral_application",
                      trackEmployeeReferral: true,
                    })}
                  >
                    キャンペーンにエントリーする
                  </a>
                </div>
                <p className="campaign-action-note">
                  楽天アカウントでのログインが必要です
                </p>
              </div>
            ) : (
              <a
                className="official-link campaign-official-link"
                href={getCampaignApplicationUrl(campaign)}
                rel="noopener noreferrer"
                target="_blank"
                {...officialLinkAnalyticsAttributes({
                  applicationType,
                  campaignCode: campaign.campaignCode,
                  linkType: "official_information",
                  placement: "details_primary",
                })}
              >
                公式ページの情報を見る
              </a>
            )}
          </section>
        </article>
      );
    });
  }

  return (
    <div className="detail-list">
      {renderCampaignDetails(initiallyVisibleCampaigns, 0)}

      {collapsedCampaigns.length > 0 ? (
        <details className="ranking-overflow detail-overflow">
          <summary className="ranking-overflow-toggle">
            <span className="ranking-overflow-closed-label">
              11位以降を表示（残り{collapsedCampaigns.length}件）
            </span>
            <span className="ranking-overflow-open-label">
              11位以降を閉じる
            </span>
          </summary>
          <div className="ranking-overflow-content detail-overflow-content">
            {renderCampaignDetails(
              collapsedCampaigns,
              INITIAL_VISIBLE_CAMPAIGN_COUNT,
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}
