#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => {
  console.error(`SISO_FLIGHT_RECORDER_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const schema = readJson("docs/flight-recorder/schema.json");

if (schema.schemaVersion !== 1) fail("schema schemaVersion must be 1");
for (const field of ["eventTypes", "requiredTraceFields", "requiredEventFields", "metricFields", "scoreFields"]) {
  if (!Array.isArray(schema[field]) || schema[field].length === 0) fail(`schema missing ${field}`);
}
const eventTypes = new Set(schema.eventTypes);
const scoreFields = new Set(schema.scoreFields);
const metricFields = new Set(schema.metricFields);
const minScore = schema.scoreScale?.min ?? 0;
const maxScore = schema.scoreScale?.max ?? 100;

function validateTrace(rel) {
  const trace = readJson(rel);
  for (const field of schema.requiredTraceFields) {
    if (!(field in trace)) fail(`${rel} missing ${field}`);
  }
  if (trace.schemaVersion !== 1) fail(`${rel} schemaVersion must be 1`);
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(trace.runId)) fail(`${rel} bad runId`);
  if (!Array.isArray(trace.events) || trace.events.length === 0) fail(`${rel} events missing`);
  for (const event of trace.events) {
    for (const field of schema.requiredEventFields) {
      if (!(field in event)) fail(`${rel} event missing ${field}`);
    }
    if (!eventTypes.has(event.type)) fail(`${rel} invalid event type ${event.type}`);
    if (Number.isNaN(Date.parse(event.at))) fail(`${rel} invalid event timestamp ${event.at}`);
  }
  const seenRunStarted = trace.events.some((event) => event.type === "run.started");
  const seenRunCompleted = trace.events.some((event) => event.type === "run.completed");
  if (!seenRunStarted) fail(`${rel} missing run.started event`);
  if (trace.completedAt && !seenRunCompleted) fail(`${rel} completedAt without run.completed event`);
  for (const field of metricFields) {
    if (!(field in trace.metrics)) fail(`${rel} metrics missing ${field}`);
    if (typeof trace.metrics[field] !== "number" || trace.metrics[field] < 0) fail(`${rel} metric ${field} must be non-negative number`);
  }
  for (const field of scoreFields) {
    if (!(field in trace.scorecard)) fail(`${rel} scorecard missing ${field}`);
    const value = trace.scorecard[field];
    if (typeof value !== "number" || value < minScore || value > maxScore) fail(`${rel} score ${field} out of range`);
  }
  for (const commandEvent of trace.events.filter((event) => event.type === "command.validation")) {
    if (!commandEvent.command) fail(`${rel} validation event missing command`);
    if (!["passed", "failed", "skipped"].includes(commandEvent.status)) fail(`${rel} validation event bad status ${commandEvent.status}`);
  }
  return trace;
}

const traceFiles = [];
const examplesDir = path.join(root, "examples", "flight-recorder");
for (const file of fs.readdirSync(examplesDir).filter((item) => item.endsWith(".json")).sort()) {
  traceFiles.push(path.join("examples", "flight-recorder", file));
}
const liveDir = path.join(root, "test-space", "results", "flight-runs");
if (fs.existsSync(liveDir)) {
  for (const file of fs.readdirSync(liveDir).filter((item) => item.endsWith(".json") && item !== "index.json").sort()) {
    traceFiles.push(path.join("test-space", "results", "flight-runs", file));
  }
}
if (traceFiles.length === 0) fail("no traces");
const traces = traceFiles.map((file) => validateTrace(file));

const outDir = path.join(root, "test-space", "results");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "flight-recorder-summary.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  traces: traceFiles.length,
  traceFiles,
  runIds: traces.map((trace) => trace.runId),
  eventTypes: schema.eventTypes,
  scoreFields: schema.scoreFields
}, null, 2) + "\n");
console.log(`SISO_FLIGHT_RECORDER_SMOKE_OK traces=${traceFiles.length} eventTypes=${schema.eventTypes.length}`);
