"""Orchestrate the full size-premium study and dump validation output.

Usage:
    python run_pipeline.py [--start YYYY-MM] [--end YYYY-MM] [--out-dir DIR]

Produces (in --out-dir, default ./output):
    portfolio_table.csv   -- one row per decile portfolio, all stats
    regression.json       -- cross-sectional regression output
    results.json          -- everything combined, shaped for the web dashboard
And prints a formatted table + regression summary to the console for a quick
sanity check against the textbook exhibit before any dashboard work begins.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from calculate_portfolio_stats import align_data, compute_portfolio_stats
from calculate_size_premium import add_size_premium
from clean_data import load_factors, load_size_portfolios
from fetch_french_data import fetch_all
from run_regression import apply_smoothed_premium, run_size_premium_regression

pd.set_option("display.width", 160)
pd.set_option("display.float_format", lambda v: f"{v: .4f}")


def run(
    start: str | None,
    end: str | None,
    out_dir: Path,
    force_download: bool = False,
    weighting: str = "value_weighted",
) -> dict:
    paths = fetch_all(force=force_download)

    size_data = load_size_portfolios(paths["size_portfolios"])
    factors = load_factors(paths["factors"])

    returns_key = "returns_vw" if weighting == "value_weighted" else "returns_ew"
    aligned = align_data(
        returns=size_data[returns_key],
        avg_firm_size=size_data["avg_firm_size"],
        num_firms=size_data["num_firms"],
        factors=factors,
        start=start,
        end=end,
    )

    stats, meta = compute_portfolio_stats(aligned)
    stats = add_size_premium(stats, meta["market_erp"])
    regression = run_size_premium_regression(stats)
    stats = apply_smoothed_premium(stats, regression)

    out_dir.mkdir(parents=True, exist_ok=True)
    stats.to_csv(out_dir / "portfolio_table.csv")

    regression_out = {k: v for k, v in regression.items() if k != "smoothed_premium_over_capm"}
    with open(out_dir / "regression.json", "w") as f:
        json.dump(regression_out, f, indent=2, default=float)

    results = {
        "meta": {**meta, "start_param": start, "end_param": end},
        "regression": regression_out,
        "portfolios": json.loads(stats.reset_index().to_json(orient="records")),
    }
    with open(out_dir / "results.json", "w") as f:
        json.dump(results, f, indent=2)

    print_console_report(stats, meta, regression)
    run_validation_checks(stats, regression)

    return results


def print_console_report(stats: pd.DataFrame, meta: dict, regression: dict) -> None:
    print("=" * 100)
    print(f"SIZE PREMIUM STUDY  ({meta['start_period']} to {meta['end_period']}, {meta['n_months']} months)")
    print(f"Market equity risk premium (annualized arithmetic Mkt-RF): {meta['market_erp']:.4%}")
    print("=" * 100)

    display_cols = [
        "avg_firm_size", "log_avg_firm_size", "avg_num_firms", "beta",
        "annualized_stdev", "annualized_geo_return", "annualized_arith_return",
        "annualized_arith_excess_return", "capm_indicated_premium",
        "premium_over_capm", "smoothed_premium_over_capm",
    ]
    print(stats[display_cols].to_string())

    print("-" * 100)
    print("CROSS-SECTIONAL REGRESSION: Premium over CAPM = a + b * log(avg firm size)")
    print(f"  intercept (a)     = {regression['intercept']: .6f}  (t={regression['t_stat_intercept']:.2f}, p={regression['p_value_intercept']:.4f})")
    print(f"  slope (b)         = {regression['slope']: .6f}  (t={regression['t_stat_slope']:.2f}, p={regression['p_value_slope']:.4f})")
    print(f"  R-squared         = {regression['r_squared']:.4f}")
    print(f"  n obs / df resid  = {regression['n_obs']} / {regression['df_resid']}")
    print("=" * 100)


def run_validation_checks(stats: pd.DataFrame, regression: dict) -> None:
    print("\nVALIDATION CHECKS")
    ordered = stats.sort_values("avg_firm_size")  # smallest -> largest

    smallest, largest = ordered.iloc[0], ordered.iloc[-1]
    check1 = smallest["premium_over_capm"] > largest["premium_over_capm"]
    print(f"[{'PASS' if check1 else 'FAIL'}] Smallest portfolio premium over CAPM ({smallest['premium_over_capm']:.4%}) "
          f"> largest ({largest['premium_over_capm']:.4%})")

    check2 = regression["slope"] < 0
    print(f"[{'PASS' if check2 else 'FAIL'}] Regression slope is negative ({regression['slope']:.6f})")

    beta_ok = stats["beta"].between(0.3, 2.0).all()
    print(f"[{'PASS' if beta_ok else 'CHECK'}] Betas in plausible range 0.3-2.0: "
          f"{stats['beta'].min():.2f} to {stats['beta'].max():.2f}")

    geo_le_arith = (stats["annualized_geo_return"] <= stats["annualized_arith_return"]).all()
    print(f"[{'PASS' if geo_le_arith else 'FAIL'}] Geometric return <= arithmetic return for all portfolios")

    stdev_monotonic = ordered["annualized_stdev"].iloc[0] > ordered["annualized_stdev"].iloc[-1]
    print(f"[{'PASS' if stdev_monotonic else 'CHECK'}] Smallest portfolio stdev ({ordered['annualized_stdev'].iloc[0]:.4%}) "
          f"> largest ({ordered['annualized_stdev'].iloc[-1]:.4%})")

    print("(Compare broad shape -- not exact values -- to the Ibbotson textbook exhibit; "
          "re-run with different --start/--end to confirm results move sensibly.)")


def main():
    parser = argparse.ArgumentParser(description="Run the size premium regression study.")
    parser.add_argument("--start", default=None, help="Start period, e.g. 1990-01")
    parser.add_argument("--end", default=None, help="End period, e.g. 2025-12")
    parser.add_argument("--out-dir", default=str(Path(__file__).parent / "output"))
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument(
        "--weighting",
        choices=["value_weighted", "equal_weighted"],
        default="value_weighted",
        help="value_weighted matches the Ibbotson/Kroll convention (default); "
             "equal_weighted is a diagnostic that dilutes the influence of the largest names within a decile.",
    )
    args = parser.parse_args()

    run(args.start, args.end, Path(args.out_dir), force_download=args.force_download, weighting=args.weighting)


if __name__ == "__main__":
    main()
