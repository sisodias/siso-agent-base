#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "siso-child-control-safety-"));
const runDir = join(tmp, "child-runs");
const outsideDir = join(tmp, "outside");
process.env.SISO_CHILD_RUN_DIR = runDir;
process.env.SISO_TASK_ROOT_DIR = join(tmp, "tasks");
process.env.SISO_ROOT_SESSION_ID = "root-child-control-safety";
process.env.SISO_PARENT_SESSION_ID = "parent-child-control-safety";
process.env.SISO_AGENT_ID = "agent-child-control-safety";
process.env.SISO_AGENT_ROUTER_TOOL_MODE = "lean";

const {
  cleanupChildRunLogs,
  controlChildRun,
} = await import("../extensions/siso-agent-router/spawn-layer.js");
const { default: sisoAgentRouterExtension } = await import("../extensions/siso-agent-router/index.js");

mkdirSync(runDir, { recursive: true });
mkdirSync(outsideDir, { recursive: true });

function baseRecord(id, patch = {}) {
  return {
    id,
    status: "completed",
    adapter: "pi",
    profile: "minimax.scout",
    lane: "minimax",
    model: "claude-haiku-4-5-20251001",
    cwd: tmp,
    startedAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-08T00:01:00.000Z",
    completedAt: "2026-05-08T00:01:00.000Z",
    rootSessionId: "root-child-control-safety",
    parentSessionId: "parent-child-control-safety",
    ownerAgentId: "agent-child-control-safety",
    stdoutPath: join(runDir, `${id}.stdout.jsonl`),
    stderrPath: join(runDir, `${id}.stderr.log`),
    exitPath: join(runDir, `${id}.exit.json`),
    runRecordPath: join(runDir, `${id}.json`),
    compactResult: { summary: id, findings: [], files: [], next_action: "none" },
    tokens: { input: 1, output: 1, totalTokens: 2 },
    toolCalls: 0,
    rawOutputChars: 0,
    truncatedOutputChars: 0,
    ...patch,
  };
}

function writeRecord(record, stdout = "expected stdout\n", stderr = "expected stderr\n") {
  writeFileSync(join(runDir, `${record.id}.stdout.jsonl`), stdout, "utf8");
  writeFileSync(join(runDir, `${record.id}.stderr.log`), stderr, "utf8");
  writeFileSync(join(runDir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

const outsideLog = join(outsideDir, "tampered-output.log");
writeFileSync(outsideLog, "SECRET_OUTSIDE_LOG_SHOULD_NOT_LEAK_OR_DELETE\n", "utf8");

const tamperedId = "siso-child-tampered-paths";
writeRecord(baseRecord(tamperedId, {
  stdoutPath: outsideLog,
  stderrPath: join(outsideDir, "missing-stderr.log"),
  exitPath: join(outsideDir, "missing-exit.json"),
}), "SAFE_EXPECTED_STDOUT\n", "SAFE_EXPECTED_STDERR\n");

const logs = await controlChildRun({ action: "logs", id: tamperedId });
assert.match(logs.text, /SAFE_EXPECTED_STDOUT/, "logs should read recomputed child-run stdout path");
assert.doesNotMatch(logs.text, /SECRET_OUTSIDE_LOG_SHOULD_NOT_LEAK_OR_DELETE/, "logs must not read record-supplied paths outside childRunDir");

const cleanupDryRun = cleanupChildRunLogs({ maxAgeHours: 1, maxRuns: 1 });
assert.equal(cleanupDryRun.dryRun, true, "agent-facing cleanup should default to dry-run");
assert.equal(existsSync(join(runDir, `${tamperedId}.stdout.jsonl`)), true, "dry-run should keep expected stdout");
assert.equal(existsSync(outsideLog), true, "dry-run should keep tampered outside path");

const cleanupDelete = cleanupChildRunLogs({ confirm: true, maxAgeHours: 1, maxRuns: 1 });
assert.equal(cleanupDelete.dryRun, false, "confirm=true should enable deletion");
assert.equal(existsSync(join(runDir, `${tamperedId}.stdout.jsonl`)), false, "confirmed cleanup should delete expected stdout");
assert.equal(existsSync(outsideLog), true, "confirmed cleanup must skip tampered outside path");
assert.ok(cleanupDelete.removedFiles.every((path) => path.startsWith(runDir)), "cleanup should report only files under childRunDir");

const clampOldId = "siso-child-clamp-old";
const clampNewId = "siso-child-clamp-new";
writeRecord(baseRecord(clampOldId, { updatedAt: "2026-05-07T00:00:00.000Z" }), "OLD_CLAMP_STDOUT\n", "");
writeRecord(baseRecord(clampNewId, { updatedAt: "2026-05-09T00:00:00.000Z" }), "NEW_CLAMP_STDOUT\n", "");
cleanupChildRunLogs({ confirm: true, maxAgeHours: 999999, maxRuns: -10 });
assert.equal(existsSync(join(runDir, `${clampNewId}.stdout.jsonl`)), true, "maxRuns should clamp to at least one retained run");
assert.equal(existsSync(join(runDir, `${clampOldId}.stdout.jsonl`)), false, "negative maxRuns must not disable retention limits unpredictably");

const toolCleanupId = "siso-child-tool-cleanup-confirm";
writeRecord(baseRecord(toolCleanupId, { updatedAt: "2026-05-07T00:00:00.000Z" }), "TOOL_CLEANUP_STDOUT\n", "");
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
const sisoTool = tools.get("siso");
assert.ok(sisoTool, "lean siso tool should be registered");
const toolDryRun = await sisoTool.execute("cleanup-no-confirm", { action: "child", op: "cleanup", maxAgeHours: 1, maxRuns: 1, dryRun: false });
assert.equal(toolDryRun.details.dryRun, true, "lean cleanup should remain dry-run without confirm=true");
assert.equal(existsSync(join(runDir, `${toolCleanupId}.stdout.jsonl`)), true, "public cleanup without confirm must not delete logs");
const toolConfirmed = await sisoTool.execute("cleanup-confirm", { action: "child", op: "cleanup", maxAgeHours: 1, maxRuns: 1, dryRun: false, confirm: true });
assert.equal(toolConfirmed.details.dryRun, false, "lean cleanup should delete only with confirm=true");
assert.equal(existsSync(join(runDir, `${toolCleanupId}.stdout.jsonl`)), false, "public cleanup with confirm=true should delete eligible logs");

const completedAlive = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], {
  stdio: "ignore",
  detached: true,
});
completedAlive.unref();
const completedAliveId = "siso-child-completed-alive";
writeRecord(baseRecord(completedAliveId, { pid: completedAlive.pid }), "", "");
const interruptedCompleted = await controlChildRun({ action: "interrupt", id: completedAliveId, signal: "SIGTERM" });
assert.match(interruptedCompleted.text, /interrupt=refused/);
assert.match(interruptedCompleted.text, /reason=not_active/);
const afterInterrupt = JSON.parse(readFileSync(join(runDir, `${completedAliveId}.json`), "utf8"));
assert.equal(afterInterrupt.status, "completed", "interrupt should not mutate completed records even when pid is alive");
try {
  process.kill(-completedAlive.pid, "SIGTERM");
} catch {}
try {
  process.kill(completedAlive.pid, "SIGTERM");
} catch {}

const resumeParentId = "siso-child-resume-scout";
writeRecord(baseRecord(resumeParentId, {
  profile: "minimax.scout",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  compactResult: { summary: "scout finished", findings: [], files: [], next_action: "none" },
}), "", "");

const workerDecision = {
  kind: "worker",
  profile: "minimax.worker",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  tools: ["read", "find", "ls", "edit", "write", "bash"],
  contextTier: "project",
  statePolicy: "task-state",
  permissionProfile: "accept_edits",
  inheritContext: false,
  needsWorktree: false,
  maxParallelAgents: 4,
  rationale: "attempted upgrade",
};
const resumed = await controlChildRun({
  action: "resume",
  id: resumeParentId,
  message: "Follow up without widening permissions.",
  spawnOptions: {
    dryRun: true,
    decision: workerDecision,
  },
});
assert.match(resumed.text, /resumed_child_id=/);
const resumedId = resumed.text.match(/resumed_child_id=(\S+)/)?.[1];
assert.ok(resumedId, "resume should report new child id");
const resumedRecord = JSON.parse(readFileSync(join(runDir, `${resumedId}.json`), "utf8"));
assert.equal(resumedRecord.profile, "minimax.scout", "resume should preserve the original child profile by default");
assert.equal(resumedRecord.compactResult.summary.includes("dry_run=true"), true);
const resumedPrompt = resumed.text + JSON.stringify(resumed.records);
assert.doesNotMatch(resumedPrompt, /minimax\.worker/, "resume result should not expose an upgraded worker route");

console.log("SISO_CHILD_CONTROL_SAFETY_SMOKE_OK");
