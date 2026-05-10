#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => {
  console.error(`SISO_TEST_SPACE_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const plan = readJson("test-space/test-plan.json");
const registry = readJson("docs/capabilities/registry.json");
const capIds = new Set(registry.capabilities.map((cap) => cap.id));
const scripts = readJson("package.json").scripts ?? {};

if (plan.schemaVersion !== 1) fail("test-plan schemaVersion must be 1");
if (!Array.isArray(plan.suites) || plan.suites.length === 0) fail("test-plan suites missing");

const ids = new Set();
for (const suite of plan.suites) {
  if (!suite.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suite.id)) fail(`bad suite id: ${suite.id}`);
  if (ids.has(suite.id)) fail(`duplicate suite id: ${suite.id}`);
  ids.add(suite.id);
  if (!suite.capabilityId || !capIds.has(suite.capabilityId)) fail(`${suite.id} references unknown capability ${suite.capabilityId}`);
  if (!suite.status) fail(`${suite.id} missing status`);
  if (!Array.isArray(suite.commands) || suite.commands.length === 0) fail(`${suite.id} commands missing`);
  for (const command of suite.commands) {
    const match = /^npm run ([a-z0-9:.-]+)$/.exec(command);
    if (match && !scripts[match[1]]) fail(`${suite.id} references missing npm script ${match[1]}`);
  }
  if (!suite.scenario) fail(`${suite.id} missing scenario`);
  if (!fs.existsSync(path.join(root, "test-space", suite.scenario))) fail(`${suite.id} missing scenario file ${suite.scenario}`);
}

for (const rel of ["test-space/README.md", "test-space/notes/improvements.md", "test-space/coverage.json"]) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

const coverage = readJson("test-space/coverage.json");
if (coverage.schemaVersion !== 1) fail("coverage schemaVersion must be 1");
const coverageRows = Array.isArray(coverage.capabilities)
  ? coverage.capabilities
  : (Array.isArray(coverage.coveredCapabilityIds)
    ? coverage.coveredCapabilityIds.map((capabilityId) => ({ capabilityId, coverage: "covered" }))
    : undefined);
if (!Array.isArray(coverageRows)) fail("coverage capabilities missing");
const coverageIds = new Set();
for (const row of coverageRows) {
  if (!row.capabilityId || !capIds.has(row.capabilityId)) fail(`coverage references unknown capability ${row.capabilityId}`);
  if (coverageIds.has(row.capabilityId)) fail(`coverage duplicates ${row.capabilityId}`);
  coverageIds.add(row.capabilityId);
}
for (const suite of plan.suites) {
  if (!coverageIds.has(suite.capabilityId)) {
    fail(`${suite.id} capabilityId ${suite.capabilityId} missing from coverage`);
  }
}

console.log("SISO_TEST_SPACE_SMOKE_OK");
