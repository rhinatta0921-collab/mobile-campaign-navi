import type { Metadata } from "next";
import { CampaignDetails } from "@/app/components/CampaignDetails";
import { CampaignRanking } from "@/app/components/CampaignRanking";
import {
  CampaignChoiceSection,
  ConclusionSection,
  DeviceCampaignGuide,
} from "@/app/components/EditorialSections";
import { MobileSectionNav } from "@/app/components/MobileSectionNav";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SeoStructuredData } from "@/app/components/SeoStructuredData";
import { formatJapaneseDate } from "@/app/lib/format";
import {
  CAMPAIGN_CODES,
  HOMEPAGE_DATA_CHECKED_AT,
  APPLICATION_PATHS,
  SITE_NAME,
  SITE_URL,
} from "@/app/site-config";
import {
  campaigns,
  getRankedCampaigns,
  rankingCampaigns,
  type ApplicationType,
} from "@/data/campaigns";

type HomeProps = {
  searchParams?: Promise<{
    application?: string | string[];
  }>;
};

const employeeReferralCampaign = campaigns.find(
  (campaign) => campaign.campaignCode === CAMPAIGN_CODES.employeeReferral,
);

if (!employeeReferralCampaign) {
  throw new Error("キャンペーン2162のデータがありません。");
}

const mnpTopCampaign = getRankedCampaigns("mnp")[0];

if (!mnpTopCampaign) {
  throw new Error("MNPランキング対象のキャンペーンがありません。");
}

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

const sectionTitles = {
  conclusion:
    "【結論】初回申込は楽天市場キャンペーン、追加回線・再契約は社員紹介キャンペーンを確認！",
  howToChoose: "キャンペーンの選び方",
  deviceCampaignGuide: "スマホ本体も一緒に購入する方へ",
  ranking: "獲得可能ポイントランキング",
  details: "ランキング掲載キャンペーンの詳細",
  exclusions: "ランキングから外したもの",
} as const;

const tocItems = [
  { href: "#conclusion", title: sectionTitles.conclusion },
  { href: "#how-to-choose", title: sectionTitles.howToChoose },
  {
    href: "#device-campaign-guide",
    title: sectionTitles.deviceCampaignGuide,
  },
  { href: "#ranking", title: sectionTitles.ranking },
  { href: "#details", title: sectionTitles.details },
  { href: "#excluded-title", title: sectionTitles.exclusions },
] as const;

function resolveApplicationType(
  application: string | string[] | undefined,
): ApplicationType {
  return application === "new-number" ? "newNumber" : "mnp";
}

const seoByApplication: Record<
  ApplicationType,
  { title: string; description: string }
> = {
  mnp: {
    title: "楽天モバイルのMNPキャンペーン比較ランキング【2026年8月】",
    description:
      "楽天モバイルへMNPで乗り換える際のキャンペーンを、申込者本人が受け取れるポイント順に比較。開催期間、適用条件、公式申込先を確認できます。",
  },
  newNumber: {
    title: "楽天モバイル新規契約キャンペーン比較ランキング【2026年8月】",
    description:
      "楽天モバイルで新しい電話番号を契約する際のキャンペーンを、申込者本人が受け取れるポイント順に比較。開催期間、適用条件、公式申込先を確認できます。",
  },
};

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  const applicationType = resolveApplicationType(params?.application);
  const seo = seoByApplication[applicationType];
  const canonicalPath = APPLICATION_PATHS[applicationType];
  const canonicalUrl = new URL(canonicalPath, SITE_URL).href;
  const imageUrl = new URL("/og-v2.png", SITE_URL).href;

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "ja_JP",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [imageUrl],
    },
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const applicationType = resolveApplicationType(params?.application);
  const rankedCampaigns = getRankedCampaigns(applicationType);
  const seo = seoByApplication[applicationType];

  return (
    <main>
      <SeoStructuredData
        applicationType={applicationType}
        description={seo.description}
        rankedCampaigns={rankedCampaigns}
        title={seo.title}
      />
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
                楽天モバイル 申し込みキャンペーン比較ランキング【
                {formatJapaneseDate(HOMEPAGE_DATA_CHECKED_AT)}最終確認】
              </h1>
              <div className="lead">
                <p className="lead-question">
                  「楽天モバイルに申し込みたいけど、どのキャンペーンが一番お得なの？」
                </p>
                <p>
                  そう思って調べ始めると、公式サイトだけでも10種類以上のキャンペーンが並んでいて、条件や特典の違いを一つひとつ確認するのは大変です。
                </p>
                <p>
                  このページでは、現在開催中の楽天モバイル申し込みキャンペーンを、
                  <strong className="lead-highlight">
                    受け取れるポイント額の多い順にランキング形式で比較しています
                  </strong>
                  。
                </p>
                <ul className="lead-checks">
                  <li>各キャンペーンの開催期間・適用条件を一覧で確認できる</li>
                  <li>公式サイトに掲載されていないキャンペーンも網羅</li>
                  <li>MNP・新規番号別の獲得ポイントランキングを確認できる</li>
                </ul>
                <p>
                  「紹介URLがある人」「MNPで乗り換える人」「65歳以上の方」など、
                  あなたの状況に合ったキャンペーンがすぐに見つかります。
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
            <p className="comparison-points-intro">
              現在開催されている
              <strong>楽天モバイルのキャンペーン</strong>
              を徹底調査し、以下の3つのポイントで
              <strong>比較しました</strong>。
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

          <nav className="toc" aria-label="目次">
            <h2>目次</h2>
            <ul className="toc-list">
              {tocItems.slice(0, 5).map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.title}</a>
                </li>
              ))}
            </ul>
            <details className="toc-overflow">
              <summary>
                <span className="toc-open-label">全部見る</span>
                <span className="toc-close-label">閉じる</span>
              </summary>
              <ul className="toc-list toc-list-hidden">
                {tocItems.slice(5).map((item) => (
                  <li key={item.href}>
                    <a href={item.href}>{item.title}</a>
                  </li>
                ))}
              </ul>
            </details>
          </nav>

          <MobileSectionNav />

          <ConclusionSection
            employeeReferralCampaign={employeeReferralCampaign!}
            title={sectionTitles.conclusion}
            topCampaign={mnpTopCampaign}
          />

          <CampaignChoiceSection title={sectionTitles.howToChoose} />

          <DeviceCampaignGuide title={sectionTitles.deviceCampaignGuide} />

          <section
            className="ranking-section"
            id="ranking"
            aria-labelledby="ranking-title"
          >
            <div className="section-heading">
              <p className="section-label">
                端末購入不要・申込キャンペーン
                {rankingCampaigns.length}種比較
              </p>
              <h2 id="ranking-title">{sectionTitles.ranking}</h2>
              <p>
                楽天モバイル申し込みキャンペーンの獲得可能ポイントランキングは以下の通りです。順位は申込者本人が受け取る固定ポイントだけで決定します。
              </p>
              <p className="ranking-method-note">
                現在使用している電話番号をそのままで乗り換える(MNP)か楽天モバイルで新しい電話番号を取得するかで獲得可能ポイント額が変動するため、タブで分けてランキングを算出しています。
              </p>
            </div>

            <CampaignRanking
              applicationType={applicationType}
              rankedCampaigns={rankedCampaigns}
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
              <h2 id="details-title">{sectionTitles.details}</h2>
            </div>

            <CampaignDetails
              applicationType={applicationType}
              rankedCampaigns={rankedCampaigns}
            />
          </section>

          <section
            className="exclusions-band"
            aria-labelledby="excluded-title"
          >
            <p className="section-label">対象外</p>
            <h2 id="excluded-title">{sectionTitles.exclusions}</h2>
            <ul>
              {excludedExamples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
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
