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

const comparisonColumns = [
  "順位",
  "キャンペーン",
  "最大ポイント",
  "おすすめ対象",
  "主な追加条件",
  "申込方法",
  "公式",
];

const tableOfContents = [
  "結論：SIMのみで狙うならまず確認したいキャンペーン",
  "楽天モバイルSIMのみキャンペーン比較ランキング",
  "ランキング掲載キャンペーンの詳細",
  "対象外にしたキャンペーン",
];

export default function Home() {
  const topOffer = rankedOffers[0];
  const runnerUpOffers = rankedOffers.slice(1, 4);

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <div className="brand-mark">楽天モバイルキャンペーン比較</div>
          <nav aria-label="ページ内ナビゲーション">
            <a href="#how-to-choose">選び方</a>
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
              <span>SIMのみ契約対象</span>
            </div>
            <p className="category-label">楽天モバイル入会キャンペーン</p>
            <h1 id="page-title">
              楽天モバイルのSIMのみキャンペーンおすすめ比較ランキング
            </h1>
            <p className="lead">
              スマホ本体の購入が必要な特典を除外し、SIMのみ契約で使える入会向けキャンペーンを最大ポイント順に整理しました。楽天カード・楽天銀行・紹介・ショップ限定などの追加条件も比較できます。
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
                楽天モバイルのプラン申込を中心としたキャンペーン
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

          <nav className="toc" aria-label="目次">
            <h2>目次</h2>
            <ol>
              {tableOfContents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </nav>

          <section className="conclusion" id="conclusion" aria-labelledby="conclusion-title">
            <p className="section-label">結論</p>
            <h2 id="conclusion-title">
              SIMのみで最大ポイントを狙うなら、ショップ限定の14,000ポイントが最上位
            </h2>
            <div className="winner-box">
              <div className="winner-rank">1位</div>
              <div>
                <h3>{topOffer.title}</h3>
                <p>
                  最大{formatPoints(topOffer.maxPoints)}ポイント。楽天モバイルへ初めて申し込み、他社から乗り換え、ショップ申込、楽天市場での買い物など複数条件を満たせる人向けです。
                </p>
              </div>
              <a
                className="text-link"
                href={topOffer.officialUrl}
                rel="sponsored noopener noreferrer"
                target="_blank"
              >
                公式ページで確認
              </a>
            </div>
            <div className="runner-up-grid" aria-label="次点キャンペーン">
              {runnerUpOffers.map((offer, index) => (
                <div className="mini-result" key={offer.title}>
                  <span>{index + 2}位</span>
                  <strong>{formatPoints(offer.maxPoints)}pt</strong>
                  <p>{offer.title}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ranking-section" id="ranking" aria-labelledby="ranking-title">
            <div className="section-heading">
              <p className="section-label">ランキング</p>
              <h2 id="ranking-title">楽天モバイルSIMのみキャンペーン比較ランキング</h2>
              <p>
                順位は併用後の合計ではなく、個別キャンペーン単位の最大ポイントで並べています。条件が多いキャンペーンほど、申込前に公式ページの適用条件を確認してください。
              </p>
            </div>

            <div className="table-scroll" role="region" aria-label="ランキング比較表" tabIndex={0}>
              <table className="comparison-table">
                <thead>
                  <tr>
                    {comparisonColumns.map((column) => (
                      <th key={column} scope="col">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankedOffers.map((offer, index) => (
                    <tr key={offer.title}>
                      <td className="rank-cell">{index + 1}位</td>
                      <td>
                        <strong>{offer.title}</strong>
                        <span>{offer.period}</span>
                      </td>
                      <td className="points-cell">
                        {formatPoints(offer.maxPoints)}
                        <span>ポイント</span>
                      </td>
                      <td>{offer.target}</td>
                      <td>{offer.conditions.slice(0, 3).join(" / ")}</td>
                      <td>{offer.channel}</td>
                      <td>
                        <a
                          className="table-link"
                          href={offer.officialUrl}
                          rel="sponsored noopener noreferrer"
                          target="_blank"
                        >
                          公式
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="detail-section" id="details" aria-labelledby="details-title">
            <div className="section-heading">
              <p className="section-label">詳細</p>
              <h2 id="details-title">ランキング掲載キャンペーンの詳細</h2>
            </div>

            <div className="detail-list">
              {rankedOffers.map((offer, index) => (
                <section className="offer-detail" key={offer.title}>
                  <div className="offer-heading">
                    <div>
                      <span className="detail-rank">{index + 1}位</span>
                      <h3>{offer.title}</h3>
                      <p>{offer.target}</p>
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
                </section>
              ))}
            </div>
          </section>

          <section className="exclusions-band" aria-labelledby="excluded-title">
            <p className="section-label">対象外</p>
            <h2 id="excluded-title">ランキングから外したもの</h2>
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
