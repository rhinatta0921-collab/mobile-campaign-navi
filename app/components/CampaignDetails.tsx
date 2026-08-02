import {
  calculateCampaignValue,
  getRankingPoints,
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
    timeZone: "Asia/Tokyo",
  }).format(new Date(`${checkedAt}T00:00:00+09:00`));
}

function formatYen(amount: number) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export function CampaignDetails({
  applicationType,
  campaigns,
}: CampaignDetailsProps) {
  const rankedCampaigns = rankCampaigns(campaigns, applicationType);

  return (
    <div className="detail-list">
      {rankedCampaigns.map((campaign, index) => {
        const points = getRankingPoints(campaign, applicationType);
        const breakdown = campaign.breakdown[applicationType] ?? [];
        const valueResult = calculateCampaignValue(campaign, applicationType);
        const valueLabel =
          valueResult.kind === "burden" ? "実質負担額" : "実質お得額";
        const codeLabel =
          campaign.codeType === "initiative"
            ? "施策コード"
            : campaign.codeType === "generated"
              ? "管理コード"
              : "キャンペーンコード";

        return (
          <details
            className="offer-detail"
            key={campaign.campaignCode}
            open={index === 0}
          >
            <summary className="offer-heading">
              <span className="offer-main">
                <span className="detail-rank">
                  {index + 1}位 · {codeLabel} {campaign.campaignCode}
                </span>
                <span className="offer-title">{campaign.title}</span>
                <span className="offer-target">{campaign.target}</span>
              </span>
              <span className="points-box">
                <span>申込者分</span>
                <strong>{formatPoints(points)}</strong>
                <span>ポイント</span>
              </span>
              <span className="details-toggle" aria-hidden="true">
                詳細を見る
              </span>
            </summary>

            <div className="offer-body">
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
                    {breakdown.length > 0 ? (
                      <ul>
                        {breakdown.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      "申込者向け固定ポイントなし（0ポイントとして順位付け）"
                    )}
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

              <section
                className="value-analysis"
                aria-labelledby={`value-title-${campaign.campaignCode}`}
              >
                <div className="value-analysis-heading">
                  <div>
                    <p className="value-kicker">詳細のみで比較</p>
                    <h3 id={`value-title-${campaign.campaignCode}`}>
                      ポイント以外の特典・追加費用
                    </h3>
                  </div>
                  <p
                    className={`value-result value-result-${valueResult.status}`}
                  >
                    <span>{valueLabel}</span>
                    <strong>
                      {valueResult.status === "calculated" &&
                      valueResult.amountYen !== null
                        ? formatYen(valueResult.amountYen)
                        : "算出不可"}
                    </strong>
                  </p>
                </div>

                <p className="value-ranking-note">
                  この金額は詳細確認用です。ランキング順位には影響しません。
                </p>

                <dl className="value-grid">
                  <div>
                    <dt>ポイント以外の特典</dt>
                    <dd>
                      {campaign.valuation.otherBenefits.length > 0 ? (
                        <ul>
                          {campaign.valuation.otherBenefits.map((benefit) => (
                            <li key={`${benefit.label}-${benefit.description}`}>
                              <strong>{benefit.label}</strong>：
                              {benefit.description}
                              {benefit.amountYen !== null
                                ? `（${formatYen(benefit.amountYen)}相当）`
                                : benefit.includedInDevicePrice
                                  ? "（端末価格に反映。特典額の単独換算はしません）"
                                  : "（金額保留）"}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "同一キャンペーンコード内に金額特典なし"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>適用に必要な追加費用</dt>
                    <dd>
                      {campaign.valuation.requiredCosts.length > 0 ? (
                        <ul>
                          {campaign.valuation.requiredCosts.map((cost) => (
                            <li key={`${cost.label}-${cost.description}`}>
                              <strong>{cost.label}</strong>：
                              {cost.amountYen !== null
                                ? formatYen(cost.amountYen)
                                : cost.monthlyAmountYen !== null
                                  ? `${formatYen(cost.monthlyAmountYen)}/月（必要月数未確定）`
                                  : "総額保留"}
                              <span>{cost.description}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "キャンペーン固有の追加必須費用なし（通常の回線料金は計算対象外）"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>計算対象期間</dt>
                    <dd>{campaign.valuation.calculationPeriod}</dd>
                  </div>
                  <div>
                    <dt>{valueLabel}</dt>
                    <dd>
                      {valueResult.formula ? (
                        <span className="value-formula">{valueResult.formula}</span>
                      ) : (
                        `算出不可（${valueResult.reason}）`
                      )}
                      {campaign.valuation.devicePriceNote ? (
                        <span>{campaign.valuation.devicePriceNote}</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>継続する月次特典</dt>
                    <dd>
                      {campaign.valuation.ongoingBenefits.length > 0 ? (
                        <ul>
                          {campaign.valuation.ongoingBenefits.map((benefit) => (
                            <li key={`${benefit.label}-${benefit.description}`}>
                              {benefit.monthlyAmountYen !== null ? (
                                <strong>
                                  毎月＋
                                  {formatYen(benefit.monthlyAmountYen)}相当
                                </strong>
                              ) : (
                                <strong>月額は算出不可</strong>
                              )}
                              <span>{benefit.description}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "なし"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>金額換算対象外</dt>
                    <dd>
                      {campaign.valuation.unquantifiedBenefits.length > 0 ? (
                        <ul>
                          {campaign.valuation.unquantifiedBenefits.map(
                            (benefit) => (
                              <li key={benefit}>{benefit}</li>
                            ),
                          )}
                        </ul>
                      ) : (
                        "なし"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>併用候補（別コード）</dt>
                    <dd>
                      {campaign.valuation.relatedCampaigns.length > 0 ? (
                        <ul>
                          {campaign.valuation.relatedCampaigns.map((related) => (
                            <li key={related.campaignCode}>
                              コード {related.campaignCode}：{related.description}
                              （実質価値には合算していません）
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "この詳細での合算なし"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>算出根拠</dt>
                    <dd>
                      <ul>
                        {campaign.valuation.evidence.calculationInputs.map(
                          (input) => (
                            <li key={input}>{input}</li>
                          ),
                        )}
                      </ul>
                      <span>
                        公式情報の確認日：
                        {formatCheckedAt(campaign.valuation.evidence.checkedAt)}
                      </span>
                      <a
                        href={campaign.valuation.evidence.officialUrl}
                        rel="sponsored noopener noreferrer"
                        target="_blank"
                      >
                        算出に使用した公式ページ
                      </a>
                    </dd>
                  </div>
                </dl>
              </section>

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
            </div>
          </details>
        );
      })}
    </div>
  );
}
