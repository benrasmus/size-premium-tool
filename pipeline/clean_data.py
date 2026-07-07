"""Parse Ken French's multi-panel CSV files into clean, decimal-valued DataFrames.

Both source files share the same quirky format: a few lines of free-text preamble,
then one or more "panels", each introduced by a title line, followed by a header
row (leading comma, then column names), followed by monthly data rows keyed by a
YYYYMM integer, terminated by a blank line. Missing data is coded -99.99 or -999.

We only need the monthly panels (not the annual ones baked into the source files) --
annualization is computed by calculate_portfolio_stats.py from monthly data per the
project's own convention, not taken from French's pre-annualized panels.
"""
from __future__ import annotations

import io
from pathlib import Path

import pandas as pd

MISSING_SENTINELS = (-99.99, -999, -999.0)

# Decile columns as they appear in Portfolios_Formed_on_ME.csv, in size order (smallest first).
DECILE_COLUMNS = [
    "Lo 10", "2-Dec", "3-Dec", "4-Dec", "5-Dec",
    "6-Dec", "7-Dec", "8-Dec", "9-Dec", "Hi 10",
]

DECILE_LABELS = {col: f"Decile {i + 1}" for i, col in enumerate(DECILE_COLUMNS)}


def _find_panel(lines: list[str], title_substring: str) -> pd.DataFrame:
    """Locate a panel by a substring of its title line and parse its monthly rows into a DataFrame."""
    title_idx = next(
        (i for i, line in enumerate(lines) if title_substring in line), None
    )
    if title_idx is None:
        raise ValueError(f"Could not find panel titled like {title_substring!r}")

    # Header row is the next non-blank line after the title.
    header_idx = next(
        i for i in range(title_idx + 1, len(lines)) if lines[i].strip() != ""
    )

    # Data rows run until the next blank line (or end of file).
    data_end = next(
        (i for i in range(header_idx + 1, len(lines)) if lines[i].strip() == ""),
        len(lines),
    )

    csv_block = "\n".join(lines[header_idx:data_end])
    df = pd.read_csv(io.StringIO(csv_block), index_col=0)
    df.index.name = "date"
    df.columns = [c.strip() for c in df.columns]
    return df


def _monthly_index_to_period(df: pd.DataFrame) -> pd.DataFrame:
    """Keep only rows whose index looks like a 6-digit YYYYMM key, convert to a monthly Period index."""
    df = df[df.index.astype(str).str.match(r"^\s*\d{6}\s*$")]
    df.index = pd.PeriodIndex(df.index.astype(str).str.strip(), freq="M")
    return df


def _clean_values(df: pd.DataFrame) -> pd.DataFrame:
    df = df.apply(pd.to_numeric, errors="coerce")
    return df.mask(df.isin(MISSING_SENTINELS))


def load_size_portfolios(csv_path: Path) -> dict[str, pd.DataFrame]:
    """Return monthly DataFrames (decile columns only):
    'returns_vw' -- value-weighted returns (Ibbotson/Kroll convention, used for the primary study)
    'returns_ew' -- equal-weighted returns (diagnostic: dilutes the influence of the largest names
                    within a decile, e.g. mega-caps inside Decile 10)
    'num_firms', 'avg_firm_size' -- portfolio composition, identical regardless of weighting scheme
    """
    text = Path(csv_path).read_text(encoding="latin-1")
    lines = text.splitlines()

    panels = {
        "returns_vw": "Average Value Weight Returns -- Monthly",
        "returns_ew": "Average Equal Weighted Returns -- Monthly",
        "num_firms": "Number of Firms in Portfolios",
        "avg_firm_size": "Average Firm Size",
    }

    out = {}
    for key, title in panels.items():
        df = _find_panel(lines, title)
        df = _monthly_index_to_period(df)
        df = df[DECILE_COLUMNS]
        df = _clean_values(df)
        df = df.rename(columns=DECILE_LABELS)
        out[key] = df

    # Returns are published as percent (e.g. 1.23 == 1.23%); convert to decimal.
    out["returns_vw"] = out["returns_vw"] / 100.0
    out["returns_ew"] = out["returns_ew"] / 100.0
    return out


def load_factors(csv_path: Path) -> pd.DataFrame:
    """Return the monthly Fama/French factors DataFrame (Mkt-RF, SMB, HML, RF), as decimals."""
    text = Path(csv_path).read_text(encoding="latin-1")
    lines = text.splitlines()

    # The monthly panel is the first block in this file -- it has no distinct title line,
    # just the column header directly. Find it by locating the first line that starts with
    # a comma and contains "Mkt-RF".
    header_idx = next(
        i for i, line in enumerate(lines) if line.strip().startswith(",") and "Mkt-RF" in line
    )
    data_end = next(
        (i for i in range(header_idx + 1, len(lines)) if lines[i].strip() == ""),
        len(lines),
    )
    csv_block = "\n".join(lines[header_idx:data_end])
    df = pd.read_csv(io.StringIO(csv_block), index_col=0)
    df.index.name = "date"
    df.columns = [c.strip() for c in df.columns]
    df = _monthly_index_to_period(df)
    df = _clean_values(df)
    return df / 100.0
