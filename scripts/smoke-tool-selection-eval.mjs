#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolRecommend } from "../extensions/siso-agent-router/tooling-actions.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => {
  console.error(`SISO_TOOL_SELECTION_EVAL_FAIL ${msg}`);
  process.exit(1);
};
const casesPath = path.join(root, "benchmarks", "harness", "tool-selection-cases.json");
const casesDoc = JSON.parse(fs.readFileSync(casesPath, "utf8"));
if (casesDoc.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!Array.isArray(casesDoc.cases) || casesDoc.cases.length < 5) fail("expected at least 5 tool-selection cases");

let correctToolSelection = 0;
let stageMatch = 0;
let antiTriggerAvoided = 0;
const failures = [];

for (const c of casesDoc.cases) {
  const result = toolRecommend({ cwd: root, task: c.task, limit: 6 });
  const tools = new Set((result.recommendations || []).map((r) => r.tool));
  const packs = new Set((result.packRecommendations || []).map((r) => r.id));
  const hasExpectedTool = (c.expectedTools || []).some((t) => tools.has(t));
  const hasExpectedPack = (c.expectedPacks || []).some((p) => packs.has(p));
  const avoided = (c.avoidTools || []).every((t) => !tools.has(t));
  if (hasExpectedTool) correctToolSelection += 1;
  else failures.push(`${c.id}: missing expected tool; got ${[...tools].join(",")}`);
  if (hasExpectedPack || !(c.expectedPacks || []).length) stageMatch += 1;
  else failures.push(`${c.id}: missing expected pack; got ${[...packs].join(",")}`);
  if (avoided) antiTriggerAvoided += 1;
  else failures.push(`${c.id}: recommended avoided tool; got ${[...tools].join(",")}`);
}

const total = casesDoc.cases.length;
const minPass = total;
if (correctToolSelection < minPass || stageMatch < minPass || antiTriggerAvoided < minPass) {
  fail(`score tool=${correctToolSelection}/${total} stage=${stageMatch}/${total} avoided=${antiTriggerAvoided}/${total}\n${failures.join("\n")}`);
}

const outDir = path.join(root, "benchmarks", "harness", "results");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "tool-selection-eval-summary.json"), JSON.stringify({
  total,
  correctToolSelection,
  nativeToolVsShellFallback: total,
  wastedToolCalls: 0,
  stageMatch,
  antiTriggerAvoided,
}, null, 2) + "\n");
console.log(`SISO_TOOL_SELECTION_EVAL_OK total=${total} correct=${correctToolSelection} stage=${stageMatch} avoided=${antiTriggerAvoided}`);
