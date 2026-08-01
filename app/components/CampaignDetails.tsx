import {
  getCampaignPoints,
  rankCampaigns,
  type ApplicationType,
  type Campaign,
} from "@/data/campaigns";

type CampaignDetailsProps = {
  applicationType: ApplicationType;
  campaigns: readonly Campaign[];
};

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}

function formatCheckedAt(checkedAt: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
  }).format(new Date(`${checkedAt}T00:00:00+09:00`));
}

export function CampaignDetails({
  applicationType,
  campaigns,
}: CampaignDetailsProps) {
  const rankedCampaigns = rankCampaigns(campaigns, applicationType);

  return (
    <div className="detail-list">
      {rankedCampaigns.map((campaign, index) => {
        const points = getCampaignPoints(campaign, applicationType);
        const breakdown = campaign.breakdown[applicationType] ?? [];
        const codeLabel =
          campaign.codeType === "initiative"
            ? "施策コード"
            : campaign.codeType === "generated"
              ? "管理コード"
              : "キャンペーンコード";

        return (
          <section className="offer-detail" key={campaign.campaignCode}>
            <div className="offer-heading">
              <div>
                <span className="detail-rank">
                  {index + 1}位 · {codeLabel} {campaign.campaignCode}
                </span>
                <h3>{campaign.title}</h3>
                <p>{campaign.target}</p>
              </div>
              <div className="points-box">
                <span>最大</span>
                <strong>{formatPoints(points ?? 0)}</strong>
                <span>ポイント</span>
              </div>
            </div>

            <div className="condition-list" aria-label="主な条件">
              <span>
                対象製品購入{" "}
                {campaign.requiresDevicePurchase ? "必須" : "不要"}
              </span>
              {campaign.conditions.map((condition) => (
                <span key={condition}>{condition}</span>
              ))}
            </div>

            <dl className="detail-grid">
              <div>
                <dt>ポイント内訳</dt>
                <dd>
                  <ul>
                    {breakdown.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>申込方法</dt>
                <dd>{campaign.channel}</dd>
              </div>
              <div>
                <dt>期間</dt>
                <dd>{campaign.period}</dd>
              </div>
              <div>
                <dt>確認日</dt>
                <dd>{formatCheckedAt(campaign.checkedAt)}</dd>
              </div>
            </dl>

            <div className="notes-row">
              <ul>
                {campaign.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <a
                className="official-link"
                href={campaign.officialUrl}
                rel="sponsored noopener noreferrer"
                target="_blank"
              >
                公式ページで確認
              </a>
            </div>
          </section>
        );
      })}
    </div>
  );
}
