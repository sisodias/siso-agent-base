#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  deliverPendingChildNotifications,
  formatTaskNotificationBatch,
  formatTaskNotification,
  markParentNotificationDelivered,
} from "../extensions/siso-agent-router/notifications.js";
import { readFeedEvents } from "../extensions/siso-agent-router/mailbox-feed.js";

const runDir = mkdtempSync(join(tmpdir(), "siso-child-notifications-"));
const mailboxFeedDir = mkdtempSync(join(tmpdir(), "siso-child-notifications-mailbox-feed-"));
process.env.SISO_CHILD_RUN_DIR = runDir;
process.env.SISO_CHILD_NOTIFICATION_POLL_MS = "0";
process.env.SISO_MAILBOX_FEED_ROOT_DIR = mailboxFeedDir;

const baseRecord = {
  id: "siso-child-notify-1",
  status: "completed",
  task: "Find the auth bug",
  profile: "minimax.worker",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  startedAt: "2026-05-08T12:00:01.000Z",
  completedAt: "2026-05-08T12:00:12.000Z",
  updatedAt: "2026-05-08T12:00:12.000Z",
  rootSessionId: "root-a",
  parentSessionId: "parent-a",
  ownerAgentId: "agent-a",
  runRecordPath: join(runDir, "siso-child-notify-1.json"),
  stdoutPath: join(runDir, "siso-child-notify-1.stdout.jsonl"),
  stderrPath: join(runDir, "siso-child-notify-1.stderr.log"),
  compactResult: {
    summary: "Found null pointer in src/auth/validate.ts:42",
    findings: ["Expired sessions can have user undefined."],
    files: ["src/auth/validate.ts"],
    next_action: "Patch validate.ts and add regression coverage.",
  },
  finalOutput: "Found null pointer in src/auth/validate.ts:42. Expired sessions can have user undefined.",
  events: [{ type: "raw-tool-event", payload: "RAW_EVENT_ARRAY_SHOULD_NOT_RETURN" }],
  tokens: { input: 1200, output: 300, totalTokens: 1500 },
  toolCalls: 3,
};

writeFileSync(baseRecord.runRecordPath, `${JSON.stringify(baseRecord, null, 2)}\n`);
writeFileSync(join(runDir, "siso-child-sibling.json"), `${JSON.stringify({
  ...baseRecord,
  id: "siso-child-sibling",
  rootSessionId: "root-b",
  parentSessionId: "parent-b",
  ownerAgentId: "agent-b",
  runRecordPath: join(runDir, "siso-child-sibling.json"),
  parentNotifiedAt: undefined,
}, null, 2)}\n`);
writeFileSync(join(runDir, "siso-child-stale.json"), `${JSON.stringify({
  ...baseRecord,
  id: "siso-child-stale",
  status: "completed",
  startedAt: "2026-05-08T11:59:30.000Z",
  completedAt: "2026-05-08T11:59:45.000Z",
  updatedAt: "2026-05-08T11:59:45.000Z",
  runRecordPath: join(runDir, "siso-child-stale.json"),
  parentNotifiedAt: undefined,
}, null, 2)}\n`);
writeFileSync(join(runDir, "siso-child-running.json"), `${JSON.stringify({
  ...baseRecord,
  id: "siso-child-running",
  status: "running",
  runRecordPath: join(runDir, "siso-child-running.json"),
  parentNotifiedAt: undefined,
}, null, 2)}\n`);

const xml = formatTaskNotification(baseRecord);
assert.match(xml, /^<task-notification>/);
assert.match(xml, /<task-id>siso-child-notify-1<\/task-id>/);
assert.match(xml, /<status>completed<\/status>/);
assert.match(xml, /<summary>MiniMax worker completed: Found null pointer in src\/auth\/validate.ts:42<\/summary>/);
assert.match(xml, /<result>Found null pointer in src\/auth\/validate.ts:42/);
assert.match(xml, /<total_tokens>1500<\/total_tokens>/);
assert.match(xml, /<tool_uses>3<\/tool_uses>/);

const longXml = formatTaskNotification({
  ...baseRecord,
  id: "siso-child-long-result",
  finalOutput: `Long child output. ${"x".repeat(5000)}`,
});
assert.ok(longXml.length < 1800, "single child notification must not inject huge final output into the parent turn");
assert.doesNotMatch(longXml, /Long child output/);
assert.doesNotMatch(longXml, /x{1000}/);
assert.match(longXml, /<output-file>/);

const rawFinalXml = formatTaskNotification({
  ...baseRecord,
  id: "siso-child-raw-final",
  compactResult: { summary: "Safe compact summary wins.", findings: [], files: [], next_action: "none" },
  finalOutput: `RAW_NOTIFICATION_FINAL_OUTPUT_SHOULD_NOT_RETURN ${"r".repeat(5000)}`,
});
assert.match(rawFinalXml, /Safe compact summary wins/);
assert.doesNotMatch(rawFinalXml, /RAW_NOTIFICATION_FINAL_OUTPUT_SHOULD_NOT_RETURN/);
assert.doesNotMatch(rawFinalXml, /r{1000}/);

const delivered = [];
let visibleUserMessageCalled = false;
const pi = {
  sendUserMessage() {
    visibleUserMessageCalled = true;
  },
  sendMessage(message, options) {
    delivered.push({ message, options });
  },
};

const first = await deliverPendingChildNotifications(pi, {
  limit: 10,
  now: () => "2026-05-08T12:00:30.000Z",
  sessionStartedAt: "2026-05-08T12:00:00.000Z",
  parentSessionId: "parent-a",
});
assert.equal(first.delivered, 1);
assert.equal(delivered.length, 1);
assert.equal(visibleUserMessageCalled, false, "child notifications must not render as visible user-authored messages");
assert.equal(delivered[0].message.customType, "siso-task-notification");
assert.equal(delivered[0].message.display, false);
assert.equal(delivered[0].message.details?.childId, "siso-child-notify-1");
assert.deepEqual(Object.keys(delivered[0].message.details).sort(), ["childId", "outputFile", "runRecordPath", "status"].sort());
assert.match(delivered[0].message.content, /<task-notification>/);
assert.doesNotMatch(delivered[0].message.content, /RAW_EVENT_ARRAY_SHOULD_NOT_RETURN/);
assert.doesNotMatch(JSON.stringify(delivered[0].message.details), /finalOutput|events|RAW_EVENT_ARRAY_SHOULD_NOT_RETURN/);
assert.equal(delivered[0].options?.triggerTurn, true);
assert.equal(delivered[0].options?.deliverAs, "followUp");

const updated = JSON.parse(readFileSync(baseRecord.runRecordPath, "utf8"));
assert.equal(updated.parentNotifiedAt, "2026-05-08T12:00:30.000Z");
assert.ok(updated.parentNotification?.deliveryId);
assert.equal(updated.updatedAt, "2026-05-08T12:00:12.000Z", "notification marking must not rewrite lifecycle updatedAt");
const mailbox = JSON.parse(readFileSync(join(mailboxFeedDir, "mailboxes", "parent-a", "siso-child-notify-1.json"), "utf8"));
assert.equal(mailbox.state, "delivered");
assert.equal(mailbox.ownerSessionId, "parent-a");
assert.equal(mailbox.childId, "siso-child-notify-1");
assert.equal(mailbox.deliveryId, updated.parentNotification.deliveryId);
const feedEvents = readFeedEvents("#task/siso-child-notify-1", { rootDir: mailboxFeedDir });
assert.equal(feedEvents.length, 1);
assert.equal(feedEvents[0].type, "child_notification_delivered");
assert.equal(feedEvents[0].ownerSessionId, "parent-a");

const stale = JSON.parse(readFileSync(join(runDir, "siso-child-stale.json"), "utf8"));
assert.equal(stale.parentNotifiedAt, undefined, "pre-session child records must not replay on startup");
const sibling = JSON.parse(readFileSync(join(runDir, "siso-child-sibling.json"), "utf8"));
assert.equal(sibling.parentNotifiedAt, undefined, "sibling parent child records must not notify this parent");

const unscopedDelivered = [];
const unscoped = await deliverPendingChildNotifications({
  sendMessage(message, options) {
    unscopedDelivered.push({ message, options });
  },
}, {
  limit: 10,
  now: () => "2026-05-08T12:00:45.000Z",
  sessionStartedAt: "2026-05-08T12:00:00.000Z",
});
assert.equal(unscoped.delivered, 0, "child notifications must not deliver without an explicit parent session scope");
assert.equal(unscopedDelivered.length, 0, "unscoped dispatch must not inject child completions into any chat");
const unscopedSibling = JSON.parse(readFileSync(join(runDir, "siso-child-sibling.json"), "utf8"));
assert.equal(unscopedSibling.parentNotifiedAt, undefined, "unscoped dispatch must not mark sibling records delivered");

const second = await deliverPendingChildNotifications(pi, {
  limit: 10,
  now: () => "2026-05-08T12:01:00.000Z",
  sessionStartedAt: "2026-05-08T12:00:00.000Z",
  parentSessionId: "parent-a",
});
assert.equal(second.delivered, 0);
assert.equal(delivered.length, 1, "terminal child notification should be delivered exactly once");

const batchRunDir = mkdtempSync(join(tmpdir(), "siso-child-notifications-batch-"));
process.env.SISO_CHILD_RUN_DIR = batchRunDir;
const batchA = {
  ...baseRecord,
  id: "siso-child-batch-a",
  task: "Batch child A",
  fleetId: "fleet-alpha",
  parentSessionId: "parent-batch",
  rootSessionId: "root-batch",
  ownerAgentId: "agent-batch",
  runRecordPath: join(batchRunDir, "siso-child-batch-a.json"),
};
const batchB = {
  ...baseRecord,
  id: "siso-child-batch-b",
  task: "Batch child B",
  fleetId: "fleet-alpha",
  parentSessionId: "parent-batch",
  rootSessionId: "root-batch",
  ownerAgentId: "agent-batch",
  runRecordPath: join(batchRunDir, "siso-child-batch-b.json"),
};
writeFileSync(batchA.runRecordPath, `${JSON.stringify(batchA, null, 2)}\n`);
writeFileSync(batchB.runRecordPath, `${JSON.stringify(batchB, null, 2)}\n`);
const batchXml = formatTaskNotificationBatch([batchA, batchB]);
assert.match(batchXml, /^<task-notification-batch>/);
assert.match(batchXml, /<count>2<\/count>/);
assert.match(batchXml, /<fleet-id>fleet-alpha<\/fleet-id>/);
const batched = [];
const batchPi = {
  sendMessage(message, options) {
    batched.push({ message, options });
  },
};
const batchResult = await deliverPendingChildNotifications(batchPi, {
  limit: 10,
  now: () => "2026-05-08T12:02:00.000Z",
  sessionStartedAt: "2026-05-08T12:00:00.000Z",
  parentSessionId: "parent-batch",
});
assert.equal(batchResult.delivered, 2);
assert.equal(batchResult.batches, 1);
assert.equal(batched.length, 1, "multiple terminal children should notify parent as one batch");
assert.equal(batched[0].message.customType, "siso-task-notification-batch");
assert.equal(batched[0].message.display, false);
assert.equal(batched[0].message.details.count, 2);
assert.deepEqual(Object.keys(batched[0].message.details).sort(), ["childIds", "count", "statuses"].sort());
assert.match(batched[0].message.content, /<task-notification-batch>/);
assert.doesNotMatch(JSON.stringify(batched[0].message.details), /finalOutput|events/);

const wrongParentRunDir = mkdtempSync(join(tmpdir(), "siso-child-notifications-wrong-parent-"));
process.env.SISO_CHILD_RUN_DIR = wrongParentRunDir;
const wrongParentRecord = {
  ...baseRecord,
  id: "siso-child-wrong-parent",
  parentSessionId: "right-parent",
  rootSessionId: "right-root",
  ownerAgentId: "right-parent",
  runRecordPath: join(wrongParentRunDir, "siso-child-wrong-parent.json"),
};
writeFileSync(wrongParentRecord.runRecordPath, `${JSON.stringify(wrongParentRecord, null, 2)}\n`);
const wrongParentMark = markParentNotificationDelivered(wrongParentRecord, "2026-05-08T12:03:00.000Z", {
  parentSessionId: "wrong-parent",
});
assert.equal(wrongParentMark.parentNotifiedAt, undefined, "wrong parent session must not mark a child delivered");
const stillUnmarked = JSON.parse(readFileSync(wrongParentRecord.runRecordPath, "utf8"));
assert.equal(stillUnmarked.parentNotifiedAt, undefined, "wrong parent mark must not persist delivery");

const crowdedRunDir = mkdtempSync(join(tmpdir(), "siso-child-notifications-crowded-"));
process.env.SISO_CHILD_RUN_DIR = crowdedRunDir;
for (let i = 0; i < 40; i++) {
  const siblingCrowd = {
    ...baseRecord,
    id: `siso-child-crowd-sibling-${i}`,
    parentSessionId: "crowd-other-parent",
    rootSessionId: "crowd-other-root",
    ownerAgentId: "crowd-other-parent",
    updatedAt: `2026-05-08T12:10:${String(i).padStart(2, "0")}.000Z`,
    runRecordPath: join(crowdedRunDir, `siso-child-crowd-sibling-${i}.json`),
  };
  writeFileSync(siblingCrowd.runRecordPath, `${JSON.stringify(siblingCrowd, null, 2)}\n`);
}
const crowdedTarget = {
  ...baseRecord,
  id: "siso-child-crowded-target",
  parentSessionId: "crowded-parent",
  rootSessionId: "crowded-root",
  ownerAgentId: "crowded-parent",
  updatedAt: "2026-05-08T12:00:00.000Z",
  runRecordPath: join(crowdedRunDir, "siso-child-crowded-target.json"),
};
writeFileSync(crowdedTarget.runRecordPath, `${JSON.stringify(crowdedTarget, null, 2)}\n`);
const crowdedDelivered = [];
const crowdedResult = await deliverPendingChildNotifications({
  sendMessage(message, options) {
    crowdedDelivered.push({ message, options });
  },
}, {
  limit: 3,
  now: () => "2026-05-08T12:11:00.000Z",
  sessionStartedAt: "2026-05-08T11:59:00.000Z",
  parentSessionId: "crowded-parent",
});
assert.equal(crowdedResult.delivered, 1, "many newer sibling records must not starve the scoped parent scan");
assert.equal(crowdedDelivered.length, 1);
assert.match(crowdedDelivered[0].message.content, /siso-child-crowded-target/);

const raceRunDir = mkdtempSync(join(tmpdir(), "siso-child-notifications-race-"));
process.env.SISO_CHILD_RUN_DIR = raceRunDir;
const raceRecord = {
  ...baseRecord,
  id: "siso-child-race",
  parentSessionId: "race-parent",
  rootSessionId: "race-root",
  ownerAgentId: "race-parent",
  runRecordPath: join(raceRunDir, "siso-child-race.json"),
};
writeFileSync(raceRecord.runRecordPath, `${JSON.stringify(raceRecord, null, 2)}\n`);
const raceDelivered = [];
const racePi = {
  async sendMessage(message, options) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    raceDelivered.push({ message, options });
  },
};
const [raceFirst, raceSecond] = await Promise.all([
  deliverPendingChildNotifications(racePi, {
    limit: 10,
    now: () => "2026-05-08T12:12:00.000Z",
    sessionStartedAt: "2026-05-08T11:59:00.000Z",
    parentSessionId: "race-parent",
  }),
  deliverPendingChildNotifications(racePi, {
    limit: 10,
    now: () => "2026-05-08T12:12:01.000Z",
    sessionStartedAt: "2026-05-08T11:59:00.000Z",
    parentSessionId: "race-parent",
  }),
]);
assert.equal(raceFirst.delivered + raceSecond.delivered, 1, "concurrent dispatchers must claim before sending");
assert.equal(raceDelivered.length, 1, "concurrent dispatchers must not send duplicate child completions");
const raceMarked = JSON.parse(readFileSync(raceRecord.runRecordPath, "utf8"));
assert.equal(raceMarked.parentNotification?.parentSessionId, "race-parent");
assert.equal(raceMarked.parentNotification?.deliveredAt, "2026-05-08T12:12:00.000Z");

const retryRunDir = mkdtempSync(join(tmpdir(), "siso-child-notifications-retry-"));
process.env.SISO_CHILD_RUN_DIR = retryRunDir;
const retryRecord = {
  ...baseRecord,
  id: "siso-child-retry-after-failed-send",
  parentSessionId: "retry-parent",
  rootSessionId: "retry-root",
  ownerAgentId: "retry-parent",
  runRecordPath: join(retryRunDir, "siso-child-retry-after-failed-send.json"),
};
writeFileSync(retryRecord.runRecordPath, `${JSON.stringify(retryRecord, null, 2)}\n`);
await assert.rejects(
  deliverPendingChildNotifications({
    sendMessage() {
      throw new Error("simulated follow-up send failure");
    },
  }, {
    limit: 10,
    now: () => "2026-05-08T12:13:00.000Z",
    sessionStartedAt: "2026-05-08T11:59:00.000Z",
    parentSessionId: "retry-parent",
  }),
  /simulated follow-up send failure/,
);
const retryAfterFailure = JSON.parse(readFileSync(retryRecord.runRecordPath, "utf8"));
assert.equal(retryAfterFailure.parentNotifiedAt, undefined, "failed sends must not mark delivered");
assert.equal(retryAfterFailure.parentNotification?.claimedAt, undefined, "failed sends must clear the durable claim for retry");
const retryDelivered = [];
const retryResult = await deliverPendingChildNotifications({
  sendMessage(message, options) {
    retryDelivered.push({ message, options });
  },
}, {
  limit: 10,
  now: () => "2026-05-08T12:13:30.000Z",
  sessionStartedAt: "2026-05-08T11:59:00.000Z",
  parentSessionId: "retry-parent",
});
assert.equal(retryResult.delivered, 1, "failed notification sends should be retryable");
assert.equal(retryDelivered.length, 1);

console.log("SISO_CHILD_NOTIFICATIONS_SMOKE_OK");
