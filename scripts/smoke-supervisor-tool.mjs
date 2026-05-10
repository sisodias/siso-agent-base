#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";

const tools = new Map();
const pi = {
  on() {},
  registerCommand() {},
  registerMessageRenderer() {},
  getAllTools: () => [],
  registerTool(nameOrSpec, maybeSpec) {
    const spec = typeof nameOrSpec === "string" ? maybeSpec : nameOrSpec;
    tools.set(spec.name, spec);
  },
};

sisoAgentRouterExtension(pi);

const sampleRecord = {
  id: "child-supervisor",
  pid: 123,
  command: "node worker",
  status: "running",
  heartbeatAt: "2026-05-10T12:00:00.000Z",
  startedAt: "2026-05-10T11:59:00.000Z",
};

const health = await tools.get("siso_supervisor").execute("supervisor-health", {
  op: "health",
  records: [sampleRecord],
  now: "2026-05-10T12:00:10.000Z",
});
assert.match(health.content[0].text, /total=1/);
assert.match(health.content[0].text, /healthy=1/);

const retry = await tools.get("siso_supervisor").execute("supervisor-retry", {
  op: "retry",
  record: { attempt: 1 },
  policy: { maxAttempts: 3, baseDelayMs: 1000, backoff: 2 },
  now: "2026-05-10T12:00:00.000Z",
});
assert.equal(retry.details.retryable, true);
assert.equal(retry.details.delayMs, 2000);

const deadletter = await tools.get("siso_supervisor").execute("supervisor-deadletter", {
  op: "deadletter",
  record: sampleRecord,
  reason: "heartbeat dead",
  now: "2026-05-10T12:01:00.000Z",
});
assert.equal(deadletter.details.status, "deadletter");
assert.match(deadletter.content[0].text, /deadletter=child-supervisor/);

const cleanup = await tools.get("siso_supervisor").execute("supervisor-cleanup", {
  op: "cleanup-check",
  record: sampleRecord,
  observed: {
    pid: 123,
    command: "node worker",
    status: "running",
    heartbeatAt: "2026-05-10T12:00:00.000Z",
    startedAt: "2026-05-10T11:59:00.000Z",
  },
});
assert.equal(cleanup.details.safe, true);
assert.match(cleanup.content[0].text, /safe=true/);

const cwd = mkdtempSync(join(tmpdir(), "siso-supervisor-tool-"));
const persisted = await tools.get("siso_supervisor").execute("supervisor-persist", {
  op: "persist",
  kind: "deadletters",
  cwd,
  record: deadletter.details,
  now: "2026-05-10T12:01:01.000Z",
});
assert.equal(persisted.details.kind, "deadletters");
assert.match(persisted.content[0].text, /persisted=deadletters/);

const listed = await tools.get("siso_supervisor").execute("supervisor-list", {
  op: "list",
  kind: "deadletters",
  cwd,
});
assert.equal(listed.details.records.length, 1);
assert.match(listed.content[0].text, /records=1/);

console.log("SISO_SUPERVISOR_TOOL_SMOKE_OK");
