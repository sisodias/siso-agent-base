#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";
import { appendFeedEvent, createMailboxMessage, markMailboxDelivered } from "../extensions/siso-agent-router/mailbox-feed.js";

const rootDir = mkdtempSync(join(tmpdir(), "siso-mailbox-tool-"));
process.env.SISO_MAILBOX_FEED_ROOT_DIR = rootDir;

const created = createMailboxMessage({
  id: "child-1",
  ownerSessionId: "parent-mailbox",
  childId: "child-1",
  summary: "Child finished.",
}, { rootDir });
markMailboxDelivered(created, "2026-05-10T12:00:00.000Z", { rootDir, ownerSessionId: "parent-mailbox" });
appendFeedEvent("#task/child-1", { type: "child_notification_delivered", childId: "child-1" }, { rootDir });

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

const ctx = { sessionId: "parent-mailbox" };
const list = await tools.get("siso_mailbox").execute("mailbox-list", { op: "list" }, undefined, undefined, ctx);
assert.match(list.content[0].text, /messages=1/);
assert.match(list.content[0].text, /id=child-1/);
assert.match(list.content[0].text, /state=delivered/);

const read = await tools.get("siso_mailbox").execute("mailbox-read", { op: "read", id: "child-1" }, undefined, undefined, ctx);
assert.match(read.content[0].text, /state=read/);

const ack = await tools.get("siso_mailbox").execute("mailbox-ack", { op: "ack", id: "child-1" }, undefined, undefined, ctx);
assert.match(ack.content[0].text, /state=acknowledged/);

const feed = await tools.get("siso_mailbox").execute("mailbox-feed", { op: "feed", channel: "#task/child-1" }, undefined, undefined, ctx);
assert.match(feed.content[0].text, /events=1/);
assert.match(feed.content[0].text, /child=child-1/);

console.log("SISO_MAILBOX_TOOL_SMOKE_OK");
