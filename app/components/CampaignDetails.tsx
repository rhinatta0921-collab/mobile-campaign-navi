import {
  calculateCampaignValue,
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

type MetricSummary = {
  value: string;
  details: string[];
};

type ScoreMetricProps = {
  label: string;
  summary: MetricSummary;
  tone?: "accent" | "positive" | "neutral";
};

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}

function formatYen(amount: number) {
  return `${amount.toLocaleString("ja-JP")}円`;
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

function getOtherBenefitSummary(campaign: Campaign): MetricSummary {
  const fixedBenefitTotal = campaign.valuation.otherBenefits.reduce(
    (total, benefit) =>
      total +
      (benefit.includedInDevicePrice ? 0 : benefit.amountYen ?? 0),
    0,
  );
  const includedDiscountTotal = campaign.valuation.otherBenefits.reduce(
    (total, benefit) =>
      total +
      (benefit.includedInDevicePrice ? benefit.amountYen ?? 0 : 0),
    0,
  );
  const monthlyBenefitTotal = campaign.valuation.ongoingBenefits.reduce(
    (total, benefit) => total + (benefit.monthlyAmountYen ?? 0),
    0,
  );
  const details = [
    ...campaign.valuation.otherBenefits.map((benefit) => {
      const amount =
        benefit.amountYen !== null
          ? benefit.includedInDevicePrice
            ? `${formatYen(benefit.amountYen)}値引き`
            : `${formatYen(benefit.amountYen)}相当`
          : benefit.includedInDevicePrice
            ? "端末価格に反映"
            : "金額算出不可";

      return `${benefit.label}：${amount}。${benefit.description}`;
    }),
    ...campaign.valuation.ongoingBenefits.map((benefit) =>
      benefit.monthlyAmountYen !== null
        ? `${benefit.label}：毎月＋${formatYen(benefit.monthlyAmountYen)}相当。${benefit.description}`
        : `${benefit.label}：月額は算出不可。${benefit.description}`,
    ),
    ...campaign.valuation.unquantifiedBenefits.map(
      (benefit) => `金額換算対象外：${benefit}`,
    ),
  ];

  if (fixedBenefitTotal > 0) {
    return {
      value: `${formatYen(fixedBenefitTotal)}相当`,
      details,
    };
  }

  if (includedDiscountTotal > 0) {
    return {
      value: `${formatYen(includedDiscountTotal)}値引き`,
      details,
    };
  }

  if (monthlyBenefitTotal > 0) {
    return {
      value: `毎月＋${formatYen(monthlyBenefitTotal)}相当`,
      details,
    };
  }

  if (details.length > 0) {
    return {
      value: campaign.valuation.otherBenefits.some(
        (benefit) => benefit.includedInDevicePrice,
      )
        ? "端末価格に反映"
        : "金額換算対象外",
      details,
    };
  }

  return {
    value: "なし",
    details: ["同一キャンペーン内にポイント以外の特典はありません。"],
  };
}

function getRequiredCostSummary(campaign: Campaign): MetricSummary {
  const costs = campaign.valuation.requiredCosts;

  if (costs.length === 0) {
    return {
      value: "0円",
      details: ["通常の楽天モバイル回線料金は計算に含めていません。"],
    };
  }

  const fixedCostTotal = costs.reduce(
    (total, cost) => total + (cost.amountYen ?? 0),
    0,
  );
  const monthlyCostTotal = costs.reduce(
    (total, cost) => total + (cost.monthlyAmountYen ?? 0),
    0,
  );
  const hasUnknownCost = costs.some((cost) => cost.amountYen === null);
  const details = costs.map((cost) => {
    const amount =
      cost.amountYen !== null
        ? formatYen(cost.amountYen)
        : cost.monthlyAmountYen !== null
          ? `${formatYen(cost.monthlyAmountYen)}/月（必要月数未確定）`
          : "総額算出不可";

    return `${cost.label}：${amount}。${cost.description}`;
  });

  return {
    value: hasUnknownCost
      ? monthlyCostTotal > 0
        ? `${formatYen(monthlyCostTotal)}/月〜`
        : "算出不可"
      : formatYen(fixedCostTotal),
    details,
  };
}

function ScoreMetric({
  label,
  summary,
  tone = "neutral",
}: ScoreMetricProps) {
  return (
    <div className={`score-metric score-metric-${tone}`}>
      <dt>{label}</dt>
      <dd>
        <strong>{summary.value}</strong>
        <ul>
          {summary.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </dd>
    </div>
  );
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
        const pointBreakdown = campaign.breakdown[applicationType] ?? [];
        const valueResult = calculateCampaignValue(campaign, applicationType);
        const valueLabel =
          valueResult.kind === "burden" ? "実質負担額" : "実質お得額";
        const valueSummary: MetricSummary = {
          value:
            valueResult.status === "calculated" &&
            valueResult.amountYen !== null
              ? formatYen(valueResult.amountYen)
              : "算出不可",
          details: [
            valueResult.formula ??
              `算出不可の理由：${valueResult.reason ?? "公式情報だけでは金額を確定できません"}`,
          ],
        };
        const articleTitleId = `campaign-title-${campaign.campaignCode}`;
        const scoreTitleId = `campaign-score-${campaign.campaignCode}`;
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

            <section
              className="campaign-score"
              aria-labelledby={scoreTitleId}
            >
              <div className="campaign-score-heading">
                <p>4つの指標で比較</p>
                <h4 id={scoreTitleId}>スコア</h4>
              </div>
              <dl className="campaign-score-grid">
                <ScoreMetric
                  label="獲得可能ポイント"
                  tone="accent"
                  summary={{
                    value: `${formatPoints(points)}ポイント`,
                    details:
                      pointBreakdown.length > 0
                        ? pointBreakdown
                        : [
                            "申込者向け固定ポイントなし（0ポイントとして順位付け）。",
                          ],
                  }}
                />
                <ScoreMetric
                  label="その他特典"
                  summary={getOtherBenefitSummary(campaign)}
                />
                <ScoreMetric
                  label="キャンペーン適用にかかるコスト"
                  summary={getRequiredCostSummary(campaign)}
                />
                <ScoreMetric
                  label={valueLabel}
                  tone={
                    valueResult.status === "calculated"
                      ? "positive"
                      : "neutral"
                  }
                  summary={valueSummary}
                />
              </dl>
              <p className="campaign-score-note">
                順位は獲得可能ポイントだけで決まり、その他特典・コスト・実質価値は順位に影響しません。
              </p>
            </section>

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
