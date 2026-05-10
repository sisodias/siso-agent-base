#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { filterProviderPayload } from "../extensions/siso-context-manager/provider-filter.js";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "siso-tool-schema-lazy-"));
fs.mkdirSync(path.join(tmp, ".siso"), { recursive: true });
fs.writeFileSync(path.join(tmp, ".siso", "tool-state.json"), JSON.stringify({ toolIds: ["repo-search"], packIds: ["repo-navigation"], ttlTurns: 6 }, null, 2));
const tools = [
  { type: "function", name: "siso", description: "router", parameters: { type: "object" } },
  { type: "function", name: "repoSearch", description: "search", parameters: { type: "object" } },
  { type: "function", name: "massiveUnusedTool", description: "x".repeat(1000), parameters: { type: "object" } },
  { type: "function", name: "anotherUnusedTool", description: "y".repeat(1000), parameters: { type: "object" } },
];
const oldThreshold = process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD;
process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD = "2";
const result = filterProviderPayload({ model: "smoke", messages: [{ role: "user", content: "hi" }], tools }, { runId: "tool-schema-lazy", cwd: tmp });
if (oldThreshold === undefined) delete process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD;
else process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD = oldThreshold;
assert.ok(result.toolSlim?.applied);
assert.equal(result.toolSlim.originalToolCount, 4);
assert.ok(result.toolSlim.hiddenToolCount >= 1);
assert.ok(result.payload.tools.some((t) => t.name === "siso"));
assert.ok(result.payload.tools.some((t) => t.name === "repoSearch"));
assert.ok(result.payload.tools.some((t) => t.name === "siso_tool_discovery_hint"));
assert.ok(!result.payload.tools.some((t) => t.name === "massiveUnusedTool"));

const anthropicTools = [
  { name: "siso", description: "router", input_schema: { type: "object" } },
  { name: "read", description: "read", input_schema: { type: "object" } },
  { name: "huge_unused", description: "z".repeat(1000), input_schema: { type: "object" } },
];
process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD = "1";
const anthropicResult = filterProviderPayload({ model: "claude-opus-4-7", messages: [{ role: "user", content: "hi" }], tools: anthropicTools }, { runId: "tool-schema-lazy-anthropic", cwd: tmp });
if (oldThreshold === undefined) delete process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD;
else process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD = oldThreshold;
const anthropicHint = anthropicResult.payload.tools.find((t) => t.name === "siso_tool_discovery_hint");
assert.ok(anthropicHint, "anthropic-style payload should receive a discovery hint");
assert.ok(anthropicHint.input_schema, "anthropic-style discovery hint should use input_schema");
assert.equal("parameters" in anthropicHint, false, "anthropic-style discovery hint should not switch schema shape");

const chatTools = [
  { type: "function", function: { name: "siso", description: "router", parameters: { type: "object" } } },
  { type: "function", function: { name: "huge_unused", description: "q".repeat(1000), parameters: { type: "object" } } },
];
process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD = "1";
const chatResult = filterProviderPayload({ model: "gpt-5.5", messages: [{ role: "user", content: "hi" }], tools: chatTools }, { runId: "tool-schema-lazy-chat", cwd: tmp });
if (oldThreshold === undefined) delete process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD;
else process.env.SISO_TOOL_SCHEMA_LAZY_THRESHOLD = oldThreshold;
const chatHint = chatResult.payload.tools.find((t) => t.function?.name === "siso_tool_discovery_hint");
assert.ok(chatHint, "chat-completions-style payload should receive a discovery hint");
assert.ok(chatHint.function.parameters, "chat-completions-style discovery hint should use function.parameters");
console.log("SISO_TOOL_SCHEMA_LAZY_SMOKE_OK");
