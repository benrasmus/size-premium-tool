import ExportClient from "@/components/ExportClient";
import { loadResults } from "@/lib/data";

export default function ExportPage() {
  const results = loadResults();
  return <ExportClient results={results} />;
}
