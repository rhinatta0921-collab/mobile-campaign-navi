const CAMPAIGNS = [
  {
    id: "campaign_001",
    carrier: "楽天モバイル",
    name: "乗り換えで14,000円キャッシュバック【ダミー】",
    description: "他社から乗り換えで最大14,000円キャッシュバック！初めての方限定。",
    url: "https://www.rakuten.co.jp/mobile/",
    endDate: "2099-12-31", // ← テスト用に遠い未来の日付
    scoring: [
      { questionId: "current_carrier", values: ["docomo", "au", "softbank", "mvno"], score: 30 },
      { questionId: "priorities",      values: ["cashback"], score: 40 },
      { questionId: "priorities",      values: ["price"],    score: 20 },
    ]
  },
  {
    id: "campaign_002",
    carrier: "ドコモ",
    name: "家族割で月額1,100円引き【ダミー】",
    description: "家族3人以上でご利用で月額1,100円割引。",
    url: "https://www.docomo.ne.jp/",
    endDate: "2099-12-31",
    scoring: [
      { questionId: "priorities", values: ["family"], score: 50 },
      { questionId: "priorities", values: ["price"],  score: 20 },
    ]
  },
  {
    id: "campaign_003",
    carrier: "au",
    name: "端末購入で最大30,000円割引【ダミー】",
    description: "対象機種への乗り換えで最大30,000円割引。",
    url: "https://www.au.com/",
    endDate: "2020-01-01", // ← 期限切れテスト用（表示されないことを確認）
    scoring: [
      { questionId: "priorities", values: ["device"],   score: 50 },
      { questionId: "priorities", values: ["cashback"], score: 20 },
    ]
  },
];
