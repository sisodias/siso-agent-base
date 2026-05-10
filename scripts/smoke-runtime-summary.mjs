#!/usr/bin/env node
import assert from "node:assert/strict";
import { runtimeSummary } from "../extensions/siso-agent-router/tooling-actions.js";

const result = runtimeSummary({
  registeredTools: ["siso", "siso_context", "subagent"],
  nativeSubagentAvailable: true,
});

assert.equal(result.action, "runtime-summary");
assert.equal(result.provider, "bifrost-anthropic");
assert.equal(result.model, process.env.SISO_MODEL || result.profileDefaultModel || "claude-opus-4-7");
assert.ok(result.toolAllowlist.includes("siso"));
assert.ok(result.toolAllowlist.includes("siso_context"));
assert.ok(result.registeredTools.includes("subagent"));
assert.equal(result.nativeSubagentAvailable, true);
assert.match(result.text, /provider=bifrost-anthropic/);
assert.match(result.text, /pi_skills=disabled by bin\/siso --no-skills/);
assert.match(result.text, /manual_extensions=/);
assert.match(result.text, /controller_first_routing=1/);
assert.match(result.text, /native_subagent_available=true/);

console.log("SISO_RUNTIME_SUMMARY_SMOKE_OK");
