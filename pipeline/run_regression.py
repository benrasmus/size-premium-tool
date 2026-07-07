"""Cross-sectional regression: Premium over CAPM = a + b * log(avg firm size).

This is the "smoothing" regression -- the same technique Duff & Phelps/Ibbotson use
to turn a noisy, small set of portfolio observations into a continuous formula that
can be applied to a subject private company's own (log) size.
"""
from __future__ import annotations

import pandas as pd
import statsmodels.api as sm


def run_size_premium_regression(stats: pd.DataFrame) -> dict:
    """Fit premium_over_capm ~ a + b * log_avg_firm_size across portfolios.

    Returns a dict with intercept, slope, r_squared, std_err, t_stat, p_value, n, df_resid,
    plus a per-portfolio 'smoothed_premium_over_capm' Series for merging back into the table.
    """
    y = stats["premium_over_capm"]
    x = stats["log_avg_firm_size"]
    X = sm.add_constant(x)

    model = sm.OLS(y, X).fit()

    intercept = model.params["const"]
    slope = model.params["log_avg_firm_size"]

    smoothed = intercept + slope * x

    return {
        "intercept": intercept,
        "slope": slope,
        "r_squared": model.rsquared,
        "std_err_intercept": model.bse["const"],
        "std_err_slope": model.bse["log_avg_firm_size"],
        "t_stat_intercept": model.tvalues["const"],
        "t_stat_slope": model.tvalues["log_avg_firm_size"],
        "p_value_intercept": model.pvalues["const"],
        "p_value_slope": model.pvalues["log_avg_firm_size"],
        "n_obs": int(model.nobs),
        "df_resid": int(model.df_resid),
        "smoothed_premium_over_capm": smoothed,
    }


def apply_smoothed_premium(stats: pd.DataFrame, regression: dict) -> pd.DataFrame:
    df = stats.copy()
    df["smoothed_premium_over_capm"] = regression["smoothed_premium_over_capm"]
    return df
