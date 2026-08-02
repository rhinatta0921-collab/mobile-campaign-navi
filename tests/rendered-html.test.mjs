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
  assert.match(text, /2026年7月31日 更新/);
  assert.doesNotMatch(text, /最終確認:/);
  assert.match(text, /申込者向け固定ポイントでは、最大13,000ポイント/);

  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  const rankingText = plainText(rankingHtml);
  const rankingTableText = tableBodyText(rankingHtml);
  assert.match(
    rankingHtml,
    /href="\/\?application=mnp"[^>]*aria-selected="true"/,
  );
  assert.match(rankingText, /申込者ポイント/);
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

  const detailText = plainText(htmlFromSection(html, "detail-section"));
  assert.match(detailText, /キャンペーンコード 1784/);
  assert.match(detailText, /申込者分13,000ポイント/);
  assert.match(detailText, /紹介者の7,000ポイントは除外/);
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
  assert.match(detailText, /この金額は詳細確認用です。ランキング順位には影響しません/);
});

test("switches to new-number points without mixing MNP-only campaigns", async () => {
  const response = await render("/?application=new-number");
  const html = await response.text();
  const rankingHtml = sectionHtml(html, "ranking-section");
  assert.ok(rankingHtml);
  const rankingText = plainText(rankingHtml);
  const rankingTableText = tableBodyText(rankingHtml);

  assert.match(
    rankingHtml,
    /href="\/\?application=new-number"[^>]*aria-selected="true"/,
  );
  assertInOrder(rankingTableText, ["11,748", "10,000", "7,000", "5,000"]);
  assert.doesNotMatch(rankingText, /楽天モバイルただいまキャンペーン/);
  assert.doesNotMatch(
    rankingText,
    /他社から乗り換えでポイントプレゼント/,
  );
  assert.match(rankingText, /0ポイント/);

  const detailText = plainText(htmlFromSection(html, "detail-section"));
  assert.match(detailText, /申込者分11,748ポイント/);
  assert.match(detailText, /申込者分10,000ポイント/);
  assert.match(detailText, /キャンペーンコード 2142/);
  assert.doesNotMatch(detailText, /キャンペーンコード 2207/);
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
  assert.match(
    rankingHtml,
    /href="\/device-campaigns\?application=mnp"[^>]*aria-selected="true"/,
  );
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

  const detailText = plainText(htmlFromSection(html, "detail-section"));
  assert.match(
    detailText,
    /1円 \+ 0円 − 0ポイント − 0円相当 = 1円/,
  );
  assert.match(detailText, /対象Android製品を最大22,000円値引き/);
  assert.match(
    detailText,
    /算出不可（キャンペーン適用後の端末価格が確定できないため）/,
  );
  assert.match(
    detailText,
    /端末価格に反映。特典額の単独換算はしません/,
  );
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

  assert.match(
    rankingHtml,
    /href="\/device-campaigns\?application=new-number"[^>]*aria-selected="true"/,
  );
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

  const detailText = plainText(htmlFromSection(html, "detail-section"));
  assert.match(detailText, /キャンペーンコード 3186/);
  assert.match(
    detailText,
    /1円 \+ 0円 − 0ポイント − 0円相当 = 1円/,
  );
});
