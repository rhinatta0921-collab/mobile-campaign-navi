import { CampaignDetails } from "@/app/components/CampaignDetails";
import { CampaignRanking } from "@/app/components/CampaignRanking";
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
  (campaign) => !campaign.requiresDevicePurchase,
);
const mnpRankedCampaigns = rankCampaigns(nonDeviceCampaigns, "mnp");
const checkedDate = mnpRankedCampaigns[0]?.checkedAt ?? "2026年7月23日";

const excludedExamples = [
  "対象iPhone・Android・Apple Watch・Wi-Fiルーターなど、本体購入が必須のキャンペーン",
  "キャンペーン終了済みの楽天マジ得フェスティバルなど、申込期限を過ぎた特典",
  "買い物額や利用額で変動する倍率系・抽選系など、入会時の固定ポイントとして比較しにくい特典",
];

const tableOfContents = [
  "結論：SIMのみで狙うならまず確認したいキャンペーン",
  "楽天モバイルSIMのみキャンペーン比較ランキング",
  "ランキング掲載キャンペーンの詳細",
  "対象外にしたキャンペーン",
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
              <span>最終確認: {checkedDate}</span>
            </div>
            <p className="category-label">2026年7月23日 更新</p>
            <h1 id="page-title">
              楽天モバイル申し込みキャンペーンおすすめ比較ランキング
            </h1>
            <p className="lead">
              楽天モバイルへの申し込みを考えていると、「どのキャンペーンが一番お得？」「いくつかのキャンペーンを併用できる？」「iPhoneやAndroidの端末割引はどれを選べばいい？」と迷う方も多いのではないでしょうか。
              このページでは、楽天モバイルで現在開催されている申し込みキャンペーンを比較し、配布されるポイント額から、スマホ本体代の購入費用などのキャンペーン適用のために必要な費用を差し引いた「実質配布ポイント額」が多い順にランキング形式で紹介します。申し込み前に、自分に合うキャンペーンを見つける参考にしてください。
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
              端末購入やサービス利用を伴うキャンペーンは、SIMの申込特典に追加条件を重ねるタイプが多く、併用できる特典はキャンペーンごとに異なります。まずはSIMキャンペーンの中で、自分の申込方法に合い、受け取れるポイントが多いものを把握し、そのうえで端末やサービスの特典を追加できるかを確認するのが選びやすい順序です。
            </p>
          </section>

          <section
            className="route-link-band"
            aria-labelledby="device-campaign-link-title"
          >
            <div>
              <p className="section-label">スマホ本体も一緒に購入する方</p>
              <h2 id="device-campaign-link-title">
                端末購入が必要なキャンペーンは別ページで比較
              </h2>
            </div>
            <a className="route-link" href="/device-campaigns">
              スマホ本体の購入が必要なキャンペーンを見る
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
              SIMのみで最大ポイントを狙うなら、ショップ限定の
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
                楽天モバイル申し込みキャンペーン全N種比較
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

            <CampaignDetails campaigns={nonDeviceCampaigns} />
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
