import fs from "fs";
import path from "path";
import type { ResultsFile } from "./types";

let cached: ResultsFile | null = null;

export function loadResults(): ResultsFile {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "data", "results.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  cached = JSON.parse(raw) as ResultsFile;
  return cached;
}
