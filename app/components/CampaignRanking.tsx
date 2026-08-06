import Link from "next/link";
import {
  getRankingPoints,
  rankCampaigns,
  type ApplicationType,
  type Campaign,
} from "@/data/campaigns";
import { CampaignOfficialImage } from "./CampaignOfficialImage";

type CampaignRankingProps = {
  applicationType: ApplicationType;
  basePath: string;
  campaigns: readonly Campaign[];
  panelId: string;
};

const comparisonColumns = [
  "順位",
  "キャンペーン",
  "申込者ポイント",
  "おすすめ対象",
  "主な追加条件",
  "申込方法",
  "公式",
];

const initialVisibleCampaignCount = 10;

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}

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
    <>
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

              return (
                <tr key={campaign.campaignCode}>
                  <td className="rank-cell">{rank}位</td>
                  <td className="campaign-column">
                    <CampaignOfficialImage
                      campaign={campaign}
                      className="ranking-campaign-picture"
                    />
                    <strong>{campaign.title}</strong>
                    <span>{campaign.period}</span>
                  </td>
                  <td className="points-cell">
                    {formatPoints(points)}
                    <span>ポイント</span>
                  </td>
                  <td>{campaign.target}</td>
                  <td>{campaign.conditions.slice(0, 3).join(" / ")}</td>
                  <td>{campaign.channel}</td>
                  <td>
                    <a
                      className="table-link"
                      href={campaign.officialUrl}
                      rel="sponsored noopener noreferrer"
                      target="_blank"
                    >
                      公式
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-ranking-list" aria-label={label}>
        {campaigns.map((campaign, index) => {
          const rank = startIndex + index + 1;
          const points = getRankingPoints(campaign, applicationType);

          return (
            <article
              className="mobile-ranking-card"
              key={`mobile-${campaign.campaignCode}`}
            >
              <div className="mobile-ranking-summary">
                <CampaignOfficialImage
                  campaign={campaign}
                  className="mobile-ranking-picture"
                />
                <div className="mobile-ranking-summary-copy">
                  <div className="mobile-ranking-head">
                    <span className="mobile-rank-badge">{rank}位</span>
                    <p className="mobile-points">
                      <strong>{formatPoints(points)}</strong>
                      ポイント
                    </p>
                  </div>
                  <h3>{campaign.title}</h3>
                </div>
              </div>
              <p className="mobile-ranking-target">{campaign.target}</p>
              <div className="mobile-condition-list">
                {campaign.conditions.slice(0, 3).map((condition) => (
                  <span key={condition}>{condition}</span>
                ))}
              </div>
              <dl className="mobile-ranking-meta">
                <div>
                  <dt>申込方法</dt>
                  <dd>{campaign.channel}</dd>
                </div>
                <div>
                  <dt>期間</dt>
                  <dd>{campaign.period}</dd>
                </div>
              </dl>
              <a
                className="mobile-official-link"
                href={campaign.officialUrl}
                rel="sponsored noopener noreferrer"
                target="_blank"
              >
                公式ページで確認
              </a>
            </article>
          );
        })}
      </div>
    </>
  );
}

export function CampaignRanking({
  applicationType,
  basePath,
  campaigns,
  panelId,
}: CampaignRankingProps) {
  const rankedCampaigns = rankCampaigns(campaigns, applicationType);
  const initiallyVisibleCampaigns = rankedCampaigns.slice(
    0,
    initialVisibleCampaignCount,
  );
  const collapsedCampaigns = rankedCampaigns.slice(
    initialVisibleCampaignCount,
  );
  const isMnp = applicationType === "mnp";
  const rankingLabel = isMnp
    ? "他社から乗り換える場合"
    : "新しい電話番号で申し込む場合";

  return (
    <>
      <div className="ranking-tabs" role="tablist" aria-label="申込方法">
        <Link
          id={`${panelId}-mnp-tab`}
          className="ranking-tab"
          href={`${basePath}?application=mnp`}
          scroll={false}
          role="tab"
          aria-controls={panelId}
          aria-selected={isMnp}
        >
          他社から乗り換え
        </Link>
        <Link
          id={`${panelId}-new-number-tab`}
          className="ranking-tab"
          href={`${basePath}?application=new-number`}
          scroll={false}
          role="tab"
          aria-controls={panelId}
          aria-selected={!isMnp}
        >
          新しい電話番号
        </Link>
      </div>

      <p className="ranking-mode-note">
        {rankingLabel}に申込者本人が受け取れる固定ポイントで並べています。ポイントがない特典は0ポイントとして末尾に掲載し、割引や追加費用は順位に含めません。
      </p>

      <div
        id={panelId}
        className="ranking-panel"
        role="tabpanel"
        aria-labelledby={
          isMnp
            ? `${panelId}-mnp-tab`
            : `${panelId}-new-number-tab`
        }
      >
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
                startIndex={initialVisibleCampaignCount}
                tableClassName="comparison-table-overflow"
              />
            </div>
          </details>
        ) : null}
      </div>
    </>
  );
}
