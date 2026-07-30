import {
  getCampaignPoints,
  rankCampaigns,
  type Campaign,
} from "@/data/campaigns";

type CampaignDetailsProps = {
  campaigns: readonly Campaign[];
};

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}

export function CampaignDetails({ campaigns }: CampaignDetailsProps) {
  const rankedCampaigns = rankCampaigns(campaigns, "mnp");

  return (
    <div className="detail-list">
      {rankedCampaigns.map((campaign, index) => {
        const points = getCampaignPoints(campaign, "mnp");

        return (
          <section className="offer-detail" key={campaign.campaignCode}>
            <div className="offer-heading">
              <div>
                <span className="detail-rank">{index + 1}位</span>
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
                スマホ本体購入{" "}
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
                    {campaign.breakdown.map((item) => (
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
                <dd>{campaign.checkedAt}</dd>
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
