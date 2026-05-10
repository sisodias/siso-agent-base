#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const source = `
import { createSisoTuiRuntime } from "./packages/siso-tui/src/runtime/session-runtime.ts";

const events = [];
let listener;
const fakeSession = {
  isStreaming: false,
  subscribe(fn) {
    listener = fn;
    return () => events.push(["unsubscribe"]);
  },
  async prompt(text) {
    events.push(["prompt", text]);
    listener({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "hello" } });
    listener({ type: "tool_execution_start", toolCallId: "tool-1", toolName: "read", args: { file: "README.md" } });
    listener({ type: "tool_execution_update", toolCallId: "tool-1", toolName: "read", args: {}, partialResult: { bytes: 10 } });
    listener({ type: "tool_execution_end", toolCallId: "tool-1", toolName: "read", result: { ok: true }, isError: false });
    listener({ type: "message_end", message: { role: "assistant" } });
  },
  async abort() {
    events.push(["abort"]);
  },
  dispose() {
    events.push(["dispose-session"]);
  },
};

const runtime = await createSisoTuiRuntime({
  createSession: async () => ({ session: fakeSession, extensionsResult: {} }),
});

await runtime.sendPrompt("ping", {
  onAssistantDelta(delta) {
    events.push(["delta", delta]);
  },
  onToolEvent(event) {
    events.push(["tool", event.phase, event.name]);
  },
  onDone() {
    events.push(["done"]);
  },
});
await runtime.cancel();
await runtime.dispose();

const expected = [
  ["prompt", "ping"],
  ["delta", "hello"],
  ["tool", "start", "read"],
  ["tool", "update", "read"],
  ["tool", "end", "read"],
  ["done"],
  ["abort"],
  ["unsubscribe"],
  ["dispose-session"],
];
if (JSON.stringify(events) !== JSON.stringify(expected)) {
  console.error("unexpected runtime events");
  console.error(JSON.stringify(events, null, 2));
  process.exit(1);
}
`;

const result = spawnSync("bun", ["--eval", source], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (result.status !== 0) {
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

console.log("SISO_TUI_RUNTIME_SMOKE_OK");
