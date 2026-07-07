import LookupClient from "@/components/LookupClient";
import { loadResults } from "@/lib/data";

export default function LookupPage() {
  const results = loadResults();
  return <LookupClient results={results} />;
}
