import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const siteUrl = "https://rmobile.kuraberaku.com";
const legacyHostnames = [
  "rakuten-mobile-campaign-navi.r-hinatta0921.workers.dev",
  "rakuten-mobile-campaign-navi.pages.dev",
];
const employeeReferralApplicationUrl = "https://r10.to/hkD5ah";
const outDirectory = fileURLToPath(new URL("../out/", import.meta.url));

async function render(pathname) {
  const url = new URL(pathname, "http://localhost");
  const exportedFile =
    url.pathname === "/robots.txt"
      ? "../out/robots.txt"
      : url.pathname === "/sitemap.xml"
        ? "../out/sitemap.xml"
        : "../out/index.html";
  const body = await readFile(new URL(exportedFile, import.meta.url), "utf8");
  return new Response(body, { status: 200 });
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

async function exportedTextFiles(directory = outDirectory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const pathname = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await exportedTextFiles(pathname)));
      continue;
    }

    if (
      [".css", ".html", ".js", ".json", ".map", ".txt", ".xml"].includes(
        extname(entry.name),
      ) || entry.name === "_headers"
    ) {
      files.push(pathname);
    }
  }

  return files;
}

test("aligns canonical, metadata, and both structured rankings", async () => {
  for (const pathname of [
    "/",
    "/?application=mnp",
    "/?tracking=example",
    "/?application=new-number&utm_source=test",
  ]) {
    const html = await (await render(pathname)).text();
    assert.equal(attribute(html, 'link rel="canonical"', "href"), siteUrl);
    assert.match(
      html,
      /<title>楽天モバイルのMNPキャンペーン比較ランキング【2026年8月】<\/title>/,
    );
    assert.match(html, new RegExp(`<meta property="og:url" content="${siteUrl}"`));
    assert.match(
      html,
      new RegExp(`<meta property="og:image" content="${siteUrl}/og-v2\\.png"`),
    );
    assert.match(
      html,
      new RegExp(`<meta name="twitter:image" content="${siteUrl}/og-v2\\.png"`),
    );
    assert.match(
      html,
      /<button(?=[^>]*id="sim-only-ranking-tab-mnp")(?=[^>]*aria-selected="true")[^>]*>/,
    );
    assert.match(html, /data-application-ranking="mnp"/);
    assert.match(html, /data-application-ranking="new-number"/);

    const graph = jsonLd(html)["@graph"];
    const website = graph.find((item) => item["@type"] === "WebSite");
    const webpage = graph.find((item) => item["@type"] === "WebPage");
    const itemLists = graph.filter((item) => item["@type"] === "ItemList");
    assert.equal(website.url, `${siteUrl}/`);
    assert.equal(website["@id"], `${siteUrl}/#website`);
    assert.equal(webpage.url, `${siteUrl}/`);
    assert.equal(webpage.isPartOf["@id"], `${siteUrl}/#website`);
    assert.deepEqual(
      webpage.mainEntity.map((item) => item["@id"]),
      [`${siteUrl}/#ranking-mnp`, `${siteUrl}/#ranking-newNumber`],
    );
    assert.deepEqual(
      itemLists.map(({ numberOfItems }) => numberOfItems),
      [14, 13],
    );
    assert.match(itemLists[0].name, /MNP/);
    assert.match(itemLists[1].name, /新規契約/);

    for (const itemList of itemLists) {
      assert.equal(itemList.itemListElement.length, itemList.numberOfItems);
      itemList.itemListElement.forEach((listItem, index) => {
        assert.equal(listItem.position, index + 1);
        assert.match(listItem.item.url, /^https:\/\//);
        assert.notEqual(listItem.item.url, employeeReferralApplicationUrl);
      });
    }
  }
});

test("publishes crawlable robots and a one-URL sitemap", async () => {
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
  assert.equal([...sitemap.matchAll(/<url>/g)].length, 1);
  assert.match(sitemap, new RegExp(`<loc>${siteUrl}/</loc>`));
  assert.doesNotMatch(sitemap, /application=/);
});

test("keeps Workers and Pages previews noindex", async () => {
  const headers = await readFile(
    new URL("../out/_headers", import.meta.url),
    "utf8",
  );
  assert.match(
    headers,
    /https:\/\/:version\.:subdomain\.workers\.dev\/\*\n  X-Robots-Tag: noindex/,
  );
  assert.match(headers, /https:\/\/:project\.pages\.dev\/\*\n  X-Robots-Tag: noindex/);
  assert.match(
    headers,
    /https:\/\/:version\.:project\.pages\.dev\/\*\n  X-Robots-Tag: noindex/,
  );
  assert.doesNotMatch(headers, /! X-Robots-Tag/);
});

test("exports SEO references only to the official origin", async () => {
  const textFiles = await exportedTextFiles();
  assert.ok(textFiles.length > 0);

  for (const pathname of textFiles) {
    const contents = await readFile(pathname, "utf8");
    for (const legacyHostname of legacyHostnames) {
      assert.doesNotMatch(
        contents,
        new RegExp(legacyHostname.replaceAll(".", "\\."), "i"),
        `${relative(outDirectory, pathname)} contains ${legacyHostname}`,
      );
    }
  }
});

test("does not leave the private ChatGPT Sites hostname in exported text", async () => {
  const textFiles = await exportedTextFiles();
  assert.ok(textFiles.length > 0);

  for (const pathname of textFiles) {
    const contents = await readFile(pathname, "utf8");
    assert.doesNotMatch(
      contents,
      /\.chatgpt\.site/i,
      `${relative(outDirectory, pathname)} contains a ChatGPT Sites URL`,
    );
  }
});
