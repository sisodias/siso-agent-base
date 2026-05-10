#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { autopilotPlan, formatToolResult } from "../extensions/siso-agent-router/tooling-actions.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const plan = autopilotPlan({
  cwd: root,
  objective: "Refresh V2 readiness docs and keep smoke checks green.",
  specification: "Capability docs must match the registry, no raw logs should be returned, and verifier feedback should be compact.",
  checks: "npm run smoke:v2-readiness\nnpm run smoke:autopilot-verifier",
  verifier: "Minimax",
  maxIterations: 3,
  sessionId: "session-a",
  threadId: "thread-a",
  parentRunId: "parent-a",
  autopilotRunId: "auto-a",
  paths: "docs/strategy/v2.1-readiness-plan.md,docs/capabilities/current.md",
});

assert.equal(plan.action, "autopilot-plan");
assert.equal(plan.autopilotRunId, "auto-a");
assert.equal(plan.controller.maxIterations, 3);
assert.equal(plan.eventScope.sessionId, "session-a");
assert.equal(plan.eventScope.threadId, "thread-a");
assert.equal(plan.roles.verifier.profile, "Minimax");
assert.equal(plan.roles.verifier.readOnly, true);
assert.ok(plan.requiredChecks.every((check) => check.blocked === false));
assert.deepEqual(plan.requiredChecks.map((check) => check.command), ["npm run smoke:v2-readiness", "npm run smoke:autopilot-verifier"]);
assert.ok(plan.phases.some((phase) => phase.id === "checkpoint"));
assert.ok(plan.phases.some((phase) => phase.id === "verifier-review"));
assert.ok(plan.stopConditions.includes("maxIterations reached"));
assert.ok(plan.failureSignature.fields.includes("firstMeaningfulErrorLine"));
assert.ok(plan.feedbackPacket.allowedFields.includes("missingRequirement"));
assert.ok(plan.feedbackPacket.forbiddenFields.includes("raw logs"));
assert.equal(plan.parentVisible.noRawLogs, true);
assert.ok(plan.flightRecorder.path.includes("auto-a"));
assert.ok(JSON.stringify(plan).length < 8000, "autopilot plan details should stay compact");

const blocked = autopilotPlan({
  cwd: root,
  objective: "Bad check should be blocked",
  checks: "npm run smoke:v2-readiness; rm -rf .",
  sessionId: "session-b",
  threadId: "thread-b",
});
assert.equal(blocked.requiredChecks[0].blocked, true);
assert.match(blocked.requiredChecks[0].unsafeReason, /shell command chaining/);

const text = formatToolResult(plan);
assert.match(text, /autopilot_plan/);
assert.match(text, /verifier=Minimax/);
assert.doesNotMatch(text, /raw logs[\s\S]*raw tool events[\s\S]*provider payloads/, "formatted plan should stay compact");

console.log("SISO_AUTOPILOT_PLAN_SMOKE_OK");
