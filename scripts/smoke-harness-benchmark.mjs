#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => {
  console.error(`SISO_HARNESS_BENCHMARK_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const plan = readJson("benchmarks/harness/benchmark-plan.json");
const schema = readJson("benchmarks/harness/scorecard.schema.json");
const scripts = readJson("package.json").scripts ?? {};

if (plan.schemaVersion !== 1) fail("benchmark plan schemaVersion must be 1");
if (!Array.isArray(plan.metricCategories) || plan.metricCategories.length < 5) fail("metric categories too small");
if (!Array.isArray(plan.suites) || plan.suites.length === 0) fail("benchmark suites missing");
if (schema.schemaVersion !== 1) fail("scorecard schemaVersion must be 1");
if (!Array.isArray(schema.scores) || !schema.scores.includes("overall")) fail("score schema missing overall");

const ids = new Set();
const categories = new Set(plan.metricCategories);
for (const suite of plan.suites) {
  if (!suite.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suite.id)) fail(`bad suite id ${suite.id}`);
  if (ids.has(suite.id)) fail(`duplicate suite ${suite.id}`);
  ids.add(suite.id);
  if (!categories.has(suite.category)) fail(`${suite.id} invalid category ${suite.category}`);
  if (!suite.taskFile || !fs.existsSync(path.join(root, "benchmarks", "harness", suite.taskFile))) fail(`${suite.id} missing task file`);
  if (!Array.isArray(suite.commands) || suite.commands.length === 0) fail(`${suite.id} commands missing`);
  for (const command of suite.commands) {
    const match = /^npm run ([a-z0-9:._-]+)$/.exec(command);
    if (match && !scripts[match[1]]) fail(`${suite.id} references missing script ${match[1]}`);
    if (command === "bin/siso-doctor readiness" && !fs.existsSync(path.join(root, "bin", "siso-doctor"))) fail("siso-doctor missing");
  }
  if (!Array.isArray(suite.metrics) || suite.metrics.length === 0) fail(`${suite.id} metrics missing`);
}

fs.mkdirSync(path.join(root, "benchmarks", "harness", "results"), { recursive: true });
fs.writeFileSync(path.join(root, "benchmarks", "harness", "results", "benchmark-smoke-summary.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  suiteCount: plan.suites.length,
  categories: plan.metricCategories,
  externalResearchTargets: plan.externalResearchTargets
}, null, 2) + "\n");
console.log(`SISO_HARNESS_BENCHMARK_SMOKE_OK suites=${plan.suites.length} categories=${plan.metricCategories.length}`);
