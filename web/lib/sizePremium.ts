import type { RegressionOutput, WeightingVariant } from "./types";

/** Premium over CAPM implied by the fitted regression line, for an arbitrary market value ($ millions). */
export function smoothedPremiumForSize(regression: RegressionOutput, marketValueMillions: number): number {
  const logSize = Math.log(marketValueMillions);
  return regression.intercept + regression.slope * logSize;
}

export function isOutsideObservedRange(variant: WeightingVariant, marketValueMillions: number): boolean {
  const logSize = Math.log(marketValueMillions);
  const logs = variant.portfolios.map((p) => p.log_avg_firm_size);
  return logSize < Math.min(...logs) || logSize > Math.max(...logs);
}
