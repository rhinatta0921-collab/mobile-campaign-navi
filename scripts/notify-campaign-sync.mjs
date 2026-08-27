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

export function buildNotification(report, environment = process.env) {
  const repository = environment.GITHUB_REPOSITORY ?? "local/repository";
  const runUrl =
    environment.GITHUB_SERVER_URL &&
    environment.GITHUB_REPOSITORY &&
    environment.GITHUB_RUN_ID
      ? `${environment.GITHUB_SERVER_URL}/${environment.GITHUB_REPOSITORY}/actions/runs/${environment.GITHUB_RUN_ID}`
      : null;
  const lines = [
    `確認日: ${report.checkedAt ?? "不明"}`,
    `公開可能: ${report.safeToPublish ? "はい" : "いいえ"}`,
    `追加: ${report.additions?.length ?? 0}件`,
    `変更: ${report.changes?.length ?? 0}件`,
    `終了: ${report.ended?.length ?? 0}件`,
    `保留: ${report.pending?.length ?? 0}件`,
  ];
  for (const [label, items] of [
    ["追加", report.additions ?? []],
    ["変更", report.changes ?? []],
    ["終了", report.ended ?? []],
    ["保留", report.pending ?? []],
  ]) {
    for (const item of items) {
      lines.push(
        `${label} ${item.campaignCode}: ${item.title ?? "名称未取得"}${item.status ? ` [${item.status}]` : ""}`,
      );
      if (item.officialUrl) lines.push(`対象URL: ${item.officialUrl}`);
      if (item.reason) lines.push(`理由: ${item.reason}`);
    }
  }
  for (const warning of report.warnings ?? []) lines.push(`警告: ${warning}`);
  for (const error of report.errors ?? []) lines.push(`エラー: ${error}`);
  if (environment.CAMPAIGN_FAILURE_CONTEXT) {
    lines.push(`失敗ステップ: ${environment.CAMPAIGN_FAILURE_CONTEXT}`);
  }
  if (runUrl) lines.push(`実行結果: ${runUrl}`);

  return {
    subject: `[要確認] ${repository} キャンペーン自動同期 ${report.checkedAt ?? ""}`,
    text: lines.join("\n"),
  };
}

export async function sendNotification({
  report,
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.ALERT_EMAIL_FROM,
  to = process.env.ALERT_EMAIL_TO,
  fetchImpl = fetch,
  environment = process.env,
}) {
  if (!apiKey || !from || !to) {
    throw new Error(
      "RESEND_API_KEY、ALERT_EMAIL_FROM、ALERT_EMAIL_TOが必要です。",
    );
  }
  const message = buildNotification(report, environment);
  const idempotencyKey = [
    environment.GITHUB_REPOSITORY ?? "local",
    environment.GITHUB_RUN_ID ?? report.checkedAt ?? "run",
    environment.GITHUB_RUN_ATTEMPT ?? "1",
  ].join(":");
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: to
        .split(",")
        .map((address) => address.trim())
        .filter(Boolean),
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Resend HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function main() {
  const reportPath = path.resolve(
    option("report-path") ?? ".campaign-sync/report.json",
  );
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  if (!report.requiresAttention && !process.argv.includes("--force")) {
    console.log("通知対象の異常・保留はありません。");
    return;
  }
  const result = await sendNotification({ report });
  console.log(`Resend通知を送信しました: ${result.id}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
