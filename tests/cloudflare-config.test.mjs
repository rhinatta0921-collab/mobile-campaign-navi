import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(pathname) {
  return JSON.parse(
    await readFile(new URL(pathname, import.meta.url), "utf8"),
  );
}

test("configures Cloudflare as an assets-only Worker", async () => {
  const config = await readJson("../wrangler.jsonc");

  assert.equal(config.name, "mobile-campaign-navi");
  assert.equal(config.workers_dev, true);
  assert.equal(config.preview_urls, true);
  assert.equal(config.assets.directory, "./out");
  assert.equal(config.assets.not_found_handling, "404-page");
  assert.equal(config.assets.html_handling, "auto-trailing-slash");
  assert.equal(config.assets.run_worker_first, false);
  assert.equal("main" in config, false);
  assert.equal("binding" in config.assets, false);
  assert.equal("site" in config, false);
});

test("pins Workers Builds to Wrangler 4", async () => {
  const packageJson = await readJson("../package.json");

  assert.match(packageJson.devDependencies.wrangler, /^\^4\./);
  assert.equal(packageJson.scripts.build, "next build");
});
