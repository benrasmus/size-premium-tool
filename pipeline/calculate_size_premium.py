"""CAPM-indicated premium and premium over CAPM, per portfolio.

Size Premium over CAPM = [Portfolio return - Risk-free return] - [Beta x Market ERP]
                        = Arithmetic excess return - CAPM-indicated premium
"""
from __future__ import annotations

import pandas as pd


def add_size_premium(stats: pd.DataFrame, market_erp: float) -> pd.DataFrame:
    df = stats.copy()
    df["capm_indicated_premium"] = df["beta"] * market_erp
    df["premium_over_capm"] = df["annualized_arith_excess_return"] - df["capm_indicated_premium"]
    return df
