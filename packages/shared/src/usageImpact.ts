export type UsageImpactInput = {
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type CalculatedUsageImpact = {
  cost_usd: number;
  energy_kwh: number;
  co2_grams: number;
};

export type ModelTokenPricingUsd = {
  input_usd_per_million_tokens: number;
  output_usd_per_million_tokens: number;
};

export type CostEnergyCo2CalculationConstants = {
  pricing_usd_per_million_tokens_by_model: Record<string, ModelTokenPricingUsd>;
  fallback_pricing_usd_per_million_tokens: ModelTokenPricingUsd;
  energy_kwh_per_1k_tokens: number;
  co2_grams_per_kwh: number;
};

export const DEFAULT_COST_ENERGY_CO2_CONSTANTS = {
  pricing_usd_per_million_tokens_by_model: {
    "gpt-4.1": {
      input_usd_per_million_tokens: 2,
      output_usd_per_million_tokens: 8
    },
    "gpt-4.1-mini": {
      input_usd_per_million_tokens: 0.4,
      output_usd_per_million_tokens: 1.6
    },
    "gpt-4.1-nano": {
      input_usd_per_million_tokens: 0.1,
      output_usd_per_million_tokens: 0.4
    }
  },
  fallback_pricing_usd_per_million_tokens: {
    input_usd_per_million_tokens: 0.4,
    output_usd_per_million_tokens: 1.6
  },
  energy_kwh_per_1k_tokens: 0.0003,
  co2_grams_per_kwh: 400
} satisfies CostEnergyCo2CalculationConstants;

function nonNegativeFinite(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function getPricingForModel(
  model: string | null,
  constants: CostEnergyCo2CalculationConstants
): ModelTokenPricingUsd {
  if (!model) {
    return constants.fallback_pricing_usd_per_million_tokens;
  }

  const exactMatch = constants.pricing_usd_per_million_tokens_by_model[model];
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatch = Object.keys(constants.pricing_usd_per_million_tokens_by_model)
    .sort((left, right) => right.length - left.length)
    .find((candidate) => model.startsWith(`${candidate}-`));

  return prefixMatch
    ? constants.pricing_usd_per_million_tokens_by_model[prefixMatch]
    : constants.fallback_pricing_usd_per_million_tokens;
}

export function calculateCostEnergyCo2(
  input: UsageImpactInput,
  constants: CostEnergyCo2CalculationConstants = DEFAULT_COST_ENERGY_CO2_CONSTANTS
): CalculatedUsageImpact {
  const pricing = getPricingForModel(input.model, constants);
  const inputTokens = nonNegativeFinite(input.input_tokens);
  const outputTokens = nonNegativeFinite(input.output_tokens);
  const totalTokens = nonNegativeFinite(input.total_tokens);
  const costUsd =
    (inputTokens * pricing.input_usd_per_million_tokens) / 1_000_000 +
    (outputTokens * pricing.output_usd_per_million_tokens) / 1_000_000;
  const energyKwh = (totalTokens * constants.energy_kwh_per_1k_tokens) / 1_000;
  const co2Grams = energyKwh * constants.co2_grams_per_kwh;

  return {
    cost_usd: roundToDecimalPlaces(costUsd, 12),
    energy_kwh: roundToDecimalPlaces(energyKwh, 12),
    co2_grams: roundToDecimalPlaces(co2Grams, 9)
  };
}
