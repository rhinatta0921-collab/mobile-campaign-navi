#!/usr/bin/env node

import { access, readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dataDirectory = path.resolve("data/campaigns");
const generatedDirectory = path.join(dataDirectory, "generated");
const publicDirectory = path.resolve("public");
const officialDirectory = path.join(publicDirectory, "assets/campaigns/official");
const shouldPrune = process.argv.includes("--write");

const [manifest, policy, campaignFilenames] = await Promise.all([
  readFile(path.join(dataDirectory, "images.json"), "utf8").then(JSON.parse),
  readFile(path.join(dataDirectory, "presentation-policy.json"), "utf8").then(
    JSON.parse,
  ),
  readdir(generatedDirectory),
]);

if (manifest.presentationPolicyVersion !== policy.id) {
  throw new Error(
    `画像マニフェストの表示ポリシー ${manifest.presentationPolicyVersion ?? "未設定"} は ${policy.id} と一致しません。`,
  );
}
if (
  policy.mobileBreakpointPx !== 860 ||
  policy.ranking.desktopSizePx !== 96 ||
  policy.ranking.mobileSizePx !== 84 ||
  policy.ranking.aspectRatio !== "1 / 1" ||
  policy.ranking.objectFit !== "contain" ||
  policy.editorial.desktop.width !== "100%" ||
  policy.editorial.desktop.minimumNaturalAspectRatio !== 1.5 ||
  policy.editorial.desktop.fallbackAspectRatio !== "16 / 9" ||
  policy.editorial.desktop.objectFit !== "contain" ||
  policy.editorial.mobile.width !== "100%" ||
  policy.editorial.mobile.preserveNaturalAspectRatio !== true ||
  policy.editorial.mobile.objectFit !== "contain"
) {
  throw new Error("campaign-image-v1の表示ポリシー値が承認済み仕様と一致しません。");
}

const campaigns = await Promise.all(
  campaignFilenames
    .filter((filename) => filename.endsWith(".campaign.json"))
    .map((filename) =>
      readFile(path.join(generatedDirectory, filename), "utf8").then(JSON.parse),
    ),
);
const displayedCodes = new Set(
  campaigns
    .filter(
      (campaign) =>
        campaign.publicationStatus === "published" &&
        campaign.rankingEligible &&
        !campaign.requiresDevicePurchase,
    )
    .map(({ campaignCode }) => campaignCode),
);
const manifestCodes = new Set(Object.keys(manifest.campaigns ?? {}));

for (const campaignCode of displayedCodes) {
  if (!manifestCodes.has(campaignCode)) {
    throw new Error(`${campaignCode}: 表示対象キャンペーンの画像がありません。`);
  }
}
for (const campaignCode of manifestCodes) {
  if (!displayedCodes.has(campaignCode)) {
    throw new Error(`${campaignCode}: 非表示キャンペーンの画像が残っています。`);
  }
}

const requiredPaths = new Set();
for (const [campaignCode, image] of Object.entries(manifest.campaigns ?? {})) {
  const variants = [
    ["ranking", image.ranking],
    ["editorial.desktop", image.editorial?.desktop],
    ["editorial.mobile", image.editorial?.mobile],
  ];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(image.checkedAt ?? "")) {
    throw new Error(`${campaignCode}: checkedAtが不正です。`);
  }
  for (const [role, variant] of variants) {
    if (!variant) throw new Error(`${campaignCode}: ${role}画像がありません。`);
    if (
      typeof variant.width !== "number" ||
      variant.width <= 0 ||
      typeof variant.height !== "number" ||
      variant.height <= 0
    ) {
      throw new Error(`${campaignCode}: ${role}画像の寸法が不正です。`);
    }
    if (!variant.path.startsWith("/assets/campaigns/official/")) {
      throw new Error(`${variant.path}: 公式画像ディレクトリ外を参照しています。`);
    }
    const sourceUrl = new URL(variant.sourceUrl);
    if (sourceUrl.hostname !== "network.mobile.rakuten.co.jp") {
      throw new Error(`${campaignCode}: ${role}の取得元が楽天モバイル公式ではありません。`);
    }
    requiredPaths.add(variant.path);
    const localPath = path.join(publicDirectory, variant.path);
    await access(localPath);
    const metadata = await sharp(localPath).metadata();
    if (metadata.width !== variant.width || metadata.height !== variant.height) {
      throw new Error(
        `${campaignCode}: ${role}の実寸 ${metadata.width}x${metadata.height} がマニフェスト ${variant.width}x${variant.height} と一致しません。`,
      );
    }
  }

  const desktop = image.editorial.desktop;
  const isHorizontal =
    desktop.width / desktop.height >=
    policy.editorial.desktop.minimumNaturalAspectRatio;
  const expectedPresentation = isHorizontal ? "natural" : "contain-16x9";
  if (desktop.presentation !== expectedPresentation) {
    throw new Error(
      `${campaignCode}: PC編集画像は${expectedPresentation}で表示する必要があります。`,
    );
  }
}

const files = await readdir(officialDirectory);
const requiredNames = new Set(
  [...requiredPaths].map((imagePath) => path.basename(imagePath)),
);
const orphans = files.filter((filename) => !requiredNames.has(filename)).sort();

if (shouldPrune) {
  await Promise.all(
    orphans.map((filename) => unlink(path.join(officialDirectory, filename))),
  );
} else if (orphans.length > 0) {
  throw new Error(`未使用の公式画像があります: ${orphans.join(", ")}`);
}

const fallbackCount = Object.values(manifest.campaigns).filter(
  (image) => image.editorial.desktop.presentation === "contain-16x9",
).length;
console.log(
  `${requiredNames.size}個の必要画像を確認し、横長${manifestCodes.size - fallbackCount}件・16:9代替${fallbackCount}件、孤立画像${orphans.length}件${shouldPrune ? "を削除しました" : "です"}。`,
);
