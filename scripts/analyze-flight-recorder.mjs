#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const runsDir = path.join(root, "test-space", "results", "flight-runs");
const examplesDir = path.join(root, "examples", "flight-recorder");
const outDir = path.join(root, "test-space", "results");
const fail = (msg) => {
  console.error(`SISO_FLIGHT_ANALYSIS_FAIL ${msg}`);
  process.exit(1);
};
const liveFiles = fs.existsSync(runsDir)
  ? fs.readdirSync(runsDir).filter((file) => file.endsWith(".json") && file !== "index.json" && file !== "doctor-readiness-latest.json").sort()
  : [];
const exampleFiles = fs.existsSync(examplesDir)
  ? fs.readdirSync(examplesDir).filter((file) => file.endsWith(".json")).sort()
  : [];
const files = liveFiles.length
  ? liveFiles.map((file) => ({ file: path.join("test-space", "results", "flight-runs", file), abs: path.join(runsDir, file) }))
  : exampleFiles.map((file) => ({ file: path.join("examples", "flight-recorder", file), abs: path.join(examplesDir, file) }));
if (files.length === 0) fail("no flight run traces found");
const traces = files.map(({ file, abs }) => ({ file, trace: JSON.parse(fs.readFileSync(abs, "utf8")) }));

const latestByRunId = new Map();
for (const item of traces) {
  const key = item.trace.runId;
  const prev = latestByRunId.get(key);
  if (!prev || String(item.trace.completedAt ?? item.trace.startedAt) > String(prev.trace.completedAt ?? prev.trace.startedAt)) latestByRunId.set(key, item);
}
const latestTrace = [...traces].sort((a, b) => String(b.trace.completedAt ?? b.trace.startedAt).localeCompare(String(a.trace.completedAt ?? a.trace.startedAt)))[0]?.trace;
const latestRisks = latestTrace?.risks ?? [];
const allScores = traces.map(({ trace }) => trace.scorecard?.overall).filter((value) => typeof value === "number");
const avg = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
const validationsRun = traces.reduce((sum, { trace }) => sum + (trace.metrics?.validationsRun ?? 0), 0);
const validationsPassed = traces.reduce((sum, { trace }) => sum + (trace.metrics?.validationsPassed ?? 0), 0);
const latestByFamily = new Map();
function runFamily(trace) {
  return String(trace.runId ?? "unknown").replace(/-\d{4}-\d{2}-\d{2}T.*$/, "");
}
for (const item of traces) {
  const family = runFamily(item.trace);
  const prev = latestByFamily.get(family);
  if (!prev || String(item.trace.completedAt ?? item.trace.startedAt).localeCompare(String(prev.trace.completedAt ?? prev.trace.startedAt)) > 0) latestByFamily.set(family, item);
}
const activeTraces = [...latestByFamily.values()];
const failedRuns = activeTraces.filter(({ trace }) => trace.events?.some((event) => event.type === "run.completed" && event.status === "failed"));
const warnings = traces.flatMap(({ file, trace }) => (trace.risks ?? []).filter((risk) => risk.severity === "warning").map((risk) => ({ file, ...risk })));
const errors = activeTraces.flatMap(({ file, trace }) => (trace.risks ?? []).filter((risk) => risk.severity === "error").map((risk) => ({ file, ...risk })));
const eventCounts = {};
for (const { trace } of traces) for (const event of trace.events ?? []) eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;

const recommendations = [];
const latestInstallDrift = latestRisks.some((risk) => /installed|install|runtime/i.test(risk.summary));
const historicalInstallDrift = warnings.some((risk) => /installed|install|runtime/i.test(risk.summary));
if (latestInstallDrift) {
  recommendations.push({ priority: "high", id: "repair-install-drift", summary: "Latest run still detects install/runtime drift; sync installed runtime with workspace." });
} else if (historicalInstallDrift) {
  recommendations.push({ priority: "low", id: "install-drift-resolved-monitor", summary: "Historical install/runtime drift was detected but the latest run is clean; keep monitoring." });
}
if (validationsRun && validationsPassed < validationsRun) {
  recommendations.push({ priority: "high", id: "fix-failing-validations", summary: `${validationsRun - validationsPassed} validation(s) failed across flight traces.` });
}
if (!eventCounts["file.read"]) {
  recommendations.push({ priority: "medium", id: "record-file-read-events", summary: "Flight traces do not yet include file.read events; wire read tooling into recorder for context-efficiency metrics." });
}
if (!eventCounts["child.started"]) {
  recommendations.push({ priority: "medium", id: "record-child-agent-events", summary: "Flight traces do not yet include child agent events; wire subagent lifecycle once subagents are healthy." });
}
if (!eventCounts["context.filtered"]) {
  recommendations.push({ priority: "medium", id: "record-context-filter-events", summary: "Flight traces do not yet include context.filtered events; connect context filtering to flight evidence." });
}
if (traces.length < 5) {
  recommendations.push({ priority: "low", id: "collect-more-runs", summary: "Collect at least 5 readiness/code-intel runs before drawing trend conclusions." });
}

const summary = {
  generatedAt: new Date().toISOString(),
  traceCount: traces.length,
  uniqueRunIds: latestByRunId.size,
  averageOverallScore: avg(allScores),
  validationsRun,
  validationsPassed,
  validationPassRate: validationsRun ? Number((validationsPassed / validationsRun).toFixed(3)) : 0,
  failedRunCount: failedRuns.length,
  activeFamilyCount: activeTraces.length,
  warningCount: warnings.length,
  activeErrorCount: errors.length,
  eventCounts,
  recommendations,
  traces: traces.map(({ file, trace }) => ({ file, runId: trace.runId, task: trace.task, startedAt: trace.startedAt, completedAt: trace.completedAt, overall: trace.scorecard?.overall, validationsRun: trace.metrics?.validationsRun, validationsPassed: trace.metrics?.validationsPassed, risks: (trace.risks ?? []).length }))
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "flight-analysis.json"), JSON.stringify(summary, null, 2) + "\n");
const md = [
  "# SISO Flight Recorder Analysis",
  "",
  `Generated: ${summary.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Traces: ${summary.traceCount}`,
  `- Unique run IDs: ${summary.uniqueRunIds}`,
  `- Average overall score: ${summary.averageOverallScore}`,
  `- Validation pass rate: ${summary.validationsPassed}/${summary.validationsRun} (${summary.validationPassRate})`,
  `- Failed active run families: ${summary.failedRunCount}`,
  `- Active run families: ${summary.activeFamilyCount}`,
  `- Historical warnings: ${summary.warningCount}`,
  `- Active errors: ${summary.activeErrorCount}`,
  "",
  "## Recommendations",
  "",
  ...(recommendations.length ? recommendations.map((rec) => `- **${rec.priority}** ${rec.id}: ${rec.summary}`) : ["- none"]),
  "",
  "## Event counts",
  "",
  ...Object.entries(eventCounts).sort().map(([type, count]) => `- ${type}: ${count}`),
  "",
  "## Traces",
  "",
  ...summary.traces.map((trace) => `- \`${trace.file}\` — ${trace.runId}, overall=${trace.overall}, validations=${trace.validationsPassed}/${trace.validationsRun}, risks=${trace.risks}`),
  ""
].join("\n");
fs.writeFileSync(path.join(outDir, "flight-analysis.md"), md);
console.log(`SISO_FLIGHT_ANALYSIS_OK traces=${summary.traceCount} avg=${summary.averageOverallScore} passRate=${summary.validationPassRate} recommendations=${recommendations.length}`);
