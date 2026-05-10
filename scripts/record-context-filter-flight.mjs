#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filterProviderPayload } from "../extensions/siso-context-manager/provider-filter.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const startedAt = new Date();
const events = [];
const risks = [];
const artifacts = [];
const iso = (date = new Date()) => date.toISOString();
const add = (event) => events.push({ at: iso(), ...event });
function runValidation(command, args, label) {
  add({ type: "tool.started", tool: command, summary: label });
  const start = Date.now();
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", env: { ...process.env, SISO_STATUS_TOOL_MODE: "full" } });
  const durationMs = Date.now() - start;
  add({ type: "tool.completed", tool: command, exitCode: result.status ?? 1, durationMs, summary: label });
  add({ type: "command.validation", command: label, status: result.status === 0 ? "passed" : "failed", durationMs });
  if (result.status !== 0) risks.push({ id: `${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-failed`, severity: "error", summary: `${label} failed` });
  return result;
}

add({ type: "run.started", summary: "Context filter flight recording started." });
add({ type: "contract.matched", contractId: "context-safety", requiredCommands: ["npm run smoke:context", "npm run smoke:context-details", "npm run smoke:context-explain", "npm run smoke:context-tier"] });

const payload = {
  model: "context-flight-model",
  messages: [
    { role: "system", content: "SISO kernel " + "A".repeat(5000) },
    ...Array.from({ length: 18 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `old turn ${i} ` + "noise ".repeat(500) })),
    { role: "user", content: "Current task: prove context filtering is recorded." }
  ],
  tools: [{ name: "read", description: "Read a file" }]
};
const filtered = filterProviderPayload(payload, { runId: "context-flight" });
const metrics = filtered.metrics ?? {};
add({
  type: "context.filtered",
  summary: "Filtered provider payload for context flight sample.",
  beforeChars: metrics.originalChars ?? metrics.beforeChars ?? 0,
  afterChars: metrics.compactChars ?? metrics.afterChars ?? 0,
  estimatedSavedTokens: metrics.estimatedSavedTokens ?? 0
});

let failed = false;
for (const [cmd, args, label] of [
  ["node", ["scripts/smoke-context-filter.mjs"], "npm run smoke:context"],
  ["node", ["scripts/smoke-context-details-compact.mjs"], "npm run smoke:context-details"],
  ["node", ["scripts/smoke-context-explain.mjs"], "npm run smoke:context-explain"],
  ["node", ["scripts/smoke-child-context-tier.mjs"], "npm run smoke:context-tier"]
]) {
  const result = runValidation(cmd, args, label);
  if (result.status !== 0) { failed = true; break; }
}

const completedAt = new Date();
const validationEvents = events.filter((event) => event.type === "command.validation");
const toolCompleted = events.filter((event) => event.type === "tool.completed");
const contextEvents = events.filter((event) => event.type === "context.filtered");
const savedTokens = contextEvents.reduce((sum, event) => sum + (event.estimatedSavedTokens ?? 0), 0);
const trace = {
  schemaVersion: 1,
  runId: `context-filter-${startedAt.toISOString().replace(/[:.]/g, "-")}`,
  task: "Record context filtering as flight-recorder evidence.",
  startedAt: startedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  agent: { profile: "local-context", model: "none" },
  links: {
    capabilityIds: ["flight-recorder", "context-filtering", "context-memory-tools"],
    contractIds: ["context-safety"],
    benchmarkSuiteIds: ["context-efficiency"],
    testSpaceSuites: ["context-tools", "flight-recorder"]
  },
  events: [
    ...events,
    { type: "scorecard.updated", at: iso(), summary: `Estimated saved tokens from recorded context filtering: ${savedTokens}.` },
    { type: "run.completed", at: completedAt.toISOString(), status: failed ? "failed" : "completed" }
  ],
  metrics: {
    toolCalls: toolCompleted.length,
    failedToolCalls: toolCompleted.filter((event) => event.exitCode !== 0).length,
    filesRead: 0,
    filesChanged: 1,
    validationsRun: validationEvents.length,
    validationsPassed: validationEvents.filter((event) => event.status === "passed").length,
    childAgents: 0,
    contextFilteredEvents: contextEvents.length,
    durationMs: completedAt.getTime() - startedAt.getTime()
  },
  scorecard: {
    taskAchievement: failed ? 40 : 88,
    toolEfficiency: 84,
    contextEfficiency: savedTokens > 0 ? 92 : 60,
    codeIntelligence: 50,
    delegation: 100,
    skillUsage: 50,
    safetyGovernance: failed ? 50 : 88,
    memoryImproveability: 80,
    operatorExperience: 80,
    overall: failed ? 63 : 79
  },
  artifacts,
  risks
};
const outDir = path.join(root, "test-space", "results", "flight-runs");
fs.mkdirSync(outDir, { recursive: true });
const file = `${trace.runId}.json`;
fs.writeFileSync(path.join(outDir, file), JSON.stringify(trace, null, 2) + "\n");
const indexPath = path.join(outDir, "index.json");
const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { schemaVersion: 1, runs: [] };
index.runs = [{ runId: trace.runId, file, completedAt: trace.completedAt, status: failed ? "failed" : "completed", overall: trace.scorecard.overall }, ...index.runs.filter((run) => run.runId !== trace.runId)].slice(0, 100);
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
console.log(`SISO_FLIGHT_CONTEXT_FILTER_RECORDED status=${failed ? "failed" : "completed"} validations=${trace.metrics.validationsPassed}/${trace.metrics.validationsRun} contextFiltered=${trace.metrics.contextFilteredEvents} path=test-space/results/flight-runs/${file}`);
process.exit(failed ? 1 : 0);
