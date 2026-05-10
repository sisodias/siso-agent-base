#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const tmp = mkdtempSync(join(tmpdir(), "siso-error-queue-"));
const transcriptRoot = join(tmp, "transcripts");
const queueRoot = join(tmp, "error-queue");
const day = "2026-05-10";
const errorsPath = join(transcriptRoot, day, "errors.jsonl");

function jsonLine(value) {
  return `${JSON.stringify(value)}\n`;
}

mkdirSync(join(transcriptRoot, day), { recursive: true });

const base = {
  timestamp: "2026-05-10T08:00:00.000Z",
  session_id: "smoke-session",
  cwd: "/repo",
};

writeFileSync(errorsPath, [
  jsonLine({ ...base, event_type: "before_provider_request", kind: "error", text: "normal telemetry" }),
  jsonLine({
    ...base,
    event_type: "tool_result",
    kind: "error",
    text: "Path not found: /repo/.siso-wiki",
    tool_name: "ls",
    payload: { toolCallId: "call_same", toolName: "ls", input: { path: ".siso-wiki" } },
  }),
  jsonLine({
    ...base,
    event_type: "tool_execution_end",
    kind: "error",
    text: "Path not found: /repo/.siso-wiki",
    tool_name: "ls",
    payload: { toolCallId: "call_same", toolName: "ls", input: { path: ".siso-wiki" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:01:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "Command timed out after 30 seconds",
    tool_name: "bash",
    payload: { toolCallId: "call_timeout", toolName: "bash", input: { command: "rg very-wide-search" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:02:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "Command timed out after 30 seconds",
    tool_name: "bash",
    payload: { toolCallId: "call_timeout_other", toolName: "bash", input: { command: "siso doctor" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:03:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "import { spawnSync } from \"node:child_process\"; import { appendFileSync, existsSync, mkdirSync, readFileSync } from \"node:fs\"; const RESTORE_MAX_AGE_MS = 7200000;",
    tool_name: "read",
    payload: { toolCallId: "call_source_dump", toolName: "read", input: { path: "extensions/siso-lifecycle/index.js" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:04:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "--- 20-38 20: function transcriptRoot() { 21: return process.env.SISO_TRANSCRIPT_DIR ?? join(homedir(), \".siso\", \"agent\", \"transcripts\"); 22: }",
    tool_name: "bash",
    payload: { toolCallId: "call_line_dump", toolName: "bash", input: { command: "sed -n '20,38p' extensions/siso-lifecycle/index.js" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:05:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "\u001b[?2031h\u001b]10;?\u0007\u001b]11;?\u0007\u001b[>0q\u001b[?25l\u001b[s\u001b[6n\u001b[?1049h",
    tool_name: "bash",
    payload: { toolCallId: "call_terminal_control", toolName: "bash", input: { command: "siso opentui" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:06:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "grep -n \"not-present\" package.json: Command exited with code 1",
    tool_name: "bash",
    payload: { toolCallId: "call_search_miss", toolName: "bash", input: { command: "grep -n \"not-present\" package.json" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:07:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "total 128 drwxr-xr-x  4 user staff 128 10 May 08:07 . drwxr-xr-x 10 user staff 320 10 May 08:06 ..",
    tool_name: "bash",
    payload: { toolCallId: "call_ls_dump", toolName: "bash", input: { command: "ls -la" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:08:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "Could not find edits[0] in scripts/example.mjs. The oldText must match exactly including all whitespace and newlines.",
    tool_name: "edit",
    payload: { toolCallId: "call_stale_edit", toolName: "edit", input: { path: "scripts/example.mjs" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:09:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "File \"<stdin>\", line 3\n    PY | sed -n '1,20p'\n       ^\nSyntaxError: invalid syntax Command exited with code 1",
    tool_name: "bash",
    payload: { toolCallId: "call_bad_heredoc", toolName: "bash", input: { command: "python3 - <<'PY'\nprint('x')\nPY | sed -n '1,20p'" } },
  }),
  jsonLine({
    ...base,
    timestamp: "2026-05-10T08:10:00.000Z",
    event_type: "tool_result",
    kind: "error",
    text: "Could not find the exact text in CHANGELOG.md. The old text must match exactly including all whitespace and newlines.",
    tool_name: "edit",
    payload: { toolCallId: "call_exact_text", toolName: "edit", input: { path: "CHANGELOG.md" } },
  }),
].join(""));

function run(args) {
  return execFileSync("node", ["scripts/error-queue.mjs", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

const common = [`--transcript-root=${transcriptRoot}`, `--queue-root=${queueRoot}`, "--since=2026-05-10T00:00:00.000Z"];
const queued = run(["queue", ...common]);
assert.match(queued, /created=6/);
assert.match(queued, /scanned=11/);
assert.match(queued, /ignored_telemetry=1/);
assert.match(queued, /ignored_non_actionable=5/);

const queueFiles = readdirSync(join(queueRoot, "queue")).filter((name) => name.endsWith(".json"));
assert.equal(queueFiles.length, 6, "deduped queue should split actionable command shapes and ignore non-actionable logging noise");
const timeoutPackets = queueFiles
  .map((name) => JSON.parse(readFileSync(join(queueRoot, "queue", name), "utf8")))
  .filter((packet) => packet.category === "timeout");
assert.equal(timeoutPackets.length, 2, "same timeout duration from different commands should not collapse into one packet");
assert.ok(timeoutPackets.some((packet) => packet.signature.includes("rg very-wide-search")));
assert.ok(timeoutPackets.some((packet) => packet.signature.includes("siso doctor")));
const packets = queueFiles.map((name) => JSON.parse(readFileSync(join(queueRoot, "queue", name), "utf8")));
assert.equal(packets.filter((packet) => packet.category.endsWith("logged as error")).length, 0, "non-actionable logging noise should not become repair jobs");
assert.ok(packets.some((packet) => packet.category === "stale edit target"), "stale edit mismatches should be actionable and classified");
assert.ok(packets.some((packet) => packet.category === "shell heredoc misuse"), "heredoc syntax mistakes should be actionable and classified");

const status = run(["status", `--queue-root=${queueRoot}`]);
assert.match(status, /queue: 6/);
assert.match(status, /missing\/stale path/);
assert.match(status, /timeout/);

const batch = run(["batch", `--queue-root=${queueRoot}`]);
assert.match(batch, /Error queue batches:/);
assert.match(batch, /timeout/);
assert.match(batch, /stale-path/);
assert.match(batch, /agent-misuse/);
const batchPrompts = run(["batch", `--queue-root=${queueRoot}`, "--write-prompts", "--profile=spark.worker", "--limit=2"]);
assert.match(batchPrompts, /Wrote batch prompt:/);
assert.ok(readdirSync(join(queueRoot, "assignments")).some((name) => name.includes("BATCH-timeout-spark.worker")), "batch should write lane-level worker prompts");

const resolvedLane = run(["resolve-lane", `--queue-root=${queueRoot}`, "--lane=agent-misuse", "--reason=smoke verified prompt guardrails"]);
assert.match(resolvedLane, /Resolved lane agent-misuse: moved=2/);
assert.ok(readdirSync(join(queueRoot, "resolved")).some((name) => {
  if (!name.endsWith(".json")) return false;
  const packet = JSON.parse(readFileSync(join(queueRoot, "resolved", name), "utf8"));
  return packet.resolutionReason === "smoke verified prompt guardrails";
}), "resolve-lane should preserve a resolution reason");

const dispatch = run(["dispatch", `--queue-root=${queueRoot}`, "--limit=1", "--profile=minimax.worker"]);
assert.match(dispatch, /prepared ERR-/);
assert.match(dispatch, /Dispatch complete: 1/);

const assignedFiles = readdirSync(join(queueRoot, "assigned")).filter((name) => name.endsWith(".json"));
assert.equal(assignedFiles.length, 1, "one packet should be assigned");
const assigned = JSON.parse(readFileSync(join(queueRoot, "assigned", assignedFiles[0]), "utf8"));
assert.equal(assigned.status, "assigned");
assert.equal(assigned.assignment.profile, "minimax.worker");
assert.ok(existsSync(join(queueRoot, "assignments", `${assigned.id}-minimax.worker.md`)));

const resolved = run(["resolve", `--queue-root=${queueRoot}`, `--id=${assigned.id}`]);
assert.match(resolved, new RegExp(`${assigned.id} -> resolved`));
assert.ok(existsSync(join(queueRoot, "resolved", `${assigned.id}.json`)));

const staleNoisePacket = {
  id: "ERR-SMOKE-stale-noise",
  status: "queue",
  category: "generic tool error",
  signature: "import { existsSync } from \"node:fs\"; const value = true;",
  count: 1,
  firstAt: "2026-05-10T08:10:00.000Z",
  latestAt: "2026-05-10T08:10:00.000Z",
  evidence: [{ text: "import { existsSync } from \"node:fs\"; const value = true;" }],
};
writeFileSync(join(queueRoot, "queue", `${staleNoisePacket.id}.json`), `${JSON.stringify(staleNoisePacket, null, 2)}\n`);
const beforePruneQueueCount = readdirSync(join(queueRoot, "queue")).filter((name) => name.endsWith(".json")).length;
const pruned = run(["prune", `--queue-root=${queueRoot}`]);
assert.match(pruned, /Pruned stale packets: moved=1 kept=3/);
const afterPruneQueueFiles = readdirSync(join(queueRoot, "queue")).filter((name) => name.endsWith(".json"));
assert.equal(afterPruneQueueFiles.length, beforePruneQueueCount - 1, "prune should move only stale/noise packets out of queue");
assert.ok(existsSync(join(queueRoot, "resolved", `${staleNoisePacket.id}.json`)));

console.log("SISO_ERROR_QUEUE_SMOKE_OK");
