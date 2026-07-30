import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const campaignDirectory = new URL("../data/campaigns/", import.meta.url);

test("stores one valid campaign per JSON file", async () => {
  const filenames = (await readdir(campaignDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort();

  assert.equal(filenames.length, 12);

  const campaignCodes = new Set();
  let devicePurchaseRequiredCount = 0;

  for (const filename of filenames) {
    const filenameMatch = filename.match(/^(\d{4})-[a-z0-9-]+\.json$/);
    assert.ok(filenameMatch, `invalid campaign filename: ${filename}`);

    const raw = await readFile(new URL(filename, campaignDirectory), "utf8");
    const campaign = JSON.parse(raw);

    assert.equal(Array.isArray(campaign), false);
    assert.equal("id" in campaign, false);
    assert.match(campaign.campaignCode, /^\d{4}$/);
    assert.equal(campaign.campaignCode, filenameMatch[1]);
    assert.equal(campaignCodes.has(campaign.campaignCode), false);
    campaignCodes.add(campaign.campaignCode);

    for (const field of [
      "title",
      "summary",
      "target",
      "channel",
      "period",
      "officialUrl",
      "checkedAt",
    ]) {
      assert.equal(
        typeof campaign[field],
        "string",
        `${filename}: ${field}`,
      );
      assert.notEqual(campaign[field].length, 0, `${filename}: ${field}`);
    }

    for (const field of ["conditions", "notes"]) {
      assert.equal(
        Array.isArray(campaign[field]),
        true,
        `${filename}: ${field}`,
      );
      assert.notEqual(campaign[field].length, 0, `${filename}: ${field}`);
    }

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
      typeof campaign.requiresDevicePurchase,
      "boolean",
      `${filename}: requiresDevicePurchase`,
    );
    if (campaign.requiresDevicePurchase) {
      devicePurchaseRequiredCount += 1;
    }
  }

  assert.equal(campaignCodes.size, 12);
  assert.equal(devicePurchaseRequiredCount, 3);
});
