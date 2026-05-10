#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "siso-child-control-compact-"));
const runDir = join(tmp, "child-runs");
process.env.SISO_CHILD_RUN_DIR = runDir;
process.env.SISO_TASK_ROOT_DIR = join(tmp, "tasks");
process.env.SISO_ROOT_SESSION_ID = "root-child-control-compact";
process.env.SISO_PARENT_SESSION_ID = "parent-child-control-compact";
process.env.SISO_AGENT_ID = "agent-child-control-compact";

const { controlChildRun } = await import("../extensions/siso-agent-router/spawn-layer.js");
const { default: sisoAgentRouterExtension } = await import("../extensions/siso-agent-router/index.js");

mkdirSync(runDir, { recursive: true });
const id = "siso-child-compact-control";
const stdoutPath = join(runDir, `${id}.stdout.jsonl`);
const stderrPath = join(runDir, `${id}.stderr.log`);
const runRecordPath = join(runDir, `${id}.json`);
const longFinalOutput = `RAW_FINAL_OUTPUT_SHOULD_NOT_APPEAR ${"x".repeat(50_000)}`;
const longEventPayload = `RAW_EVENT_PAYLOAD_SHOULD_NOT_APPEAR ${"y".repeat(30_000)}`;
writeFileSync(stdoutPath, `stdout preview is allowed\n${"z".repeat(12_000)}`, "utf8");
writeFileSync(stderrPath, `stderr preview is allowed\n${"e".repeat(4_000)}`, "utf8");
writeFileSync(runRecordPath, `${JSON.stringify({
  id,
  status: "completed",
  adapter: "pi",
  profile: "minimax.worker",
  lane: "cheap",
  model: "MiniMax M2.7",
  cwd: tmp,
  startedAt: "2026-05-09T00:00:00.000Z",
  updatedAt: "2026-05-09T00:02:00.000Z",
  completedAt: "2026-05-09T00:02:00.000Z",
  rootSessionId: "root-child-control-compact",
  parentSessionId: "parent-child-control-compact",
  ownerAgentId: "agent-child-control-compact",
  stdoutPath,
  stderrPath,
  runRecordPath,
  finalOutput: longFinalOutput,
  compactResult: {
    summary: "Compact child details are enough.",
    findings: [],
    files: [],
    next_action: "none",
    rawTranscript: "RAW_NESTED_COMPACT_RESULT_SHOULD_NOT_APPEAR".repeat(200),
  },
  rawOutputChars: longFinalOutput.length,
  truncatedOutputChars: 0,
  tokens: { input: 1200, output: 300, totalTokens: 1500 },
  toolCalls: 3,
  events: [{
    type: "tool_call",
    runId: id,
    surface: "child",
    toolName: "read",
    toolCallId: longEventPayload,
    timestamp: "2026-05-09T00:01:00.000Z",
  }],
}, null, 2)}\n`, "utf8");

const listed = await controlChildRun({ action: "list", limit: 1 });
assert.equal(listed.records.length, 1);
assert.equal(listed.records[0].id, id);
assert.equal(listed.records[0].eventCount, 1);
assert.equal("events" in listed.records[0], false, "list details should not expose raw event arrays");
assert.equal("finalOutput" in listed.records[0], false, "list details should not expose raw final output");

const logs = await controlChildRun({ action: "logs", id });
assert.match(logs.text, /stdout_preview=/, "logs text can include bounded stdout preview");
assert.match(logs.text, /stderr_preview=/, "logs text can include bounded stderr preview");
assert.equal(logs.records[0].eventCount, 1);
assert.equal("events" in logs.records[0], false, "logs details should not expose raw event arrays");
assert.equal("finalOutput" in logs.records[0], false, "logs details should not expose raw final output");

const detailsJson = JSON.stringify({ listed, logs });
assert.ok(detailsJson.length < 20_000, `control details should stay compact, got ${detailsJson.length} chars`);
assert.doesNotMatch(detailsJson, /RAW_FINAL_OUTPUT_SHOULD_NOT_APPEAR/);
assert.doesNotMatch(detailsJson, /RAW_EVENT_PAYLOAD_SHOULD_NOT_APPEAR/);
assert.doesNotMatch(detailsJson, /RAW_NESTED_COMPACT_RESULT_SHOULD_NOT_APPEAR/);

process.env.SISO_AGENT_ROUTER_TOOL_MODE = "lean";
const tools = new Map();
sisoAgentRouterExtension({
  on() {},
  registerCommand() {},
  registerTool(spec) {
    tools.set(spec.name, spec);
  },
  registerMessageRenderer() {},
  sendUserMessage() {},
  getAllTools: () => [],
});
const siso = tools.get("siso");
assert.ok(siso, "lean siso tool should be registered");
const childRecords = await siso.execute("child-records-compact", { action: "child", op: "records", limit: 1 });
assert.equal(childRecords.details[0].eventCount, 1);
assert.equal("events" in childRecords.details[0], false, "siso child records details should not expose raw event arrays");
assert.equal("finalOutput" in childRecords.details[0], false, "siso child records details should not expose raw final output");
const childLogs = await siso.execute("child-logs-compact", { action: "child", op: "logs", id });
assert.equal(childLogs.details.records[0].eventCount, 1);
assert.equal("events" in childLogs.details.records[0], false, "siso child logs details should not expose raw event arrays");
assert.equal("finalOutput" in childLogs.details.records[0], false, "siso child logs details should not expose raw final output");

const routerJson = JSON.stringify({ childRecords: childRecords.details, childLogs: childLogs.details });
assert.ok(routerJson.length < 20_000, `router child details should stay compact, got ${routerJson.length} chars`);
assert.doesNotMatch(routerJson, /RAW_FINAL_OUTPUT_SHOULD_NOT_APPEAR/);
assert.doesNotMatch(routerJson, /RAW_EVENT_PAYLOAD_SHOULD_NOT_APPEAR/);
assert.doesNotMatch(routerJson, /RAW_NESTED_COMPACT_RESULT_SHOULD_NOT_APPEAR/);

console.log("SISO_CHILD_CONTROL_COMPACT_SMOKE_OK");
