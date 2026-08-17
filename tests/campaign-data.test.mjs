import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";

const campaignDirectory = new URL(
  "../data/campaigns/generated/",
  import.meta.url,
);
const dataDirectory = new URL("../data/campaigns/", import.meta.url);

async function readCampaign(filename) {
  return JSON.parse(await readFile(new URL(filename, campaignDirectory), "utf8"));
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

test("stores validated generated campaigns separately from curated fields", async () => {
  const filenames = (await readdir(campaignDirectory))
    .filter((filename) => filename.endsWith(".campaign.json"))
    .sort();
  const [index, overrides] = await Promise.all([
    readCampaign("index.json"),
    readFile(new URL("curated-overrides.json", dataDirectory), "utf8").then(
      JSON.parse,
    ),
  ]);

  assert.equal(index.listingUrl, "https://network.mobile.rakuten.co.jp/campaign/");
  assert.equal(index.listingCardCount, 52);
  assert.equal(index.campaignCount, 55);
  assert.deepEqual(filenames, [...index.items].sort());
  assert.equal(Object.keys(overrides).length, 55);

  const campaignCodes = new Set();
  const coveredListingIndexes = new Set();
  let generatedCodeCount = 0;
  let rankingCampaignCount = 0;

  for (const filename of filenames) {
    const campaign = await readCampaign(filename);
    assert.equal("officialImage" in campaign, false, `${filename}: image manifest`);
    assert.match(campaign.campaignCode, /^(?:\d{4}|NO-CODE-[A-Z0-9-]+)$/);
    assert.equal(campaignCodes.has(campaign.campaignCode), false);
    campaignCodes.add(campaign.campaignCode);
    if (campaign.campaignCode.startsWith("NO-CODE-")) generatedCodeCount += 1;

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
      assert.equal(typeof campaign[field], "string", `${filename}: ${field}`);
      assert.ok(campaign[field].length > 0, `${filename}: ${field}`);
    }
    assert.doesNotThrow(() => new URL(campaign.officialUrl));
    if (campaign.applicationUrl) {
      assert.doesNotThrow(() => new URL(campaign.applicationUrl));
    }
    assert.ok(Array.isArray(campaign.conditions));
    assert.ok(Array.isArray(campaign.notes));
    assert.ok(Array.isArray(campaign.sourceCards));
    assert.equal(typeof campaign.requiresDevicePurchase, "boolean");
    assert.equal(typeof campaign.rankingEligible, "boolean");

    for (const type of ["mnp", "newNumber"]) {
      const points = campaign.points[type];
      assert.ok(points === null || Number.isFinite(points));
      assert.equal(
        points === null,
        campaign.breakdown[type] === null,
        `${filename}: ${type} breakdown`,
      );
    }

    if (campaign.rankingEligible) {
      rankingCampaignCount += 1;
      assert.ok(campaign.editorial, `${filename}: editorial`);
      assert.ok(campaign.editorial.headline.length > 0);
      for (const field of ["paragraphs", "goodPoints", "concerns"]) {
        assert.ok(campaign.editorial[field].length > 0, `${filename}: ${field}`);
      }
    }

    const curated = overrides[campaign.campaignCode];
    assert.ok(curated, `${filename}: curated override`);
    for (const field of [
      "title",
      "editorial",
      "summary",
      "benefit",
      "points",
      "breakdown",
      "target",
      "conditions",
      "channel",
      "category",
      "audience",
      "period",
      "notes",
      "requiresDevicePurchase",
      "rankingEligible",
    ]) {
      assert.deepEqual(campaign[field], curated[field], `${filename}: ${field}`);
    }
    if (curated.applicationUrl) {
      assert.equal(campaign.applicationUrl, curated.applicationUrl);
    }

    for (const sourceCard of campaign.sourceCards) {
      if (sourceCard.listingIndex === null) {
        assert.equal(campaign.campaignCode, "2162");
      } else {
        coveredListingIndexes.add(sourceCard.listingIndex);
      }
    }
  }

  assert.equal(campaignCodes.size, 55);
  assert.equal(generatedCodeCount, 12);
  assert.equal(rankingCampaignCount, 34);
  assert.deepEqual(
    [...coveredListingIndexes].sort((left, right) => left - right),
    Array.from({ length: 52 }, (_, indexNumber) => indexNumber + 1),
  );
});

test("keeps current ranking corrections and dedicated application URL", async () => {
  const [referral, employee, ichiba] = await Promise.all([
    readCampaign("1784-campaign-referral.campaign.json"),
    readCampaign("2162-campaign-referral-application-employee.campaign.json"),
    readCampaign("3327-campaign-ichiba-debut.campaign.json"),
  ]);
  assert.deepEqual(referral.points, { newNumber: 10_000, mnp: 13_000 });
  assert.match(referral.notes.join(" "), /紹介者の7,000ポイントは除外/);
  assert.deepEqual(employee.points, { newNumber: 11_000, mnp: 14_000 });
  assert.equal(employee.applicationUrl, "https://r10.to/hkD5ah");
  assert.deepEqual(ichiba.points, { newNumber: 12_000, mnp: 20_000 });
});

test("publishes exactly the images required by both ranking variants", async () => {
  const filenames = (await readdir(campaignDirectory)).filter((filename) =>
    filename.endsWith(".campaign.json"),
  );
  const campaigns = await Promise.all(filenames.map(readCampaign));
  const displayedCodes = new Set(
    campaigns
      .filter(
        (campaign) =>
          campaign.rankingEligible &&
          !campaign.requiresDevicePurchase &&
          applicationTypes(campaign).length > 0,
      )
      .map(({ campaignCode }) => campaignCode),
  );
  const manifest = JSON.parse(
    await readFile(new URL("images.json", dataDirectory), "utf8"),
  );
  assert.deepEqual(new Set(Object.keys(manifest.campaigns)), displayedCodes);
  assert.equal(displayedCodes.size, 23);

  const requiredFiles = new Set();
  for (const [campaignCode, image] of Object.entries(manifest.campaigns)) {
    assert.ok(image.detail, `${campaignCode}: detail`);
    assert.equal(Boolean(image.responsive), campaignCode === "3327");
    for (const variant of [
      image.detail,
      image.responsive?.desktop,
      image.responsive?.mobile,
    ].filter(Boolean)) {
      assert.match(
        variant.path,
        /^\/assets\/campaigns\/official\/[a-z0-9-]+\.(?:png|jpg)$/,
      );
      const localPath = fileURLToPath(
        new URL(`../public${variant.path}`, import.meta.url),
      );
      const [fileStats, metadata] = await Promise.all([
        stat(localPath),
        sharp(localPath).metadata(),
      ]);
      assert.ok(fileStats.isFile());
      assert.equal(metadata.width, variant.width);
      assert.equal(metadata.height, variant.height);
      requiredFiles.add(pathBasename(variant.path));
    }
  }

  const officialDirectory = new URL(
    "../public/assets/campaigns/official/",
    import.meta.url,
  );
  const publishedFiles = new Set(await readdir(officialDirectory));
  assert.deepEqual(publishedFiles, requiredFiles);
  assert.equal(requiredFiles.size, 21);
  await access(new URL("../public/og-v2.png", import.meta.url));
});

function pathBasename(value) {
  return value.slice(value.lastIndexOf("/") + 1);
}
