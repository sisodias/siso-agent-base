#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { executeSpawnWithNativeSubagentBridge } from "../extensions/siso-agent-router/native-subagent-bridge.js";
import { buildSpawnSpec } from "../extensions/siso-agent-router/spawn-layer.js";
import { listSessionAgents } from "../extensions/siso-agent-router/session-store.js";
import { attachTaskScope, listScopedTaskRecords, writeScopedTaskRecord } from "../extensions/siso-agent-router/task-registry.js";

delete globalThis.__SISO_ROUTER_STATUS__;

let releaseNative;
let firstNativeParams;
const nativeStarted = executeSpawnWithNativeSubagentBridge({
  task: "inspect animation status",
  ctx: {
    getAllTools: () => [{ name: "subagent", execute: async () => ({ content: [{ type: "text", text: "unused" }] }) }],
  },
  executeNative: async (params) => {
    firstNativeParams = params;
    await new Promise((resolve) => {
      releaseNative = resolve;
    });
    return {
      content: [{ type: "text", text: "native child done" }],
      details: {
        id: "native-child-real",
        results: [{
          messages: [{
            role: "assistant",
            content: [
              { type: "toolCall", name: "read", arguments: { path: "README.md" } },
              { type: "text", text: "native child done" },
            ],
          }],
          usage: { input: 1200, output: 300, contextTokens: 1500 },
        }],
      },
    };
  },
});

await Promise.resolve();
assert.deepEqual(firstNativeParams.tools, ["read", "find", "ls", "bash"], "native scout should inherit the read-only Pi tool policy");
assert.equal(firstNativeParams.noTools, undefined);
assert.doesNotMatch(firstNativeParams.task, /Return JSON only/i, "native subagent prompt should stay final-answer oriented, not legacy JSON-only");

const running = globalThis.__SISO_ROUTER_STATUS__;
assert.ok(running?.child, "native subagent should publish a child snapshot while running");
assert.equal(running.child.status, "running");
assert.equal(running.child.runtime, "native-subagent");
const childId = running.child.id;

releaseNative();
const result = await nativeStarted;

assert.equal(result.usedNative, true);
const resultText = result.content[0].text;
assert.match(resultText, /✓ Agent complete · scout · 1 check/);
assert.match(resultText, /inspect animation status/);
assert.match(resultText, /native child done/);
assert.doesNotMatch(resultText, new RegExp(childId), "native tool result should keep raw child ids in structured details, not visible text");
assert.doesNotMatch(resultText, /runtime=native-subagent|child_status=|kind=/, "native tool result should not render telemetry key-value lines");
assert.equal(result.details.id, childId);
assert.equal(result.details.status, "completed");
assert.equal(result.details.compactResult.summary, "native child done");
assert.equal(result.details.tokens.totalTokens, 1500);
assert.equal(result.details.toolCalls, 1);
const completed = globalThis.__SISO_ROUTER_STATUS__;
const completedChild = completed.children[childId];
assert.equal(completedChild.status, "completed");
assert.equal(completedChild.runtime, "native-subagent");
assert.equal(completedChild.compactResult.summary, "native child done");
assert.equal(completedChild.tokens.totalTokens, 1500);
assert.equal(completedChild.toolCalls, 1);

const longNativeText = `Native child produced a long audit. ${"x".repeat(5000)}`;
const longNative = await executeSpawnWithNativeSubagentBridge({
  task: "inspect a very noisy native child",
  ctx: {
    getAllTools: () => [{ name: "subagent", execute: async () => ({ content: [{ type: "text", text: "unused" }] }) }],
  },
  executeNative: async () => ({
    content: [{ type: "text", text: longNativeText }],
    details: {
      giantRawTranscript: "RAW_NATIVE_TRANSCRIPT_SHOULD_NOT_BE_RETURNED".repeat(160),
      results: [{
        messages: [{
          role: "assistant",
          content: [{ type: "text", text: longNativeText }],
        }],
        usage: { input: 10, output: 20, contextTokens: 30 },
      }],
    },
  }),
});
assert.equal(longNative.usedNative, true);
assert.ok(longNative.content[0].text.length < 1800, "native subagent tool result should not echo huge child output");
assert.match(longNative.content[0].text, /SISO_NATIVE_RESULT_TRUNCATED/);
assert.equal(longNative.details.rawOutputChars, longNativeText.length);
assert.ok(longNative.details.truncatedOutputChars > 0);
assert.doesNotMatch(JSON.stringify(longNative.details), /RAW_NATIVE_TRANSCRIPT_SHOULD_NOT_BE_RETURNED/, "native details should not return raw nested transcript blobs");

let noToolsNativeParams;
const noToolsNative = await executeSpawnWithNativeSubagentBridge({
  task: "inspect without tools",
  noTools: true,
  ctx: {
    getAllTools: () => [{ name: "subagent", execute: async () => ({ content: [{ type: "text", text: "unused" }] }) }],
  },
  executeNative: async (params) => {
    noToolsNativeParams = params;
    return {
      content: [{ type: "text", text: "native child done without tools" }],
      details: { results: [{ usage: { input: 1, output: 1, contextTokens: 2 } }] },
    };
  },
});
assert.equal(noToolsNative.usedNative, true);
assert.deepEqual(noToolsNativeParams.tools, undefined);
assert.equal(noToolsNativeParams.noTools, true, "native noTools should be explicit when the parent disables child tools");

const taskRoot = mkdtempSync(join(tmpdir(), "siso-spawn-metadata-tasks-"));
const childRunDir = mkdtempSync(join(tmpdir(), "siso-spawn-metadata-runs-"));
process.env.SISO_TASK_ROOT_DIR = taskRoot;
process.env.SISO_CHILD_RUN_DIR = childRunDir;
process.env.SISO_SESSION_ROOT_DIR = mkdtempSync(join(tmpdir(), "siso-spawn-metadata-sessions-"));
process.env.SISO_ROOT_SESSION_ID = "root-spawn-meta";
process.env.SISO_PARENT_SESSION_ID = "parent-spawn-meta";
process.env.SISO_AGENT_ID = "agent-spawn-meta";
const dryRun = await executeSpawnWithNativeSubagentBridge({
  task: "preview a legacy budgeted fleet child",
  dryRun: true,
  background: true,
  fleetId: "fleet-budgeted",
  budget: { maxTokens: 321, maxTools: 7, maxRuntimeMs: 9000, maxParallel: 2, maxFleetTokens: 1000, maxFleetTools: 10 },
});
assert.equal(dryRun.usedNative, false);
assert.equal(dryRun.details.fleetId, "fleet-budgeted");
assert.equal(dryRun.details.budget.maxTokens, undefined);
assert.equal(dryRun.details.budget.maxTools, undefined);
assert.equal(dryRun.details.budget.maxFleetTokens, undefined);
assert.equal(dryRun.details.budget.maxFleetTools, undefined);
assert.equal(dryRun.details.budget.maxRuntimeMs, undefined);
assert.equal(dryRun.details.budget.maxParallel, 2);
assert.equal(dryRun.details.decision.model, "claude-haiku-4-5-20251001");
const legacyPiSpec = buildSpawnSpec("preview a legacy budgeted fleet child", {}, dryRun.details.decision);
assert.ok(legacyPiSpec.args.includes("--model"), "legacy Pi spawn must pass the routed model to the child command");
assert.equal(
  legacyPiSpec.args[legacyPiSpec.args.indexOf("--model") + 1],
  "claude-haiku-4-5-20251001",
  "legacy Pi spawn should not fall back to the default Opus model",
);
const scoped = listScopedTaskRecords({
  rootSessionId: "root-spawn-meta",
  parentSessionId: "parent-spawn-meta",
  ownerAgentId: "agent-spawn-meta",
}, { limit: 10 });
assert.equal(scoped.length, 1);
assert.equal(scoped[0].fleetId, "fleet-budgeted");
assert.equal(scoped[0].budget.maxTokens, undefined);
assert.equal(scoped[0].budget.maxTools, undefined);
assert.equal(scoped[0].budget.maxFleetTokens, undefined);
assert.equal(scoped[0].budget.maxFleetTools, undefined);
assert.equal(scoped[0].budget.maxRuntimeMs, undefined);
assert.equal(scoped[0].budget.maxParallel, 2);
const sessionAgents = listSessionAgents({
  rootSessionId: "root-spawn-meta",
  parentSessionId: "parent-spawn-meta",
  ownerAgentId: "agent-spawn-meta",
});
assert.equal(sessionAgents.length, 1, "spawn results should dual-write to the session-scoped agent store");
assert.equal(sessionAgents[0].parentSessionId, "parent-spawn-meta");
assert.equal(sessionAgents[0].events, undefined, "session-scoped agent records should stay compact");

const nativeScoped = await executeSpawnWithNativeSubagentBridge({
  task: "run a native child that must be visible to scoped task accounting",
  fleetId: "fleet-native",
  budget: { maxParallel: 1 },
  allocationMetadata: {
    allocationId: "alloc-native-direct",
    assignmentId: "alloc-native-direct-assign-1",
    parentTaskId: "siso-task-parent-native-direct",
    stepId: "spawn-worker-1",
    specialistId: "minimax.scout",
    domain: "agent-system",
    ownershipBoundary: "Only inspect scoped native child accounting.",
    verificationContract: { verifier: "minimax.verifier", requiredChecks: ["npm run smoke:native-subagent-status --silent"] },
  },
  ctx: {
    getAllTools: () => [{ name: "subagent", execute: async () => ({ content: [{ type: "text", text: "unused" }] }) }],
  },
  executeNative: async () => ({
    content: [{ type: "text", text: "native scoped child done" }],
    details: {
      results: [{
        messages: [{
          role: "assistant",
          content: [
            { type: "toolCall", name: "read", arguments: { path: "package.json" } },
            { type: "text", text: "native scoped child done" },
          ],
        }],
        usage: { input: 11, output: 7, contextTokens: 18 },
      }],
    },
  }),
});
assert.equal(nativeScoped.usedNative, true);
const nativeScopedRecords = listScopedTaskRecords({
  rootSessionId: "root-spawn-meta",
  parentSessionId: "parent-spawn-meta",
  ownerAgentId: "agent-spawn-meta",
}, { limit: 20 }).filter((record) => record.fleetId === "fleet-native");
assert.equal(nativeScopedRecords.length, 1, "native foreground subagents should write scoped task records for /agents and fleet accounting");
assert.equal(nativeScopedRecords[0].status, "completed");
assert.equal(nativeScopedRecords[0].role, "minimax.scout");
assert.equal(nativeScopedRecords[0].allocationId, "alloc-native-direct");
assert.equal(nativeScopedRecords[0].assignmentId, "alloc-native-direct-assign-1");
assert.equal(nativeScopedRecords[0].parentTaskId, "siso-task-parent-native-direct");
assert.equal(nativeScopedRecords[0].stepId, "spawn-worker-1");
assert.equal(nativeScopedRecords[0].specialistId, "minimax.scout");
assert.equal(nativeScopedRecords[0].domain, "agent-system");
assert.equal(nativeScopedRecords[0].ownershipBoundary, "Only inspect scoped native child accounting.");
assert.equal(nativeScopedRecords[0].verificationContract.verifier, "minimax.verifier");
assert.equal(nativeScopedRecords[0].progress.tokens, 18);
assert.equal(nativeScopedRecords[0].progress.tools, 1);
assert.match(nativeScopedRecords[0].result.summary, /native scoped child done/);

let releaseScopedNative;
const runningScopedNative = executeSpawnWithNativeSubagentBridge({
  task: "hold a native fleet slot open",
  fleetId: "fleet-native-cap",
  budget: { maxParallel: 1 },
  ctx: {
    getAllTools: () => [{ name: "subagent", execute: async () => ({ content: [{ type: "text", text: "unused" }] }) }],
  },
  executeNative: async () => {
    await new Promise((resolve) => {
      releaseScopedNative = resolve;
    });
    return {
      content: [{ type: "text", text: "native fleet slot released" }],
      details: { results: [{ usage: { input: 2, output: 3, contextTokens: 5 } }] },
    };
  },
});
await Promise.resolve();
const nativeFleetBlocked = await executeSpawnWithNativeSubagentBridge({
  task: "queue behind native fleet slot",
  background: true,
  fleetId: "fleet-native-cap",
  budget: { maxParallel: 1 },
});
assert.equal(nativeFleetBlocked.usedNative, false);
assert.equal(nativeFleetBlocked.details.status, "queued");
assert.match(nativeFleetBlocked.details.queuedReason, /Fleet fleet-native-cap spawn blocked: max_parallel 1\/1/);
releaseScopedNative();
await runningScopedNative;
const nativeCapRecords = listScopedTaskRecords({
  rootSessionId: "root-spawn-meta",
  parentSessionId: "parent-spawn-meta",
  ownerAgentId: "agent-spawn-meta",
}, { limit: 30 }).filter((record) => record.fleetId === "fleet-native-cap");
assert.equal(nativeCapRecords.length, 2);
assert.ok(nativeCapRecords.some((record) => record.status === "completed" && /native fleet slot released/.test(record.result?.summary ?? "")));
assert.ok(nativeCapRecords.some((record) => record.status === "queued" && /max_parallel 1\/1/.test(record.queuedReason ?? "")));

const broadTaskDryRun = await executeSpawnWithNativeSubagentBridge({
  task: "Inspect the codebase structure and summarize the main components, entry points, and notable technologies.",
  dryRun: true,
  background: true,
  fleetId: "fleet-broad-budget",
  budget: { maxTokens: 2000, maxTools: 20 },
});
assert.equal(broadTaskDryRun.usedNative, false);
assert.equal(broadTaskDryRun.details.budget, undefined);

writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-existing-fleet-member",
  status: "background",
  task: "Already running in the capped fleet",
  fleetId: "fleet-capped",
  rootSessionId: "root-spawn-meta",
  parentSessionId: "parent-spawn-meta",
  ownerAgentId: "agent-spawn-meta",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: "2026-05-08T12:20:00.000Z",
  updatedAt: "2026-05-08T12:20:00.000Z",
  tokens: { input: 90, output: 10, totalTokens: 100 },
  toolCalls: 3,
  compactResult: { summary: "Still running.", findings: [], files: [], next_action: "wait" },
}));
const blocked = await executeSpawnWithNativeSubagentBridge({
  task: "should not start while capped fleet is full",
  background: true,
  fleetId: "fleet-capped",
  budget: { maxParallel: 1, maxFleetTokens: 1000, maxFleetTools: 100 },
});
assert.equal(blocked.usedNative, false);
assert.equal(blocked.details.status, "queued");
assert.match(blocked.details.queuedReason, /Fleet fleet-capped spawn blocked: max_parallel 1\/1/);
const capped = listScopedTaskRecords({
  rootSessionId: "root-spawn-meta",
  parentSessionId: "parent-spawn-meta",
  ownerAgentId: "agent-spawn-meta",
}, { limit: 20 }).filter((record) => record.fleetId === "fleet-capped");
assert.equal(capped.length, 2);
assert.ok(capped.some((record) => record.status === "queued" && /max_parallel 1\/1/.test(record.queuedReason ?? "")));
assert.ok(capped.some((record) => record.status === "queued" && record.queuedSpawn?.task === "should not start while capped fleet is full"));

console.log("SISO_NATIVE_SUBAGENT_STATUS_SMOKE_OK");
