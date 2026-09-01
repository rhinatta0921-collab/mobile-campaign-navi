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
  officialSourceHash,
  publicationStatusAfterExtraction,
  shouldRunAiExtraction,
  validateExtractionEvidence,
  withCatalogMetadata,
} from "../scripts/lib/campaign-automation.mjs";
import {
  createCampaignAiRuntime,
  extractCampaignWithAnthropic,
} from "../scripts/lib/campaign-ai.mjs";
import {
  buildSlackPayload,
  notificationDecision,
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

function validAiExtraction() {
  return {
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
    officialSourceHash(
      "<header>更新前</header><main><a href='/campaign/test/'>本文</a></main>",
    ),
    officialSourceHash(
      "<header>更新後</header><main><a href='/campaign/test/'>本文</a></main>",
    ),
  );
  assert.equal(
    isExplicitlyEnded(
      200,
      "通常の案内",
      "https://network.mobile.rakuten.co.jp/campaign/archive/example/",
    ),
    true,
  );
  assert.equal(
    isExplicitlyEnded(
      200,
      "本キャンペーン終了後、条件を変更して実施する場合があります。",
      "https://network.mobile.rakuten.co.jp/campaign/example/",
      "1234",
    ),
    false,
  );
  assert.equal(
    isExplicitlyEnded(
      200,
      "2026年6月18日にキャンペーン終了日を未定から変更しました。",
      "https://network.mobile.rakuten.co.jp/campaign/example/",
      "1234",
    ),
    false,
  );
  assert.equal(
    isExplicitlyEnded(
      200,
      "2026年8月31日に上記（キャンペーンコード：1234）は終了しました。",
      "https://network.mobile.rakuten.co.jp/campaign/example/",
      "1234",
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

test("does not retry unchanged pending campaigns with AI", () => {
  assert.equal(
    shouldRunAiExtraction({
      hasOverride: false,
      previousPublicationStatus: "pending",
      sourceChanged: true,
      contentChanged: false,
    }),
    false,
  );
  assert.equal(
    shouldRunAiExtraction({
      hasOverride: false,
      previousPublicationStatus: "pending",
      sourceChanged: true,
      contentChanged: true,
    }),
    true,
  );
  assert.equal(
    shouldRunAiExtraction({
      hasOverride: true,
      previousPublicationStatus: "pending",
      sourceChanged: true,
      contentChanged: true,
    }),
    false,
  );
  assert.equal(
    publicationStatusAfterExtraction({
      hasOverride: false,
      previousPublicationStatus: "pending",
      derivedPublicationStatus: "published",
    }),
    "pending",
  );
  assert.equal(
    publicationStatusAfterExtraction({
      hasOverride: true,
      previousPublicationStatus: "pending",
      derivedPublicationStatus: "published",
    }),
    "published",
  );
});

test("uses strict Responses output with store disabled and recalculates totals", async () => {
  const extracted = validAiExtraction();
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
  assert.equal(request.body.max_output_tokens, 4_000);
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

test("uses Anthropic structured output through the same evidence checks", async () => {
  let request;
  const result = await extractCampaignWithAnthropic({
    apiKey: "test-key",
    officialUrl: "https://network.mobile.rakuten.co.jp/campaign/test/",
    sourceText:
      "<header>無関係</header><main>楽天モバイルへMNPまたは新規でお申し込み。6,000ポイントと7,000ポイントを進呈。</main>",
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return new Response(
        JSON.stringify({
          stop_reason: "end_turn",
          content: [{ type: "text", text: JSON.stringify(validAiExtraction()) }],
          usage: { input_tokens: 321, output_tokens: 123 },
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(request.url, "https://api.anthropic.com/v1/messages");
  assert.equal(request.options.headers["x-api-key"], "test-key");
  assert.equal(request.body.max_tokens, 4_000);
  assert.equal(request.body.output_config.format.type, "json_schema");
  assert.doesNotMatch(request.body.messages[0].content, /無関係/);
  assert.equal(result.audit.provider, "anthropic");
  assert.deepEqual(result.usage, { inputTokens: 321, outputTokens: 123 });
});

test("deduplicates AI calls and enforces the per-run cost budget", async () => {
  let calls = 0;
  const runtime = createCampaignAiRuntime({
    environment: {
      CAMPAIGN_AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_CAMPAIGN_MODEL: "gpt-5.6-terra",
    },
    fetchImpl: async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              content: [
                { type: "output_text", text: JSON.stringify(validAiExtraction()) },
              ],
            },
          ],
          usage: { input_tokens: 500, output_tokens: 250 },
        }),
        { status: 200 },
      );
    },
  });
  const request = {
    officialUrl: "https://network.mobile.rakuten.co.jp/campaign/test/",
    sourceText:
      "楽天モバイルへMNPまたは新規でお申し込み。6,000ポイントと7,000ポイントを進呈。",
  };
  await runtime.extract(request);
  await runtime.extract(request);
  assert.equal(calls, 1);
  assert.equal(runtime.summary().calls, 1);
  assert.equal(runtime.summary().cacheHits, 1);
  assert.equal(runtime.summary().estimatedCostUsd, 0.004);

  const blocked = createCampaignAiRuntime({
    environment: {
      CAMPAIGN_AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_CAMPAIGN_MODEL: "gpt-5.6-terra",
      CAMPAIGN_AI_MAX_BUDGET_USD: "0.000001",
    },
    fetchImpl: async () => {
      throw new Error("予算判定後は呼ばれない");
    },
  });
  await assert.rejects(() => blocked.extract(request), /予算上限/);
});

test("counts AI usage when evidence validation rejects the response", async () => {
  const extracted = validAiExtraction();
  extracted.evidence = [
    { field: "参加方法", quote: "公式本文には存在しない根拠引用" },
  ];
  const runtime = createCampaignAiRuntime({
    environment: {
      CAMPAIGN_AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_CAMPAIGN_MODEL: "gpt-5.6-terra",
    },
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              content: [
                { type: "output_text", text: JSON.stringify(extracted) },
              ],
            },
          ],
          usage: { input_tokens: 500, output_tokens: 250 },
        }),
        { status: 200 },
      ),
  });

  await assert.rejects(
    () =>
      runtime.extract({
        officialUrl: "https://network.mobile.rakuten.co.jp/campaign/test/",
        sourceText:
          "楽天モバイルへMNPまたは新規でお申し込み。6,000ポイントと7,000ポイントを進呈。",
      }),
    /根拠引用を公式本文で確認できません/,
  );
  assert.deepEqual(runtime.summary(), {
    provider: "openai",
    model: "gpt-5.6-terra",
    configured: true,
    calls: 1,
    cacheHits: 0,
    inputTokens: 500,
    outputTokens: 250,
    estimatedCostUsd: 0.004,
    limits: {
      maxInputChars: 80_000,
      maxOutputTokens: 4_000,
      maxCalls: 10,
      maxBudgetUsd: 2,
    },
    priceUsdPerMillionTokens: { input: 2, output: 12 },
  });
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

test("applies a human excluded decision to an unchanged pending campaign", async (t) => {
  const fixture = await setupCatalog(t, { empty: true });
  const sourceHtml = listing([
    '<a href="/campaign/new-offer/"><img alt="新しい特典"><p>詳細確認中</p></a>',
  ]);
  await runAutomation({
    ...fixture,
    checkedAt: "2026-08-27",
    sourceHtml,
  });
  await writeFile(
    path.join(fixture.dataDirectory, "curated-overrides.json"),
    `${JSON.stringify(
      {
        "NO-CODE-NETWORK-CAMPAIGN-NEW-OFFER": {
          publicationStatus: "excluded",
          category: "other",
          notes: ["編集判断で非掲載"],
          requiresDevicePurchase: false,
          rankingEligible: false,
        },
      },
      null,
      2,
    )}\n`,
  );

  const report = await runAutomation({
    ...fixture,
    checkedAt: "2026-08-28",
    sourceHtml,
  });
  assert.equal(report.pending.length, 0);
  assert.equal(report.changes.length, 1);
  assert.equal(report.changes[0].status, "excluded");
  const filename = (await readdir(fixture.generatedDirectory)).find((name) =>
    name.endsWith(".campaign.json"),
  );
  const campaign = JSON.parse(
    await readFile(path.join(fixture.generatedDirectory, filename), "utf8"),
  );
  assert.equal(campaign.publicationStatus, "excluded");
});

test("builds an actionable Slack payload and applies the notification policy", () => {
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
    ai: {
      provider: "openai",
      model: "gpt-5.6-terra",
      calls: 2,
      cacheHits: 1,
      estimatedCostUsd: 0.03,
      limits: { maxBudgetUsd: 2 },
    },
  };
  const environment = {
    GITHUB_SERVER_URL: "https://github.com",
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_RUN_ID: "123",
    GITHUB_RUN_ATTEMPT: "2",
  };
  const warning = notificationDecision(report, { mode: "apply" });
  assert.equal(warning.notify, true);
  assert.equal(warning.severity, "warning");
  const payload = buildSlackPayload(
    report,
    { ...environment, CAMPAIGN_AUTOMATION_MODE: "apply" },
    warning,
  );
  assert.match(payload.text, /要確認/);
  assert.match(JSON.stringify(payload.blocks), /根拠不足/);
  assert.match(JSON.stringify(payload.blocks), /actions\/runs\/123/);
  assert.match(JSON.stringify(payload.blocks), /gpt-5\.6-terra/);
  assert.match(payload.text, /推定\$0\.0300/);

  const noChange = {
    ...report,
    pending: [],
    requiresAttention: false,
    contentChanged: false,
  };
  assert.equal(
    notificationDecision(noChange, { mode: "apply" }).notify,
    false,
  );
  assert.equal(
    notificationDecision(noChange, { mode: "report" }).notify,
    true,
  );
});

test("schedules report/apply automation with Slack-only notifications", async () => {
  const workflow = await readFile(
    fileURLToPath(
      new URL("../.github/workflows/campaign-sync.yml", import.meta.url),
    ),
    "utf8",
  );
  assert.match(workflow, /cron: "17 21 \* \* \*"/);
  assert.match(workflow, /- report\s+- apply/);
  assert.match(workflow, /secrets\.SLACK_WEBHOOK_URL/);
  assert.match(workflow, /vars\.CAMPAIGN_AI_PROVIDER/);
  assert.match(workflow, /secrets\.ANTHROPIC_API_KEY/);
  assert.match(workflow, /CAMPAIGN_AI_MAX_BUDGET_USD/);
  assert.match(workflow, /slackapi\/slack-github-action@v4\.0\.0/);
  assert.match(
    workflow,
    /git add data\/campaigns\/generated data\/campaigns\/archive data\/campaigns\/images\.json public\/assets\/campaigns\/official/,
  );
  assert.doesNotMatch(workflow, /git add (?:app|scripts|README)/);
  assert.doesNotMatch(workflow, /RESEND|ALERT_EMAIL/);
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
