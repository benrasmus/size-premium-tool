import DashboardClient from "@/components/DashboardClient";
import { loadResults } from "@/lib/data";

export default function DashboardPage() {
  const results = loadResults();
  return <DashboardClient results={results} />;
}
