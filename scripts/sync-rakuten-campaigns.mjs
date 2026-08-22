#!/usr/bin/env node

import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const LISTING_URL = "https://network.mobile.rakuten.co.jp/campaign/";
const DATA_DIRECTORY = path.resolve(option("data-directory") ?? "data/campaigns");
const GENERATED_DIRECTORY = path.join(DATA_DIRECTORY, "generated");
const OVERRIDES_PATH = path.join(DATA_DIRECTORY, "curated-overrides.json");

const cardCodes = new Map(
  Object.entries({
    "/campaign/mnp/": ["2091", "2142"],
    "/fee/unext/": ["3293", "3288"],
    "/campaign/iphone-discount/": ["2938"],
    "/campaign/android-discount/": ["2178"],
    "/campaign/iphone-point-iphone-17/": ["2568"],
    "/campaign/iphone-point-iphone-16e/": ["2938"],
    "/campaign/galaxy/": ["3303", "3304"],
    "/product/internet/rakuten-wifi-pocket-5g/": ["2808"],
    "/product/internet/rakuten-wifi-pocket-platinum/": ["1875"],
    "/campaign/shop-limited-application": ["2995", "2619"],
    "/product/iphone/iphone-16/": ["2938"],
    "/campaign/iphone-pointback/": ["2568"],
    "/campaign/shop-weekday-reservation/": ["2981"],
    "/campaign/referral/": ["1784"],
    "/campaign/senior-pointback/": ["2897"],
    "/campaign/fee-simulation/": ["2215"],
    "/guide/application/card-campaign/": ["1238"],
    "/campaign/tadaima/": ["2207"],
    "/campaign/shop-extra-sim/": ["2331"],
    "/campaign/shop-opening-commemoration/": ["2855"],
    "/campaign/android-sale/": ["2178"],
    "/campaign/shop-limited-android/": ["3186"],
    "/campaign/start-point/": ["1819", "2006"],
    "/product/rakuten-certified/": ["3297"],
    "/campaign/heyduggee/": ["3351"],
    "/campaign/ichiba-debut/": ["3327"],
    "/campaign/shop-point/": ["3350"],
    "/internet/turbo/campaign/home-internet/": ["2698"],
    "/hikari/campaign/home-internet/": ["2697"],
    "/campaign/spu/": ["1173"],
    "/campaign/youtubepremium/": ["1680"],
    "/campaign/payment-google/": ["1922"],
    "/campaign/bank-member-campaign/": ["2660"],
    "/campaign/poitoku/": ["3141"],
    "/service/standard-free-call/": ["1977"],
    "/service/voice-mail/": ["2835"],
    "/service/call-waiting/": ["2834"],
    "/service/saikyo-protection/": ["2956"],
    "/service/whoscall/": ["3329"],
    "/service/anshin-control/": ["2833"],
    "/campaign/apple-watch-number-share/": ["2602"],
    "/campaign/answer-quiz/": ["3386"],
    "/campaign/referral-one-million/": ["3390"],
  }),
);

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

const shouldWrite = process.argv.includes("--write");
const shouldCheck = process.argv.includes("--check");
const sourceHtmlPath = option("source-html");
const checkedAtArgument = option("checked-at");
const expectedCardCountArgument = option("expected-card-count");

if (shouldWrite && shouldCheck) {
  throw new Error("--write と --check は同時に指定できません。");
}
if (shouldWrite && !checkedAtArgument) {
  throw new Error("書き込み時は --checked-at=YYYY-MM-DD が必要です。");
}
if (checkedAtArgument && !/^\d{4}-\d{2}-\d{2}$/.test(checkedAtArgument)) {
  throw new Error("--checked-at は YYYY-MM-DD 形式で指定してください。");
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(href) {
  const url = new URL(decodeHtml(href), LISTING_URL);
  url.search = "";
  url.hash = "";
  return url;
}

function generatedCode(url) {
  const host = url.hostname.replace(/^www\./, "").split(".")[0];
  const pathPart =
    url.pathname.split("/").filter(Boolean).slice(-3).join("-") || "top";
  return `NO-CODE-${host}-${pathPart}`
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .toUpperCase();
}

function fileSlug(url) {
  return (
    url.pathname
      .split("/")
      .filter(Boolean)
      .slice(-2)
      .join("-")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "campaign"
  );
}

export function parseCards(html) {
  const start = html.indexOf(
    'href="/campaign/member/?l-id=campaign_campaign_member"',
  );
  const end = html.indexOf("過去のキャンペーン・特典はこちら", start);
  if (start < 0 || end < 0) {
    throw new Error("公式一覧のキャンペーン領域を検出できませんでした。");
  }

  return [
    ...html
      .slice(start, end)
      .matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
  ]
    .map((match) => {
      const alt = match[2].match(/<img[^>]+alt="([^"]*)"/)?.[1] ?? "";
      const descriptions = [
        ...match[2].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g),
      ]
        .map((item) => textContent(item[1]))
        .filter(Boolean);
      return {
        url: cleanUrl(match[1]),
        title: textContent(alt) || descriptions[0] || "名称未取得",
        description: descriptions.join(" "),
        raw: textContent(match[2]),
      };
    })
    .filter((card) => card.url.pathname !== "/campaign/member/");
}

function sourceNote(codeType) {
  if (codeType === "generated") {
    return "リンク先に公式コードの記載がないため、URLから生成した補助コードです。";
  }
  if (codeType === "initiative") {
    return "公式ページでは「施策コード」として案内されています。";
  }
  return "公式ページに掲載されたキャンペーンコードです。";
}

function formatJapaneseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function withoutSyncMetadata(override) {
  const curated = { ...override };
  delete curated.supplemental;
  delete curated.officialUrl;
  return curated;
}

function campaignFrom(code, card, listingIndex, checkedAt, overrides) {
  const override = overrides[code] ?? {};
  const curated = withoutSyncMetadata(override);
  const codeType =
    curated.codeType ?? (code.startsWith("NO-CODE-") ? "generated" : "campaign");
  const points = curated.points ?? { newNumber: null, mnp: null };
  const fallbackDescription = card.description || card.title;
  const pointValues = Object.values(points).filter(
    (value) => typeof value === "number",
  );
  const maximumPoints = pointValues.length > 0 ? Math.max(...pointValues) : null;

  const generated = {
    campaignCode: code,
    codeType,
    title: card.title.replace(/^【要エントリー】\s*/, ""),
    summary: fallbackDescription,
    benefit:
      maximumPoints === null
        ? {
            type: "other",
            amount: null,
            unit: null,
            description: fallbackDescription,
          }
        : {
            type: "points",
            amount: maximumPoints,
            unit: "ポイント",
            description: `最大${maximumPoints.toLocaleString("ja-JP")}ポイントを進呈します。`,
          },
    points,
    breakdown: {
      newNumber:
        typeof points.newNumber === "number"
          ? [`最大${points.newNumber.toLocaleString("ja-JP")}ポイント`]
          : null,
      mnp:
        typeof points.mnp === "number"
          ? [`最大${points.mnp.toLocaleString("ja-JP")}ポイント`]
          : null,
    },
    target: "公式ページに記載された条件を満たす方",
    conditions: [
      card.raw.includes("要エントリー")
        ? "要エントリー"
        : "公式ページで条件確認",
    ],
    channel: "公式ページ参照",
    category: "other",
    audience: "both",
    period: `${formatJapaneseDate(checkedAt)}時点で公式一覧に掲載中（終了日は公式ページ参照）`,
    officialUrl: card.url.href,
    listingUrl: LISTING_URL,
    checkedAt,
    notes: [sourceNote(codeType)],
    requiresDevicePurchase: false,
    rankingEligible: maximumPoints !== null,
    sourceCards: [
      {
        listingIndex,
        title: card.title,
        description: card.description,
        url: card.url.href,
      },
    ],
  };

  return {
    ...generated,
    ...curated,
    campaignCode: code,
    officialUrl: card.url.href,
    listingUrl: LISTING_URL,
    checkedAt,
    sourceCards: generated.sourceCards,
  };
}

function supplementalCampaign(code, override, checkedAt) {
  const officialUrl = override.officialUrl;
  const curated = withoutSyncMetadata(override);
  if (!officialUrl) throw new Error(`補足キャンペーン ${code} に officialUrl がありません。`);
  return {
    campaignCode: code,
    ...curated,
    officialUrl,
    listingUrl: LISTING_URL,
    checkedAt,
    sourceCards: [
      {
        listingIndex: null,
        title: curated.title,
        description: curated.summary,
        url: officialUrl,
      },
    ],
  };
}

function validateCampaign(campaign) {
  for (const key of ["campaignCode", "title", "summary", "officialUrl"]) {
    if (typeof campaign[key] !== "string" || campaign[key].length === 0) {
      throw new Error(`${campaign.campaignCode ?? "unknown"}: ${key} が不正です。`);
    }
  }
  new URL(campaign.officialUrl);
  if (
    campaign.rankingEligible &&
    !campaign.requiresDevicePurchase &&
    (!campaign.editorial || !campaign.conditions?.length)
  ) {
    throw new Error(
      `${campaign.campaignCode}: 表示対象に編集記事または適用条件がありません。`,
    );
  }
  if (campaign.applicationUrl) new URL(campaign.applicationUrl);
}

async function fetchTextWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`公式一覧の取得に失敗しました: ${lastError}`);
}

async function currentIndex() {
  return JSON.parse(
    await readFile(path.join(GENERATED_DIRECTORY, "index.json"), "utf8"),
  );
}

async function writeCandidateDirectory(campaigns, index) {
  const stagingDirectory = await mkdtemp(
    path.join(DATA_DIRECTORY, "generated.next-"),
  );
  const filenames = [];
  for (const campaign of campaigns) {
    validateCampaign(campaign);
    const filename = `${campaign.campaignCode.toLowerCase()}-${fileSlug(
      new URL(campaign.officialUrl),
    )}.campaign.json`;
    filenames.push(filename);
    await writeFile(
      path.join(stagingDirectory, filename),
      `${JSON.stringify(campaign, null, 2)}\n`,
    );
  }
  index.items = filenames.sort((left, right) => left.localeCompare(right, "en"));
  await writeFile(
    path.join(stagingDirectory, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  return stagingDirectory;
}

async function directoryDiff(leftDirectory, rightDirectory) {
  const leftFiles = (await readdir(leftDirectory)).sort();
  const rightFiles = (await readdir(rightDirectory)).sort();
  const names = [...new Set([...leftFiles, ...rightFiles])].sort();
  const differences = [];
  for (const name of names) {
    if (!leftFiles.includes(name) || !rightFiles.includes(name)) {
      differences.push(name);
      continue;
    }
    const [left, right] = await Promise.all([
      readFile(path.join(leftDirectory, name), "utf8"),
      readFile(path.join(rightDirectory, name), "utf8"),
    ]);
    if (left !== right) differences.push(name);
  }
  return differences;
}

async function replaceGeneratedDirectory(stagingDirectory) {
  const backupDirectory = `${GENERATED_DIRECTORY}.previous`;
  await rm(backupDirectory, { recursive: true, force: true });
  await rename(GENERATED_DIRECTORY, backupDirectory);
  try {
    await rename(stagingDirectory, GENERATED_DIRECTORY);
    await rm(backupDirectory, { recursive: true, force: true });
  } catch (error) {
    await rename(backupDirectory, GENERATED_DIRECTORY);
    throw error;
  }
}

async function main() {
  const [overrides, existingIndex] = await Promise.all([
    readFile(OVERRIDES_PATH, "utf8").then(JSON.parse),
    currentIndex(),
  ]);
  const checkedAt = checkedAtArgument ?? existingIndex.checkedAt;
  const expectedCardCount = Number(
    expectedCardCountArgument ?? existingIndex.listingCardCount,
  );
  const html = sourceHtmlPath
    ? await readFile(path.resolve(sourceHtmlPath), "utf8")
    : await fetchTextWithRetry(LISTING_URL);
  const cards = parseCards(html);
  if (cards.length !== expectedCardCount) {
    throw new Error(
      `公式一覧の件数が想定と異なります: expected=${expectedCardCount} actual=${cards.length}`,
    );
  }

  const campaignsByCode = new Map();
  cards.forEach((card, index) => {
    const codes = cardCodes.get(card.url.pathname) ?? [generatedCode(card.url)];
    for (const code of codes) {
      const campaign = campaignFrom(code, card, index + 1, checkedAt, overrides);
      const existing = campaignsByCode.get(code);
      if (existing) existing.sourceCards.push(...campaign.sourceCards);
      else campaignsByCode.set(code, campaign);
    }
  });

  for (const [code, override] of Object.entries(overrides)) {
    if (!override.supplemental) continue;
    if (campaignsByCode.has(code)) {
      throw new Error(`補足キャンペーン ${code} が公式一覧と重複しています。`);
    }
    campaignsByCode.set(code, supplementalCampaign(code, override, checkedAt));
  }

  const campaigns = [...campaignsByCode.values()].sort((left, right) =>
    left.campaignCode.localeCompare(right.campaignCode, "en"),
  );
  const supplementalCount = Object.values(overrides).filter(
    (override) => override.supplemental,
  ).length;
  const index = {
    listingUrl: LISTING_URL,
    checkedAt,
    listingCardCount: cards.length,
    campaignCount: campaigns.length,
    items: [],
  };
  const stagingDirectory = await writeCandidateDirectory(campaigns, index);

  try {
    if (shouldCheck) {
      const differences = await directoryDiff(stagingDirectory, GENERATED_DIRECTORY);
      if (differences.length > 0) {
        throw new Error(`同期差分があります: ${differences.join(", ")}`);
      }
    } else if (shouldWrite) {
      await replaceGeneratedDirectory(stagingDirectory);
    }
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }

  console.log(
    `${shouldWrite ? "更新" : shouldCheck ? "確認" : "プレビュー"}: 公式一覧${cards.length}枚＋補足${supplementalCount}件 → ${campaigns.length}キャンペーン`,
  );
}

await access(OVERRIDES_PATH);
await main();
