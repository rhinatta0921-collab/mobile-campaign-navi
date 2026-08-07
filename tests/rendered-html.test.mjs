import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function sectionHtml(html, className) {
  return html.match(
    new RegExp(
      `<section class="${className}"[^>]*>[\\s\\S]*?<\\/section>`,
    ),
  )?.[0];
}

function htmlFromSection(html, className) {
  const marker = `<section class="${className}"`;
  const start = html.indexOf(marker);

  assert.notEqual(start, -1, `missing section: ${className}`);
  return html.slice(start);
}

function plainText(html) {
  return html
    .replaceAll("<!-- -->", "")
    .replace(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tableBodyText(html) {
  const tableBody = html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0];
  assert.ok(tableBody, "missing ranking table body");
  return plainText(tableBody);
}

function tableHeadCells(html) {
  const tableHead = html.match(/<thead>[\s\S]*?<\/thead>/)?.[0];
  assert.ok(tableHead, "missing ranking table head");
  return [...tableHead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(
    (match) => plainText(match[1]),
  );
}

function rankingTableHtml(html, tableClassName) {
  const table = html.match(
    new RegExp(
      `<table class="comparison-table ${tableClassName}">[\\s\\S]*?<\\/table>`,
    ),
  )?.[0];
  assert.ok(table, `missing ranking table: ${tableClassName}`);
  return table;
}

function tableRowCount(tableHtml) {
  const tableBody = tableHtml.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0];
  assert.ok(tableBody, "missing ranking table body");
  return [...tableBody.matchAll(/<tr>/g)].length;
}

function detailArticleCount(html) {
  return [...html.matchAll(/class="campaign-detail-article"/g)].length;
}

function classCount(html, className) {
  return [
    ...html.matchAll(new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`, "g")),
  ].length;
}

function rankingPoints(html) {
  return [...html.matchAll(/class="points-cell">([\d,]+)<span>ポイント/g)].map(
    (match) => Number(match[1].replaceAll(",", "")),
  );
}

function assertInOrder(haystack, values) {
  let lastIndex = -1;

  for (const value of values) {
    const index = haystack.indexOf(value);
    assert.ok(index > lastIndex, `${value} should appear in order`);
    lastIndex = index;
  }
}

test("ranks MNP campaigns by applicant fixed points and shows value details", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const text = plainText(html);
  assert.match(
    text,
    /楽天モバイル申し込みキャンペーンおすすめ比較ランキング/,
  );
  assert.match(
    html,
    /srcSet="\/hero-firstview-pop-mobile\.png"/,
  );
  assert.match(html, /media="\(max-width: 860px\)"/);
  assert.match(html, /width="1080" height="1350"/);
  assert.match(html, /src="\/hero-firstview-pop-desktop\.png"/);
  assert.match(html, /width="1400" height="768"/);
  assert.doesNotMatch(html, /src="\/hero-editorial\.png"/);
  assert.match(text, /2026年7月31日 更新/);
  assert.doesNotMatch(text, /最終確認:/);
  assert.match(text, /申込者向け固定ポイントでは、最大13,000ポイント/);

  const conclusionHtml = sectionHtml(html, "conclusion");
  assert.ok(conclusionHtml);
  const conclusionText = plainText(conclusionHtml);
  assert.equal(classCount(conclusionHtml, "winner-campaign-picture"), 1);
  assert.doesNotMatch(conclusionHtml, /<source\b/);
  assert.match(
    conclusionHtml,
    /data-campaign-code="1784"><img src="\/assets\/campaigns\/official\/1784-mobile\.png"/,
  );
  assert.match(conclusionText, /1位/);
  assert.match(conclusionText, /13,000ポイント/);
  assert.match(
    conclusionText,
    /画像：楽天モバイル公式ページ（2026年8月6日確認）/,
  );
  assert.match(conclusionText, /公式ページで確認/);

  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  const rankingText = plainText(rankingHtml);
  const rankingTableText = tableBodyText(rankingHtml);
  const primaryRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-primary",
  );
  const overflowRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-overflow",
  );
  assert.match(
    rankingHtml,
    /href="\/\?application=mnp"[^>]*aria-selected="true"/,
  );
  assert.equal(tableRowCount(primaryRankingTable), 10);
  assert.equal(tableRowCount(overflowRankingTable), 10);
  assert.equal([...primaryRankingTable.matchAll(/<th\b/g)].length, 7);
  assert.equal(classCount(primaryRankingTable, "ranking-campaign-picture"), 10);
  assert.equal(classCount(overflowRankingTable, "ranking-campaign-picture"), 10);
  assert.equal(classCount(rankingHtml, "mobile-ranking-picture"), 0);
  assert.deepEqual(
    tableHeadCells(primaryRankingTable),
    [
      "キャンペーン",
      "画像",
      "獲得ポイント",
      "おすすめ対象",
      "主な追加条件",
      "開催期間",
      "公式",
    ],
  );
  assert.equal(tableHeadCells(primaryRankingTable).includes("申込方法"), false);
  assert.match(rankingTableText, /終了日未定/);
  assert.doesNotMatch(primaryRankingTable, /<source\b/);
  assert.match(
    primaryRankingTable,
    /data-campaign-code="1784"><img src="\/assets\/campaigns\/official\/1784-mobile\.png"/,
  );
  assert.match(
    rankingHtml,
    /src="\/assets\/campaigns\/official\/[^"]+"[^>]*alt=""[^>]*loading="lazy"/,
  );
  assert.match(plainText(primaryRankingTable), /10位/);
  assert.doesNotMatch(plainText(primaryRankingTable), /11位/);
  assert.match(plainText(overflowRankingTable), /11位/);
  assert.match(plainText(overflowRankingTable), /20位/);
  assert.match(rankingHtml, /<details class="ranking-overflow">/);
  assert.match(rankingText, /11位以降を表示（残り10件）/);
  assert.match(rankingText, /11位以降を閉じる/);
  assert.match(rankingText, /獲得ポイント/);
  assert.match(rankingText, /ポイントがない特典は0ポイントとして末尾に掲載/);
  assertInOrder(rankingTableText, ["13,000", "11,748", "10,000", "5,000"]);
  const mnpPoints = rankingPoints(rankingHtml);
  assert.equal(mnpPoints.includes(0), true);
  assert.equal(mnpPoints.findIndex((points) => points === 0) > 0, true);
  assert.equal(mnpPoints.slice(mnpPoints.indexOf(0)).every((points) => points === 0), true);
  assertInOrder(rankingTableText, [
    "【楽天モバイルショップ限定】初めてのお申し込みで3,000ポイント",
    "第2弾【ショップ限定】もう1回線お申し込みでポイント",
    "楽天カード＋楽天モバイル同時申し込み特典",
    "楽天銀行会員向け 楽天モバイル初めて申し込み特典",
  ]);
  assert.doesNotMatch(rankingText, /iPhone対象製品 特価キャンペーン/);

  const detailHtml = htmlFromSection(html, "detail-section");
  const detailText = plainText(detailHtml);
  assert.equal(detailArticleCount(detailHtml), 20);
  assert.equal(classCount(detailHtml, "campaign-official-figure"), 20);
  assert.equal(classCount(detailHtml, "campaign-detail-picture"), 20);
  assert.doesNotMatch(
    detailHtml,
    /<picture class="official-campaign-picture campaign-detail-picture"[^>]*>\s*<source/,
  );
  assert.match(
    detailHtml,
    /data-campaign-code="1784"><img src="\/assets\/campaigns\/official\/1784-mobile\.png"/,
  );
  assert.match(
    detailHtml,
    /data-campaign-code="1238"><img src="\/assets\/campaigns\/official\/1238-detail\.(?:png|jpg)"/,
  );
  assert.match(
    detailText,
    /画像：楽天モバイル公式ページ（2026年8月6日確認）/,
  );
  assert.doesNotMatch(detailHtml, /<details class="offer-detail"/);
  assert.doesNotMatch(detailHtml, /<summary class="offer-heading"/);
  assert.doesNotMatch(detailText, /詳細を見る/);
  assert.match(detailText, /どんな人におすすめか/);
  assert.match(detailText, /4つの指標で比較スコア/);
  assert.match(detailText, /獲得可能ポイント13,000ポイント/);
  assert.match(detailText, /その他特典/);
  assert.match(detailText, /キャンペーン適用にかかるコスト/);
  assert.match(detailText, /公式サイトで情報を見る/);
  assert.match(detailText, /キャンペーン開催期間/);
  assert.match(detailText, /キャンペーン適用条件/);
  assert.match(detailText, /おすすめなポイント/);
  assert.match(detailText, /気になるポイント/);
  assert.match(detailText, /紹介者分は除外/);
  assert.match(
    detailText,
    /13,000ポイント \+ 0円相当 − 0円 = 13,000円/,
  );
  assert.match(
    detailText,
    /1,000ポイント \+ 0円相当 − 1,000円 = 0円/,
  );
  assert.match(
    detailText,
    /0ポイント \+ 1,100円相当 − 0円 = 1,100円/,
  );
  assert.match(detailText, /毎月＋1,000円相当/);
  assert.match(detailText, /金額換算対象外/);
  assert.match(detailText, /15分（標準）通話かけ放題 料金1カ月無料特典/);
  assert.match(
    detailText,
    /順位は獲得可能ポイントだけで決まり、その他特典・コスト・実質価値は順位に影響しません/,
  );
});

test("switches to new-number points without mixing MNP-only campaigns", async () => {
  const response = await render("/?application=new-number");
  const html = await response.text();
  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  const rankingText = plainText(rankingHtml);
  const rankingTableText = tableBodyText(rankingHtml);
  const primaryRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-primary",
  );
  const overflowRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-overflow",
  );

  assert.match(
    rankingHtml,
    /href="\/\?application=new-number"[^>]*aria-selected="true"/,
  );
  assert.equal(tableRowCount(primaryRankingTable), 10);
  assert.equal(tableRowCount(overflowRankingTable), 9);
  assert.match(plainText(primaryRankingTable), /10位/);
  assert.match(plainText(overflowRankingTable), /11位/);
  assert.match(plainText(overflowRankingTable), /19位/);
  assert.match(rankingText, /11位以降を表示（残り9件）/);
  assertInOrder(rankingTableText, ["11,748", "10,000", "7,000", "5,000"]);
  assert.doesNotMatch(rankingText, /楽天モバイルただいまキャンペーン/);
  assert.doesNotMatch(
    rankingText,
    /他社から乗り換えでポイントプレゼント/,
  );
  assert.match(rankingText, /0ポイント/);

  const detailHtml = htmlFromSection(html, "detail-section");
  const detailText = plainText(detailHtml);
  assert.equal(detailArticleCount(detailHtml), 19);
  assert.equal(classCount(detailHtml, "campaign-official-figure"), 19);
  assert.doesNotMatch(detailHtml, /<details class="offer-detail"/);
  assert.match(detailText, /獲得可能ポイント11,748ポイント/);
  assert.match(detailText, /獲得可能ポイント10,000ポイント/);
  assert.match(
    detailText,
    /【Rakuten最強プランはじめてお申し込み特典】新規ご契約でポイントプレゼント/,
  );
  assert.doesNotMatch(detailText, /楽天モバイルただいまキャンペーン/);
});

test("includes zero-point device discounts and avoids double-counting", async () => {
  const response = await render("/device-campaigns");
  assert.equal(response.status, 200);

  const html = await response.text();
  const text = plainText(html);
  assert.match(
    text,
    /スマホ本体の購入が必要な楽天モバイルキャンペーン比較/,
  );
  assert.doesNotMatch(text, /最終確認:/);

  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  const rankingText = plainText(rankingHtml);
  const rankingTableText = tableBodyText(rankingHtml);
  const primaryRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-primary",
  );
  assert.match(
    rankingHtml,
    /href="\/device-campaigns\?application=mnp"[^>]*aria-selected="true"/,
  );
  assert.equal(tableRowCount(primaryRankingTable), 10);
  assert.doesNotMatch(rankingHtml, /<details class="ranking-overflow">/);
  assertInOrder(rankingTableText, ["25,000", "13,000", "7,000", "6,000"]);
  const mnpDevicePoints = rankingPoints(rankingHtml);
  assert.equal(mnpDevicePoints.includes(0), true);
  assert.equal(
    mnpDevicePoints.slice(mnpDevicePoints.indexOf(0)).every((points) => points === 0),
    true,
  );
  assert.match(rankingText, /【Android対象製品限定】特価キャンペーン/);
  assert.match(rankingText, /iPhone対象製品 特価キャンペーン/);
  assert.match(rankingText, /Rakuten認定中古製品キャンペーン/);
  assert.doesNotMatch(rankingText, /Rakuten最強プラン紹介キャンペーン/);

  const detailHtml = htmlFromSection(html, "detail-section");
  const detailText = plainText(detailHtml);
  assert.equal(detailArticleCount(detailHtml), 10);
  assert.equal(classCount(detailHtml, "campaign-official-figure"), 10);
  assert.match(
    detailHtml,
    /data-campaign-code="2938"><img src="\/assets\/campaigns\/official\/2938-detail\.(?:png|jpg)"/,
  );
  assert.doesNotMatch(detailHtml, /<details class="offer-detail"/);
  assert.match(
    detailText,
    /1円 \+ 0円 − 0ポイント − 0円相当 = 1円/,
  );
  assert.match(detailText, /対象Android製品を最大22,000円値引き/);
  assert.match(
    detailText,
    /算出不可の理由：キャンペーン適用後の端末価格が確定できないため/,
  );
  assert.match(
    detailText,
    /端末価格に反映/,
  );
  assert.match(detailText, /25,000ポイント/);
  assert.match(detailText, /550円\/月〜/);
  assert.match(detailText, /おすすめなポイント/);
  assert.match(detailText, /気になるポイント/);
});

test("keeps new-number and MNP-only device campaigns separate", async () => {
  const response = await render(
    "/device-campaigns?application=new-number",
  );
  const html = await response.text();
  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  const rankingText = plainText(rankingHtml);
  const rankingTableText = tableBodyText(rankingHtml);
  const primaryRankingTable = rankingTableHtml(
    rankingHtml,
    "comparison-table-primary",
  );

  assert.match(
    rankingHtml,
    /href="\/device-campaigns\?application=new-number"[^>]*aria-selected="true"/,
  );
  assert.equal(tableRowCount(primaryRankingTable), 7);
  assert.doesNotMatch(rankingHtml, /<details class="ranking-overflow">/);
  assertInOrder(rankingTableText, ["25,000", "13,000", "6,000"]);
  assert.deepEqual(rankingPoints(rankingHtml).slice(0, 4), [
    25_000,
    13_000,
    6_000,
    0,
  ]);
  assert.match(
    rankingText,
    /【ショップ限定】18歳までのスマホデビュー応援キャンペーン/,
  );
  assert.doesNotMatch(
    rankingText,
    /Galaxyメガ得祭限定！Samsung Galaxy S26シリーズ購入/,
  );
  assert.doesNotMatch(rankingText, /iPhone対象製品 特価キャンペーン/);

  const detailHtml = htmlFromSection(html, "detail-section");
  const detailText = plainText(detailHtml);
  assert.equal(detailArticleCount(detailHtml), 7);
  assert.equal(classCount(detailHtml, "campaign-official-figure"), 7);
  assert.doesNotMatch(detailHtml, /<details class="offer-detail"/);
  assert.match(
    detailText,
    /【ショップ限定】18歳までのスマホデビュー応援キャンペーン/,
  );
  assert.match(
    detailText,
    /1円 \+ 0円 − 0ポイント − 0円相当 = 1円/,
  );
});

test("uses one horizontally scrollable ranking table on desktop and mobile", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const mobileCss = css.slice(css.indexOf("@media (max-width: 860px)"));

  assert.doesNotMatch(mobileCss, /\.table-scroll\s*{\s*display: none;/);
  assert.doesNotMatch(css, /\.mobile-ranking-list\b/);
  assert.doesNotMatch(css, /\.mobile-ranking-card\b/);
  assert.match(
    mobileCss,
    /\.ranking-scroll-note\s*{[\s\S]*?display: block;/,
  );
  assert.match(
    css,
    /\.comparison-table\s*{[\s\S]*?min-width: 960px;/,
  );
  assert.match(
    css,
    /\.ranking-campaign-picture\s*{[\s\S]*?width: 96px;[\s\S]*?height: 96px;/,
  );
  assert.match(
    mobileCss,
    /\.campaign-column\s*{[\s\S]*?position: sticky;[\s\S]*?width: 160px;[\s\S]*?min-width: 160px;/,
  );
  assert.match(
    mobileCss,
    /\.ranking-campaign-picture\s*{[\s\S]*?width: 84px;[\s\S]*?height: 84px;/,
  );
  assert.match(
    css,
    /\.campaign-official-figure\s*{[\s\S]*?width: 320px;[\s\S]*?max-width: 100%;/,
  );
  assert.match(
    css,
    /\.winner-campaign-figure\s*{[\s\S]*?width: 320px;[\s\S]*?max-width: 100%;/,
  );
  assert.match(
    css,
    /\.winner-campaign-picture\s*{[\s\S]*?aspect-ratio: 1 \/ 1;/,
  );
  assert.match(
    css,
    /\.campaign-detail-picture\s*{[\s\S]*?aspect-ratio: 1 \/ 1;/,
  );
  assert.match(
    css,
    /\.official-campaign-picture img\s*{[\s\S]*?object-fit: contain;/,
  );
  assert.match(
    mobileCss,
    /\.campaign-official-figure\s*{[\s\S]*?width: 100%;/,
  );
});
