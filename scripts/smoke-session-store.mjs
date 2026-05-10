#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  appendSessionAgentEvent,
  listSessionAgents,
  projectSessionRouterStatus,
  readSessionAgent,
  sessionAgentPaths,
  writeSessionAgent,
} from "../extensions/siso-agent-router/session-store.js";

const root = mkdtempSync(join(tmpdir(), "siso-session-store-"));
process.env.SISO_SESSION_ROOT_DIR = root;

const base = {
  status: "running",
  profile: "minimax.worker",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  task: "Inspect the session ownership model",
  startedAt: "2026-05-09T12:00:00.000Z",
  updatedAt: "2026-05-09T12:00:01.000Z",
  tokens: { input: 100, output: 50, totalTokens: 150 },
  toolCalls: 2,
  compactResult: { summary: "working", findings: [], files: [], next_action: "wait" },
};

const a1 = writeSessionAgent({
  ...base,
  id: "agent-a1",
  rootSessionId: "session-a",
  parentSessionId: "session-a",
  ownerAgentId: "session-a",
});
writeSessionAgent({
  ...base,
  id: "agent-a2-completed",
  status: "completed",
  rootSessionId: "session-a",
  parentSessionId: "session-a",
  ownerAgentId: "session-a",
  completedAt: "2026-05-09T12:01:00.000Z",
});
writeSessionAgent({
  ...base,
  id: "agent-b1",
  rootSessionId: "session-b",
  parentSessionId: "session-b",
  ownerAgentId: "session-b",
});

assert.equal(a1.agentId, "agent-a1");
assert.equal(a1.parentSessionId, "session-a");
assert.equal(a1.eventCount, 0);

const paths = sessionAgentPaths("session-a", "agent-a1");
assert.ok(existsSync(paths.agentRecordPath), "agent record should be written under the owning session");
assert.ok(paths.agentRecordPath.includes("session-a/agents/agent-a1/agent.json"), "path should mirror Claude-style session ownership");

appendSessionAgentEvent({ parentSessionId: "session-a" }, "agent-a1", { type: "tool_call", toolName: "read" });
appendSessionAgentEvent({ parentSessionId: "session-a" }, "agent-a1", { type: "tool_result", toolName: "read" });
const afterEvents = readSessionAgent({ parentSessionId: "session-a" }, "agent-a1");
assert.equal(afterEvents.eventCount, 2, "eventCount should preserve observability without returning raw events");
assert.equal(afterEvents.events, undefined, "session agent records should not expose raw events");
assert.equal(readFileSync(paths.eventsPath, "utf8").trim().split(/\n/).length, 2, "raw event detail should live in the event log");

assert.deepEqual(
  listSessionAgents({ parentSessionId: "session-a" }).map((agent) => agent.id),
  ["agent-a1", "agent-a2-completed"],
  "session A should only list session A agents in newest-first order",
);
assert.deepEqual(
  listSessionAgents({ parentSessionId: "session-b" }).map((agent) => agent.id),
  ["agent-b1"],
  "session B should not see session A agents",
);
assert.equal(readSessionAgent({ parentSessionId: "session-b" }, "agent-a1"), undefined, "direct reads must enforce session scope");

const projection = projectSessionRouterStatus({ parentSessionId: "session-a" });
assert.equal(projection.activeChildId, "agent-a1", "active projection should ignore completed agents");
assert.equal(projection.child.id, "agent-a1");
assert.deepEqual(Object.keys(projection.children).sort(), ["agent-a1", "agent-a2-completed"]);
assert.equal(JSON.stringify(projection).includes("tool_call"), false, "router projection should stay compact");

console.log("SISO_SESSION_STORE_SMOKE_OK");
