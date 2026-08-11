import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";

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
  assert.equal(index.campaignCount, 54);
  assert.deepEqual(filenames, [...index.items].sort());

  const campaignCodes = new Set();
  const coveredListingIndexes = new Set();
  let generatedCodeCount = 0;
  let rankingCampaignCount = 0;
  const rankedOfficialUrls = new Set();
  const rankedDesktopPaths = new Set();
  const rankedMobilePaths = new Set();
  const rankedDetailPaths = new Set();
  const rankedImagesByOfficialUrl = new Map();
  const sourcePaths = new Map();
  const checkedImageFiles = new Map();

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
    assert.equal(
      campaign.checkedAt,
      campaign.campaignCode === "2162" ? "2026-08-11" : index.checkedAt,
    );
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
    assert.equal(typeof campaign.rankingEligible, "boolean");
    if (campaign.rankingEligible) {
      rankingCampaignCount += 1;
      rankedOfficialUrls.add(campaign.officialUrl);
      assert.equal(
        [
          "points",
          "discount",
          "free",
          "lottery",
          "other",
          "recurringPoints",
          "specialPrice",
        ].includes(campaign.benefit.type),
        true,
        `${filename}: ranking benefit type`,
      );

      assert.equal(
        typeof campaign.editorial,
        "object",
        `${filename}: editorial`,
      );
      assert.equal(
        typeof campaign.editorial.headline,
        "string",
        `${filename}: editorial.headline`,
      );
      assert.notEqual(
        campaign.editorial.headline.length,
        0,
        `${filename}: editorial.headline`,
      );
      for (const field of ["paragraphs", "goodPoints", "concerns"]) {
        assert.equal(
          Array.isArray(campaign.editorial[field]),
          true,
          `${filename}: editorial.${field}`,
        );
        assert.notEqual(
          campaign.editorial[field].length,
          0,
          `${filename}: editorial.${field}`,
        );
        assert.equal(
          campaign.editorial[field].every(
            (item) => typeof item === "string" && item.length > 0,
          ),
          true,
          `${filename}: editorial.${field} items`,
        );
      }
      assert.equal(
        campaign.editorial.paragraphs.length >= 2 &&
          campaign.editorial.paragraphs.length <= 4,
        true,
        `${filename}: editorial.paragraphs count`,
      );

      assert.equal(
        typeof campaign.officialImage,
        "object",
        `${filename}: officialImage`,
      );
      assert.equal(
        campaign.officialImage.checkedAt,
        campaign.campaignCode === "2162" ? "2026-08-11" : "2026-08-06",
        `${filename}: officialImage.checkedAt`,
      );

      for (const [role, variant] of [
        ["desktop", campaign.officialImage.desktop],
        ["mobile", campaign.officialImage.mobile],
        ["detail", campaign.officialImage.detail],
      ]) {
        if (role === "mobile" && variant === null) continue;
        assert.equal(typeof variant, "object", `${filename}: ${role}`);
        assert.match(
          variant.path,
          /^\/assets\/campaigns\/official\/[a-z0-9-]+\.(?:png|jpg|webp|gif|svg)$/,
          `${filename}: ${role}.path`,
        );
        const sourceUrl = new URL(variant.sourceUrl);
        assert.equal(sourceUrl.protocol, "https:", `${filename}: ${role}.sourceUrl`);
        assert.equal(
          sourceUrl.hostname,
          "network.mobile.rakuten.co.jp",
          `${filename}: ${role}.sourceUrl host`,
        );
        assert.equal(Number.isInteger(variant.width), true, `${filename}: ${role}.width`);
        assert.equal(Number.isInteger(variant.height), true, `${filename}: ${role}.height`);
        assert.equal(variant.width > 0, true, `${filename}: ${role}.width positive`);
        assert.equal(variant.height > 0, true, `${filename}: ${role}.height positive`);

        const priorPath = sourcePaths.get(variant.sourceUrl);
        if (priorPath) {
          assert.equal(
            variant.path,
            priorPath,
            `${filename}: identical official sources must share a local file`,
          );
        } else {
          sourcePaths.set(variant.sourceUrl, variant.path);
        }

        const localUrl = new URL(`../public${variant.path}`, import.meta.url);
        const localPath = fileURLToPath(localUrl);
        const fileStats = await stat(localPath);
        assert.equal(fileStats.isFile(), true, `${filename}: ${role} file`);
        assert.equal(fileStats.size > 0, true, `${filename}: ${role} non-empty`);

        let metadata = checkedImageFiles.get(localPath);
        if (!metadata) {
          metadata = await sharp(localPath).metadata();
          checkedImageFiles.set(localPath, metadata);
        }
        assert.equal(metadata.width, variant.width, `${filename}: ${role}.width metadata`);
        assert.equal(metadata.height, variant.height, `${filename}: ${role}.height metadata`);
      }

      rankedDesktopPaths.add(campaign.officialImage.desktop.path);
      rankedDetailPaths.add(campaign.officialImage.detail.path);
      if (campaign.officialImage.mobile) {
        rankedMobilePaths.add(campaign.officialImage.mobile.path);
      }
      if (!rankedImagesByOfficialUrl.has(campaign.officialUrl)) {
        rankedImagesByOfficialUrl.set(
          campaign.officialUrl,
          campaign.officialImage,
        );
      }
    }

    assert.equal(
      typeof campaign.requiresDevicePurchase,
      "boolean",
      `${filename}: requiresDevicePurchase`,
    );

    for (const sourceCard of campaign.sourceCards) {
      assert.equal(typeof sourceCard.title, "string");
      assert.equal(typeof sourceCard.url, "string");
      if (sourceCard.listingIndex === null) {
        assert.equal(campaign.campaignCode, "2162");
      } else {
        assert.equal(Number.isInteger(sourceCard.listingIndex), true);
        assert.equal(
          sourceCard.listingIndex >= 1 &&
            sourceCard.listingIndex <= index.listingCardCount,
          true,
        );
        coveredListingIndexes.add(sourceCard.listingIndex);
      }
    }
  }

  assert.equal(campaignCodes.size, index.campaignCount);
  assert.equal(generatedCodeCount, 12);
  assert.equal(rankingCampaignCount, 33);
  assert.equal(rankedOfficialUrls.size, 29);
  assert.equal(rankedDesktopPaths.size, 29);
  assert.equal(rankedMobilePaths.size, 23);
  assert.equal(rankedDetailPaths.size, 29);
  const uniqueOfficialImages = [...rankedImagesByOfficialUrl.values()];
  assert.equal(
    uniqueOfficialImages.filter(
      (image) =>
        image.mobile !== null &&
        image.detail.sourceUrl === image.mobile.sourceUrl,
    ).length,
    21,
  );
  assert.equal(
    uniqueOfficialImages.filter((image) =>
      new URL(image.detail.sourceUrl).pathname.startsWith(
        "/assets/img/banner/campaign/",
      ),
    ).length,
    8,
  );
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
  assert.match(
    iphoneSpecialPrice.officialImage.detail.sourceUrl,
    /\/assets\/img\/banner\/campaign\/bnr-iphone-discount-/,
  );
  assert.notEqual(
    iphoneSpecialPrice.officialImage.detail.sourceUrl,
    iphoneSpecialPrice.officialImage.mobile.sourceUrl,
  );

  const cardCampaign = await readJson(
    "1238-application-card-campaign.campaign.json",
  );
  assert.match(
    cardCampaign.officialImage.detail.sourceUrl,
    /\/assets\/img\/banner\/campaign\/bnr-card-campaign-/,
  );

  const referral = await readJson(
    "1784-campaign-referral.campaign.json",
  );
  assert.equal(referral.points.mnp, 13_000);
  assert.equal(referral.points.newNumber, 10_000);
  assert.match(referral.notes.join(" "), /紹介者の7,000ポイントは除外/);
  assert.equal(
    referral.officialImage.detail.sourceUrl,
    referral.officialImage.mobile.sourceUrl,
  );

  const employeeReferral = await readJson(
    "2162-campaign-referral-application-employee.campaign.json",
  );
  assert.equal(employeeReferral.points.mnp, 14_000);
  assert.equal(employeeReferral.points.newNumber, 11_000);
  assert.deepEqual(employeeReferral.breakdown.mnp, [
    "1回目：4,000ポイント",
    "2回目：5,000ポイント",
    "3回目：5,000ポイント",
  ]);
  assert.equal(employeeReferral.sourceCards[0].listingIndex, null);
  assert.match(employeeReferral.notes.join(" "), /Rakuten Turboの7,000ポイント/);
  assert.equal(
    employeeReferral.officialImage.desktop.path,
    "/assets/campaigns/official/2162-desktop.jpg",
  );
  assert.equal(
    employeeReferral.officialImage.detail.path,
    "/assets/campaigns/official/2162-mobile.jpg",
  );
  assert.equal(
    employeeReferral.officialImage.detail.sourceUrl,
    employeeReferral.officialImage.mobile.sourceUrl,
  );

  const freeCall = await readJson(
    "1977-service-standard-free-call.campaign.json",
  );
  assert.equal(freeCall.points.mnp, null);
  assert.equal(freeCall.rankingEligible, true);
});
