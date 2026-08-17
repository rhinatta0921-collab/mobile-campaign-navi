#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PUBLIC_DIRECTORY = path.resolve("public");
const shouldWrite = process.argv.includes("--write");

async function pngFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return pngFiles(entryPath);
      return entry.isFile() && entry.name.toLowerCase().endsWith(".png")
        ? [entryPath]
        : [];
    }),
  );
  return nested.flat().sort((left, right) => left.localeCompare(right, "en"));
}

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function comparableMetadata(metadata) {
  return {
    width: metadata.width,
    height: metadata.height,
    space: metadata.space,
    channels: metadata.channels,
    depth: metadata.depth,
    density: metadata.density,
    orientation: metadata.orientation,
    hasProfile: metadata.hasProfile,
    icc: metadata.icc ? hash(metadata.icc) : null,
  };
}

async function rawRgbaHash(buffer) {
  const pixels = await sharp(buffer).ensureAlpha().raw().toBuffer();
  return hash(pixels);
}

let savedBytes = 0;
let optimizedCount = 0;
let skippedCount = 0;

for (const filePath of await pngFiles(PUBLIC_DIRECTORY)) {
  const original = await readFile(filePath);
  const optimized = await sharp(original)
    .keepMetadata()
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  if (optimized.length >= original.length) continue;

  const [originalMetadata, optimizedMetadata, originalPixels, optimizedPixels] =
    await Promise.all([
      sharp(original).metadata(),
      sharp(optimized).metadata(),
      rawRgbaHash(original),
      rawRgbaHash(optimized),
    ]);
  if (
    JSON.stringify(comparableMetadata(originalMetadata)) !==
      JSON.stringify(comparableMetadata(optimizedMetadata)) ||
    originalPixels !== optimizedPixels
  ) {
    skippedCount += 1;
    continue;
  }

  optimizedCount += 1;
  savedBytes += original.length - optimized.length;
  if (!shouldWrite) continue;
  const temporaryPath = `${filePath}.optimized`;
  try {
    await writeFile(temporaryPath, optimized);
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

console.log(
  `${shouldWrite ? "最適化" : "確認"}: ${optimizedCount}ファイル、${savedBytes.toLocaleString("ja-JP")}バイト削減（メタデータ不一致で${skippedCount}ファイル見送り）`,
);
