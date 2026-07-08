"use client";

import { useMemo, useState } from "react";
import type { ResultsFile, WeightingKey } from "@/lib/types";
import { fmtDollarsCompact, fmtMultiple, fmtPercent } from "@/lib/format";
import {
  assessExtrapolation,
  galbraithSizePremium,
  impliedMultiple,
  smoothedPremiumForSize,
  type ExtrapolationSeverity,
} from "@/lib/sizePremium";
import { downloadText, toCsv } from "@/lib/download";
import WeightingToggle from "./WeightingToggle";

const SENSITIVITY_MULTIPLES_OFFSETS = [-1, -0.5, -0.25, 0, 0.25, 0.5, 1];

type SizePremiumSource = "public" | "galbraith";

const SEVERITY_STYLES: Record<ExtrapolationSeverity, string> = {
  none: "",
  mild: "text-amber-600 bg-amber-50 border-amber-200",
  moderate: "text-amber-800 bg-amber-50 border-amber-300",
  severe: "text-red-700 bg-red-50 border-red-300",
};

export default function LookupClient({ results }: { results: ResultsFile }) {
  const [scenarioKey, setScenarioKey] = useState(results.default_scenario);
  const [weightingKey, setWeightingKey] = useState<WeightingKey>(results.default_weighting);
  const scenario = results.scenarios[scenarioKey];
  const variant = scenario.weightings[weightingKey];

  // Defaults reflect a small, closely-held business on purpose -- this is exactly the size range
  // where the public-market size premium regression and real transaction multiples diverge most.
  // See Methodology.
  const [ebitda, setEbitda] = useState(400_000);
  const [multiple, setMultiple] = useState(2.5);
  const [debt, setDebt] = useState(0);
  const [cash, setCash] = useState(0);
  const [preferred, setPreferred] = useState(0);
  const [minorityInterest, setMinorityInterest] = useState(0);
  const [beta, setBeta] = useState(1.0);
  const [erp, setErp] = useState(variant.meta.market_erp);
  const [riskFreeRate, setRiskFreeRate] = useState(0.045);
  const [csrp, setCsrp] = useState(0);
  const [growthRate, setGrowthRate] = useState(0.025);
  const [sizePremiumSource, setSizePremiumSource] = useState<SizePremiumSource>("public");
  const [marketMultipleLow, setMarketMultipleLow] = useState(2.0);
  const [marketMultipleHigh, setMarketMultipleHigh] = useState(3.5);
  const [smallBizThreshold, setSmallBizThreshold] = useState(2_000_000);

  const calc = useMemo(() => {
    const enterpriseValue = ebitda * multiple;
    const equityValue = enterpriseValue - debt - preferred - minorityInterest + cash;
    const equityValueMillions = equityValue / 1_000_000;
    const validSize = equityValueMillions > 0;

    const publicPremium = validSize ? smoothedPremiumForSize(variant.regression, equityValueMillions) : NaN;
    const galbraithPremium = validSize ? galbraithSizePremium(equityValueMillions) : NaN;
    const sizePremium = sizePremiumSource === "galbraith" ? galbraithPremium : publicPremium;

    const extrapolation = validSize ? assessExtrapolation(variant, equityValueMillions) : null;

    const costOfEquityBeforeCsrp = riskFreeRate + beta * erp + (validSize ? sizePremium : 0);
    const costOfEquityAfterCsrp = costOfEquityBeforeCsrp + csrp;

    const dcfImpliedMultiple = impliedMultiple(costOfEquityAfterCsrp, growthRate);
    const marketMultipleMid = (marketMultipleLow + marketMultipleHigh) / 2;
    const withinMarketRange =
      dcfImpliedMultiple !== null && dcfImpliedMultiple >= marketMultipleLow && dcfImpliedMultiple <= marketMultipleHigh;
    const multipleGapRatio =
      dcfImpliedMultiple !== null ? dcfImpliedMultiple / marketMultipleMid : null;

    const recommendMarketMultiple = validSize && equityValue < smallBizThreshold;

    return {
      enterpriseValue,
      equityValue,
      equityValueMillions,
      validSize,
      publicPremium,
      galbraithPremium,
      sizePremium,
      extrapolation,
      costOfEquityBeforeCsrp,
      costOfEquityAfterCsrp,
      dcfImpliedMultiple,
      marketMultipleMid,
      withinMarketRange,
      multipleGapRatio,
      recommendMarketMultiple,
    };
  }, [
    ebitda, multiple, debt, cash, preferred, minorityInterest, beta, erp, riskFreeRate, csrp,
    growthRate, sizePremiumSource, marketMultipleLow, marketMultipleHigh, smallBizThreshold, variant,
  ]);

  const sensitivity = useMemo(() => {
    return SENSITIVITY_MULTIPLES_OFFSETS.map((offset) => {
      const m = multiple + offset;
      if (m <= 0) return null;
      const ev = ebitda * m;
      const eq = ev - debt - preferred - minorityInterest + cash;
      const eqMillions = eq / 1_000_000;
      const valid = eqMillions > 0;
      const premium = valid
        ? sizePremiumSource === "galbraith"
          ? galbraithSizePremium(eqMillions)
          : smoothedPremiumForSize(variant.regression, eqMillions)
        : NaN;
      const coe = riskFreeRate + beta * erp + (valid ? premium : 0) + csrp;
      const impMult = impliedMultiple(coe, growthRate);
      return { multiple: m, ev, eq, premium, coe, impMult, valid };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
  }, [multiple, ebitda, debt, cash, preferred, minorityInterest, beta, erp, riskFreeRate, csrp, growthRate, sizePremiumSource, variant]);

  const exportSummary = () => {
    downloadText(
      "cost-of-equity-valuation-summary.csv",
      toCsv([
        {
          study_window: scenario.label,
          weighting: variant.label,
          size_premium_source: sizePremiumSource,
          ebitda: ebitda,
          ebitda_multiple: multiple,
          debt: debt,
          cash: cash,
          preferred: preferred,
          minority_interest: minorityInterest,
          enterprise_value: calc.enterpriseValue,
          equity_value: calc.equityValue,
          beta: beta,
          equity_risk_premium: erp,
          current_risk_free_rate: riskFreeRate,
          size_premium_smoothed: calc.validSize ? calc.sizePremium : "",
          extrapolation_severity: calc.extrapolation?.severity ?? "",
          company_specific_risk_premium: csrp,
          cost_of_equity_before_csrp: calc.costOfEquityBeforeCsrp,
          cost_of_equity_after_csrp: calc.costOfEquityAfterCsrp,
          terminal_growth_rate: growthRate,
          dcf_implied_multiple: calc.dcfImpliedMultiple ?? "",
          market_multiple_low: marketMultipleLow,
          market_multiple_high: marketMultipleHigh,
          within_market_range: calc.dcfImpliedMultiple !== null ? calc.withinMarketRange : "",
        },
      ]),
      "text/csv"
    );
  };

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cost of Equity Lookup</h1>
          <p className="text-slate-500 text-sm mt-1">
            Bridge from EBITDA to equity value, then apply the smoothed size premium regression from the{" "}
            <a href="/dashboard" className="underline">
              Dashboard
            </a>{" "}
            to build up a cost of equity for a closely-held company.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={exportSummary}
            className="rounded-md border border-slate-300 text-slate-700 text-sm font-medium px-3 py-1.5 hover:bg-slate-50 transition whitespace-nowrap"
          >
            Export summary (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-slate-300 text-slate-700 text-sm font-medium px-3 py-1.5 hover:bg-slate-50 transition whitespace-nowrap"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <label className="text-sm font-medium text-slate-700">Size premium study window:</label>
        <select
          value={scenarioKey}
          onChange={(e) => setScenarioKey(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
        >
          {results.generated_scenarios.map((key) => (
            <option key={key} value={key}>
              {results.scenarios[key].label}
            </option>
          ))}
        </select>
        <WeightingToggle results={results} value={weightingKey} onChange={setWeightingKey} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Inputs</h2>

          <FieldGroup title="EBITDA bridge to equity value">
            <NumberField
              label="EBITDA ($)"
              value={ebitda}
              onChange={setEbitda}
              step={50_000}
              hint="For very small businesses this is often SDE (Seller's Discretionary Earnings), not EBITDA -- see Methodology"
            />
            <NumberField label="EBITDA multiple" value={multiple} onChange={setMultiple} step={0.25} />
            <NumberField label="Debt ($)" value={debt} onChange={setDebt} step={50_000} />
            <NumberField label="Cash / non-operating assets ($)" value={cash} onChange={setCash} step={50_000} />
            <NumberField label="Preferred stock ($)" value={preferred} onChange={setPreferred} step={50_000} />
            <NumberField label="Minority interest ($)" value={minorityInterest} onChange={setMinorityInterest} step={50_000} />
          </FieldGroup>

          <FieldGroup title="Size premium source">
            <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setSizePremiumSource("public")}
                className={`px-3 py-1 rounded transition ${sizePremiumSource === "public" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                Public market data
              </button>
              <button
                type="button"
                onClick={() => setSizePremiumSource("galbraith")}
                className={`px-3 py-1 rounded transition ${sizePremiumSource === "galbraith" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                Galbraith (2025), private transactions
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {sizePremiumSource === "public"
                ? "This tool's own regression, fit on public company deciles (Dashboard). Reliable for larger companies; extrapolates severely for small subject companies -- see the warning below."
                : "Size Premium = 25% - 2.45% x ln(equity value in $M), from Galbraith (2025), Journal of Entrepreneurial Finance -- fit on private business transaction data rather than public markets. Different data source, different biases -- see Methodology."}
            </p>
          </FieldGroup>

          <FieldGroup title="Cost of equity build-up">
            <NumberField label="Beta" value={beta} onChange={setBeta} step={0.05} />
            <NumberField
              label="Equity risk premium"
              value={erp}
              onChange={setErp}
              step={0.001}
              percent
              hint={`Study default: ${fmtPercent(variant.meta.market_erp)}`}
            />
            <NumberField
              label="Current risk-free rate"
              value={riskFreeRate}
              onChange={setRiskFreeRate}
              step={0.001}
              percent
              hint="Live/current rate you enter -- not the historical rate baked into the study"
            />
            <NumberField
              label="Company-specific risk premium (optional)"
              value={csrp}
              onChange={setCsrp}
              step={0.001}
              percent
            />
            <NumberField
              label="Terminal growth rate (g)"
              value={growthRate}
              onChange={setGrowthRate}
              step={0.005}
              percent
              hint="Used only for the implied cash-flow multiple below (Gordon Growth), not the cost of equity itself"
            />
          </FieldGroup>

          <FieldGroup title="Market multiple comparison">
            <NumberField label="Comparable multiple -- low" value={marketMultipleLow} onChange={setMarketMultipleLow} step={0.1} />
            <NumberField label="Comparable multiple -- high" value={marketMultipleHigh} onChange={setMarketMultipleHigh} step={0.1} />
            <NumberField
              label="Recommend market-multiple method below this equity value ($)"
              value={smallBizThreshold}
              onChange={setSmallBizThreshold}
              step={100_000}
            />
          </FieldGroup>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Valuation Bridge</h2>
            <table className="text-sm w-full">
              <tbody>
                <Row label="Enterprise Value" value={fmtDollarsCompact(calc.enterpriseValue)} />
                <Row label="Equity Value" value={fmtDollarsCompact(calc.equityValue)} />
              </tbody>
            </table>
            {!calc.validSize && (
              <p className="text-xs text-red-600 mt-2">
                Estimated equity value is zero or negative -- adjust inputs to get a valid size premium.
              </p>
            )}
            {calc.validSize && sizePremiumSource === "public" && calc.extrapolation && calc.extrapolation.severity !== "none" && (
              <p className={`text-xs mt-2 p-2 rounded border ${SEVERITY_STYLES[calc.extrapolation.severity]}`}>
                <span className="font-semibold uppercase">{calc.extrapolation.severity} extrapolation:</span>{" "}
                {calc.extrapolation.message}
              </p>
            )}
            {calc.validSize && sizePremiumSource === "galbraith" && (
              <p className="text-xs text-slate-400 mt-2">
                Galbraith's regression is fit on private transaction data typically well under $5M equity value.
                Results far outside that range should be treated with the same caution as any extrapolation.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">
              Cost of Equity Build-up{" "}
              <span className="text-xs font-normal text-slate-400">
                ({sizePremiumSource === "public" ? "public-market size premium" : "Galbraith size premium"})
              </span>
            </h2>
            <table className="text-sm w-full">
              <tbody>
                <Row label="Risk-free rate" value={fmtPercent(riskFreeRate)} />
                <Row label="Beta x ERP" value={fmtPercent(beta * erp)} sub={`beta ${beta.toFixed(2)} x ERP ${fmtPercent(erp)}`} />
                <Row
                  label="Size premium (smoothed)"
                  value={calc.validSize ? fmtPercent(calc.sizePremium) : "--"}
                />
                <Row label="Cost of equity (before company-specific)" value={fmtPercent(calc.costOfEquityBeforeCsrp)} bold />
                <Row label="Company-specific risk premium" value={fmtPercent(csrp)} />
                <Row label="Cost of equity (after company-specific)" value={fmtPercent(calc.costOfEquityAfterCsrp)} bold />
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Implied Multiple &amp; Market Check</h2>
            <table className="text-sm w-full">
              <tbody>
                <Row
                  label="DCF-implied multiple"
                  value={fmtMultiple(calc.dcfImpliedMultiple)}
                  sub={`Gordon Growth: 1 / (cost of equity ${fmtPercent(calc.costOfEquityAfterCsrp)} - growth ${fmtPercent(growthRate)})`}
                  bold
                />
                <Row label="Market comparable range" value={`${fmtMultiple(marketMultipleLow)} -- ${fmtMultiple(marketMultipleHigh)}`} />
                <Row label="Input EBITDA multiple" value={fmtMultiple(multiple)} />
              </tbody>
            </table>
            {calc.dcfImpliedMultiple === null && (
              <p className="text-xs text-red-600 mt-2">
                Cost of equity is at or below the growth rate -- the implied multiple is undefined (infinite). Lower
                the growth rate or check your inputs.
              </p>
            )}
            {calc.dcfImpliedMultiple !== null && !calc.withinMarketRange && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-2">
                <span className="font-semibold">Mismatch:</span> the DCF-implied multiple ({fmtMultiple(calc.dcfImpliedMultiple)}) is{" "}
                {calc.multipleGapRatio !== null && calc.multipleGapRatio > 1
                  ? `${calc.multipleGapRatio.toFixed(1)}x higher than`
                  : "lower than"}{" "}
                your market comparable range ({fmtMultiple(marketMultipleLow)}--{fmtMultiple(marketMultipleHigh)}). At this
                company size, that usually means the build-up/DCF cost of equity is too low to match how these
                businesses actually trade -- see the recommendation below.
              </p>
            )}
            {calc.dcfImpliedMultiple !== null && calc.withinMarketRange && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 mt-2">
                The DCF-implied multiple falls within your market comparable range.
              </p>
            )}
            {calc.recommendMarketMultiple && (
              <p className="text-xs text-slate-500 mt-3 border-t border-slate-100 pt-3">
                Equity value ({fmtDollarsCompact(calc.equityValue)}) is below your {fmtDollarsCompact(smallBizThreshold)}{" "}
                threshold. At this size, a market-multiple (comparable transaction) approach is typically more
                reliable than perpetual-growth DCF/build-up -- treat the figures above as a secondary sanity check,
                not the primary basis for value. See Methodology.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <h2 className="font-semibold text-slate-900 p-5 pb-0">Sensitivity: EBITDA Multiple</h2>
        <table className="min-w-full text-sm mt-3">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wide">
              <th className="text-left py-2 px-3">EBITDA Multiple</th>
              <th className="text-right py-2 px-3">Enterprise Value</th>
              <th className="text-right py-2 px-3">Equity Value</th>
              <th className="text-right py-2 px-3">Size Premium</th>
              <th className="text-right py-2 px-3">Cost of Equity</th>
              <th className="text-right py-2 px-3">Implied Multiple</th>
            </tr>
          </thead>
          <tbody>
            {sensitivity.map((row) => (
              <tr
                key={row.multiple}
                className={`border-b border-slate-100 last:border-0 ${Math.abs(row.multiple - multiple) < 1e-9 ? "bg-slate-50 font-medium" : ""}`}
              >
                <td className="py-2 px-3">{row.multiple.toFixed(2)}x</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtDollarsCompact(row.ev)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtDollarsCompact(row.eq)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.valid ? fmtPercent(row.premium) : "--"}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtPercent(row.coe)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtMultiple(row.impMult)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  percent,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  percent?: boolean;
  hint?: string;
}) {
  const displayValue = percent ? Number((value * 100).toFixed(4)) : value;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={displayValue}
          step={percent ? step * 100 : step}
          onChange={(e) => {
            const raw = Number(e.target.value);
            onChange(percent ? raw / 100 : raw);
          }}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        {percent && <span className="text-sm text-slate-400">%</span>}
      </div>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function Row({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 text-slate-500">{label}</td>
      <td className={`py-2 text-right tabular-nums ${bold ? "font-semibold text-slate-900" : "font-medium"}`}>
        {value}
        {sub && <span className="block text-xs text-slate-400 font-normal">{sub}</span>}
      </td>
    </tr>
  );
}
