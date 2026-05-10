#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const fail = (msg) => {
  console.error(`SISO_TEST_SPACE_COVERAGE_SMOKE_FAIL ${msg}`);
  process.exit(1);
};

const registry = readJson("docs/capabilities/registry.json");
const plan = readJson("test-space/test-plan.json");
const coverage = readJson("test-space/coverage.json");

const capIds = new Set(registry.capabilities.map((cap) => cap.id));
const suiteByCap = new Map();
for (const suite of plan.suites) {
  const list = suiteByCap.get(suite.capabilityId) ?? [];
  list.push(suite);
  suiteByCap.set(suite.capabilityId, list);
}

const validStates = new Set(["covered", "manual", "blocked", "untested", "idea-only", "external"]);
if (!Array.isArray(coverage.capabilities)) fail("coverage.capabilities missing");
if (coverage.capabilities.length !== registry.capabilities.length) {
  fail(`coverage has ${coverage.capabilities.length} entries but registry has ${registry.capabilities.length}`);
}

const coverageIds = new Set();
const summary = {};
for (const row of coverage.capabilities) {
  if (!capIds.has(row.capabilityId)) fail(`coverage references unknown capability ${row.capabilityId}`);
  if (coverageIds.has(row.capabilityId)) fail(`duplicate coverage row ${row.capabilityId}`);
  coverageIds.add(row.capabilityId);
  if (!validStates.has(row.coverage)) fail(`${row.capabilityId} invalid coverage ${row.coverage}`);
  summary[row.coverage] = (summary[row.coverage] ?? 0) + 1;
  const suites = suiteByCap.get(row.capabilityId) ?? [];
  if (row.coverage === "covered" && suites.length === 0) fail(`${row.capabilityId} marked covered without suite`);
  if (row.coverage === "blocked" && !row.reason) fail(`${row.capabilityId} blocked without reason`);
  if (row.coverage === "manual" && !row.reason) fail(`${row.capabilityId} manual without reason`);
}
for (const capId of capIds) {
  if (!coverageIds.has(capId)) fail(`missing coverage row ${capId}`);
}

const generated = {
  generatedAt: new Date().toISOString(),
  totalCapabilities: registry.capabilities.length,
  summary,
  untested: coverage.capabilities.filter((row) => row.coverage === "untested").map((row) => row.capabilityId),
  blocked: coverage.capabilities.filter((row) => row.coverage === "blocked").map((row) => row.capabilityId)
};
const outDir = path.join(root, "test-space", "results");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "coverage-summary.json"), JSON.stringify(generated, null, 2) + "\n");

console.log(`SISO_TEST_SPACE_COVERAGE_SMOKE_OK total=${generated.totalCapabilities} covered=${summary.covered ?? 0} manual=${summary.manual ?? 0} blocked=${summary.blocked ?? 0} untested=${summary.untested ?? 0} ideaOnly=${summary["idea-only"] ?? 0} external=${summary.external ?? 0}`);
