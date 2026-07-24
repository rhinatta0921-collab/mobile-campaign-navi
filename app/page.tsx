type Offer = {
  title: string;
  maxPoints: number;
  breakdown: string[];
  target: string;
  conditions: string[];
  channel: string;
  period: string;
  officialUrl: string;
  checkedAt: string;
  notes: string[];
};

const checkedDate = "2026年7月23日";

const offers: Offer[] = [
  {
    title:
      "ショップ限定 初めて申込＋MNP＋楽天市場でお買い物",
    maxPoints: 14000,
    breakdown: [
      "初めて申込＋他社から乗り換え: 10,000ポイント",
      "楽天モバイルショップで初めて申込: 3,000ポイント",
      "楽天市場で1注文1,000円以上の買い物: 1,000ポイント",
    ],
    target:
      "楽天モバイルへ初めて申し込み、他社から電話番号そのまま乗り換える人",
    conditions: [
      "ショップ限定",
      "エントリー必要",
      "Rakuten Link利用",
      "ポイント受取必要",
      "楽天市場買い物あり",
    ],
    channel: "楽天モバイルショップ",
    period: "2025年1月14日 開店 - 終了日未定",
    officialUrl:
      "https://network.mobile.rakuten.co.jp/campaign/shop-limited-application/",
    checkedAt: checkedDate,
    notes: [
      "乗り換え以外の場合は最大11,000ポイントです。",
      "店舗申し込み時にクーポンコード入力が必要です。",
    ],
  },
  {
    title: "楽天モバイル紹介キャンペーン（紹介される方）",
    maxPoints: 13000,
    breakdown: [
      "紹介された方が初めて申込＋MNP: 13,000ポイント",
      "紹介された方が初めて申込＋乗り換え以外: 10,000ポイント",
    ],
    target:
      "楽天モバイル契約者から紹介を受けて、初めて申し込む人",
    conditions: [
      "紹介URLまたはQR経由",
      "初めて申込限定",
      "Rakuten Link利用",
      "MNPで最大額",
    ],
    channel: "紹介リンク、紹介QR、メールなど",
    period: "2023年2月15日 7:00 - 終了日未定",
    officialUrl: "https://network.mobile.rakuten.co.jp/campaign/referral/",
    checkedAt: checkedDate,
    notes: [
      "申し込み前に紹介ログインが必要です。",
      "紹介する側にも契約状態などの条件があります。",
    ],
  },
  {
    title: "楽天カード会員向け 初めて申込キャンペーン",
    maxPoints: 13000,
    breakdown: [
      "楽天カード利用中の方: 3,000ポイント",
      "初めて申込＋他社から乗り換え: 10,000ポイント",
      "乗り換え以外の場合: 合計10,000ポイント",
    ],
    target:
      "楽天カードを持っていて、楽天モバイルへ初めて申し込む人",
    conditions: [
      "楽天カード会員",
      "プランのみ申込可",
      "クーポンコード必要",
      "Rakuten Link利用",
      "MNPで最大額",
    ],
    channel: "公式キャンペーンページの申し込みボタン",
    period: "常時開催（終了日未定）",
    officialUrl: "https://network.mobile.rakuten.co.jp/campaign/e-navi/",
    checkedAt: checkedDate,
    notes: [
      "対象ページ以外から申し込むと特典対象外になる場合があります。",
      "my 楽天モバイルアプリ経由の完了は対象外になる場合があります。",
    ],
  },
  {
    title: "楽天銀行会員向け 初めて申込キャンペーン",
    maxPoints: 13000,
    breakdown: [
      "楽天銀行をご利用中の方: 3,000ポイント",
      "初めて申込＋他社から乗り換え: 10,000ポイント",
      "乗り換え以外の場合: 合計10,000ポイント",
    ],
    target:
      "楽天銀行口座を持っていて、楽天モバイルへ初めて申し込む人",
    conditions: [
      "楽天銀行会員",
      "エントリー必要",
      "プランのみ申込可",
      "クーポンコード必要",
      "Rakuten Link利用",
    ],
    channel: "公式キャンペーンページの申し込みボタン",
    period: "2025年2月3日 10:00 - 終了日未定",
    officialUrl:
      "https://network.mobile.rakuten.co.jp/campaign/bank-member-campaign/",
    checkedAt: checkedDate,
    notes: [
      "楽天銀行のハッピープログラムへのエントリーが必要です。",
      "登録楽天IDの一致など、銀行側の条件も確認してください。",
    ],
  },
  {
    title: "楽天カードJCB新規入会＋楽天モバイル同時申込",
    maxPoints: 11000,
    breakdown: [
      "楽天モバイルと楽天カード同時申込: 3,000ポイント",
      "楽天カードJCB新規入会＆3回利用: 8,000ポイント",
    ],
    target:
      "楽天カードを新しく作り、楽天モバイルへ初めて申し込む人",
    conditions: [
      "楽天カード新規入会",
      "JCBブランドで最大額",
      "カード3回利用",
      "同じ楽天ID",
      "初めて申込限定",
    ],
    channel: "楽天モバイル申し込み開始前の楽天カード案内",
    period: "楽天モバイル同時申込: 常時開催",
    officialUrl:
      "https://network.mobile.rakuten.co.jp/guide/application/card-campaign/",
    checkedAt: checkedDate,
    notes: [
      "JCBブランド以外はカード側の特典額が下がります。",
      "カード利用・口座振替設定など、楽天カード側の進呈条件があります。",
    ],
  },
  {
    title: "楽天モバイル初めてお申し込みキャンペーン",
    maxPoints: 10000,
    breakdown: [
      "初めて申込＋他社から乗り換え: 10,000ポイント",
      "初めて申込＋新規契約など: 7,000ポイント",
    ],
    target:
      "楽天モバイルへ初めて申し込む人",
    conditions: [
      "エントリー必要",
      "初めて申込限定",
      "Rakuten Link利用",
      "ポイント受取必要",
      "SIMのみ利用可",
    ],
    channel: "Web、楽天モバイル公式 楽天市場店、楽天モバイルショップ",
    period: "増量期間は終了日未定",
    officialUrl: "https://network.mobile.rakuten.co.jp/campaign/mnp/",
    checkedAt: checkedDate,
    notes: [
      "エントリー後のお申し込み、かつエントリーと同月内のお申し込みが対象です。",
      "Rakuten最強プラン（データタイプ）は対象外です。",
    ],
  },
  {
    title: "Rakuten最強U-NEXT 初めて利用特典",
    maxPoints: 5000,
    breakdown: [
      "Rakuten最強U-NEXTに初めて申込またはプラン変更: 5,000ポイント",
    ],
    target:
      "Rakuten最強U-NEXTを初めて利用する人",
    conditions: [
      "エントリー必要",
      "U-NEXTセットプラン",
      "初めて利用限定",
      "解約・プラン変更で対象外",
    ],
    channel: "Webまたはショップ",
    period: "2026年6月1日 0:00から5,000ポイントに増量",
    officialUrl: "https://network.mobile.rakuten.co.jp/fee/unext/",
    checkedAt: checkedDate,
    notes: [
      "楽天モバイルの通常申込特典とは別に、U-NEXTセットプラン利用が条件です。",
      "無料期間終了後のU-NEXT年額プラン移行なども確認してください。",
    ],
  },
  {
    title: "ショップ限定 楽天回線をもう1回線お申し込み",
    maxPoints: 3000,
    breakdown: ["楽天回線をもう1回線申し込み: 3,000ポイント"],
    target:
      "すでにRakuten最強プランを利用中で、ショップでもう1回線申し込む人",
    conditions: [
      "ショップ限定",
      "2回線目以降",
      "Rakuten最強プラン利用中",
      "期間限定ポイント",
    ],
    channel: "楽天モバイルショップ",
    period: "終了日未定",
    officialUrl:
      "https://network.mobile.rakuten.co.jp/campaign/shop-extra-sim/",
    checkedAt: checkedDate,
    notes: [
      "初めて入会する方向けではなく、追加回線向けの低ポイント特典です。",
      "プラン利用開始時点で2回線以上の利用などの条件があります。",
    ],
  },
  {
    title: "過去利用者限定 ただいまキャンペーン",
    maxPoints: 2162,
    breakdown: [
      "データ3GB相当 1,081ポイント x 2カ月: 2,162ポイント",
    ],
    target:
      "過去に楽天モバイルを契約していて、他社からMNPで戻る人",
    conditions: [
      "過去利用者限定",
      "MNP限定",
      "Rakuten Link利用",
      "クーポンコード必要",
      "解約後2カ月以内は対象外",
    ],
    channel: "Webまたは楽天モバイルショップ",
    period: "2026年3月2日 9:00 - 終了日未定",
    officialUrl: "https://network.mobile.rakuten.co.jp/campaign/tadaima/",
    checkedAt: checkedDate,
    notes: [
      "初回申込向けではなく、再契約者向けのキャンペーンです。",
      "申し込みの4カ月後から2カ月間にわたり進呈されます。",
    ],
  },
];

const rankedOffers = offers
  .map((offer, originalIndex) => ({ ...offer, originalIndex }))
  .sort((a, b) => b.maxPoints - a.maxPoints || a.originalIndex - b.originalIndex);

const excludedExamples = [
  "対象iPhone・Android・Apple Watch・Wi-Fiルーターなど、本体購入が必須のキャンペーン",
  "キャンペーン終了済みの楽天マジ得フェスティバルなど、申込期限を過ぎた特典",
  "買い物額や利用額で変動する倍率系・抽選系など、入会時の固定ポイントとして比較しにくい特典",
];

function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}

const guidePoints = [
  {
    label: "スマホ購入不要",
    detail: "SIMのみで使える特典だけを掲載",
  },
  {
    label: "最大14,000ポイント",
    detail: "個別キャンペーンの最大額で比較",
  },
  {
    label: "追加条件も明記",
    detail: "カード・銀行・紹介・店舗条件を整理",
  },
  {
    label: "公式情報を確認",
    detail: "各カードから公式ページへ移動可能",
  },
];

export default function Home() {
  const topOffer = rankedOffers[0];

  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <div className="shell hero-shell">
          <div className="hero-copy">
            <div className="meta-row" aria-label="ページ情報">
              <span>広告・PR</span>
              <span>最終確認: {checkedDate}</span>
              <span>SIMのみ契約対象</span>
            </div>
            <p className="eyebrow">楽天モバイル入会キャンペーン比較</p>
            <h1 id="page-title">
              SIMのみで使える
              <span>楽天モバイルキャンペーンをポイント順に比較</span>
            </h1>
            <p className="hero-lead">
              スマホ本体の購入が必要な特典を除外し、入会時に検討しやすいキャンペーンだけを整理しました。最大ポイント、追加条件、申込方法をまとめて確認できます。
            </p>

            <div className="hero-actions" aria-label="ページの価値">
              {guidePoints.map((point) => (
                <div className="guide-chip" key={point.label}>
                  <strong>{point.label}</strong>
                  <span>{point.detail}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="hero-summary" aria-label="ランキング概要">
            <img
              className="hero-guide-image"
              src="/assets/images/hero-guide.png"
              alt=""
            />
            <div className="hero-stats">
              <div>
                <strong>{formatPoints(topOffer.maxPoints)}</strong>
                <span>掲載中の最大ポイント</span>
              </div>
              <div>
                <strong>{rankedOffers.length}</strong>
                <span>掲載キャンペーン数</span>
              </div>
              <div>
                <strong>0</strong>
                <span>スマホ購入必須の掲載</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="criteria-band" aria-label="ランキング基準">
        <div className="shell criteria-grid">
          <div>
            <span>順位基準</span>
            <strong>個別キャンペーンの最大ポイント順</strong>
          </div>
          <div>
            <span>掲載条件</span>
            <strong>SIMのみ契約で利用可能</strong>
          </div>
          <div>
            <span>追加条件</span>
            <strong>カード・銀行・紹介・店舗条件は明記</strong>
          </div>
        </div>
      </section>

      <section className="ranking-section shell" aria-labelledby="ranking-title">
        <div className="section-heading">
          <p className="eyebrow">Ranking</p>
          <h2 id="ranking-title">入会者が得られるポイントが多い順</h2>
          <p>
            同じキャンペーンでもMNPと新規契約でポイントが変わる場合は、最大額と内訳を分けて表示しています。
          </p>
        </div>

        <div className="ranking-list">
          {rankedOffers.map((offer, index) => (
            <article className="offer-card" key={offer.title}>
              <div className="rank-panel">
                <span className="rank-label">Rank</span>
                <strong>{index + 1}</strong>
              </div>

              <div className="offer-main">
                <div className="offer-heading">
                  <div>
                    <p className="offer-kicker">{offer.target}</p>
                    <h3>{offer.title}</h3>
                  </div>
                  <div className="points-box">
                    <span>最大</span>
                    <strong>{formatPoints(offer.maxPoints)}</strong>
                    <span>ポイント</span>
                  </div>
                </div>

                <div className="condition-list" aria-label="主な条件">
                  {offer.conditions.map((condition) => (
                    <span key={condition}>{condition}</span>
                  ))}
                </div>

                <dl className="detail-grid">
                  <div>
                    <dt>ポイント内訳</dt>
                    <dd>
                      <ul>
                        {offer.breakdown.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>申込方法</dt>
                    <dd>{offer.channel}</dd>
                  </div>
                  <div>
                    <dt>期間</dt>
                    <dd>{offer.period}</dd>
                  </div>
                  <div>
                    <dt>確認日</dt>
                    <dd>{offer.checkedAt}</dd>
                  </div>
                </dl>

                <div className="notes-row">
                  <ul>
                    {offer.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <a
                    className="official-link"
                    href={offer.officialUrl}
                    rel="sponsored noopener noreferrer"
                    target="_blank"
                  >
                    公式ページで確認
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="exclusions-band" aria-labelledby="excluded-title">
        <div className="shell exclusions-layout">
          <div>
            <p className="eyebrow">Excluded</p>
            <h2 id="excluded-title">ランキングから外したもの</h2>
          </div>
          <ul>
            {excludedExamples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </div>
      </section>

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
