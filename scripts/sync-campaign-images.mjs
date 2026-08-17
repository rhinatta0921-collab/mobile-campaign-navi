#!/usr/bin/env node

import {
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OFFICIAL_HOST = "network.mobile.rakuten.co.jp";
const LISTING_URL = `https://${OFFICIAL_HOST}/campaign/`;
const CAMPAIGN_DIRECTORY = path.resolve("data/campaigns/generated");
const MANIFEST_PATH = path.resolve("data/campaigns/images.json");
const IMAGE_DIRECTORY = path.resolve("public/assets/campaigns/official");
const CONCLUSION_CAMPAIGN_CODE = "3327";
const CONCURRENCY = 6;

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

const shouldWrite = process.argv.includes("--write");
const shouldCheck = process.argv.includes("--check");
const checkedAtArgument = option("checked-at");
const campaignCodeFilter = option("campaign-code");

if (shouldWrite && shouldCheck) {
  throw new Error("--write と --check は同時に指定できません。");
}
if (shouldWrite && !checkedAtArgument) {
  throw new Error("書き込み時は --checked-at=YYYY-MM-DD が必要です。");
}
if (checkedAtArgument && !/^\d{4}-\d{2}-\d{2}$/.test(checkedAtArgument)) {
  throw new Error("--checked-at は YYYY-MM-DD 形式で指定してください。");
}
if (shouldWrite && campaignCodeFilter) {
  throw new Error("孤立画像を防ぐため、--write は全件同期で実行してください。");
}

const explicitImagePairs = new Map([
  [
    "/campaign/tadaima/",
    {
      desktop: "/assets/img/campaign/tadaima/img-heading-pc_260310.png",
      mobile: "/assets/img/campaign/tadaima/img-heading-sp_260310.png",
    },
  ],
]);

const forceListingImagePaths = new Set([
  "/product/internet/rakuten-wifi-pocket-5g/",
  "/product/rakuten-certified/",
  "/service/anshin-control/",
  "/service/call-waiting/",
  "/service/voice-mail/",
  "/service/whoscall/",
]);

const preferListingForDetailPaths = new Set([
  "/campaign/iphone-discount/",
  "/guide/application/card-campaign/",
]);

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#47;", "/");
}

function normalizePathname(value, baseUrl = LISTING_URL) {
  const pathname = new URL(decodeHtml(value), baseUrl).pathname;
  return pathname === "/" ? pathname : `${pathname.replace(/\/+$/, "")}/`;
}

function firstAttribute(tag, names) {
  for (const name of names) {
    const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
    if (!match) continue;
    const values = decodeHtml(match[1])
      .split(",")
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .filter(Boolean);
    if (values.length > 0) return values.at(-1);
  }
  return null;
}

function extractImageCandidates(html, pageUrl) {
  const candidates = new Set();
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const candidate = firstAttribute(match[0], [
      "data-srcset",
      "srcset",
      "data-src",
      "src",
    ]);
    if (!candidate || candidate.startsWith("data:")) continue;
    try {
      const resolved = new URL(candidate, pageUrl);
      if (resolved.hostname === OFFICIAL_HOST) candidates.add(resolved.href);
    } catch {
      // Ignore malformed markup and inspect the remaining official assets.
    }
  }
  return [...candidates];
}

function imageRole(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  const desktop = /(?:^|[-_/])(pc|desktop)(?:[-_.\/]|$)/.test(pathname);
  const mobile = /(?:^|[-_/])(sp|mobile)(?:[-_.\/]|$)/.test(pathname);
  if (desktop === mobile) return null;
  return desktop ? "desktop" : "mobile";
}

function visualScore(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  let score = 0;
  if (/img[-_]kv|kv[-_]/.test(pathname)) score += 120;
  else if (/[-_/]kv[-_.\/]/.test(pathname)) score += 110;
  if (/hero/.test(pathname)) score += 90;
  if (/img[-_]heading|heading[-_]/.test(pathname)) score += 80;
  if (/mainvisual|main-visual|main_visual/.test(pathname)) score += 70;
  if (/campaign|service|product|internet|hikari|fee/.test(pathname)) score += 10;
  if (/logo|icon|header|footer|common|nav|menu/.test(pathname)) score -= 200;
  return score;
}

function selectResponsivePair(candidates) {
  const select = (role) =>
    candidates
      .filter((url) => imageRole(url) === role)
      .map((url) => ({ url, score: visualScore(url) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) =>
        right.score - left.score || left.url.localeCompare(right.url),
      )[0]?.url;
  const desktop = select("desktop");
  const mobile = select("mobile");
  return desktop && mobile
    ? { desktop, mobile, source: "responsive KV" }
    : null;
}

function extractOgImage(html, pageUrl) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (!/(?:property|name)=["']og:image["']/i.test(tag)) continue;
    const candidate = firstAttribute(tag, ["content"]);
    if (!candidate) continue;
    const resolved = new URL(candidate, pageUrl);
    const pathname = resolved.pathname.toLowerCase();
    if (resolved.hostname !== OFFICIAL_HOST) continue;
    if (pathname === "/assets/img/common/ogp.png") continue;
    if (/\/common\/.+ogp/.test(pathname)) continue;
    return resolved.href;
  }
  return null;
}

function extractListingImages(html) {
  const images = new Map();
  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const image = [...match[2].matchAll(/<img\b[^>]*>/gi)]
      .map((imageMatch) =>
        firstAttribute(imageMatch[0], [
          "data-srcset",
          "srcset",
          "data-src",
          "src",
        ]),
      )
      .find((candidate) => {
        if (!candidate) return false;
        try {
          return new URL(candidate, LISTING_URL).pathname.startsWith(
            "/assets/img/banner/campaign/",
          );
        } catch {
          return false;
        }
      });
    if (!image) continue;
    try {
      const linkedPath = normalizePathname(match[1]);
      const imageUrl = new URL(image, LISTING_URL);
      if (imageUrl.hostname === OFFICIAL_HOST && !images.has(linkedPath)) {
        images.set(linkedPath, imageUrl.href);
      }
    } catch {
      // Ignore malformed listing cards.
    }
  }
  return images;
}

async function fetchWithRetry(url, responseType) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; CampaignImageArchiver/2.0; +https://network.mobile.rakuten.co.jp/)",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return responseType === "text"
        ? await response.text()
        : { response, buffer: Buffer.from(await response.arrayBuffer()) };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`${url}: ${lastError}`);
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

function extensionFor(response, sourceUrl) {
  const contentType = response.headers.get("content-type")?.split(";")[0];
  const extensions = new Map([
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["image/svg+xml", ".svg"],
  ]);
  if (contentType && extensions.has(contentType)) return extensions.get(contentType);
  const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }
  throw new Error(`${sourceUrl}: unsupported image content type ${contentType}`);
}

function applicationTypes(campaign) {
  const pointTypes = ["mnp", "newNumber"].filter(
    (type) => typeof campaign.points[type] === "number",
  );
  if (pointTypes.length > 0) return pointTypes;
  if (campaign.conditions.includes("MNP")) return ["mnp"];
  if (
    campaign.conditions.some(
      (condition) =>
        condition === "新規契約" || condition.includes("新規申し込み"),
    )
  ) return ["newNumber"];
  return ["mnp", "newNumber"];
}

function previousVariant(manifest, campaignCode, role) {
  const campaign = manifest.campaigns[campaignCode];
  if (!campaign) return null;
  if (role === "detail") return campaign.detail;
  return campaign.responsive?.[role] ?? null;
}

async function choosePageImage([officialUrl, records], listingImages) {
  const pageHtml = await fetchWithRetry(officialUrl, "text");
  const pathname = normalizePathname(officialUrl);
  const explicitPair = explicitImagePairs.get(pathname);
  let selected = forceListingImagePaths.has(pathname)
    ? null
    : explicitPair
      ? {
          desktop: new URL(explicitPair.desktop, officialUrl).href,
          mobile: new URL(explicitPair.mobile, officialUrl).href,
          source: "responsive KV override",
        }
      : selectResponsivePair(extractImageCandidates(pageHtml, officialUrl));
  if (!selected && !forceListingImagePaths.has(pathname)) {
    const ogImage = extractOgImage(pageHtml, officialUrl);
    if (ogImage) selected = { desktop: ogImage, mobile: null, source: "OG image" };
  }
  if (!selected) {
    const listingImage = listingImages.get(pathname);
    if (listingImage) {
      selected = {
        desktop: listingImage,
        mobile: null,
        source: "campaign listing image",
      };
    }
  }
  if (!selected) throw new Error(`${officialUrl}: 公式画像を特定できません。`);
  const listingImage = listingImages.get(pathname) ?? null;
  const detail = preferListingForDetailPaths.has(pathname)
    ? listingImage
    : selected.mobile ?? listingImage ?? selected.desktop;
  if (!detail) throw new Error(`${officialUrl}: 詳細画像を特定できません。`);
  return { officialUrl, records, selected: { ...selected, detail } };
}

async function main() {
  const [filenames, previousManifest, listingHtml] = await Promise.all([
    readdir(CAMPAIGN_DIRECTORY),
    readFile(MANIFEST_PATH, "utf8").then(JSON.parse),
    fetchWithRetry(LISTING_URL, "text"),
  ]);
  const checkedAt =
    checkedAtArgument ??
    Object.values(previousManifest.campaigns)[0]?.checkedAt ??
    new Date().toISOString().slice(0, 10);
  const campaigns = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".campaign.json"))
      .sort()
      .map((filename) =>
        readFile(path.join(CAMPAIGN_DIRECTORY, filename), "utf8").then(JSON.parse),
      ),
  );
  const displayedCampaigns = campaigns.filter(
    (campaign) =>
      campaign.rankingEligible &&
      !campaign.requiresDevicePurchase &&
      applicationTypes(campaign).length > 0 &&
      (!campaignCodeFilter || campaign.campaignCode === campaignCodeFilter),
  );
  if (campaignCodeFilter && displayedCampaigns.length === 0) {
    throw new Error(`表示対象キャンペーン ${campaignCodeFilter} が見つかりません。`);
  }

  const groupedByPage = new Map();
  for (const campaign of displayedCampaigns) {
    const records = groupedByPage.get(campaign.officialUrl) ?? [];
    records.push(campaign);
    groupedByPage.set(campaign.officialUrl, records);
  }
  const pageEntries = [...groupedByPage].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  );
  const listingImages = extractListingImages(listingHtml);
  const selections = await mapLimit(pageEntries, CONCURRENCY, (entry) =>
    choosePageImage(entry, listingImages),
  );

  const requests = [];
  for (const { records, selected } of selections) {
    const codes = records.map(({ campaignCode }) => campaignCode).sort();
    requests.push({ codes, role: "detail", sourceUrl: selected.detail });
    if (codes.includes(CONCLUSION_CAMPAIGN_CODE)) {
      requests.push({ codes, role: "desktop", sourceUrl: selected.desktop });
      if (selected.mobile) {
        requests.push({ codes, role: "mobile", sourceUrl: selected.mobile });
      }
    }
  }

  const uniqueRequests = [];
  const requestBySource = new Map();
  for (const request of requests) {
    const existing = requestBySource.get(request.sourceUrl);
    if (existing) {
      existing.codes.push(...request.codes);
      existing.roles.push(request.role);
      continue;
    }
    const record = { ...request, roles: [request.role] };
    uniqueRequests.push(record);
    requestBySource.set(request.sourceUrl, record);
  }

  const stagingDirectory = await mkdtemp(
    path.join(path.dirname(IMAGE_DIRECTORY), "official.next-"),
  );
  const localizedBySource = new Map();
  try {
    const downloaded = await mapLimit(uniqueRequests, CONCURRENCY, async (request) => {
      const { response, buffer } = await fetchWithRetry(request.sourceUrl, "buffer");
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error(`${request.sourceUrl}: 画像サイズを取得できません。`);
      }
      const canonicalCode = request.codes.sort()[0];
      const preferred = request.codes
        .flatMap((code) => request.roles.map((role) => previousVariant(previousManifest, code, role)))
        .find((variant) => variant?.sourceUrl === request.sourceUrl);
      const filename = preferred
        ? path.basename(preferred.path)
        : `${canonicalCode}-${request.role}${extensionFor(response, request.sourceUrl)}`;
      await writeFile(path.join(stagingDirectory, filename), buffer);
      return {
        sourceUrl: request.sourceUrl,
        localized: {
          path: `/assets/campaigns/official/${filename}`,
          sourceUrl: request.sourceUrl,
          width: metadata.width,
          height: metadata.height,
        },
      };
    });
    for (const result of downloaded) {
      localizedBySource.set(result.sourceUrl, result.localized);
    }

    const nextManifest = { campaigns: {} };
    for (const { records, selected } of selections) {
      const detail = localizedBySource.get(selected.detail);
      for (const campaign of records) {
        nextManifest.campaigns[campaign.campaignCode] = {
          detail,
          ...(campaign.campaignCode === CONCLUSION_CAMPAIGN_CODE
            ? {
                responsive: {
                  desktop: localizedBySource.get(selected.desktop),
                  mobile: selected.mobile
                    ? localizedBySource.get(selected.mobile)
                    : null,
                },
              }
            : {}),
          checkedAt,
        };
      }
    }

    if (shouldCheck) {
      const expected = `${JSON.stringify(nextManifest, null, 2)}\n`;
      const actual = `${JSON.stringify(previousManifest, null, 2)}\n`;
      if (expected !== actual) throw new Error("画像マニフェストに同期差分があります。");
      const requiredFiles = new Set(
        Object.values(nextManifest.campaigns).flatMap((image) => [
          image.detail.path,
          ...(image.responsive
            ? [image.responsive.desktop.path, image.responsive.mobile?.path]
            : []),
        ]).filter(Boolean).map((imagePath) => path.basename(imagePath)),
      );
      const currentFiles = new Set(await readdir(IMAGE_DIRECTORY));
      const orphans = [...currentFiles].filter((name) => !requiredFiles.has(name));
      if (orphans.length > 0) {
        throw new Error(`孤立した公式画像があります: ${orphans.join(", ")}`);
      }
    } else if (shouldWrite) {
      const manifestStagingPath = `${MANIFEST_PATH}.next`;
      await writeFile(manifestStagingPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
      const previousDirectory = `${IMAGE_DIRECTORY}.previous`;
      await rm(previousDirectory, { recursive: true, force: true });
      await rename(IMAGE_DIRECTORY, previousDirectory);
      try {
        await rename(stagingDirectory, IMAGE_DIRECTORY);
        await rename(manifestStagingPath, MANIFEST_PATH);
        await rm(previousDirectory, { recursive: true, force: true });
      } catch (error) {
        await rm(IMAGE_DIRECTORY, { recursive: true, force: true });
        await rename(previousDirectory, IMAGE_DIRECTORY);
        throw error;
      }
    }

    console.log(
      `${shouldWrite ? "保存" : shouldCheck ? "確認" : "プレビュー"}: ${displayedCampaigns.length}キャンペーン、${uniqueRequests.length}画像`,
    );
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

await main();
