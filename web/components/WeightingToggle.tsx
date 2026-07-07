import type { ResultsFile, WeightingKey } from "@/lib/types";

export default function WeightingToggle({
  results,
  value,
  onChange,
}: {
  results: ResultsFile;
  value: WeightingKey;
  onChange: (key: WeightingKey) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
      {results.generated_weightings.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-3 py-1 rounded whitespace-nowrap transition ${
            value === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {key === "value_weighted" ? "Value-weighted" : "Equal-weighted"}
        </button>
      ))}
    </div>
  );
}
