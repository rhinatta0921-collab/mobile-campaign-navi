import "server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ApplicationType = "mnp" | "newNumber";
export type CampaignCodeType = "campaign" | "initiative" | "generated";
export type CampaignAudience = "applicant" | "member" | "both";
export type CampaignPublicationStatus =
  | "published"
  | "excluded"
  | "pending"
  | "ended";
export type CampaignListingPresence = "listed" | "supplemental" | "missing";
export type CampaignCategory =
  | "simOnly"
  | "device"
  | "service"
  | "homeInternet"
  | "memberBenefit"
  | "option"
  | "other";

export type CampaignBenefit = {
  type: string;
  amount: number | null;
  unit: string | null;
  description: string;
};

export type CampaignEditorial = {
  headline: string;
  paragraphs: string[];
  goodPoints: string[];
  concerns: string[];
};

export type CampaignSourceCard = {
  listingIndex: number | null;
  title: string;
  description: string;
  url: string;
};

export type CampaignEligibility = {
  firstApplication: boolean;
  repeatApplication: boolean;
  mnp: boolean;
  newNumber: boolean;
};

export type CampaignProvenance = {
  contentHash: string;
  listingHash: string;
  provider?: string | null;
  model: string | null;
  promptVersion: string | null;
};

export type Campaign = {
  campaignCode: string;
  codeType: CampaignCodeType;
  title: string;
  editorial?: CampaignEditorial;
  summary: string;
  benefit: CampaignBenefit;
  points: Record<ApplicationType, number | null>;
  breakdown: Record<ApplicationType, string[] | null>;
  target: string;
  conditions: string[];
  channel: string;
  category: CampaignCategory;
  audience: CampaignAudience;
  period: string;
  officialUrl: string;
  applicationUrl?: string;
  listingUrl: string;
  checkedAt: string;
  notes: string[];
  requiresDevicePurchase: boolean;
  rankingEligible: boolean;
  sourceCards: CampaignSourceCard[];
  publicationStatus: CampaignPublicationStatus;
  listingPresence: CampaignListingPresence;
  eligibility: CampaignEligibility;
  firstSeenAt: string;
  lastChangedAt: string;
  provenance: CampaignProvenance;
};

export type CampaignCatalog = {
  listingUrl: string;
  checkedAt: string;
  lastSuccessfulCheckAt: string;
  lastContentChangeAt: string;
  catalogVersion: string;
  listingCardCount: number;
  campaignCount: number;
  statusCounts: Record<CampaignPublicationStatus, number>;
  missingFromListing: Record<string, number>;
  items: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function assertUrl(value: unknown, label: string) {
  if (typeof value !== "string") throw new Error(`${label} はURL文字列ではありません。`);
  try {
    new URL(value);
  } catch {
    throw new Error(`${label} は有効なURLではありません。`);
  }
}

function assertCampaign(value: unknown, filename: string): asserts value is Campaign {
  if (!isRecord(value)) throw new Error(`${filename}: JSONオブジェクトではありません。`);

  for (const key of [
    "campaignCode",
    "title",
    "summary",
    "target",
    "channel",
    "period",
    "checkedAt",
  ]) {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      throw new Error(`${filename}: ${key} がありません。`);
    }
  }

  assertUrl(value.officialUrl, `${filename}: officialUrl`);
  assertUrl(value.listingUrl, `${filename}: listingUrl`);
  if (value.applicationUrl !== undefined) {
    assertUrl(value.applicationUrl, `${filename}: applicationUrl`);
  }

  if (!isRecord(value.points)) throw new Error(`${filename}: points が不正です。`);
  for (const type of ["mnp", "newNumber"] as const) {
    const points = value.points[type];
    if (points !== null && (!Number.isFinite(points) || typeof points !== "number")) {
      throw new Error(`${filename}: points.${type} が不正です。`);
    }
  }

  if (!isStringArray(value.conditions) || !isStringArray(value.notes)) {
    throw new Error(`${filename}: conditions または notes が不正です。`);
  }
  if (
    typeof value.requiresDevicePurchase !== "boolean" ||
    typeof value.rankingEligible !== "boolean"
  ) {
    throw new Error(`${filename}: 表示対象フラグが不正です。`);
  }
  if (!Array.isArray(value.sourceCards)) {
    throw new Error(`${filename}: sourceCards が不正です。`);
  }
  if (
    !["published", "excluded", "pending", "ended"].includes(
      String(value.publicationStatus),
    )
  ) {
    throw new Error(`${filename}: publicationStatus が不正です。`);
  }
  if (
    !["listed", "supplemental", "missing"].includes(
      String(value.listingPresence),
    )
  ) {
    throw new Error(`${filename}: listingPresence が不正です。`);
  }
  if (!isRecord(value.eligibility)) {
    throw new Error(`${filename}: eligibility が不正です。`);
  }
  for (const key of [
    "firstApplication",
    "repeatApplication",
    "mnp",
    "newNumber",
  ]) {
    if (typeof value.eligibility[key] !== "boolean") {
      throw new Error(`${filename}: eligibility.${key} が不正です。`);
    }
  }
  if (!isRecord(value.provenance)) {
    throw new Error(`${filename}: provenance が不正です。`);
  }
  for (const key of ["firstSeenAt", "lastChangedAt"]) {
    if (
      typeof value[key] !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value[key])
    ) {
      throw new Error(`${filename}: ${key} が不正です。`);
    }
  }
  for (const key of ["contentHash", "listingHash"]) {
    if (
      typeof value.provenance[key] !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.provenance[key])
    ) {
      throw new Error(`${filename}: provenance.${key} が不正です。`);
    }
  }
  for (const key of ["provider", "model", "promptVersion"]) {
    if (
      value.provenance[key] !== undefined &&
      value.provenance[key] !== null &&
      typeof value.provenance[key] !== "string"
    ) {
      throw new Error(`${filename}: provenance.${key} が不正です。`);
    }
  }
  if (value.publicationStatus === "published" && !isRecord(value.editorial)) {
    throw new Error(`${filename}: publishedにeditorialがありません。`);
  }
}

function loadCampaignCatalog(): CampaignCatalog {
  const generatedDirectory = resolve(
    process.cwd(),
    "data",
    "campaigns",
    "generated",
  );
  const indexPath = resolve(generatedDirectory, "index.json");
  const index: unknown = JSON.parse(readFileSync(indexPath, "utf8"));

  if (!isRecord(index) || !Array.isArray(index.items)) {
    throw new Error("キャンペーンインデックスのitemsが不正です。");
  }

  for (const key of [
    "checkedAt",
    "lastSuccessfulCheckAt",
    "lastContentChangeAt",
    "catalogVersion",
  ]) {
    if (
      typeof index[key] !== "string" ||
      index[key].length === 0 ||
      (key !== "catalogVersion" && !/^\d{4}-\d{2}-\d{2}$/.test(index[key]))
    ) {
      throw new Error(`キャンペーンインデックスの${key}が不正です。`);
    }
  }
  if (!/^[a-f0-9]{16}$/.test(String(index.catalogVersion))) {
    throw new Error("キャンペーンインデックスのcatalogVersionが不正です。");
  }
  for (const key of ["listingCardCount", "campaignCount"]) {
    if (!Number.isInteger(index[key]) || Number(index[key]) < 0) {
      throw new Error(`キャンペーンインデックスの${key}が不正です。`);
    }
  }
  if (index.campaignCount !== index.items.length) {
    throw new Error("キャンペーンインデックスの件数が不正です。");
  }
  if (!isRecord(index.statusCounts)) {
    throw new Error("キャンペーンインデックスのstatusCountsが不正です。");
  }
  const statusCounts = index.statusCounts;
  const statusTotal = ["published", "excluded", "pending", "ended"].reduce(
    (total, status) => {
      const count = statusCounts[status];
      if (!Number.isInteger(count) || Number(count) < 0) {
        throw new Error(`statusCounts.${status}が不正です。`);
      }
      return total + Number(count);
    },
    0,
  );
  if (statusTotal !== index.campaignCount) {
    throw new Error("キャンペーンインデックスのstatusCounts合計が不正です。");
  }
  if (!isRecord(index.missingFromListing)) {
    throw new Error("キャンペーンインデックスのmissingFromListingが不正です。");
  }
  return index as CampaignCatalog;
}

export const campaignCatalog = loadCampaignCatalog();

function loadCampaigns(): readonly Campaign[] {
  const generatedDirectory = resolve(
    process.cwd(),
    "data",
    "campaigns",
    "generated",
  );

  const filenames = campaignCatalog.items.map((filename) => {
    if (
      typeof filename !== "string" ||
      !filename.endsWith(".campaign.json") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      throw new Error(`キャンペーンファイル名が不正です: ${String(filename)}`);
    }
    return filename;
  });

  return filenames
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((filename) => {
      const campaign: unknown = JSON.parse(
        readFileSync(resolve(generatedDirectory, filename), "utf8"),
      );
      assertCampaign(campaign, filename);
      return campaign;
    });
}

export const campaigns = loadCampaigns();

export function getCampaignApplicationUrl(campaign: Campaign) {
  return campaign.applicationUrl ?? campaign.officialUrl;
}

export function getRankingPoints(
  campaign: Campaign,
  applicationType: ApplicationType,
) {
  return campaign.points[applicationType] ?? 0;
}

export function getCampaignApplicationTypes(
  campaign: Campaign,
): readonly ApplicationType[] {
  const pointBasedTypes = (["mnp", "newNumber"] as const).filter(
    (applicationType) => typeof campaign.points[applicationType] === "number",
  );
  if (pointBasedTypes.length > 0) return pointBasedTypes;
  if (campaign.conditions.includes("MNP")) return ["mnp"];
  if (
    campaign.conditions.some(
      (condition) =>
        condition === "新規契約" || condition.includes("新規申し込み"),
    )
  ) {
    return ["newNumber"];
  }
  return ["mnp", "newNumber"];
}

function audienceBreadth(audience: CampaignAudience) {
  if (audience === "both") return 3;
  return audience === "applicant" ? 2 : 1;
}

export function rankCampaigns(
  items: readonly Campaign[],
  applicationType: ApplicationType,
) {
  return items
    .map((campaign, originalIndex) => ({
      campaign,
      originalIndex,
      points: getRankingPoints(campaign, applicationType),
    }))
    .filter(
      ({ campaign }) =>
        campaign.publicationStatus === "published" &&
        campaign.rankingEligible &&
        getCampaignApplicationTypes(campaign).includes(applicationType),
    )
    .sort(
      (left, right) =>
        right.points - left.points ||
        left.campaign.conditions.length - right.campaign.conditions.length ||
        Number(!right.campaign.channel.includes("楽天モバイルショップ")) -
          Number(!left.campaign.channel.includes("楽天モバイルショップ")) ||
        audienceBreadth(right.campaign.audience) -
          audienceBreadth(left.campaign.audience) ||
        left.campaign.campaignCode.localeCompare(
          right.campaign.campaignCode,
          "en",
        ) ||
        left.originalIndex - right.originalIndex,
    )
    .map(({ campaign }) => campaign);
}

export const rankingCampaigns = campaigns.filter(
  (campaign) =>
    campaign.publicationStatus === "published" &&
    campaign.rankingEligible &&
    !campaign.requiresDevicePurchase,
);

export const rankedCampaignsByApplication: Readonly<
  Record<ApplicationType, readonly Campaign[]>
> = {
  mnp: rankCampaigns(rankingCampaigns, "mnp"),
  newNumber: rankCampaigns(rankingCampaigns, "newNumber"),
};

export function getRankedCampaigns(applicationType: ApplicationType) {
  return rankedCampaignsByApplication[applicationType];
}

export type ConclusionSegment = {
  key: "firstMnp" | "firstNewNumber" | "repeat";
  label: string;
  applicationType: ApplicationType;
  campaign: Campaign;
  points: number;
};

function topForEligibility(
  applicationType: ApplicationType,
  eligibility: keyof Pick<
    CampaignEligibility,
    "firstApplication" | "repeatApplication"
  >,
) {
  return rankCampaigns(
    rankingCampaigns.filter((campaign) => campaign.eligibility[eligibility]),
    applicationType,
  )[0];
}

function segment(
  key: ConclusionSegment["key"],
  label: string,
  applicationType: ApplicationType,
  campaign: Campaign | undefined,
): ConclusionSegment | null {
  if (!campaign) return null;
  return {
    key,
    label,
    applicationType,
    campaign,
    points: getRankingPoints(campaign, applicationType),
  };
}

const repeatCandidates = (["mnp", "newNumber"] as const)
  .map((applicationType) => ({
    applicationType,
    campaign: topForEligibility(applicationType, "repeatApplication"),
  }))
  .filter(
    (candidate): candidate is {
      applicationType: ApplicationType;
      campaign: Campaign;
    } => Boolean(candidate.campaign),
  )
  .sort(
    (left, right) =>
      getRankingPoints(right.campaign, right.applicationType) -
        getRankingPoints(left.campaign, left.applicationType) ||
      left.campaign.campaignCode.localeCompare(
        right.campaign.campaignCode,
        "en",
      ),
  );

export const conclusionSegments = [
  segment(
    "firstMnp",
    "初回申込・MNP",
    "mnp",
    topForEligibility("mnp", "firstApplication"),
  ),
  segment(
    "firstNewNumber",
    "初回申込・新規番号",
    "newNumber",
    topForEligibility("newNumber", "firstApplication"),
  ),
  segment(
    "repeat",
    "追加回線・再契約",
    repeatCandidates[0]?.applicationType ?? "mnp",
    repeatCandidates[0]?.campaign,
  ),
].filter((item): item is ConclusionSegment => item !== null);

export function getConclusionTitle(segments = conclusionSegments) {
  const firstMnp = segments.find(({ key }) => key === "firstMnp");
  const firstNew = segments.find(({ key }) => key === "firstNewNumber");
  const repeat = segments.find(({ key }) => key === "repeat");
  const firstText =
    firstMnp && firstNew &&
    firstMnp.campaign.campaignCode === firstNew.campaign.campaignCode
      ? `初回申込は「${firstMnp.campaign.title}」が最上位`
      : `MNPは「${firstMnp?.campaign.title ?? "対象なし"}」、新規番号は「${firstNew?.campaign.title ?? "対象なし"}」が最上位`;
  return repeat
    ? `【結論】${firstText}。追加回線・再契約は「${repeat.campaign.title}」を確認`
    : `【結論】${firstText}`;
}

export function getExclusionSummaries(items = campaigns) {
  const excluded = items.filter(
    (campaign) => campaign.publicationStatus !== "published",
  );
  const deviceCount = excluded.filter(
    (campaign) => campaign.requiresDevicePurchase,
  ).length;
  const indirectCount = excluded.filter(
    (campaign) =>
      !campaign.requiresDevicePurchase &&
      ["memberBenefit", "option", "homeInternet", "other"].includes(
        campaign.category,
      ),
  ).length;
  const pendingCount = excluded.filter(
    (campaign) => campaign.publicationStatus === "pending",
  ).length;
  return [
    deviceCount > 0
      ? `端末・ルーターなどの購入が必須の特典 ${deviceCount}件`
      : null,
    indirectCount > 0
      ? `回線申込の直接特典ではない契約者向け・オプション等 ${indirectCount}件`
      : null,
    pendingCount > 0
      ? `公式情報の根拠確認中のため掲載を保留しているもの ${pendingCount}件`
      : null,
  ].filter((value): value is string => value !== null);
}
