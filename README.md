# Size Premium Tool

An independent, CRSP-derived approximation of the Ibbotson/Duff & Phelps size-premium
study (the kind of table found in Shannon Pratt's *Valuing a Business*, Exhibits 9-6/9-7),
built from free public data, for use in closely-held company valuations.

**This is not Kroll's Cost of Capital Navigator and does not attempt to reproduce its
numbers exactly.** See [Methodology](web/app/(app)/methodology/page.tsx) (also rendered
in-app at `/methodology`) for full details, data sources, and known limitations.

## Quick start

```bash
git clone <this-repo-url>
cd <repo>/web
npm install
npm run dev
```

Open `http://localhost:3000`. That's it — there's no password by default, and the data
that ships in the repo (`web/data/results.json`) is ready to use as-is. No Python or API
keys required to just run the dashboard.

## How it works

- `pipeline/` — a Python pipeline that downloads Ken French's Data Library size-decile
  portfolios and Fama/French factors (both free, CRSP-derived), computes beta/return/
  risk-premium statistics per decile, and fits the cross-sectional "smoothed size
  premium" regression, for several preset historical sample windows and two weighting
  schemes (value-weighted, matching the Ibbotson/Kroll convention, and equal-weighted, a
  diagnostic for how much of a result is driven by a handful of very large companies).
- `web/` — a Next.js dashboard that reads the pipeline's output (`web/data/results.json`)
  and renders it as tables/charts, plus a Cost of Equity Lookup calculator that bridges
  from EBITDA to equity value and applies the size premium regression.

The pipeline is a **separate, offline step** — the web app never talks to Ken French's
servers or runs Python at runtime. It only reads the static JSON file the pipeline last
generated, which is committed to the repo and refreshed automatically (see below).

## Keeping the data fresh

A scheduled GitHub Action (`.github/workflows/refresh-data.yml`) re-runs the pipeline
monthly and commits an updated `web/data/results.json` back to this repo — so anyone who
clones or pulls later gets recent data with zero setup. If you fork this repo, GitHub
disables scheduled workflows on forks by default; enable it under your fork's **Actions**
tab (or trigger it manually any time via **Actions → Refresh size premium data → Run
workflow**) if you want your fork to self-refresh too.

To refresh manually instead:

```bash
cd pipeline
python -m venv .venv
.venv\Scripts\activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt

# Regenerate web/data/results.json with all preset sample windows and both weightings:
python build_multi_scenario.py

# Or run a single ad-hoc window and inspect the console/CSV output before trusting it:
python run_pipeline.py --start 1990-01 --end 2020-12 --weighting equal_weighted
```

`run_pipeline.py` also prints validation checks (slope sign, small-vs-large premium
ordering, beta plausibility, etc.) — re-check these any time you change the sample
window logic or update the source data.

## Password-protecting your own deployment (optional)

By default, anyone who runs this locally or deploys it gets an open site with no login
— appropriate for personal/local use. If you're deploying somewhere publicly reachable
and want to gate access, set these environment variables (`web/.env.local` locally, or
your host's env var settings in production) and the login screen activates automatically:

| Variable | Purpose |
|---|---|
| `SITE_PASSWORD` | If set, a shared password is required to access the site. If unset (the default), the site is open. |
| `AUTH_SALT` | Any random string; changing it invalidates existing login sessions. |

See `web/.env.local.example` for a template.

**Important (Windows + cloud-synced folders):** if this project ever lives inside a
Google Drive / OneDrive / Dropbox-synced folder, move it to a plain local folder before
running `npm install`. The sync client's file locking causes `npm install` to silently
corrupt `node_modules`, and Next.js's dev-server file watcher will crash outright if the
project directory and the process's working directory end up on different drives.

## Deployment

The web app is a standard Next.js app and deploys to Vercel with no special
configuration:

1. Push this repo to GitHub (or use your fork).
2. Import it in Vercel, set the project root to `web/`.
3. (Optional) set `SITE_PASSWORD` and `AUTH_SALT` as Vercel environment variables if you
   want the site password-protected.
4. Deploy.

Vercel's Hobby (free) tier works for personal use. If this becomes more than a personal
tool, note that Hobby's terms restrict it to non-commercial use — Pro (~$20/month)
removes that restriction and raises build/runtime limits. No database is required since
the app only reads a static JSON file.

## Known limitations (see Methodology for full detail)

- 10 size-decile portfolios, not Kroll's 25 — likely **understates** the size premium
  for very small/micro-cap subject companies.
- Portfolio breakpoints, weighting, and smoothing conventions differ from Duff & Phelps'
  proprietary methodology in ways beyond just portfolio count.
- The size effect is genuinely time-varying — in recent 10/20/30-year windows the
  regression slope flips positive (large caps outperforming on a risk-adjusted basis),
  which reverses the "classic" long-run relationship seen since 1963. The in-app
  value-weighted/equal-weighted toggle helps diagnose whether that's driven by a
  handful of mega-cap companies or is a broader pattern (it's broader — see
  Methodology). This is documented, real, time-varying behavior in the underlying
  markets, not a bug.

## License

MIT — see [LICENSE](LICENSE).
