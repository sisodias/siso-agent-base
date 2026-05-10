#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sisoContextManager from "../extensions/siso-context-manager/index.js";
import { appendContextEvent, appendJsonl, appendMemoryItems, ensureStore, runEventsPath } from "../extensions/siso-context-manager/store.js";

const root = mkdtempSync(join(tmpdir(), "siso-context-details-"));
const runId = "context-details-compact";
process.env.SISO_CONTEXT_MANAGER_DIR = root;
process.env.SISO_CONTEXT_RUN_ID = runId;

const longEventText = `RAW_CONTEXT_EVENT_SHOULD_NOT_APPEAR ${"x".repeat(20_000)}`;
const longPendingText = `RAW_PENDING_CONTEXT_SHOULD_NOT_APPEAR ${"p".repeat(16_000)}`;
const longMemoryText = `RAW_MEMORY_TEXT_SHOULD_NOT_APPEAR ${"m".repeat(12_000)}`;
const longCentralText = `RAW_CENTRAL_MEMORY_SHOULD_NOT_APPEAR ${"c".repeat(12_000)}`;

appendContextEvent({
  id: "evt-large-context",
  runId,
  ts: new Date().toISOString(),
  cwd: root,
  agent: "smoke",
  kind: "tool_result",
  eventName: "tool_result",
  toolName: "read",
  text: longEventText,
  bytes: longEventText.length,
  estimatedTokens: Math.ceil(longEventText.length / 4),
});
appendMemoryItems(runId, [{
  category: "summary",
  text: longMemoryText,
  importance: 0.9,
  confidence: 0.8,
  scope: "run",
  cwd: root,
  runId,
  ts: new Date().toISOString(),
  sourceIds: ["evt-large-context"],
}]);
appendJsonl(join(ensureStore(root).root, "central-memory.jsonl"), {
  id: "central-large",
  type: "fact",
  projectKey: "context-details",
  agent: "smoke",
  runId,
  ts: new Date().toISOString(),
  content: longCentralText,
  key: "fact:context-details",
  confidence: 0.8,
  importance: 0.9,
  sourceIds: ["evt-large-context"],
  corroboratedBy: [],
  conflictsWith: [],
});

const handlers = new Map();
const tools = new Map();
sisoContextManager({
  on(event, handler) {
    handlers.set(event, handler);
  },
  registerTool(tool) {
    tools.set(tool.name, tool);
  },
  registerCommand() {},
});

handlers.get("input")?.({ text: longPendingText, cwd: root }, { hasUI: false });

const tool = tools.get("siso_context");
assert.ok(tool, "siso_context tool should be registered");

const status = await tool.execute("status", { op: "status" }, undefined, undefined, { hasUI: false });
const memory = await tool.execute("memory", { op: "memory", runId, limit: 5 }, undefined, undefined, { hasUI: false });
const central = await tool.execute("central", { op: "central", limit: 5 }, undefined, undefined, { hasUI: false });
const supersede = await tool.execute("supersede", { op: "supersede", runId, limit: 5 }, undefined, undefined, { hasUI: false });
const pointers = await tool.execute("pointers", { op: "pointers", runId, limit: 5 }, undefined, undefined, { hasUI: false });
const retrieve = await tool.execute("retrieve", { op: "retrieve", runId, eventId: "evt-large-context", maxChars: 12000 }, undefined, undefined, { hasUI: false });

assert.match(retrieve.content[0].text, /RAW_CONTEXT_EVENT_SHOULD_NOT_APPEAR/, "explicit retrieve text still returns requested raw preview");
assert.ok(retrieve.content[0].text.length < 13_000, "explicit retrieve text should remain bounded by maxChars");

const detailsJson = JSON.stringify({
  status: status.details,
  memory: memory.details,
  central: central.details,
  supersede: supersede.details,
  pointers: pointers.details,
  retrieve: retrieve.details,
});

assert.ok(detailsJson.length < 20_000, `context details should stay compact, got ${detailsJson.length} chars`);
assert.doesNotMatch(detailsJson, /RAW_CONTEXT_EVENT_SHOULD_NOT_APPEAR/);
assert.doesNotMatch(detailsJson, /RAW_PENDING_CONTEXT_SHOULD_NOT_APPEAR/);
assert.doesNotMatch(detailsJson, /RAW_MEMORY_TEXT_SHOULD_NOT_APPEAR/);
assert.doesNotMatch(detailsJson, /RAW_CENTRAL_MEMORY_SHOULD_NOT_APPEAR/);
assert.equal(status.details.state.pendingCount, 1);
assert.equal("pending" in status.details.state, false, "status details should not expose raw pending events");
assert.equal(retrieve.details.event.textPreview.includes("RAW_CONTEXT_EVENT_SHOULD_NOT_APPEAR"), false, "retrieve details preview should omit raw marker prefix");
assert.equal(retrieve.details.event.textChars, longEventText.length);
assert.equal(retrieve.details.event.truncatedTextChars > 0, true);
assert.match(runEventsPath(runId, root), /context-details-compact\.jsonl$/);

console.log("SISO_CONTEXT_DETAILS_COMPACT_SMOKE_OK");
