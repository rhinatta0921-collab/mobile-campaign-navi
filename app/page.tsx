import { CampaignDetails } from "@/app/components/CampaignDetails";
import { CampaignRanking } from "@/app/components/CampaignRanking";
import {
  campaignDataMeta,
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
    campaign.rankingEligible &&
    campaign.audience !== "member",
);
const mnpRankedCampaigns = rankCampaigns(nonDeviceCampaigns, "mnp");
const checkedDate = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "long",
}).format(new Date(`${campaignDataMeta.checkedAt}T00:00:00+09:00`));

const excludedExamples = [
  "対象iPhone・Android・Apple Watch・Wi-Fiルーターなど、本体購入が必須の特典",
  "キャンペーン終了済みの楽天マジ得フェスティバルなど、申込期限を過ぎた特典",
  "値引き・無料期間・倍率・抽選など、固定ポイント額のランキングに換算できない特典",
];

const tableOfContents = [
  "結論：回線だけの申し込み時に使える中で獲得ポイント額が最大のキャンペーン",
  "楽天モバイルキャンペーン獲得ポイント額ランキング",
  "ランキング掲載キャンペーンの詳細",
];

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
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

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <div className="brand-mark">楽天モバイルキャンペーン比較</div>
          <nav aria-label="ページ内ナビゲーション">
            <a href="#how-to-choose">選び方</a>
            <a href="#ranking">ランキング</a>
            <a href="#details">詳細</a>
            <a href="/device-campaigns">端末購入あり</a>
          </nav>
        </div>
      </header>

      <div className="shell page-grid">
        <article className="article">
          <section className="article-hero" aria-labelledby="page-title">
            <div className="meta-row" aria-label="ページ情報">
              <span>広告・PR</span>
            </div>
            <p className="category-label">{checkedDate} 更新</p>
            <h1 id="page-title">
              楽天モバイル申し込みキャンペーンおすすめ比較ランキング
            </h1>
            <p className="lead">
              楽天モバイルへの申し込みを考えていると、「どのキャンペーンが一番お得？」「併用できるキャンペーンはある？」「iPhoneやAndroidの端末割引はどれを選べばいい？」と迷う方も多いのではないでしょうか。
              このページでは、現在開催されている楽天モバイルの申し込みキャンペーンを特典の配布ポイント額の多さで比較し、ランキング形式で紹介します。キャンペーンの開催期間や利用条件なども掲載しており、また公式ページには載っていないキャンペーンも掲載しているので、ぜひ楽天モバイルへの申し込み時にどのキャンペーンを利用してお得に楽天モバイルの利用を開始するのかの参考にしてください。
            </p>
          </section>

          <section
            className="editor-note"
            id="how-to-choose"
            aria-labelledby="how-to-choose-title"
          >
            <h2 id="how-to-choose-title">キャンペーンの選び方</h2>
            <p>
              楽天モバイルの申込時に使えるキャンペーンは、条件の違いから大きく次の3タイプに整理できます。
            </p>
            <ul>
              <li>
                <strong>SIM（回線）のみ</strong>
                楽天モバイルのプラン申込のみのときに適用できるキャンペーン
              </li>
              <li>
                <strong>SIM＋スマホ本体購入</strong>
                プラン申込に対象スマートフォンの購入条件を組み合わせるキャンペーン
              </li>
              <li>
                <strong>SIM＋その他サービスの申込・利用</strong>
                プラン申込に楽天カードやRakuten
                Turboなど、対象サービスの申込・利用条件を組み合わせるキャンペーン
              </li>
            </ul>
            <p>
              スマホ本体購入のキャンペーンを利用する際には、まずどの機種がいいのかを調べてから、それにあったキャンペーンを利用することになる。楽天モバイルでは基本的に1つの機種に対しては1つしかキャンペーンは行われていないため、キャンペーン同士の比較は不要で、自分が欲しい端末のキャンペーンの利用条件を確認し、他の店舗で購入したりする場合とどちらがお得かを確認すれば良い。
            </p>
          </section>

          <section
            className="route-link-band"
            aria-labelledby="device-campaign-link-title"
          >
            <div>
              <p className="section-label">スマホ本体も一緒に購入する方</p>
              <h2 id="device-campaign-link-title">
                端末購入が必要なキャンペーンの一覧はこちら
              </h2>
            </div>
            <a className="route-link" href="/device-campaigns">
              キャンペーン一覧を見る
            </a>
          </section>

          <nav className="toc" aria-label="目次">
            <h2>目次</h2>
            <ol>
              {tableOfContents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </nav>

          <section
            className="conclusion"
            id="conclusion"
            aria-labelledby="conclusion-title"
          >
            <p className="section-label">結論</p>
            <h2 id="conclusion-title">
              端末購入なしの固定ポイント特典では、最大
              {formatPoints(topPoints ?? 0)}ポイントが最上位
            </h2>
            {topCampaign ? (
              <div className="winner-box">
                <div className="winner-rank">1位</div>
                <div>
                  <h3>{topCampaign.title}</h3>
                  <p>
                    最大{formatPoints(topPoints ?? 0)}ポイント。
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
                端末購入不要・固定ポイント特典
                {nonDeviceCampaigns.length}種比較
              </p>
              <h2 id="ranking-title">実質配布ポイント額ランキング</h2>
              <p>
                順位は併用後の合計ではなく、個別キャンペーン単位の最大ポイントで並べています。
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
