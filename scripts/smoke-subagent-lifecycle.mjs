#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { deliverPendingChildNotifications } from "../extensions/siso-agent-router/notifications.js";
import { collectChildRunRecord, runProfileSpawn } from "../extensions/siso-agent-router/spawn-layer.js";

const tmp = mkdtempSync(join(tmpdir(), "siso-subagent-lifecycle-"));
const childRunDir = join(tmp, "child-runs");
const fakePi = join(tmp, "fake-pi-child.mjs");

process.env.SISO_CHILD_RUN_DIR = childRunDir;
process.env.SISO_PI_CODEX_COMMAND = fakePi;
process.env.SISO_PARENT_SESSION_ID = "siso-lifecycle-parent";
process.env.SISO_ROOT_SESSION_ID = "siso-lifecycle-root";
process.env.SISO_AGENT_ID = "siso-lifecycle-parent";

writeFileSync(fakePi, `#!/usr/bin/env node
const message = {
  role: "assistant",
  content: [
    {
      type: "text",
      text: JSON.stringify({
        summary: "Lifecycle smoke child completed and reported back.",
        findings: ["launch-visible", "completion-returned", "parent-follow-up-delivered"],
        files: [],
        next_action: "Parent can summarize the child result in chat."
      })
    }
  ],
  usage: { input: 123, output: 45, totalTokens: 168 }
};
console.log(JSON.stringify({ type: "tool_call", toolName: "read" }));
console.log(JSON.stringify({ type: "message_end", message }));
`, "utf8");
chmodSync(fakePi, 0o755);

const result = await runProfileSpawn("Tell the parent that the subagent lifecycle smoke completed.", {
  background: true,
  noTools: true,
  timeoutMs: 10_000,
  maxDepth: 2,
  cwd: tmp,
  decision: {
    kind: "worker",
    profile: "minimax.worker",
    lane: "minimax",
    model: "claude-haiku-4-5-20251001",
    tools: [],
    contextTier: "none",
    statePolicy: "read-only",
    permissionProfile: "read-only",
  },
});

assert.equal(result.status, "background", "background spawn should return immediately");
assert.ok(result.pid, "background spawn should expose a supervisor pid for the active loader");
assert.equal(result.decision.profile, "minimax.worker");

let record;
for (let attempt = 0; attempt < 50; attempt++) {
  record = collectChildRunRecord(result.id);
  if (record?.status === "completed") break;
  await new Promise((resolve) => setTimeout(resolve, 50));
}

assert.equal(record?.status, "completed", "background child should complete through the supervisor path");
assert.equal(record.parentSessionId, "siso-lifecycle-parent", "child record should stay scoped to the spawning parent session");
assert.equal(record.tokens.totalTokens, 168, "child usage should be parsed from JSONL output");
assert.equal(record.toolCalls, 1, "child tool calls should be parsed from JSONL output");
assert.match(record.compactResult.summary, /Lifecycle smoke child completed/);

const delivered = [];
let visibleUserMessage = false;
const pi = {
  sendUserMessage() {
    visibleUserMessage = true;
  },
  sendMessage(message, options) {
    delivered.push({ message, options });
  },
};

const notification = await deliverPendingChildNotifications(pi, {
  limit: 10,
  parentSessionId: "siso-lifecycle-parent",
  sessionStartedAt: new Date(Date.now() - 60_000).toISOString(),
  now: () => "2026-05-09T00:00:30.000Z",
});

assert.equal(notification.delivered, 1, "terminal child should deliver one parent follow-up notification");
assert.equal(delivered.length, 1, "notification dispatcher should send exactly one message");
assert.equal(visibleUserMessage, false, "child notification should not be injected as visible user-authored text");
assert.equal(delivered[0].message.customType, "siso-task-notification");
assert.equal(delivered[0].message.display, false);
assert.equal(delivered[0].options?.triggerTurn, true);
assert.equal(delivered[0].options?.deliverAs, "followUp");
assert.match(delivered[0].message.content, /<task-notification>/);
assert.match(delivered[0].message.content, /Lifecycle smoke child completed/);
assert.match(delivered[0].message.content, /<total_tokens>168<\/total_tokens>/);
assert.match(delivered[0].message.content, /<tool_uses>1<\/tool_uses>/);

const marked = JSON.parse(readFileSync(record.runRecordPath, "utf8"));
assert.equal(marked.parentNotifiedAt, "2026-05-09T00:00:30.000Z");
assert.ok(marked.parentNotification?.deliveryId);

console.log("SISO_SUBAGENT_LIFECYCLE_SMOKE_OK");
