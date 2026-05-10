#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runWorkflow } from "../extensions/siso-agent-router/workflow-layer.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const casesPath = path.join(root, "benchmarks", "harness", "codex-vs-siso-cases.json");
const outDir = path.join(root, "artifacts", "evals");

const args = new Set(process.argv.slice(2));
const smoke = args.has("--smoke");
const live = args.has("--live") || process.env.SISO_CODEX_LIVE_EVAL === "1";
const outPath = path.join(outDir, live ? "codex-vs-siso-live-report.json" : "codex-vs-siso-local-report.json");

function readCases() {
  const suite = JSON.parse(fs.readFileSync(casesPath, "utf8"));
  assert.equal(suite.version, 1);
  assert.ok(Array.isArray(suite.cases));
  assert.ok(suite.cases.length > 0);
  return suite;
}

function planningPrompt(testCase) {
  return [
    "Produce a specialist allocation plan as strict JSON only.",
    "Do not edit files or run tools.",
    "Schema fields: taskKind, complexity, riskTier, domains, assignments[].",
    "Each assignment should include task, specialistId, executionProfile, requiredChecks, acceptanceCriteria, and reason.",
    "",
    "Task:",
    testCase.task,
  ].join("\n");
}

function extractJsonObject(text) {
  const raw = String(text ?? "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1])
    return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}

function parseCodexJsonl(stdout) {
  const events = [];
  for (const line of String(stdout ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    try {
      events.push(JSON.parse(trimmed));
    }
    catch {
      events.push({ type: "unparsed", text: trimmed });
    }
  }
  return events;
}

function extractCodexPlan(stdout) {
  const events = parseCodexJsonl(stdout);
  const messages = events
    .map((event) => event.item?.type === "agent_message" ? event.item.text : event.type === "agent_message" ? event.text : undefined)
    .filter((text) => typeof text === "string" && text.trim());
  const finalMessage = messages.at(-1) ?? "";

  if (!finalMessage) {
    return {
      planParsed: false,
      parseError: "no agent_message found in Codex JSONL output",
      eventCount: events.length,
    };
  }

  try {
    const plan = JSON.parse(extractJsonObject(finalMessage));
    const assignments = Array.isArray(plan.assignments) ? plan.assignments : [];
    return {
      planParsed: true,
      eventCount: events.length,
      assignmentCount: assignments.length,
      specialistIds: assignments.map((assignment) => assignment.specialistId ?? assignment.specialist).filter(Boolean),
      finalMessagePreview: finalMessage.slice(0, 2000),
    };
  }
  catch (error) {
    return {
      planParsed: false,
      eventCount: events.length,
      parseError: error.message,
      finalMessagePreview: finalMessage.slice(0, 2000),
    };
  }
}

function runDirectCodexPlanning(testCase) {
  const commandPreview = `codex exec --json ${JSON.stringify(planningPrompt(testCase))}`;
  if (!live) {
    return {
      status: "skipped",
      reason: "live mode disabled; pass --live and SISO_CODEX_LIVE_EVAL=1 to run direct Codex planning",
      commandPreview,
    };
  }

  if (process.env.SISO_CODEX_LIVE_EVAL !== "1") {
    return {
      status: "skipped",
      reason: "refusing live Codex eval without SISO_CODEX_LIVE_EVAL=1",
      commandPreview,
    };
  }

  const result = spawnSync("codex", ["exec", "--json", planningPrompt(testCase)], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    timeout: Number(process.env.SISO_CODEX_LIVE_EVAL_TIMEOUT_MS ?? 120000),
  });

  const parsed = extractCodexPlan(result.stdout);
  return {
    status: result.status === 0 ? "completed" : "failed",
    exitCode: result.status,
    signal: result.signal,
    ...parsed,
    stdoutPreview: String(result.stdout ?? "").slice(0, 4000),
    stderrPreview: String(result.stderr ?? "").slice(0, 4000),
    commandPreview,
  };
}

function summarizeSisoWorkflow(workflow) {
  const worker = workflow.workers?.[0];
  const metadata = worker?.task?.metadata ?? {};
  const description = worker?.task?.description ?? "";
  return {
    status: workflow.status,
    parentTaskId: workflow.task?.id,
    allocationId: workflow.task?.metadata?.allocationId,
    workerCount: workflow.workers?.length ?? 0,
    owner: worker?.task?.owner,
    specialistId: metadata.specialistId,
    executionProfile: metadata.requestedExecutionProfile ?? metadata.executionProfile,
    assignmentId: metadata.assignmentId,
    stepId: metadata.stepId,
    requiredChecks: metadata.requiredChecks ?? [],
    acceptanceCriteria: metadata.acceptanceCriteria ?? [],
    evidenceContractPresent: /changed_files, checks_run, acceptance_status, risks, blockers/.test(description),
  };
}

function scoreCase(testCase, siso, directCodex) {
  const expected = testCase.expected ?? {};
  const requiredChecks = new Set(siso.requiredChecks ?? []);
  const expectedChecks = expected.requiredChecks ?? [];
  const checksMatched = expectedChecks.every((check) => requiredChecks.has(check));

  const assertions = {
    specialistMatched: siso.specialistId === expected.specialistId,
    executionProfileMatched: siso.owner === expected.executionProfile || siso.executionProfile === expected.executionProfile,
    requiredChecksMatched: checksMatched,
    acceptanceCriteriaPresent: (siso.acceptanceCriteria?.length ?? 0) >= (expected.acceptanceCriteriaMin ?? 1),
    allocationMetadataPresent: Boolean(siso.allocationId && siso.assignmentId && siso.stepId),
    evidenceContractPresent: siso.evidenceContractPresent === true,
    directCodexComparable: directCodex.status === "completed" && directCodex.planParsed === true && directCodex.assignmentCount > 0,
  };

  const localPassed = Object.entries(assertions)
    .filter(([key]) => key !== "directCodexComparable")
    .every(([, value]) => value === true);

  return {
    assertions,
    localPassed,
    liveComparable: assertions.directCodexComparable,
  };
}

async function runCase(testCase) {
  const sisoWorkflow = await runWorkflow(testCase.task, {
    dryRun: true,
    noTools: true,
    council: false,
    controllerAllocate: true,
    executeControllerAllocation: async () => testCase.controllerPlan,
  });

  const siso = summarizeSisoWorkflow(sisoWorkflow);
  const directCodex = runDirectCodexPlanning(testCase);
  const score = scoreCase(testCase, siso, directCodex);

  if (smoke) {
    assert.equal(score.localPassed, true, `${testCase.id} failed local SISO parity assertions`);
    assert.equal(siso.status, "planned");
  }

  return {
    id: testCase.id,
    task: testCase.task,
    siso,
    directCodex,
    score,
  };
}

const suite = readCases();
const results = [];
for (const testCase of suite.cases) {
  results.push(await runCase(testCase));
}

const localPassed = results.filter((item) => item.score.localPassed).length;
const liveComparable = results.filter((item) => item.score.liveComparable).length;
const localPercent = Math.round((localPassed / results.length) * 100);

const report = {
  generatedAt: new Date().toISOString(),
  mode: live ? "live-or-skipped" : "local-harness",
  caseCount: results.length,
  localPassed,
  localPercent,
  liveComparable,
  liveEnabled: live,
  results,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (smoke) {
  assert.equal(localPassed, results.length);
  assert.equal(localPercent, 100);
}

console.log(`SISO_CODEX_VS_SISO_EVAL_OK local=${localPercent}% liveComparable=${liveComparable}/${results.length} report=${path.relative(root, outPath)}`);
