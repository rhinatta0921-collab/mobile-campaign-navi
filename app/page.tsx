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
    id: "comparison-points-total-value",
    image: "/assets/comparison-point-value-v2.png",
    title: "ポイント以外の特典と実質的なお得さ",
    description:
      "割引や無料特典など、ポイント以外に受けられる特典と、適用に必要な追加費用を整理しています。金額を確定できる場合は実質お得額も掲載しますが、これらはランキング順位には影響しません。",
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
              種類を徹底調査し、以下の3つのポイントで比較しています。
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
            <p className="choice-intro">
              このページで比較する端末購入なしのキャンペーンは現在
              <strong>{nonDeviceCampaigns.length}種類</strong>
              です。条件や特典がそれぞれ異なるため、闇雲に選ぶと、本来もらえたはずのポイントを取りこぼす可能性があります。以下の3つを順番に確認して、自分に合ったキャンペーンを見つけましょう。
            </p>
            <figure className="choice-steps-figure">
              <img
                src="/assets/campaign-choice-steps-v3.png"
                alt=""
                width="690"
                height="900"
                loading="lazy"
                aria-hidden="true"
              />
            </figure>
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
                <p>
                  キャンペーンは申し込む内容によって大きく3つに分かれます。どのタイプに当てはまるかを最初に決めることで、比較すべきキャンペーンが一気に絞り込めます。
                </p>
                <div className="choice-type-list">
                  <article id="choice-sim-only">
                    <h4>SIMのみ</h4>
                    <div>
                      <p>
                        通信プランだけを申し込む、最もシンプルなタイプです。
                      </p>
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
                  <h3 id="choice-conditions-title">
                    自分の申し込み条件を確認する
                  </h3>
                </div>
                <p className="choice-step-lead">
                  条件によって、使えるキャンペーンともらえるポイントが変わります
                </p>
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
                    <h4 id="choice-contract-history-title">
                      初契約か2回線目以降か
                    </h4>
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
                <p>
                  ポイント①②で自分に当てはまるキャンペーンが絞り込めたら、あとはその中でポイント額が最も多いものを選ぶだけです。このページのランキングはポイント額の多い順に並んでいるので、上から順に自分の条件に合うものを確認してください。
                </p>
                <ol className="choice-decision-flow">
                  <li>条件に合うキャンペーンを絞る</li>
                  <li>ランキングを上から確認</li>
                  <li>最上位を選ぶ</li>
                </ol>
                <a className="choice-ranking-link" href="#ranking">
                  ランキングを見る
                </a>
              </section>
            </div>
          </section>

          <section
            className="device-guide-section"
            id="device-campaign-guide"
            aria-labelledby="device-campaign-guide-title"
          >
            <h2 id="device-campaign-guide-title">
              スマホ本体も一緒に購入する方へ
            </h2>
            <p className="device-guide-intro">
              端末購入が必要なキャンペーンは、別ページでまとめて紹介しています。
            </p>
            <p>
              端末購入ありのキャンペーンは「どの機種を買うか」によって選択肢が決まるため、SIMのみとは選び方が根本的に異なります。見やすさのために、このページでは端末購入なしのキャンペーンのみを掲載しています。
            </p>
            <p className="device-guide-highlight">
              スマホ本体も一緒に購入する場合は、
              <strong>「欲しい機種を先に決める」</strong>
              のがポイントです。
            </p>
            <p>
              楽天モバイルでは基本的に1機種につき1つのキャンペーンが設定されているため、キャンペーン同士を比較する必要はありません。気になる端末のキャンペーン条件を確認し、他店での購入と比べてどちらがお得かをチェックするだけでOKです。
            </p>
            <ol className="device-guide-flow">
              <li>機種を決める</li>
              <li>キャンペーン条件を確認</li>
              <li>他店価格と比較</li>
            </ol>
            <a className="device-guide-link" href="/device-campaigns">
              端末購入ありのキャンペーンを見る
              <span aria-hidden="true">→</span>
            </a>
          </section>

          <nav className="toc" aria-label="目次">
            <h2>目次</h2>
            <ul className="toc-list">
              <li>
                <a href="#comparison-points">比較のポイント</a>
                <ul>
                  <li><a href="#comparison-points-value">獲得できるポイント額</a></li>
                  <li><a href="#comparison-points-total-value">ポイント以外の特典と実質的なお得さ</a></li>
                  <li><a href="#comparison-points-conditions">適用条件の難易度</a></li>
                </ul>
              </li>
              <li>
                <a href="#how-to-choose">キャンペーンの選び方</a>
                <ul>
                  <li><a href="#choice-scope">申し込む範囲を決める</a></li>
                  <li><a href="#choice-conditions">自分の申し込み条件を確認する</a></li>
                  <li><a href="#choice-points">ポイント額が最も多いキャンペーンを選ぶ</a></li>
                </ul>
              </li>
              <li><a href="#device-campaign-guide">スマホ本体も一緒に購入する方へ</a></li>
              <li><a href="#conclusion">結論</a></li>
              <li><a href="#ranking">楽天モバイルキャンペーン獲得ポイント額ランキング</a></li>
            </ul>
            <details className="toc-overflow">
              <summary>
                <span className="toc-open-label">全部見る</span>
                <span className="toc-close-label">閉じる</span>
              </summary>
              <ul className="toc-list toc-list-hidden">
                <li><a href="#details">ランキング掲載キャンペーンの詳細</a></li>
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
