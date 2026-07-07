"use client";

import { useMemo, useState } from "react";
import type { ResultsFile, WeightingKey } from "@/lib/types";
import { fmtDollarsCompact, fmtPercent } from "@/lib/format";
import { isOutsideObservedRange, smoothedPremiumForSize } from "@/lib/sizePremium";
import { downloadText, toCsv } from "@/lib/download";
import WeightingToggle from "./WeightingToggle";

const SENSITIVITY_MULTIPLES_OFFSETS = [-2, -1, -0.5, 0, 0.5, 1, 2];

export default function LookupClient({ results }: { results: ResultsFile }) {
  const [scenarioKey, setScenarioKey] = useState(results.default_scenario);
  const [weightingKey, setWeightingKey] = useState<WeightingKey>(results.default_weighting);
  const scenario = results.scenarios[scenarioKey];
  const variant = scenario.weightings[weightingKey];

  const [ebitda, setEbitda] = useState(3_000_000);
  const [multiple, setMultiple] = useState(6);
  const [debt, setDebt] = useState(1_000_000);
  const [cash, setCash] = useState(250_000);
  const [preferred, setPreferred] = useState(0);
  const [minorityInterest, setMinorityInterest] = useState(0);
  const [beta, setBeta] = useState(1.0);
  const [erp, setErp] = useState(variant.meta.market_erp);
  const [riskFreeRate, setRiskFreeRate] = useState(0.045);
  const [csrp, setCsrp] = useState(0);

  const calc = useMemo(() => {
    const enterpriseValue = ebitda * multiple;
    const equityValue = enterpriseValue - debt - preferred - minorityInterest + cash;
    const equityValueMillions = equityValue / 1_000_000;
    const validSize = equityValueMillions > 0;
    const sizePremium = validSize
      ? smoothedPremiumForSize(variant.regression, equityValueMillions)
      : NaN;
    const outsideRange = validSize ? isOutsideObservedRange(variant, equityValueMillions) : true;
    const costOfEquityBeforeCsrp = riskFreeRate + beta * erp + (validSize ? sizePremium : 0);
    const costOfEquityAfterCsrp = costOfEquityBeforeCsrp + csrp;

    return { enterpriseValue, equityValue, equityValueMillions, validSize, sizePremium, outsideRange, costOfEquityBeforeCsrp, costOfEquityAfterCsrp };
  }, [ebitda, multiple, debt, cash, preferred, minorityInterest, beta, erp, riskFreeRate, csrp, variant]);

  const sensitivity = useMemo(() => {
    return SENSITIVITY_MULTIPLES_OFFSETS.map((offset) => {
      const m = multiple + offset;
      if (m <= 0) return null;
      const ev = ebitda * m;
      const eq = ev - debt - preferred - minorityInterest + cash;
      const eqMillions = eq / 1_000_000;
      const valid = eqMillions > 0;
      const premium = valid ? smoothedPremiumForSize(variant.regression, eqMillions) : NaN;
      const coe = riskFreeRate + beta * erp + (valid ? premium : 0) + csrp;
      return { multiple: m, ev, eq, premium, coe, valid };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
  }, [multiple, ebitda, debt, cash, preferred, minorityInterest, beta, erp, riskFreeRate, csrp, variant]);

  const exportSummary = () => {
    downloadText(
      "cost-of-equity-valuation-summary.csv",
      toCsv([
        {
          study_window: scenario.label,
          weighting: variant.label,
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
          outside_observed_size_range: calc.outsideRange,
          company_specific_risk_premium: csrp,
          cost_of_equity_before_csrp: calc.costOfEquityBeforeCsrp,
          cost_of_equity_after_csrp: calc.costOfEquityAfterCsrp,
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
            <NumberField label="EBITDA ($)" value={ebitda} onChange={setEbitda} step={50_000} />
            <NumberField label="EBITDA multiple" value={multiple} onChange={setMultiple} step={0.25} />
            <NumberField label="Debt ($)" value={debt} onChange={setDebt} step={50_000} />
            <NumberField label="Cash / non-operating assets ($)" value={cash} onChange={setCash} step={50_000} />
            <NumberField label="Preferred stock ($)" value={preferred} onChange={setPreferred} step={50_000} />
            <NumberField label="Minority interest ($)" value={minorityInterest} onChange={setMinorityInterest} step={50_000} />
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
            {calc.validSize && calc.outsideRange && (
              <p className="text-xs text-amber-600 mt-2">
                This equity value is outside the range of company sizes actually observed in the study
                ({variant.portfolios.length} portfolios). The size premium below is an extrapolation of the fitted
                line, not an interpolation -- treat it with extra caution.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Cost of Equity Build-up</h2>
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
