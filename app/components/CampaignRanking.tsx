import {
  getCampaignApplicationUrl,
  getRankingPoints,
  type ApplicationType,
  type Campaign,
} from "@/data/campaigns";
import { INITIAL_VISIBLE_CAMPAIGN_COUNT } from "@/app/site-config";
import { formatPoints } from "@/app/lib/format";
import { CampaignOfficialImage } from "./CampaignOfficialImage";
import { getCampaignRecommendation } from "./campaignRecommendation";
import {
  getRankTone,
  isEmployeeReferralCampaign,
  splitRankedCampaigns,
} from "./rankingDisplay";

type CampaignRankingProps = {
  applicationType: ApplicationType;
  rankedCampaigns: readonly Campaign[];
};

const comparisonColumns = [
  "キャンペーン",
  "画像",
  "獲得ポイント",
  "おすすめ対象",
  "主な追加条件",
  "開催期間",
  "公式",
];

const rankingConditionOverrides: Record<string, string[]> = {
  "2162": ["楽天従業員の専用リンクから申し込み"],
};

type RankingRangeProps = {
  applicationType: ApplicationType;
  campaigns: readonly Campaign[];
  label: string;
  startIndex: number;
  tableClassName: string;
};

function RankingRange({
  applicationType,
  campaigns,
  label,
  startIndex,
  tableClassName,
}: RankingRangeProps) {
  return (
    <div className="table-scroll" tabIndex={0} aria-label={label}>
      <table className={`comparison-table ${tableClassName}`}>
        <thead>
          <tr>
            {comparisonColumns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign, index) => {
            const rank = startIndex + index + 1;
            const points = getRankingPoints(campaign, applicationType);
            const rankTone = getRankTone(rank);
            const recommendation = getCampaignRecommendation(campaign);
            const conditions =
              rankingConditionOverrides[campaign.campaignCode] ??
              campaign.conditions.slice(0, 3);

            return (
              <tr key={campaign.campaignCode}>
                <td className="campaign-column">
                  <span
                    className={`table-rank-badge table-rank-badge--${rankTone}`}
                  >
                    {rank}位
                  </span>
                  <strong>{campaign.title}</strong>
                </td>
                <td className="image-column">
                  <CampaignOfficialImage
                    campaign={campaign}
                    className="ranking-campaign-picture"
                    variant="detail"
                  />
                </td>
                <td className="points-cell">
                  {formatPoints(points)}
                  <span>ポイント</span>
                </td>
                <td className="ranking-recommendation-cell">
                  {recommendation}
                </td>
                <td>
                  <ul className="ranking-bullet-list">
                    {conditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </td>
                <td className="period-cell">{campaign.period}</td>
                <td>
                  <div className="ranking-official-action">
                    <a
                      className="table-link"
                      href={getCampaignApplicationUrl(campaign)}
                      rel={
                        isEmployeeReferralCampaign(campaign)
                          ? "sponsored noopener noreferrer"
                          : "noopener noreferrer"
                      }
                      target="_blank"
                    >
                      公式ページ
                    </a>
                    {isEmployeeReferralCampaign(campaign) ? (
                      <span className="ranking-login-note">※要ログイン</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CampaignRanking({
  applicationType,
  rankedCampaigns,
}: CampaignRankingProps) {
  const { initiallyVisibleCampaigns, collapsedCampaigns } =
    splitRankedCampaigns(rankedCampaigns);
  const isMnp = applicationType === "mnp";
  const rankingLabel = isMnp
    ? "電話番号そのまま他社から乗り換える場合"
    : "新しい電話番号で契約する場合";

  return (
    <div className="ranking-panel">
      <RankingRange
        applicationType={applicationType}
        campaigns={initiallyVisibleCampaigns}
        label={`${rankingLabel}の1位から${initiallyVisibleCampaigns.length}位`}
        startIndex={0}
        tableClassName="comparison-table-primary"
      />

      {collapsedCampaigns.length > 0 ? (
        <details className="ranking-overflow">
          <summary className="ranking-overflow-toggle">
            <span className="ranking-overflow-closed-label">
              11位以降を表示（残り{collapsedCampaigns.length}件）
            </span>
            <span className="ranking-overflow-open-label">
              11位以降を閉じる
            </span>
          </summary>
          <div className="ranking-overflow-content">
            <RankingRange
              applicationType={applicationType}
              campaigns={collapsedCampaigns}
              label={`${rankingLabel}の11位から${rankedCampaigns.length}位`}
              startIndex={INITIAL_VISIBLE_CAMPAIGN_COUNT}
              tableClassName="comparison-table-overflow"
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
