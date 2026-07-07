export interface PortfolioRow {
  portfolio: string;
  n_months: number;
  avg_firm_size: number;
  avg_num_firms: number;
  beta: number;
  annualized_arith_return: number;
  annualized_geo_return: number;
  annualized_stdev: number;
  annualized_arith_excess_return: number;
  log_avg_firm_size: number;
  capm_indicated_premium: number;
  premium_over_capm: number;
  smoothed_premium_over_capm: number;
}

export interface RegressionOutput {
  intercept: number;
  slope: number;
  r_squared: number;
  std_err_intercept: number;
  std_err_slope: number;
  t_stat_intercept: number;
  t_stat_slope: number;
  p_value_intercept: number;
  p_value_slope: number;
  n_obs: number;
  df_resid: number;
}

export interface ScenarioMeta {
  market_erp: number;
  n_months: number;
  start_period: string;
  end_period: string;
  start_param: string | null;
  end_param: string | null;
}

/** One weighting variant (value-weighted or equal-weighted) within a date-range scenario. */
export interface WeightingVariant {
  label: string;
  meta: ScenarioMeta;
  regression: RegressionOutput;
  portfolios: PortfolioRow[];
}

export type WeightingKey = "value_weighted" | "equal_weighted";

export interface Scenario {
  label: string;
  weightings: Record<WeightingKey, WeightingVariant>;
}

export interface ResultsFile {
  generated_scenarios: string[];
  default_scenario: string;
  generated_weightings: WeightingKey[];
  default_weighting: WeightingKey;
  scenarios: Record<string, Scenario>;
}
