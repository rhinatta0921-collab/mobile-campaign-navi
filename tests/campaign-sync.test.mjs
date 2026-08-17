import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(
  new URL("../scripts/sync-rakuten-campaigns.mjs", import.meta.url),
);

function curatedCampaign(overrides = {}) {
  return {
    codeType: "campaign",
    title: "編集者が確定したタイトル",
    editorial: {
      headline: "編集見出し",
      paragraphs: ["編集本文1", "編集本文2"],
      goodPoints: ["長所"],
      concerns: ["注意点"],
    },
    summary: "編集者が確定した要約",
    benefit: {
      type: "points",
      amount: 13_000,
      unit: "ポイント",
      description: "申込者本人へポイントを進呈します。",
    },
    points: { newNumber: 10_000, mnp: 13_000 },
    breakdown: {
      newNumber: ["10,000ポイント"],
      mnp: ["13,000ポイント"],
    },
    target: "編集対象者",
    conditions: ["紹介ログイン"],
    channel: "Web",
    category: "simOnly",
    audience: "applicant",
    period: "終了日未定",
    notes: ["手動補正を保持"],
    requiresDevicePurchase: false,
    rankingEligible: true,
    ...overrides,
  };
}

test("sync preserves editorial, application URL, and manual point corrections", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "campaign-sync-test-"),
  );
  const dataDirectory = path.join(temporaryRoot, "campaigns");
  const generatedDirectory = path.join(dataDirectory, "generated");
  await mkdir(generatedDirectory, { recursive: true });

  const overrides = {
    "1784": curatedCampaign({ applicationUrl: "https://example.com/referral" }),
    "2162": curatedCampaign({
      supplemental: true,
      officialUrl:
        "https://network.mobile.rakuten.co.jp/campaign/referral-application-employee/",
      applicationUrl: "https://r10.to/hkD5ah",
      points: { newNumber: 11_000, mnp: 14_000 },
      breakdown: {
        newNumber: ["11,000ポイント"],
        mnp: ["14,000ポイント"],
      },
    }),
  };
  const listingHtml = `
    <a href="/campaign/member/?l-id=campaign_campaign_member">会員向け</a>
    <a href="/campaign/referral/"><img alt="取得タイトル"><p>取得要約</p></a>
    過去のキャンペーン・特典はこちら
  `;
  const sourceHtmlPath = path.join(temporaryRoot, "listing.html");
  await Promise.all([
    writeFile(
      path.join(dataDirectory, "curated-overrides.json"),
      `${JSON.stringify(overrides, null, 2)}\n`,
    ),
    writeFile(
      path.join(generatedDirectory, "index.json"),
      `${JSON.stringify({
        listingUrl: "https://network.mobile.rakuten.co.jp/campaign/",
        checkedAt: "2026-08-16",
        listingCardCount: 1,
        campaignCount: 0,
        items: [],
      })}\n`,
    ),
    writeFile(sourceHtmlPath, listingHtml),
  ]);

  const sharedArguments = [
    scriptPath,
    `--data-directory=${dataDirectory}`,
    `--source-html=${sourceHtmlPath}`,
    "--expected-card-count=1",
    "--checked-at=2026-08-16",
  ];
  await execFileAsync(process.execPath, [...sharedArguments, "--write"]);

  const files = await import("node:fs/promises").then(({ readdir }) =>
    readdir(generatedDirectory),
  );
  const records = await Promise.all(
    files
      .filter((filename) => filename.endsWith(".campaign.json"))
      .map((filename) =>
        readFile(path.join(generatedDirectory, filename), "utf8").then(JSON.parse),
      ),
  );
  const referral = records.find(({ campaignCode }) => campaignCode === "1784");
  const employee = records.find(({ campaignCode }) => campaignCode === "2162");

  assert.deepEqual(referral.editorial, overrides["1784"].editorial);
  assert.deepEqual(referral.points, { newNumber: 10_000, mnp: 13_000 });
  assert.equal(referral.applicationUrl, "https://example.com/referral");
  assert.equal(referral.title, "編集者が確定したタイトル");
  assert.equal(referral.sourceCards[0].title, "取得タイトル");
  assert.deepEqual(employee.editorial, overrides["2162"].editorial);
  assert.equal(employee.applicationUrl, "https://r10.to/hkD5ah");
  assert.equal(employee.sourceCards[0].listingIndex, null);

  await execFileAsync(process.execPath, [...sharedArguments, "--check"]);
});
