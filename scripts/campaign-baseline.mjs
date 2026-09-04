#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  access,
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  catalogVersion,
  statusCounts,
} from "./lib/campaign-automation.mjs";

export const BASELINE_FORMAT_VERSION = 1;
export const BASELINE_ARTIFACT_PREFIX = "campaign-baseline-v1-";

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    throw new Error(`${label}がYYYY-MM-DD形式ではありません。`);
  }
}

function assertCatalogVersion(value, label) {
  if (!/^[0-9a-f]{16}$/.test(value ?? "")) {
    throw new Error(`${label}が16桁のカタログ版ではありません。`);
  }
}

function assertSafeRelativePath(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`${label}に安全でないパスが含まれています: ${value}`);
  }
}

async function regularFiles(directory, relativeDirectory = "") {
  const entries = await readdir(path.join(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`基準Artifactにシンボリックリンクがあります: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await regularFiles(directory, relativePath)));
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`基準Artifactに通常ファイル以外があります: ${relativePath}`);
    }
    files.push(relativePath);
  }
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

function assertSameFileList(actual, expected, label) {
  if (!Array.isArray(expected)) {
    throw new Error(`${label}が配列ではありません。`);
  }
  for (const filename of expected) assertSafeRelativePath(filename, label);
  const normalizedExpected = [...new Set(expected)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  if (
    normalizedExpected.length !== expected.length ||
    JSON.stringify(actual) !== JSON.stringify(normalizedExpected)
  ) {
    throw new Error(`${label}と実ファイル一覧が一致しません。`);
  }
}

async function treeHash(generatedDirectory, archiveDirectory) {
  const hash = createHash("sha256");
  for (const [label, directory] of [
    ["generated", generatedDirectory],
    ["archive", archiveDirectory],
  ]) {
    for (const relativePath of await regularFiles(directory)) {
      hash.update(`${label}/${relativePath}\0`);
      hash.update(await readFile(path.join(directory, relativePath)));
      hash.update("\0");
    }
  }
  return hash.digest("hex");
}

function sortedStatusCounts(campaigns) {
  return statusCounts(campaigns);
}

export async function validateCatalogDirectory(generatedDirectory) {
  const indexPath = path.join(generatedDirectory, "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  assertDate(index.lastSuccessfulCheckAt ?? index.checkedAt, "基準の確認日");
  assertCatalogVersion(index.catalogVersion, "基準のカタログ版");
  if (!Array.isArray(index.items) || new Set(index.items).size !== index.items.length) {
    throw new Error("基準indexのitemsが不正です。");
  }

  const campaigns = [];
  for (const filename of index.items) {
    assertSafeRelativePath(filename, "基準indexのitems");
    if (filename.includes("/") || !filename.endsWith(".campaign.json")) {
      throw new Error(`基準indexに不正なキャンペーンファイル名があります: ${filename}`);
    }
    const campaign = JSON.parse(
      await readFile(path.join(generatedDirectory, filename), "utf8"),
    );
    if (
      !campaign.campaignCode ||
      !campaign.title ||
      !campaign.officialUrl ||
      !campaign.publicationStatus ||
      !campaign.points
    ) {
      throw new Error(`${filename}: 基準キャンペーンの必須項目がありません。`);
    }
    new URL(campaign.officialUrl);
    campaigns.push(campaign);
  }

  const actualFiles = await regularFiles(generatedDirectory);
  const expectedFiles = [...index.items, "index.json"].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error("基準indexとgeneratedの実ファイル一覧が一致しません。");
  }
  if (index.campaignCount !== campaigns.length) {
    throw new Error("基準indexのcampaignCountが一致しません。");
  }
  const calculatedVersion = catalogVersion(campaigns);
  if (index.catalogVersion !== calculatedVersion) {
    throw new Error(
      `基準のカタログ版が一致しません: index=${index.catalogVersion} calculated=${calculatedVersion}`,
    );
  }
  if (
    JSON.stringify(index.statusCounts) !==
    JSON.stringify(sortedStatusCounts(campaigns))
  ) {
    throw new Error("基準indexのstatusCountsが一致しません。");
  }
  return { index, campaigns, files: actualFiles };
}

function validateManifestShape(manifest) {
  if (manifest.formatVersion !== BASELINE_FORMAT_VERSION) {
    throw new Error(
      `基準Artifactの形式が不正です: ${manifest.formatVersion ?? "未設定"}`,
    );
  }
  if (manifest.artifactType !== "campaign-baseline") {
    throw new Error("基準Artifactの種類が不正です。");
  }
  assertDate(manifest.checkedAt, "基準Artifactの確認日");
  assertCatalogVersion(
    manifest.catalogVersion,
    "基準Artifactのカタログ版",
  );
  if (!/^\d+$/.test(String(manifest.runId ?? ""))) {
    throw new Error("基準Artifactのworkflow run IDが不正です。");
  }
  if (!/^[0-9a-f]{40,64}$/.test(manifest.sourceCommit ?? "")) {
    throw new Error("基準Artifactの元コミットが不正です。");
  }
  if (!/^[0-9a-f]{64}$/.test(manifest.treeHash ?? "")) {
    throw new Error("基準Artifactの整合性ハッシュが不正です。");
  }
}

export async function validateBaselineArtifact(artifactDirectory) {
  const manifest = JSON.parse(
    await readFile(path.join(artifactDirectory, "manifest.json"), "utf8"),
  );
  validateManifestShape(manifest);
  const generatedDirectory = path.join(
    artifactDirectory,
    "data/campaigns/generated",
  );
  const archiveDirectory = path.join(
    artifactDirectory,
    "data/campaigns/archive",
  );
  const catalog = await validateCatalogDirectory(generatedDirectory);
  const archiveFiles = await regularFiles(archiveDirectory);
  assertSameFileList(catalog.files, manifest.generatedFiles, "generatedFiles");
  assertSameFileList(archiveFiles, manifest.archiveFiles, "archiveFiles");
  if (
    manifest.checkedAt !==
    (catalog.index.lastSuccessfulCheckAt ?? catalog.index.checkedAt)
  ) {
    throw new Error("基準Artifactの確認日とindexが一致しません。");
  }
  if (manifest.catalogVersion !== catalog.index.catalogVersion) {
    throw new Error("基準Artifactのカタログ版とindexが一致しません。");
  }
  const calculatedTreeHash = await treeHash(
    generatedDirectory,
    archiveDirectory,
  );
  if (manifest.treeHash !== calculatedTreeHash) {
    throw new Error("基準ArtifactのSHA-256整合性検査に失敗しました。");
  }
  return {
    manifest,
    generatedDirectory,
    archiveDirectory,
    catalog,
  };
}

async function swapDirectories(replacements) {
  const backups = [];
  try {
    for (const { current, candidate } of replacements) {
      const backup = `${current}.baseline-previous`;
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

async function writeSelection(selection, selectionPath, outputPath) {
  await mkdir(path.dirname(selectionPath), { recursive: true });
  await writeFile(selectionPath, `${JSON.stringify(selection, null, 2)}\n`);
  if (outputPath) {
    await appendFile(
      outputPath,
      [
        `source=${selection.source}`,
        `checked_at=${selection.checkedAt}`,
        `catalog_version=${selection.catalogVersion}`,
        `run_id=${selection.runId ?? ""}`,
        "",
      ].join("\n"),
    );
  }
}

export async function restoreBaseline({
  dataDirectory,
  artifactDirectory,
  artifactAvailable,
  selectionPath,
  outputPath,
}) {
  const generatedDirectory = path.join(dataDirectory, "generated");
  const archiveDirectory = path.join(dataDirectory, "archive");
  const mainCatalog = await validateCatalogDirectory(generatedDirectory);
  let selection = {
    source: "main",
    checkedAt:
      mainCatalog.index.lastSuccessfulCheckAt ?? mainCatalog.index.checkedAt,
    catalogVersion: mainCatalog.index.catalogVersion,
    runId: null,
  };

  if (artifactAvailable) {
    const artifact = await validateBaselineArtifact(artifactDirectory);
    if (artifact.manifest.checkedAt > selection.checkedAt) {
      const workRoot = await mkdtemp(
        path.join(path.dirname(dataDirectory), ".campaign-baseline-restore-"),
      );
      try {
        const candidateGenerated = path.join(workRoot, "generated");
        const candidateArchive = path.join(workRoot, "archive");
        await Promise.all([
          cp(artifact.generatedDirectory, candidateGenerated, {
            recursive: true,
          }),
          cp(artifact.archiveDirectory, candidateArchive, { recursive: true }),
        ]);
        await swapDirectories([
          { current: generatedDirectory, candidate: candidateGenerated },
          { current: archiveDirectory, candidate: candidateArchive },
        ]);
      } finally {
        await rm(workRoot, { recursive: true, force: true });
      }
      selection = {
        source: "artifact",
        checkedAt: artifact.manifest.checkedAt,
        catalogVersion: artifact.manifest.catalogVersion,
        runId: String(artifact.manifest.runId),
      };
    }
  }

  await writeSelection(selection, selectionPath, outputPath);
  return selection;
}

export async function prepareBaseline({
  dataDirectory,
  reportPath,
  outputDirectory,
  sourceCommit,
  runId,
  createdAt = new Date().toISOString(),
}) {
  if (!/^[0-9a-f]{40,64}$/.test(sourceCommit ?? "")) {
    throw new Error("--source-commitに有効なGitコミットが必要です。");
  }
  if (!/^\d+$/.test(String(runId ?? ""))) {
    throw new Error("--run-idにGitHub Actions run IDが必要です。");
  }
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  if (!report.safeToPublish) {
    throw new Error("安全判定を通過していない候補は基準Artifactにできません。");
  }

  const generatedDirectory = path.join(dataDirectory, "generated");
  const archiveDirectory = path.join(dataDirectory, "archive");
  const catalog = await validateCatalogDirectory(generatedDirectory);
  const checkedAt =
    catalog.index.lastSuccessfulCheckAt ?? catalog.index.checkedAt;
  if (
    report.checkedAt !== checkedAt ||
    report.catalogVersion !== catalog.index.catalogVersion
  ) {
    throw new Error("安全レポートと候補カタログの監査情報が一致しません。");
  }
  if (!(await pathExists(archiveDirectory))) {
    await mkdir(archiveDirectory, { recursive: true });
  }

  await rm(outputDirectory, { recursive: true, force: true });
  const outputDataDirectory = path.join(outputDirectory, "data/campaigns");
  const outputGenerated = path.join(outputDataDirectory, "generated");
  const outputArchive = path.join(outputDataDirectory, "archive");
  await mkdir(outputDataDirectory, { recursive: true });
  await Promise.all([
    cp(generatedDirectory, outputGenerated, { recursive: true }),
    cp(archiveDirectory, outputArchive, { recursive: true }),
  ]);
  const generatedFiles = await regularFiles(outputGenerated);
  const archiveFiles = await regularFiles(outputArchive);
  const manifest = {
    artifactType: "campaign-baseline",
    formatVersion: BASELINE_FORMAT_VERSION,
    checkedAt,
    catalogVersion: catalog.index.catalogVersion,
    sourceCommit,
    runId: String(runId),
    createdAt,
    generatedFiles,
    archiveFiles,
    treeHash: await treeHash(outputGenerated, outputArchive),
  };
  await writeFile(
    path.join(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

async function main() {
  const command = process.argv[2];
  const dataDirectory = path.resolve(option("data-directory") ?? "data/campaigns");
  if (command === "restore") {
    const selection = await restoreBaseline({
      dataDirectory,
      artifactDirectory: path.resolve(
        option("artifact-directory") ?? ".campaign-baseline/download",
      ),
      artifactAvailable: option("artifact-available") === "true",
      selectionPath: path.resolve(
        option("selection-path") ?? ".campaign-sync/baseline-selection.json",
      ),
      outputPath: process.env.GITHUB_OUTPUT,
    });
    console.log(JSON.stringify(selection, null, 2));
    return;
  }
  if (command === "prepare") {
    const manifest = await prepareBaseline({
      dataDirectory,
      reportPath: path.resolve(
        option("report-path") ?? ".campaign-sync/report.json",
      ),
      outputDirectory: path.resolve(
        option("output-directory") ?? ".campaign-baseline/upload",
      ),
      sourceCommit: option("source-commit") ?? process.env.GITHUB_SHA,
      runId: option("run-id") ?? process.env.GITHUB_RUN_ID,
    });
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  throw new Error("restoreまたはprepareサブコマンドを指定してください。");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
