#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  appendFeedEvent,
  createMailboxMessage,
  listMailboxMessages,
  markMailboxAcknowledged,
  markMailboxDelivered,
  markMailboxRead,
  normalizeChannelName,
  readMailboxMessage,
  readFeedEvents,
  shouldRedeliver,
} from "../extensions/siso-agent-router/mailbox-feed.js";

const rootDir = mkdtempSync(join(tmpdir(), "siso-mailbox-feed-"));
process.env.SISO_MAILBOX_FEED_ROOT_DIR = rootDir;

assert.equal(normalizeChannelName("session"), "#session");
assert.equal(normalizeChannelName(" #task//alpha "), "#task/alpha");

const created = createMailboxMessage(
  {
    id: "message-1",
    ownerSessionId: "session-a",
    subject: "Durable mailbox entry",
    body: "queued payload",
  },
  { rootDir },
);

assert.equal(created.state, "queued");
assert.equal(created.ownerSessionId, "session-a");
assert.ok(created.mailboxPath?.endsWith("/mailboxes/session-a/message-1.json"));
assert.ok(existsSync(created.mailboxPath));
assert.equal(JSON.parse(readFileSync(created.mailboxPath, "utf8")).state, "queued");

const delivered = markMailboxDelivered(created, "2026-05-10T12:00:00.000Z", {
  rootDir,
  ownerSessionId: "session-a",
});
assert.equal(delivered.state, "delivered");
assert.equal(delivered.deliveredAt, "2026-05-10T12:00:00.000Z");
assert.equal(delivered.redeliveredAt, undefined);

const read = markMailboxRead(delivered, "2026-05-10T12:00:05.000Z", {
  rootDir,
  ownerSessionId: "session-a",
});
assert.equal(read.state, "read");
assert.equal(read.readAt, "2026-05-10T12:00:05.000Z");
assert.equal(shouldRedeliver(read, { ownerSessionId: "session-a" }), true);

const acknowledged = markMailboxAcknowledged(read, "2026-05-10T12:00:10.000Z", {
  rootDir,
  ownerSessionId: "session-a",
});
assert.equal(acknowledged.state, "acknowledged");
assert.equal(acknowledged.acknowledgedAt, "2026-05-10T12:00:10.000Z");
assert.equal(shouldRedeliver(acknowledged, { ownerSessionId: "session-a" }), false);
assert.equal(readMailboxMessage({ id: "message-1", ownerSessionId: "session-a" }, { rootDir }).state, "acknowledged");
assert.equal(listMailboxMessages({ rootDir, ownerSessionId: "session-a" }).length, 1);

const guardedBase = createMailboxMessage(
  {
    id: "message-guarded",
    ownerSessionId: "session-a",
    subject: "Guarded mailbox entry",
  },
  { rootDir },
);
const guarded = markMailboxDelivered(guardedBase, "2026-05-10T12:01:00.000Z", {
  rootDir,
  ownerSessionId: "session-b",
});
assert.equal(guarded.deliveredAt, guardedBase.deliveredAt);
assert.equal(guarded.state, guardedBase.state);

const redeliverable = createMailboxMessage(
  {
    id: "message-2",
    ownerSessionId: "session-a",
    subject: "Needs redelivery",
  },
  { rootDir },
);
const firstDelivery = markMailboxDelivered(redeliverable, "2026-05-10T12:02:00.000Z", {
  rootDir,
  ownerSessionId: "session-a",
});
const secondDelivery = markMailboxDelivered(firstDelivery, "2026-05-10T12:03:00.000Z", {
  rootDir,
  ownerSessionId: "session-a",
});
assert.equal(secondDelivery.state, "delivered");
assert.equal(secondDelivery.redeliveredAt, "2026-05-10T12:03:00.000Z");
assert.equal(shouldRedeliver(secondDelivery, { ownerSessionId: "session-a" }), true);

const feedEventA = appendFeedEvent("#task/alpha", { type: "task_started", taskId: "alpha" }, { rootDir });
const feedEventB = appendFeedEvent("task/alpha", { type: "task_finished", taskId: "alpha" }, { rootDir });

assert.equal(feedEventA.channelName, "#task/alpha");
assert.equal(feedEventB.channelName, "#task/alpha");
assert.ok(feedEventA.feedPath?.endsWith("/feeds/task/alpha.jsonl"));
assert.ok(existsSync(feedEventA.feedPath));

const feedEvents = readFeedEvents(" #task//alpha ", { rootDir });
assert.equal(feedEvents.length, 2);
assert.deepEqual(
  feedEvents.map((event) => event.type),
  ["task_started", "task_finished"],
);
assert.equal(feedEvents[0].channelName, "#task/alpha");

console.log("SISO_MAILBOX_FEED_SMOKE_OK");
