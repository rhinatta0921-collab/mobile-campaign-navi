#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const allowedCampaignAutomationPaths = [
  "data/campaigns/generated/",
  "data/campaigns/archive/",
  "data/campaigns/images.json",
  "public/assets/campaigns/official/",
];

const ignoredUntrackedPaths = [
  ".campaign-baseline/",
  ".campaign-sync/",
  ".next/",
  "node_modules/",
  "out/",
  "playwright-report/",
  "test-results/",
];

export function isAllowedAutomationPath(filePath) {
  return allowedCampaignAutomationPaths.some((allowedPath) =>
    allowedPath.endsWith("/")
      ? filePath.startsWith(allowedPath)
      : filePath === allowedPath,
  );
}

export function unexpectedAutomationPaths(statusLines) {
  return statusLines
    .map((line) => ({ status: line.slice(0, 2), filePath: line.slice(3) }))
    .filter(({ status, filePath }) => {
      if (status === "??") {
        return !ignoredUntrackedPaths.some((prefix) => filePath.startsWith(prefix));
      }
      return !isAllowedAutomationPath(filePath);
    })
    .map(({ filePath }) => filePath)
    .sort();
}

async function main() {
  const { stdout } = await execFileAsync("git", [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  const unexpected = unexpectedAutomationPaths(
    stdout.split("\n").filter(Boolean),
  );
  if (unexpected.length > 0) {
    throw new Error(
      `日次自動処理の許可範囲外に差分があります: ${unexpected.join(", ")}`,
    );
  }
  console.log("日次自動処理の差分は許可されたキャンペーン生成物だけです。");
}

if (process.argv[1]?.endsWith("check-campaign-automation-scope.mjs")) {
  await main();
}
