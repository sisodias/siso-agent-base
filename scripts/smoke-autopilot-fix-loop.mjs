#!/usr/bin/env node
import assert from "node:assert/strict";
import { autopilotFixLoop } from "../extensions/siso-agent-router/tooling-actions.js";

const root = process.cwd();

const passing = autopilotFixLoop({
  cwd: root,
  command: "node -e \"process.stdout.write('ok')\"",
  task: "verify a passing command",
  maxIterations: 2,
});
assert.equal(passing.action, "autopilot-fix-loop");
assert.equal(passing.ok, true);
assert.equal(passing.outcome, "passed");
assert.equal(passing.iterations.length, 1);
assert.equal(passing.iterations[0].check.ok, true);

const failing = autopilotFixLoop({
  cwd: root,
  command: "node -e \"process.stderr.write('SISO_EXPECTED_FAILURE'),process.exit(7)\"",
  task: "repair an expected smoke failure",
  maxIterations: 2,
  maxChars: 6000,
});
assert.equal(failing.action, "autopilot-fix-loop");
assert.equal(failing.ok, false);
assert.equal(failing.outcome, "needs_patch");
assert.equal(failing.iterations.length, 1);
assert.equal(failing.iterations[0].check.exitCode, 7);
assert.match(failing.failureSummary, /SISO_EXPECTED_FAILURE/);
assert.ok(failing.context);
assert.ok(failing.suggestedNextActions.some((item) => /patch/i.test(item)));

const blocked = autopilotFixLoop({
  cwd: root,
  command: "rm -rf .",
  task: "unsafe command must not execute",
  maxIterations: 2,
});
assert.equal(blocked.ok, false);
assert.equal(blocked.outcome, "blocked");
assert.equal(blocked.iterations[0].check.blocked, true);

console.log("SISO_AUTOPILOT_FIX_LOOP_SMOKE_OK");
