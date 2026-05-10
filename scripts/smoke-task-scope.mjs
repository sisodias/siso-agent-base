#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  attachTaskScope,
  currentTaskScope,
  isRecordVisibleToScope,
  listScopedTaskRecords,
  readScopedTaskRecord,
  summarizeTaskFleet,
  taskBudgetState,
  updateScopedTaskRecord,
  writeScopedTaskRecord,
} from "../extensions/siso-agent-router/task-registry.js";

const taskRoot = mkdtempSync(join(tmpdir(), "siso-task-scope-"));
process.env.SISO_TASK_ROOT_DIR = taskRoot;
process.env.SISO_ROOT_SESSION_ID = "root-a";
process.env.SISO_PARENT_SESSION_ID = "parent-a";
process.env.SISO_AGENT_ID = "agent-a";
process.env.SISO_PARENT_TASK_ID = "task-parent-a";
process.env.SISO_FLEET_ID = "fleet-scope";
process.env.PI_SUBAGENT_DEPTH = "1";

const scope = currentTaskScope();
assert.equal(scope.rootSessionId, "root-a");
assert.equal(scope.parentSessionId, "parent-a");
assert.equal(scope.ownerAgentId, "agent-a");
assert.equal(scope.spawnedByTaskId, "task-parent-a");
assert.equal(scope.depth, 1);

const scopedRecord = attachTaskScope({
  id: "siso-child-scope-a",
  status: "completed",
  task: "Verify parent-scoped subagent visibility",
  profile: "minimax.verifier",
  model: "MiniMax M2.7",
  startedAt: "2026-05-08T12:00:00.000Z",
  completedAt: "2026-05-08T12:00:10.000Z",
  updatedAt: "2026-05-08T12:00:10.000Z",
  compactResult: { summary: "Scoped visibility works.", findings: [], files: [], next_action: "Ship it." },
  finalOutput: "Scoped visibility works.",
  tokens: { input: 100, output: 50, totalTokens: 150 },
  toolCalls: 2,
  events: [
    {
      type: "run_started",
      runId: "siso-child-scope-a",
      surface: "child",
      profile: "minimax.verifier",
      model: "MiniMax M2.7",
      timestamp: "2026-05-08T12:00:00.000Z",
    },
    {
      type: "tool_call",
      runId: "siso-child-scope-a",
      surface: "child",
      toolName: "read",
      toolCallId: "tool-scope-1",
      timestamp: "2026-05-08T12:00:03.000Z",
    },
    {
      type: "run_finished",
      runId: "siso-child-scope-a",
      surface: "child",
      status: "completed",
      totalTokens: 150,
      timestamp: "2026-05-08T12:00:10.000Z",
    },
  ],
});

writeScopedTaskRecord(scopedRecord);

assert.equal(scopedRecord.rootSessionId, "root-a");
assert.equal(scopedRecord.parentSessionId, "parent-a");
assert.equal(scopedRecord.ownerAgentId, "agent-a");
assert.equal(scopedRecord.depth, 1);
assert.equal(scopedRecord.fleetId, "fleet-scope");
assert.ok(scopedRecord.taskRecordPath?.endsWith("/root-a/tasks/siso-child-scope-a/task.json"));
assert.ok(scopedRecord.handoffPath?.endsWith("/root-a/tasks/siso-child-scope-a/handoff.md"));
assert.ok(existsSync(scopedRecord.taskRecordPath));
assert.ok(existsSync(scopedRecord.handoffPath));
assert.ok(existsSync(scopedRecord.taskPaths.transcript));
assert.ok(existsSync(scopedRecord.taskPaths.events));

const stored = JSON.parse(readFileSync(scopedRecord.taskRecordPath, "utf8"));
assert.equal(stored.id, "siso-child-scope-a");
assert.equal(stored.description, "Verify parent-scoped subagent visibility");
assert.equal(stored.fleetId, "fleet-scope");
assert.equal(stored.paths.handoff, scopedRecord.handoffPath);
assert.equal(stored.paths.events, scopedRecord.taskPaths.events);
assert.match(readFileSync(scopedRecord.handoffPath, "utf8"), /# SISO Child Task Handoff/);
assert.match(readFileSync(scopedRecord.handoffPath, "utf8"), /Scoped visibility works\./);
assert.match(readFileSync(scopedRecord.handoffPath, "utf8"), /Events: .*events\.jsonl/);
const transcriptLines = readFileSync(scopedRecord.taskPaths.transcript, "utf8").trim().split("\n").map((line) => JSON.parse(line));
assert.equal(transcriptLines.length, 1);
assert.equal(transcriptLines[0].type, "task_update");
assert.equal(transcriptLines[0].taskId, "siso-child-scope-a");
assert.equal(transcriptLines[0].status, "completed");
assert.equal(transcriptLines[0].fleetId, "fleet-scope");
assert.equal(transcriptLines[0].progress.tokens, 150);
assert.equal(transcriptLines[0].progress.tools, 2);
assert.equal(transcriptLines[0].summary, "Scoped visibility works.");
const eventLines = readFileSync(scopedRecord.taskPaths.events, "utf8").trim().split("\n").map((line) => JSON.parse(line));
assert.equal(eventLines.length, 3);
assert.equal(eventLines[0].type, "run_started");
assert.equal(eventLines[0].taskId, "siso-child-scope-a");
assert.equal(eventLines[0].rootSessionId, "root-a");
assert.equal(eventLines[1].type, "tool_call");
assert.equal(eventLines[1].toolName, "read");
assert.equal(eventLines[2].type, "run_finished");
assert.equal(eventLines[2].totalTokens, 150);

assert.equal(isRecordVisibleToScope(scopedRecord, { parentSessionId: "parent-a" }), true);
assert.equal(isRecordVisibleToScope(scopedRecord, { parentSessionId: "parent-b" }), false);
assert.equal(isRecordVisibleToScope(scopedRecord, { rootSessionId: "root-a", includeDescendants: true }), true);
assert.equal(isRecordVisibleToScope(scopedRecord, { rootSessionId: "root-b", includeDescendants: true }), false);

const listed = listScopedTaskRecords(scope, { limit: 10 });
assert.equal(listed.length, 1);
assert.equal(listed[0].id, "siso-child-scope-a");
assert.equal(readScopedTaskRecord("siso-child-scope-a", scope)?.id, "siso-child-scope-a");
assert.equal(readScopedTaskRecord("siso-child-scope-a", { rootSessionId: "root-a", parentSessionId: "parent-b" }), undefined);
const fleet = summarizeTaskFleet(listed);
assert.deepEqual(fleet.fleets, ["fleet-scope"]);
assert.equal(fleet.completed, 1);
assert.equal(fleet.tokens, 150);
assert.equal(fleet.tools, 2);

const deprecatedBudget = taskBudgetState({
  ...scopedRecord,
  budget: {
    maxRuntimeMs: 1,
    maxTokens: 1,
    maxToolCalls: 1,
    maxParallel: 2,
    maxChildren: 5,
  },
}, Date.parse("2026-05-08T12:30:00.000Z"));
assert.deepEqual(deprecatedBudget.budget, { maxParallel: 2, maxChildren: 5 });
assert.equal(deprecatedBudget.exceededAny, false);
assert.deepEqual(deprecatedBudget.exceeded, []);
assert.equal(deprecatedBudget.reason, undefined);

updateScopedTaskRecord("siso-child-scope-a", {
  status: "cancelled",
  error: "Cancelled during smoke test.",
}, scope);
const updatedTranscriptLines = readFileSync(scopedRecord.taskPaths.transcript, "utf8").trim().split("\n").map((line) => JSON.parse(line));
assert.equal(updatedTranscriptLines.length, 2);
assert.equal(updatedTranscriptLines[1].status, "cancelled");
assert.equal(updatedTranscriptLines[1].error, "Cancelled during smoke test.");
assert.match(readFileSync(scopedRecord.taskPaths.summary, "utf8"), /Cancelled during smoke test\./);
const updatedHandoff = readFileSync(scopedRecord.handoffPath, "utf8");
assert.match(updatedHandoff, /Status: cancelled/);
assert.match(updatedHandoff, /Cancelled during smoke test\./);
assert.match(updatedHandoff, /Tokens: 150/);
assert.match(updatedHandoff, /Tools: 2/);

console.log("SISO_TASK_SCOPE_SMOKE_OK");
