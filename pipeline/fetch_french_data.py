"""Download and cache the two Ken French Data Library files this study depends on.

Source: https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html
Both are free, public, CRSP-derived. No API key required.
"""
import io
import zipfile
from pathlib import Path

import requests

BASE_URL = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp"

FILES = {
    "size_portfolios": {
        "zip_name": "Portfolios_Formed_on_ME_CSV.zip",
        "csv_name": "Portfolios_Formed_on_ME.csv",
    },
    "factors": {
        "zip_name": "F-F_Research_Data_Factors_CSV.zip",
        "csv_name": "F-F_Research_Data_Factors.csv",
    },
}

CACHE_DIR = Path(__file__).parent / "raw_cache"


def download_and_extract(key: str, cache_dir: Path = CACHE_DIR, force: bool = False) -> Path:
    """Download one of the known files (if not already cached) and return the path to the extracted CSV."""
    spec = FILES[key]
    cache_dir.mkdir(parents=True, exist_ok=True)
    csv_path = cache_dir / spec["csv_name"]

    if csv_path.exists() and not force:
        return csv_path

    url = f"{BASE_URL}/{spec['zip_name']}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        zf.extract(spec["csv_name"], path=cache_dir)

    return csv_path


def fetch_all(force: bool = False) -> dict:
    """Download (or reuse cached) copies of both source files. Returns {key: Path}."""
    return {key: download_and_extract(key, force=force) for key in FILES}


if __name__ == "__main__":
    paths = fetch_all()
    for key, path in paths.items():
        print(f"{key}: {path} ({path.stat().st_size:,} bytes)")
