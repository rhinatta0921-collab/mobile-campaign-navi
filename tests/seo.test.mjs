import assert from "node:assert/strict";
import test from "node:test";

const siteUrl =
  "https://rakuten-mobile-sim-campaign-ranking.hinatta0921.chatgpt.site";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("seo-test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(new URL(pathname, "http://localhost"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function attribute(html, tagPattern, name) {
  return html.match(
    new RegExp(`<${tagPattern}[^>]*\\b${name}="([^"]+)"[^>]*>`),
  )?.[1];
}

function jsonLd(html) {
  const content = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];
  assert.ok(content, "JSON-LD script");
  return JSON.parse(content);
}

test("aligns canonical, metadata, internal links, and structured data", async () => {
  for (const pathname of ["/", "/?application=mnp", "/?tracking=example"]) {
    const html = await (await render(pathname)).text();
    assert.equal(
      attribute(html, 'link rel="canonical"', "href"),
      `${siteUrl}/`,
    );
    assert.match(
      html,
      /<title>楽天モバイルのMNPキャンペーン比較ランキング【2026年8月】<\/title>/,
    );
    assert.match(html, new RegExp(`<meta property="og:url" content="${siteUrl}/"`));
    assert.match(html, /href="\/"[^>]*aria-selected="true"/);
    const graph = jsonLd(html)["@graph"];
    assert.equal(graph.find((item) => item["@type"] === "WebPage").url, `${siteUrl}/`);
    assert.equal(
      graph.find((item) => item["@type"] === "ItemList").numberOfItems,
      22,
    );
  }

  const newNumberHtml = await (
    await render("/?application=new-number&utm_source=test")
  ).text();
  const canonical = `${siteUrl}/?application=new-number`;
  assert.equal(
    attribute(newNumberHtml, 'link rel="canonical"', "href"),
    canonical,
  );
  assert.match(
    newNumberHtml,
    /<title>楽天モバイル新規契約キャンペーン比較ランキング【2026年8月】<\/title>/,
  );
  assert.match(newNumberHtml, /href="\/"[^>]*aria-selected="false"/);
  assert.match(
    newNumberHtml,
    /href="\/\?application=new-number"[^>]*aria-selected="true"/,
  );
  const graph = jsonLd(newNumberHtml)["@graph"];
  assert.equal(graph.find((item) => item["@type"] === "WebPage").url, canonical);
  assert.equal(
    graph.find((item) => item["@type"] === "ItemList").numberOfItems,
    21,
  );
});

test("publishes crawlable robots and a two-URL sitemap", async () => {
  const [robotsResponse, sitemapResponse] = await Promise.all([
    render("/robots.txt"),
    render("/sitemap.xml"),
  ]);
  const [robots, sitemap] = await Promise.all([
    robotsResponse.text(),
    sitemapResponse.text(),
  ]);
  assert.equal(robotsResponse.status, 200);
  assert.match(robots, /User-Agent: \*/i);
  assert.match(robots, /Allow: \/$/m);
  assert.match(robots, new RegExp(`Sitemap: ${siteUrl}/sitemap.xml`));
  assert.equal(sitemapResponse.status, 200);
  assert.equal([...sitemap.matchAll(/<url>/g)].length, 2);
  assert.match(sitemap, new RegExp(`<loc>${siteUrl}/</loc>`));
  assert.match(
    sitemap,
    new RegExp(`<loc>${siteUrl}/\\?application=new-number</loc>`),
  );
  assert.doesNotMatch(sitemap, /application=mnp/);
});
