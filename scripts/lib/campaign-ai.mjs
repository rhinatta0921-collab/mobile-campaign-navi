import {
  CAMPAIGN_EXTRACTION_INSTRUCTIONS,
  CAMPAIGN_EXTRACTION_SCHEMA,
  DEFAULT_OPENAI_MODEL,
  PROMPT_VERSION,
  campaignExtractionInput,
  extractCampaignWithOpenAI,
  officialSourceHash,
  validateExtractionEvidence,
} from "./campaign-automation.mjs";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
export const DEFAULT_AI_LIMITS = Object.freeze({
  maxInputChars: 80_000,
  maxOutputTokens: 4_000,
  maxCalls: 10,
  maxBudgetUsd: 2,
});

const DEFAULT_PRICES = Object.freeze({
  "openai:gpt-5.6-terra": { input: 2, output: 12 },
  "anthropic:claude-sonnet-5": { input: 3, output: 15 },
});

function finitePositive(value, fallback, label) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} は正の数で指定してください。`);
  }
  return parsed;
}

function positiveInteger(value, fallback, label) {
  const parsed = finitePositive(value, fallback, label);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} は正の整数で指定してください。`);
  }
  return parsed;
}

function anthropicOutputText(payload) {
  return (payload.content ?? []).find((content) => content.type === "text")?.text;
}

export async function extractCampaignWithAnthropic({
  apiKey,
  model = DEFAULT_ANTHROPIC_MODEL,
  officialUrl,
  sourceText,
  maxInputChars = DEFAULT_AI_LIMITS.maxInputChars,
  maxOutputTokens = DEFAULT_AI_LIMITS.maxOutputTokens,
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が設定されていません。");
  const input = campaignExtractionInput({
    officialUrl,
    sourceText,
    maxInputChars,
  });
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      system: CAMPAIGN_EXTRACTION_INSTRUCTIONS,
      messages: [{ role: "user", content: input.text }],
      output_config: {
        format: {
          type: "json_schema",
          schema: CAMPAIGN_EXTRACTION_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`Anthropic API HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  if (payload.stop_reason !== "end_turn") {
    throw new Error(
      `Anthropic APIの応答が正常完了しませんでした: ${payload.stop_reason ?? "unknown"}`,
    );
  }
  const outputText = anthropicOutputText(payload);
  if (!outputText) throw new Error("Anthropic APIの構造化出力がありません。");
  const extracted = JSON.parse(outputText);
  const evidenceErrors = validateExtractionEvidence(extracted, sourceText);
  if (evidenceErrors.length > 0) throw new Error(evidenceErrors.join(" "));
  return {
    extracted,
    audit: {
      provider: "anthropic",
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

function resolveProvider(environment) {
  const id = (environment.CAMPAIGN_AI_PROVIDER ?? "openai").toLowerCase();
  if (!["openai", "anthropic"].includes(id)) {
    throw new Error(`未対応のCAMPAIGN_AI_PROVIDERです: ${id}`);
  }
  if (id === "openai") {
    return {
      id,
      model: environment.OPENAI_CAMPAIGN_MODEL ?? DEFAULT_OPENAI_MODEL,
      apiKey: environment.OPENAI_API_KEY,
      extract: extractCampaignWithOpenAI,
    };
  }
  return {
    id,
    model: environment.ANTHROPIC_CAMPAIGN_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
    apiKey: environment.ANTHROPIC_API_KEY,
    extract: extractCampaignWithAnthropic,
  };
}

function resolvePrice(provider, environment) {
  const configuredInput = environment.CAMPAIGN_AI_INPUT_USD_PER_MILLION;
  const configuredOutput = environment.CAMPAIGN_AI_OUTPUT_USD_PER_MILLION;
  if ((configuredInput && !configuredOutput) || (!configuredInput && configuredOutput)) {
    throw new Error("AI単価の上書きはinput/outputの両方を指定してください。");
  }
  if (configuredInput && configuredOutput) {
    return {
      input: finitePositive(configuredInput, 0, "CAMPAIGN_AI_INPUT_USD_PER_MILLION"),
      output: finitePositive(configuredOutput, 0, "CAMPAIGN_AI_OUTPUT_USD_PER_MILLION"),
    };
  }
  const price = DEFAULT_PRICES[`${provider.id}:${provider.model}`];
  if (!price) {
    throw new Error(
      `${provider.id}/${provider.model} の単価が未登録です。CAMPAIGN_AI_INPUT_USD_PER_MILLIONとCAMPAIGN_AI_OUTPUT_USD_PER_MILLIONを設定してください。`,
    );
  }
  return price;
}

function estimatedCost(usage, price) {
  return (
    (usage.inputTokens * price.input + usage.outputTokens * price.output) /
    1_000_000
  );
}

export function createCampaignAiRuntime({
  environment = process.env,
  fetchImpl = fetch,
} = {}) {
  const provider = resolveProvider(environment);
  const price = resolvePrice(provider, environment);
  const limits = {
    maxInputChars: positiveInteger(
      environment.CAMPAIGN_AI_MAX_INPUT_CHARS,
      DEFAULT_AI_LIMITS.maxInputChars,
      "CAMPAIGN_AI_MAX_INPUT_CHARS",
    ),
    maxOutputTokens: positiveInteger(
      environment.CAMPAIGN_AI_MAX_OUTPUT_TOKENS,
      DEFAULT_AI_LIMITS.maxOutputTokens,
      "CAMPAIGN_AI_MAX_OUTPUT_TOKENS",
    ),
    maxCalls: positiveInteger(
      environment.CAMPAIGN_AI_MAX_CALLS,
      DEFAULT_AI_LIMITS.maxCalls,
      "CAMPAIGN_AI_MAX_CALLS",
    ),
    maxBudgetUsd: finitePositive(
      environment.CAMPAIGN_AI_MAX_BUDGET_USD,
      DEFAULT_AI_LIMITS.maxBudgetUsd,
      "CAMPAIGN_AI_MAX_BUDGET_USD",
    ),
  };
  const cache = new Map();
  const usage = { calls: 0, cacheHits: 0, inputTokens: 0, outputTokens: 0 };

  function summary() {
    return {
      provider: provider.id,
      model: provider.model,
      configured: Boolean(provider.apiKey),
      ...usage,
      estimatedCostUsd: Number(estimatedCost(usage, price).toFixed(6)),
      limits,
      priceUsdPerMillionTokens: price,
    };
  }

  return {
    id: provider.id,
    model: provider.model,
    configured: Boolean(provider.apiKey),
    summary,
    async extract({ officialUrl, sourceText }) {
      if (!provider.apiKey) {
        throw new Error(
          `${provider.id === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} が設定されていません。`,
        );
      }
      const sourceHash = officialSourceHash(sourceText, officialUrl);
      const key = `${officialUrl}:${sourceHash}`;
      if (cache.has(key)) {
        usage.cacheHits += 1;
        return cache.get(key);
      }
      if (usage.calls >= limits.maxCalls) {
        throw new Error(`AI API呼び出し上限（${limits.maxCalls}回）に達しました。`);
      }
      const inputChars = campaignExtractionInput({
        officialUrl,
        sourceText,
        maxInputChars: limits.maxInputChars,
      }).text.length;
      const projectedUsage = {
        inputTokens: usage.inputTokens + Math.ceil(inputChars / 4),
        outputTokens: usage.outputTokens + limits.maxOutputTokens,
      };
      if (estimatedCost(projectedUsage, price) > limits.maxBudgetUsd) {
        throw new Error(
          `AI APIの実行予算上限（$${limits.maxBudgetUsd}）を超える可能性があるため停止しました。`,
        );
      }
      usage.calls += 1;
      const result = await provider.extract({
        apiKey: provider.apiKey,
        model: provider.model,
        officialUrl,
        sourceText,
        maxInputChars: limits.maxInputChars,
        maxOutputTokens: limits.maxOutputTokens,
        fetchImpl,
      });
      usage.inputTokens += result.usage?.inputTokens ?? 0;
      usage.outputTokens += result.usage?.outputTokens ?? 0;
      if (estimatedCost(usage, price) > limits.maxBudgetUsd) {
        throw new Error(`AI APIの実績費用が予算上限（$${limits.maxBudgetUsd}）を超えました。`);
      }
      cache.set(key, result);
      return result;
    },
  };
}
