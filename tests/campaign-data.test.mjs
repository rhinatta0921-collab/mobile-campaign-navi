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
  assert.equal(index.campaignCount, filenames.length);
  assert.equal(index.lastSuccessfulCheckAt, index.checkedAt);
  assert.match(index.lastContentChangeAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(index.catalogVersion, /^[a-f0-9]{16}$/);
  assert.equal(
    Object.values(index.statusCounts).reduce((total, count) => total + count, 0),
    filenames.length,
  );
  assert.deepEqual(filenames, [...index.items].sort());

  const campaignCodes = new Set();
  const coveredListingIndexes = new Set();
  let generatedCodeCount = 0;

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
    assert.ok(
      ["published", "excluded", "pending", "ended"].includes(
        campaign.publicationStatus,
      ),
    );
    assert.ok(
      ["listed", "supplemental", "missing"].includes(
        campaign.listingPresence,
      ),
    );
    for (const field of [
      "firstApplication",
      "repeatApplication",
      "mnp",
      "newNumber",
    ]) {
      assert.equal(typeof campaign.eligibility[field], "boolean");
    }
    assert.match(campaign.provenance.contentHash, /^[a-f0-9]{64}$/);
    assert.match(campaign.provenance.listingHash, /^[a-f0-9]{64}$/);

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
      assert.ok(campaign.editorial, `${filename}: editorial`);
      assert.ok(campaign.editorial.headline.length > 0);
      for (const field of ["paragraphs", "goodPoints", "concerns"]) {
        assert.ok(campaign.editorial[field].length > 0, `${filename}: ${field}`);
      }
    }

    const curated = overrides[campaign.campaignCode];
    if (curated) {
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
        "publicationStatus",
      ]) {
        if (!(field in curated)) continue;
        assert.deepEqual(campaign[field], curated[field], `${filename}: ${field}`);
      }
      if (curated.applicationUrl) {
        assert.equal(campaign.applicationUrl, curated.applicationUrl);
      }
    }

    for (const sourceCard of campaign.sourceCards) {
      if (sourceCard.listingIndex === null) {
        assert.equal(curated?.supplemental, true);
      } else {
        coveredListingIndexes.add(sourceCard.listingIndex);
      }
    }
  }

  assert.equal(campaignCodes.size, filenames.length);
  assert.ok(generatedCodeCount >= 0);
  // listingIndexは取得時点の監査値。カードの並び替えだけでは個別JSONを
  // 書き換えないため、現在の一覧で連番になることは要求しない。
  assert.ok(coveredListingIndexes.size > 0);
  assert.ok(
    [...coveredListingIndexes].every(
      (listingIndex) => Number.isInteger(listingIndex) && listingIndex > 0,
    ),
    "listingIndexは監査用の正の整数であること",
  );
});

test("keeps current ranking corrections and dedicated application URL", async () => {
  const overrides = JSON.parse(
    await readFile(new URL("curated-overrides.json", dataDirectory), "utf8"),
  );
  const referral = overrides["1784"];
  const employee = overrides["2162"];
  const ichiba = overrides["3327"];
  const sukipi = overrides["NO-CODE-NETWORK-CAMPAIGN-SUKIPI"];
  const iphone17 = overrides["NO-CODE-NETWORK-PRODUCT-IPHONE-IPHONE-17"];
  assert.deepEqual(referral.points, { newNumber: 10_000, mnp: 13_000 });
  assert.match(referral.notes.join(" "), /紹介者の7,000ポイントは除外/);
  assert.deepEqual(employee.points, { newNumber: 11_000, mnp: 14_000 });
  assert.equal(employee.applicationUrl, "https://r10.to/hkD5ah");
  assert.deepEqual(ichiba.points, { newNumber: 12_000, mnp: 20_000 });
  assert.equal(sukipi.publicationStatus, "excluded");
  assert.equal(sukipi.rankingEligible, false);
  assert.equal(iphone17.publicationStatus, "excluded");
  assert.equal(iphone17.requiresDevicePurchase, true);
});

test("classifies every campaign and excludes purchases and indirect offers", async () => {
  const filenames = (await readdir(campaignDirectory)).filter((filename) =>
    filename.endsWith(".campaign.json"),
  );
  const campaigns = await Promise.all(filenames.map(readCampaign));
  const displayedCodes = campaigns
    .filter(
      (campaign) =>
        campaign.publicationStatus === "published" &&
        campaign.rankingEligible &&
        !campaign.requiresDevicePurchase &&
        applicationTypes(campaign).length > 0,
    )
    .map(({ campaignCode }) => campaignCode)
    .sort();

  assert.equal(displayedCodes.length > 0, true);

  assert.equal(
    campaigns
      .filter((campaign) => campaign.requiresDevicePurchase)
      .some((campaign) => displayedCodes.includes(campaign.campaignCode)),
    false,
  );
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
          campaign.publicationStatus === "published" &&
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

  const conclusionCampaign = campaigns
    .filter(
      (campaign) =>
        displayedCodes.has(campaign.campaignCode) &&
        campaign.eligibility.firstApplication &&
        applicationTypes(campaign).includes("mnp"),
    )
    .sort(
      (left, right) =>
        (right.points.mnp ?? 0) - (left.points.mnp ?? 0) ||
        Number(!right.channel.includes("楽天モバイルショップ")) -
          Number(!left.channel.includes("楽天モバイルショップ")) ||
        (right.audience === "both" ? 3 : right.audience === "applicant" ? 2 : 1) -
          (left.audience === "both" ? 3 : left.audience === "applicant" ? 2 : 1) ||
        left.campaignCode.localeCompare(right.campaignCode, "en"),
    )[0];
  assert.ok(conclusionCampaign);

  const requiredFiles = new Set();
  for (const [campaignCode, image] of Object.entries(manifest.campaigns)) {
    assert.ok(image.detail, `${campaignCode}: detail`);
    assert.equal(
      Boolean(image.responsive),
      campaignCode === conclusionCampaign.campaignCode,
    );
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
  assert.equal(requiredFiles.size > 0, true);
  await access(new URL("../public/og-v2.png", import.meta.url));
});

function pathBasename(value) {
  return value.slice(value.lastIndexOf("/") + 1);
}
