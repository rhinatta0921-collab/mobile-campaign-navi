import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/munou/work/mobile-campaign-navi/outputs/019fbdb1-5d33-75d1-96b8-f3dddb79fbcb";
const outputPath = `${outputDir}/rakuten_mobile_campaigns_20260801.xlsx`;
const indexPath = "/tmp/rakuten_campaign_index.html";
const checkedAt = "2026-08-01 23:22 JST";
const checkedDate = new Date(2026, 7, 1);
const listUrl = "https://network.mobile.rakuten.co.jp/campaign/";

const d = (iso) => {
  if (!iso) return null;
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
};

const detailHeaders = [
  "キャンペーンコード", "タイトル", "ポイント数（MNP）", "ポイント数（新規電話番号）",
  "特典_ポイント", "特典_端末値引き", "特典_端末特価", "特典_月額無料", "特典_ポイント倍率", "特典_抽選", "特典_その他",
  "対象_MNP", "対象_新規電話番号", "対象_再契約", "対象_追加回線", "対象_既存契約者", "対象_プラン変更",
  "スマホ本体購入必須", "対象製品", "対象プラン", "申込チャネル", "エントリー必須", "Rakuten Link必須", "ポイント受取手続き必須",
  "その他条件", "併用可否", "併用不可キャンペーンコード", "キャンペーン開催日", "キャンペーン終了予定日", "終了日区分", "公式URL", "最終確認日",
];

const R = (x) => ({
  code: "", title: "", mnpPoints: null, newPoints: null,
  point: false, deviceDiscount: false, deviceSpecial: false, monthlyFree: false, multiplier: false, lottery: false, other: false,
  mnp: false, newNumber: false, recontract: false, extraLine: false, existing: false, planChange: false,
  smartphoneRequired: false, products: "", plans: "", channel: "", entry: false, link: false, receive: false,
  conditions: "", combine: "要確認", incompatible: "", start: null, end: null, endType: "終了日未定", url: "",
  ...x,
});

const standardPlans = "Rakuten最強プラン、Rakuten最強U-NEXT（データタイプは原則対象外）";

const details = [
  R({code:"2091",title:"【Rakuten最強プランはじめてお申し込み特典】他社から乗り換えでポイントプレゼント",mnpPoints:10000,point:true,mnp:true,plans:standardPlans,channel:"Web／楽天モバイル公式 楽天市場店／楽天モバイルショップ",entry:true,link:true,receive:true,conditions:"楽天回線を初めて申し込み。Webは事前エントリーと同月内申込、翌月末までの利用開始・Rakuten Linkで10秒以上通話が必要。ショップはエントリー不要。",combine:"条件付き",start:"2023-11-01",url:"https://network.mobile.rakuten.co.jp/campaign/mnp/"}),
  R({code:"2142",title:"【Rakuten最強プランはじめてお申し込み特典】新規ご契約でポイントプレゼント",newPoints:7000,point:true,newNumber:true,planChange:true,plans:standardPlans,channel:"Web／楽天モバイル公式 楽天市場店／楽天モバイルショップ",entry:true,link:true,receive:true,conditions:"楽天回線を初めて申し込み。新規電話番号または対象の旧料金プランからの移行。Webは事前エントリーと同月内申込、翌月末までの利用開始・Rakuten Linkで10秒以上通話が必要。",combine:"条件付き",start:"2023-11-21",url:"https://network.mobile.rakuten.co.jp/campaign/mnp/"}),
  R({code:"3293",title:"Rakuten最強U-NEXT＋Uber コラボキャンペーン① 初めての利用で5,000ポイント",mnpPoints:5000,newPoints:5000,point:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",entry:true,conditions:"Rakuten最強U-NEXTを初めて申し込み・利用開始。利用開始月末までにエントリーし、所定の利用条件を継続して満たす。",combine:"要確認",start:"2026-06-01",url:"https://network.mobile.rakuten.co.jp/fee/unext/"}),
  R({code:"3288",title:"Rakuten最強U-NEXT＋Uber コラボキャンペーン② Uber One 初回1年間無料",monthlyFree:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",entry:true,conditions:"Rakuten最強U-NEXTを初めて申し込み・利用開始。利用開始月末までにエントリーし、案内メールの期限内にUber Oneを申し込む。",combine:"要確認",start:"2026-06-01",url:"https://network.mobile.rakuten.co.jp/fee/unext/"}),
  R({code:"2939",title:"【U-NEXTご利用者様限定】最強U-NEXTへの切り替えキャンペーン",mnpPoints:2189,newPoints:2189,point:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",conditions:"Rakuten最強U-NEXT利用開始時点でU-NEXT月額プランの課金が確認でき、翌月末までにU-NEXT側の利用を切り替える。",combine:"要確認",start:"2025-10-01",url:"https://network.mobile.rakuten.co.jp/fee/unext/"}),
  R({code:"2938",title:"超おトク！Rakuten最強プラン契約＆iPhone買い替え超トクプログラム利用 特価キャンペーン",deviceSpecial:true,mnp:true,smartphoneRequired:true,products:"iPhone 16e 128GB、iPhone 16 128GB、iPhone 17e 256GB",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ",conditions:"MNPでプラン申込と同時に対象iPhoneを買い替え超トクプログラムで購入。24カ月支払総額は対象機種により24円または12,000円。1人1点、過去の多数解約者は対象外。",combine:"条件付き",start:"2025-09-08",url:"https://network.mobile.rakuten.co.jp/campaign/iphone-discount/"}),
  R({code:"1819",title:"iPhone 対象端末ポイントバックキャンペーン",mnpPoints:6000,newPoints:6000,point:true,mnp:true,newNumber:true,planChange:true,smartphoneRequired:true,products:"iPhone 17 Pro Max、17 Pro、Air、17、17e、16 Pro Max、16 Pro、16 Plus、16、16e",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ",link:true,conditions:"プラン申込と対象iPhone購入、期限内の利用開始・Rakuten Linkで10秒以上通話。楽天回線を初めて申し込む方が対象。",combine:"条件付き",incompatible:"1784,2006",start:"2023-02-15",url:"https://network.mobile.rakuten.co.jp/campaign/iphone-pointback/"}),
  R({code:"2926",title:"iPhone購入＆対象のiPhone下取りで5,000ポイント還元キャンペーン",point:true,existing:true,smartphoneRequired:true,products:"購入：iPhone 17 Pro Max、17 Pro、Air、17、17e、16 Pro Max、16 Pro、16 Plus、16、16e。別途、指定iPhoneを下取り",plans:"プラン申込は必須条件ではない",channel:"楽天モバイルオンライン／楽天モバイルショップ",conditions:"対象iPhone購入後、翌々月末までにスマホ下取りサービスを申し込み、購入後3カ月末までに査定成立。18歳以上。",combine:"条件付き",incompatible:"2568,2848,2938",start:"2025-09-12",url:"https://network.mobile.rakuten.co.jp/campaign/iphone-pointback/"}),
  R({code:"2178",title:"【Android対象製品限定】特価キャンペーン",deviceDiscount:true,mnp:true,smartphoneRequired:true,products:"AQUOS sense9、Phone (3a) 128GB、Samsung Galaxy A25 5G、OPPO A5 5G、nubia S2R",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ",conditions:"MNPでプラン申込と同時に対象Androidを購入。端末本体価格から22,000円割引。1人1点。",combine:"条件付き",start:"2024-02-16",url:"https://network.mobile.rakuten.co.jp/campaign/android-discount/"}),
  R({code:"2568",title:"MNPでプラン契約＋iPhone対象製品を一括／24回払い購入で割引",deviceDiscount:true,mnp:true,smartphoneRequired:true,products:"iPhone 17 256GB/512GB、iPhone 16 Pro 128GB/256GB、iPhone 16 128GB/256GB、iPhone 16e 128GB/256GB/512GB",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ",conditions:"MNPでプラン申込と同時に対象iPhoneを一括または24回払いで購入。20,000円割引。",combine:"条件付き",incompatible:"2926",start:"2024-11-21",url:"https://network.mobile.rakuten.co.jp/campaign/iphone-point-iphone-17/"}),
  R({code:"2848",title:"Rakuten最強プラン契約＆iPhone買い替え超トクプログラム利用 特価キャンペーン",deviceSpecial:true,mnp:true,newNumber:true,planChange:true,smartphoneRequired:true,products:"iPhone 16e 256GB、iPhone 16e 512GB",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ",conditions:"新規・MNP・対象旧プラン移行で、プラン申込と同時に対象製品を買い替え超トクプログラム購入。24カ月支払総額は30,312円または44,760円。",combine:"条件付き",start:"2025-06-03",url:"https://network.mobile.rakuten.co.jp/campaign/iphone-point-iphone-16e/"}),
  R({code:"2744",title:"MNPでプラン契約＋iPhone対象製品を一括／24回払い購入で20,000ポイント",mnpPoints:20000,point:true,mnp:true,smartphoneRequired:true,products:"iPhone 16e",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ／楽天モバイル公式 楽天市場店",link:true,conditions:"楽天回線を初めてMNPで申し込み、同時にiPhone 16eを一括または24回払いで購入。翌月末までの利用開始・Rakuten Linkで10秒以上通話。",combine:"条件付き",start:"2025-02-21",url:"https://network.mobile.rakuten.co.jp/campaign/iphone-point-iphone-16e/"}),
  R({code:"2006",title:"Rakuten最強プラン＋対象Android製品購入でポイント還元",mnpPoints:6000,newPoints:6000,point:true,mnp:true,newNumber:true,planChange:true,smartphoneRequired:true,products:"AQUOS sense9/wish5/sense10/R10、Phone (3a)/(3a) Lite/(4a) Pro、OPPO Reno13 A/A5 5G/Reno15 A、Galaxy A25 5G/S26シリーズ/Z Flip8/Z Fold8シリーズ、arrows Alpha/We3、nubia S2R、Google Pixel 10シリーズほか公式記載製品",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ",link:true,conditions:"プラン申込と同時に対象Androidを購入し、翌月末までに利用開始・Rakuten Linkで10秒以上通話。",combine:"条件付き",start:"2023-08-31",url:"https://network.mobile.rakuten.co.jp/campaign/galaxy/"}),
  R({code:"3303",title:"Galaxyメガ得祭限定！Galaxy S26シリーズ購入＋MNPでポイント還元",mnpPoints:7000,point:true,mnp:true,smartphoneRequired:true,products:"Samsung Galaxy S26、S26+、S26 Ultra",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ",link:true,conditions:"MNPでプラン申込と同時に対象製品を購入し、翌月末までに利用開始・Rakuten Linkで10秒以上通話。1人1回。",combine:"併用不可",incompatible:"3304",start:"2026-06-10",url:"https://network.mobile.rakuten.co.jp/campaign/galaxy/"}),
  R({code:"3304",title:"Galaxyメガ得祭限定！Galaxy S26シリーズへの機種変更でポイント還元",point:true,existing:true,smartphoneRequired:true,products:"Samsung Galaxy S26、S26+、S26 Ultra",plans:"Rakuten最強プラン、Rakuten最強U-NEXT、Rakuten最強プラン（データタイプ）",channel:"楽天モバイルオンライン／楽天モバイルショップ",entry:true,conditions:"2026-06-09時点で対象プランを利用中。エントリー後、同月内に対象製品のみを購入（ショップはエントリー不要）。7,000ポイント。",combine:"併用不可",incompatible:"3303",start:"2026-06-10",url:"https://network.mobile.rakuten.co.jp/campaign/galaxy/"}),
  R({code:"3316",title:"Galaxyメガ得祭限定！ショップでGalaxy S26シリーズ購入＋MNPでカラビナ",other:true,mnp:true,smartphoneRequired:true,products:"Samsung Galaxy S26、S26+、S26 Ultra",plans:standardPlans,channel:"楽天モバイルショップ限定",conditions:"ショップでMNP申込と同時に対象製品を購入。カラビナを進呈。店舗ごとに景品がなくなり次第終了。",combine:"要確認",start:"2026-06-10",url:"https://network.mobile.rakuten.co.jp/campaign/galaxy/"}),
  R({code:"2808",title:"Rakutenオリジナル製品 特価キャンペーン",deviceDiscount:true,mnp:true,newNumber:true,planChange:true,products:"Rakuten WiFi Pocket Platinum、Rakuten WiFi Pocket 5G",plans:standardPlans,channel:"楽天モバイルオンライン／楽天モバイルショップ",conditions:"プラン申込と同時に対象モバイルルーターを購入。Platinumは10,819円、5Gは13,810円割引。1人1点。スマホ購入条件ではない。",combine:"条件付き",start:"2025-05-01",url:"https://network.mobile.rakuten.co.jp/product/internet/rakuten-wifi-pocket-5g/"}),
  R({code:"2660",title:"【常時開催】楽天銀行会員様へ 楽天モバイル初めて申し込みで3,000ポイント",mnpPoints:3000,newPoints:3000,point:true,mnp:true,newNumber:true,planChange:true,plans:standardPlans,channel:"専用Webページ",link:true,conditions:"楽天銀行口座保有者が専用ページからクーポン適用で楽天回線を初めて申し込み。翌月末までの利用開始・Rakuten Link、申込月末までのハッピープログラム登録が必要。",combine:"条件付き",start:"2025-02-03",endType:"常時開催",url:"https://network.mobile.rakuten.co.jp/campaign/bank-member-campaign/"}),
  R({code:"2995",title:"【ショップ限定】楽天モバイル初めて申し込みでさらに3,000ポイント",mnpPoints:3000,newPoints:3000,point:true,mnp:true,newNumber:true,planChange:true,plans:standardPlans,channel:"楽天モバイルショップ限定",link:true,conditions:"楽天回線を初めて申し込み。店頭でクーポンコードを入力し、翌月末までに利用開始・Rakuten Linkで10秒以上通話。",combine:"条件付き",start:"2025-09-01",url:"https://network.mobile.rakuten.co.jp/campaign/shop-limited-application"}),
  R({code:"2619",title:"【ショップ限定】初めて申し込み＆楽天市場利用で1,000ポイント",mnpPoints:1000,newPoints:1000,point:true,mnp:true,newNumber:true,planChange:true,plans:standardPlans,channel:"楽天モバイルショップ限定",entry:true,link:true,conditions:"事前エントリー後にショップで楽天回線を初めて申し込み、翌月末までに利用開始・Rakuten Linkで10秒以上通話。申込日から翌月末までに楽天市場で買い物。",combine:"条件付き",start:"2025-01-14",url:"https://network.mobile.rakuten.co.jp/campaign/shop-limited-application"}),
  R({code:"1784",title:"【楽天モバイル】Rakuten最強プラン紹介キャンペーン",mnpPoints:13000,newPoints:10000,point:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:standardPlans,channel:"紹介URL／QRからログイン後、Web・ショップ等で申込",link:true,conditions:"被紹介者は紹介ログイン後、翌々月末までに申込・利用開始・Rakuten Linkで10秒以上通話。被紹介者はMNP13,000、新規/対象移行10,000ポイント。紹介者は1名につき7,000ポイント。",combine:"条件付き",incompatible:"2178,2808,2938,3292",start:"2023-02-15",url:"https://network.mobile.rakuten.co.jp/campaign/referral/"}),
  R({code:"2897",title:"敬老キャンペーン（初めて申し込み＋最強シニアプログラム加入）",mnpPoints:11748,newPoints:11748,point:true,mnp:true,newNumber:true,plans:standardPlans,channel:"専用Webページ／楽天モバイルショップ",entry:true,link:true,conditions:"65歳以上。楽天モバイルを初めて申し込み、クーポン適用、翌月末までに利用開始・Rakuten Linkで10秒以上通話・最強シニアプログラムへエントリー。",combine:"条件付き",incompatible:"2178,2675,2808",start:"2025-06-17",url:"https://network.mobile.rakuten.co.jp/campaign/senior-pointback/"}),
  R({code:"2898",title:"敬老キャンペーン（15分かけ放題＆安心パック初加入でポイント）",mnpPoints:5500,newPoints:5500,point:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:standardPlans,channel:"Web／楽天モバイルショップ",entry:true,conditions:"対象プラン利用中または新規利用開始後、65歳以上で指定3オプションに初めて加入し、エントリー。条件継続で最大5カ月、合計5,500ポイント。",combine:"要確認",start:"2025-06-17",url:"https://network.mobile.rakuten.co.jp/campaign/senior-pointback/"}),
  R({code:"2215",title:"家族割引を使っていますか？料金シミュレーション100ポイント",point:true,plans:"契約中の方は対象外",channel:"公式料金シミュレーション",conditions:"指定ページのボタンから料金シミュレーションを完了。Rakuten最強プラン／U-NEXT契約中は対象外。1人1回、100ポイント。",combine:"要確認",start:"2024-02-01",url:"https://network.mobile.rakuten.co.jp/campaign/fee-simulation/"}),
  R({code:"1238",title:"楽天カード＋楽天モバイル同時申し込みで3,000ポイント",mnpPoints:3000,newPoints:3000,point:true,mnp:true,newNumber:true,planChange:true,plans:standardPlans,channel:"専用Webページ／楽天モバイルショップ",link:true,conditions:"楽天カード新規入会と楽天モバイルを同時に申し込み、楽天回線を初めて利用開始し、翌月末までにRakuten Linkで10秒以上通話。楽天IDの一致が必要。",combine:"条件付き",start:"2021-07-01",endType:"常時開催",url:"https://network.mobile.rakuten.co.jp/guide/application/card-campaign/"}),
  R({code:"2207",title:"【毎月開催】楽天モバイルただいまキャンペーン",mnpPoints:2162,point:true,mnp:true,recontract:true,plans:standardPlans,channel:"専用Webページ／楽天モバイルショップ",link:true,conditions:"過去に楽天モバイル契約歴があり、解約から2カ月以内は対象外。クーポン適用でMNP再契約し、翌月末までに利用開始・Rakuten Linkで10秒以上通話。1,081ポイント×2回。",combine:"条件付き",start:"2026-03-02",endType:"常時開催",url:"https://network.mobile.rakuten.co.jp/campaign/tadaima/"}),
  R({code:"2331",title:"第2弾【ショップ限定】もう1回線申し込みで3,000ポイント",mnpPoints:3000,newPoints:3000,point:true,mnp:true,newNumber:true,extraLine:true,existing:true,planChange:true,plans:standardPlans,channel:"楽天モバイルショップ／自動契約SIM発行機 最強くん",link:true,conditions:"既存回線を含め2回線以上利用。店頭でクーポン適用して追加回線を申し込み、翌月末までに利用開始・Rakuten Linkで10秒以上通話。",combine:"併用不可",incompatible:"2178,2207,2808",start:"2024-06-03",url:"https://network.mobile.rakuten.co.jp/campaign/shop-extra-sim/"}),
  R({code:"2855",title:"【OPEN記念】ハズレなし！大抽選会",point:true,lottery:true,other:true,channel:"対象の新規開店楽天モバイルショップ",receive:true,conditions:"対象店の開店から原則60日以内に来店し、店頭見積もり後に1人1回抽選。最大2,000円分のギフトカード／楽天ポイントまたはグッズ等。景品がなくなり次第終了。",combine:"要確認",start:"2025-06-13",url:"https://network.mobile.rakuten.co.jp/campaign/shop-opening-commemoration/"}),
  R({code:"2857",title:"【OPEN記念】土日祝日限定！豪華景品が当たる大抽選会",point:true,lottery:true,other:true,channel:"対象商業施設内の新規開店楽天モバイルショップ",receive:true,conditions:"対象商業施設で当日1,000円以上購入し、対象店の開店から原則60日以内の土日祝日に来店して抽選。10,000円分のギフトカードまたは10,000ポイント。景品がなくなり次第終了。",combine:"要確認",start:"2025-06-13",url:"https://network.mobile.rakuten.co.jp/campaign/shop-opening-commemoration/"}),
  R({code:"3186",title:"【Shop限定】端末割引クーポンキャンペーン",deviceDiscount:true,mnp:true,newNumber:true,planChange:true,smartphoneRequired:true,products:"nubia S2R、Samsung Galaxy A25 5G",plans:standardPlans,channel:"楽天モバイルショップ限定",conditions:"申込時点で18歳以下（または申込月に19歳）。店頭で申込コードを入力し、プラン申込と同時に対象製品を一括／24回払い購入。22,000円割引。",combine:"併用不可",start:"2026-01-30",url:"https://network.mobile.rakuten.co.jp/campaign/shop-limited-android/"}),
  R({code:"3297",title:"【Web限定】MNP＋Rakuten 認定中古iPhone購入で割引",deviceDiscount:true,mnp:true,smartphoneRequired:true,products:"Rakuten 認定中古 iPhone 15/14/13各シリーズ、iPhone SE（第3世代）（容量・グレード不問）",plans:standardPlans,channel:"楽天モバイルオンライン限定",conditions:"MNPでプラン申込と同時に対象認定中古iPhoneを購入・利用開始。SE第3世代は15,000円、その他対象機種は22,000円割引。",combine:"要確認",start:"2026-06-18",url:"https://network.mobile.rakuten.co.jp/product/rakuten-certified/"}),
  R({code:"3351",title:"【Rakuten最強U-NEXT】初利用で『ヘイ！ダギー』グッズ／1,000ポイント抽選",point:true,lottery:true,other:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",entry:true,receive:true,conditions:"事前エントリー後、Rakuten最強U-NEXTを初めて申し込み・利用開始。20名にグッズまたは1,000ポイント。ポイント当選時は通知URLから受取手続き。",combine:"併用可",start:"2026-07-17",end:"2026-08-31",endType:"確定",url:"https://network.mobile.rakuten.co.jp/campaign/heyduggee/"}),
  R({code:"3350",title:"対象店舗でのお買い物が楽天ポイント20倍（第5弾）",point:true,multiplier:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:standardPlans,channel:"対象店舗＋キャンペーンWebページ",entry:true,conditions:"期間内エントリー、対象プラン利用、対象店舗でポイントカード提示・1ポイント以上獲得、ポイントカード利用登録。通常の20倍、上限1,000ポイント。",combine:"要確認",start:"2026-07-01",end:"2026-09-30",endType:"確定",url:"https://network.mobile.rakuten.co.jp/campaign/shop-point/"}),
  R({code:"2698",title:"最強おうちプログラム：Rakuten Turbo＋楽天モバイルで毎月1,000ポイント",point:true,existing:true,products:"Rakuten Turbo 5G",plans:"Rakuten Turbo＋Rakuten最強プラン／データタイプ／Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",conditions:"Rakuten Turboを初めて申し込み・利用開始し、月末に楽天モバイル対象回線も利用。条件を満たす月ごとに1,000ポイント。",combine:"要確認",start:"2025-03-04",url:"https://network.mobile.rakuten.co.jp/internet/turbo/campaign/home-internet/"}),
  R({code:"2699",title:"Rakuten Turbo 5G製品代金実質0円キャンペーン",other:true,products:"Rakuten Turbo 5G",plans:"Rakuten Turbo",channel:"Web／楽天モバイルショップ",conditions:"Rakuten TurboとRakuten Turbo 5Gを同時申し込み。プラン料金を4年間毎月867円割引し、製品代41,580円を実質0円相当とする。",combine:"要確認",start:"2025-03-04",url:"https://network.mobile.rakuten.co.jp/internet/turbo/campaign/home-internet/"}),
  R({code:"2697",title:"最強おうちプログラム：楽天ひかり＋楽天モバイルで毎月1,000ポイント",point:true,existing:true,plans:"楽天ひかり＋Rakuten最強プラン／データタイプ／Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",conditions:"楽天ひかりを初めて申し込み、申込月から4カ月目末までに開通。月末に楽天モバイル対象回線も利用すると毎月1,000ポイント。",combine:"要確認",start:"2025-03-04",url:"https://network.mobile.rakuten.co.jp/hikari/campaign/home-internet/"}),
  R({code:"3025",title:"楽天ひかり 工事費実質無料キャンペーン",point:true,plans:"楽天ひかり",channel:"Web／楽天モバイルショップ",conditions:"楽天ひかりを初めて申し込み、申込月から4カ月目末までに開通。工事費最大22,000円分を24回に分けてポイント進呈。",combine:"要確認",start:"2025-12-01",url:"https://network.mobile.rakuten.co.jp/hikari/campaign/home-internet/"}),
  R({code:"1173",title:"SPUページ限定：楽天モバイル初めて申し込みで3,000ポイント",mnpPoints:3000,newPoints:3000,point:true,mnp:true,newNumber:true,planChange:true,plans:standardPlans,channel:"SPUキャンペーンページ経由のWeb申込",link:true,conditions:"指定ページの申込ボタンからクーポン適用で楽天回線を初めて申し込み、翌月末までに利用開始・Rakuten Linkで10秒以上通話。特典額は時期により増減。",combine:"条件付き",start:"2026-07-01",endType:"常時開催",url:"https://network.mobile.rakuten.co.jp/campaign/spu/"}),
  R({code:"1680",title:"YouTube Premium 3カ月無料キャンペーン",monthlyFree:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:standardPlans,channel:"キャンペーンページからYouTube Premium申込",conditions:"対象プラン利用中または申込・利用開始後、YouTube Premium等の定期購入／無料体験を利用したことがない方が申込。",combine:"併用不可",conditions:"対象プラン利用中または申込・利用開始後、YouTube Premium等の定期購入／無料体験を利用したことがない方が申込。YouTube Premium関連キャンペーンとは併用不可。",start:"2023-05-16",url:"https://network.mobile.rakuten.co.jp/campaign/youtubepremium/"}),
  R({code:"1922",title:"楽天モバイルキャリア決済利用で支払額の1%ポイント還元",point:true,existing:true,products:"楽天回線対応Android製品",plans:"Rakuten最強プラン、Rakuten最強U-NEXT",channel:"Google Playの楽天モバイルキャリア決済",conditions:"対象回線・AndroidでGoogle Playの有料アプリ等をキャリア決済。利用額の1%、月間上限2,000ポイント。月100円未満は対象外。",combine:"要確認",start:"2023-07-01",url:"https://network.mobile.rakuten.co.jp/campaign/payment-google/"}),
  R({code:"3141",title:"【毎月開催】楽天モバイル月額料金への初ポイント利用で還元率3倍",point:true,multiplier:true,mnp:true,newNumber:true,existing:true,plans:"楽天モバイル対象料金",channel:"キャンペーンWebページ／my 楽天モバイルのポイント利用設定",entry:true,conditions:"8月中にエントリー・ポイント利用設定し、翌月請求で初めてポイントを充当。通常1%＋特典2%、特典上限90ポイント。過去利用・過去受取者は対象外。",combine:"要確認",start:"2026-08-01",end:"2026-08-31",endType:"確定",url:"https://network.mobile.rakuten.co.jp/campaign/poitoku/"}),
  R({code:"1977",title:"15分（標準）通話かけ放題 料金1カ月無料",monthlyFree:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強プラン、Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",conditions:"対象プラン利用中または申込・利用開始後に、15分（標準）通話かけ放題へ初めて申し込み。1人1回。",combine:"併用不可",incompatible:"1978",start:"2023-09-01",url:"https://network.mobile.rakuten.co.jp/service/standard-free-call/"}),
  R({code:"2835",title:"留守番電話オプション 初回1カ月無料",monthlyFree:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強プラン",channel:"Web／楽天モバイルショップ",conditions:"対象プラン利用中または新規利用開始後、留守番電話を初めて申し込み・利用開始。1人1回。",combine:"要確認",start:"2025-06-19",url:"https://network.mobile.rakuten.co.jp/service/voice-mail/"}),
  R({code:"2834",title:"割込通話オプション 初回1カ月無料",monthlyFree:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強プラン",channel:"Web／楽天モバイルショップ",conditions:"対象プラン利用中または新規利用開始後、割込通話を初めて申し込み・利用開始。1人1回。",combine:"要確認",start:"2025-06-19",url:"https://network.mobile.rakuten.co.jp/service/call-waiting/"}),
  R({code:"2956",title:"ノートンモバイルセキュリティ＋ノートンID Advisor 3カ月無料",monthlyFree:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強プラン、データタイプ、Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",conditions:"対象プラン利用中または新規利用開始後、対象セキュリティオプションへ初めて申し込み・利用開始。1人1回。",combine:"要確認",start:"2025-08-26",url:"https://network.mobile.rakuten.co.jp/service/saikyo-protection/"}),
  R({code:"3338",title:"最強保護 流出チェックキャンペーン",mnpPoints:300,newPoints:300,point:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強プラン、Rakuten最強U-NEXT",channel:"流出チェックツール＋Web／楽天モバイルショップ",conditions:"流出チェックで100ポイント、同月末までの最強保護申込で追加200ポイント。新規契約者は同月末までにプラン利用開始。1人1回。",combine:"要確認",start:"2026-07-01",url:"https://network.mobile.rakuten.co.jp/service/saikyo-protection/"}),
  R({code:"3329",title:"迷惑電話・SMS対策 by Whoscall 初回3カ月無料",monthlyFree:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:standardPlans,channel:"Web／楽天モバイルショップ",conditions:"対象プラン利用中または新規利用開始後、Whoscallへ初めて申し込み・利用開始。1人1回。",combine:"要確認",start:"2026-06-17",url:"https://network.mobile.rakuten.co.jp/service/whoscall/"}),
  R({code:"2833",title:"あんしんコントロール 3カ月無料",monthlyFree:true,mnp:true,newNumber:true,existing:true,planChange:true,plans:"Rakuten最強プラン、データタイプ、Rakuten最強U-NEXT",channel:"Web／楽天モバイルショップ",conditions:"対象プラン利用中または新規利用開始後、あんしんコントロールへ初めて申し込み・利用開始。1回線1回。",combine:"要確認",start:"2025-09-25",url:"https://network.mobile.rakuten.co.jp/service/anshin-control/"}),
  R({code:"2602",title:"Apple Watch購入＆電話番号シェアサービス加入で最大25,000ポイント",point:true,existing:true,products:"25,000pt：Apple Watch Series 10チタニウム、Ultra 2（2024）。3,300pt：Series 11、SE 3、Ultra 3、Series 10アルミ、SE 2（2024）、Series 9、指定訳あり品",plans:"楽天モバイル回線＋電話番号シェアサービス",channel:"楽天モバイルオンライン／楽天モバイル公式 楽天市場店",entry:true,conditions:"事前エントリー後に対象Apple Watchを購入し、購入後翌月末までに電話番号シェアサービスへ新規加入。購入前加入は対象外。スマホ購入条件ではない。",combine:"併用不可",incompatible:"3216",start:"2025-01-27",url:"https://network.mobile.rakuten.co.jp/campaign/apple-watch-number-share/"}),
];

const detailRows = details.map((r) => [
  r.code, r.title, r.mnpPoints, r.newPoints,
  r.point, r.deviceDiscount, r.deviceSpecial, r.monthlyFree, r.multiplier, r.lottery, r.other,
  r.mnp, r.newNumber, r.recontract, r.extraLine, r.existing, r.planChange,
  r.smartphoneRequired, r.products, r.plans, r.channel, r.entry, r.link, r.receive,
  r.conditions, r.combine, r.incompatible, d(r.start), d(r.end), r.endType, r.url, checkedDate,
]);

const html = await fs.readFile(indexPath, "utf8");
const decode = (s) => s
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const textOf = (s) => decode(s.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const absolute = (href) => href.startsWith("http") ? href : new URL(href, listUrl).href;
const cardMatches = [...html.matchAll(/<a\s+([^>]*)>([\s\S]*?)<\/a>/g)]
  .filter((m) => /class="[^"]*e1nbkhnd3[^"]*"/.test(m[1]))
  .map((m) => {
    const href = m[1].match(/href="([^"]+)"/)?.[1] ?? "";
    return [m[0], href, m[2]];
  });
if (cardMatches.length !== 52) throw new Error(`Expected 52 campaign cards, got ${cardMatches.length}`);

const codesByCard = {
  1:"2091,2142",2:"3293,3288,2939",3:"2938",4:"2178",5:"2568,2091,1819",6:"2938",7:"2091,2006,3303,3304,3316",8:"2808",9:"",10:"2808",
  11:"2995,2619,2091",12:"2938",13:"2568,2091,1819",14:"2980",15:"1784",16:"2897,2898",17:"2215",18:"1238",19:"2207",20:"2331",
  21:"2855,2857",22:"2178",23:"3186",24:"2091,2142,2006,3303",25:"",26:"3297,2142",27:"3351",28:"3350",29:"2698,2699",30:"2697,3025",
  31:"1173",32:"1680",33:"1922",34:"2660,2091,2142",35:"",36:"",37:"",38:"",39:"",40:"",41:"",42:"3141",43:"",44:"1977",45:"2835",46:"2834",47:"2956,3338",48:"3329",49:"2833",50:"",51:"2602",52:"",
};
const categoryByCard = (i) => {
  if ([3,4,5,6,7,12,13,22,23,24,26].includes(i)) return "端末・回線申込";
  if ([8,10].includes(i)) return "Wi-Fiルーター";
  if ([11,14,20,21,28].includes(i)) return "ショップ限定・店頭";
  if (i === 1) return "回線申込";
  if ([2,27].includes(i)) return "料金プラン";
  if (i === 9) return "契約者向け金融特典";
  if (i === 15) return "紹介";
  if (i === 16) return "シニア";
  if (i === 17) return "料金シミュレーション";
  if (i === 18) return "楽天カード";
  if (i === 19) return "再契約";
  if ([25,36,50].includes(i)) return "外部キャンペーン・外部商品";
  if ([29,30].includes(i)) return "インターネット";
  if ([31,41].includes(i)) return "ポイント倍率";
  if (i === 32) return "動画サービス";
  if (i === 33) return "キャリア決済";
  if ([34,35].includes(i)) return "楽天銀行";
  if ([37,38].includes(i)) return "エンタメ";
  if ([39,40].includes(i)) return "スポーツ";
  if (i === 42) return "ポイント利用";
  if (i === 43) return "アクセサリー";
  if ([44,45,46,47,48,49].includes(i)) return "オプションサービス";
  if ([51,52].includes(i)) return "Apple Watch";
  return "その他";
};

const listingRows = [
  ["【紹介キャンペーン】これからお申し込みの方も特典対象に！最大20,000ポイント！", "注目情報（2026年7月7日～）。紹介者7,000ポイント＋被紹介者はMNP13,000ポイント等。", "注目情報", "1784", "https://network.mobile.rakuten.co.jp/campaign/referral/", listUrl, checkedDate],
  ["Galaxyメガ得祭開催中！最大23,000ポイント！！", "注目情報（2026年6月10日～）。Galaxy S26シリーズの申込区分・購入条件により複数コードが関係。", "注目情報", "2091,2006,3303,3304,3316", "https://network.mobile.rakuten.co.jp/campaign/galaxy/", listUrl, checkedDate],
];

for (let i = 0; i < cardMatches.length; i++) {
  const [, href, body] = cardMatches[i];
  const imgAlt = body.match(/<img[^>]*alt="([^"]*)"/i)?.[1] ?? "";
  const pTexts = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => textOf(m[1])).filter(Boolean);
  const title = textOf(imgAlt) || pTexts[0] || `掲載項目 ${i + 1}`;
  const description = pTexts.join(" / ");
  listingRows.push([title, description, categoryByCard(i + 1), codesByCard[i + 1] ?? "", absolute(decode(href)), listUrl, checkedDate]);
}

const definitionRows = [
  ["項目", "定義・注意事項"],
  ["収録範囲", "日本時間の確認日時点で楽天モバイル公式『キャンペーン一覧』の主グリッドに掲載された52項目と、注目情報2項目を記録。詳細シートは、掲載先の現行ルールで公式キャンペーンコードを確認でき、かつ終了していないコードのみを収録。"],
  ["公式一覧URL", listUrl],
  ["確認日時", `${checkedAt}（日本時間）`],
  ["最終確認日", "2026-08-01"],
  ["キャンペーン詳細の単位", "1行につき1つの公式キャンペーンコード。同一コードが複数ページにある場合は重複させず、確認日時点の現行ルールを採用。"],
  ["公式掲載一覧の単位", "公式一覧ページ上の掲載枠単位。主グリッド52件に加え、ページ上部の注目情報2件も掲載記録として残したため、同じキャンペーンが重複表示される場合がある。"],
  ["キャンペーンコード", "公式ルールに番号が明記された場合のみ入力。関連ページ内で表示上の特典を構成する複数コードが確認できる掲載項目はカンマ区切り。終了済みコード2980は掲載事実の記録として公式掲載一覧にのみ残し、詳細には含めない。"],
  ["ポイント数（MNP／新規）", "当該コード単体の固定ポイント数を数値で入力。複数コードの合計、円値引き、無料、倍率、抽選、購入額や利用額で変動するポイント、月次継続で総額未確定のポイントは入力しない。"],
  ["Boolean列", "Excelの実Boolean値 TRUE/FALSE。複数の特典・対象区分に該当する場合は該当列をすべてTRUE。確認できない対象区分はFALSE。"],
  ["スマホ本体購入必須", "スマートフォン本体購入が適用条件の場合のみTRUE。Wi-Fiルーター、Apple Watch、アクセサリー、オプションのみの購入・加入はFALSE。"],
  ["対象製品", "確認日時点の現行ルールで対象と確認できた製品を簡潔に記載。多数のAndroid製品は主要なシリーズを列挙し、公式記載製品であることを明示。"],
  ["エントリー必須", "ルール上エントリーが適用条件に含まれる場合TRUE。Webでは必須だがショップでは不要のキャンペーンもTRUEとし、例外をその他条件に記載。クーポンコード・申込コードの入力だけの場合はFALSE。"],
  ["ポイント受取手続き必須", "受取通知・当選通知等から明示的な受取操作が必要な場合TRUE。自動進呈はFALSE。抽選でポイント当選時のみ必要な場合もTRUEとし、条件欄に記載。"],
  ["併用可否", "公式に全体関係を確認できた場合は併用可／条件付き／併用不可。網羅的に確定できない場合は要確認。併用不可コードが明記され、現行判定に有用なものをカンマ区切りで記録。"],
  ["キャンペーン開催日", "原則、現在のコードの受付・申込期間の開始日。月次コードは確認月（2026年8月）の開始日。"],
  ["終了日区分", "明示終了日は『確定』、終了日未定・未定は『終了日未定』、公式に常時開催／毎月の常設プログラムと明示されたものは『常時開催』。"],
  ["注意：一覧掲載と開催状況", "公式一覧に掲載中でも、詳細ルール上は終了済みの項目が1件（コード2980）確認された。掲載漏れ防止のため公式掲載一覧には残し、キャンペーン詳細から除外。外部ページ・サービス案内などコードを確認できない項目も公式掲載一覧に残した。"],
  ["注意：価格・特典の変動", "対象製品、在庫、支払方法、特典額、併用条件は変更される場合がある。利用前に各行の公式URLで最新ルールを再確認すること。"],
  ["出典方針", "原則として楽天モバイル公式ページと公式キャンペーンルールを根拠とし、公式一覧から外部ページにリンクされた掲載項目は掲載記録のため外部URLも記録。"],
];

await fs.mkdir(outputDir, { recursive: true });
const wb = Workbook.create();
const detailSheet = wb.worksheets.add("キャンペーン詳細");
const listingSheet = wb.worksheets.add("公式掲載一覧");
const defSheet = wb.worksheets.add("定義・注意事項");

detailSheet.getRange(`A1:AF${detailRows.length + 1}`).values = [detailHeaders, ...detailRows];
listingSheet.getRange(`A1:G${listingRows.length + 1}`).values = [["掲載タイトル","掲載説明","分類","キャンペーンコード（特定できる場合）","掲載先URL","楽天モバイル公式一覧URL","最終確認日"], ...listingRows];
defSheet.getRange(`A1:B${definitionRows.length}`).values = definitionRows;

for (const s of [detailSheet, listingSheet, defSheet]) {
  s.showGridLines = false;
  s.freezePanes.freezeRows(1);
}

const red = "#BF0000";
const dark = "#333333";
const light = "#F7F7F7";
const grid = "#D9D9D9";
const headerFmt = { fill: red, font: { bold: true, color: "#FFFFFF", size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#970000" } };
const bodyFmt = { font: { color: dark, size: 9 }, verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: grid } };

detailSheet.getRange("A1:AF1").format = headerFmt;
detailSheet.getRange(`A2:AF${detailRows.length + 1}`).format = bodyFmt;
detailSheet.getRange("A1:AF1").format.rowHeight = 58;
detailSheet.getRange(`A2:AF${detailRows.length + 1}`).format.rowHeight = 78;
detailSheet.getRange(`C2:D${detailRows.length + 1}`).format.numberFormat = "#,##0";
detailSheet.getRange(`AB2:AC${detailRows.length + 1}`).format.numberFormat = "yyyy-mm-dd";
detailSheet.getRange(`AF2:AF${detailRows.length + 1}`).format.numberFormat = "yyyy-mm-dd";
detailSheet.getRange(`E2:R${detailRows.length + 1}`).format.horizontalAlignment = "center";
detailSheet.getRange(`V2:X${detailRows.length + 1}`).format.horizontalAlignment = "center";
detailSheet.getRange(`A2:A${detailRows.length + 1}`).format.horizontalAlignment = "center";
detailSheet.getRange(`C2:R${detailRows.length + 1}`).format.verticalAlignment = "center";
detailSheet.getRange(`V2:X${detailRows.length + 1}`).format.verticalAlignment = "center";
detailSheet.getRange("A:A").format.columnWidth = 12;
detailSheet.getRange("B:B").format.columnWidth = 42;
detailSheet.getRange("C:D").format.columnWidth = 14;
detailSheet.getRange("E:R").format.columnWidth = 11;
detailSheet.getRange("S:S").format.columnWidth = 34;
detailSheet.getRange("T:T").format.columnWidth = 28;
detailSheet.getRange("U:U").format.columnWidth = 25;
detailSheet.getRange("V:X").format.columnWidth = 13;
detailSheet.getRange("Y:Y").format.columnWidth = 48;
detailSheet.getRange("Z:Z").format.columnWidth = 12;
detailSheet.getRange("AA:AA").format.columnWidth = 28;
detailSheet.getRange("AB:AD").format.columnWidth = 15;
detailSheet.getRange("AE:AE").format.columnWidth = 46;
detailSheet.getRange("AF:AF").format.columnWidth = 14;
detailSheet.getRange(`Z2:Z${detailRows.length + 1}`).dataValidation = { rule: { type: "list", values: ["併用可", "条件付き", "併用不可", "要確認"] } };
detailSheet.getRange(`AD2:AD${detailRows.length + 1}`).dataValidation = { rule: { type: "list", values: ["確定", "終了日未定", "常時開催"] } };
const detailTable = detailSheet.tables.add(`A1:AF${detailRows.length + 1}`, true, "RakutenCampaignDetails");
detailTable.style = "TableStyleLight1";
detailTable.showFilterButton = true;
detailSheet.getRange(`A2:AF${detailRows.length + 1}`).format = { ...bodyFmt, fill: "#FFFFFF" };
detailSheet.getRange("A1:AF1").format = headerFmt;

listingSheet.getRange("A1:G1").format = headerFmt;
listingSheet.getRange(`A2:G${listingRows.length + 1}`).format = bodyFmt;
listingSheet.getRange("A1:G1").format.rowHeight = 48;
listingSheet.getRange(`A2:G${listingRows.length + 1}`).format.rowHeight = 72;
listingSheet.getRange(`G2:G${listingRows.length + 1}`).format.numberFormat = "yyyy-mm-dd";
listingSheet.getRange("A:A").format.columnWidth = 42;
listingSheet.getRange("B:B").format.columnWidth = 66;
listingSheet.getRange("C:C").format.columnWidth = 20;
listingSheet.getRange("D:D").format.columnWidth = 28;
listingSheet.getRange("E:E").format.columnWidth = 54;
listingSheet.getRange("F:F").format.columnWidth = 48;
listingSheet.getRange("G:G").format.columnWidth = 14;
const listingTable = listingSheet.tables.add(`A1:G${listingRows.length + 1}`, true, "RakutenOfficialListings");
listingTable.style = "TableStyleLight1";
listingTable.showFilterButton = true;
listingSheet.getRange(`A2:G${listingRows.length + 1}`).format = { ...bodyFmt, fill: "#FFFFFF" };
listingSheet.getRange("A1:G1").format = headerFmt;

defSheet.getRange("A1:B1").format = headerFmt;
defSheet.getRange(`A2:B${definitionRows.length}`).format = bodyFmt;
defSheet.getRange("A1:B1").format.rowHeight = 42;
defSheet.getRange(`A2:B${definitionRows.length}`).format.rowHeight = 62;
defSheet.getRange("A:A").format.columnWidth = 30;
defSheet.getRange("B:B").format.columnWidth = 110;
defSheet.getRange(`A2:A${definitionRows.length}`).format = { fill: light, font: { bold: true, color: dark, size: 9 }, verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: grid } };
const defTable = defSheet.tables.add(`A1:B${definitionRows.length}`, true, "RakutenDefinitions");
defTable.style = "TableStyleLight1";
defTable.showFilterButton = false;
defSheet.getRange(`A2:B${definitionRows.length}`).format = { ...bodyFmt, fill: "#FFFFFF" };
defSheet.getRange(`A2:A${definitionRows.length}`).format = { fill: light, font: { bold: true, color: dark, size: 9 }, verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: grid } };
defSheet.getRange("A1:B1").format = headerFmt;

const duplicates = details.map((r) => r.code).filter((code, i, a) => a.indexOf(code) !== i);
const endedIntrusions = details.filter((r) => r.end && new Date(`${r.end}T23:59:59+09:00`) < new Date("2026-08-01T23:22:23+09:00")).map((r) => r.code);
const noCodeListingCount = listingRows.filter((r) => !r[3]).length;

const inspect = await wb.inspect({ kind: "table", range: `キャンペーン詳細!A1:AF${detailRows.length + 1}`, include: "values,formulas", tableMaxRows: 8, tableMaxCols: 32, maxChars: 10000 });
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });

const renders = [
  ["detail_a_h.png", "キャンペーン詳細", `A1:H${detailRows.length + 1}`],
  ["detail_i_p.png", "キャンペーン詳細", `I1:P${detailRows.length + 1}`],
  ["detail_q_x.png", "キャンペーン詳細", `Q1:X${detailRows.length + 1}`],
  ["detail_y_af.png", "キャンペーン詳細", `Y1:AF${detailRows.length + 1}`],
  ["official_list.png", "公式掲載一覧", `A1:G${listingRows.length + 1}`],
  ["definitions.png", "定義・注意事項", `A1:B${definitionRows.length}`],
];
for (const [name, sheetName, range] of renders) {
  const blob = await wb.render({ sheetName, range, scale: 0.7, format: "png" });
  await fs.writeFile(`${outputDir}/${name}`, new Uint8Array(await blob.arrayBuffer()));
}

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(outputPath);

const reopened = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const reopenedSheets = await reopened.inspect({ kind: "sheet", include: "id,name" });
const reopenedDetail = await reopened.inspect({ kind: "table", range: `キャンペーン詳細!A1:AF${detailRows.length + 1}`, include: "values,formulas", tableMaxRows: 3, tableMaxCols: 32, maxChars: 4000 });
const reopenedErrors = await reopened.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "reopened workbook formula error scan" });

console.log(JSON.stringify({
  outputPath,
  detailCount: details.length,
  listingCount: listingRows.length,
  noCodeListingCount,
  duplicates,
  endedIntrusions,
  inspect: inspect.ndjson,
  errors: errors.ndjson,
  reopenedSheets: reopenedSheets.ndjson,
  reopenedDetail: reopenedDetail.ndjson,
  reopenedErrors: reopenedErrors.ndjson,
  renders: renders.map((r) => r[0]),
}, null, 2));
