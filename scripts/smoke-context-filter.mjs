#!/usr/bin/env node
import assert from "node:assert/strict";

import { filterProviderPayload } from "../extensions/siso-context-manager/provider-filter.js";

const messagesPayload = {
  model: "MiniMax-M2.7-highspeed",
  messages: [
    { role: "user", content: "inspect this output" },
    { role: "assistant", content: [{ type: "text", text: "Reading." }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu-big", content: "Y".repeat(9000) }] },
  ],
};

const messagesResult = filterProviderPayload(messagesPayload, { runId: "smoke-minimax" });
const messagesRaw = JSON.stringify(messagesResult.payload);
assert.equal(messagesResult.replacements.length, 1);
assert.match(messagesRaw, /SISO_CONTEXT_FILTERED/);
assert.doesNotMatch(messagesRaw, /Y{2000}/);
assert.equal(messagesResult.before.messageItems, 3);
assert.equal(messagesResult.after.containsFilteredTombstone, true);

const multiPartPayload = {
  model: "MiniMax-M2.7-highspeed",
  messages: [
    { role: "user", content: "inspect this multi-part output" },
    {
      role: "tool",
      tool_call_id: "toolu-multipart",
      content: [
        { type: "text", text: "small first part" },
        { type: "text", text: `RAW_SECOND_PART_SHOULD_NOT_RETURN ${"M".repeat(9000)}` },
      ],
    },
  ],
};
const multiPartResult = filterProviderPayload(multiPartPayload, { runId: "smoke-multipart" });
const multiPartRaw = JSON.stringify(multiPartResult.payload);
assert.equal(multiPartResult.replacements.length, 1);
assert.match(multiPartRaw, /SISO_CONTEXT_FILTERED/);
assert.doesNotMatch(multiPartRaw, /RAW_SECOND_PART_SHOULD_NOT_RETURN/);
assert.doesNotMatch(multiPartRaw, /M{2000}/);

const responsesPayload = {
  model: "gpt-5.5",
  input: [
    { role: "system", content: [{ type: "input_text", text: "system" }] },
    { type: "function_call_output", status: "completed", call_id: "call-big", output: [{ type: "input_text", text: "X".repeat(9000) }] },
  ],
};

const responsesResult = filterProviderPayload(responsesPayload, { runId: "smoke-responses" });
const responsesRaw = JSON.stringify(responsesResult.payload);
assert.equal(responsesResult.replacements.length, 1);
assert.match(responsesRaw, /SISO_CONTEXT_FILTERED/);
assert.doesNotMatch(responsesRaw, /X{2000}/);

const bothFieldsPayload = {
  model: "gateway-mixed",
  input: [{ role: "user", content: [{ type: "input_text", text: "current canonical input" }] }],
  messages: [
    { role: "user", content: "legacy mirror" },
    { role: "tool", tool_call_id: "toolu-both", content: `RAW_MESSAGES_FIELD_SHOULD_NOT_RETURN ${"B".repeat(9000)}` },
  ],
};
const bothFieldsResult = filterProviderPayload(bothFieldsPayload, { runId: "smoke-both-fields" });
const bothFieldsRaw = JSON.stringify(bothFieldsResult.payload);
assert.equal(bothFieldsResult.replacements.length, 1);
assert.match(bothFieldsRaw, /SISO_CONTEXT_FILTERED/);
assert.doesNotMatch(bothFieldsRaw, /RAW_MESSAGES_FIELD_SHOULD_NOT_RETURN/);
assert.doesNotMatch(bothFieldsRaw, /B{2000}/);

const longHistoryMessages = [];
for (let index = 0; index < 150; index += 1) {
  longHistoryMessages.push({ role: "user", content: `old user turn ${index} ${"u".repeat(1200)}` });
  longHistoryMessages.push({ role: "assistant", content: [{ type: "text", text: `old assistant turn ${index} ${"a".repeat(1200)}` }] });
}
longHistoryMessages.push({
  role: "assistant",
  content: [{ type: "tool_use", id: "toolu-tail", name: "bash", input: { command: "pwd" } }],
});
longHistoryMessages.push({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: "toolu-tail", content: "tail tool result should remain paired" }],
});
longHistoryMessages.push({ role: "user", content: "current task stays in the preserved tail" });

const slimResult = filterProviderPayload({ model: "claude-opus-4-7", messages: longHistoryMessages, tools: [] }, { runId: "smoke-slim" });
const slimRaw = JSON.stringify(slimResult.payload);
assert.ok(slimResult.promptSlim?.compressedMessageCount > 200, "prompt slim should compress the old history prefix");
assert.ok(slimResult.before.rawChars > 300_000, `expected a large source payload, got ${slimResult.before.rawChars}`);
assert.ok(slimResult.after.rawChars < 70_000, `slimmed payload should be compact, got ${slimResult.after.rawChars}`);
assert.ok(slimResult.before.rawChars / slimResult.after.rawChars > 5, "prompt slim should deliver a large reduction");
assert.equal(slimResult.payload.messages[0].role, "user");
assert.match(JSON.stringify(slimResult.payload.messages[0]), /SISO_PROMPT_SLIM/);
assert.match(slimRaw, /tail tool result should remain paired/);
assert.match(slimRaw, /current task stays in the preserved tail/);
assert.doesNotMatch(slimRaw, /old user turn 10 u{1000}/);

console.log("SISO_CONTEXT_FILTER_SMOKE_OK");
