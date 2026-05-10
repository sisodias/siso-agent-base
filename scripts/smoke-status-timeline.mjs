#!/usr/bin/env node
import assert from "node:assert/strict";

import { applyEvent, createStatusState, toTimelineWidgetLines } from "../extensions/siso-status/status-state.js";

const state = createStatusState();
globalThis.__SISO_ROUTER_STATUS__ = {
  updatedAt: new Date().toISOString(),
  children: {
    "siso-child-timeline": {
      id: "siso-child-timeline",
      status: "completed",
      profile: "minimax.scout",
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      updatedAt: new Date().toISOString(),
      task: "Inspect timeline token visibility",
      tokens: { input: 1200, output: 300, totalTokens: 1500 },
      toolCalls: 2,
      compactResult: { summary: "timeline check complete", findings: [], files: [], next_action: "done" },
    },
  },
};

applyEvent(state, "before_agent_start", {
  prompt: "Improve agent system",
  model: "gpt-5.5",
  skill: "improve-agent-system",
});

applyEvent(state, "tool_call", {
  toolName: "rg",
  input: { pattern: "subagent", path: "extensions" },
});
applyEvent(state, "tool_result", {
  toolName: "rg",
  result: "extensions/siso-status/index.js\nextensions/siso-agent-router/index.js\n",
});
applyEvent(state, "tool_call", {
  toolName: "apply_patch",
  input: { file: "extensions/siso-status/index.js" },
});
applyEvent(state, "tool_result", {
  toolName: "apply_patch",
  result: "Success",
});
applyEvent(state, "tool_call", {
  toolName: "siso",
  input: { action: "spawn", task: "Inspect the codebase with a child agent" },
});
applyEvent(state, "tool_result", {
  toolName: "siso",
  input: { action: "spawn", task: "Inspect the codebase with a child agent" },
  result: "SISO subagent launched in background.",
});

const lines = toTimelineWidgetLines(state, 5);

assert.ok(lines.some((line) => line.includes("Skill improve-agent-system")), "timeline should show active skill as a clean skill row");
assert.ok(lines.some((line) => line.includes("Agent complete") && line.includes("1.5k tok")), "timeline should show real child tokens when child usage exists");
assert.ok(lines.some((line) => line.includes("Agents")), "timeline should group aggregate siso spawn calls as agent work");
assert.ok(lines.some((line) => line.includes("Search repo")), "timeline should group rg/read activity as search/readable repo work");
assert.ok(lines.some((line) => line.includes("Edit files")), "timeline should group patch/edit activity as an edit row");
assert.ok(lines.every((line) => !/(Search repo|Edit files|Run commands).*tok/.test(line)), "timeline should not invent token usage for normal tool families");
assert.ok(lines.every((line) => !line.includes("Use tools")), "timeline should not show generic tool rows for known SISO agent orchestration");
assert.ok(lines.every((line) => !line.includes("siso action=spawn")), "timeline should not leak raw aggregate siso spawn labels");
assert.ok(lines.every((line) => !line.includes("tool:start")), "timeline rows should not expose raw activity event labels");
assert.ok(lines.every((line) => !line.includes("input=")), "timeline rows should not leak raw tool input byte diagnostics");

console.log("SISO_STATUS_TIMELINE_SMOKE_OK");
