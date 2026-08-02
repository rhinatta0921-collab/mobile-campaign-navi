import assert from "node:assert/strict";
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

test("renders the official-code MNP ranking by default", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /楽天モバイル キャンペーン(?: | )ナビ/);
  assert.match(
    html,
    /楽天モバイル申し込みキャンペーンおすすめ比較ランキング/,
  );
  assert.match(html, /2026年7月31日/);
  assert.match(html, /キャンペーンコード単位で整理/);
  assert.match(html, /値引き、無料期間、倍率、抽選/);
  assert.match(html, /端末購入不要・固定ポイント特典/);
  assert.match(html, /実質配布ポイント額ランキング/);
  assert.match(html, /ランキング掲載キャンペーンの詳細/);
  assert.match(
    html,
    /本ページは楽天モバイル公式サイトではありません/,
  );
  assert.match(
    html,
    /href="\/device-campaigns"[^>]*>スマホ本体の購入が必要なキャンペーンを見る/,
  );
  assert.doesNotMatch(
    html,
    /summary-strip|side-card|runner-up-grid|mini-result|次点キャンペーン/,
  );

  const conclusionHtml = sectionHtml(html, "conclusion");
  assert.ok(conclusionHtml);
  assert.match(conclusionHtml, /1位/);
  assert.match(conclusionHtml, /20,000/);
  assert.match(
    conclusionHtml,
    /Rakuten最強プラン紹介キャンペーン/,
  );
  assert.doesNotMatch(conclusionHtml, /2位|3位|4位/);

  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/\?application=mnp"[^>]*aria-selected="true"/,
  );
  assert.match(rankingHtml, /20,000/);
  assert.match(rankingHtml, /11,748/);
  assert.match(rankingHtml, /10,000/);
  assert.ok(
    rankingHtml.indexOf("20,000") < rankingHtml.indexOf("11,748"),
  );
  assert.doesNotMatch(
    rankingHtml,
    /Apple Watch購入＆電話番号シェアサービス加入キャンペーン/,
  );
  assert.doesNotMatch(rankingHtml, /iPhone対象製品 特価キャンペーン/);

  const detailHtml = htmlFromSection(html, "detail-section");
  const detailText = detailHtml.replaceAll("<!-- -->", "");
  assert.match(detailText, /キャンペーンコード 1784/);
  assert.match(detailHtml, /最大20,000ポイント/);
  assert.match(detailText, /キャンペーンコード 2091/);
});

test("switches the main ranking and details to new-number points", async () => {
  const response = await render("/?application=new-number");
  const html = await response.text();
  const rankingHtml = sectionHtml(html, "ranking-section");
  const detailHtml = htmlFromSection(html, "detail-section");
  const detailText = detailHtml.replaceAll("<!-- -->", "");

  assert.ok(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/\?application=new-number"[^>]*aria-selected="true"/,
  );
  assert.match(rankingHtml, /17,000/);
  assert.match(rankingHtml, /11,748/);
  assert.match(rankingHtml, /7,000/);
  assert.doesNotMatch(rankingHtml, /楽天モバイルただいまキャンペーン/);
  assert.doesNotMatch(
    rankingHtml,
    /他社から乗り換えでポイントプレゼント/,
  );
  assert.match(
    rankingHtml,
    /ランキング表と詳細欄が切り替わります/,
  );
  assert.match(detailHtml, /最大17,000ポイント/);
  assert.match(detailText, /キャンペーンコード 2142/);
  assert.doesNotMatch(
    detailText,
    /キャンペーンコード 2207/,
  );
});

test("renders only fixed-point device campaigns on the device page", async () => {
  const response = await render("/device-campaigns");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(
    html,
    /スマホ本体の購入が必要な楽天モバイルキャンペーン比較/,
  );
  assert.match(html, /公式コード単位で掲載/);
  assert.match(
    html,
    /Apple Watch購入＆電話番号シェアサービス加入キャンペーン/,
  );
  assert.match(
    html,
    /「Rakuten最強プラン」＋対象Android製品購入でポイント還元/,
  );
  assert.match(
    html,
    /href="\/"[^>]*>スマホ本体の購入が不要なキャンペーンを見る/,
  );
  assert.doesNotMatch(
    html,
    /Rakuten最強プラン紹介キャンペーン/,
  );

  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/device-campaigns\?application=mnp"[^>]*aria-selected="true"/,
  );
  assert.match(rankingHtml, /25,000/);
  assert.match(rankingHtml, /13,000/);
  assert.match(rankingHtml, /7,000/);
  assert.match(rankingHtml, /6,000/);

  const detailHtml = htmlFromSection(html, "detail-section");
  const detailText = detailHtml.replaceAll("<!-- -->", "");
  assert.match(detailText, /キャンペーンコード 2602/);
  assert.match(detailHtml, /最大25,000ポイント/);
  assert.match(detailText, /キャンペーンコード 2006/);
});

test("switches the device ranking and details to new-number points", async () => {
  const response = await render(
    "/device-campaigns?application=new-number",
  );
  const html = await response.text();
  const rankingHtml = sectionHtml(html, "ranking-section");
  const detailHtml = htmlFromSection(html, "detail-section");
  const detailText = detailHtml.replaceAll("<!-- -->", "");

  assert.ok(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/device-campaigns\?application=new-number"[^>]*aria-selected="true"/,
  );
  assert.match(rankingHtml, /25,000/);
  assert.match(rankingHtml, /13,000/);
  assert.match(rankingHtml, /6,000/);
  assert.doesNotMatch(
    rankingHtml,
    /Galaxyメガ得祭限定！Samsung Galaxy S26シリーズ購入/,
  );
  assert.match(detailHtml, /最大25,000ポイント/);
  assert.match(detailHtml, /最大13,000ポイント/);
  assert.match(detailHtml, /最大6,000ポイント/);
  assert.doesNotMatch(
    detailText,
    /キャンペーンコード 3303/,
  );
});
