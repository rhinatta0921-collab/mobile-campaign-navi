const QUESTIONS = [
  {
    id: "application_status",
    type: "radio",
    text: "申し込み状況",
    required: true,
    options: [
      { value: "new", label: "これから申し込む" },
      { value: "mnp", label: "他社から乗り換え（MNP）" },
      { value: "using", label: "楽天モバイルを利用中" },
    ]
  },
  {
    id: "contract_type",
    type: "radio",
    text: "契約種別",
    required: true,
    options: [
      { value: "personal", label: "個人" },
      { value: "business", label: "法人" },
      { value: "plan_change", label: "楽天モバイル（ドコモ回線・au回線）からのプラン変更" },
    ]
  },
  {
    id: "purchase_plan",
    type: "radio",
    text: "購入予定",
    required: true,
    options: [
      { value: "sim_only", label: "SIMのみ" },
      { value: "iphone", label: "iPhoneも購入する" },
      { value: "android", label: "Android製品も購入する" },
      { value: "undecided", label: "まだ決めていない" },
    ]
  },
  {
    id: "application_method",
    type: "radio",
    text: "申し込み方法",
    required: true,
    options: [
      { value: "online", label: "オンラインで申し込む" },
      { value: "shop", label: "店舗で相談したい" },
      { value: "referral", label: "紹介リンクから申し込む" },
    ]
  },
  {
    id: "conditions",
    type: "checkbox",
    text: "あてはまる条件（複数選択可）",
    required: false,
    options: [
      { value: "first_time", label: "楽天モバイルを初めて申し込む" },
      { value: "want_points", label: "ポイント還元を重視したい" },
      { value: "call_option", label: "15分（標準）通話かけ放題を使いたい" },
      { value: "family", label: "家族も一緒に検討している" },
      { value: "student", label: "学生・若年層向けの特典も知りたい" },
    ]
  },
];
