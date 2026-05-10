#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "siso-session-isolation-"));
process.env.SISO_STATUS_POLL_MS = "0";
process.env.SISO_STATUS_TOOL_MODE = "lean";
process.env.SISO_CONTEXT_AUTO_DISTILL = "0";
process.env.SISO_CONTEXT_FILTER = "0";
process.env.SISO_CONTEXT_SEMANTIC_LIBRARIAN = "0";
process.env.SISO_CONTEXT_ROOT = join(tmp, "context-store");
process.env.PI_CODING_AGENT_DIR = join(tmp, "agent-dir");
process.env.SISO_TRANSCRIPT_DIR = join(tmp, "transcripts");
process.env.SISO_LIFECYCLE_TOOL_MODE = "lean";
process.env.SISO_LIFECYCLE_UI = "off";

const { default: sisoStatusExtension } = await import("../extensions/siso-status/index.js");
const { default: sisoContextManager } = await import("../extensions/siso-context-manager/index.js");
const { default: sisoLifecycleExtension } = await import("../extensions/siso-lifecycle/index.js");
const { drainCorrectionLessons } = await import("../extensions/siso-lifecycle/index.js");

function makePi() {
  const handlers = new Map();
  const commands = new Map();
  const tools = new Map();
  return {
    handlers,
    commands,
    tools,
    on(name, handler) {
      if (!handlers.has(name)) handlers.set(name, []);
      handlers.get(name).push(handler);
    },
    emit(name, event, ctx) {
      let result;
      for (const handler of handlers.get(name) ?? []) result = handler(event, ctx);
      return result;
    },
    registerCommand(name, spec) {
      commands.set(name, spec);
    },
    registerTool(spec) {
      tools.set(spec.name, spec);
    },
    registerMessageRenderer() {},
  };
}

function makeCtx(sessionId, cwd) {
  const editorWrites = [];
  return {
    sessionId,
    cwd,
    hasUI: true,
    editorWrites,
    ui: {
      setStatus() {},
      setWidget() {},
      setHiddenThinkingLabel() {},
      setEditorComponent() {},
      notify() {},
      setEditorText(text) {
        editorWrites.push(text);
      },
    },
  };
}

const cwdA = join(tmp, "project-a");
const cwdB = join(tmp, "project-b");
mkdirSync(cwdA, { recursive: true });
mkdirSync(cwdB, { recursive: true });
const ctxA = makeCtx("session-a", cwdA);
const ctxB = makeCtx("session-b", cwdB);

const statusPi = makePi();
sisoStatusExtension(statusPi);
statusPi.emit("session_start", {}, ctxA);
statusPi.emit("session_start", {}, ctxB);

let result = await statusPi.commands.get("siso-queue").handler(["secret-from-a"], ctxA);
assert.match(result.content[0].text, /queued 1/);

result = await statusPi.commands.get("siso-queue-pop").handler([], ctxB);
assert.match(result.content[0].text, /queue empty/);
assert.deepEqual(ctxB.editorWrites, [], "session B must not pop session A's queued editor text");

result = await statusPi.commands.get("siso-queue-pop").handler([], undefined);
assert.match(result.content[0].text, /current session required/i);
assert.deepEqual(ctxA.editorWrites, [], "queue pop without an explicit session must not fall back to last UI ctx");

result = await statusPi.commands.get("siso-queue-pop").handler([], ctxA);
assert.match(result.content[0].text, /secret-from-a/);
assert.deepEqual(ctxA.editorWrites, ["secret-from-a"]);

const contextPi = makePi();
sisoContextManager(contextPi);
contextPi.emit("input", { text: "alpha context", cwd: cwdA }, ctxA);
contextPi.emit("input", { text: "beta context", cwd: cwdB }, ctxB);
contextPi.emit("turn_end", { cwd: cwdA }, ctxA);

const contextTool = contextPi.tools.get("siso_context");
assert.ok(contextTool, "context tool should be registered");
const statusA = await contextTool.execute("ctx-a", { op: "status" }, undefined, undefined, ctxA);
const statusB = await contextTool.execute("ctx-b", { op: "status" }, undefined, undefined, ctxB);
assert.equal(statusA.details.state.runId, "session-a");
assert.equal(statusB.details.state.runId, "session-b");
assert.equal(statusA.details.state.captured, 2, "session A context status should not include session B events");
assert.equal(statusB.details.state.captured, 1, "session B context status should not include session A events");

const lifecyclePi = makePi();
sisoLifecycleExtension(lifecyclePi);
lifecyclePi.emit("session_start", {}, ctxA);
lifecyclePi.emit("tool_result", {
  type: "tool_result",
  toolName: "read",
  isError: true,
  content: [{
    type: "text",
    text: 'import { spawnSync } from "node:child_process";\nconst RESTORE_MAX_AGE_MS = 7200000;\n',
  }],
  payload: { input: { path: "extensions/siso-lifecycle/index.js" } },
}, ctxA);
let lifecycleStatus = await lifecyclePi.commands.get("siso-transcripts").handler(["status"], ctxA);
assert.match(lifecycleStatus.content[0].text, /errors=0/, "source dumps without explicit error fields should not be logged as lifecycle errors");

const reflectQueue = join(process.env.PI_CODING_AGENT_DIR, ".reflect-queue.jsonl");
mkdirSync(process.env.PI_CODING_AGENT_DIR, { recursive: true });
writeFileSync(reflectQueue, [
  JSON.stringify({ session_id: "session-a", cwd: cwdA, prompt: "remember: alpha only" }),
  JSON.stringify({ session_id: "session-b", cwd: cwdA, prompt: "remember: beta only" }),
].join("\n") + "\n");

const noSessionDrain = drainCorrectionLessons(cwdA, undefined);
assert.equal(noSessionDrain.processed, 0, "correction drain without explicit session must not drain any session queue");
assert.match(readFileSync(reflectQueue, "utf8"), /alpha only/);
assert.match(readFileSync(reflectQueue, "utf8"), /beta only/);

const sessionDrain = drainCorrectionLessons(cwdA, "session-a");
assert.equal(sessionDrain.processed, 1);
assert.equal(sessionDrain.appended, 1);
assert.match(readFileSync(sessionDrain.lessonsPath, "utf8"), /alpha only/);
assert.doesNotMatch(readFileSync(sessionDrain.lessonsPath, "utf8"), /beta only/);
assert.match(readFileSync(reflectQueue, "utf8"), /beta only/);

console.log("SISO_SESSION_ISOLATION_STATUS_CONTEXT_LIFECYCLE_SMOKE_OK");
