import {
  getCampaignApplicationUrl,
  getRankingPoints,
  rankCampaigns,
  type ApplicationType,
  type Campaign,
  type CampaignEditorial,
} from "@/data/campaigns";
import {
  CampaignOfficialImage,
  requireOfficialImage,
} from "./CampaignOfficialImage";

type CampaignDetailsProps = {
  applicationType: ApplicationType;
  campaigns: readonly Campaign[];
};

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}

function formatJapaneseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

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
  campaigns,
}: CampaignDetailsProps) {
  const rankedCampaigns = rankCampaigns(campaigns, applicationType);

  return (
    <div className="detail-list">
      {rankedCampaigns.map((campaign, index) => {
        const editorial = requireEditorial(campaign);
        const officialImage = requireOfficialImage(campaign);
        const points = getRankingPoints(campaign, applicationType);
        const articleTitleId = `campaign-title-${campaign.campaignCode}`;
        const editorialTitleId = `campaign-editorial-${campaign.campaignCode}`;

        return (
          <article
            className="campaign-detail-article"
            key={campaign.campaignCode}
            aria-labelledby={articleTitleId}
          >
            <header className="campaign-detail-header">
              <p className="campaign-rank-badge">{index + 1}位</p>
              <div className="campaign-recommendation">
                <p className="campaign-recommendation-label">
                  どんな人におすすめか
                </p>
                <p>{campaign.target}</p>
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
                  rel="sponsored noopener noreferrer"
                  target="_blank"
                  aria-label={`${campaign.title}の画像出典：楽天モバイル公式ページ`}
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

              <a
                className="official-link campaign-official-link"
                href={getCampaignApplicationUrl(campaign)}
                rel="sponsored noopener noreferrer"
                target="_blank"
              >
                公式ページの情報を見る
              </a>
            </section>
          </article>
        );
      })}
    </div>
  );
}
