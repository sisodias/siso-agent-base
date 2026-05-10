#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sisoStatusExtension from "../extensions/siso-status/index.js";

process.env.SISO_STATUS_UI = "full";
process.env.SISO_STATUS_POLL_MS = "0";
delete process.env.SISO_STATUS_TIMELINE;
globalThis.__SISO_ROUTER_STATUS__ = {
  updatedAt: new Date().toISOString(),
  profile: "minimax.scout",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  activeChildId: "siso-native-smoke",
  child: {
    id: "siso-native-smoke",
    status: "running",
    rootSessionId: "siso-status-widget-session",
    parentSessionId: "siso-status-widget-session",
    ownerAgentId: "siso-status-widget-session",
    depth: 0,
    runtime: "native-subagent",
    profile: "minimax.scout",
    lane: "minimax",
    model: "claude-haiku-4-5-20251001",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    task: "Inspect renderer placement and token display",
    tokens: { input: 1200, output: 300, totalTokens: 1500 },
    toolCalls: 2,
    compactResult: { summary: "checking widget", findings: [], files: [], next_action: "wait" },
  },
  children: {},
};
globalThis.__SISO_ROUTER_STATUS__.children["siso-native-smoke"] = globalThis.__SISO_ROUTER_STATUS__.child;

const handlers = new Map();
const commands = new Map();
const widgetCalls = [];
const statusCalls = [];
const pi = {
  on(event, handler) {
    handlers.set(event, handler);
  },
  registerCommand(name, command) {
    commands.set(name, command);
  },
  registerTool() {},
  registerMessageRenderer(name, renderer) {
    handlers.set(`message_renderer:${name}`, renderer);
  },
};
const ctx = {
  sessionId: "siso-status-widget-session",
  hasUI: true,
  ui: {
    setStatus(key, text) {
      statusCalls.push({ key, text });
    },
    setWidget(key, lines, options) {
      widgetCalls.push({ key, lines, options });
    },
  },
};

sisoStatusExtension(pi);
handlers.get("session_start")?.({}, ctx);

const latestWidget = widgetCalls.at(-1);
assert.equal(statusCalls.at(-1)?.key, "siso-status");
assert.ok(statusCalls.at(-1)?.text.includes("1.5k tok"), "status line should surface real active child token usage");
assert.equal(latestWidget?.key, "siso-status");
assert.equal(typeof latestWidget.lines, "function", "full status UI should publish a native Loader widget factory for active subagents");
const fakeTui = { requestRender() {} };
const fakeTheme = { fg(_key, text) { return text; }, bold(text) { return text; } };
function assertCleanDefaultWidget(lines, label) {
  assert.ok(lines.length <= 4, `${label} should stay within the 4-line Widget render budget`);
  assert.ok(!lines.some((line) => line.trim() === ""), `${label} should not render blank spacer rows`);
  assert.ok(!lines.some((line) => /^(π|ctx |run |tools |activity |prompt )/.test(line)), `${label} should not leak raw diagnostic prefixes`);
  assert.ok(!lines.some((line) => /\b(kind=|runtime=native-subagent|child_id=|tool:start|input=\d+c|result=\d+c)\b/.test(line)), `${label} should not leak raw telemetry key-values`);
  assert.ok(!lines.some((line) => /\bsiso-child-[\w-]+|\bsiso-native-[\w-]+/.test(line)), `${label} should not expose raw child ids`);
}
const component = latestWidget.lines(fakeTui, fakeTheme);
const renderedLines = component.render(120);
assertCleanDefaultWidget(renderedLines, "active child widget");
assert.ok(renderedLines.length <= 4, "status widget should stay bounded to four rendered lines");
assert.ok(!renderedLines.some((line) => line.trim() === ""), "status widget should not render blank spacer rows");
assert.ok(!renderedLines.some((line) => /^(π|ctx |run |tools |activity |prompt )/.test(line)), "full status widget should not leak diagnostics already covered by native footer/status surfaces");
assert.ok(renderedLines.some((line) => /^\s*[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] /.test(line)), "active child widget should render Pi's native Loader spinner");
assert.ok(renderedLines.some((line) => line.includes("Agent running · scout")), "active child row should render as a first-class agent status event");
assert.ok(renderedLines.some((line) => line.includes("Inspect renderer placement token")), "active child row should show a short child task label");
assert.ok(!renderedLines.some((line) => line.includes("Inspect renderer placement and token display")), "active child task labels should stay under five words");
assert.ok(renderedLines.some((line) => line.includes("2 checks")), "active child row should show compact check counts instead of telemetry wording");
assert.ok(renderedLines.some((line) => line.includes("1.5k tok")), "active child row should show compact token usage when available");
assert.ok(!renderedLines.some((line) => /\b1\.5k tokens\b/.test(line)), "active child row should avoid verbose token labels");
assert.ok(!renderedLines.some((line) => line.includes("siso-native-smoke")), "active child row should not expose raw child ids");
component.dispose?.();
assert.equal(latestWidget.options?.placement, "belowEditor");

globalThis.__SISO_ROUTER_STATUS__ = {
  updatedAt: new Date().toISOString(),
  children: {
    "siso-child-first": {
      id: "siso-child-first",
      status: "background",
      rootSessionId: "siso-status-widget-session",
      parentSessionId: "siso-status-widget-session",
      ownerAgentId: "siso-status-widget-session",
      depth: 0,
      profile: "minimax.worker",
      model: "claude-haiku-4-5-20251001",
      startedAt: new Date(Date.now() - 20_000).toISOString(),
      updatedAt: new Date(Date.now() - 20_000).toISOString(),
      task: "Run commands · 2 calls · 2 done · latest bash tail -80 extensions/siso-agent-router/index.js && grep -n ChildAgentRow",
      tokens: { totalTokens: 900 },
      toolCalls: 2,
      compactResult: { summary: "tail command output", findings: [], files: [], next_action: "wait" },
    },
    "siso-child-second": {
      id: "siso-child-second",
      status: "background",
      rootSessionId: "siso-status-widget-session",
      parentSessionId: "siso-status-widget-session",
      ownerAgentId: "siso-status-widget-session",
      depth: 0,
      profile: "spark.worker",
      model: "gpt-5.3-codex-spark",
      startedAt: new Date(Date.now() - 10_000).toISOString(),
      updatedAt: new Date().toISOString(),
      task: "Inspect subagent ordering and labels across the status widget",
      tokens: { totalTokens: 1800 },
      toolCalls: 3,
      compactResult: { summary: "checking ordering", findings: [], files: [], next_action: "wait" },
    },
  },
};
handlers.get("session_start")?.({}, ctx);
const stableWidget = widgetCalls.at(-1);
const stableComponent = stableWidget.lines(fakeTui, fakeTheme);
const stableLines = stableComponent.render(140);
assertCleanDefaultWidget(stableLines, "stable active child widget");
assert.ok(stableLines.length <= 4, "multiple active child rows should stay bounded to four rendered lines");
assert.ok(!stableLines.some((line) => line.trim() === ""), "multiple active child rows should not use blank spacer rows");
const firstIndex = stableLines.findIndex((line) => line.includes("Agent running · worker"));
const secondIndex = stableLines.findIndex((line) => line.includes("Agent running · Spark worker"));
assert.ok(firstIndex >= 0 && secondIndex >= 0, "stable widget should render both active children");
assert.ok(firstIndex < secondIndex, "active child rows should stay in spawn order instead of jumping by latest update");
assert.ok(stableLines.some((line) => line.includes("Inspect TUI components")), "command-style tasks should be summarized into a readable short label");
assert.ok(!stableLines.some((line) => /Run commands|latest bash|tail -80|grep -n/.test(line)), "active child rows should not leak command-run diagnostics");
assert.ok(stableLines.some((line) => line.includes("Inspect subagent ordering labels")), "normal task labels should be capped to four words");
assert.ok(!stableLines.some((line) => line.includes("Inspect subagent ordering and labels across")), "normal task labels should not show long task text");
stableComponent.dispose?.();

handlers.get("before_agent_start")?.({ prompt: "Improve agent system", model: "gpt-5.5", skill: "improve-agent-system" }, ctx);
handlers.get("tool_call")?.({ toolName: "rg", input: { pattern: "Loader", path: "extensions/siso-status" } }, ctx);
handlers.get("tool_result")?.({ toolName: "rg", result: "extensions/siso-status/index.js" }, ctx);
handlers.get("tool_call")?.({ toolName: "apply_patch", input: { file: "extensions/siso-status/index.js" } }, ctx);
handlers.get("tool_result")?.({ toolName: "apply_patch", result: "Success" }, ctx);
const timelineWidget = widgetCalls.at(-1);
const timelineComponent = timelineWidget.lines(fakeTui, fakeTheme);
const timelineLines = timelineComponent.render(120);
assertCleanDefaultWidget(timelineLines, "default timeline-disabled widget");
assert.ok(timelineLines.length <= 4, "normal status widget should stay bounded to four rendered lines after local activity");
assert.ok(!timelineLines.some((line) => line.trim() === ""), "normal status widget should not insert blank spacer rows after local activity");
assert.ok(!timelineLines.some((line) => line.includes("Skill improve-agent-system")), "status widget should not show timeline rows unless explicitly enabled");
assert.ok(!timelineLines.some((line) => line.includes("Search repo")), "status widget should keep tool timeline rows out of the normal TUI");
assert.ok(!timelineLines.some((line) => line.includes("Edit files")), "status widget should keep edit timeline rows out of the normal TUI");
timelineComponent.dispose?.();

process.env.SISO_STATUS_TIMELINE = "1";
handlers.get("tool_call")?.({ toolName: "rg", input: { pattern: "Loader", path: "extensions/siso-status" } }, ctx);
const optInTimelineWidget = widgetCalls.at(-1);
const optInTimelineComponent = optInTimelineWidget.lines(fakeTui, fakeTheme);
const optInTimelineLines = optInTimelineComponent.render(120);
assertCleanDefaultWidget(optInTimelineLines, "opt-in timeline widget");
assert.ok(optInTimelineLines.length <= 4, "opt-in timeline widget should share the four-line widget budget");
assert.ok(!optInTimelineLines.some((line) => line.trim() === ""), "opt-in timeline widget should not insert blank spacer rows");
assert.ok(optInTimelineLines.some((line) => line.includes("Skill improve-agent-system")), "opt-in status timeline should show a clean skill row");
assert.ok(optInTimelineLines.some((line) => line.includes("Search repo")), `opt-in status timeline should group search/read tools into one row: ${JSON.stringify(optInTimelineLines)}`);
assert.ok(optInTimelineLines.some((line) => line.includes("Edit files")), `opt-in status timeline should group edit tools into one row: ${JSON.stringify(optInTimelineLines)}`);
assert.ok(!optInTimelineLines.some((line) => /tool:start|input=\d+c|result=\d+c/.test(line)), "opt-in status timeline should not leak raw tool diagnostics in grouped rows");
assert.ok(!optInTimelineLines.some((line) => /(Search repo|Edit files|Run commands).*tok/.test(line)), "opt-in status timeline should not invent token usage for individual tool families");
optInTimelineComponent.dispose?.();
delete process.env.SISO_STATUS_TIMELINE;

globalThis.__SISO_ROUTER_STATUS__ = { updatedAt: new Date().toISOString(), children: {} };
handlers.get("session_start")?.({}, ctx);
for (let index = 1; index <= 5; index += 1) {
  await commands.get("siso-queue")?.handler([`Queued prompt ${index} with enough detail to need a bounded widget preview`], ctx);
}
const queueOnlyWidget = widgetCalls.at(-1);
assert.ok(Array.isArray(queueOnlyWidget?.lines), "queue-only status widget should publish plain bounded lines");
assertCleanDefaultWidget(queueOnlyWidget.lines, "queue-only widget");
assert.ok(queueOnlyWidget.lines.length <= 4, "queue-only status widget should stay bounded to four rendered lines");
assert.ok(!queueOnlyWidget.lines.some((line) => line.trim() === ""), "queue-only status widget should not include blank spacer rows");
assert.ok(queueOnlyWidget.lines.some((line) => line.includes("queue 5 prompts")), "queue-only status widget should show the queued prompt count");

globalThis.__SISO_ROUTER_STATUS__ = {
  updatedAt: new Date().toISOString(),
  activeChildId: "siso-child-other-chat",
  child: {
    id: "siso-child-other-chat",
    status: "background",
    rootSessionId: "other-chat",
    parentSessionId: "other-chat",
    ownerAgentId: "other-chat",
    depth: 0,
    profile: "minimax.worker",
    lane: "minimax",
    model: "claude-haiku-4-5-20251001",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    task: "This child belongs to a different chat",
  },
  children: {},
};
globalThis.__SISO_ROUTER_STATUS__.children["siso-child-other-chat"] = globalThis.__SISO_ROUTER_STATUS__.child;
handlers.get("session_start")?.({}, {
  sessionId: "fresh-chat",
  hasUI: true,
  ui: ctx.ui,
});
const crossSessionWidget = widgetCalls.at(-1);
assert.equal(crossSessionWidget?.lines, undefined, "fresh chats should not render child rows from another chat's router status");
assert.equal(Object.keys(globalThis.__SISO_ROUTER_STATUS__?.children ?? {}).length, 0, "fresh chats should clear stale cross-session child snapshots from global router status");

const liveDir = mkdtempSync(join(tmpdir(), "siso-status-live-"));
process.env.SISO_CHILD_RUN_DIR = liveDir;
process.env.SISO_STATUS_POLL_MS = "1";
process.env.PI_SESSION_ID = "siso-status-live-session";
globalThis.__SISO_ROUTER_STATUS__ = undefined;
const liveRecordPath = join(liveDir, "siso-child-live.json");
const liveStdoutPath = join(liveDir, "siso-child-live.stdout.jsonl");
writeFileSync(liveStdoutPath, [
  JSON.stringify({ type: "tool_call", toolName: "read" }),
  JSON.stringify({ type: "turn.completed", usage: { input_tokens: 2000, output_tokens: 300 } }),
].join("\n"), "utf8");
writeFileSync(liveRecordPath, JSON.stringify({
  id: "siso-child-live",
  status: "background",
  pid: process.pid,
  parentSessionId: "siso-status-live-session",
  task: "Audit the live child telemetry path",
  profile: "minimax.worker",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  startedAt: new Date(Date.now() - 10_000).toISOString(),
  updatedAt: new Date(Date.now() - 10_000).toISOString(),
  runRecordPath: liveRecordPath,
  stdoutPath: liveStdoutPath,
  stderrPath: join(liveDir, "siso-child-live.stderr.log"),
  exitPath: join(liveDir, "siso-child-live.exit.json"),
  tokens: { input: 0, output: 0, totalTokens: 0 },
  toolCalls: 0,
  compactResult: { summary: "background child supervisor started pid=current", findings: [], files: [], next_action: "wait" },
}), "utf8");

const liveHandlers = new Map();
const liveWidgetCalls = [];
sisoStatusExtension({
  on(event, handler) {
    liveHandlers.set(event, handler);
  },
  registerCommand() {},
  registerTool() {},
  registerMessageRenderer() {},
});
liveHandlers.get("session_start")?.({}, {
  sessionId: "siso-status-live-session",
  hasUI: true,
  ui: {
    setStatus() {},
    setWidget(key, lines, options) {
      liveWidgetCalls.push({ key, lines, options });
    },
  },
});
await new Promise((resolve) => setTimeout(resolve, 25));
const liveWidget = liveWidgetCalls.at(-1);
assert.equal(typeof liveWidget?.lines, "function", "live background child should render the active loader widget");
const liveComponent = liveWidget.lines(fakeTui, fakeTheme);
const liveLines = liveComponent.render(120);
assertCleanDefaultWidget(liveLines, "live background child widget");
assert.ok(liveLines.some((line) => line.includes("Audit live child telemetry")), "background child widget should render a short label from disk task records");
assert.ok(!liveLines.some((line) => line.includes("Audit the live child telemetry path")), "background child widget should not render long disk task text");
assert.ok(liveLines.some((line) => line.includes("1 check")), "background child widget should parse live tool progress into check counts before exit");
liveComponent.dispose?.();
await new Promise((resolve) => setTimeout(resolve, 25));
const liveStored = JSON.parse(readFileSync(liveRecordPath, "utf8"));
assert.equal(liveStored.toolCalls, 1, "delta parser should not double-count previously parsed tool calls on later polls");
assert.equal(liveStored.progress?.stdoutOffset, liveStdoutPath ? readFileSync(liveStdoutPath, "utf8").length : undefined);

const completedDir = mkdtempSync(join(tmpdir(), "siso-status-completed-"));
process.env.SISO_CHILD_RUN_DIR = completedDir;
process.env.PI_SESSION_ID = "siso-status-completed-session";
globalThis.__SISO_ROUTER_STATUS__ = undefined;
const completedRecordPath = join(completedDir, "siso-child-completed.json");
const completedExitPath = join(completedDir, "siso-child-completed.exit.json");
const completedStdoutPath = join(completedDir, "siso-child-completed.stdout.jsonl");
writeFileSync(completedStdoutPath, [
  JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "Finished the audit." }], usage: { input: 100, output: 50, totalTokens: 150 } } }),
].join("\n"), "utf8");
writeFileSync(completedExitPath, JSON.stringify({
  exitCode: 0,
  signal: null,
  completedAt: "2026-05-08T12:10:00.000Z",
}), "utf8");
writeFileSync(completedRecordPath, JSON.stringify({
  id: "siso-child-completed",
  status: "background",
  pid: 999999,
  parentSessionId: "siso-status-completed-session",
  task: "Complete cleanly despite a dead supervisor pid",
  profile: "minimax.worker",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  startedAt: "2026-05-08T12:09:00.000Z",
  updatedAt: "2026-05-08T12:09:00.000Z",
  runRecordPath: completedRecordPath,
  stdoutPath: completedStdoutPath,
  stderrPath: join(completedDir, "siso-child-completed.stderr.log"),
  exitPath: completedExitPath,
  compactResult: { summary: "background child supervisor started pid=999999", findings: [], files: [], next_action: "wait" },
}), "utf8");
const completedHandlers = new Map();
sisoStatusExtension({
  on(event, handler) {
    completedHandlers.set(event, handler);
  },
  registerCommand() {},
  registerTool() {},
  registerMessageRenderer(name, renderer) {
    completedHandlers.set(`message_renderer:${name}`, renderer);
  },
});
completedHandlers.get("session_start")?.({}, {
  sessionId: "siso-status-completed-session",
  hasUI: true,
  ui: {
    setStatus() {},
    setWidget() {},
  },
});
await new Promise((resolve) => setTimeout(resolve, 25));
const completedRecord = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(completedRecordPath, "utf8")));
assert.equal(completedRecord.status, "completed", "exit markers should win over dead supervisor pid checks");
assert.equal(completedRecord.compactResult.summary, "Finished the audit.");
assert.equal(completedRecord.tokens.totalTokens, 150);
const completionRenderer = completedHandlers.get("message_renderer:siso-agent-completion");
const renderedCompletion = completionRenderer({ details: completedRecord }, { expanded: false }, fakeTheme).text;
assert.ok(renderedCompletion.includes("150 tok"), "completed child card should show compact real token usage");
assert.ok(!renderedCompletion.includes("150 tokens"), "completed child card should avoid verbose token labels");

const budgetDir = mkdtempSync(join(tmpdir(), "siso-status-legacy-token-budget-"));
process.env.SISO_CHILD_RUN_DIR = budgetDir;
process.env.PI_SESSION_ID = "siso-status-legacy-token-budget-session";
process.env.SISO_TASK_MAX_TOKENS = "100";
process.env.SISO_TASK_MAX_TOOLS = "1";
globalThis.__SISO_ROUTER_STATUS__ = undefined;
const budgetRecordPath = join(budgetDir, "siso-child-budget.json");
const budgetStdoutPath = join(budgetDir, "siso-child-budget.stdout.jsonl");
writeFileSync(budgetStdoutPath, [
  JSON.stringify({ type: "turn.completed", usage: { input_tokens: 120, output_tokens: 30 } }),
  JSON.stringify({ type: "tool_call", name: "read" }),
  JSON.stringify({ type: "tool_call", name: "bash" }),
].join("\n"), "utf8");
writeFileSync(budgetRecordPath, JSON.stringify({
  id: "siso-child-budget",
  status: "background",
  parentSessionId: "siso-status-legacy-token-budget-session",
  task: "Keep running when a legacy token/tool budget is exceeded",
  profile: "minimax.worker",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  startedAt: "2026-05-08T12:11:00.000Z",
  updatedAt: "2026-05-08T12:11:00.000Z",
  runRecordPath: budgetRecordPath,
  stdoutPath: budgetStdoutPath,
  stderrPath: join(budgetDir, "siso-child-budget.stderr.log"),
  exitPath: join(budgetDir, "siso-child-budget.exit.json"),
  compactResult: { summary: "background child supervisor started pid=999999", findings: [], files: [], next_action: "wait" },
}), "utf8");
const budgetHandlers = new Map();
sisoStatusExtension({
  on(event, handler) {
    budgetHandlers.set(event, handler);
  },
  registerCommand() {},
  registerTool() {},
  registerMessageRenderer() {},
});
budgetHandlers.get("session_start")?.({}, {
  sessionId: "siso-status-legacy-token-budget-session",
  hasUI: true,
  ui: {
    setStatus() {},
    setWidget() {},
  },
});
await new Promise((resolve) => setTimeout(resolve, 25));
const budgetRecord = JSON.parse(readFileSync(budgetRecordPath, "utf8"));
assert.equal(budgetRecord.status, "background", "legacy token/tool budgets should not abort background children");
assert.equal(budgetRecord.tokens.totalTokens, 150);
assert.equal(budgetRecord.toolCalls, 2);
assert.equal(budgetRecord.error, undefined);
delete process.env.SISO_TASK_MAX_TOKENS;
delete process.env.SISO_TASK_MAX_TOOLS;

const staleDir = mkdtempSync(join(tmpdir(), "siso-status-stale-"));
process.env.SISO_CHILD_RUN_DIR = staleDir;
process.env.SISO_STATUS_POLL_MS = "1";
delete process.env.SISO_PARENT_SESSION_ID;
delete process.env.CLAUDE_SESSION_ID;
delete process.env.PI_SESSION_ID;
delete process.env.SISO_SESSION_ID;
globalThis.__SISO_ROUTER_STATUS__ = undefined;
writeFileSync(join(staleDir, "siso-child-stale.json"), JSON.stringify({
  id: "siso-child-stale",
  status: "background",
  pid: 999999,
  profile: "minimax.verifier",
  lane: "minimax",
  model: "claude-haiku-4-5-20251001",
  startedAt: new Date(Date.now() - 60_000).toISOString(),
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
  runRecordPath: join(staleDir, "siso-child-stale.json"),
  compactResult: { summary: "background child supervisor started pid=999999" },
}), "utf8");

const staleHandlers = new Map();
const staleWidgetCalls = [];
sisoStatusExtension({
  on(event, handler) {
    staleHandlers.set(event, handler);
  },
  registerCommand() {},
  registerTool() {},
  registerMessageRenderer() {},
});
staleHandlers.get("session_start")?.({}, {
  hasUI: true,
  ui: {
    setStatus() {},
    setWidget(key, lines) {
      staleWidgetCalls.push({ key, lines });
    },
  },
});
await new Promise((resolve) => setTimeout(resolve, 20));
assert.ok(staleWidgetCalls.every((call) => !JSON.stringify(call.lines ?? []).includes("siso-child-stale")), "stale global child history should not render in a fresh session");

console.log("SISO_STATUS_AGENT_WIDGET_SMOKE_OK");
