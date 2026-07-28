import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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

test("renders the SIM-only campaign ranking page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /楽天モバイル キャンペーン(?: | )ナビ/);
  assert.match(html, /楽天モバイル申し込みキャンペーンおすすめ比較ランキング/);
  assert.match(html, /href="#how-to-choose"[^>]*>選び方/);
  assert.match(html, /キャンペーンの選び方/);
  assert.match(html, /SIM（回線）のみ/);
  assert.match(html, /SIM＋スマホ本体購入/);
  assert.match(html, /SIM＋その他サービスの申込・利用/);
  assert.match(html, /比較ランキング/);
  assert.match(html, /14,000/);
  assert.match(html, /13,000/);
  assert.match(html, /2,162/);
  assert.match(html, /公式ページで確認/);
  assert.doesNotMatch(html, /summary-strip|side-card|比較条件|runner-up-grid|mini-result|次点キャンペーン/);
  assert.doesNotMatch(html, /react-loading-skeleton|codex-preview/i);

  const conclusionHtml = html.match(
    /<section class="conclusion"[^>]*>[\s\S]*?<\/section>/,
  )?.[0];
  assert.ok(conclusionHtml);
  assert.match(conclusionHtml, /1位/);
  assert.doesNotMatch(conclusionHtml, /2位|3位|4位/);

  assert.match(html, /<td class="rank-cell">2(?:<!-- -->)?位<\/td>/);
  assert.match(html, /<td class="rank-cell">3(?:<!-- -->)?位<\/td>/);
  assert.match(html, /<td class="rank-cell">4(?:<!-- -->)?位<\/td>/);
});

test("keeps excluded device-purchase campaigns out of the ranking", async () => {
  const response = await render();
  const html = await response.text();

  assert.doesNotMatch(html, /Apple Watch購入/);
  assert.doesNotMatch(html, /対象iPhone.*最大36,000/);
  assert.doesNotMatch(html, /Rakuten WiFi Pocket.*1円/);
});
