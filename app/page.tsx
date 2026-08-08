import { CampaignDetails } from "@/app/components/CampaignDetails";
import {
  CampaignOfficialImage,
  requireOfficialImage,
} from "@/app/components/CampaignOfficialImage";
import { CampaignRanking } from "@/app/components/CampaignRanking";
import { MobileSectionNav } from "@/app/components/MobileSectionNav";
import { SiteHeader } from "@/app/components/SiteHeader";
import {
  campaigns,
  getCampaignPoints,
  rankCampaigns,
  type ApplicationType,
} from "@/data/campaigns";

type HomeProps = {
  searchParams?: Promise<{
    application?: string | string[];
  }>;
};

const nonDeviceCampaigns = campaigns.filter(
  (campaign) =>
    !campaign.requiresDevicePurchase &&
    campaign.rankingEligible,
);
const mnpRankedCampaigns = rankCampaigns(nonDeviceCampaigns, "mnp");
const excludedExamples = [
  "対象iPhone・Android・Apple Watch・Wi-Fiルーターなど、本体購入が必須の特典",
  "キャンペーン終了済みの楽天マジ得フェスティバルなど、申込期限を過ぎた特典",
  "回線申込や同時申込に直接関係しない、契約者向けの一般特典・情報ページ",
];

const comparisonPoints = [
  {
    id: "comparison-points-value",
    image: "/assets/comparison-point-points-v2.png",
    title: "獲得できるポイント額",
    description:
      "キャンペーンで申込者本人が受け取れるポイントの合計額です。このページのランキングはこの数値をもとに決定しています。",
  },
  {
    id: "comparison-points-conditions",
    image: "/assets/comparison-point-conditions-v2.png",
    title: "適用条件の難易度",
    description:
      "ポイント額が高くても、条件を満たせなければ意味がありません。以下の観点で各キャンペーンの条件を整理しています。",
    notes: [
      "新しい電話番号での申し込みか、他社からのMNP（乗り換え）か",
      "楽天モバイルへの初めての申し込みか、2回線目以上の追加か",
      "端末購入・楽天カード申し込みなど、SIM以外の条件があるか。またその条件を満たすのにいくらのコストがかかるか",
    ],
  },
  {
    id: "comparison-points-period",
    image: "/assets/comparison-point-period-v2.png",
    title: "キャンペーンの開催期間",
    description:
      "終了日が近いキャンペーンや、常時開催のキャンペーンなど、申し込みのタイミングに関わる情報を掲載しています。",
  },
  {
    id: "comparison-points-total-value",
    image: "/assets/comparison-point-value-v2.png",
    title: "ポイント以外の特典と実質的なお得さ",
    description:
      "割引や無料特典など、ポイント以外に受けられる特典と、適用に必要な追加費用を整理しています。金額を確定できる場合は実質お得額も掲載しますが、これらはランキング順位には影響しません。",
  },
];

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}

function formatJapaneseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function resolveApplicationType(
  application: string | string[] | undefined,
): ApplicationType {
  return application === "new-number" ? "newNumber" : "mnp";
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const applicationType = resolveApplicationType(params?.application);
  const topCampaign = mnpRankedCampaigns[0];
  const topPoints = topCampaign
    ? getCampaignPoints(topCampaign, "mnp")
    : null;
  const topCampaignOfficialImage = topCampaign
    ? requireOfficialImage(topCampaign)
    : null;

  return (
    <main>
      <SiteHeader />

      <div className="shell page-grid">
        <article className="article">
          <section
            className="article-hero home-hero"
            aria-labelledby="page-title"
          >
            <div className="hero-visual" aria-hidden="true">
              <picture>
                <source
                  media="(max-width: 860px)"
                  srcSet="/hero-firstview-pop-v2-mobile.png"
                  width="390"
                  height="292"
                />
                <img
                  src="/hero-firstview-pop-v2-desktop.png"
                  alt=""
                  width="700"
                  height="525"
                  fetchPriority="high"
                />
              </picture>
            </div>
            <div className="hero-copy">
              <h1 id="page-title">
                楽天モバイル 申し込みキャンペーン比較ランキング【2026年8月最新】
              </h1>
              <div className="lead">
                <p className="lead-question">
                  「楽天モバイルに申し込みたいけど、どのキャンペーンが一番お得なの？」
                </p>
                <p>
                  そう思って調べ始めると、公式サイトだけでも10種類以上のキャンペーンが並んでいて、条件や特典の違いを一つひとつ確認するのは大変です。
                </p>
                <p>
                  このページでは、
                  <strong>
                    現在開催中の楽天モバイル申し込みキャンペーン
                    {nonDeviceCampaigns.length}
                    種を、申込者本人が受け取れる固定ポイント額の多い順にランキング形式で比較
                  </strong>
                  しています。
                </p>
                <ul className="lead-checks">
                  <li>各キャンペーンの開催期間・適用条件を一覧で確認できる</li>
                  <li>公式サイトに掲載されていないキャンペーンも網羅</li>
                  <li>ポイント以外の特典・追加コスト・実質お得額も掲載</li>
                </ul>
                <p>
                  「紹介URLがある人」「MNPで乗り換える人」「65歳以上の方」など、
                  <strong>
                    あなたの状況に合ったキャンペーンがすぐに見つかります。
                  </strong>
                </p>
              </div>
              <p className="promotion-notice">
                当サイトはプロモーションを含みます
              </p>
            </div>
          </section>

          <section
            className="comparison-points"
            id="comparison-points"
            aria-labelledby="comparison-points-title"
          >
            <h2 id="comparison-points-title">比較のポイント</h2>
            <p>
              現在開催されている楽天モバイルのキャンペーン
              {nonDeviceCampaigns.length}
              種類を徹底調査し、以下の4つのポイントで比較しています。
            </p>
            <ol className="comparison-point-list">
              {comparisonPoints.map((point, index) => (
                <li id={point.id} key={point.id}>
                  <img
                    src={point.image}
                    alt=""
                    width="320"
                    height="240"
                    loading="lazy"
                    aria-hidden="true"
                  />
                  <div>
                    <h3>
                      <span aria-hidden="true">{index + 1}</span>
                      {point.title}
                    </h3>
                    <p>{point.description}</p>
                    {point.notes ? (
                      <ul>
                        {point.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="campaign-choice"
            id="how-to-choose"
            aria-labelledby="how-to-choose-title"
          >
            <h2 id="how-to-choose-title">キャンペーンの選び方</h2>
            <h3>まず「自分のタイプ」を確認しよう</h3>
            <p>
              楽天モバイルの申し込みキャンペーンは、条件の違いから大きく
              <strong>3つのタイプ</strong>
              に分かれます。自分がどのタイプに当てはまるかを確認してから、ランキングを参照するとスムーズです。
            </p>
            <div className="choice-table-scroll">
              <table className="choice-table">
                <thead>
                  <tr>
                    <th scope="col">タイプ</th>
                    <th scope="col">こんな人向け</th>
                    <th scope="col">特徴</th>
                  </tr>
                </thead>
                <tbody>
                  <tr id="choice-sim-only">
                    <th scope="row">① SIM（回線）のみ</th>
                    <td data-label="こんな人向け">スマホはそのまま使いたい方</td>
                    <td data-label="特徴">
                      プランの申し込みだけで適用できる。端末購入不要で手軽
                    </td>
                  </tr>
                  <tr id="choice-device">
                    <th scope="row">② SIM＋スマホ本体購入</th>
                    <td data-label="こんな人向け">機種変更も一緒にしたい方</td>
                    <td data-label="特徴">
                      対象スマートフォンの購入が条件。機種ごとにキャンペーンが異なる
                    </td>
                  </tr>
                  <tr id="choice-service">
                    <th scope="row">③ SIM＋その他サービス</th>
                    <td data-label="こんな人向け">
                      楽天カード・楽天ひかりなども検討中の方
                    </td>
                    <td data-label="特徴">
                      楽天カードやRakuten Turboなど対象サービスとの同時申し込みが条件
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <figure className="campaign-types-figure">
              <img
                src="/assets/campaign-types-guide-v2.png"
                alt="楽天モバイルの申込キャンペーンを、SIMのみ、SIMとスマホ本体購入、SIMとその他サービスの3タイプに整理した図"
                width="690"
                height="692"
                loading="lazy"
              />
            </figure>
          </section>

          <section
            className="route-link-band"
            aria-labelledby="device-campaign-link-title"
          >
            <img
              className="route-link-icon"
              src="/assets/smartphone-device.svg"
              alt=""
              aria-hidden="true"
            />
            <div>
              <h2 id="device-campaign-link-title">
                スマホ本体も一緒に購入する方
              </h2>
              <p>端末購入が必要なキャンペーンの一覧はこちら</p>
            </div>
            <a className="route-link" href="/device-campaigns">
              キャンペーン一覧を見る
            </a>
          </section>

          <nav className="toc" aria-label="目次">
            <h2>目次</h2>
            <ul className="toc-list">
              <li>
                <a href="#comparison-points">比較のポイント</a>
                <ul>
                  <li><a href="#comparison-points-value">獲得できるポイント額</a></li>
                  <li><a href="#comparison-points-conditions">適用条件の難易度</a></li>
                  <li><a href="#comparison-points-period">キャンペーンの開催期間</a></li>
                  <li><a href="#comparison-points-total-value">ポイント以外の特典と実質的なお得さ</a></li>
                </ul>
              </li>
              <li>
                <a href="#how-to-choose">キャンペーンの選び方</a>
                <ul>
                  <li><a href="#choice-sim-only">SIM（回線）のみ</a></li>
                  <li><a href="#choice-device">SIM＋スマホ本体購入</a></li>
                  <li><a href="#choice-service">SIM＋その他サービス</a></li>
                </ul>
              </li>
              <li><a href="#conclusion">結論</a></li>
              <li><a href="#ranking">楽天モバイルキャンペーン獲得ポイント額ランキング</a></li>
              <li><a href="#details">ランキング掲載キャンペーンの詳細</a></li>
            </ul>
            <details className="toc-overflow">
              <summary>
                <span className="toc-open-label">全部見る</span>
                <span className="toc-close-label">閉じる</span>
              </summary>
              <ul className="toc-list toc-list-hidden">
                <li><a href="/device-campaigns">端末購入ありのキャンペーン</a></li>
              </ul>
            </details>
          </nav>

          <MobileSectionNav />

          <section
            className="conclusion"
            id="conclusion"
            aria-labelledby="conclusion-title"
          >
            <p className="section-label">結論</p>
            <h2 id="conclusion-title">
              端末購入なしの申込者向け固定ポイントでは、最大
              {formatPoints(topPoints ?? 0)}ポイントが最上位
            </h2>
            {topCampaign && topCampaignOfficialImage ? (
              <div className="winner-box">
                <figure className="winner-campaign-figure">
                  <CampaignOfficialImage
                    campaign={topCampaign}
                    className="winner-campaign-picture"
                    variant="detail"
                  />
                  <figcaption>
                    画像：
                    <a
                      href={topCampaign.officialUrl}
                      rel="sponsored noopener noreferrer"
                      target="_blank"
                      aria-label={`${topCampaign.title}の画像出典：楽天モバイル公式ページ`}
                    >
                      楽天モバイル公式ページ
                    </a>
                    （
                    {formatJapaneseDate(topCampaignOfficialImage.checkedAt)}
                    確認）
                  </figcaption>
                </figure>
                <div className="winner-rank">
                  <img src="/assets/crown.svg" alt="" aria-hidden="true" />
                  <span>1位</span>
                </div>
                <div className="winner-copy">
                  <h3>{topCampaign.title}</h3>
                  <p>
                    申込者本人が最大{formatPoints(topPoints ?? 0)}ポイント。
                    {topCampaign.summary}
                  </p>
                </div>
                <a
                  className="text-link"
                  href={topCampaign.officialUrl}
                  rel="sponsored noopener noreferrer"
                  target="_blank"
                >
                  公式ページで確認
                </a>
              </div>
            ) : null}
          </section>

          <section
            className="ranking-section"
            id="ranking"
            aria-labelledby="ranking-title"
          >
            <div className="section-heading">
              <p className="section-label">
                端末購入不要・申込キャンペーン
                {nonDeviceCampaigns.length}種比較
              </p>
              <h2 id="ranking-title">獲得固定ポイント額ランキング</h2>
              <p>
                順位は申込者本人が受け取る固定ポイントだけで決定します。ポイント以外の特典、追加費用、実質お得額は各キャンペーンの詳細で確認できます。
              </p>
            </div>

            <CampaignRanking
              applicationType={applicationType}
              basePath="/"
              campaigns={nonDeviceCampaigns}
              panelId="sim-only-ranking-panel"
            />
          </section>

          <section
            className="detail-section"
            id="details"
            aria-labelledby="details-title"
          >
            <div className="section-heading">
              <p className="section-label">詳細</p>
              <h2 id="details-title">
                ランキング掲載キャンペーンの詳細
              </h2>
            </div>

            <CampaignDetails
              applicationType={applicationType}
              campaigns={nonDeviceCampaigns}
            />
          </section>

          <section
            className="exclusions-band"
            aria-labelledby="excluded-title"
          >
            <p className="section-label">対象外</p>
            <h2 id="excluded-title">ランキングから外したもの</h2>
            <ul>
              {excludedExamples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
            <a className="inline-route-link" href="/device-campaigns">
              スマホ本体の購入が必要なキャンペーンはこちら
            </a>
          </section>
        </article>
      </div>

      <footer className="site-footer">
        <div className="shell">
          <p>
            本ページは楽天モバイル公式サイトではありません。キャンペーン内容は変更・終了する場合があります。
          </p>
          <p>
            最終的な適用可否、進呈時期、有効期限、併用可否は必ず各公式ページのキャンペーンルールで確認してください。
          </p>
        </div>
      </footer>
    </main>
  );
}
