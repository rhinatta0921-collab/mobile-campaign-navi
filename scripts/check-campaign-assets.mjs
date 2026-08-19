#!/usr/bin/env node

import { access, readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";

const manifest = JSON.parse(
  await readFile(path.resolve("data/campaigns/images.json"), "utf8"),
);
const publicDirectory = path.resolve("public");
const officialDirectory = path.join(publicDirectory, "assets/campaigns/official");
const shouldPrune = process.argv.includes("--write");
const requiredPaths = new Set();

for (const [campaignCode, image] of Object.entries(manifest.campaigns)) {
  if (!image.detail) {
    throw new Error(`${campaignCode}: detail画像がありません。`);
  }
  requiredPaths.add(image.detail.path);
  if (image.responsive) {
    requiredPaths.add(image.responsive.desktop.path);
    if (image.responsive.mobile) requiredPaths.add(image.responsive.mobile.path);
  }
}

for (const imagePath of requiredPaths) {
  if (!imagePath.startsWith("/assets/campaigns/official/")) {
    throw new Error(`${imagePath}: 公式画像ディレクトリ外を参照しています。`);
  }
  await access(path.join(publicDirectory, imagePath));
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

console.log(
  `${requiredNames.size}個の必要画像を確認し、${shouldPrune ? orphans.length : 0}個の孤立画像を削除しました。`,
);
