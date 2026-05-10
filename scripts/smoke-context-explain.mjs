#!/usr/bin/env node
import assert from "node:assert/strict";

import sisoStatusExtension from "../extensions/siso-status/index.js";
import { applyEvent, createStatusState, formatContextExplain } from "../extensions/siso-status/status-state.js";

const state = createStatusState();

applyEvent(state, "before_provider_request", {
  payload: {
    model: "gpt-5.5",
    tools: [
      { name: "read", description: "Read a file", input_schema: { type: "object", properties: { path: { type: "string" } } } },
      { name: "siso_spawn", description: "Spawn a child", input_schema: { type: "object", properties: { task: { type: "string" } } } },
    ],
    input: [
      { role: "system", content: [{ type: "input_text", text: "# SISO Pi Kernel\n" + "A".repeat(4000) }] },
      { role: "user", content: [{ type: "input_text", text: "Fix the subagent UI" }] },
      { role: "assistant", content: [{ type: "output_text", text: "I will inspect it." + "B".repeat(1200) }] },
      { type: "function_call_output", call_id: "call_1", output: [{ type: "input_text", text: "tool output ".repeat(700) }] },
      { role: "user", content: [{ type: "input_text", text: "<task-notification>MiniMax worker completed</task-notification>" }] },
    ],
  },
});

const text = formatContextExplain(state);

assert.match(text, /^SISO context explain/m);
assert.match(text, /Warnings/);
assert.match(text, /tool output is the largest context bucket/);
assert.match(text, /request=/);
assert.match(text, /tool_schemas=/);
assert.match(text, /history_items=/);
assert.match(text, /pi_kernel:/);
assert.match(text, /tool_output_history:/);
assert.match(text, /assistant_history:/);
assert.match(text, /Top blocks/);
assert.match(text, /pi_kernel/);
assert.match(text, /tool_output_history/);
assert.doesNotMatch(text, /A{500}/, "context explain should not dump giant system text");
assert.doesNotMatch(text, /tool output tool output tool output tool output tool output tool output tool output tool output tool output tool output/, "context explain should not dump giant tool output");

const handlers = new Map();
const commands = new Map();
const tools = new Map();
sisoStatusExtension({
  on(event, handler) {
    handlers.set(event, handler);
  },
  registerCommand(name, command) {
    commands.set(name, command);
  },
  registerTool(tool) {
    tools.set(tool.name, tool);
  },
  registerMessageRenderer() {},
});

handlers.get("before_provider_request")?.({
  payload: {
    model: "gpt-5.5",
    tools: [{ name: "read", description: "Read a file" }],
    input: [
      { role: "system", content: [{ type: "input_text", text: "# SISO Pi Kernel\n" + "A".repeat(1600) }] },
      { type: "function_call_output", output: [{ type: "input_text", text: "tool output ".repeat(300) }] },
    ],
  },
}, { hasUI: false });

const commandResult = await commands.get("siso-context-explain").handler([], { hasUI: false });
assert.match(commandResult.content[0].text, /SISO context explain/);
assert.match(commandResult.content[0].text, /tool_output_history/);

const toolResult = await tools.get("siso_status").execute("call-context", { op: "context" }, undefined, undefined, { hasUI: false });
assert.match(toolResult.content[0].text, /SISO context explain/);
assert.match(toolResult.content[0].text, /tool_schemas=/);
assert.match(toolResult.content[0].text, /Warnings/);

console.log("SISO_CONTEXT_EXPLAIN_SMOKE_OK");
