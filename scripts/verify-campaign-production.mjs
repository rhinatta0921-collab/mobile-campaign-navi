#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

function japaneseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

export function verifyProductionHtml(html, index) {
  const errors = [];
  const versionPattern = new RegExp(
    `<meta[^>]+name=["']campaign-catalog-version["'][^>]+content=["']${index.catalogVersion}["']|<meta[^>]+content=["']${index.catalogVersion}["'][^>]+name=["']campaign-catalog-version["']`,
    "i",
  );
  if (!versionPattern.test(html)) {
    errors.push(`catalogVersion=${index.catalogVersion} を確認できません。`);
  }
  if (!html.includes(`${japaneseDate(index.lastSuccessfulCheckAt)}最終確認`)) {
    errors.push(`最終確認日=${index.lastSuccessfulCheckAt} を確認できません。`);
  }
  return errors;
}

async function main() {
  const indexPath = path.resolve(
    option("index-path") ?? "data/campaigns/generated/index.json",
  );
  const url = option("url") ?? "https://r-mobile.kuraberaku.com/";
  const attempts = Number(option("attempts") ?? 60);
  const intervalMs = Number(option("interval-ms") ?? 10_000);
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  let lastErrors = [];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "cache-control": "no-cache" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      lastErrors = verifyProductionHtml(await response.text(), index);
      if (lastErrors.length === 0) {
        console.log(
          `本番反映を確認しました: ${index.catalogVersion} (${index.lastSuccessfulCheckAt})`,
        );
        return;
      }
    } catch (error) {
      lastErrors = [String(error)];
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(`本番反映を確認できませんでした: ${lastErrors.join(" ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
