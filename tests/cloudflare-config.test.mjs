import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(pathname) {
  return JSON.parse(
    await readFile(new URL(pathname, import.meta.url), "utf8"),
  );
}

test("configures the official custom domain for direct static asset delivery", async () => {
  const config = await readJson("../wrangler.jsonc");

  assert.equal(config.name, "rakuten-mobile-campaign-navi");
  assert.equal("main" in config, false);
  assert.equal("compatibility_flags" in config, false);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.routes, [
    {
      pattern: "r-mobile.kuraberaku.com",
      custom_domain: true,
    },
  ]);
  assert.equal(config.assets.directory, "./out");
  assert.equal(config.assets.not_found_handling, "404-page");
  assert.equal(config.assets.html_handling, "auto-trailing-slash");
  assert.equal("binding" in config.assets, false);
  assert.equal("run_worker_first" in config.assets, false);
  assert.equal("site" in config, false);
});

test("removes files used only by retired delivery paths", async () => {
  for (const pathname of [
    "../worker/index.mjs",
    "../public/_headers",
    "../.openai/hosting.json",
  ]) {
    await assert.rejects(
      readFile(new URL(pathname, import.meta.url), "utf8"),
      (error) => error.code === "ENOENT",
    );
  }
});

test("pins Workers Builds to Wrangler 4", async () => {
  const packageJson = await readJson("../package.json");

  assert.match(packageJson.devDependencies.wrangler, /^\^4\./);
  assert.equal(packageJson.scripts.build, "next build");
});
