import { formatJapaneseDate, formatPoints } from "@/app/lib/format";
import { officialLinkAnalyticsAttributes } from "@/app/lib/analytics";
import {
  getCampaignApplicationUrl,
  type ConclusionSegment,
} from "@/data/campaigns";
import {
  CampaignOfficialImage,
  requireOfficialImage,
} from "./CampaignOfficialImage";

export function ConclusionSection({
  segments,
  title,
}: {
  segments: readonly ConclusionSegment[];
  title: string;
}) {
  const primarySegment = segments[0];
  if (!primarySegment) {
    throw new Error("結論に使えるランキング対象キャンペーンがありません。");
  }
  const primaryCampaign = primarySegment.campaign;
  const officialImage = requireOfficialImage(primaryCampaign);
  const actionCampaigns = segments.reduce<
    Array<{
      campaign: ConclusionSegment["campaign"];
      labels: string[];
    }>
  >((groups, segment) => {
    const existing = groups.find(
      ({ campaign }) =>
        campaign.campaignCode === segment.campaign.campaignCode,
    );
    if (existing) existing.labels.push(segment.label);
    else groups.push({ campaign: segment.campaign, labels: [segment.label] });
    return groups;
  }, []);
  return (
    <section
      className="conclusion"
      id="conclusion"
      aria-labelledby="conclusion-title"
      data-campaign-derived="conclusion"
    >
      <h2 id="conclusion-title">{title}</h2>
      <figure className="conclusion-campaign-figure">
        <CampaignOfficialImage
          campaign={primaryCampaign}
          className="conclusion-campaign-picture"
        />
        <figcaption>
          画像：
          <a
            href={primaryCampaign.officialUrl}
            rel="noopener noreferrer"
            target="_blank"
            aria-label={`${primaryCampaign.title}の画像出典：楽天モバイル公式ページ`}
            {...officialLinkAnalyticsAttributes({
              applicationType: "general",
              campaignCode: primaryCampaign.campaignCode,
              linkType: "image_source",
              placement: "conclusion_image",
            })}
          >
            楽天モバイル公式ページ
          </a>
          （{formatJapaneseDate(officialImage.checkedAt)}確認）
        </figcaption>
      </figure>
      <div className="conclusion-lead">
        {segments.map((segment) => (
          <p key={segment.key}>
            <strong className="conclusion-highlight">
              {segment.label}でポイント額を優先する場合は「
              {segment.campaign.title}」が最上位で、申込者本人が最大
              {formatPoints(segment.points)}ポイントを受け取れます。
            </strong>
            {segment.campaign.conditions.length > 0
              ? ` 主な条件は${segment.campaign.conditions
                  .slice(0, 3)
                  .join("、")}です。`
              : null}
          </p>
        ))}
        <p>
          各キャンペーンの内容やポイント額は変更されることがあるため、申し込む時点での情報は必ず公式ページでも確認してください。
        </p>
      </div>
      <div className="conclusion-action-group">
        {actionCampaigns.map(({ campaign, labels }) => {
          const hasDedicatedApplicationUrl = Boolean(
            campaign.applicationUrl &&
              campaign.applicationUrl !== campaign.officialUrl,
          );
          return (
            <div
              className="conclusion-action-item"
              key={campaign.campaignCode}
            >
              <a
                className="official-link conclusion-official-link"
                href={getCampaignApplicationUrl(campaign)}
                rel={
                  hasDedicatedApplicationUrl
                    ? "sponsored noopener noreferrer"
                    : "noopener noreferrer"
                }
                target="_blank"
                {...officialLinkAnalyticsAttributes({
                  applicationType: "general",
                  campaignCode: campaign.campaignCode,
                  linkType: hasDedicatedApplicationUrl
                    ? "referral_application"
                    : "official_information",
                  placement: "conclusion_primary",
                  trackEmployeeReferral: hasDedicatedApplicationUrl,
                })}
              >
                {labels.join("・")}の公式ページを見る
              </a>
              {hasDedicatedApplicationUrl ? (
                <p className="conclusion-login-note">
                  ※専用ページでは楽天アカウントへのログインが必要な場合があります。
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CampaignChoiceSection({ title }: { title: string }) {
  return (
    <section
      className="campaign-choice"
      id="how-to-choose"
      aria-labelledby="how-to-choose-title"
    >
      <h2 id="how-to-choose-title">{title}</h2>
      <p className="choice-intro">
        <strong>
          楽天モバイルで申し込みキャンペーンを利用する際に必ずチェックしておきたい3つのポイント
        </strong>
        を紹介します
      </p>
      <div className="choice-step-list">
        <section
          className="choice-step"
          id="choice-scope"
          aria-labelledby="choice-scope-title"
        >
          <div className="choice-step-heading">
            <span className="choice-step-number" aria-hidden="true">
              POINT 01
            </span>
            <h3 id="choice-scope-title">申し込む範囲を決める</h3>
          </div>
          <p className="choice-step-lead">
            「SIMだけ」か「端末も一緒に買うか」を最初に決めましょう
          </p>
          <figure className="choice-step-figure">
            <img
              src="/assets/campaign-choice-step-scope-v1.png"
              alt=""
              width="690"
              height="460"
              loading="lazy"
              aria-hidden="true"
            />
          </figure>
          <p>
            キャンペーンは申し込む内容によって大きく3つに分かれます。どのタイプに当てはまるかを最初に決めることで、比較すべきキャンペーンが一気に絞り込めます。
          </p>
          <div className="choice-type-list">
            <article id="choice-sim-only">
              <h4>SIMのみ</h4>
              <div>
                <p>通信プランだけを申し込む、最もシンプルなタイプです。</p>
                <p className="choice-recommendation">
                  <span>こんな方に</span>
                  今使っているスマホをそのまま使いたい方・まず手軽に乗り換えたい方
                </p>
              </div>
            </article>
            <article id="choice-device">
              <h4>SIM＋端末購入</h4>
              <div>
                <p>
                  プランとスマホ本体を楽天モバイルで同時に購入するタイプです。
                </p>
                <p className="choice-recommendation">
                  <span>こんな方に</span>
                  スマホの買い替えを検討中の方
                </p>
              </div>
            </article>
            <article id="choice-service">
              <h4>SIM＋その他サービス</h4>
              <div>
                <p>
                  楽天カードの申込や楽天銀行会員など、対象サービスの申込・利用条件を組み合わせるタイプです。
                </p>
                <p className="choice-recommendation">
                  <span>こんな方に</span>
                  手間がかかっても、もらえるポイントを少しでも増やしたい方
                </p>
              </div>
            </article>
          </div>
        </section>

        <section
          className="choice-step"
          id="choice-conditions"
          aria-labelledby="choice-conditions-title"
        >
          <div className="choice-step-heading">
            <span className="choice-step-number" aria-hidden="true">
              POINT 02
            </span>
            <h3 id="choice-conditions-title">自分の申し込み条件を確認する</h3>
          </div>
          <p className="choice-step-lead">
            条件によって、使えるキャンペーンともらえるポイントが変わります
          </p>
          <figure className="choice-step-figure">
            <img
              src="/assets/campaign-choice-step-conditions-v1.png"
              alt=""
              width="690"
              height="460"
              loading="lazy"
              aria-hidden="true"
            />
          </figure>
          <p>
            申し込む範囲が決まったら、次の2点を確認しましょう。同じキャンペーンでも条件によってポイント額が変わるケースがあります。
          </p>
          <div className="choice-condition-grid">
            <section aria-labelledby="choice-number-type-title">
              <h4 id="choice-number-type-title">
                新規番号かMNP（乗り換え）か
              </h4>
              <p>
                新しい電話番号を取得するのか、今使っている番号のまま他社から乗り換えるのかで、対象キャンペーンともらえるポイント額が異なります。一般的にMNPのほうが高ポイントになる傾向があります。
              </p>
            </section>
            <section aria-labelledby="choice-contract-history-title">
              <h4 id="choice-contract-history-title">初契約か2回線目以降か</h4>
              <p>
                楽天モバイルへの申し込みが初めてか、過去に利用したことがあるかによって、利用できるキャンペーンが変わります。多くの高額キャンペーンは初回申し込み限定です。
              </p>
            </section>
          </div>
        </section>

        <section
          className="choice-step"
          id="choice-points"
          aria-labelledby="choice-points-title"
        >
          <div className="choice-step-heading">
            <span className="choice-step-number" aria-hidden="true">
              POINT 03
            </span>
            <h3 id="choice-points-title">
              ポイント額が最も多いキャンペーンを選ぶ
            </h3>
          </div>
          <p className="choice-step-lead">
            絞り込んだ中で、一番ポイントが多いものを選べばOKです
          </p>
          <figure className="choice-step-figure">
            <img
              src="/assets/campaign-choice-step-ranking-v1.png"
              alt=""
              width="690"
              height="460"
              loading="lazy"
              aria-hidden="true"
            />
          </figure>
          <p>
            ポイント①②で自分に当てはまるキャンペーンが絞り込めたら、あとはその中でポイント額が最も多いものを選ぶだけです。このページのランキングはポイント額の多い順に並んでいるので、上から順に自分の条件に合うものを確認してください。
          </p>
          <a className="choice-ranking-link" href="#ranking">
            ランキングを見る
          </a>
        </section>
      </div>
    </section>
  );
}

export function DeviceCampaignGuide({ title }: { title: string }) {
  return (
    <section
      className="device-guide-section"
      id="device-campaign-guide"
      aria-labelledby="device-campaign-guide-title"
    >
      <h2 id="device-campaign-guide-title">{title}</h2>
      <p>
        端末購入ありのキャンペーンは、基本的に1機種につき1つのキャンペーンが設定されています。
      </p>
      <p>
        そのため、気になる端末のキャンペーン条件を確認し、他店での購入と比べてどちらがお得かをチェックするだけでOKです。
      </p>
      <p>
        SIMのみのキャンペーンとは選び方が根本的に異なるため、このページでは端末・ルーターの購入が不要で、回線または対象モバイルプランの申し込み・利用開始が特典の直接条件となるキャンペーンだけを掲載しています。
      </p>
    </section>
  );
}
