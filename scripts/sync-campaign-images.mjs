#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  catalogVersion,
  statusCounts,
} from "./lib/campaign-automation.mjs";

const OFFICIAL_HOST = "network.mobile.rakuten.co.jp";
const LISTING_URL = `https://${OFFICIAL_HOST}/campaign/`;
const CAMPAIGN_DIRECTORY = path.resolve("data/campaigns/generated");
const MANIFEST_PATH = path.resolve("data/campaigns/images.json");
const POLICY_PATH = path.resolve("data/campaigns/presentation-policy.json");
const IMAGE_DIRECTORY = path.resolve("public/assets/campaigns/official");
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
const reportPath = option("report-path")
  ? path.resolve(option("report-path"))
  : null;

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

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
    "/guide/application/card-campaign/",
    {
      desktop: "/assets/img/guide/application/card-bank/img-mobile-card3000-pc_241029.png",
      mobile: "/assets/img/guide/application/card-bank/img-mobile-card3000-sp_241029.png",
    },
  ],
  [
    "/campaign/tadaima/",
    {
      desktop: "/assets/img/campaign/tadaima/img-heading-pc_260310.png",
      mobile: "/assets/img/campaign/tadaima/img-heading-sp_260310.png",
    },
  ],
]);

const forceListingImagePaths = new Set([
  "/campaign/heyduggee/",
  "/product/internet/rakuten-wifi-pocket-5g/",
  "/product/rakuten-certified/",
  "/service/anshin-control/",
  "/service/call-waiting/",
  "/service/voice-mail/",
  "/service/whoscall/",
]);

const preferListingForDetailPaths = new Set([
  "/campaign/iphone-discount/",
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

function selectResponsiveImages(candidates) {
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
  return desktop || mobile ? { desktop, mobile } : null;
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

function uniqueUrls(values) {
  return [...new Set(values.filter(Boolean))];
}

export function normalizedPreviousImage(manifest, campaignCode, policy) {
  const image = manifest.campaigns?.[campaignCode];
  if (!image) return null;
  if (image.ranking && image.editorial?.desktop && image.editorial?.mobile) {
    return image;
  }
  if (!image.detail) return null;
  const desktop = image.responsive?.desktop ?? image.detail;
  const mobile = image.responsive?.mobile ?? image.detail;
  return {
    ranking: image.detail,
    editorial: {
      desktop: {
        ...desktop,
        presentation:
          desktop.width / desktop.height >=
          policy.editorial.desktop.minimumNaturalAspectRatio
            ? "natural"
            : "contain-16x9",
      },
      mobile,
    },
    checkedAt: image.checkedAt,
  };
}

function previousVariant(manifest, campaignCode, role, policy) {
  const campaign = normalizedPreviousImage(manifest, campaignCode, policy);
  if (!campaign) return null;
  if (role === "ranking") return campaign.ranking;
  return campaign.editorial[role] ?? null;
}

async function choosePageImage([officialUrl, records], listingImages) {
  const pageHtml = await fetchWithRetry(officialUrl, "text");
  const pathname = normalizePathname(officialUrl);
  const explicitPair = explicitImagePairs.get(pathname);
  const listingImage = listingImages.get(pathname) ?? null;
  const responsive = forceListingImagePaths.has(pathname)
    ? null
    : explicitPair
      ? {
          desktop: new URL(explicitPair.desktop, officialUrl).href,
          mobile: new URL(explicitPair.mobile, officialUrl).href,
        }
      : selectResponsiveImages(extractImageCandidates(pageHtml, officialUrl));
  const ogImage = forceListingImagePaths.has(pathname)
    ? null
    : extractOgImage(pageHtml, officialUrl);
  const mobile = preferListingForDetailPaths.has(pathname)
    ? listingImage ?? responsive?.mobile ?? ogImage ?? responsive?.desktop
    : responsive?.mobile ?? listingImage ?? ogImage ?? responsive?.desktop;
  const ranking = mobile;
  const desktopCandidates = uniqueUrls([
    responsive?.desktop,
    listingImage,
    ogImage,
    mobile,
  ]);
  if (!ranking || desktopCandidates.length === 0) {
    throw new Error(`${officialUrl}: 公式画像を特定できません。`);
  }
  return {
    officialUrl,
    records,
    selected: { ranking, mobile, desktopCandidates },
  };
}

function campaignImageVariants(image) {
  return [image.ranking, image.editorial.desktop, image.editorial.mobile];
}

function baseImageVariant(variant) {
  return {
    path: variant.path,
    sourceUrl: variant.sourceUrl,
    width: variant.width,
    height: variant.height,
  };
}

function sourceDigest(sourceUrl) {
  return createHash("sha256").update(sourceUrl).digest("hex").slice(0, 8);
}

export function pendingForMissingImage(campaign, checkedAt, reason) {
  const note = `自動掲載保留: ${reason}`;
  return {
    ...campaign,
    publicationStatus: "pending",
    checkedAt,
    lastChangedAt: checkedAt,
    notes: [...new Set([...(campaign.notes ?? []), note])],
  };
}

export function selectDesktopPresentation(availableDesktop, minimumRatio) {
  const horizontalDesktop = availableDesktop.find(
    ({ width, height }) => width / height >= minimumRatio,
  );
  const image = horizontalDesktop ?? availableDesktop[0] ?? null;
  return image
    ? {
        image,
        presentation: horizontalDesktop ? "natural" : "contain-16x9",
      }
    : null;
}

async function updateCampaignReport(imageReport, pendingItems, nextCatalogVersion) {
  if (!reportPath || !(await pathExists(reportPath))) return;
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  report.images = imageReport;
  report.catalogVersion = nextCatalogVersion ?? report.catalogVersion;
  for (const item of pendingItems) {
    if (!(report.pending ?? []).some(({ campaignCode }) => campaignCode === item.campaignCode)) {
      report.pending = [...(report.pending ?? []), item];
    }
  }
  report.warnings = [...new Set([...(report.warnings ?? []), ...imageReport.warnings])];
  report.requiresAttention =
    report.requiresAttention ||
    pendingItems.length > 0 ||
    imageReport.warnings.length > 0;
  if (pendingItems.length > 0) report.contentChanged = true;
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const [filenames, previousManifest, policy] = await Promise.all([
    readdir(CAMPAIGN_DIRECTORY),
    readFile(MANIFEST_PATH, "utf8").then(JSON.parse),
    readFile(POLICY_PATH, "utf8").then(JSON.parse),
  ]);
  const checkedAt =
    checkedAtArgument ??
    Object.values(previousManifest.campaigns)[0]?.checkedAt ??
    new Date().toISOString().slice(0, 10);
  const campaignRecords = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".campaign.json"))
      .sort()
      .map(async (filename) => ({
        filename,
        campaign: JSON.parse(
          await readFile(path.join(CAMPAIGN_DIRECTORY, filename), "utf8"),
        ),
      })),
  );
  const campaigns = campaignRecords.map(({ campaign }) => campaign);
  const recordsByCode = new Map(
    campaignRecords.map((record) => [record.campaign.campaignCode, record]),
  );
  const displayedCampaigns = campaigns.filter(
    (campaign) =>
      campaign.publicationStatus === "published" &&
      campaign.rankingEligible &&
      !campaign.requiresDevicePurchase &&
      applicationTypes(campaign).length > 0,
  );
  if (
    campaignCodeFilter &&
    !displayedCampaigns.some(
      (campaign) => campaign.campaignCode === campaignCodeFilter,
    )
  ) {
    throw new Error(`表示対象キャンペーン ${campaignCodeFilter} が見つかりません。`);
  }
  const conclusionCampaignCode = [...displayedCampaigns]
    .filter(
      (campaign) =>
        campaign.eligibility?.firstApplication !== false &&
        applicationTypes(campaign).includes("mnp"),
    )
    .sort(
      (left, right) =>
        (right.points.mnp ?? 0) - (left.points.mnp ?? 0) ||
        left.conditions.length - right.conditions.length ||
        Number(!right.channel.includes("楽天モバイルショップ")) -
          Number(!left.channel.includes("楽天モバイルショップ")) ||
        (right.audience === "both" ? 3 : right.audience === "applicant" ? 2 : 1) -
          (left.audience === "both" ? 3 : left.audience === "applicant" ? 2 : 1) ||
        left.campaignCode.localeCompare(right.campaignCode, "en"),
    )[0]?.campaignCode;
  if (!conclusionCampaignCode) {
    throw new Error("結論に使えるMNPランキング対象がありません。");
  }

  const campaignsToRefresh = displayedCampaigns.filter((campaign) => {
    if (campaignCodeFilter) {
      return campaign.campaignCode === campaignCodeFilter;
    }
    const previous = normalizedPreviousImage(
      previousManifest,
      campaign.campaignCode,
      policy,
    );
    return (
      previousManifest.presentationPolicyVersion !== policy.id ||
      !previous?.ranking ||
      !previous?.editorial?.desktop ||
      !previous?.editorial?.mobile ||
      campaign.lastChangedAt === checkedAt
    );
  });
  const refreshedCodes = new Set(
    campaignsToRefresh.map(({ campaignCode }) => campaignCode),
  );

  const groupedByPage = new Map();
  for (const campaign of campaignsToRefresh) {
    const records = groupedByPage.get(campaign.officialUrl) ?? [];
    records.push(campaign);
    groupedByPage.set(campaign.officialUrl, records);
  }
  const pageEntries = [...groupedByPage].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  );
  const warnings = [];
  let listingImages = new Map();
  if (pageEntries.length) {
    try {
      listingImages = extractListingImages(
        await fetchWithRetry(LISTING_URL, "text"),
      );
    } catch (error) {
      warnings.push(`公式一覧画像の取得に失敗しました: ${error}`);
    }
  }
  const selectionResults = await mapLimit(pageEntries, CONCURRENCY, async (entry) => {
    try {
      return { selection: await choosePageImage(entry, listingImages) };
    } catch (error) {
      return { entry, error: String(error) };
    }
  });
  const selections = selectionResults
    .map(({ selection }) => selection)
    .filter(Boolean);
  const retainedAfterSelectionFailure = [];
  const pendingItems = [];
  const pendingCodes = new Set();
  for (const result of selectionResults.filter(({ error }) => error)) {
    const [, records] = result.entry;
    for (const campaign of records) {
      const previous = normalizedPreviousImage(
        previousManifest,
        campaign.campaignCode,
        policy,
      );
      if (previous) {
        retainedAfterSelectionFailure.push({ campaign, image: previous });
        warnings.push(
          `${campaign.campaignCode}: 公式画像の再選定に失敗したため前回画像を維持します（${result.error}）`,
        );
        continue;
      }
      const reason = `公式画像を取得できませんでした（${result.error}）`;
      const record = recordsByCode.get(campaign.campaignCode);
      record.campaign = pendingForMissingImage(campaign, checkedAt, reason);
      pendingCodes.add(campaign.campaignCode);
      pendingItems.push({
        campaignCode: campaign.campaignCode,
        title: campaign.title,
        officialUrl: campaign.officialUrl,
        reason,
      });
    }
  }

  const requests = [];
  for (const { records, selected } of selections) {
    const codes = records.map(({ campaignCode }) => campaignCode).sort();
    requests.push({ codes, role: "ranking", sourceUrl: selected.ranking });
    requests.push({ codes, role: "mobile", sourceUrl: selected.mobile });
    for (const sourceUrl of selected.desktopCandidates) {
      requests.push({ codes, role: "desktop", sourceUrl });
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
    const downloaded = await mapLimit(
      uniqueRequests,
      CONCURRENCY,
      async (request) => {
        try {
          const canonicalCode = [...new Set(request.codes)].sort()[0];
          const preferred = request.codes
            .flatMap((code) =>
              request.roles.map((role) =>
                previousVariant(previousManifest, code, role, policy),
              ),
            )
            .find((variant) => variant?.sourceUrl === request.sourceUrl);
          const preferredLocalPath = preferred
            ? path.resolve(`public${preferred.path}`)
            : null;
          if (
            preferred &&
            preferredLocalPath &&
            (await pathExists(preferredLocalPath))
          ) {
            const filename = path.basename(preferred.path);
            await copyFile(
              preferredLocalPath,
              path.join(stagingDirectory, filename),
            );
            return {
              sourceUrl: request.sourceUrl,
              localized: baseImageVariant(preferred),
            };
          }
          const { response, buffer } = await fetchWithRetry(
            request.sourceUrl,
            "buffer",
          );
          const metadata = await sharp(buffer).metadata();
          if (!metadata.width || !metadata.height) {
            throw new Error(`${request.sourceUrl}: 画像サイズを取得できません。`);
          }
          const primaryRole = request.roles.includes("ranking")
            ? "ranking"
            : request.roles.includes("mobile")
              ? "mobile"
              : "desktop";
          const filename = preferred
            ? path.basename(preferred.path)
            : `${canonicalCode}-${primaryRole}-${sourceDigest(request.sourceUrl)}${extensionFor(response, request.sourceUrl)}`;
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
        } catch (error) {
          return { sourceUrl: request.sourceUrl, error: String(error) };
        }
      },
    );
    for (const result of downloaded.filter(({ localized }) => localized)) {
      localizedBySource.set(result.sourceUrl, result.localized);
    }

    const nextManifest = {
      presentationPolicyVersion: policy.id,
      campaigns: {},
    };
    for (const campaign of displayedCampaigns) {
      if (
        refreshedCodes.has(campaign.campaignCode) ||
        pendingCodes.has(campaign.campaignCode)
      ) {
        continue;
      }
      const previousImage = normalizedPreviousImage(
        previousManifest,
        campaign.campaignCode,
        policy,
      );
      if (!previousImage) {
        throw new Error(
          `${campaign.campaignCode}: 既存の公式画像がありません。`,
        );
      }
      nextManifest.campaigns[campaign.campaignCode] = previousImage;
    }
    for (const { campaign, image } of retainedAfterSelectionFailure) {
      nextManifest.campaigns[campaign.campaignCode] = image;
    }
    for (const { records, selected } of selections) {
      const ranking = localizedBySource.get(selected.ranking);
      const mobile = localizedBySource.get(selected.mobile);
      for (const campaign of records) {
        const previousImage = normalizedPreviousImage(
          previousManifest,
          campaign.campaignCode,
          policy,
        );
        if (!ranking || !mobile) {
          if (previousImage) {
            nextManifest.campaigns[campaign.campaignCode] = previousImage;
            warnings.push(
              `${campaign.campaignCode}: 必須画像の取得に失敗したため前回画像を維持します。`,
            );
            continue;
          }
          const reason = "ランキング用またはSP用の公式画像を取得できませんでした。";
          const record = recordsByCode.get(campaign.campaignCode);
          record.campaign = pendingForMissingImage(campaign, checkedAt, reason);
          pendingCodes.add(campaign.campaignCode);
          pendingItems.push({
            campaignCode: campaign.campaignCode,
            title: campaign.title,
            officialUrl: campaign.officialUrl,
            reason,
          });
          continue;
        }
        const availableDesktop = selected.desktopCandidates
          .map((sourceUrl) => localizedBySource.get(sourceUrl))
          .filter(Boolean);
        const desktopSelection = selectDesktopPresentation(
          availableDesktop.length > 0 ? availableDesktop : [ranking],
          policy.editorial.desktop.minimumNaturalAspectRatio,
        );
        const desktop = desktopSelection.image;
        const presentation = desktopSelection.presentation;
        const nextImage = {
          ranking,
          editorial: {
            desktop: { ...desktop, presentation },
            mobile,
          },
        };
        const imageChanged =
          !previousImage ||
          JSON.stringify({
            ranking: previousImage.ranking,
            editorial: previousImage.editorial,
          }) !== JSON.stringify(nextImage);
        nextManifest.campaigns[campaign.campaignCode] = {
          ...nextImage,
          checkedAt: imageChanged ? checkedAt : previousImage.checkedAt,
        };
        if (
          presentation === "contain-16x9" &&
          (previousImage?.editorial.desktop.presentation !== "contain-16x9" ||
            previousImage?.editorial.desktop.sourceUrl !== desktop.sourceUrl)
        ) {
          warnings.push(
            `${campaign.campaignCode}: 適切な公式横長画像がないためPCでは16:9枠内に表示します。`,
          );
        }
      }
    }

    if (pendingCodes.size > 0 && shouldWrite) {
      for (const campaignCode of pendingCodes) {
        const record = recordsByCode.get(campaignCode);
        await writeFile(
          path.join(CAMPAIGN_DIRECTORY, record.filename),
          `${JSON.stringify(record.campaign, null, 2)}\n`,
        );
      }
      const indexPath = path.join(CAMPAIGN_DIRECTORY, "index.json");
      const index = JSON.parse(await readFile(indexPath, "utf8"));
      const nextCampaigns = campaignRecords.map(({ campaign }) => campaign);
      index.catalogVersion = catalogVersion(nextCampaigns);
      index.statusCounts = statusCounts(nextCampaigns);
      index.lastContentChangeAt = checkedAt;
      await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
    }

    const retainedVariants = Object.values(nextManifest.campaigns).flatMap(
      campaignImageVariants,
    );
    for (const variant of retainedVariants) {
      const destination = path.join(stagingDirectory, path.basename(variant.path));
      if (await pathExists(destination)) continue;
      const source = path.resolve(`public${variant.path}`);
      if (!(await pathExists(source))) {
        throw new Error(`${variant.path}: 既存の公式画像ファイルがありません。`);
      }
      await copyFile(source, destination);
    }

    const requiredFiles = new Set(
      retainedVariants.map(({ path: imagePath }) => path.basename(imagePath)),
    );
    for (const filename of await readdir(stagingDirectory)) {
      if (!requiredFiles.has(filename)) {
        await unlink(path.join(stagingDirectory, filename));
      }
    }

    if (shouldCheck) {
      const expected = `${JSON.stringify(nextManifest, null, 2)}\n`;
      const actual = `${JSON.stringify(previousManifest, null, 2)}\n`;
      if (expected !== actual) throw new Error("画像マニフェストに同期差分があります。");
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

    const fallbackCampaignCodes = Object.entries(nextManifest.campaigns)
      .filter(([, image]) =>
        image.editorial.desktop.presentation === "contain-16x9",
      )
      .map(([campaignCode]) => campaignCode)
      .sort();
    const imageReport = {
      presentationPolicyVersion: policy.id,
      displayedCampaignCount: Object.keys(nextManifest.campaigns).length,
      refreshedCampaignCount: refreshedCodes.size,
      naturalCount:
        Object.keys(nextManifest.campaigns).length - fallbackCampaignCodes.length,
      fallbackCount: fallbackCampaignCodes.length,
      fallbackCampaignCodes,
      warnings: [...new Set(warnings)],
    };
    const nextCatalogVersion = pendingCodes.size
      ? catalogVersion(campaignRecords.map(({ campaign }) => campaign))
      : null;
    await updateCampaignReport(imageReport, pendingItems, nextCatalogVersion);

    console.log(
      `${shouldWrite ? "保存" : shouldCheck ? "確認" : "プレビュー"}: ${Object.keys(nextManifest.campaigns).length}キャンペーン、再取得${campaignsToRefresh.length}件・横長${imageReport.naturalCount}件・16:9代替${imageReport.fallbackCount}件`,
    );
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
