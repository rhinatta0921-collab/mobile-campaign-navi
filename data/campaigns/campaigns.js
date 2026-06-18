const CAMPAIGNS = [
  {
    id: "rakuten_referral",
    carrier: "楽天モバイル",
    name: "楽天モバイル紹介キャンペーン",
    description: "紹介リンクからの申し込みで、条件達成後にポイント還元を受けられるキャンペーンです。",
    points: 14000,
    imageLabel: "楽天モバイル紹介キャンペーン",
    imageIcon: "phone",
    url: "https://network.mobile.rakuten.co.jp/campaign/referral/",
    endDate: "2099-12-31",
    deadlineLabel: "終了日未定",
    combination: [
      { name: "楽天モバイル紹介キャンペーン", points: 14000 },
    ],
    conditions: [
      "他社からの乗り換え（MNP）でRakuten最強プランを申し込み",
      "紹介リンクからの申し込み",
    ],
    scoring: [
      { questionId: "application_status", values: ["mnp"], score: 50 },
      { questionId: "contract_type", values: ["personal"], score: 20 },
      { questionId: "application_method", values: ["referral"], score: 40 },
      { questionId: "conditions", values: ["first_time", "want_points"], score: 30 },
    ]
  },
  {
    id: "rakuten_mnp",
    carrier: "楽天モバイル",
    name: "楽天モバイル乗り換えキャンペーン",
    description: "他社からの乗り換えでRakuten最強プランを申し込む方向けのポイント還元です。",
    points: 10000,
    imageLabel: "楽天モバイル乗り換えキャンペーン",
    imageIcon: "coins",
    url: "https://network.mobile.rakuten.co.jp/campaign/",
    endDate: "2099-12-31",
    deadlineLabel: "終了日未定",
    combination: [
      { name: "楽天モバイル乗り換えキャンペーン", points: 10000 },
    ],
    conditions: [
      "他社からの乗り換え（MNP）でRakuten最強プランを申し込み",
    ],
    scoring: [
      { questionId: "application_status", values: ["mnp"], score: 45 },
      { questionId: "application_method", values: ["online", "shop"], score: 10 },
      { questionId: "conditions", values: ["first_time", "want_points"], score: 25 },
    ]
  },
  {
    id: "iphone_points",
    carrier: "楽天モバイル",
    name: "iPhone対象製品ポイントバックキャンペーン",
    description: "対象のiPhone購入とプラン申し込みを検討している方向けのキャンペーンです。",
    points: 6000,
    imageLabel: "iPhone対象製品ポイントバックキャンペーン",
    imageIcon: "phone",
    url: "https://network.mobile.rakuten.co.jp/product/iphone/",
    endDate: "2099-12-31",
    deadlineLabel: "終了日未定",
    combination: [
      { name: "iPhone対象製品ポイントバックキャンペーン", points: 6000 },
    ],
    conditions: [
      "対象のiPhoneを購入し、Rakuten最強プランを申し込み",
    ],
    scoring: [
      { questionId: "purchase_plan", values: ["iphone"], score: 55 },
      { questionId: "application_status", values: ["new", "mnp"], score: 15 },
      { questionId: "conditions", values: ["want_points"], score: 15 },
    ]
  },
  {
    id: "new_contract",
    carrier: "楽天モバイル",
    name: "楽天モバイル新規ご契約特典",
    description: "新規でRakuten最強プランを申し込む方向けのポイント還元です。",
    points: 3000,
    imageLabel: "楽天モバイル新規ご契約特典",
    imageIcon: "gift",
    url: "https://network.mobile.rakuten.co.jp/campaign/",
    endDate: "2099-12-31",
    deadlineLabel: "終了日未定",
    combination: [
      { name: "楽天モバイル新規ご契約特典", points: 3000 },
    ],
    conditions: [
      "新規でRakuten最強プランを申し込み",
    ],
    scoring: [
      { questionId: "application_status", values: ["new"], score: 50 },
      { questionId: "contract_type", values: ["personal"], score: 15 },
      { questionId: "conditions", values: ["first_time"], score: 20 },
    ]
  },
  {
    id: "call_option",
    carrier: "楽天モバイル",
    name: "15分（標準）通話かけ放題料金1カ月無料特典",
    description: "通話オプションを使いたい方向けのオプション特典です。",
    points: 1100,
    imageLabel: "15分（標準）通話かけ放題",
    imageIcon: "phone",
    url: "https://network.mobile.rakuten.co.jp/service/call-unlimited/",
    endDate: "2099-12-31",
    deadlineLabel: "終了日未定",
    combination: [
      { name: "15分（標準）通話かけ放題特典", points: 1100 },
    ],
    conditions: [
      "15分（標準）通話かけ放題オプションを申し込み",
    ],
    scoring: [
      { questionId: "conditions", values: ["call_option"], score: 60 },
      { questionId: "application_status", values: ["new", "mnp", "using"], score: 10 },
    ]
  },
];
