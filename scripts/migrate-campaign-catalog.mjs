#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  catalogVersion,
  statusCounts,
  withCatalogMetadata,
} from "./lib/campaign-automation.mjs";

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
}

const dataDirectory = path.resolve(option("data-directory") ?? "data/campaigns");
const generatedDirectory = path.join(dataDirectory, "generated");
const indexPath = path.join(generatedDirectory, "index.json");
const shouldWrite = process.argv.includes("--write");

const index = JSON.parse(await readFile(indexPath, "utf8"));
const records = await Promise.all(
  index.items.map(async (filename) => ({
    filename,
    campaign: JSON.parse(
      await readFile(path.join(generatedDirectory, filename), "utf8"),
    ),
  })),
);

const migrated = records.map(({ filename, campaign }) => ({
  filename,
  campaign: campaign.publicationStatus
    ? campaign
    : withCatalogMetadata(campaign, {
        checkedAt: campaign.checkedAt,
        firstSeenAt: campaign.checkedAt,
        lastChangedAt: campaign.checkedAt,
        listingPresence: campaign.sourceCards.some(
          ({ listingIndex }) => listingIndex !== null,
        )
          ? "listed"
          : "supplemental",
      }),
}));

const campaigns = migrated.map(({ campaign }) => campaign);
const nextIndex = {
  ...index,
  lastSuccessfulCheckAt: index.lastSuccessfulCheckAt ?? index.checkedAt,
  lastContentChangeAt: index.lastContentChangeAt ?? index.checkedAt,
  catalogVersion: catalogVersion(campaigns),
  statusCounts: statusCounts(campaigns),
  missingFromListing: index.missingFromListing ?? {},
};

if (shouldWrite) {
  await Promise.all([
    ...migrated.map(({ filename, campaign }) =>
      writeFile(
        path.join(generatedDirectory, filename),
        `${JSON.stringify(campaign, null, 2)}\n`,
      ),
    ),
    writeFile(indexPath, `${JSON.stringify(nextIndex, null, 2)}\n`),
  ]);
}

console.log(
  `${shouldWrite ? "更新" : "確認"}: ${campaigns.length}件、catalogVersion=${nextIndex.catalogVersion}`,
);
