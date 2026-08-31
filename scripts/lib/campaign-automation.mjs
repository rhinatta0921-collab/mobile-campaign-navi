import { createHash } from "node:crypto";

export const LISTING_URL = "https://network.mobile.rakuten.co.jp/campaign/";
export const DEFAULT_OPENAI_MODEL = "gpt-5.6-terra";
export const PROMPT_VERSION = "campaign-editorial-v1";
export const CAMPAIGN_EXTRACTION_INSTRUCTIONS = [
  "楽天モバイルの公式キャンペーンページだけを根拠に情報を抽出してください。",
  "申込者本人が受け取る固定ポイントだけをmnp/newNumberへ入れてください。",
  "紹介者分、抽選、値引き、無料期間は固定ポイントへ加算しないでください。",
  "mnp/newNumberごとの固定ポイント内訳をpointComponentsへ列挙し、pointsにはその合計を入れてください。内訳がない場合は空配列とnullにしてください。",
  "推測せず、不明な数値はnullにしてください。重要な判断には本文そのままの短い根拠引用を付けてください。",
].join("\n");
export const PUBLICATION_STATUSES = [
  "published",
  "excluded",
  "pending",
  "ended",
];

export const CARD_CODES = new Map(
  Object.entries({
    "/campaign/mnp/": ["2091", "2142"],
    "/fee/unext/": ["3293", "3288"],
    "/campaign/iphone-discount/": ["2938"],
    "/campaign/android-discount/": ["2178"],
    "/campaign/iphone-point-iphone-17/": ["2568"],
    "/campaign/iphone-point-iphone-16e/": ["2938"],
    "/campaign/galaxy/": ["3303", "3304"],
    "/product/internet/rakuten-wifi-pocket-5g/": ["2808"],
    "/product/internet/rakuten-wifi-pocket-platinum/": ["1875"],
    "/campaign/shop-limited-application": ["2995", "2619"],
    "/product/iphone/iphone-16/": ["2938"],
    "/campaign/iphone-pointback/": ["2568"],
    "/campaign/shop-weekday-reservation/": ["2981"],
    "/campaign/referral/": ["1784"],
    "/campaign/senior-pointback/": ["2897"],
    "/campaign/fee-simulation/": ["2215"],
    "/guide/application/card-campaign/": ["1238"],
    "/campaign/tadaima/": ["2207"],
    "/campaign/shop-extra-sim/": ["2331"],
    "/campaign/shop-opening-commemoration/": ["2855"],
    "/campaign/android-sale/": ["2178"],
    "/campaign/shop-limited-android/": ["3186"],
    "/campaign/start-point/": ["1819", "2006"],
    "/product/rakuten-certified/": ["3297"],
    "/campaign/heyduggee/": ["3351"],
    "/campaign/ichiba-debut/": ["3327"],
    "/campaign/shop-point/": ["3350"],
    "/internet/turbo/campaign/home-internet/": ["2698"],
    "/hikari/campaign/home-internet/": ["2697"],
    "/campaign/spu/": ["1173"],
    "/campaign/youtubepremium/": ["1680"],
    "/campaign/payment-google/": ["1922"],
    "/campaign/bank-member-campaign/": ["2660"],
    "/campaign/poitoku/": ["3141"],
    "/service/standard-free-call/": ["1977"],
    "/service/voice-mail/": ["2835"],
    "/service/call-waiting/": ["2834"],
    "/service/saikyo-protection/": ["2956"],
    "/service/whoscall/": ["3329"],
    "/service/anshin-control/": ["2833"],
    "/campaign/apple-watch-number-share/": ["2602"],
    "/campaign/answer-quiz/": ["3386"],
    "/campaign/referral-one-million/": ["3390"],
  }),
);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

export function normalizeOfficialText(value) {
  return decodeHtml(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function officialSourceHash(sourceHtml, officialUrl = LISTING_URL) {
  const primaryHtml =
    sourceHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? sourceHtml;
  const resourceUrls = [
    ...primaryHtml.matchAll(/\b(?:href|src|srcset)=["']([^"']+)["']/gi),
  ]
    .flatMap((match) => match[1].split(","))
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter((candidate) => candidate && !candidate.startsWith("data:"))
    .map((candidate) => {
      try {
        const url = new URL(decodeHtml(candidate), officialUrl);
        url.search = "";
        url.hash = "";
        return url.href;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "en"));
  return sha256(
    JSON.stringify({
      text: normalizeOfficialText(primaryHtml),
      resourceUrls: [...new Set(resourceUrls)],
    }),
  );
}

export function cleanOfficialUrl(href) {
  const url = new URL(decodeHtml(href), LISTING_URL);
  url.search = "";
  url.hash = "";
  return url;
}

export function generatedCode(url) {
  const host = url.hostname.replace(/^www\./, "").split(".")[0];
  const pathPart =
    url.pathname.split("/").filter(Boolean).slice(-3).join("-") || "top";
  return `NO-CODE-${host}-${pathPart}`
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .toUpperCase();
}

export function parseListingCards(html) {
  const start = html.indexOf(
    'href="/campaign/member/?l-id=campaign_campaign_member"',
  );
  const end = html.indexOf("過去のキャンペーン・特典はこちら", start);
  if (start < 0 || end < 0) {
    throw new Error("公式一覧のキャンペーン領域を検出できませんでした。");
  }

  return [
    ...html
      .slice(start, end)
      .matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
  ]
    .map((match) => {
      const alt = match[2].match(/<img[^>]+alt="([^"]*)"/)?.[1] ?? "";
      const descriptions = [
        ...match[2].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g),
      ]
        .map((item) => normalizeOfficialText(item[1]))
        .filter(Boolean);
      return {
        url: cleanOfficialUrl(match[1]),
        title:
          normalizeOfficialText(alt) || descriptions[0] || "名称未取得",
        description: descriptions.join(" "),
        raw: normalizeOfficialText(match[2]),
      };
    })
    .filter((card) => card.url.pathname !== "/campaign/member/");
}

export function codesForCard(card) {
  return CARD_CODES.get(card.url.pathname) ?? [generatedCode(card.url)];
}

export function listingSourceHash(campaign) {
  const source = [...campaign.sourceCards]
    .map(({ title, description, url }) => ({
      title: normalizeOfficialText(title),
      description: normalizeOfficialText(description),
      url: cleanOfficialUrl(url).href,
    }))
    .sort((left, right) => left.url.localeCompare(right.url, "en"));
  return sha256(JSON.stringify({ campaignCode: campaign.campaignCode, source }));
}

export function inferEligibility(campaign) {
  const text = normalizeOfficialText(
    [campaign.title, campaign.target, ...campaign.conditions].join(" "),
  );
  const firstOnly = /初めて|初回|はじめて/.test(text);
  const repeatOnly = /もう1回線|追加回線|2回線目|再契約|解約から/.test(text);
  const pointMnp = typeof campaign.points?.mnp === "number";
  const pointNew = typeof campaign.points?.newNumber === "number";

  return {
    firstApplication: !repeatOnly || firstOnly,
    repeatApplication: repeatOnly || !firstOnly,
    mnp: pointMnp || /MNP|乗り換え/.test(text),
    newNumber: pointNew || /新規(?:契約|申し込み|お申し込み)/.test(text),
  };
}

export function derivePublicationStatus(campaign, explicitStatus) {
  if (explicitStatus && PUBLICATION_STATUSES.includes(explicitStatus)) {
    return explicitStatus;
  }
  return campaign.rankingEligible && !campaign.requiresDevicePurchase
    ? "published"
    : "excluded";
}

export function withCatalogMetadata(
  campaign,
  {
    checkedAt,
    explicitStatus,
    firstSeenAt,
    lastChangedAt,
    listingPresence,
    provider = null,
    model = null,
    promptVersion = null,
    sourceHash = listingSourceHash(campaign),
    listingHash = listingSourceHash(campaign),
  },
) {
  return {
    ...campaign,
    publicationStatus: derivePublicationStatus(campaign, explicitStatus),
    listingPresence,
    eligibility: campaign.eligibility ?? inferEligibility(campaign),
    firstSeenAt: firstSeenAt ?? checkedAt,
    lastChangedAt: lastChangedAt ?? checkedAt,
    provenance: {
      contentHash: sourceHash,
      listingHash,
      provider,
      model,
      promptVersion,
    },
  };
}

export function catalogVersion(campaigns) {
  const values = [...campaigns]
    .sort((left, right) =>
      left.campaignCode.localeCompare(right.campaignCode, "en"),
    )
    .map((campaign) => ({
      campaignCode: campaign.campaignCode,
      publicationStatus: campaign.publicationStatus,
      contentHash: campaign.provenance?.contentHash ?? "",
      mnp: campaign.points.mnp,
      newNumber: campaign.points.newNumber,
    }));
  return sha256(JSON.stringify(values)).slice(0, 16);
}

export function statusCounts(campaigns) {
  return Object.fromEntries(
    PUBLICATION_STATUSES.map((status) => [
      status,
      campaigns.filter((campaign) => campaign.publicationStatus === status)
        .length,
    ]),
  );
}

export function isAbnormalListingDelta(previousCount, currentCount) {
  if (!Number.isFinite(previousCount) || previousCount <= 0) return false;
  const difference = Math.abs(currentCount - previousCount);
  return difference > 10 && difference / previousCount > 0.2;
}

export function primaryOfficialText(sourceText) {
  const main = sourceText.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  return normalizeOfficialText(main ?? sourceText);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isExplicitlyEnded(
  status,
  sourceText,
  finalUrl = "",
  campaignCode = null,
) {
  if (status === 404 || status === 410) return true;
  if (/\/campaign\/(?:past|archive|ended?)(?:\/|$)/i.test(finalUrl)) {
    return true;
  }
  const text = primaryOfficialText(sourceText);
  const explicitPageEnd =
    /(?:^|[。！？\s])(?:本|当)キャンペーン(?:・特典)?(?:の(?:申込|申し込み|応募|受付|エントリー))?は(?:すでに)?終了(?:しました|いたしました|しております)(?:[。！？\s]|$)/;
  if (explicitPageEnd.test(text.slice(0, 2_000))) return true;

  if (!campaignCode || campaignCode.startsWith("NO-CODE-")) return false;
  const escapedCode = escapeRegExp(campaignCode);
  const codeSpecificEnd = new RegExp(
    `(?:キャンペーン|施策)コード\\s*[:：]?\\s*${escapedCode}[）)]?\\s*(?:は|を)?終了(?:しました|いたしました|しております)`,
  );
  return codeSpecificEnd.test(text);
}

export function extractRuleFacts(sourceText) {
  const text = primaryOfficialText(sourceText);
  const pointAmounts = [
    ...text.matchAll(/([0-9０-９][0-9０-９,，]*)\s*ポイント/g),
  ]
    .map((match) =>
      Number(
        match[1]
          .normalize("NFKC")
          .replaceAll(",", ""),
      ),
    )
    .filter(Number.isFinite);
  const campaignCodes = [
    ...text.matchAll(/(?:キャンペーン|施策)コード\s*[:：]?\s*([A-Z0-9-]{3,})/gi),
  ].map((match) => match[1].toUpperCase());
  const dates = [
    ...text.matchAll(/(?:20\d{2}年)?\s*\d{1,2}月\s*\d{1,2}日/g),
  ].map((match) => match[0].replace(/\s+/g, ""));

  return {
    campaignCodes: [...new Set(campaignCodes)],
    dates: [...new Set(dates)],
    pointAmounts: [...new Set(pointAmounts)].sort((left, right) => left - right),
    mentionsMnp: /MNP|乗り換え/.test(text),
    mentionsNewNumber: /新規(?:契約|申し込み|お申し込み)/.test(text),
    mentionsDevicePurchase:
      /(?:対象(?:製品|端末)|iPhone|Android|Apple Watch|Wi-?Fiルーター).{0,40}(?:購入|ご購入)|(?:製品|端末)購入/.test(
        text,
      ),
  };
}

export function campaignExtractionInput({
  officialUrl,
  sourceText,
  maxInputChars = 80_000,
}) {
  const officialText = primaryOfficialText(sourceText).slice(0, maxInputChars);
  return {
    officialText,
    text: `公式URL: ${officialUrl}\nルール抽出結果: ${JSON.stringify(extractRuleFacts(officialText))}\n公式ページ本文:\n${officialText}`,
  };
}

export function deterministicClassification(extracted, sourceText) {
  const text = normalizeOfficialText(sourceText);
  const hasDeviceRequirement =
    /(?:対象(?:製品|端末)|iPhone|Android|Apple Watch|Wi-?Fiルーター).{0,40}(?:購入|ご購入)|(?:製品|端末)購入/.test(
      text,
    ) && !/(?:製品|端末)購入(?:は)?不要/.test(text);
  const directApplication =
    /楽天モバイル.{0,100}(?:申込|申し込)|(?:申込|申し込).{0,100}楽天モバイル/.test(
      text,
    );
  const hasFixedApplicantPoints = [
    extracted.points?.mnp,
    extracted.points?.newNumber,
  ].some((value) => typeof value === "number" && value >= 0);
  return {
    requiresDevicePurchase: hasDeviceRequirement,
    rankingEligible:
      directApplication && hasFixedApplicantPoints && !hasDeviceRequirement,
  };
}

function nullableNumberSchema() {
  return { anyOf: [{ type: "number" }, { type: "null" }] };
}

function nullableStringSchema() {
  return { anyOf: [{ type: "string" }, { type: "null" }] };
}

export const CAMPAIGN_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    benefit: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { type: "string" },
        amount: nullableNumberSchema(),
        unit: nullableStringSchema(),
        description: { type: "string" },
      },
      required: ["type", "amount", "unit", "description"],
    },
    points: {
      type: "object",
      additionalProperties: false,
      properties: {
        mnp: nullableNumberSchema(),
        newNumber: nullableNumberSchema(),
      },
      required: ["mnp", "newNumber"],
    },
    pointComponents: {
      type: "object",
      additionalProperties: false,
      properties: {
        mnp: { type: "array", items: { type: "number" } },
        newNumber: { type: "array", items: { type: "number" } },
      },
      required: ["mnp", "newNumber"],
    },
    target: { type: "string" },
    conditions: { type: "array", items: { type: "string" } },
    channel: { type: "string" },
    category: {
      type: "string",
      enum: [
        "simOnly",
        "device",
        "service",
        "homeInternet",
        "memberBenefit",
        "option",
        "other",
      ],
    },
    audience: {
      type: "string",
      enum: ["applicant", "member", "both"],
    },
    period: { type: "string" },
    editorial: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string" },
        paragraphs: { type: "array", items: { type: "string" } },
        goodPoints: { type: "array", items: { type: "string" } },
        concerns: { type: "array", items: { type: "string" } },
      },
      required: ["headline", "paragraphs", "goodPoints", "concerns"],
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          quote: { type: "string" },
        },
        required: ["field", "quote"],
      },
    },
  },
  required: [
    "title",
    "summary",
    "benefit",
    "points",
    "pointComponents",
    "target",
    "conditions",
    "channel",
    "category",
    "audience",
    "period",
    "editorial",
    "evidence",
  ],
};

export function validateExtractionEvidence(extracted, sourceText) {
  const normalizedSource = normalizeOfficialText(sourceText);
  const ruleFacts = extractRuleFacts(sourceText);
  const errors = [];
  for (const evidence of extracted.evidence ?? []) {
    const quote = normalizeOfficialText(evidence.quote ?? "");
    if (!quote || !normalizedSource.includes(quote)) {
      errors.push(`根拠引用を公式本文で確認できません: ${evidence.field}`);
    }
  }
  for (const field of ["mnp", "newNumber"]) {
    const components = extracted.pointComponents?.[field] ?? [];
    for (const amount of components) {
      if (!ruleFacts.pointAmounts.includes(amount)) {
        errors.push(
          `pointComponents.${field}=${amount} のポイント根拠が公式本文にありません。`,
        );
      }
    }
    const calculated = components.length
      ? components.reduce((total, amount) => total + amount, 0)
      : null;
    if ((extracted.points?.[field] ?? null) !== calculated) {
      errors.push(
        `points.${field} は内訳合計と一致しません（AI=${extracted.points?.[field] ?? "null"}、再計算=${calculated ?? "null"}）。`,
      );
    }
  }
  if (!extracted.evidence?.length) {
    errors.push("公式本文の根拠引用がありません。");
  }
  return errors;
}

function responseOutputText(response) {
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;
}

export async function extractCampaignWithOpenAI({
  apiKey,
  model = DEFAULT_OPENAI_MODEL,
  officialUrl,
  sourceText,
  maxInputChars = 80_000,
  maxOutputTokens = 4_000,
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new Error("OPENAI_API_KEY が設定されていません。");
  const input = campaignExtractionInput({
    officialUrl,
    sourceText,
    maxInputChars,
  });
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: maxOutputTokens,
      reasoning: { effort: "low" },
      instructions: CAMPAIGN_EXTRACTION_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: input.text,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "rakuten_mobile_campaign",
          description: "公式キャンペーンページから抽出した掲載候補",
          strict: true,
          schema: CAMPAIGN_EXTRACTION_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  if (payload.status !== "completed") {
    throw new Error(`OpenAI APIの応答が完了しませんでした: ${payload.status}`);
  }
  const outputText = responseOutputText(payload);
  if (!outputText) throw new Error("OpenAI APIの構造化出力がありません。");
  const extracted = JSON.parse(outputText);
  const evidenceErrors = validateExtractionEvidence(extracted, sourceText);
  if (evidenceErrors.length > 0) {
    throw new Error(evidenceErrors.join(" "));
  }
  return {
    extracted,
    audit: {
      provider: "openai",
      model,
      promptVersion: PROMPT_VERSION,
      sourceHash: officialSourceHash(sourceText, officialUrl),
    },
    usage: {
      inputTokens: payload.usage?.input_tokens ?? 0,
      outputTokens: payload.usage?.output_tokens ?? 0,
    },
  };
}

export function campaignFromExtraction(baseCampaign, extracted, sourceText) {
  const classification = deterministicClassification(extracted, sourceText);
  const points = Object.fromEntries(
    ["mnp", "newNumber"].map((field) => {
      const components = extracted.pointComponents[field];
      return [
        field,
        components.length
          ? components.reduce((total, amount) => total + amount, 0)
          : null,
      ];
    }),
  );
  return {
    ...baseCampaign,
    title: extracted.title,
    editorial: extracted.editorial,
    summary: extracted.summary,
    benefit: extracted.benefit,
    points,
    breakdown: {
      mnp:
        typeof points.mnp === "number"
          ? [`申込者本人：${points.mnp.toLocaleString("ja-JP")}ポイント`]
          : null,
      newNumber:
        typeof points.newNumber === "number"
          ? [`申込者本人：${points.newNumber.toLocaleString("ja-JP")}ポイント`]
          : null,
    },
    target: extracted.target,
    conditions: extracted.conditions,
    channel: extracted.channel,
    category: extracted.category,
    audience: extracted.audience,
    period: extracted.period,
    notes: [
      ...(baseCampaign.notes ?? []),
      "公式ページ本文を構造化し、数値根拠を検証して生成しました。",
    ],
    requiresDevicePurchase: classification.requiresDevicePurchase,
    rankingEligible: classification.rankingEligible,
    evidence: extracted.evidence,
  };
}
