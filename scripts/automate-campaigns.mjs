#!/usr/bin/env node

import { execFile } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  campaignFromExtraction,
  catalogVersion,
  codesForCard,
  derivePublicationStatus,
  isAbnormalListingDelta,
  isExplicitlyEnded,
  listingSourceHash,
  officialSourceHash,
  parseListingCards,
  statusCounts,
  withCatalogMetadata,
} from "./lib/campaign-automation.mjs";
import { createCampaignAiRuntime } from "./lib/campaign-ai.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const SYNC_SCRIPT = path.join(SCRIPT_DIRECTORY, "sync-rakuten-campaigns.mjs");

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

const shouldWrite = process.argv.includes("--write");
const dataDirectory = path.resolve(option("data-directory") ?? "data/campaigns");
const generatedDirectory = path.join(dataDirectory, "generated");
const archiveDirectory = path.join(dataDirectory, "archive");
const overridesPath = path.join(dataDirectory, "curated-overrides.json");
const sourceHtmlPath = option("source-html");
const sourceDetailsDirectory = option("source-details-directory");
const reportPath = path.resolve(
  option("report-path") ?? ".campaign-sync/report.json",
);
const checkedAt = option("checked-at");
if (!checkedAt || !/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
  throw new Error("--checked-at=YYYY-MM-DD が必要です。");
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithRetry(url, { allowMissing = false } = {}) {
  let lastError;
  let lastMissing;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; CampaignCatalogMonitor/1.0; +https://network.mobile.rakuten.co.jp/)",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (allowMissing && (response.status === 404 || response.status === 410)) {
        lastMissing = {
          status: response.status,
          text: "",
          finalUrl: response.url,
          attempts: attempt,
        };
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {
        status: response.status,
        text: await response.text(),
        finalUrl: response.url,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
    }
  }
  if (lastMissing) return lastMissing;
  throw new Error(`${url}: ${lastError}`);
}

async function readListingHtml() {
  if (sourceHtmlPath) return readFile(path.resolve(sourceHtmlPath), "utf8");
  return (await fetchWithRetry("https://network.mobile.rakuten.co.jp/campaign/"))
    .text;
}

async function readDetail(campaign) {
  if (sourceDetailsDirectory) {
    const fixturePath = path.resolve(
      sourceDetailsDirectory,
      `${campaign.campaignCode}.html`,
    );
    if (await pathExists(fixturePath)) {
      return {
        status: 200,
        text: await readFile(fixturePath, "utf8"),
        finalUrl: campaign.officialUrl,
        attempts: 1,
      };
    }
    return {
      status: null,
      text: "",
      finalUrl: campaign.officialUrl,
      attempts: 0,
    };
  }
  try {
    return await fetchWithRetry(campaign.officialUrl, { allowMissing: true });
  } catch (error) {
    return { status: null, text: "", error: String(error) };
  }
}

async function mapLimit(items, limit, operation) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await operation(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function readCatalog(directory) {
  const index = JSON.parse(
    await readFile(path.join(directory, "index.json"), "utf8"),
  );
  const records = await Promise.all(
    index.items.map(async (filename) => ({
      filename,
      campaign: JSON.parse(
        await readFile(path.join(directory, filename), "utf8"),
      ),
    })),
  );
  return { index, records };
}

function mapByCode(records) {
  return new Map(records.map((record) => [record.campaign.campaignCode, record]));
}

function stableCampaignJson(campaign) {
  return `${JSON.stringify(campaign, null, 2)}\n`;
}

function pendingCampaign(campaign, reason, metadata) {
  return withCatalogMetadata(
    {
      ...campaign,
      rankingEligible: false,
      notes: [...(campaign.notes ?? []), `自動掲載保留: ${reason}`],
    },
    { ...metadata, explicitStatus: "pending" },
  );
}

function assertCandidateIntegrity(records) {
  const seenCodes = new Set();
  const seenFilenames = new Set();
  for (const { filename, campaign } of records) {
    if (seenCodes.has(campaign.campaignCode)) {
      throw new Error(`キャンペーンコードが重複しています: ${campaign.campaignCode}`);
    }
    if (seenFilenames.has(filename)) {
      throw new Error(`キャンペーンファイル名が重複しています: ${filename}`);
    }
    seenCodes.add(campaign.campaignCode);
    seenFilenames.add(filename);
    if (!campaign.officialUrl || !campaign.title || !campaign.summary) {
      throw new Error(`${campaign.campaignCode}: 必須項目がありません。`);
    }
    new URL(campaign.officialUrl);
    if (
      campaign.publicationStatus === "published" &&
      (!campaign.rankingEligible || campaign.requiresDevicePurchase)
    ) {
      throw new Error(
        `${campaign.campaignCode}: publishedとランキング条件が矛盾しています。`,
      );
    }
  }
}

async function writeCandidateDirectory(directory, index, records) {
  await mkdir(directory, { recursive: true });
  for (const { filename, campaign } of records) {
    await writeFile(path.join(directory, filename), stableCampaignJson(campaign));
  }
  await writeFile(
    path.join(directory, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
}

async function writeArchiveCandidate(directory, archivedCampaigns) {
  if (await pathExists(archiveDirectory)) {
    await cp(archiveDirectory, directory, { recursive: true });
  } else {
    await mkdir(directory, { recursive: true });
  }
  for (const campaign of archivedCampaigns) {
    const filename = `${campaign.campaignCode.toLowerCase()}-${campaign.endedAt}.ended.json`;
    await writeFile(path.join(directory, filename), stableCampaignJson(campaign));
  }
}

async function swapDirectories(replacements) {
  const backups = [];
  try {
    for (const { current, candidate } of replacements) {
      const backup = `${current}.previous`;
      await rm(backup, { recursive: true, force: true });
      if (await pathExists(current)) {
        await rename(current, backup);
        backups.push({ current, backup, existed: true });
      } else {
        backups.push({ current, backup, existed: false });
      }
      await rename(candidate, current);
    }
    for (const { backup } of backups) {
      await rm(backup, { recursive: true, force: true });
    }
  } catch (error) {
    for (const { current, backup, existed } of backups.reverse()) {
      await rm(current, { recursive: true, force: true });
      if (existed && (await pathExists(backup))) await rename(backup, current);
    }
    throw error;
  }
}

function archiveRecord(campaign, reason) {
  return {
    ...campaign,
    publicationStatus: "ended",
    rankingEligible: false,
    endedAt: checkedAt,
    endReason: reason,
    lastChangedAt: checkedAt,
  };
}

async function run() {
  const workRoot = await mkdtemp(
    path.join(os.tmpdir(), "campaign-automation-"),
  );
  const report = {
    checkedAt,
    mode: shouldWrite ? "write" : "preview",
    safeToPublish: false,
    requiresAttention: false,
    listing: {},
    additions: [],
    changes: [],
    ended: [],
    pending: [],
    warnings: [],
    errors: [],
    ai: null,
  };
  let aiRuntime;

  try {
    aiRuntime = createCampaignAiRuntime();
    report.ai = aiRuntime.summary();
    const [listingHtml, overrides, currentCatalog] = await Promise.all([
      readListingHtml(),
      readFile(overridesPath, "utf8").then(JSON.parse),
      readCatalog(generatedDirectory),
    ]);
    const cards = parseListingCards(listingHtml);
    report.listing = {
      previousCount: currentCatalog.index.listingCardCount,
      currentCount: cards.length,
    };
    if (
      isAbnormalListingDelta(
        currentCatalog.index.listingCardCount,
        cards.length,
      )
    ) {
      throw new Error(
        `公式一覧の差分が安全上限を超えました: previous=${currentCatalog.index.listingCardCount} current=${cards.length}`,
      );
    }

    const generatedCodeUrls = new Map();
    for (const card of cards) {
      for (const code of codesForCard(card)) {
        if (!code.startsWith("NO-CODE-")) continue;
        const previousUrl = generatedCodeUrls.get(code);
        if (previousUrl && previousUrl !== card.url.href) {
          throw new Error(
            `URL由来コードが衝突しました: ${code} (${previousUrl}, ${card.url.href})`,
          );
        }
        generatedCodeUrls.set(code, card.url.href);
      }
    }

    const temporaryData = path.join(workRoot, "campaigns");
    const temporaryGenerated = path.join(temporaryData, "generated");
    await mkdir(temporaryData, { recursive: true });
    await Promise.all([
      cp(overridesPath, path.join(temporaryData, "curated-overrides.json")),
      cp(generatedDirectory, temporaryGenerated, { recursive: true }),
      writeFile(path.join(workRoot, "listing.html"), listingHtml),
    ]);
    await execFileAsync(process.execPath, [
      SYNC_SCRIPT,
      `--data-directory=${temporaryData}`,
      `--source-html=${path.join(workRoot, "listing.html")}`,
      `--expected-card-count=${cards.length}`,
      `--checked-at=${checkedAt}`,
      "--write",
    ]);

    const generatedCatalog = await readCatalog(temporaryGenerated);
    const oldByCode = mapByCode(currentCatalog.records);
    const generatedByCode = mapByCode(generatedCatalog.records);
    const finalRecords = [];
    const archivedCampaigns = [];
    const nextMissing = {};

    for (const oldRecord of currentCatalog.records) {
      const { campaign: oldCampaign } = oldRecord;
      if (generatedByCode.has(oldCampaign.campaignCode)) continue;
      if (overrides[oldCampaign.campaignCode]?.supplemental) continue;

      const missingCount =
        (currentCatalog.index.missingFromListing?.[oldCampaign.campaignCode] ??
          0) + 1;
      const detail = await readDetail(oldCampaign);
      if (detail.error) {
        throw new Error(
          `${oldCampaign.campaignCode}: 公式詳細ページの取得に失敗しました: ${detail.error}`,
        );
      }
      const explicitEnd = isExplicitlyEnded(
        detail.status,
        detail.text,
        detail.finalUrl,
        oldCampaign.campaignCode,
      );
      if (explicitEnd || missingCount >= 2) {
        const reason = explicitEnd
          ? detail.status === 404 || detail.status === 410
            ? `公式ページ HTTP ${detail.status}`
            : "公式ページに終了表記"
          : "公式一覧から2回連続で消失";
        archivedCampaigns.push(archiveRecord(oldCampaign, reason));
        report.ended.push({
          campaignCode: oldCampaign.campaignCode,
          title: oldCampaign.title,
          officialUrl: oldCampaign.officialUrl,
          reason,
        });
      } else {
        nextMissing[oldCampaign.campaignCode] = missingCount;
        const restored = {
          ...oldCampaign,
          listingPresence: "missing",
          missingFromListingCount: missingCount,
        };
        finalRecords.push({ ...oldRecord, campaign: restored });
        report.warnings.push(
          `${oldCampaign.campaignCode}: 公式一覧から1回消失。次回まで掲載を維持します。`,
        );
      }
    }


    const uniqueDetailCampaigns = [
      ...new Map(
        generatedCatalog.records.map(({ campaign }) => [
          campaign.officialUrl,
          campaign,
        ]),
      ).values(),
    ];
    const detailResults = await mapLimit(
      uniqueDetailCampaigns,
      6,
      async (campaign) => [campaign.officialUrl, await readDetail(campaign)],
    );
    const detailFailure = detailResults.find(([, detail]) => detail.error);
    if (detailFailure) {
      throw new Error(
        `${detailFailure[0]}: 公式詳細ページの取得に失敗しました: ${detailFailure[1].error}`,
      );
    }
    const detailsByUrl = new Map(detailResults);
    report.detailPagesChecked = detailResults.filter(
      ([, detail]) => detail.status !== null,
    ).length;

    for (const generatedRecord of generatedCatalog.records) {
      const { campaign: generatedCampaign } = generatedRecord;
      const oldRecord = oldByCode.get(generatedCampaign.campaignCode);
      const oldCampaign = oldRecord?.campaign;
      const override = overrides[generatedCampaign.campaignCode];
      const listingPresence = override?.supplemental ? "supplemental" : "listed";
      const detail = detailsByUrl.get(generatedCampaign.officialUrl) ?? {
        status: null,
        text: "",
        finalUrl: generatedCampaign.officialUrl,
      };
      const currentListingHash = listingSourceHash(generatedCampaign);
      const currentContentHash = detail.text
        ? officialSourceHash(detail.text, generatedCampaign.officialUrl)
        : currentListingHash;
      const previousListingHash =
        oldCampaign?.provenance?.listingHash ??
        oldCampaign?.provenance?.contentHash;
      const previousContentHash = oldCampaign?.provenance?.contentHash;
      const sourceChanged =
        !oldCampaign ||
        previousListingHash !== currentListingHash ||
        previousContentHash !== currentContentHash;
      const pendingCanRetry =
        oldCampaign?.publicationStatus === "pending" &&
        !override &&
        aiRuntime.configured &&
        Boolean(detail.text);

      if (
        isExplicitlyEnded(
          detail.status,
          detail.text,
          detail.finalUrl,
          generatedCampaign.campaignCode,
        )
      ) {
        const reason =
          detail.status === 404 || detail.status === 410
            ? `公式ページ HTTP ${detail.status}（${detail.attempts ?? 3}回確認）`
            : detail.finalUrl !== generatedCampaign.officialUrl
              ? `過去キャンペーンページへ移動: ${detail.finalUrl}`
              : "公式ページに終了表記";
        const endedCampaign = oldCampaign ?? withCatalogMetadata(generatedCampaign, {
          checkedAt,
          listingPresence,
          sourceHash: currentContentHash,
          listingHash: currentListingHash,
        });
        archivedCampaigns.push(archiveRecord(endedCampaign, reason));
        report.ended.push({
          campaignCode: generatedCampaign.campaignCode,
          title: generatedCampaign.title,
          officialUrl: generatedCampaign.officialUrl,
          reason,
        });
        continue;
      }

      if (
        oldCampaign &&
        !sourceChanged &&
        !pendingCanRetry &&
        oldCampaign.publicationStatus &&
        oldCampaign.listingPresence === listingPresence
      ) {
        finalRecords.push({
          filename: oldRecord.filename,
          campaign: oldCampaign,
        });
        continue;
      }

      let campaign = generatedCampaign;
      let provider = null;
      let model = null;
      let promptVersion = null;
      let sourceHash = currentContentHash;
      let explicitStatus = override?.publicationStatus;

      if (!override && (sourceChanged || pendingCanRetry)) {
        const sourceText = detail.text;
        if (!aiRuntime.configured) {
          const reason = `${aiRuntime.id}用APIキー未設定のため新規・変更内容を構造化できません。`;
          campaign = pendingCampaign(generatedCampaign, reason, {
            checkedAt,
            firstSeenAt: oldCampaign?.firstSeenAt,
            lastChangedAt: sourceChanged
              ? checkedAt
              : oldCampaign?.lastChangedAt ?? checkedAt,
            listingPresence,
            sourceHash: currentContentHash,
            listingHash: currentListingHash,
          });
          report.pending.push({
            campaignCode: generatedCampaign.campaignCode,
            title: generatedCampaign.title,
            officialUrl: generatedCampaign.officialUrl,
            reason,
          });
          finalRecords.push({
            filename: oldRecord?.filename ?? generatedRecord.filename,
            campaign,
          });
          continue;
        }
        if (!sourceText) {
          const reason = "公式詳細ページを取得できません。";
          campaign = pendingCampaign(generatedCampaign, reason, {
            checkedAt,
            firstSeenAt: oldCampaign?.firstSeenAt,
            lastChangedAt: sourceChanged
              ? checkedAt
              : oldCampaign?.lastChangedAt ?? checkedAt,
            listingPresence,
            sourceHash: currentContentHash,
            listingHash: currentListingHash,
          });
          report.pending.push({
            campaignCode: generatedCampaign.campaignCode,
            title: generatedCampaign.title,
            officialUrl: generatedCampaign.officialUrl,
            reason,
          });
          finalRecords.push({
            filename: oldRecord?.filename ?? generatedRecord.filename,
            campaign,
          });
          continue;
        }
        try {
          const result = await aiRuntime.extract({
            officialUrl: generatedCampaign.officialUrl,
            sourceText,
          });
          campaign = campaignFromExtraction(
            generatedCampaign,
            result.extracted,
            sourceText,
          );
          provider = result.audit.provider;
          model = result.audit.model;
          promptVersion = result.audit.promptVersion;
          sourceHash = result.audit.sourceHash;
          explicitStatus = derivePublicationStatus(campaign);
        } catch (error) {
          const reason = `AI構造化または根拠検証に失敗: ${error}`;
          campaign = pendingCampaign(generatedCampaign, reason, {
            checkedAt,
            firstSeenAt: oldCampaign?.firstSeenAt,
            lastChangedAt: checkedAt,
            listingPresence,
            sourceHash: currentContentHash,
            listingHash: currentListingHash,
          });
          report.pending.push({
            campaignCode: generatedCampaign.campaignCode,
            title: generatedCampaign.title,
            officialUrl: generatedCampaign.officialUrl,
            reason,
          });
          finalRecords.push({
            filename: oldRecord?.filename ?? generatedRecord.filename,
            campaign,
          });
          continue;
        }
      }

      const publicationChanged =
        Boolean(oldCampaign) &&
        oldCampaign.publicationStatus !==
          derivePublicationStatus(campaign, explicitStatus);
      campaign = withCatalogMetadata(campaign, {
        checkedAt,
        explicitStatus,
        firstSeenAt: oldCampaign?.firstSeenAt,
        lastChangedAt: sourceChanged || publicationChanged
          ? checkedAt
          : oldCampaign?.lastChangedAt ?? checkedAt,
        listingPresence,
        provider,
        model,
        promptVersion,
        sourceHash,
        listingHash: currentListingHash,
      });
      campaign.checkedAt = sourceChanged || publicationChanged
        ? checkedAt
        : oldCampaign?.checkedAt ?? checkedAt;

      finalRecords.push({
        filename: oldRecord?.filename ?? generatedRecord.filename,
        campaign,
      });
      if (
        !oldCampaign ||
        (oldCampaign.publicationStatus === "pending" &&
          campaign.publicationStatus === "published")
      ) {
        report.additions.push({
          campaignCode: campaign.campaignCode,
          title: campaign.title,
          officialUrl: campaign.officialUrl,
          status: campaign.publicationStatus,
        });
      } else if (sourceChanged || publicationChanged) {
        report.changes.push({
          campaignCode: campaign.campaignCode,
          title: campaign.title,
          officialUrl: campaign.officialUrl,
          status: campaign.publicationStatus,
        });
      }
    }

    finalRecords.sort((left, right) =>
      left.campaign.campaignCode.localeCompare(
        right.campaign.campaignCode,
        "en",
      ),
    );
    assertCandidateIntegrity(finalRecords);
    report.pending = finalRecords
      .filter(({ campaign }) => campaign.publicationStatus === "pending")
      .map(({ campaign }) => ({
        campaignCode: campaign.campaignCode,
        title: campaign.title,
        officialUrl: campaign.officialUrl,
        reason:
          [...(campaign.notes ?? [])]
            .reverse()
            .find((note) => note.startsWith("自動掲載保留:"))
            ?.replace(/^自動掲載保留:\s*/, "") ?? "公式情報を確認中",
      }));
    report.requiresAttention =
      report.pending.length > 0 || report.warnings.length > 0;

    const previousVersion =
      currentCatalog.index.catalogVersion ??
      catalogVersion(currentCatalog.records.map(({ campaign }) => campaign));
    const nextVersion = catalogVersion(
      finalRecords.map(({ campaign }) => campaign),
    );
    const contentChanged =
      previousVersion !== nextVersion || archivedCampaigns.length > 0;
    const index = {
      listingUrl: "https://network.mobile.rakuten.co.jp/campaign/",
      checkedAt,
      lastSuccessfulCheckAt: checkedAt,
      lastContentChangeAt: contentChanged
        ? checkedAt
        : currentCatalog.index.lastContentChangeAt ??
          currentCatalog.index.checkedAt,
      catalogVersion: nextVersion,
      listingCardCount: cards.length,
      campaignCount: finalRecords.length,
      statusCounts: statusCounts(finalRecords.map(({ campaign }) => campaign)),
      missingFromListing: nextMissing,
      items: finalRecords.map(({ filename }) => filename).sort(),
    };

    const candidateGenerated = path.join(workRoot, "generated.final");
    const candidateArchive = path.join(workRoot, "archive.final");
    await Promise.all([
      writeCandidateDirectory(candidateGenerated, index, finalRecords),
      writeArchiveCandidate(candidateArchive, archivedCampaigns),
    ]);

    report.safeToPublish = true;
    report.catalogVersion = nextVersion;
    report.contentChanged = contentChanged;
    report.statusCounts = index.statusCounts;
    report.ai = aiRuntime.summary();
    if (shouldWrite) {
      await swapDirectories([
        { current: generatedDirectory, candidate: candidateGenerated },
        { current: archiveDirectory, candidate: candidateArchive },
      ]);
    }
    return report;
  } catch (error) {
    report.errors.push(String(error));
    report.requiresAttention = true;
    if (aiRuntime) report.ai = aiRuntime.summary();
    return report;
  } finally {
    await rm(workRoot, { recursive: true, force: true });
  }
}

const report = await run();
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.safeToPublish) process.exitCode = 1;

export { run };
