"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResultsFile, WeightingKey } from "@/lib/types";
import { fmtMoneyMillions, fmtNumber, fmtPercent } from "@/lib/format";
import WeightingToggle from "./WeightingToggle";

export default function DashboardClient({ results }: { results: ResultsFile }) {
  const [scenarioKey, setScenarioKey] = useState(results.default_scenario);
  const [weightingKey, setWeightingKey] = useState<WeightingKey>(results.default_weighting);
  const scenario = results.scenarios[scenarioKey];
  const variant = scenario.weightings[weightingKey];
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const chartData = useMemo(
    () =>
      variant.portfolios
        .slice()
        .sort((a, b) => a.log_avg_firm_size - b.log_avg_firm_size)
        .map((p) => ({
          logSize: p.log_avg_firm_size,
          actual: p.premium_over_capm * 100,
          smoothed: p.smoothed_premium_over_capm * 100,
          portfolio: p.portfolio,
          avgFirmSize: p.avg_firm_size,
        })),
    [variant]
  );

  const sortedPortfolios = useMemo(
    () => variant.portfolios.slice().sort((a, b) => b.avg_firm_size - a.avg_firm_size),
    [variant]
  );

  const reg = variant.regression;

  const chartColors = {
    grid: isDark ? "#334155" : "#e2e8f0",
    axis: isDark ? "#64748b" : "#94a3b8",
    tick: isDark ? "#94a3b8" : "#64748b",
    scatter: isDark ? "#e2e8f0" : "#0f172a",
    line: isDark ? "#f87171" : "#dc2626",
    tooltipBg: isDark ? "#1e293b" : "#ffffff",
    tooltipBorder: isDark ? "#334155" : "#e2e8f0",
    tooltipText: isDark ? "#e2e8f0" : "#0f172a",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Size Premium Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Independent, CRSP-derived (Ken French Data Library) approximation of the Ibbotson/Duff &amp; Phelps
          size-premium study. Not an exact replication of Kroll&apos;s data &mdash; see{" "}
          <a href="/methodology" className="underline">
            Methodology
          </a>{" "}
          for details and limitations.
        </p>
      </div>

      <div className="space-y-2">
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
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {variant.meta.start_period} to {variant.meta.end_period} ({variant.meta.n_months} months) &middot;
            Market ERP: {fmtPercent(variant.meta.market_erp)}
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {weightingKey === "value_weighted"
            ? "Value-weighted: bigger companies within a decile count more — matches the Ibbotson/Kroll convention and how a market-cap-weighted portfolio actually behaves."
            : "Equal-weighted: every company within a decile counts the same, regardless of size — a diagnostic that dilutes the influence of the largest names (e.g. mega-caps within Decile 10). See Methodology."}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
              <th className="text-left py-2 px-3">Portfolio</th>
              <th className="text-right py-2 px-3">Avg Firm Size</th>
              <th className="text-right py-2 px-3">log(Size)</th>
              <th className="text-right py-2 px-3">Beta</th>
              <th className="text-right py-2 px-3">Std Dev</th>
              <th className="text-right py-2 px-3">Geo Return</th>
              <th className="text-right py-2 px-3">Arith Return</th>
              <th className="text-right py-2 px-3">Arith Excess Return</th>
              <th className="text-right py-2 px-3">CAPM Premium</th>
              <th className="text-right py-2 px-3">Premium over CAPM</th>
              <th className="text-right py-2 px-3">Smoothed Premium</th>
            </tr>
          </thead>
          <tbody>
            {sortedPortfolios.map((p) => (
              <tr key={p.portfolio} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{p.portfolio}</td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">{fmtMoneyMillions(p.avg_firm_size)}</td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">{fmtNumber(p.log_avg_firm_size)}</td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">{fmtNumber(p.beta)}</td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">{fmtPercent(p.annualized_stdev)}</td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">{fmtPercent(p.annualized_geo_return)}</td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">{fmtPercent(p.annualized_arith_return)}</td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">
                  {fmtPercent(p.annualized_arith_excess_return)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">{fmtPercent(p.capm_indicated_premium)}</td>
                <td className="py-2 px-3 text-right tabular-nums dark:text-slate-300">{fmtPercent(p.premium_over_capm)}</td>
                <td className="py-2 px-3 text-right tabular-nums font-medium dark:text-slate-100">
                  {fmtPercent(p.smoothed_premium_over_capm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Cross-Sectional Regression: Premium over CAPM = a + b &times; log(Avg Firm Size)
          </h2>
          <table className="text-sm w-full">
            <tbody>
              <Row label="Intercept (a)" value={fmtNumber(reg.intercept, 5)} sub={`t = ${fmtNumber(reg.t_stat_intercept)}, p = ${fmtNumber(reg.p_value_intercept, 4)}`} />
              <Row label="Slope (b)" value={fmtNumber(reg.slope, 6)} sub={`t = ${fmtNumber(reg.t_stat_slope)}, p = ${fmtNumber(reg.p_value_slope, 4)}`} />
              <Row label="R-squared" value={fmtNumber(reg.r_squared, 4)} />
              <Row label="N obs / df resid" value={`${reg.n_obs} / ${reg.df_resid}`} />
            </tbody>
          </table>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Premium over CAPM vs. log(Size)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="logSize"
                type="number"
                domain={["dataMin - 0.3", "dataMax + 0.3"]}
                tickFormatter={(v: number) => v.toFixed(1)}
                label={{ value: "log(Avg Firm Size)", position: "insideBottom", offset: -5, fontSize: 12, fill: chartColors.tick }}
                fontSize={12}
                stroke={chartColors.axis}
                tick={{ fill: chartColors.tick }}
              />
              <YAxis
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                label={{ value: "Premium over CAPM", angle: -90, position: "insideLeft", fontSize: 12, fill: chartColors.tick }}
                fontSize={12}
                stroke={chartColors.axis}
                tick={{ fill: chartColors.tick }}
              />
              <Tooltip
                formatter={(value, name) => [`${Number(value).toFixed(2)}%`, String(name)] as [string, string]}
                labelFormatter={() => ""}
                contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText }}
                labelStyle={{ color: chartColors.tooltipText }}
                itemStyle={{ color: chartColors.tooltipText }}
              />
              <Scatter dataKey="actual" fill={chartColors.scatter} name="Actual" />
              <Line dataKey="smoothed" stroke={chartColors.line} dot={false} name="Smoothed (fitted)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <td className="py-2 text-slate-500 dark:text-slate-400">{label}</td>
      <td className="py-2 text-right font-medium tabular-nums dark:text-slate-100">
        {value}
        {sub && <span className="block text-xs text-slate-400 dark:text-slate-500 font-normal">{sub}</span>}
      </td>
    </tr>
  );
}
