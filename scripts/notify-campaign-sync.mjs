#!/usr/bin/env node

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

function slackText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function truncate(value, maximum) {
  if (value.length <= maximum) return value;
  return `${value.slice(0, maximum - 1)}…`;
}

function runUrl(environment) {
  if (
    !environment.GITHUB_SERVER_URL ||
    !environment.GITHUB_REPOSITORY ||
    !environment.GITHUB_RUN_ID
  ) {
    return null;
  }
  return `${environment.GITHUB_SERVER_URL}/${environment.GITHUB_REPOSITORY}/actions/runs/${environment.GITHUB_RUN_ID}`;
}

function reportItems(report) {
  return [
    ["追加", report.additions ?? []],
    ["変更", report.changes ?? []],
    ["終了", report.ended ?? []],
    ["保留", report.pending ?? []],
  ];
}

export function notificationDecision(
  report,
  {
    mode = report.mode ?? "report",
    pipelineFailed = false,
    previousConclusion = "",
    force = false,
  } = {},
) {
  const failed =
    pipelineFailed ||
    report.safeToPublish === false ||
    (report.errors?.length ?? 0) > 0;
  const recovered =
    !failed && ["failure", "cancelled", "timed_out"].includes(previousConclusion);
  const attention =
    !failed &&
    (report.requiresAttention ||
      (report.pending?.length ?? 0) > 0 ||
      (report.warnings?.length ?? 0) > 0);
  const changed =
    report.contentChanged ||
    reportItems(report).some(
      ([label, items]) => label !== "保留" && items.length > 0,
    );
  const notify =
    force || mode === "report" || failed || recovered || attention || changed;
  const severity = failed
    ? "error"
    : recovered
      ? "recovery"
      : attention
        ? "warning"
        : changed
          ? "success"
          : "info";
  return { notify, severity, failed, recovered, attention, changed };
}

function titleForSeverity(severity) {
  return {
    error: "🚨 キャンペーン自動確認に失敗",
    recovery: "🟢 キャンペーン自動確認が復旧",
    warning: "⚠️ キャンペーン自動確認・要確認",
    success: "✅ キャンペーン更新を確認",
    info: "ℹ️ キャンペーン自動確認・変更なし",
  }[severity];
}

function itemLines(report) {
  const lines = [];
  for (const [label, items] of reportItems(report)) {
    for (const item of items) {
      const name = `${item.campaignCode ?? "コード不明"} ${item.title ?? "名称未取得"}`;
      const linkedName = item.officialUrl
        ? `<${item.officialUrl}|${slackText(name)}>`
        : slackText(name);
      const suffix = item.reason
        ? ` — ${slackText(item.reason)}`
        : item.status
          ? ` — ${slackText(item.status)}`
          : "";
      lines.push(`• *${label}* ${linkedName}${suffix}`);
    }
  }
  for (const warning of report.warnings ?? []) {
    lines.push(`• *警告* ${slackText(warning)}`);
  }
  for (const error of report.errors ?? []) {
    lines.push(`• *エラー* ${slackText(error)}`);
  }
  return lines;
}

export function buildSlackPayload(
  report,
  environment = process.env,
  decision = notificationDecision(report, {
    mode: environment.CAMPAIGN_AUTOMATION_MODE,
    pipelineFailed: environment.CAMPAIGN_PIPELINE_FAILED === "true",
    previousConclusion: environment.CAMPAIGN_PREVIOUS_CONCLUSION,
  }),
) {
  const title = titleForSeverity(decision.severity);
  const mode = environment.CAMPAIGN_AUTOMATION_MODE ?? report.mode ?? "report";
  const listing = report.listing ?? {};
  const ai = report.ai ?? {};
  const baseline = report.baseline ?? {};
  const baselineSource = baseline.source === "artifact" ? "Artifact" : "main";
  const details = itemLines(report);
  if (
    environment.CAMPAIGN_FAILURE_CONTEXT &&
    environment.CAMPAIGN_PIPELINE_FAILED === "true"
  ) {
    details.push(
      `• *失敗ステップ* ${slackText(environment.CAMPAIGN_FAILURE_CONTEXT)}`,
    );
  }
  const executionUrl = runUrl(environment);
  const summary = [
    `${title}（${report.checkedAt ?? "確認日不明"}）`,
    `モード: ${mode}`,
    `比較基準: ${baselineSource} / ${baseline.checkedAt ?? "不明"} / ${baseline.catalogVersion ?? "不明"}`,
    `公式一覧: ${listing.currentCount ?? "不明"}件`,
    `追加${report.additions?.length ?? 0}・変更${report.changes?.length ?? 0}・終了${report.ended?.length ?? 0}・保留${report.pending?.length ?? 0}`,
    `AI: ${ai.provider ?? "未設定"}/${ai.model ?? "未設定"} ${ai.calls ?? 0}回・推定$${Number(ai.estimatedCostUsd ?? 0).toFixed(4)}`,
  ].join("\n");
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: title, emoji: true },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*確認日*\n${slackText(report.checkedAt ?? "不明")}`,
        },
        { type: "mrkdwn", text: `*モード*\n${slackText(mode)}` },
        {
          type: "mrkdwn",
          text: `*公式一覧*\n${listing.previousCount ?? "不明"} → ${listing.currentCount ?? "不明"}件`,
        },
        {
          type: "mrkdwn",
          text: `*差分*\n追加 ${report.additions?.length ?? 0} / 変更 ${report.changes?.length ?? 0} / 終了 ${report.ended?.length ?? 0} / 保留 ${report.pending?.length ?? 0}`,
        },
        {
          type: "mrkdwn",
          text: `*AI利用*\n${slackText(ai.provider ?? "未設定")}/${slackText(ai.model ?? "未設定")} ${ai.calls ?? 0}回（cache ${ai.cacheHits ?? 0}）`,
        },
        {
          type: "mrkdwn",
          text: `*AI推定費用*\n$${Number(ai.estimatedCostUsd ?? 0).toFixed(4)} / 上限 $${Number(ai.limits?.maxBudgetUsd ?? 0).toFixed(2)}`,
        },
        {
          type: "mrkdwn",
          text: `*比較基準*\n${baselineSource} / ${slackText(baseline.checkedAt ?? "不明")}`,
        },
        {
          type: "mrkdwn",
          text: `*基準カタログ版*\n${slackText(baseline.catalogVersion ?? "不明")}${baseline.runId ? `（run ${slackText(baseline.runId)}）` : ""}`,
        },
      ],
    },
  ];
  if (details.length > 0) {
    const visible = details.slice(0, 20);
    if (details.length > visible.length) {
      visible.push(`• ほか ${details.length - visible.length}件（Actionsの成果物を確認）`);
    }
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncate(visible.join("\n"), 2_900),
      },
    });
  }
  if (executionUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "GitHub Actionsを確認" },
          url: executionUrl,
        },
      ],
    });
  }
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `catalog: ${slackText(report.catalogVersion ?? "未生成")} / safe: ${report.safeToPublish ? "yes" : "no"}`,
      },
    ],
  });
  return { text: truncate(summary, 2_900), blocks };
}

async function main() {
  const reportPath = path.resolve(
    option("report-path") ?? ".campaign-sync/report.json",
  );
  const payloadPath = path.resolve(
    option("payload-path") ?? ".campaign-sync/slack-payload.json",
  );
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const mode = option("mode") ?? process.env.CAMPAIGN_AUTOMATION_MODE ?? "report";
  const decision = notificationDecision(report, {
    mode,
    pipelineFailed: process.env.CAMPAIGN_PIPELINE_FAILED === "true",
    previousConclusion: process.env.CAMPAIGN_PREVIOUS_CONCLUSION ?? "",
    force: process.argv.includes("--force"),
  });
  const environment = { ...process.env, CAMPAIGN_AUTOMATION_MODE: mode };
  await mkdir(path.dirname(payloadPath), { recursive: true });
  await writeFile(
    payloadPath,
    `${JSON.stringify(buildSlackPayload(report, environment, decision), null, 2)}\n`,
  );
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `notify=${decision.notify}\nseverity=${decision.severity}\n`,
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      [
        "## キャンペーン自動確認",
        "",
        `- 確認日: ${report.checkedAt ?? "不明"}`,
        `- モード: ${mode}`,
        `- 比較基準: ${report.baseline?.source ?? "main"}`,
        `- 基準確認日: ${report.baseline?.checkedAt ?? "不明"}`,
        `- 基準カタログ版: ${report.baseline?.catalogVersion ?? "不明"}`,
        `- 基準run ID: ${report.baseline?.runId ?? "なし"}`,
        `- 安全判定: ${report.safeToPublish ? "通過" : "停止"}`,
        `- 追加: ${report.additions?.length ?? 0}件`,
        `- 変更: ${report.changes?.length ?? 0}件`,
        `- 終了: ${report.ended?.length ?? 0}件`,
        `- 保留: ${report.pending?.length ?? 0}件`,
        `- Slack通知: ${decision.notify ? decision.severity : "なし"}`,
        "",
      ].join("\n"),
    );
  }
  console.log(
    decision.notify
      ? `Slack通知ペイロードを生成しました: ${decision.severity}`
      : "Slack通知対象ではありません。",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
