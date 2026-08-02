import type { Metadata } from "next";
import Link from "next/link";
import { CampaignDetails } from "@/app/components/CampaignDetails";
import { CampaignRanking } from "@/app/components/CampaignRanking";
import {
  campaignDataMeta,
  campaigns,
  type ApplicationType,
} from "@/data/campaigns";

type DeviceCampaignsPageProps = {
  searchParams?: Promise<{
    application?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title:
    "端末購入が必要なキャンペーン | 楽天モバイル キャンペーン ナビ",
  description:
    "楽天モバイルの申し込みとiPhone、Android、Apple Watchなどの対象製品購入を組み合わせるキャンペーンを比較します。",
};

const deviceCampaigns = campaigns.filter(
  (campaign) =>
    campaign.requiresDevicePurchase && campaign.rankingEligible,
);
const checkedDate = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "long",
}).format(new Date(`${campaignDataMeta.checkedAt}T00:00:00+09:00`));

function resolveApplicationType(
  application: string | string[] | undefined,
): ApplicationType {
  return application === "new-number" ? "newNumber" : "mnp";
}

export default async function DeviceCampaignsPage({
  searchParams,
}: DeviceCampaignsPageProps) {
  const params = await searchParams;
  const applicationType = resolveApplicationType(params?.application);

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <div className="brand-mark">楽天モバイルキャンペーン比較</div>
          <nav aria-label="ページナビゲーション">
            <Link href="/">端末購入なし</Link>
            <a href="#ranking">ランキング</a>
            <a href="#details">詳細</a>
          </nav>
        </div>
      </header>

      <div className="shell page-grid">
        <article className="article">
          <section className="article-hero" aria-labelledby="page-title">
            <div className="meta-row" aria-label="ページ情報">
              <span>広告・PR</span>
              <span>最終確認: {checkedDate}</span>
              <span>公式コード単位で掲載</span>
            </div>
            <p className="category-label">スマホ本体購入あり</p>
            <h1 id="page-title">
              スマホ本体の購入が必要な楽天モバイルキャンペーン比較
            </h1>
            <p className="lead">
              楽天モバイルのプラン申込と、対象iPhone、Android、Apple
              Watchの購入を組み合わせるキャンペーンを比較します。公式一覧の掲載カードが複数コードの特典を合算している場合は、キャンペーンコードごとのポイントだけを表示しています。
            </p>
          </section>

          <section
            className="route-link-band"
            aria-labelledby="sim-only-campaign-link-title"
          >
            <img
              className="route-link-icon"
              src="/assets/smartphone.svg"
              alt=""
              aria-hidden="true"
            />
            <div>
              <p className="section-label">スマホ本体を購入しない方</p>
              <h2 id="sim-only-campaign-link-title">
                端末購入が不要なキャンペーンに戻る
              </h2>
            </div>
            <Link className="route-link" href="/">
              スマホ本体の購入が不要なキャンペーンを見る
            </Link>
          </section>

          <section
            className="ranking-section"
            id="ranking"
            aria-labelledby="ranking-title"
          >
            <div className="section-heading">
              <p className="section-label">
                スマホ本体購入あり・固定ポイント特典
                {deviceCampaigns.length}種比較
              </p>
              <h2 id="ranking-title">獲得ポイント額ランキング</h2>
              <p>
                対象製品の購入が必要で、固定ポイント額を比較できるキャンペーンだけを申込方法別に並べています。
              </p>
            </div>

            <CampaignRanking
              applicationType={applicationType}
              basePath="/device-campaigns"
              campaigns={deviceCampaigns}
              panelId="device-ranking-panel"
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
                スマホ本体購入キャンペーンの詳細
              </h2>
            </div>

            <CampaignDetails
              applicationType={applicationType}
              campaigns={deviceCampaigns}
            />
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
