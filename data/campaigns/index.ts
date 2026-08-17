/// <reference types="vite/client" />

export type ApplicationType = "mnp" | "newNumber";
export type CampaignCodeType = "campaign" | "initiative" | "generated";
export type CampaignAudience = "applicant" | "member" | "both";
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
};

const campaignModules = import.meta.glob<unknown>(
  "./generated/*.campaign.json",
  {
    eager: true,
    import: "default",
  },
);

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
}

export const campaigns: readonly Campaign[] = Object.entries(campaignModules)
  .sort(([left], [right]) => left.localeCompare(right, "en"))
  .map(([filename, campaign]) => {
    assertCampaign(campaign, filename);
    return campaign;
  });

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
    campaign.rankingEligible && !campaign.requiresDevicePurchase,
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
