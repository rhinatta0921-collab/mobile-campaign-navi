import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(pathname) {
  return JSON.parse(
    await readFile(new URL(pathname, import.meta.url), "utf8"),
  );
}

test("configures the official custom domain with a Worker-first asset binding", async () => {
  const config = await readJson("../wrangler.jsonc");

  assert.equal(config.name, "rakuten-mobile-campaign-navi");
  assert.equal(config.main, "./worker/index.mjs");
  assert.deepEqual(config.compatibility_flags, ["nodejs_compat"]);
  assert.equal(config.workers_dev, true);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.routes, [
    {
      pattern: "r-mobile.kuraberaku.com",
      custom_domain: true,
    },
  ]);
  assert.equal(config.assets.directory, "./out");
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.not_found_handling, "404-page");
  assert.equal(config.assets.html_handling, "auto-trailing-slash");
  assert.equal(config.assets.run_worker_first, true);
  assert.equal("site" in config, false);
});

test("marks Cloudflare Workers and Pages previews as noindex", async () => {
  const headers = await readFile(
    new URL("../public/_headers", import.meta.url),
    "utf8",
  );

  assert.equal(
    headers,
    [
      "https://:version.:subdomain.workers.dev/*",
      "  X-Robots-Tag: noindex",
      "",
      "https://:project.pages.dev/*",
      "  X-Robots-Tag: noindex",
      "",
      "https://:version.:project.pages.dev/*",
      "  X-Robots-Tag: noindex",
      "",
    ].join("\n"),
  );
});

test("pins Workers Builds to Wrangler 4", async () => {
  const packageJson = await readJson("../package.json");

  assert.match(packageJson.devDependencies.wrangler, /^\^4\./);
  assert.equal(packageJson.scripts.build, "next build");
});
