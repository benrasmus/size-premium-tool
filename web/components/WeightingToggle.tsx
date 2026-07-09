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
    <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-sm">
      {results.generated_weightings.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-3 py-1 rounded whitespace-nowrap transition ${
            value === key
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          {key === "value_weighted" ? "Value-weighted" : "Equal-weighted"}
        </button>
      ))}
    </div>
  );
}
