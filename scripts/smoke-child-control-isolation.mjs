#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "siso-child-control-isolation-"));
const runDir = join(tmp, "child-runs");
process.env.SISO_CHILD_RUN_DIR = runDir;
process.env.SISO_TASK_ROOT_DIR = join(tmp, "tasks");
process.env.SISO_AGENT_ROUTER_TOOL_MODE = "lean";
process.env.SISO_ROOT_SESSION_ID = "root-a";
process.env.SISO_PARENT_SESSION_ID = "parent-a";
process.env.SISO_AGENT_ID = "agent-a";

const { controlChildRun } = await import("../extensions/siso-agent-router/spawn-layer.js");
const { default: sisoAgentRouterExtension } = await import("../extensions/siso-agent-router/index.js");

mkdirSync(runDir, { recursive: true });

function writeChildRecord({ id, parentSessionId, rootSessionId, ownerAgentId, marker }) {
  const stdoutPath = join(runDir, `${id}.stdout.jsonl`);
  const stderrPath = join(runDir, `${id}.stderr.log`);
  const runRecordPath = join(runDir, `${id}.json`);
  writeFileSync(stdoutPath, `${marker}\n`, "utf8");
  writeFileSync(stderrPath, "", "utf8");
  writeFileSync(runRecordPath, `${JSON.stringify({
    id,
    status: "completed",
    adapter: "pi",
    profile: "minimax.worker",
    lane: "minimax",
    model: "MiniMax M2.7",
    cwd: tmp,
    startedAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:01:00.000Z",
    completedAt: "2026-05-10T00:01:00.000Z",
    rootSessionId,
    parentSessionId,
    ownerAgentId,
    stdoutPath,
    stderrPath,
    runRecordPath,
    compactResult: { summary: marker, findings: [], files: [], next_action: "none" },
    tokens: { input: 10, output: 5, totalTokens: 15 },
    toolCalls: 1,
  }, null, 2)}\n`, "utf8");
}

writeChildRecord({
  id: "siso-child-visible",
  rootSessionId: "root-a",
  parentSessionId: "parent-a",
  ownerAgentId: "agent-a",
  marker: "VISIBLE_PARENT_SUMMARY",
});
writeChildRecord({
  id: "siso-child-sibling",
  rootSessionId: "root-b",
  parentSessionId: "parent-b",
  ownerAgentId: "agent-b",
  marker: "SECRET_SIBLING_SUMMARY_SHOULD_NOT_RETURN",
});

const scopeA = { rootSessionId: "root-a", parentSessionId: "parent-a", ownerAgentId: "agent-a" };
const list = await controlChildRun({ action: "list", limit: 10 }, scopeA);
assert.equal(list.records.length, 1);
assert.equal(list.records[0].id, "siso-child-visible");
assert.doesNotMatch(JSON.stringify(list), /SECRET_SIBLING_SUMMARY_SHOULD_NOT_RETURN/);

const directSiblingLogs = await controlChildRun({ action: "logs", id: "siso-child-sibling" }, scopeA);
assert.equal(directSiblingLogs.records.length, 0);
assert.match(directSiblingLogs.text, /child not found/);
assert.doesNotMatch(JSON.stringify(directSiblingLogs), /SECRET_SIBLING_SUMMARY_SHOULD_NOT_RETURN/);

const commands = new Map();
const tools = new Map();
sisoAgentRouterExtension({
  on() {},
  registerCommand(name, spec) {
    commands.set(name, spec);
  },
  registerTool(spec) {
    tools.set(spec.name, spec);
  },
  registerMessageRenderer() {},
  sendUserMessage() {},
  getAllTools: () => [],
});

const ctxA = { sessionId: "parent-a", hasUI: false };
const agentsSiblingLogs = await commands.get("agents").handler("logs siso-child-sibling", ctxA);
assert.match(agentsSiblingLogs.content[0].text, /child not found/);
assert.doesNotMatch(JSON.stringify(agentsSiblingLogs), /SECRET_SIBLING_SUMMARY_SHOULD_NOT_RETURN/);

const siso = tools.get("siso");
assert.ok(siso);
const sisoSiblingLogs = await siso.execute("isolation-child-logs", { action: "child", op: "logs", id: "siso-child-sibling" }, undefined, undefined, ctxA);
assert.match(sisoSiblingLogs.content[0].text, /child not found/);
assert.doesNotMatch(JSON.stringify(sisoSiblingLogs), /SECRET_SIBLING_SUMMARY_SHOULD_NOT_RETURN/);

console.log("SISO_CHILD_CONTROL_ISOLATION_SMOKE_OK");
