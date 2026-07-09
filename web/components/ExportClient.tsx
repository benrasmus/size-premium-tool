"use client";

import { useState } from "react";
import type { ResultsFile, WeightingKey } from "@/lib/types";
import { downloadText, toCsv } from "@/lib/download";
import WeightingToggle from "./WeightingToggle";

export default function ExportClient({ results }: { results: ResultsFile }) {
  const [scenarioKey, setScenarioKey] = useState(results.default_scenario);
  const [weightingKey, setWeightingKey] = useState<WeightingKey>(results.default_weighting);
  const scenario = results.scenarios[scenarioKey];
  const variant = scenario.weightings[weightingKey];

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Data Export</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Export the size premium study for use in a workpaper or external analysis. To export a specific cost-of-equity
          valuation result, use the export buttons on the{" "}
          <a href="/lookup" className="underline">
            Cost of Equity Lookup
          </a>{" "}
          page.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sample window:</label>
        <select
          value={scenarioKey}
          onChange={(e) => setScenarioKey(e.target.value)}
          className="rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1.5 text-sm bg-white"
        >
          {results.generated_scenarios.map((key) => (
            <option key={key} value={key}>
              {results.scenarios[key].label}
            </option>
          ))}
        </select>
        <WeightingToggle results={results} value={weightingKey} onChange={setWeightingKey} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Portfolio table</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          All 10 size-decile portfolios: average firm size, beta, returns, standard deviation, CAPM premium, and
          premium over CAPM for the selected window and weighting.
        </p>
        <button
          onClick={() =>
            downloadText(
              `size-premium-portfolios-${scenarioKey}-${weightingKey}.csv`,
              toCsv(variant.portfolios as unknown as Record<string, unknown>[]),
              "text/csv"
            )
          }
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
        >
          Download portfolio table (CSV)
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Regression output</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Intercept, slope, R-squared, standard errors, t-statistics, p-values, and degrees of freedom for the
          cross-sectional smoothing regression.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() =>
              downloadText(
                `size-premium-regression-${scenarioKey}-${weightingKey}.csv`,
                toCsv([variant.regression as unknown as Record<string, unknown>]),
                "text/csv"
              )
            }
            className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
          >
            Download regression (CSV)
          </button>
          <button
            onClick={() =>
              downloadText(
                `size-premium-regression-${scenarioKey}-${weightingKey}.json`,
                JSON.stringify({ meta: variant.meta, regression: variant.regression }, null, 2),
                "application/json"
              )
            }
            className="rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Download regression (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
