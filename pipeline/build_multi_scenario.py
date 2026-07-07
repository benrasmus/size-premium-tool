"""Build web/data/results.json containing several precomputed date-range scenarios,
each with both a value-weighted and an equal-weighted variant.

The historical study (portfolio stats + cross-sectional regression) is always computed
from French's own historical RF series -- it is never recomputed in the browser. What
IS interactive in the dashboard is *which precomputed date range* to view, *which
weighting scheme* to view, and (on the Lookup page only) the user's current risk-free
rate for the final cost-of-equity build-up.

Value-weighted is the primary convention (matches Ibbotson/Kroll: bigger companies count
more, same as the real economics of holding a market-cap-weighted portfolio). Equal-
weighted is a diagnostic: it dilutes the influence of the largest few names within a
decile (e.g. mega-caps inside Decile 10), which helps distinguish "the whole decile
behaved differently" from "a handful of giant companies moved the average."

This keeps the web app a pure static-JSON reader with no live backend, while still
giving the "let the user pick a start/end window" and "let the user pick a weighting"
behavior via a curated preset list.
"""
from __future__ import annotations

import json
from pathlib import Path

from calculate_portfolio_stats import align_data, compute_portfolio_stats
from calculate_size_premium import add_size_premium
from clean_data import load_factors, load_size_portfolios
from fetch_french_data import fetch_all
from run_regression import apply_smoothed_premium, run_size_premium_regression

OUT_PATH = Path(__file__).parent.parent / "web" / "data" / "results.json"

WEIGHTINGS = {
    "value_weighted": {
        "label": "Value-weighted (Ibbotson/Kroll convention)",
        "returns_key": "returns_vw",
    },
    "equal_weighted": {
        "label": "Equal-weighted (diagnostic: dilutes mega-cap influence)",
        "returns_key": "returns_ew",
    },
}


def build_variant(returns, avg_firm_size, num_firms, factors, start, end) -> dict:
    aligned = align_data(returns, avg_firm_size, num_firms, factors, start=start, end=end)
    stats, meta = compute_portfolio_stats(aligned)
    stats = add_size_premium(stats, meta["market_erp"])
    regression = run_size_premium_regression(stats)
    stats = apply_smoothed_premium(stats, regression)
    regression_out = {k: v for k, v in regression.items() if k != "smoothed_premium_over_capm"}
    return {
        "meta": {**meta, "start_param": start, "end_param": end},
        "regression": regression_out,
        "portfolios": json.loads(stats.reset_index().to_json(orient="records")),
    }


def main():
    paths = fetch_all()
    size_data = load_size_portfolios(paths["size_portfolios"])
    factors = load_factors(paths["factors"])
    avg_firm_size, num_firms = size_data["avg_firm_size"], size_data["num_firms"]

    last_period = size_data["returns_vw"].index.intersection(factors.index).max()
    last_year, last_month = last_period.year, last_period.month

    def years_back(n: int) -> str:
        y, m = last_year - n, last_month
        return f"{y}-{m:02d}"

    date_scenarios = {
        "full_history": {
            "label": "Full history (1926-present)",
            "start": None,
            "end": None,
        },
        "since_1963": {
            "label": "Since 1963 (longest Ibbotson-comparable window)",
            "start": "1963-01",
            "end": None,
        },
        "since_1963_through_2004": {
            "label": "1963-2004 (matches the Pratt/Ibbotson textbook exhibit period)",
            "start": "1963-01",
            "end": "2004-12",
        },
        "last_30_years": {
            "label": "Last 30 years",
            "start": years_back(30),
            "end": None,
        },
        "last_20_years": {
            "label": "Last 20 years",
            "start": years_back(20),
            "end": None,
        },
        "last_10_years": {
            "label": "Last 10 years",
            "start": years_back(10),
            "end": None,
        },
    }

    results = {}
    for key, spec in date_scenarios.items():
        weightings_out = {}
        for w_key, w_spec in WEIGHTINGS.items():
            variant = build_variant(
                size_data[w_spec["returns_key"]], avg_firm_size, num_firms, factors, spec["start"], spec["end"]
            )
            weightings_out[w_key] = {"label": w_spec["label"], **variant}
            print(f"{key} / {w_key}: {variant['meta']['start_period']} to {variant['meta']['end_period']} "
                  f"({variant['meta']['n_months']} months), R^2={variant['regression']['r_squared']:.3f}, "
                  f"slope={variant['regression']['slope']:.5f}")

        results[key] = {
            "label": spec["label"],
            "weightings": weightings_out,
        }

    output = {
        "generated_scenarios": list(date_scenarios.keys()),
        "default_scenario": "since_1963",
        "generated_weightings": list(WEIGHTINGS.keys()),
        "default_weighting": "value_weighted",
        "scenarios": results,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()
