import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const campaignDirectory = new URL("../data/campaigns/", import.meta.url);

async function readJson(filename) {
  const raw = await readFile(new URL(filename, campaignDirectory), "utf8");
  return JSON.parse(raw);
}

test("stores one normalized campaign per JSON file", async () => {
  const directoryEntries = await readdir(campaignDirectory);
  const filenames = directoryEntries
    .filter((filename) => filename.endsWith(".campaign.json"))
    .sort();
  const index = await readJson("index.json");

  assert.equal(index.listingUrl, "https://network.mobile.rakuten.co.jp/campaign/");
  assert.equal(index.checkedAt, "2026-07-31");
  assert.equal(index.listingCardCount, 52);
  assert.equal(index.campaignCount, 53);
  assert.deepEqual(filenames, [...index.items].sort());

  const campaignCodes = new Set();
  const coveredListingIndexes = new Set();
  let generatedCodeCount = 0;

  for (const filename of filenames) {
    const campaign = await readJson(filename);

    assert.equal(Array.isArray(campaign), false);
    assert.equal("id" in campaign, false);
    assert.equal(
      filename.startsWith(`${campaign.campaignCode.toLowerCase()}-`),
      true,
      `${filename}: campaignCode`,
    );
    assert.equal(
      campaignCodes.has(campaign.campaignCode),
      false,
      `${filename}: duplicate campaignCode`,
    );
    campaignCodes.add(campaign.campaignCode);

    assert.match(
      campaign.campaignCode,
      /^(?:\d{4}|NO-CODE-[A-Z0-9-]+)$/,
      `${filename}: campaignCode`,
    );
    assert.equal(
      ["campaign", "initiative", "generated"].includes(
        campaign.codeType,
      ),
      true,
      `${filename}: codeType`,
    );
    if (campaign.campaignCode.startsWith("NO-CODE-")) {
      assert.equal(campaign.codeType, "generated", filename);
      generatedCodeCount += 1;
    } else if (campaign.campaignCode === "2981") {
      assert.equal(campaign.codeType, "initiative", filename);
    } else {
      assert.equal(campaign.codeType, "campaign", filename);
    }

    for (const field of [
      "title",
      "summary",
      "target",
      "channel",
      "category",
      "audience",
      "period",
      "officialUrl",
      "listingUrl",
      "checkedAt",
    ]) {
      assert.equal(
        typeof campaign[field],
        "string",
        `${filename}: ${field}`,
      );
      assert.notEqual(campaign[field].length, 0, `${filename}: ${field}`);
    }
    assert.equal(campaign.checkedAt, index.checkedAt);
    assert.equal(campaign.listingUrl, index.listingUrl);
    assert.doesNotThrow(() => new URL(campaign.officialUrl));

    for (const field of ["conditions", "notes", "sourceCards"]) {
      assert.equal(
        Array.isArray(campaign[field]),
        true,
        `${filename}: ${field}`,
      );
      assert.notEqual(campaign[field].length, 0, `${filename}: ${field}`);
    }

    assert.equal(typeof campaign.benefit, "object");
    assert.equal(typeof campaign.benefit.type, "string");
    assert.equal(typeof campaign.benefit.description, "string");
    assert.equal(
      campaign.benefit.amount === null ||
        (typeof campaign.benefit.amount === "number" &&
          Number.isFinite(campaign.benefit.amount)),
      true,
      `${filename}: benefit.amount`,
    );

    assert.equal(typeof campaign.points, "object");
    assert.equal(typeof campaign.breakdown, "object");
    for (const applicationType of ["newNumber", "mnp"]) {
      const points = campaign.points[applicationType];
      const breakdown = campaign.breakdown[applicationType];
      assert.equal(
        points === null ||
          (typeof points === "number" && Number.isFinite(points)),
        true,
        `${filename}: points.${applicationType}`,
      );
      assert.equal(
        points === null
          ? breakdown === null
          : Array.isArray(breakdown) && breakdown.length > 0,
        true,
        `${filename}: breakdown.${applicationType}`,
      );
    }
    assert.equal(
      campaign.rankingEligible,
      typeof campaign.points.newNumber === "number" ||
        typeof campaign.points.mnp === "number",
      `${filename}: rankingEligible`,
    );

    assert.equal(
      typeof campaign.requiresDevicePurchase,
      "boolean",
      `${filename}: requiresDevicePurchase`,
    );

    for (const sourceCard of campaign.sourceCards) {
      assert.equal(Number.isInteger(sourceCard.listingIndex), true);
      assert.equal(
        sourceCard.listingIndex >= 1 &&
          sourceCard.listingIndex <= index.listingCardCount,
        true,
      );
      assert.equal(typeof sourceCard.title, "string");
      assert.equal(typeof sourceCard.url, "string");
      coveredListingIndexes.add(sourceCard.listingIndex);
    }
  }

  assert.equal(campaignCodes.size, index.campaignCount);
  assert.equal(generatedCodeCount, 12);
  assert.deepEqual(
    [...coveredListingIndexes].sort((a, b) => a - b),
    Array.from(
      { length: index.listingCardCount },
      (_, indexNumber) => indexNumber + 1,
    ),
  );

  const iphoneSpecialPrice = await readJson(
    "2938-campaign-iphone-discount.campaign.json",
  );
  assert.deepEqual(
    iphoneSpecialPrice.sourceCards.map((card) => card.listingIndex),
    [3, 6, 12],
  );
});
