#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";
import { createMailboxMessage, markMailboxDelivered } from "../extensions/siso-agent-router/mailbox-feed.js";
import { attachTaskScope, findScopedTaskRecord, writeScopedTaskRecord } from "../extensions/siso-agent-router/task-registry.js";

const taskRoot = mkdtempSync(join(tmpdir(), "siso-agents-command-"));
const mailboxRoot = mkdtempSync(join(tmpdir(), "siso-agents-command-mailbox-"));
process.env.SISO_TASK_ROOT_DIR = taskRoot;
process.env.SISO_MAILBOX_FEED_ROOT_DIR = mailboxRoot;
process.env.SISO_ROOT_SESSION_ID = "root-command";
process.env.SISO_PARENT_SESSION_ID = "parent-command";
process.env.SISO_AGENT_ID = "agent-command";

const baseTime = Date.now() - 30 * 60 * 1000;
function iso(minutes) {
  return new Date(baseTime + minutes * 60 * 1000).toISOString();
}

writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-command",
  status: "completed",
  task: "Summarize the scoped command surface",
  fleetId: "fleet-command",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: iso(0),
  completedAt: iso(0.5),
  updatedAt: iso(0.5),
  compactResult: { summary: "Scoped /agents command works.", findings: [], files: [], next_action: "Keep building fleets." },
  finalOutput: "Scoped /agents command works.",
  tokens: { input: 1000, output: 250, totalTokens: 1250 },
  toolCalls: 4,
  events: [
    {
      type: "run_started",
      runId: "siso-child-command",
      surface: "child",
      profile: "minimax.worker",
      model: "MiniMax M2.7",
      timestamp: iso(0),
    },
    {
      type: "tool_call",
      runId: "siso-child-command",
      surface: "child",
      toolName: "read",
      toolCallId: "tool-command-1",
      timestamp: iso(0.2),
    },
    {
      type: "run_finished",
      runId: "siso-child-command",
      surface: "child",
      status: "completed",
      totalTokens: 1250,
      timestamp: iso(0.5),
    },
  ],
}));
const mailboxRecord = createMailboxMessage({
  id: "siso-child-command",
  ownerSessionId: "parent-command",
  childId: "siso-child-command",
  summary: "Scoped /agents command works.",
}, { rootDir: mailboxRoot });
markMailboxDelivered(mailboxRecord, iso(0.6), { rootDir: mailboxRoot, ownerSessionId: "parent-command" });
writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-sibling-command",
  status: "completed",
  task: "This sibling must stay hidden",
  rootSessionId: "root-command",
  parentSessionId: "parent-other",
  ownerAgentId: "agent-other",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: iso(0),
  completedAt: iso(0.5),
  updatedAt: iso(0.5),
  compactResult: { summary: "Hidden sibling.", findings: [], files: [], next_action: "none" },
  finalOutput: "Hidden sibling.",
  tokens: { input: 1, output: 1, totalTokens: 2 },
  toolCalls: 1,
}));
writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-running-command",
  status: "background",
  task: "Keep working until parent stops the fleet",
  fleetId: "fleet-stop",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: iso(1),
  updatedAt: iso(1),
  compactResult: { summary: "Still running.", findings: [], files: [], next_action: "wait" },
  tokens: { input: 10, output: 5, totalTokens: 15 },
  toolCalls: 1,
  budget: {},
}));
writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-hidden-running-command",
  status: "background",
  task: "Hidden sibling must not be stopped",
  fleetId: "fleet-stop",
  rootSessionId: "root-command",
  parentSessionId: "parent-other",
  ownerAgentId: "agent-other",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: iso(1),
  updatedAt: iso(1),
  compactResult: { summary: "Hidden and running.", findings: [], files: [], next_action: "wait" },
  tokens: { input: 10, output: 5, totalTokens: 15 },
  toolCalls: 1,
}));
writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-queued-command",
  status: "queued",
  task: "Drain this queued fleet child",
  fleetId: "fleet-drain",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: iso(2),
  updatedAt: iso(2),
  queuedAt: iso(2),
  queuedReason: "Fleet fleet-drain spawn blocked: max_parallel 1/1",
  queuedSpawn: {
    task: "Drain this queued fleet child",
    dryRun: true,
    background: true,
    fleetId: "fleet-drain",
    budget: { maxParallel: 1 },
  },
  compactResult: { summary: "Queued.", findings: [], files: [], next_action: "drain later" },
  tokens: { input: 0, output: 0, totalTokens: 0 },
  toolCalls: 0,
}));
writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-cancel-queued-command",
  status: "queued",
  task: "Cancel this queued fleet child",
  fleetId: "fleet-cancel",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: iso(3),
  updatedAt: iso(3),
  queuedAt: iso(3),
  queuedReason: "Fleet fleet-cancel spawn blocked: max_parallel 1/1",
  queuedSpawn: {
    task: "Cancel this queued fleet child",
    background: true,
    fleetId: "fleet-cancel",
    budget: { maxParallel: 1 },
  },
  compactResult: { summary: "Queued.", findings: [], files: [], next_action: "cancel later" },
  tokens: { input: 0, output: 0, totalTokens: 0 },
  toolCalls: 0,
}));
writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-blocked-drain-active",
  status: "background",
  task: "Keep fleet-drain-blocked at capacity",
  fleetId: "fleet-drain-blocked",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: iso(4),
  updatedAt: iso(4),
  compactResult: { summary: "Still running.", findings: [], files: [], next_action: "wait" },
  tokens: { input: 0, output: 0, totalTokens: 0 },
  toolCalls: 0,
}));
writeScopedTaskRecord(attachTaskScope({
  id: "siso-child-blocked-drain-queued",
  status: "queued",
  task: "Stay queued until capacity opens",
  fleetId: "fleet-drain-blocked",
  profile: "minimax.worker",
  model: "MiniMax M2.7",
  startedAt: iso(5),
  updatedAt: iso(5),
  queuedAt: iso(5),
  queuedReason: "Fleet fleet-drain-blocked spawn blocked: max_parallel 1/1",
  queuedSpawn: {
    task: "Stay queued until capacity opens",
    background: true,
    fleetId: "fleet-drain-blocked",
    budget: { maxParallel: 1 },
  },
  compactResult: { summary: "Queued.", findings: [], files: [], next_action: "drain later" },
  tokens: { input: 0, output: 0, totalTokens: 0 },
  toolCalls: 0,
}));

const commands = new Map();
const pi = {
  on() {},
  registerCommand(name, spec) {
    commands.set(name, spec);
  },
  registerTool() {},
  registerMessageRenderer() {},
  getAllTools: () => [],
};

sisoAgentRouterExtension(pi);
const ctx = { sessionId: "parent-command", hasUI: false };

function assertCompactAgentRecord(record, label) {
  assert.ok(record, `${label} should include a details record`);
  assert.equal("events" in record, false, `${label} should not expose raw event arrays`);
  assert.equal("finalOutput" in record, false, `${label} should not expose raw final output`);
  assert.equal("queuedSpawn" in record, false, `${label} should not expose queued spawn payloads`);
  if (record.result) assert.equal("final" in record.result, false, `${label} should not expose raw result.final`);
}

const list = await commands.get("agents").handler("", ctx);
const listText = list.content[0].text;
assert.match(listText, /Scoped agents:/);
assert.match(listText, /3 queued/);
assert.match(listText, /siso-child-command/);
assert.match(listText, /3 events · last tool read/);
assert.match(listText, /siso-child-queued-command/);
assert.match(listText, /Summarize the scoped command surface/);
assert.doesNotMatch(listText, /siso-child-sibling-command/);
assert.ok(list.details.records.length > 0);
for (const record of list.details.records) assertCompactAgentRecord(record, "agent list details");
const fleets = await commands.get("agents").handler("fleets", ctx);
assert.match(fleets.content[0].text, /fleet fleet-command/);
assert.match(fleets.content[0].text, /1 complete/);
assert.match(fleets.content[0].text, /fleet fleet-drain/);
assert.match(fleets.content[0].text, /1 queued/);
assert.doesNotMatch(fleets.content[0].text, /parent-other/);

const queue = await commands.get("agents").handler("queue fleet-drain", ctx);
assert.match(queue.content[0].text, /Queued agents: 1/);
assert.match(queue.content[0].text, /siso-child-queued-command/);
assert.match(queue.content[0].text, /Fleet fleet-drain spawn blocked: max_parallel 1\/1/);

const help = await commands.get("agents").handler("help", ctx);
assert.match(help.content[0].text, /SISO agents command/);
assert.match(help.content[0].text, /\/agents report latest <limit>/);
assert.match(help.content[0].text, /\/agents report over-budget/);
assert.match(help.content[0].text, /\/agents report stale <duration>/);
assert.match(help.content[0].text, /\/agents files <task-id\|name>/);
assert.match(help.content[0].text, /\/agents peek <task-id\|name> <artifact> \[bytes\]/);
assert.match(help.content[0].text, /\/agents stop <task-id\|name\|fleet-id>/);
assert.match(help.content[0].text, /Durations: 30s, 5m, 1h, 1d/);

const report = await commands.get("agents").handler("report", ctx);
assert.match(report.content[0].text, /SISO agents report/);
assert.match(report.content[0].text, /Totals: 6 agents · 2 active · 3 queued · 1 complete · 0 failed · 1\.3kt · 5 tools · 3 events/);
assert.match(report.content[0].text, /Supervisor: 2 watched · 0 healthy · 0 warn · 0 stale · 2 dead/);
assert.match(report.content[0].text, /Mailbox: 1 delivered · 0 read · 0 acknowledged · 1 unacked/);
assert.match(report.content[0].text, /Fleets: .*fleet-command/);
assert.match(report.content[0].text, /Fleets: .*fleet-stop/);
assert.match(report.content[0].text, /Fleets: .*fleet-drain/);
assert.match(report.content[0].text, /Fleets: .*fleet-cancel/);
assert.match(report.content[0].text, /Fleets: .*fleet-drain-blocked/);
assert.match(report.content[0].text, /Active \(2\)/);
assert.match(report.content[0].text, /Queued \(3\)/);
assert.match(report.content[0].text, /Completed \(1\)/);
assert.match(report.content[0].text, /siso-child-command · completed · minimax\.worker · 1\.3kt · 4 tools · 3 events · last tool read · fleet fleet-command/);
assert.match(report.content[0].text, /siso-child-running-command · launched · minimax\.worker · 15t · 1 tools · stale [0-9a-z ]+ · fleet fleet-stop/);
assert.doesNotMatch(report.content[0].text, /siso-child-sibling-command/);

const fleetReport = await commands.get("agents").handler("report fleet-drain-blocked", ctx);
assert.match(fleetReport.content[0].text, /SISO agents report · target fleet-drain-blocked/);
assert.match(fleetReport.content[0].text, /Totals: 2 agents · 1 active · 1 queued · 0 complete · 0 failed · 0t · 0 tools · 0 events/);
assert.match(fleetReport.content[0].text, /Fleets: fleet-drain-blocked/);
assert.match(fleetReport.content[0].text, /siso-child-blocked-drain-active/);
assert.match(fleetReport.content[0].text, /siso-child-blocked-drain-queued/);
assert.doesNotMatch(fleetReport.content[0].text, /siso-child-command/);

const emptyFleetReport = await commands.get("agents").handler("report fleet-missing", ctx);
assert.equal(emptyFleetReport.content[0].text, "No scoped SISO task records found for fleet fleet-missing.");

const budgetReport = await commands.get("agents").handler("report over-budget", ctx);
assert.match(budgetReport.content[0].text, /No over-budget scoped SISO task records found for this parent\./);

const activeReport = await commands.get("agents").handler("report active", ctx);
assert.match(activeReport.content[0].text, /SISO agents report · target active/);
assert.match(activeReport.content[0].text, /Totals: 2 agents · 2 active · 0 queued · 0 complete · 0 failed · 15t · 1 tools · 0 events/);
assert.match(activeReport.content[0].text, /Active \(2\)/);
assert.match(activeReport.content[0].text, /siso-child-running-command/);
assert.match(activeReport.content[0].text, /siso-child-blocked-drain-active/);
assert.doesNotMatch(activeReport.content[0].text, /siso-child-command/);

const queuedReport = await commands.get("agents").handler("summary queued", ctx);
assert.match(queuedReport.content[0].text, /SISO agents report · target queued/);
assert.match(queuedReport.content[0].text, /Totals: 3 agents · 0 active · 3 queued · 0 complete · 0 failed · 0t · 0 tools · 0 events/);
assert.match(queuedReport.content[0].text, /Queued \(3\)/);
assert.doesNotMatch(queuedReport.content[0].text, /siso-child-running-command/);

const latestReport = await commands.get("agents").handler("report latest 2", ctx);
assert.match(latestReport.content[0].text, /SISO agents report · target latest/);
assert.match(latestReport.content[0].text, /Totals: 2 agents · 1 active · 1 queued · 0 complete · 0 failed · 0t · 0 tools · 0 events/);
assert.match(latestReport.content[0].text, /siso-child-blocked-drain-queued/);
assert.match(latestReport.content[0].text, /siso-child-blocked-drain-active/);
assert.doesNotMatch(latestReport.content[0].text, /siso-child-command/);

const staleReport = await commands.get("agents").handler("report stale", ctx);
assert.match(staleReport.content[0].text, /SISO agents report · target stale/);
assert.match(staleReport.content[0].text, /Stale threshold: 15m/);
assert.match(staleReport.content[0].text, /Totals: 2 agents · 2 active · 0 queued · 0 complete · 0 failed · 15t · 1 tools · 0 events/);
assert.match(staleReport.content[0].text, /Active \(2\)/);
assert.match(staleReport.content[0].text, /siso-child-running-command .*stale [0-9a-z ]+/);
assert.match(staleReport.content[0].text, /siso-child-blocked-drain-active .*stale [0-9a-z ]+/);
assert.doesNotMatch(staleReport.content[0].text, /siso-child-command/);

const staleDayReport = await commands.get("agents").handler("report stale 1d", ctx);
assert.equal(staleDayReport.content[0].text, "No stale active scoped SISO task records found for this parent at threshold 1d.");

const detail = await commands.get("agents").handler("status siso-child-command", ctx);
assert.match(detail.content[0].text, /Scope: root=root-command parent=parent-command owner=agent-command/);
assert.match(detail.content[0].text, /Handoff:/);
assert.match(detail.content[0].text, /Events: 3 · latest run_finished run=siso-child-command surface=child status=completed total_tokens=1250/);
assert.match(detail.content[0].text, /Events file: .*events\.jsonl/);
assertCompactAgentRecord(detail.details.record, "agent detail details");

const runtimeBudgetDetail = await commands.get("agents").handler("status siso-child-running-command", ctx);
assert.doesNotMatch(runtimeBudgetDetail.content[0].text, /Budget: exceeded runtime_ms/);

const named = await commands.get("agents").handler("name siso-child-command verifier", ctx);
assert.match(named.content[0].text, /@verifier/);
const namedDetail = await commands.get("agents").handler("status verifier", ctx);
assert.match(namedDetail.content[0].text, /Name: @verifier/);
assert.match(namedDetail.content[0].text, /Addressable: yes/);
assert.match(namedDetail.content[0].text, /Events file: .*events\.jsonl/);

const events = await commands.get("agents").handler("events verifier 2", ctx);
assert.match(events.content[0].text, /Events for @verifier: 3 total · showing 2/);
assert.match(events.content[0].text, /tool_call run=siso-child-command surface=child tool=read call=tool-command-1/);
assert.match(events.content[0].text, /run_finished run=siso-child-command surface=child status=completed total_tokens=1250/);
assert.doesNotMatch(events.content[0].text, /run_started run=siso-child-command/);

const verifierRecord = findScopedTaskRecord("verifier", {
  rootSessionId: "root-command",
  parentSessionId: "parent-command",
  ownerAgentId: "agent-command",
});
writeFileSync(verifierRecord.paths.stdout, "x".repeat(55_000), "utf8");
const files = await commands.get("agents").handler("files verifier", ctx);
assert.match(files.content[0].text, /Files for @verifier/);
assert.match(files.content[0].text, /Summary: 6 existing · 3 missing · 1 large/);
assert.match(files.content[0].text, /task: .*task\.json · exists · [0-9.]+[km]?b/);
assert.match(files.content[0].text, /events: .*events\.jsonl · exists · [0-9.]+[km]?b/);
assert.match(files.content[0].text, /transcript: .*transcript\.jsonl · exists · [0-9.]+[km]?b/);
assert.match(files.content[0].text, /summary: .*summary\.md · exists · [0-9.]+[km]?b/);
assert.match(files.content[0].text, /handoff: .*handoff\.md · exists · [0-9.]+[km]?b/);
assert.match(files.content[0].text, /stdout: .*stdout\.jsonl · exists · 55kb · large, use narrow reads/);
assert.doesNotMatch(files.content[0].text, /Scoped \/agents command works\./);
assertCompactAgentRecord(files.details.record, "agent files details");

const peek = await commands.get("agents").handler("peek verifier stdout 80", ctx);
assert.match(peek.content[0].text, /Peek @verifier stdout · .*stdout\.jsonl · 80b of 55kb/);
assert.match(peek.content[0].text, /truncated: showing 80b of 55kb/);
assert.match(peek.content[0].text, /---\nx{80}\n---/);
assertCompactAgentRecord(peek.details.record, "agent peek details");

const missingPeek = await commands.get("agents").handler("peek verifier stderr 80", ctx);
assert.match(missingPeek.content[0].text, /@verifier stderr: missing/);

const unknownPeek = await commands.get("agents").handler("peek verifier nonsense 80", ctx);
assert.match(unknownPeek.content[0].text, /No artifact "nonsense" found for @verifier/);
assert.match(unknownPeek.content[0].text, /Available: task, events, transcript, summary, handoff, stdout, stderr, exit, artifacts/);

const hiddenPeek = await commands.get("agents").handler("peek siso-child-sibling-command stdout 80", ctx);
assert.equal(hiddenPeek.content[0].text, "No scoped SISO task found for this parent.");

const hiddenFiles = await commands.get("agents").handler("files siso-child-sibling-command", ctx);
assert.equal(hiddenFiles.content[0].text, "No scoped SISO task found for this parent.");

const handoff = await commands.get("agents").handler("handoff verifier", ctx);
assert.match(handoff.content[0].text, /# SISO Child Task Handoff/);
assert.match(handoff.content[0].text, /Scoped \/agents command works\./);

const resume = await commands.get("agents").handler("resume verifier Continue checking the command path", ctx);
assert.match(resume.content[0].text, /no legacy child-run path to resume yet/);

const stopped = await commands.get("agents").handler("stop fleet-stop", ctx);
assert.match(stopped.content[0].text, /Stopped fleet fleet-stop: siso-child-running-command/);
assert.doesNotMatch(stopped.content[0].text, /siso-child-hidden-running-command/);
const stoppedDetail = await commands.get("agents").handler("status siso-child-running-command", ctx);
assert.match(stoppedDetail.content[0].text, /aborted/);
assert.match(stoppedDetail.content[0].text, /Stopped with fleet fleet-stop by parent/);
const hiddenStillHidden = await commands.get("agents").handler("status siso-child-hidden-running-command", ctx);
assert.equal(hiddenStillHidden.content[0].text, "No scoped SISO task found for this parent.");

const queuedDetail = await commands.get("agents").handler("status siso-child-queued-command", ctx);
assert.match(queuedDetail.content[0].text, /queued/);
assert.match(queuedDetail.content[0].text, new RegExp(`Queued: ${iso(2).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
assert.match(queuedDetail.content[0].text, /Queue reason: Fleet fleet-drain spawn blocked: max_parallel 1\/1/);

const cancelled = await commands.get("agents").handler("cancel fleet-cancel", ctx);
assert.match(cancelled.content[0].text, /Cancelled queued fleet fleet-cancel: siso-child-cancel-queued-command/);
const cancelledRecord = findScopedTaskRecord("siso-child-cancel-queued-command", {
  rootSessionId: "root-command",
  parentSessionId: "parent-command",
  ownerAgentId: "agent-command",
});
assert.equal(cancelledRecord.status, "cancelled");
assert.match(cancelledRecord.error, /Cancelled with fleet fleet-cancel by parent/);
const cancelQueue = await commands.get("agents").handler("queue fleet-cancel", ctx);
assert.equal(cancelQueue.content[0].text, "No queued scoped SISO tasks found for this parent.");

const blockedDrain = await commands.get("agents").handler("drain fleet-drain-blocked", ctx);
assert.match(blockedDrain.content[0].text, /blocked siso-child-blocked-drain-queued: Fleet fleet-drain-blocked spawn blocked: max_parallel 1\/1/);
const stillQueued = findScopedTaskRecord("siso-child-blocked-drain-queued", {
  rootSessionId: "root-command",
  parentSessionId: "parent-command",
  ownerAgentId: "agent-command",
});
assert.equal(stillQueued.status, "queued");
assert.match(stillQueued.queuedReason, /max_parallel 1\/1/);

const drained = await commands.get("agents").handler("drain fleet-drain", ctx);
assert.match(drained.content[0].text, /dispatched siso-child-queued-command -> siso-child-/);
const drainedRecord = findScopedTaskRecord("siso-child-queued-command", {
  rootSessionId: "root-command",
  parentSessionId: "parent-command",
  ownerAgentId: "agent-command",
});
assert.equal(drainedRecord.status, "completed");
assert.match(drainedRecord.result.summary, /Dispatched queued task as siso-child-/);

const hidden = await commands.get("agents").handler("status siso-child-sibling-command", ctx);
assert.equal(hidden.content[0].text, "No scoped SISO task found for this parent.");

console.log("SISO_AGENTS_COMMAND_SMOKE_OK");
