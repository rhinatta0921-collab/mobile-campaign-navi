#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OFFICIAL_HOST = "network.mobile.rakuten.co.jp";
const LISTING_URL = `https://${OFFICIAL_HOST}/campaign/`;
const IMAGE_CHECKED_AT = "2026-08-06";
const CAMPAIGN_DIRECTORY = path.resolve("data/campaigns");
const PUBLIC_DIRECTORY = path.resolve("public");
const IMAGE_DIRECTORY = path.join(
  PUBLIC_DIRECTORY,
  "assets/campaigns/official",
);
const SHOULD_WRITE = process.argv.includes("--write");

const explicitImagePairs = new Map([
  [
    "/campaign/tadaima/",
    {
      desktop:
        "/assets/img/campaign/tadaima/img-heading-pc_260310.png",
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
    const match = tag.match(
      new RegExp(`\\b${name}=["']([^"']+)["']`, "i"),
    );
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
      // Ignore malformed markup and continue evaluating the remaining images.
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
  const desktopCandidates = candidates
    .filter((url) => imageRole(url) === "desktop")
    .map((url) => ({ url, score: visualScore(url) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  const mobileCandidates = candidates
    .filter((url) => imageRole(url) === "mobile")
    .map((url) => ({ url, score: visualScore(url) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));

  if (desktopCandidates.length === 0 || mobileCandidates.length === 0) {
    return null;
  }

  return {
    desktop: desktopCandidates[0].url,
    mobile: mobileCandidates[0].url,
    source: "responsive KV",
  };
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
    const image = firstAttribute(match[2], [
      "data-srcset",
      "srcset",
      "data-src",
      "src",
    ]);
    if (!image) continue;

    try {
      const linkedPath = normalizePathname(match[1]);
      const imageUrl = new URL(image, LISTING_URL);
      if (imageUrl.hostname !== OFFICIAL_HOST) continue;
      if (!images.has(linkedPath)) images.set(linkedPath, imageUrl.href);
    } catch {
      // Ignore malformed listing links.
    }
  }

  return images;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; CampaignImageArchiver/1.0; +https://network.mobile.rakuten.co.jp/)",
    },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
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

  if (contentType && extensions.has(contentType)) {
    return extensions.get(contentType);
  }

  const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  throw new Error(`${sourceUrl}: unsupported image content type ${contentType}`);
}

async function downloadImage(sourceUrl, localBaseName) {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; CampaignImageArchiver/1.0; +https://network.mobile.rakuten.co.jp/)",
    },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${sourceUrl}: HTTP ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`${sourceUrl}: image dimensions could not be determined`);
  }

  const extension = extensionFor(response, sourceUrl);
  const relativePath = `/assets/campaigns/official/${localBaseName}${extension}`;
  if (SHOULD_WRITE) {
    await writeFile(path.join(PUBLIC_DIRECTORY, relativePath), buffer);
  }

  return {
    path: relativePath,
    sourceUrl,
    width: metadata.width,
    height: metadata.height,
  };
}

function insertOfficialImage(campaign, officialImage) {
  const updated = {};

  for (const [key, value] of Object.entries(campaign)) {
    if (key === "officialImage") continue;
    updated[key] = value;
    if (key === "officialUrl") updated.officialImage = officialImage;
  }

  if (!("officialImage" in updated)) updated.officialImage = officialImage;
  return updated;
}

async function main() {
  const filenames = (await readdir(CAMPAIGN_DIRECTORY))
    .filter((filename) => filename.endsWith(".campaign.json"))
    .sort();
  const rankedCampaigns = [];

  for (const filename of filenames) {
    const filePath = path.join(CAMPAIGN_DIRECTORY, filename);
    const campaign = JSON.parse(await readFile(filePath, "utf8"));
    if (campaign.rankingEligible) rankedCampaigns.push({ filename, campaign });
  }

  const groupedByPage = new Map();
  for (const record of rankedCampaigns) {
    const records = groupedByPage.get(record.campaign.officialUrl) ?? [];
    records.push(record);
    groupedByPage.set(record.campaign.officialUrl, records);
  }

  const listingHtml = await fetchText(LISTING_URL);
  const listingImages = extractListingImages(listingHtml);
  const pageSelections = new Map();

  for (const [officialUrl] of [...groupedByPage].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const pageHtml = await fetchText(officialUrl);
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
      if (ogImage) {
        selected = { desktop: ogImage, mobile: null, source: "OG image" };
      }
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

    if (!selected) {
      throw new Error(`${officialUrl}: no campaign-specific official image found`);
    }
    pageSelections.set(officialUrl, selected);
  }

  if (SHOULD_WRITE) await mkdir(IMAGE_DIRECTORY, { recursive: true });

  const downloaded = new Map();
  const imageDataByPage = new Map();
  for (const [officialUrl, records] of [...groupedByPage].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const campaignCodes = records
      .map(({ campaign }) => campaign.campaignCode)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const canonicalCode = campaignCodes[0].toLowerCase();
    const selected = pageSelections.get(officialUrl);

    async function localize(sourceUrl, role) {
      if (!sourceUrl) return null;
      if (downloaded.has(sourceUrl)) return downloaded.get(sourceUrl);
      const image = await downloadImage(
        sourceUrl,
        `${canonicalCode}-${role}`,
      );
      downloaded.set(sourceUrl, image);
      return image;
    }

    const desktop = await localize(selected.desktop, "desktop");
    const mobile = await localize(selected.mobile, "mobile");
    imageDataByPage.set(officialUrl, {
      desktop,
      mobile,
      checkedAt: IMAGE_CHECKED_AT,
    });

    process.stdout.write(
      `${campaignCodes.join(",")}\t${selected.source}\t${desktop.sourceUrl}${
        mobile ? `\t${mobile.sourceUrl}` : ""
      }\n`,
    );
  }

  if (SHOULD_WRITE) {
    for (const { filename, campaign } of rankedCampaigns) {
      const updated = insertOfficialImage(
        campaign,
        imageDataByPage.get(campaign.officialUrl),
      );
      await writeFile(
        path.join(CAMPAIGN_DIRECTORY, filename),
        `${JSON.stringify(updated, null, 2)}\n`,
      );
    }
  }

  const responsiveCount = [...imageDataByPage.values()].filter(
    ({ mobile }) => mobile !== null,
  ).length;
  process.stdout.write(
    `\n${SHOULD_WRITE ? "Saved" : "Previewed"} ${rankedCampaigns.length} campaigns across ${groupedByPage.size} official pages (${responsiveCount} responsive image pairs, ${groupedByPage.size - responsiveCount} single images).\n`,
  );
}

await main();
