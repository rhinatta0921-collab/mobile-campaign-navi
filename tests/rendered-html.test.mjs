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

test("renders the original page text and MNP ranking by default", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /楽天モバイル キャンペーン(?: | )ナビ/);
  assert.match(
    html,
    /楽天モバイル申し込みキャンペーンおすすめ比較ランキング/,
  );
  assert.match(html, /href="#how-to-choose"[^>]*>選び方/);
  assert.match(html, /キャンペーンの選び方/);
  assert.match(html, /SIM（回線）のみ/);
  assert.match(html, /SIM＋スマホ本体購入/);
  assert.match(html, /SIM＋その他サービスの申込・利用/);
  assert.match(html, /楽天モバイル申し込みキャンペーン全N種比較/);
  assert.match(html, /実質配布ポイント額ランキング/);
  assert.match(html, /ランキング掲載キャンペーンの詳細/);
  assert.match(html, /ランキングから外したもの/);
  assert.match(html, /対象外にしたキャンペーン/);
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
    /summary-strip|side-card|比較条件|runner-up-grid|mini-result|次点キャンペーン/,
  );
  assert.doesNotMatch(html, /react-loading-skeleton|codex-preview/i);

  const conclusionHtml = sectionHtml(html, "conclusion");
  assert.ok(conclusionHtml);
  assert.match(conclusionHtml, /1位/);
  assert.match(conclusionHtml, /14,000/);
  assert.doesNotMatch(conclusionHtml, /2位|3位|4位/);

  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/\?application=mnp"[^>]*aria-selected="true"/,
  );
  assert.doesNotMatch(rankingHtml, /href="[^"]*#ranking"/);
  assert.match(rankingHtml, /14,000/);
  assert.match(rankingHtml, /13,000/);
  assert.match(
    rankingHtml,
    /<td class="rank-cell">2(?:<!-- -->)?位<\/td>/,
  );
  assert.doesNotMatch(
    rankingHtml,
    /対象iPhone購入＋楽天モバイル申込特典/,
  );

  const detailHtml = htmlFromSection(html, "detail-section");
  assert.match(detailHtml, /ショップ限定 初めて申込＋MNP＋楽天市場でお買い物/);
  assert.match(detailHtml, /14,000/);
  assert.match(
    detailHtml,
    /初めて申込＋他社から乗り換え: 10,000ポイント/,
  );
});

test("switches the main ranking and details to new-number points", async () => {
  const response = await render("/?application=new-number");
  const html = await response.text();
  const rankingHtml = sectionHtml(html, "ranking-section");
  const detailHtml = htmlFromSection(html, "detail-section");

  assert.ok(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/\?application=new-number"[^>]*aria-selected="true"/,
  );
  assert.doesNotMatch(rankingHtml, /href="[^"]*#ranking"/);
  assert.match(rankingHtml, /11,000/);
  assert.match(rankingHtml, /10,000/);
  assert.doesNotMatch(
    rankingHtml,
    /過去利用者限定 ただいまキャンペーン/,
  );
  assert.match(
    rankingHtml,
    /ランキング表と詳細欄が切り替わります/,
  );
  assert.match(detailHtml, /ショップ限定 初めて申込＋MNP＋楽天市場でお買い物/);
  assert.match(detailHtml, /11,000/);
  assert.match(
    detailHtml,
    /初めて申込＋新しい電話番号: 7,000ポイント/,
  );
  assert.doesNotMatch(
    detailHtml,
    /過去利用者限定 ただいまキャンペーン/,
  );
  assert.ok(
    detailHtml.indexOf(
      "ショップ限定 初めて申込＋MNP＋楽天市場でお買い物",
    ) <
      detailHtml.indexOf(
        "楽天モバイル紹介キャンペーン（紹介される方）",
      ),
  );
});

test("renders only device-purchase campaigns on the device page", async () => {
  const response = await render("/device-campaigns");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(
    html,
    /スマホ本体の購入が必要な楽天モバイルキャンペーン比較/,
  );
  assert.match(html, /対象iPhone購入＋楽天モバイル申込特典/);
  assert.match(html, /対象Android購入＋楽天モバイル申込特典/);
  assert.match(
    html,
    /買い替え超トクプログラム＋楽天モバイル申込特典/,
  );
  assert.match(
    html,
    /href="\/"[^>]*>スマホ本体の購入が不要なキャンペーンを見る/,
  );
  assert.doesNotMatch(
    html,
    /ショップ限定 初めて申込＋MNP＋楽天市場でお買い物/,
  );

  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/device-campaigns\?application=mnp"[^>]*aria-selected="true"/,
  );
  assert.doesNotMatch(rankingHtml, /href="[^"]*#ranking"/);
  assert.match(rankingHtml, /20,000/);

  const detailHtml = htmlFromSection(html, "detail-section");
  assert.match(detailHtml, /対象iPhone購入＋楽天モバイル申込特典/);
  assert.match(detailHtml, /20,000/);
  assert.match(
    detailHtml,
    /対象iPhone購入＋他社から乗り換え: 20,000ポイント/,
  );
});

test("switches the device ranking and details to new-number points", async () => {
  const response = await render(
    "/device-campaigns?application=new-number",
  );
  const html = await response.text();
  const rankingHtml = sectionHtml(html, "ranking-section");
  const detailHtml = htmlFromSection(html, "detail-section");

  assert.ok(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/device-campaigns\?application=new-number"[^>]*aria-selected="true"/,
  );
  assert.doesNotMatch(rankingHtml, /href="[^"]*#ranking"/);
  assert.match(rankingHtml, /12,000/);
  assert.match(rankingHtml, /10,000/);
  assert.match(detailHtml, /対象iPhone購入＋楽天モバイル申込特典/);
  assert.match(detailHtml, /12,000/);
  assert.match(
    detailHtml,
    /対象iPhone購入＋新しい電話番号で申込: 12,000ポイント/,
  );
  assert.doesNotMatch(
    detailHtml,
    /対象iPhone購入＋他社から乗り換え: 20,000ポイント/,
  );
});
