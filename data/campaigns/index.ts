/// <reference types="vite/client" />

import campaignIndex from "./index.json";

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

export type CampaignValueItem = {
  label: string;
  description: string;
  amountYen: number | null;
  monthlyAmountYen: number | null;
  includedInDevicePrice: boolean;
};

export type CampaignValuation = {
  applicationTypes: ApplicationType[];
  ranking: {
    additionalConditionCount: number;
    webEligible: boolean;
    audienceBreadth: number;
  };
  otherBenefits: CampaignValueItem[];
  requiredCosts: CampaignValueItem[];
  ongoingBenefits: CampaignValueItem[];
  unquantifiedBenefits: string[];
  calculationPeriod: string;
  devicePriceAfterCampaignYen: number | null;
  devicePriceNote: string | null;
  relatedCampaigns: {
    campaignCode: string;
    description: string;
  }[];
  evidence: {
    officialUrl: string;
    checkedAt: string;
    calculationInputs: string[];
  };
};

export type CampaignValueResult = {
  kind: "savings" | "burden";
  status: "calculated" | "unavailable";
  amountYen: number | null;
  formula: string | null;
  reason: string | null;
};

export type CampaignSourceCard = {
  listingIndex: number | null;
  title: string;
  description: string;
  url: string;
};

export type CampaignImageVariant = {
  path: string;
  sourceUrl: string;
  width: number;
  height: number;
};

export type CampaignOfficialImage = {
  desktop: CampaignImageVariant;
  mobile: CampaignImageVariant | null;
  detail: CampaignImageVariant;
  checkedAt: string;
};

type CampaignSource = {
  campaignCode: string;
  codeType: CampaignCodeType;
  title: string;
  editorial?: CampaignEditorial;
  summary: string;
  benefit: CampaignBenefit;
  points: {
    newNumber: number | null;
    mnp: number | null;
  };
  breakdown: {
    newNumber: string[] | null;
    mnp: string[] | null;
  };
  target: string;
  conditions: string[];
  channel: string;
  category: CampaignCategory;
  audience: CampaignAudience;
  period: string;
  officialUrl: string;
  applicationUrl?: string;
  officialImage?: CampaignOfficialImage;
  listingUrl: string;
  checkedAt: string;
  notes: string[];
  requiresDevicePurchase: boolean;
  rankingEligible: boolean;
  sourceCards: CampaignSourceCard[];
};

export type Campaign = CampaignSource & {
  valuation: CampaignValuation;
};

const campaignModules = import.meta.glob<CampaignSource>("./*.campaign.json", {
  eager: true,
  import: "default",
});

type ValuationOverride = {
  otherBenefitAmountYen?: number;
  requiredCosts?: Omit<CampaignValueItem, "includedInDevicePrice">[];
  devicePriceAfterCampaignYen?: number;
  devicePriceNote?: string;
  calculationPeriod?: string;
  relatedCampaigns?: CampaignValuation["relatedCampaigns"];
};

const valuationOverrides: Record<string, ValuationOverride> = {
  "1784": {
    calculationPeriod: "条件達成後、申込者ポイントを3カ月に分けて全額受け取るまで",
  },
  "2162": {
    calculationPeriod: "紹介ログイン月の4カ月後から3カ月間",
  },
  "1977": {
    otherBenefitAmountYen: 1_100,
    calculationPeriod: "初回1カ月",
  },
  "2602": {
    requiredCosts: [
      {
        label: "電話番号シェアサービス利用料",
        description:
          "月額550円。ポイント全額獲得までに必要な利用月数は公式ルールで確認が必要です。",
        amountYen: null,
        monthlyAmountYen: 550,
      },
    ],
    devicePriceNote: "対象Apple Watchによりキャンペーン適用後価格が異なります。",
  },
  "2619": {
    requiredCosts: [
      {
        label: "楽天市場での最低購入額",
        description: "特典獲得には1注文1,000円以上の買い物が必要です。",
        amountYen: 1_000,
        monthlyAmountYen: null,
      },
    ],
  },
  "2697": {
    requiredCosts: [
      {
        label: "楽天ひかり利用料",
        description:
          "契約内容で料金が変わるため、固定総額には換算していません。",
        amountYen: null,
        monthlyAmountYen: null,
      },
    ],
    calculationPeriod: "終了日なし（条件を満たした月ごとに判定）",
  },
  "2698": {
    requiredCosts: [
      {
        label: "Rakuten Turbo利用料",
        description:
          "契約内容で料金が変わるため、固定総額には換算していません。",
        amountYen: null,
        monthlyAmountYen: null,
      },
    ],
    calculationPeriod: "終了日なし（条件を満たした月ごとに判定）",
  },
  "2833": {
    otherBenefitAmountYen: 1_650,
    calculationPeriod: "初回3カ月",
  },
  "2834": {
    otherBenefitAmountYen: 220,
    calculationPeriod: "初回1カ月",
  },
  "2835": {
    otherBenefitAmountYen: 330,
    calculationPeriod: "初回1カ月",
  },
  "2956": {
    calculationPeriod: "初回3カ月",
  },
  "3288": {
    otherBenefitAmountYen: 5_598,
    requiredCosts: [
      {
        label: "Rakuten最強U-NEXTの追加負担",
        description:
          "通常の回線料金との差額は利用状況で変わるため、固定総額を確定できません。",
        amountYen: null,
        monthlyAmountYen: null,
      },
    ],
    calculationPeriod: "Uber One申込日から1年間",
    relatedCampaigns: [
      {
        campaignCode: "3293",
        description: "Rakuten最強U-NEXT初回利用の5,000ポイント特典",
      },
    ],
  },
  "3293": {
    requiredCosts: [
      {
        label: "Rakuten最強U-NEXTの追加負担",
        description:
          "通常の回線料金との差額は利用状況で変わるため、固定総額を確定できません。",
        amountYen: null,
        monthlyAmountYen: null,
      },
    ],
    calculationPeriod: "条件達成後、5,000ポイントを3カ月に分けて全額受け取るまで",
    relatedCampaigns: [
      {
        campaignCode: "3288",
        description: "Uber Oneを1年間無料で利用できる別コードの特典",
      },
    ],
  },
  "3329": {
    otherBenefitAmountYen: 990,
    calculationPeriod: "初回3カ月",
  },
  "3351": {
    requiredCosts: [
      {
        label: "Rakuten最強U-NEXTの追加負担",
        description:
          "通常の回線料金との差額は利用状況で変わるため、固定総額を確定できません。",
        amountYen: null,
        monthlyAmountYen: null,
      },
    ],
  },
  "1875": {
    devicePriceAfterCampaignYen: 1,
    devicePriceNote: "対象モバイルルーターのキャンペーン適用後価格です。",
  },
  "2178": {
    devicePriceNote: "対象Android製品によりキャンペーン適用後価格が異なります。",
  },
  "2568": {
    devicePriceNote: "対象iPhoneによりキャンペーン適用後価格が異なります。",
  },
  "2808": {
    devicePriceNote: "対象オリジナル製品によりキャンペーン適用後価格が異なります。",
  },
  "2938": {
    devicePriceNote:
      "月額1円からの対象製品・支払回数により総額が異なるため、端末価格を一意に確定できません。",
  },
  "3186": {
    devicePriceAfterCampaignYen: 1,
    devicePriceNote: "対象製品のキャンペーン適用後価格です。",
  },
  "3297": {
    devicePriceNote: "対象の認定中古製品により販売価格が異なります。",
  },
};

function getApplicationTypes(campaign: CampaignSource): ApplicationType[] {
  const pointBasedTypes = (["mnp", "newNumber"] as const).filter(
    (applicationType) => typeof campaign.points[applicationType] === "number",
  );

  if (pointBasedTypes.length > 0) {
    return pointBasedTypes;
  }

  if (campaign.conditions.some((condition) => condition === "MNP")) {
    return ["mnp"];
  }

  if (
    campaign.conditions.some(
      (condition) => condition === "新規契約" || condition.includes("新規申し込み"),
    )
  ) {
    return ["newNumber"];
  }

  return ["mnp", "newNumber"];
}

function getCalculationPeriod(
  campaign: CampaignSource,
  override: ValuationOverride,
) {
  if (override.calculationPeriod) {
    return override.calculationPeriod;
  }

  if (campaign.benefit.type === "free") {
    return `公式の無料期間（${campaign.benefit.amount ?? "金額未確定"}${campaign.benefit.unit ?? ""}）`;
  }

  if (campaign.benefit.type === "recurringPoints") {
    return "終了日なし（条件を満たした月ごとに判定）";
  }

  if (
    typeof campaign.points.newNumber === "number" ||
    typeof campaign.points.mnp === "number"
  ) {
    return "公式の進呈条件を満たし、固定ポイントを全額受け取るまでの最短期間";
  }

  return "公式ページに記載された特典適用期間";
}

function buildValuation(campaign: CampaignSource): CampaignValuation {
  const override = valuationOverrides[campaign.campaignCode] ?? {};
  const otherBenefits: CampaignValueItem[] = [];
  const ongoingBenefits: CampaignValueItem[] = [];
  const unquantifiedBenefits: string[] = [];

  if (campaign.benefit.type === "recurringPoints") {
    ongoingBenefits.push({
      label: "継続する月次特典",
      description: campaign.benefit.description,
      amountYen: null,
      monthlyAmountYen: campaign.benefit.amount,
      includedInDevicePrice: false,
    });
  } else if (campaign.benefit.type === "points") {
    // Fixed applicant points are stored separately in campaign.points.
  } else if (campaign.benefit.type === "discount") {
    otherBenefits.push({
      label: "端末価格の値引き",
      description: campaign.benefit.description,
      amountYen: campaign.benefit.amount,
      monthlyAmountYen: null,
      includedInDevicePrice: campaign.requiresDevicePurchase,
    });
  } else if (campaign.benefit.type === "free") {
    otherBenefits.push({
      label: "無料特典",
      description: campaign.benefit.description,
      amountYen: override.otherBenefitAmountYen ?? null,
      monthlyAmountYen: null,
      includedInDevicePrice: false,
    });
  } else if (campaign.benefit.type === "specialPrice") {
    otherBenefits.push({
      label: "キャンペーン適用価格",
      description: campaign.benefit.description,
      amountYen: null,
      monthlyAmountYen: null,
      includedInDevicePrice: true,
    });
  } else {
    unquantifiedBenefits.push(campaign.benefit.description);
  }

  const requiredCosts = (override.requiredCosts ?? []).map((cost) => ({
    ...cost,
    includedInDevicePrice: false,
  }));

  const devicePriceAfterCampaignYen =
    override.devicePriceAfterCampaignYen ?? null;
  const calculationInputs = [
    "申込者本人の固定ポイント（1ポイント＝1円）",
    ...otherBenefits.map((benefit) =>
      benefit.amountYen === null
        ? `${benefit.label}：金額保留`
        : `${benefit.label}：${benefit.amountYen.toLocaleString("ja-JP")}円`,
    ),
    ...requiredCosts.map((cost) =>
      cost.amountYen === null
        ? `${cost.label}：総額保留`
        : `${cost.label}：${cost.amountYen.toLocaleString("ja-JP")}円`,
    ),
  ];

  if (campaign.requiresDevicePurchase) {
    calculationInputs.push(
      devicePriceAfterCampaignYen === null
        ? "キャンペーン適用後の端末価格：保留"
        : `キャンペーン適用後の端末価格：${devicePriceAfterCampaignYen.toLocaleString("ja-JP")}円`,
    );
  }

  return {
    applicationTypes: getApplicationTypes(campaign),
    ranking: {
      additionalConditionCount: campaign.conditions.length,
      webEligible: !campaign.channel.includes("楽天モバイルショップ"),
      audienceBreadth:
        campaign.audience === "both"
          ? 3
          : campaign.audience === "applicant"
            ? 2
            : 1,
    },
    otherBenefits,
    requiredCosts,
    ongoingBenefits,
    unquantifiedBenefits,
    calculationPeriod: getCalculationPeriod(campaign, override),
    devicePriceAfterCampaignYen,
    devicePriceNote: override.devicePriceNote ?? null,
    relatedCampaigns: override.relatedCampaigns ?? [],
    evidence: {
      officialUrl: campaign.officialUrl,
      checkedAt: campaign.checkedAt,
      calculationInputs,
    },
  };
}

export const campaigns: Campaign[] = Object.entries(campaignModules)
  .sort(([left], [right]) => left.localeCompare(right, "en"))
  .map(([, campaign]) => ({
    ...campaign,
    valuation: buildValuation(campaign),
  }));

export const campaignDataMeta = campaignIndex;

export function getCampaignApplicationUrl(campaign: Campaign) {
  return campaign.applicationUrl ?? campaign.officialUrl;
}

export function getCampaignPoints(
  campaign: Campaign,
  applicationType: ApplicationType,
) {
  return campaign.points[applicationType];
}

export function getRankingPoints(
  campaign: Campaign,
  applicationType: ApplicationType,
) {
  return getCampaignPoints(campaign, applicationType) ?? 0;
}

export function calculateCampaignValue(
  campaign: Campaign,
  applicationType: ApplicationType,
): CampaignValueResult {
  const points = getRankingPoints(campaign, applicationType);
  const requiredCostTotal = campaign.valuation.requiredCosts.reduce(
    (total, cost) => total + (cost.amountYen ?? 0),
    0,
  );
  const unknownRequiredCost = campaign.valuation.requiredCosts.some(
    (cost) => cost.amountYen === null,
  );
  const monetaryBenefitTotal = campaign.valuation.otherBenefits.reduce(
    (total, benefit) =>
      total +
      (benefit.includedInDevicePrice ? 0 : benefit.amountYen ?? 0),
    0,
  );
  const hasUnknownOnlyBenefit =
    points === 0 &&
    monetaryBenefitTotal === 0 &&
    campaign.valuation.otherBenefits.some(
      (benefit) => benefit.amountYen === null,
    );

  if (campaign.requiresDevicePurchase) {
    const devicePrice = campaign.valuation.devicePriceAfterCampaignYen;

    if (devicePrice === null) {
      return {
        kind: "burden",
        status: "unavailable",
        amountYen: null,
        formula: null,
        reason: "キャンペーン適用後の端末価格が確定できないため",
      };
    }

    if (unknownRequiredCost) {
      return {
        kind: "burden",
        status: "unavailable",
        amountYen: null,
        formula: null,
        reason: "追加必須費用の総額が確定できないため",
      };
    }

    const amountYen =
      devicePrice + requiredCostTotal - points - monetaryBenefitTotal;

    return {
      kind: "burden",
      status: "calculated",
      amountYen,
      formula: `${devicePrice.toLocaleString("ja-JP")}円 + ${requiredCostTotal.toLocaleString("ja-JP")}円 − ${points.toLocaleString("ja-JP")}ポイント − ${monetaryBenefitTotal.toLocaleString("ja-JP")}円相当 = ${amountYen.toLocaleString("ja-JP")}円`,
      reason: null,
    };
  }

  if (unknownRequiredCost) {
    return {
      kind: "savings",
      status: "unavailable",
      amountYen: null,
      formula: null,
      reason: "追加必須費用の総額が確定できないため",
    };
  }

  if (hasUnknownOnlyBenefit) {
    return {
      kind: "savings",
      status: "unavailable",
      amountYen: null,
      formula: null,
      reason: "ポイント以外の特典額が確定できないため",
    };
  }

  const amountYen = points + monetaryBenefitTotal - requiredCostTotal;

  return {
    kind: "savings",
    status: "calculated",
    amountYen,
    formula: `${points.toLocaleString("ja-JP")}ポイント + ${monetaryBenefitTotal.toLocaleString("ja-JP")}円相当 − ${requiredCostTotal.toLocaleString("ja-JP")}円 = ${amountYen.toLocaleString("ja-JP")}円`,
    reason: null,
  };
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
    .filter(({ campaign }) =>
      campaign.rankingEligible &&
      campaign.valuation.applicationTypes.includes(applicationType),
    )
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.campaign.valuation.ranking.additionalConditionCount -
          b.campaign.valuation.ranking.additionalConditionCount ||
        Number(b.campaign.valuation.ranking.webEligible) -
          Number(a.campaign.valuation.ranking.webEligible) ||
        b.campaign.valuation.ranking.audienceBreadth -
          a.campaign.valuation.ranking.audienceBreadth ||
        a.campaign.campaignCode.localeCompare(
          b.campaign.campaignCode,
          "en",
        ) ||
        a.originalIndex - b.originalIndex,
    )
    .map(({ campaign }) => campaign);
}
