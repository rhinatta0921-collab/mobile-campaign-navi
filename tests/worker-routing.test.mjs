import assert from "node:assert/strict";
import test from "node:test";
import worker, {
  LEGACY_WORKERS_HOSTNAME,
  OFFICIAL_ORIGIN,
} from "../worker/index.mjs";

function createAssets(responseFactory) {
  const requests = [];
  return {
    requests,
    binding: {
      async fetch(request) {
        requests.push(request);
        return responseFactory(request);
      },
    },
  };
}

test("redirects only the stable legacy Workers hostname and preserves path and query", async () => {
  const assets = createAssets(() => new Response("unexpected"));
  const response = await worker.fetch(
    new Request(
      `https://${LEGACY_WORKERS_HOSTNAME}/campaign/detail/?utm_source=old&choice=mnp`,
    ),
    { ASSETS: assets.binding },
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    `${OFFICIAL_ORIGIN}/campaign/detail/?utm_source=old&choice=mnp`,
  );
  assert.equal(response.headers.get("x-robots-tag"), null);
  assert.equal(assets.requests.length, 0);
});

test("serves the official custom domain publicly without noindex", async () => {
  const assets = createAssets(
    () =>
      new Response("official asset", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
  );
  const request = new Request(`${OFFICIAL_ORIGIN}/?application=mnp`);
  const response = await worker.fetch(request, { ASSETS: assets.binding });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "official asset");
  assert.equal(response.headers.get("x-robots-tag"), null);
  assert.deepEqual(assets.requests, [request]);
});

test("adds noindex to Workers version previews while preserving the asset response", async () => {
  const assets = createAssets(
    () =>
      new Response("preview asset", {
        status: 404,
        statusText: "Not Found",
        headers: {
          "Cache-Control": "private",
          "Content-Type": "text/plain",
        },
      }),
  );
  const response = await worker.fetch(
    new Request(
      "https://abc123-rakuten-mobile-campaign-navi.r-hinatta0921.workers.dev/missing",
    ),
    { ASSETS: assets.binding },
  );

  assert.equal(response.status, 404);
  assert.equal(response.statusText, "Not Found");
  assert.equal(await response.text(), "preview asset");
  assert.equal(response.headers.get("cache-control"), "private");
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
  assert.equal(assets.requests.length, 1);
});
