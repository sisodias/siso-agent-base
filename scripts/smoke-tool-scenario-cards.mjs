#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => {
  console.error(`SISO_TOOL_SCENARIO_CARDS_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const cardsDoc = readJson("docs/tools/scenario-cards.json");
const registry = readJson("docs/capabilities/registry.json");
const contracts = readJson("docs/contracts/contracts.json");
const benchmarks = readJson("benchmarks/harness/benchmark-plan.json");
const scripts = readJson("package.json").scripts ?? {};

if (cardsDoc.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!Array.isArray(cardsDoc.cards) || cardsDoc.cards.length === 0) fail("cards missing");

const capabilityIds = new Set(registry.capabilities.map((c) => c.id));
const contractIds = new Set(contracts.contracts.map((c) => c.id));
const benchmarkIds = new Set(benchmarks.suites.map((s) => s.id));
const highPriorityTools = [
  "repoSearch",
  "readMany",
  "projectTree",
  "projectMap",
  "rankedRepoMap",
  "fileOutline",
  "symbolSearch",
  "contextPack",
  "briefRepo",
  "runCheck",
  "autopilotPlan",
  "workspaceStatus",
  "workspaceDiff",
  "capabilitySearch",
  "contractDiff",
  "sourceDrift",
  "doctorReadiness",
];

const ids = new Set();
const tools = new Set();
const requiredArrays = [
  "workflowStages",
  "useWhen",
  "avoidWhen",
  "replacesShellPatterns",
  "requiredInputs",
  "expectedOutputs",
  "failureModes",
  "relatedCapabilities",
  "relatedContracts",
  "relatedBenchmarkSuites",
  "validationCommands",
];

for (const card of cardsDoc.cards) {
  if (!card.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card.id)) fail(`bad card id ${card.id}`);
  if (ids.has(card.id)) fail(`duplicate card id ${card.id}`);
  ids.add(card.id);
  if (!card.tool || typeof card.tool !== "string") fail(`${card.id} tool missing`);
  tools.add(card.tool);
  if (!card.summary || card.summary.length < 20) fail(`${card.id} summary too short`);
  for (const field of requiredArrays) {
    if (!Array.isArray(card[field])) fail(`${card.id} ${field} must be an array`);
  }
  if (card.workflowStages.length === 0) fail(`${card.id} workflowStages empty`);
  if (card.useWhen.length === 0) fail(`${card.id} useWhen empty`);
  if (card.avoidWhen.length === 0) fail(`${card.id} avoidWhen empty`);
  if (card.expectedOutputs.length === 0) fail(`${card.id} expectedOutputs empty`);
  for (const capabilityId of card.relatedCapabilities) {
    if (!capabilityIds.has(capabilityId)) fail(`${card.id} references missing capability ${capabilityId}`);
  }
  for (const contractId of card.relatedContracts) {
    if (!contractIds.has(contractId)) fail(`${card.id} references missing contract ${contractId}`);
  }
  for (const suiteId of card.relatedBenchmarkSuites) {
    if (!benchmarkIds.has(suiteId)) fail(`${card.id} references missing benchmark suite ${suiteId}`);
  }
  for (const command of card.validationCommands) {
    const match = /^npm run ([a-z0-9:._-]+)$/.exec(command);
    if (match && !scripts[match[1]]) fail(`${card.id} references missing npm script ${match[1]}`);
  }
}

for (const tool of highPriorityTools) {
  if (!tools.has(tool)) fail(`missing scenario card for high-priority tool ${tool}`);
}

console.log(`SISO_TOOL_SCENARIO_CARDS_SMOKE_OK cards=${cardsDoc.cards.length}`);
