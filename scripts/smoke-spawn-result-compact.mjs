#!/usr/bin/env node
import assert from "node:assert/strict";

import { compactChildResult, formatSpawnResult, publicSpawnResult } from "../extensions/siso-agent-router/spawn-layer.js";

const longOutput = `Legacy child produced a long audit. ${"x".repeat(5000)}`;
const rawEventText = "RAW_EVENT_SHOULD_NOT_RETURN".repeat(180);
const rawPromptArg = "RAW_PROMPT_ARG_SHOULD_NOT_RETURN".repeat(180);
const rawTaskText = "RAW_TASK_SHOULD_NOT_RETURN".repeat(80);
const result = {
  id: "siso-child-compact-result",
  status: "completed",
  adapter: "pi",
  decision: {
    kind: "worker",
    profile: "minimax.worker",
    lane: "minimax",
    model: "claude-haiku-4-5-20251001",
  },
  command: "node",
  args: ["-p", rawPromptArg],
  task: rawTaskText,
  cwd: process.cwd(),
  pid: 12345,
  exitCode: 0,
  signal: null,
  durationMs: 1000,
  timedOut: false,
  stdout: "RAW_STDOUT_SHOULD_NOT_RETURN".repeat(180),
  stderr: "RAW_STDERR_SHOULD_NOT_RETURN".repeat(180),
  finalOutput: longOutput,
  compactResult: compactChildResult(longOutput),
  rawOutputChars: longOutput.length,
  truncatedOutputChars: 0,
  tokens: { input: 100, output: 200, totalTokens: 300 },
  toolCalls: 4,
  notified: true,
  events: [{
    id: "event-raw",
    type: "tool_result",
    text: rawEventText,
  }],
  runRecordPath: "/tmp/siso-child-compact-result.json",
  stdoutPath: "/tmp/siso-child-compact-result.stdout.jsonl",
  stderrPath: "/tmp/siso-child-compact-result.stderr.log",
};

const formatted = formatSpawnResult("legacy noisy child", result);
assert.ok(formatted.length < 1800, "legacy spawn text result should not echo huge child output");
assert.match(formatted, /SISO_LEGACY_RESULT_TRUNCATED/);
assert.match(formatted, /child_output_chars=5036/);
assert.match(formatted, /child_output_truncated_chars=/);

const publicResult = publicSpawnResult(result);
const publicJson = JSON.stringify(publicResult);
assert.ok(publicJson.length < 3500, "public spawn details should stay compact");
assert.equal("stdout" in publicResult, false);
assert.equal("stderr" in publicResult, false);
assert.equal("command" in publicResult, false, "public spawn details should not return executable command");
assert.equal("args" in publicResult, false, "public spawn details should not return raw child prompt args");
assert.equal("task" in publicResult, false, "public spawn details should not return raw child task text");
assert.equal("events" in publicResult, false, "public spawn details should not return raw event payloads");
assert.match(publicResult.finalOutput, /SISO_LEGACY_RESULT_TRUNCATED/);
assert.equal(publicResult.rawOutputChars, longOutput.length);
assert.ok(publicResult.truncatedOutputChars > 0);
assert.equal(publicResult.eventCount, 1);
assert.doesNotMatch(publicJson, /RAW_STDOUT_SHOULD_NOT_RETURN/);
assert.doesNotMatch(publicJson, /RAW_STDERR_SHOULD_NOT_RETURN/);
assert.doesNotMatch(publicJson, /RAW_EVENT_SHOULD_NOT_RETURN/);
assert.doesNotMatch(publicJson, /RAW_PROMPT_ARG_SHOULD_NOT_RETURN/);
assert.doesNotMatch(publicJson, /RAW_TASK_SHOULD_NOT_RETURN/);

console.log("SISO_SPAWN_RESULT_COMPACT_SMOKE_OK");
