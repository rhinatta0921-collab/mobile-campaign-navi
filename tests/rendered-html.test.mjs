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
  assert.match(html, /楽天モバイル SIMのみ入会キャンペーンランキング/);
  assert.match(html, /スマホを買わずに使える/);
  assert.match(html, /14,000/);
  assert.match(html, /13,000/);
  assert.match(html, /2,162/);
  assert.match(html, /公式ページで確認/);
  assert.doesNotMatch(html, /react-loading-skeleton|codex-preview/i);
});

test("keeps excluded device-purchase campaigns out of the ranking", async () => {
  const response = await render();
  const html = await response.text();

  assert.doesNotMatch(html, /Apple Watch購入/);
  assert.doesNotMatch(html, /対象iPhone.*最大36,000/);
  assert.doesNotMatch(html, /Rakuten WiFi Pocket.*1円/);
});
