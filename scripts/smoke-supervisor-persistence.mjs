#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createDeadletterRecord,
  listSupervisorRecords,
  nextRetryState,
  persistSupervisorRecord,
  shouldCleanupOrphanProcess,
  supervisorStorePath,
} from "../extensions/siso-agent-router/subagent-supervisor.js";

const cwd = mkdtempSync(join(tmpdir(), "siso-supervisor-persistence-"));
const now = "2026-05-10T12:00:00.000Z";
const record = {
  id: "child-a",
  pid: 123,
  command: "node worker",
  heartbeatAt: now,
  startedAt: "2026-05-10T11:59:00.000Z",
};

const active = persistSupervisorRecord("active", record, {
  cwd,
  now: () => now,
});
assert.equal(active.kind, "active");
assert.equal(active.record.id, "child-a");
assert.ok(active.path.endsWith("/.siso/supervisor/active.jsonl"));
assert.ok(existsSync(active.path));

const retry = persistSupervisorRecord(
  "retries",
  {
    id: "child-a",
    retry: nextRetryState({ attempt: 1 }, { maxAttempts: 3, baseDelayMs: 1000, backoff: 2 }, now),
  },
  { cwd, now: () => "2026-05-10T12:00:01.000Z" },
);
assert.equal(retry.kind, "retries");

const deadletter = persistSupervisorRecord(
  "deadletters",
  createDeadletterRecord(record, "heartbeat dead", now),
  { cwd, now: () => "2026-05-10T12:00:02.000Z" },
);
assert.equal(deadletter.record.status, "deadletter");

const orphan = persistSupervisorRecord(
  "orphans",
  shouldCleanupOrphanProcess(record, {
    pid: 123,
    command: "node worker",
    heartbeatAt: now,
    startedAt: "2026-05-10T11:59:00.000Z",
  }),
  { cwd, now: () => "2026-05-10T12:00:03.000Z" },
);
assert.equal(orphan.record.safe, true);

assert.equal(supervisorStorePath("deadletters", { cwd }), deadletter.path);
assert.equal(readFileSync(deadletter.path, "utf8").trim().split(/\r?\n/).length, 1);

const all = listSupervisorRecords({ cwd });
assert.equal(all.length, 4);
assert.deepEqual(
  all.map((entry) => entry.kind),
  ["orphans", "deadletters", "retries", "active"],
);

const deadletters = listSupervisorRecords({ cwd, kind: "deadletters" });
assert.equal(deadletters.length, 1);
assert.equal(deadletters[0].record.reason, "heartbeat dead");

console.log("SISO_SUPERVISOR_PERSISTENCE_SMOKE_OK");
