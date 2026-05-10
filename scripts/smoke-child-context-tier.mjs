#!/usr/bin/env node
import assert from "node:assert/strict";

import { buildSpawnSpec } from "../extensions/siso-agent-router/spawn-layer.js";
import { chooseRoute } from "../extensions/siso-agent-router/route-policy.js";

function promptFromSpec(spec) {
  const index = spec.args.indexOf("-p");
  assert.notEqual(index, -1, "spawn args should include -p prompt");
  return spec.args[index + 1];
}

const scoutDecision = chooseRoute("search the repo for native subagent animation code");
assert.equal(scoutDecision.contextTier, "none");
const scoutPrompt = promptFromSpec(buildSpawnSpec("search the repo for native subagent animation code", { cwd: process.cwd(), noTools: true }, scoutDecision));

assert.match(scoutPrompt, /Context: none/);
assert.doesNotMatch(scoutPrompt, /Context packet:/);
assert.doesNotMatch(scoutPrompt, /global_rules=/);
assert.doesNotMatch(scoutPrompt, /memory_index=/);

const workerDecision = chooseRoute("fix the native subagent animation code");
assert.equal(workerDecision.contextTier, "project");
const workerPrompt = promptFromSpec(buildSpawnSpec("fix the native subagent animation code", { cwd: process.cwd(), noTools: true }, workerDecision));

assert.match(workerPrompt, /Context: project/);
assert.match(workerPrompt, /Context packet:/);
assert.doesNotMatch(workerPrompt, /global_rules=.*chars=/);
assert.doesNotMatch(workerPrompt, /global_lessons=.*chars=/);
assert.doesNotMatch(workerPrompt, /memory_index=.*chars=/);
assert.doesNotMatch(workerPrompt, /--- global_rules excerpt ---/);
assert.doesNotMatch(workerPrompt, /--- global_lessons excerpt ---/);
assert.doesNotMatch(workerPrompt, /--- memory_index excerpt ---/);

console.log("SISO_CHILD_CONTEXT_TIER_SMOKE_OK");
