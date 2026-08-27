import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import {
  campaignFromExtraction,
  catalogVersion,
  extractCampaignWithOpenAI,
  extractRuleFacts,
  isAbnormalListingDelta,
  isExplicitlyEnded,
  validateExtractionEvidence,
  withCatalogMetadata,
} from "../scripts/lib/campaign-automation.mjs";
import {
  buildNotification,
  sendNotification,
} from "../scripts/notify-campaign-sync.mjs";
import { verifyProductionHtml } from "../scripts/verify-campaign-production.mjs";

const execFileAsync = promisify(execFile);
const automationScript = fileURLToPath(
  new URL("../scripts/automate-campaigns.mjs", import.meta.url),
);

function curatedCampaign(overrides = {}) {
  return {
    codeType: "campaign",
    title: "紹介キャンペーン",
    editorial: {
      headline: "紹介キャンペーンの見出し",
      paragraphs: ["紹介キャンペーンの本文"],
      goodPoints: ["13,000ポイント"],
      concerns: ["条件確認"],
    },
    summary: "紹介で13,000ポイント",
    benefit: {
      type: "points",
      amount: 13_000,
      unit: "ポイント",
      description: "最大13,000ポイントを進呈します。",
    },
    points: { newNumber: 10_000, mnp: 13_000 },
    breakdown: {
      newNumber: ["最大10,000ポイント"],
      mnp: ["最大13,000ポイント"],
    },
    target: "楽天モバイルへ申し込む方",
    conditions: ["公式ページで条件確認"],
    channel: "Web",
    category: "simOnly",
    audience: "applicant",
    period: "終了日未定",
    notes: ["手動補正"],
    requiresDevicePurchase: false,
    rankingEligible: true,
    ...overrides,
  };
}

function listing(cards = []) {
  return `
    <a href="/campaign/member/?l-id=campaign_campaign_member">会員向け</a>
    ${cards.join("\n")}
    過去のキャンペーン・特典はこちら
  `;
}

function existingCampaign(checkedAt = "2026-08-22") {
  const sourceCards = [
    {
      listingIndex: 1,
      title: "紹介キャンペーン",
      description: "紹介で13,000ポイント",
      url: "https://network.mobile.rakuten.co.jp/campaign/referral/",
    },
  ];
  return withCatalogMetadata(
    {
      campaignCode: "1784",
      ...curatedCampaign(),
      officialUrl:
        "https://network.mobile.rakuten.co.jp/campaign/referral/",
      listingUrl: "https://network.mobile.rakuten.co.jp/campaign/",
      checkedAt,
      sourceCards,
    },
    {
      checkedAt,
      listingPresence: "listed",
    },
  );
}

async function setupCatalog(t, { empty = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-auto-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dataDirectory = path.join(root, "campaigns");
  const generatedDirectory = path.join(dataDirectory, "generated");
  const detailDirectory = path.join(root, "details");
  await Promise.all([
    mkdir(generatedDirectory, { recursive: true }),
    mkdir(detailDirectory, { recursive: true }),
  ]);
  const campaign = empty ? null : existingCampaign();
  const items = campaign ? ["1784-campaign-referral.campaign.json"] : [];
  const campaigns = campaign ? [campaign] : [];
  await Promise.all([
    writeFile(
      path.join(dataDirectory, "curated-overrides.json"),
      `${JSON.stringify(empty ? {} : { "1784": curatedCampaign() }, null, 2)}\n`,
    ),
    campaign
      ? writeFile(
          path.join(generatedDirectory, items[0]),
          `${JSON.stringify(campaign, null, 2)}\n`,
        )
      : Promise.resolve(),
    writeFile(
      path.join(generatedDirectory, "index.json"),
      `${JSON.stringify(
        {
          listingUrl: "https://network.mobile.rakuten.co.jp/campaign/",
          checkedAt: "2026-08-22",
          lastSuccessfulCheckAt: "2026-08-22",
          lastContentChangeAt: "2026-08-22",
          catalogVersion: catalogVersion(campaigns),
          listingCardCount: campaign ? 1 : 0,
          campaignCount: campaigns.length,
          statusCounts: {
            published: campaign ? 1 : 0,
            excluded: 0,
            pending: 0,
            ended: 0,
          },
          missingFromListing: {},
          items,
        },
        null,
        2,
      )}\n`,
    ),
  ]);
  return { root, dataDirectory, generatedDirectory, detailDirectory };
}

async function runAutomation({
  checkedAt,
  dataDirectory,
  detailDirectory,
  root,
  sourceHtml,
}) {
  const sourcePath = path.join(root, `listing-${checkedAt}.html`);
  const reportPath = path.join(root, `report-${checkedAt}.json`);
  await writeFile(sourcePath, sourceHtml);
  await execFileAsync(
    process.execPath,
    [
      automationScript,
      `--data-directory=${dataDirectory}`,
      `--source-html=${sourcePath}`,
      `--source-details-directory=${detailDirectory}`,
      `--report-path=${reportPath}`,
      `--checked-at=${checkedAt}`,
      "--write",
    ],
    { env: { ...process.env, OPENAI_API_KEY: "" } },
  );
  return JSON.parse(await readFile(reportPath, "utf8"));
}

test("guards large listing deltas and validates rule-extracted point evidence", () => {
  assert.equal(isAbnormalListingDelta(50, 39), true);
  assert.equal(isAbnormalListingDelta(50, 40), false);
  assert.equal(isAbnormalListingDelta(50, 60), false);
  assert.equal(isExplicitlyEnded(404, ""), true);
  assert.equal(
    isExplicitlyEnded(
      200,
      "通常の案内",
      "https://network.mobile.rakuten.co.jp/campaign/archive/example/",
    ),
    true,
  );
  const source = "楽天モバイルへMNPで申し込み。6,000ポイントと7,000ポイントを進呈。";
  assert.deepEqual(extractRuleFacts(source).pointAmounts, [6_000, 7_000]);
  const extraction = {
    points: { mnp: 13_000, newNumber: null },
    pointComponents: { mnp: [6_000, 7_000], newNumber: [] },
    evidence: [{ field: "points.mnp", quote: "6,000ポイント" }],
  };
  assert.deepEqual(validateExtractionEvidence(extraction, source), []);
  assert.match(
    validateExtractionEvidence(
      {
        ...extraction,
        pointComponents: { mnp: [6_000, 8_000], newNumber: [] },
      },
      source,
    ).join(" "),
    /ポイント根拠|内訳合計/,
  );
});

test("uses strict Responses output with store disabled and recalculates totals", async () => {
  const extracted = {
    title: "MNP特典",
    summary: "MNP申込者へポイントを進呈",
    benefit: {
      type: "points",
      amount: 13_000,
      unit: "ポイント",
      description: "内訳合計13,000ポイント",
    },
    points: { mnp: 13_000, newNumber: 6_000 },
    pointComponents: { mnp: [6_000, 7_000], newNumber: [6_000] },
    target: "楽天モバイルへ申し込む方",
    conditions: ["Rakuten Link利用"],
    channel: "Web",
    category: "simOnly",
    audience: "applicant",
    period: "終了日未定",
    editorial: {
      headline: "MNP特典",
      paragraphs: ["公式条件を確認してください。"],
      goodPoints: ["高ポイント"],
      concerns: ["利用条件あり"],
    },
    evidence: [
      { field: "points.mnp", quote: "6,000ポイント" },
      { field: "points.mnp", quote: "7,000ポイント" },
    ],
  };
  let request;
  const result = await extractCampaignWithOpenAI({
    apiKey: "test-key",
    officialUrl: "https://network.mobile.rakuten.co.jp/campaign/test/",
    sourceText:
      "楽天モバイルへMNPまたは新規でお申し込み。6,000ポイントと7,000ポイントを進呈。",
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              content: [
                { type: "output_text", text: JSON.stringify(extracted) },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.body.store, false);
  assert.equal(request.body.text.format.strict, true);
  assert.equal(request.body.model, "gpt-5.6-terra");
  const campaign = campaignFromExtraction(
    {
      campaignCode: "TEST",
      notes: [],
    },
    result.extracted,
    "楽天モバイルへMNPまたは新規でお申し込み。6,000ポイントと7,000ポイントを進呈。",
  );
  assert.deepEqual(campaign.points, { mnp: 13_000, newNumber: 6_000 });
});

test("keeps unchanged campaign JSON and advances only the successful check", async (t) => {
  const fixture = await setupCatalog(t);
  const filename = path.join(
    fixture.generatedDirectory,
    "1784-campaign-referral.campaign.json",
  );
  const before = await readFile(filename, "utf8");
  const report = await runAutomation({
    ...fixture,
    checkedAt: "2026-08-27",
    sourceHtml: listing([
      '<a href="/campaign/referral/"><img alt="紹介キャンペーン"><p>紹介で13,000ポイント</p></a>',
    ]),
  });
  assert.equal(report.safeToPublish, true);
  assert.equal(report.contentChanged, false);
  assert.equal(await readFile(filename, "utf8"), before);
  const index = JSON.parse(
    await readFile(path.join(fixture.generatedDirectory, "index.json"), "utf8"),
  );
  assert.equal(index.lastSuccessfulCheckAt, "2026-08-27");
  assert.equal(index.lastContentChangeAt, "2026-08-22");
});

test("requires two consecutive listing misses before archiving", async (t) => {
  const fixture = await setupCatalog(t);
  const first = await runAutomation({
    ...fixture,
    checkedAt: "2026-08-27",
    sourceHtml: listing(),
  });
  assert.equal(first.ended.length, 0);
  assert.equal(first.warnings.length, 1);
  let index = JSON.parse(
    await readFile(path.join(fixture.generatedDirectory, "index.json"), "utf8"),
  );
  assert.equal(index.campaignCount, 1);
  assert.deepEqual(index.missingFromListing, { "1784": 1 });

  const second = await runAutomation({
    ...fixture,
    checkedAt: "2026-08-28",
    sourceHtml: listing(),
  });
  assert.equal(second.ended.length, 1);
  index = JSON.parse(
    await readFile(path.join(fixture.generatedDirectory, "index.json"), "utf8"),
  );
  assert.equal(index.campaignCount, 0);
  const archivedFiles = await readdir(path.join(fixture.dataDirectory, "archive"));
  const archiveName = archivedFiles.find((name) => name.endsWith(".ended.json"));
  assert.ok(archiveName);
  const archived = JSON.parse(
    await readFile(path.join(fixture.dataDirectory, "archive", archiveName), "utf8"),
  );
  assert.equal(archived.publicationStatus, "ended");
  assert.match(archived.endReason, /2回連続/);
});

test("stores an unverified new campaign as pending and keeps it out of publication", async (t) => {
  const fixture = await setupCatalog(t, { empty: true });
  const report = await runAutomation({
    ...fixture,
    checkedAt: "2026-08-27",
    sourceHtml: listing([
      '<a href="/campaign/new-offer/"><img alt="新しい特典"><p>詳細確認中</p></a>',
    ]),
  });
  assert.equal(report.safeToPublish, true);
  assert.equal(report.requiresAttention, true);
  assert.equal(report.pending.length, 1);
  const files = (await readdir(fixture.generatedDirectory)).filter((name) =>
    name.endsWith(".campaign.json"),
  );
  assert.equal(files.length, 1);
  const campaign = JSON.parse(
    await readFile(path.join(fixture.generatedDirectory, files[0]), "utf8"),
  );
  assert.equal(campaign.publicationStatus, "pending");
  assert.equal(campaign.rankingEligible, false);
});

test("builds actionable Resend mail with a stable run idempotency key", async () => {
  const report = {
    checkedAt: "2026-08-27",
    safeToPublish: true,
    additions: [],
    changes: [],
    ended: [],
    pending: [
      {
        campaignCode: "NEW",
        officialUrl: "https://example.com/new",
        reason: "根拠不足",
      },
    ],
    warnings: [],
    errors: [],
  };
  const environment = {
    GITHUB_SERVER_URL: "https://github.com",
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_RUN_ID: "123",
    GITHUB_RUN_ATTEMPT: "2",
  };
  assert.match(buildNotification(report, environment).text, /根拠不足/);
  let request;
  await sendNotification({
    report,
    apiKey: "resend-key",
    from: "alerts@example.com",
    to: "one@example.com,two@example.com",
    environment,
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ id: "email-id" }), { status: 200 });
    },
  });
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.headers["idempotency-key"], "owner/repo:123:2");
  assert.deepEqual(request.body.to, ["one@example.com", "two@example.com"]);
});

test("verifies the deployed catalog version and successful check date", () => {
  const index = {
    catalogVersion: "0123456789abcdef",
    lastSuccessfulCheckAt: "2026-08-27",
  };
  const html = `
    <meta name="campaign-catalog-version" content="0123456789abcdef">
    <h1>楽天モバイル【2026年8月27日最終確認】</h1>
  `;
  assert.deepEqual(verifyProductionHtml(html, index), []);
  assert.equal(verifyProductionHtml("<html></html>", index).length, 2);
});
