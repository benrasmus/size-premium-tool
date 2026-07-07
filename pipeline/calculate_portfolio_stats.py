"""Per-decile time-series statistics: beta, annualized return/stdev, excess return.

All annualization follows the project's own convention (not French's pre-annualized
panels): arithmetic mean x 12, stdev x sqrt(12), geometric mean compounded properly.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm


def align_data(
    returns: pd.DataFrame,
    avg_firm_size: pd.DataFrame,
    num_firms: pd.DataFrame,
    factors: pd.DataFrame,
    start: str | None = None,
    end: str | None = None,
) -> dict[str, pd.DataFrame]:
    """Inner-join all inputs on their monthly PeriodIndex, optionally clipped to [start, end]."""
    common_index = returns.index.intersection(factors.index)
    common_index = common_index.intersection(avg_firm_size.index).intersection(num_firms.index)

    if start:
        common_index = common_index[common_index >= pd.Period(start, freq="M")]
    if end:
        common_index = common_index[common_index <= pd.Period(end, freq="M")]

    common_index = common_index.sort_values()
    return {
        "returns": returns.loc[common_index],
        "avg_firm_size": avg_firm_size.loc[common_index],
        "num_firms": num_firms.loc[common_index],
        "factors": factors.loc[common_index],
    }


def _annualized_geometric_mean(monthly_returns: pd.Series) -> float:
    n = monthly_returns.count()
    growth = (1.0 + monthly_returns.dropna()).prod()
    return growth ** (12.0 / n) - 1.0


def compute_portfolio_stats(aligned: dict[str, pd.DataFrame]) -> tuple[pd.DataFrame, dict]:
    """Return (one row per decile portfolio with all time-series statistics, study-level metadata)."""
    returns = aligned["returns"]
    rf = aligned["factors"]["RF"]
    mkt_excess = aligned["factors"]["Mkt-RF"]

    rows = []
    for portfolio in returns.columns:
        port_returns = returns[portfolio]
        excess_returns = port_returns - rf

        X = sm.add_constant(mkt_excess)
        model = sm.OLS(excess_returns, X, missing="drop").fit()
        beta = model.params["Mkt-RF"]

        rows.append(
            {
                "portfolio": portfolio,
                "n_months": int(port_returns.count()),
                "avg_firm_size": aligned["avg_firm_size"][portfolio].mean(),
                "avg_num_firms": aligned["num_firms"][portfolio].mean(),
                "beta": beta,
                "annualized_arith_return": port_returns.mean() * 12,
                "annualized_geo_return": _annualized_geometric_mean(port_returns),
                "annualized_stdev": port_returns.std(ddof=1) * np.sqrt(12),
                "annualized_arith_excess_return": excess_returns.mean() * 12,
            }
        )

    df = pd.DataFrame(rows).set_index("portfolio")
    df["log_avg_firm_size"] = np.log(df["avg_firm_size"])

    meta = {
        "market_erp": mkt_excess.mean() * 12,
        "n_months": int(len(returns)),
        "start_period": str(returns.index.min()),
        "end_period": str(returns.index.max()),
    }
    return df, meta
