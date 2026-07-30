import {
  getCampaignPoints,
  rankCampaigns,
  type ApplicationType,
  type Campaign,
} from "@/data/campaigns";

type CampaignRankingProps = {
  applicationType: ApplicationType;
  basePath: string;
  campaigns: readonly Campaign[];
  panelId: string;
};

const comparisonColumns = [
  "順位",
  "キャンペーン",
  "最大ポイント",
  "おすすめ対象",
  "主な追加条件",
  "申込方法",
  "公式",
];

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}

export function CampaignRanking({
  applicationType,
  basePath,
  campaigns,
  panelId,
}: CampaignRankingProps) {
  const rankedCampaigns = rankCampaigns(campaigns, applicationType);
  const isMnp = applicationType === "mnp";
  const rankingLabel = isMnp
    ? "他社から乗り換える場合"
    : "新しい電話番号で申し込む場合";

  return (
    <>
      <div className="ranking-tabs" role="tablist" aria-label="申込方法">
        <a
          id={`${panelId}-mnp-tab`}
          className="ranking-tab"
          href={`${basePath}?application=mnp#ranking`}
          role="tab"
          aria-controls={panelId}
          aria-selected={isMnp}
        >
          他社から乗り換え
        </a>
        <a
          id={`${panelId}-new-number-tab`}
          className="ranking-tab"
          href={`${basePath}?application=new-number#ranking`}
          role="tab"
          aria-controls={panelId}
          aria-selected={!isMnp}
        >
          新しい電話番号
        </a>
      </div>

      <p className="ranking-mode-note">
        {rankingLabel}の獲得ポイントで並べています。タブで切り替わるのはランキング表のみです。
      </p>

      <div
        id={panelId}
        className="table-scroll"
        role="tabpanel"
        aria-labelledby={
          isMnp
            ? `${panelId}-mnp-tab`
            : `${panelId}-new-number-tab`
        }
        tabIndex={0}
      >
        <table className="comparison-table">
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
            {rankedCampaigns.map((campaign, index) => {
              const points = getCampaignPoints(campaign, applicationType);

              return (
                <tr key={campaign.campaignCode}>
                  <td className="rank-cell">{index + 1}位</td>
                  <td>
                    <strong>{campaign.title}</strong>
                    <span>{campaign.period}</span>
                  </td>
                  <td className="points-cell">
                    {formatPoints(points ?? 0)}
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
    </>
  );
}
