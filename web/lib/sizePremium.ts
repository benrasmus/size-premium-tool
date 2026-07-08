import type { RegressionOutput, WeightingVariant } from "./types";

/** Premium over CAPM implied by the fitted regression line, for an arbitrary market value ($ millions). */
export function smoothedPremiumForSize(regression: RegressionOutput, marketValueMillions: number): number {
  const logSize = Math.log(marketValueMillions);
  return regression.intercept + regression.slope * logSize;
}

export function isOutsideObservedRange(variant: WeightingVariant, marketValueMillions: number): boolean {
  return extrapolationLogDistance(variant, marketValueMillions) > 0;
}

/** How many natural-log units the given size falls outside the study's observed portfolio range. 0 = inside range. */
export function extrapolationLogDistance(variant: WeightingVariant, marketValueMillions: number): number {
  const logSize = Math.log(marketValueMillions);
  const logs = variant.portfolios.map((p) => p.log_avg_firm_size);
  const min = Math.min(...logs);
  const max = Math.max(...logs);
  if (logSize < min) return min - logSize;
  if (logSize > max) return logSize - max;
  return 0;
}

export type ExtrapolationSeverity = "none" | "mild" | "moderate" | "severe";

export interface ExtrapolationAssessment {
  logDistance: number;
  severity: ExtrapolationSeverity;
  message: string;
}

/**
 * The regression is fit on public-market decile portfolios ranging from tens of millions to tens of
 * billions of dollars. A subject company even a couple of log-units below the smallest observed
 * portfolio is already a large extrapolation; several log-units below (typical for sub-$2M small
 * businesses) means the line has no evidentiary basis at that size at all.
 */
export function assessExtrapolation(variant: WeightingVariant, marketValueMillions: number): ExtrapolationAssessment {
  const logDistance = extrapolationLogDistance(variant, marketValueMillions);

  if (logDistance <= 0) {
    return { logDistance, severity: "none", message: "Within the range of company sizes observed in this study." };
  }
  if (logDistance <= 1) {
    return {
      logDistance,
      severity: "mild",
      message:
        "Modestly outside the observed range. The smoothed premium below is a limited extrapolation of the fitted line.",
    };
  }
  if (logDistance <= 2.5) {
    return {
      logDistance,
      severity: "moderate",
      message:
        "Well outside the observed range. This extrapolates the fitted line significantly beyond any company size actually in the study -- treat the smoothed premium as a rough floor, not a precise estimate.",
    };
  }
  return {
    logDistance,
    severity: "severe",
    message:
      `This subject company is ~${logDistance.toFixed(1)} log-units below the smallest company size actually observed in this study -- an extreme extrapolation. The regression was fit entirely on public companies (even the smallest decile averages tens of millions of dollars); it has no evidentiary basis at this size, and the fitted line is very likely far too shallow here. See Methodology for why, and consider the market-multiple comparison below instead.`,
  };
}

/**
 * Galbraith (2025), Journal of Entrepreneurial Finance: a regression fit directly on private
 * business-transaction data (not public markets). Size Premium = 25% - 2.45% x ln(equity value in $M).
 * Distinct data source from the public-market study above -- see Methodology before treating the two
 * as interchangeable.
 */
export function galbraithSizePremium(marketValueMillions: number): number {
  return 0.25 - 0.0245 * Math.log(marketValueMillions);
}

/** Gordon Growth reciprocal: the cash-flow multiple implied by a given discount rate and growth rate. Null if r <= g (undefined/infinite). */
export function impliedMultiple(discountRate: number, growthRate: number): number | null {
  if (discountRate <= growthRate) return null;
  return 1 / (discountRate - growthRate);
}
