#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => {
  console.error(`SISO_BENCHMARK_RESEARCH_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const mapPath = path.join(root, "research", "benchmarks", "external-benchmark-map.json");
const data = JSON.parse(fs.readFileSync(mapPath, "utf8"));
if (data.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!Array.isArray(data.benchmarks) || data.benchmarks.length < 5) fail("benchmarks missing/too few");
const ids = new Set();
for (const bench of data.benchmarks) {
  if (!bench.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bench.id)) fail(`bad id ${bench.id}`);
  if (ids.has(bench.id)) fail(`duplicate id ${bench.id}`);
  ids.add(bench.id);
  for (const field of ["name", "category", "researchStatus", "sisoUse"]) {
    if (!bench[field]) fail(`${bench.id} missing ${field}`);
  }
  for (const field of ["whatItMeasures", "localMetricsToExtract"]) {
    if (!Array.isArray(bench[field]) || bench[field].length === 0) fail(`${bench.id} missing ${field}`);
  }
}
for (const rel of ["research/benchmarks/README.md", "research/benchmarks/research-questions.md", "research/benchmarks/sources/local-existing-research.md"]) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}
console.log(`SISO_BENCHMARK_RESEARCH_SMOKE_OK benchmarks=${data.benchmarks.length}`);
