const QUESTIONS = [
  {
    id: "conditions",
    type: "radio",
    text: "楽天モバイルへの申し込みは初めて？",
    required: true,
    options: [
      { value: "first_time", label: "初めて" },
      { value: "repeat", label: "2回目以降" },
    ]
  },
  {
    id: "application_status",
    type: "radio",
    text: "他社からの乗り換えですか？",
    required: true,
    options: [
      { value: "mnp", label: "電話番号そのままで他社から乗り換え" },
      { value: "new", label: "楽天モバイルで新しい電話番号を取得" },
    ]
  },
  {
    id: "purchase_plan",
    type: "radio",
    text: "端末の購入も考えていますか？",
    required: true,
    options: [
      { value: "iphone", label: "iphone" },
      { value: "android", label: "Android" },
      { value: "sim_only", label: "考えていない" },
    ]
  },
  {
    id: "rakuten_card",
    type: "radio",
    text: "楽天カードはお持ちですか？",
    required: true,
    options: [
      { value: "has_card", label: "持っている" },
      { value: "no_card", label: "持っていない" },
    ]
  },
  {
    id: "application_method",
    type: "radio",
    text: "楽天モバイルの申し込みはどちらで行いますか？",
    required: true,
    options: [
      { value: "shop", label: "店舗から" },
      { value: "online", label: "Webから" },
    ]
  },
];
