#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const LISTING_URL = "https://network.mobile.rakuten.co.jp/campaign/";
const CHECKED_AT = "2026-07-31";
const OUTPUT_DIRECTORY = path.resolve("data/campaigns");
const SUPPLEMENTAL_CAMPAIGN_FILENAMES = [
  "2162-campaign-referral-application-employee.campaign.json",
];

const cardCodes = new Map(
  Object.entries({
    "/campaign/mnp/": ["2091", "2142"],
    "/fee/unext/": ["3293", "3288"],
    "/campaign/iphone-discount/": ["2938"],
    "/campaign/android-discount/": ["2178"],
    "/campaign/iphone-point-iphone-17/": ["2568"],
    "/campaign/iphone-point-iphone-16e/": ["2938"],
    "/campaign/galaxy/": ["3303", "3304"],
    "/product/internet/rakuten-wifi-pocket-5g/": ["2808"],
    "/product/internet/rakuten-wifi-pocket-platinum/": ["1875"],
    "/campaign/shop-limited-application": ["2995", "2619"],
    "/product/iphone/iphone-16/": ["2938"],
    "/campaign/iphone-pointback/": ["2568"],
    "/campaign/shop-weekday-reservation/": ["2981"],
    "/campaign/referral/": ["1784"],
    "/campaign/senior-pointback/": ["2897"],
    "/campaign/fee-simulation/": ["2215"],
    "/guide/application/card-campaign/": ["1238"],
    "/campaign/tadaima/": ["2207"],
    "/campaign/shop-extra-sim/": ["2331"],
    "/campaign/shop-opening-commemoration/": ["2855"],
    "/campaign/android-sale/": ["2178"],
    "/campaign/shop-limited-android/": ["3186"],
    "/campaign/start-point/": ["1819", "2006"],
    "/product/rakuten-certified/": ["3297"],
    "/campaign/heyduggee/": ["3351"],
    "/campaign/shop-point/": ["3350"],
    "/internet/turbo/campaign/home-internet/": ["2698"],
    "/hikari/campaign/home-internet/": ["2697"],
    "/campaign/spu/": ["1173"],
    "/campaign/youtubepremium/": ["1680"],
    "/campaign/payment-google/": ["1922"],
    "/campaign/bank-member-campaign/": ["2660"],
    "/campaign/poitoku/": ["3141"],
    "/service/standard-free-call/": ["1977"],
    "/service/voice-mail/": ["2835"],
    "/service/call-waiting/": ["2834"],
    "/service/saikyo-protection/": ["2956"],
    "/service/whoscall/": ["3329"],
    "/service/anshin-control/": ["2833"],
    "/campaign/apple-watch-number-share/": ["2602"],
  }),
);

const meta = {
  "2091": {
    title:
      "【Rakuten最強プランはじめてお申し込み特典】他社から乗り換えでポイントプレゼント",
    points: { newNumber: null, mnp: 10000 },
    target: "楽天モバイルへ初めてMNPで申し込む方",
    conditions: ["初めての申し込み", "MNP", "要エントリー", "Rakuten Link利用"],
    channel: "Webまたは楽天モバイルショップ",
    category: "simOnly",
    audience: "applicant",
    period: "2024年11月1日 0:00 - 終了日未定",
  },
  "2142": {
    title:
      "【Rakuten最強プランはじめてお申し込み特典】新規ご契約でポイントプレゼント",
    points: { newNumber: 7000, mnp: null },
    target: "楽天モバイルへ初めて新しい電話番号で申し込む方",
    conditions: ["初めての申し込み", "新規契約", "要エントリー", "Rakuten Link利用"],
    channel: "Webまたは楽天モバイルショップ",
    category: "simOnly",
    audience: "applicant",
    period: "終了日未定",
  },
  "3293": {
    title: "Rakuten最強U-NEXT＋Uber コラボキャンペーン①",
    points: { newNumber: 5000, mnp: 5000 },
    target: "Rakuten最強U-NEXTを初めて利用する方",
    conditions: ["要エントリー", "Rakuten最強U-NEXTを初めて利用"],
    channel: "Webまたは楽天モバイルショップ",
    category: "service",
    audience: "both",
    period: "2026年6月1日 0:00 - 終了日未定",
  },
  "3288": {
    title: "Rakuten最強U-NEXT＋Uber コラボキャンペーン②",
    benefit: {
      type: "free",
      amount: 12,
      unit: "カ月",
      description: "Uber Oneを初回1年間無料で利用できます。",
    },
    target: "Uber Oneを初めて申し込むRakuten最強U-NEXT利用者",
    conditions: ["要エントリー", "Uber Oneを初めて申し込み"],
    category: "service",
    audience: "both",
    period: "2026年6月1日 0:00 - 終了日未定",
  },
  "2938": {
    title: "iPhone対象製品 特価キャンペーン",
    benefit: {
      type: "specialPrice",
      amount: 1,
      unit: "円/月〜",
      description: "対象iPhoneを楽天カード48回払いで月額1円から購入できます。",
    },
    target: "MNPと同時に対象iPhoneを48回払いで購入する方",
    conditions: ["MNP", "対象iPhone購入", "楽天カード48回払い"],
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "2025年9月8日 9:00 - 終了日未定",
  },
  "2178": {
    title: "【Android対象製品限定】特価キャンペーン",
    benefit: {
      type: "discount",
      amount: 22000,
      unit: "円",
      description: "対象Android製品を最大22,000円値引きします。",
    },
    target: "MNPと同時に対象Android製品を購入する方",
    conditions: ["MNP", "対象Android製品購入"],
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "2024年2月16日 9:00 - 終了日未定",
  },
  "2568": {
    title:
      "他社から乗り換えでRakuten最強プランご契約とiPhone対象製品を一括払いまたは24回払いで購入するキャンペーン",
    benefit: {
      type: "discount",
      amount: 20000,
      unit: "円",
      description: "対象iPhoneの購入代金を最大20,000円値引きします。",
    },
    target: "MNPと同時に対象iPhoneを一括または24回払いで購入する方",
    conditions: ["MNP", "初めての申し込み", "対象iPhone購入", "要エントリー"],
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "2024年11月21日 9:00 - 終了日未定",
  },
  "3303": {
    title:
      "Galaxyメガ得祭限定！Samsung Galaxy S26シリーズ購入＋MNPでポイント還元",
    points: { newNumber: null, mnp: 7000 },
    target: "MNPと同時にSamsung Galaxy S26シリーズを購入する方",
    conditions: ["MNP", "Samsung Galaxy S26シリーズ購入", "Rakuten Link利用"],
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "2026年6月10日 9:00 - 終了日未定",
  },
  "3304": {
    title:
      "Galaxyメガ得祭限定！Samsung Galaxy S26シリーズへの機種変更でポイント還元",
    points: { newNumber: null, mnp: null },
    benefit: {
      type: "points",
      amount: 7000,
      unit: "ポイント",
      description: "対象製品への機種変更で7,000ポイントを進呈します。",
    },
    target: "楽天モバイル利用中でSamsung Galaxy S26シリーズへ機種変更する方",
    conditions: ["要エントリー", "対象製品のみを購入", "楽天モバイル利用中"],
    category: "device",
    audience: "member",
    requiresDevicePurchase: true,
    period: "2026年6月10日 9:00 - 終了日未定",
  },
  "2808": {
    title: "Rakutenオリジナル製品 特価キャンペーン",
    benefit: {
      type: "discount",
      amount: 13810,
      unit: "円",
      description: "Rakuten WiFi Pocket 5Gは本体価格から13,810円値引きします。",
    },
    target: "楽天モバイル申し込みと同時に対象オリジナル製品を購入する方",
    conditions: ["対象製品購入", "1人1点まで"],
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "2025年5月1日 0:00 - 終了日未定",
  },
  "1875": {
    title: "Rakutenオリジナル製品 1円キャンペーン",
    benefit: {
      type: "specialPrice",
      amount: 1,
      unit: "円",
      description: "対象のモバイルルーターを1円で購入できます。",
    },
    target: "楽天モバイル申し込みと同時に対象モバイルルーターを購入する方",
    conditions: ["対象製品購入", "2回線目以降も対象"],
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "終了日未定",
  },
  "2995": {
    title: "【楽天モバイルショップ限定】初めてのお申し込みで3,000ポイント",
    points: { newNumber: 3000, mnp: 3000 },
    target: "楽天モバイルショップで初めて申し込む方",
    conditions: ["ショップ限定", "初めての申し込み"],
    channel: "楽天モバイルショップ",
    category: "simOnly",
    audience: "applicant",
    period: "終了日未定",
  },
  "2619": {
    title: "【楽天モバイルショップ限定】初めてのお申し込み＆楽天市場利用",
    points: { newNumber: 1000, mnp: 1000 },
    target: "ショップで初めて申し込み、楽天市場で条件を満たす買い物をする方",
    conditions: ["ショップ限定", "初めての申し込み", "楽天市場で1注文1,000円以上"],
    channel: "楽天モバイルショップ",
    category: "service",
    audience: "applicant",
    period: "終了日未定",
  },
  "2981": {
    title: "来店予約＆店頭でお見積もり＆アンケートに回答で1,000ポイント",
    codeType: "initiative",
    benefit: {
      type: "points",
      amount: 1000,
      unit: "ポイント",
      description: "来店予約、店頭見積もり、アンケート回答で1,000ポイントを進呈します。",
    },
    target: "楽天モバイルショップへの来店を検討している方",
    conditions: ["ショップ限定", "来店予約", "店頭見積もり", "アンケート回答"],
    channel: "楽天モバイルショップ",
    category: "memberBenefit",
    audience: "both",
    period: "2025年9月1日 開店 - 終了日未定",
  },
  "1784": {
    title: "【楽天モバイル】Rakuten最強プラン紹介キャンペーン",
    points: { newNumber: 17000, mnp: 20000 },
    target: "楽天モバイルを相互に紹介し合って申し込む方",
    conditions: ["紹介ログイン", "初めての申し込み", "Rakuten Link利用"],
    channel: "紹介URLまたは紹介QR",
    category: "simOnly",
    audience: "applicant",
    period: "2023年2月15日 7:00 - 終了日未定",
    notes: [
      "表示額は紹介者としての7,000ポイントと、被紹介者としてのMNP 13,000ポイントまたは新規10,000ポイントを同一人物がそれぞれ満たす場合の合計です。",
    ],
  },
  "2897": {
    title: "敬老キャンペーン（初めて申し込みと最強シニアプログラム加入）",
    points: { newNumber: 11748, mnp: 11748 },
    target: "65歳以上で楽天モバイルへ初めて申し込む方",
    conditions: ["65歳以上", "初めての申し込み", "最強シニアプログラム加入"],
    category: "service",
    audience: "applicant",
    period: "2025年6月17日 9:00 - 終了日未定",
  },
  "2215": {
    title: "スマホ料金をチェックするだけで100ポイントプレゼント",
    benefit: {
      type: "points",
      amount: 100,
      unit: "ポイント",
      description: "料金シミュレーション結果の確認で100ポイントを進呈します。",
    },
    target: "楽天モバイル未契約で料金シミュレーションを利用する方",
    conditions: ["楽天会員ログイン", "シミュレーション結果を確認"],
    category: "memberBenefit",
    audience: "applicant",
    period: "2024年2月1日 0:00 - 終了日未定",
  },
  "1238": {
    title: "楽天カード＋楽天モバイル同時申し込み特典",
    points: { newNumber: 3000, mnp: 3000 },
    target: "楽天カードと楽天モバイルを同時に申し込む方",
    conditions: ["楽天カード新規入会", "楽天モバイル初めての申し込み", "同一楽天ID"],
    category: "service",
    audience: "applicant",
    period: "常時開催",
  },
  "2207": {
    title: "楽天モバイルただいまキャンペーン",
    points: { newNumber: null, mnp: 2162 },
    target: "楽天モバイルを過去に利用し、MNPで再契約する方",
    conditions: ["過去利用者", "MNP", "Rakuten Link利用"],
    category: "simOnly",
    audience: "applicant",
    period: "2026年3月2日 9:00 - 終了日未定",
  },
  "2331": {
    title: "第2弾【ショップ限定】もう1回線お申し込みでポイント",
    points: { newNumber: 2000, mnp: 3000 },
    target: "楽天モバイルショップでもう1回線申し込む方",
    conditions: ["ショップ限定", "追加回線"],
    channel: "楽天モバイルショップ",
    category: "simOnly",
    audience: "member",
    period: "終了日未定",
  },
  "2855": {
    title: "【OPEN記念キャンペーン】ハズレなし！大抽選会",
    benefit: {
      type: "lottery",
      amount: 2000,
      unit: "円相当",
      description: "対象ショップでの見積もりにより最大2,000円相当の景品が当たります。",
    },
    target: "新規開店した対象ショップで見積もりをする方",
    conditions: ["ショップ限定", "対象店の開店から所定期間", "見積もり"],
    channel: "対象の楽天モバイルショップ",
    category: "memberBenefit",
    audience: "both",
    period: "2025年6月13日 開店 - 終了日未定",
  },
  "3186": {
    title: "【ショップ限定】18歳までのスマホデビュー応援キャンペーン",
    benefit: {
      type: "specialPrice",
      amount: 1,
      unit: "円",
      description: "新規申し込みと対象製品購入で製品価格が1円になります。",
    },
    target: "18歳までで、ショップから新規契約と対象製品購入をする方",
    conditions: ["ショップ限定", "18歳まで", "新規契約", "対象製品購入"],
    channel: "楽天モバイルショップ",
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "終了日未定",
  },
  "1819": {
    title: "iPhone 対象端末ポイントバックキャンペーン",
    points: { newNumber: 6000, mnp: 6000 },
    target: "楽天モバイル申し込みと同時に対象iPhoneを購入する方",
    conditions: ["対象iPhone購入", "Rakuten Link利用"],
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "終了日未定",
  },
  "2006": {
    title: "「Rakuten最強プラン」＋対象Android製品購入でポイント還元",
    points: { newNumber: 13000, mnp: 13000 },
    target: "楽天モバイル申し込みと同時に対象Android製品を購入する方",
    conditions: ["対象Android製品購入", "Rakuten Link利用"],
    category: "device",
    audience: "applicant",
    requiresDevicePurchase: true,
    period: "2023年8月31日 9:00 - 終了日未定",
    notes: ["対象製品によって進呈ポイント数が異なります。表示額は最大値です。"],
  },
  "3297": {
    title: "Rakuten認定中古製品キャンペーン",
    target: "楽天モバイルで認定中古スマートフォンを購入する方",
    conditions: ["Rakuten認定中古製品購入"],
    category: "device",
    audience: "both",
    requiresDevicePurchase: true,
    period: "終了日未定",
  },
  "3351": {
    title: "Rakuten最強U-NEXT「ヘイ！ダギー」キャンペーン",
    benefit: {
      type: "lottery",
      amount: 1000,
      unit: "ポイント",
      description: "グッズまたは楽天ポイント1,000ポイントが抽選で当たります。",
    },
    target: "Rakuten最強U-NEXTへ初めて申し込む方",
    conditions: ["要エントリー", "Rakuten最強U-NEXTを初めて申し込み"],
    category: "service",
    audience: "applicant",
    period: "終了日未定",
  },
  "3350": {
    title: "楽天モバイル契約者限定 対象店舗で楽天ポイント20倍",
    benefit: {
      type: "multiplier",
      amount: 20,
      unit: "倍",
      description: "対象店舗での楽天ポイント還元が通常の20倍になります。",
    },
    target: "楽天モバイル契約中で対象店舗を利用する方",
    conditions: ["要エントリー", "楽天モバイル契約中", "対象店舗で買い物"],
    category: "memberBenefit",
    audience: "member",
    period: "終了日未定",
  },
  "2698": {
    title: "Rakuten Turboと楽天モバイルの最強おうちプログラム",
    benefit: {
      type: "recurringPoints",
      amount: 1000,
      unit: "ポイント/月",
      description: "条件を満たす間、毎月1,000ポイントを還元します。",
    },
    target: "Rakuten Turboを初めて申し込み、楽天モバイルを利用する方",
    conditions: ["Rakuten Turbo初回申し込み", "楽天モバイル利用中"],
    category: "homeInternet",
    audience: "both",
    period: "2025年3月4日 9:00 - 終了日未定",
  },
  "2697": {
    title: "楽天ひかりと楽天モバイルの最強おうちプログラム",
    benefit: {
      type: "recurringPoints",
      amount: 1000,
      unit: "ポイント/月",
      description: "条件を満たす間、毎月1,000ポイントを還元します。",
    },
    target: "楽天ひかりを初めて申し込み、楽天モバイルを利用する方",
    conditions: ["楽天ひかり初回申し込み", "楽天モバイル利用中"],
    category: "homeInternet",
    audience: "both",
    period: "2025年3月4日 9:00 - 終了日未定",
  },
  "1173": {
    title: "SPU（楽天モバイル）",
    benefit: {
      type: "multiplier",
      amount: 5,
      unit: "倍",
      description: "楽天市場での買い物が楽天会員通常分と合わせて最大5倍になります。",
    },
    target: "楽天モバイル契約中で楽天市場を利用する方",
    conditions: ["要エントリー", "楽天モバイル契約中", "楽天市場利用"],
    category: "memberBenefit",
    audience: "member",
    period: "常時開催",
  },
  "1680": {
    title: "YouTube Premium 3カ月無料キャンペーン",
    benefit: {
      type: "free",
      amount: 3,
      unit: "カ月",
      description: "YouTube Premiumを3カ月無料で利用できます。",
    },
    target: "楽天モバイル契約中でYouTube Premiumを初めて利用する方",
    conditions: ["YouTube Premiumを初めて利用", "楽天モバイル契約中"],
    category: "memberBenefit",
    audience: "member",
    period: "2023年5月16日 9:00 - 終了日未定",
  },
  "1922": {
    title: "楽天モバイルキャリア決済利用で1％ポイント還元",
    benefit: {
      type: "percentage",
      amount: 1,
      unit: "%",
      description: "Google Playでのキャリア決済利用額の1％をポイント還元します。",
    },
    target: "Androidで楽天モバイルキャリア決済を利用する方",
    conditions: ["Android", "Google Play", "楽天モバイルキャリア決済"],
    category: "memberBenefit",
    audience: "member",
    period: "2023年7月1日 0:00 - 終了日未定",
  },
  "2660": {
    title: "楽天銀行会員向け 楽天モバイル初めて申し込み特典",
    points: { newNumber: 3000, mnp: 3000 },
    target: "楽天銀行会員で楽天モバイルへ初めて申し込む方",
    conditions: ["楽天銀行会員", "要エントリー", "初めての申し込み"],
    category: "service",
    audience: "applicant",
    period: "常時開催",
    notes: ["公式一覧の最大13,000ポイント表記は、MNP基本特典10,000ポイントとの併用時です。"],
  },
  "3141": {
    title: "楽天モバイル月額料金への初回ポイント利用で還元率3倍",
    benefit: {
      type: "multiplier",
      amount: 3,
      unit: "倍",
      description: "月額料金への初めてのポイント利用分に対する還元率が3倍になります。",
    },
    target: "楽天モバイル月額料金に初めて楽天ポイントを利用する方",
    conditions: ["要エントリー", "月額料金に初めてポイント利用"],
    category: "memberBenefit",
    audience: "member",
    period: "毎月開催",
  },
  "1977": {
    title: "15分（標準）通話かけ放題 料金1カ月無料特典",
    benefit: {
      type: "free",
      amount: 1,
      unit: "カ月",
      description: "15分（標準）通話かけ放題の月額料金が初回1カ月無料になります。",
    },
    target: "対象オプションを初めて申し込む方",
    conditions: ["15分（標準）通話かけ放題を初めて申し込み"],
    category: "option",
    audience: "both",
    period: "2023年9月1日 0:00 - 終了日未定",
  },
  "2835": {
    title: "留守番電話オプション 初回1カ月無料キャンペーン",
    benefit: {
      type: "free",
      amount: 1,
      unit: "カ月",
      description: "留守番電話オプションの月額料金が初回1カ月無料になります。",
    },
    target: "留守番電話オプションを初めて申し込む方",
    conditions: ["留守番電話を初めて申し込み"],
    category: "option",
    audience: "both",
    period: "2025年6月19日 0:00 - 終了日未定",
  },
  "2834": {
    title: "割込通話オプション 初回1カ月無料キャンペーン",
    benefit: {
      type: "free",
      amount: 1,
      unit: "カ月",
      description: "割込通話オプションの月額料金が初回1カ月無料になります。",
    },
    target: "割込通話オプションを初めて申し込む方",
    conditions: ["割込通話を初めて申し込み"],
    category: "option",
    audience: "both",
    period: "2025年6月19日 0:00 - 終了日未定",
  },
  "2956": {
    title: "最強保護 3カ月無料キャンペーン",
    benefit: {
      type: "free",
      amount: 3,
      unit: "カ月",
      description: "最強保護の対象サービスを初回3カ月無料で利用できます。",
    },
    target: "最強保護を初めて申し込む方",
    conditions: ["最強保護を初めて申し込み"],
    category: "option",
    audience: "both",
    period: "2025年8月26日 0:00 - 終了日未定",
  },
  "3329": {
    title: "迷惑電話・SMS対策 by Whoscall 初回3カ月無料",
    benefit: {
      type: "free",
      amount: 3,
      unit: "カ月",
      description: "対象オプションを初回3カ月無料で利用できます。",
    },
    target: "迷惑電話・SMS対策 by Whoscallを初めて申し込む方",
    conditions: ["対象オプションを初めて申し込み"],
    category: "option",
    audience: "both",
    period: "2026年6月17日 0:00 - 終了日未定",
  },
  "2833": {
    title: "あんしんコントロール 3カ月無料キャンペーン",
    benefit: {
      type: "free",
      amount: 3,
      unit: "カ月",
      description: "あんしんコントロールを初回3カ月無料で利用できます。",
    },
    target: "あんしんコントロールを初めて申し込む方",
    conditions: ["対象オプションを初めて申し込み"],
    category: "option",
    audience: "both",
    period: "2025年9月25日 0:00 - 終了日未定",
  },
  "2602": {
    title: "Apple Watch購入＆電話番号シェアサービス加入キャンペーン",
    points: { newNumber: 25000, mnp: 25000 },
    target: "Webで対象Apple Watchを購入し、電話番号シェアサービスへ加入する方",
    conditions: ["要エントリー", "Web限定", "対象Apple Watch購入", "電話番号シェアサービス加入"],
    channel: "Web",
    category: "device",
    audience: "both",
    requiresDevicePurchase: true,
    period: "2025年1月27日 9:00 - 終了日未定",
  },
};

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(href) {
  const url = new URL(decodeHtml(href), LISTING_URL);
  url.search = "";
  url.hash = "";
  return url;
}

function generatedCode(url) {
  const host = url.hostname.replace(/^www\./, "").split(".")[0];
  const pathPart =
    url.pathname
      .split("/")
      .filter(Boolean)
      .slice(-3)
      .join("-") || "top";
  return `NO-CODE-${host}-${pathPart}`
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .toUpperCase();
}

function fileSlug(url) {
  return (
    url.pathname
      .split("/")
      .filter(Boolean)
      .slice(-2)
      .join("-")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "campaign"
  );
}

function parseCards(html) {
  const start = html.indexOf(
    'href="/campaign/member/?l-id=campaign_campaign_member"',
  );
  const end = html.indexOf("過去のキャンペーン・特典はこちら", start);
  if (start < 0 || end < 0) {
    throw new Error("公式一覧のキャンペーン領域を検出できませんでした。");
  }

  const section = html.slice(start, end);
  return [...section.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map((match) => {
      const alt = match[2].match(/<img[^>]+alt="([^"]*)"/)?.[1] ?? "";
      const descriptions = [...match[2].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
        .map((item) => textContent(item[1]))
        .filter(Boolean);
      return {
        url: cleanUrl(match[1]),
        title: textContent(alt) || descriptions[0] || "名称未取得",
        description: descriptions.join(" "),
        raw: textContent(match[2]),
      };
    })
    .filter((card) => card.url.pathname !== "/campaign/member/");
}

function sourceNote(codeType) {
  if (codeType === "generated") {
    return "リンク先に公式コードの記載がないため、URLから生成した補助コードです。";
  }
  if (codeType === "initiative") {
    return "公式ページでは「施策コード」として案内されています。";
  }
  return "公式ページに掲載されたキャンペーンコードです。";
}

function campaignFrom(code, card, listingIndex) {
  const details = meta[code] ?? {};
  const codeType =
    details.codeType ?? (code.startsWith("NO-CODE-") ? "generated" : "campaign");
  const points = details.points ?? { newNumber: null, mnp: null };
  const fallbackDescription = card.description || card.title;
  const pointValues = Object.values(points).filter(
    (value) => typeof value === "number",
  );
  const benefit =
    details.benefit ??
    (pointValues.length > 0
      ? {
          type: "points",
          amount: Math.max(...pointValues),
          unit: "ポイント",
          description: `最大${Math.max(...pointValues).toLocaleString("ja-JP")}ポイントを進呈します。`,
        }
      : {
          type: "other",
          amount: null,
          unit: null,
          description: fallbackDescription,
        });
  const conditions = details.conditions ?? [
    card.raw.includes("要エントリー") ? "要エントリー" : "公式ページで条件確認",
  ];
  const title = details.title ?? card.title.replace(/^【要エントリー】\s*/, "");
  const notes = [sourceNote(codeType), ...(details.notes ?? [])];

  return {
    campaignCode: code,
    codeType,
    title,
    summary: fallbackDescription,
    benefit,
    points,
    breakdown: {
      newNumber:
        typeof points.newNumber === "number"
          ? [`最大${points.newNumber.toLocaleString("ja-JP")}ポイント`]
          : null,
      mnp:
        typeof points.mnp === "number"
          ? [`最大${points.mnp.toLocaleString("ja-JP")}ポイント`]
          : null,
    },
    target: details.target ?? "公式ページに記載された条件を満たす方",
    conditions,
    channel: details.channel ?? "公式ページ参照",
    category: details.category ?? "other",
    audience: details.audience ?? "both",
    period:
      details.period ??
      "2026年7月31日時点で公式一覧に掲載中（終了日は公式ページ参照）",
    officialUrl: card.url.href,
    listingUrl: LISTING_URL,
    checkedAt: CHECKED_AT,
    notes,
    requiresDevicePurchase: details.requiresDevicePurchase ?? false,
    rankingEligible:
      typeof points.newNumber === "number" || typeof points.mnp === "number",
    sourceCards: [
      {
        listingIndex,
        title: card.title,
        description: card.description,
        url: card.url.href,
      },
    ],
  };
}

async function main() {
  const response = await fetch(LISTING_URL, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`公式一覧の取得に失敗しました: HTTP ${response.status}`);
  }

  const cards = parseCards(await response.text());
  if (cards.length !== 52) {
    throw new Error(
      `公式一覧の件数が想定と異なります: expected=52 actual=${cards.length}`,
    );
  }

  const campaignsByCode = new Map();
  cards.forEach((card, index) => {
    const codes = cardCodes.get(card.url.pathname) ?? [
      generatedCode(card.url),
    ];
    for (const code of codes) {
      const campaign = campaignFrom(code, card, index + 1);
      const existing = campaignsByCode.get(code);
      if (existing) {
        existing.sourceCards.push(...campaign.sourceCards);
        if (!existing.officialUrl.startsWith("https://network.mobile.rakuten.co.jp")) {
          existing.officialUrl = campaign.officialUrl;
        }
      } else {
        campaignsByCode.set(code, campaign);
      }
    }
  });

  const campaigns = [...campaignsByCode.values()].sort((a, b) =>
    a.campaignCode.localeCompare(b.campaignCode, "en"),
  );
  const filenames = [];

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  for (const campaign of campaigns) {
    const filename = `${campaign.campaignCode.toLowerCase()}-${fileSlug(
      new URL(campaign.officialUrl),
    )}.campaign.json`;
    filenames.push(filename);
    await writeFile(
      path.join(OUTPUT_DIRECTORY, filename),
      `${JSON.stringify(campaign, null, 2)}\n`,
      "utf8",
    );
  }

  const supplementalCampaigns = await Promise.all(
    SUPPLEMENTAL_CAMPAIGN_FILENAMES.map(async (filename) => ({
      filename,
      campaign: JSON.parse(
        await readFile(path.join(OUTPUT_DIRECTORY, filename), "utf8"),
      ),
    })),
  );
  const generatedCodes = new Set(
    campaigns.map(({ campaignCode }) => campaignCode),
  );
  for (const { filename, campaign } of supplementalCampaigns) {
    if (generatedCodes.has(campaign.campaignCode)) {
      throw new Error(
        `${filename}: 公式一覧から生成したキャンペーンコード ${campaign.campaignCode} と重複しています`,
      );
    }
  }

  const allFilenames = [
    ...filenames,
    ...supplementalCampaigns.map(({ filename }) => filename),
  ].sort((a, b) => a.localeCompare(b, "en"));
  const campaignCount = campaigns.length + supplementalCampaigns.length;
  const index = {
    listingUrl: LISTING_URL,
    checkedAt: CHECKED_AT,
    listingCardCount: cards.length,
    campaignCount,
    items: allFilenames,
  };
  await writeFile(
    path.join(OUTPUT_DIRECTORY, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `楽天モバイル公式一覧 ${cards.length}枚と補足${supplementalCampaigns.length}件を ${campaignCount}キャンペーンへ正規化しました。`,
  );
}

await main();
