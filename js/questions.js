const QUESTIONS = [
  {
    id: "current_carrier",
    type: "radio",
    text: "現在ご利用中のキャリアは？",
    required: true,
    options: [
      { value: "docomo",   label: "ドコモ" },
      { value: "au",       label: "au" },
      { value: "softbank", label: "ソフトバンク" },
      { value: "rakuten",  label: "楽天モバイル" },
      { value: "mvno",     label: "格安SIM（MVNO）" },
    ]
  },
  {
    id: "priorities",
    type: "checkbox",
    text: "重視することをすべて選んでください",
    required: false,
    options: [
      { value: "price",    label: "月額料金を安くしたい" },
      { value: "data",     label: "データ容量を増やしたい" },
      { value: "cashback", label: "キャッシュバックが欲しい" },
      { value: "device",   label: "端末を安く買いたい" },
      { value: "family",   label: "家族割を使いたい" },
    ]
  },
];
