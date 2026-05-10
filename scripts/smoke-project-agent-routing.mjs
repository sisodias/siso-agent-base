#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";
import { recordAgentScorecard } from "../extensions/siso-agent-router/agent-scorecards.js";

const root = mkdtempSync(join(tmpdir(), "siso-project-agent-routing-"));
const agentRoot = join(root, ".siso", "agents");
mkdirSync(agentRoot, { recursive: true });
writeFileSync(join(agentRoot, ".siso-agent-trusted"), "trusted\n", "utf8");
writeFileSync(
  join(agentRoot, "readonly-reviewer.md"),
  `---\nname: readonly-reviewer\ndescription: Reviews code for correctness, security, and missing tests.\nmodel: gpt-5.4-mini\nthinkingLevel: low\ntools: all, !write, !edit\n---\nRead-only project reviewer.\n`,
  "utf8",
);
recordAgentScorecard(
  {
    agent: "project.readonly-reviewer",
    version: "gpt-5.4-mini",
    taskSet: "review-regression-v1",
    runs: 8,
    trueFindings: 12,
    falsePositives: 1,
    missedBugs: 1,
    avgCostUsd: 0.02,
    avgLatencySeconds: 30,
  },
  { cwd: root, now: () => "2026-05-10T12:00:00.000Z" },
);

const tools = new Map();
const pi = {
  on() {},
  registerCommand() {},
  registerMessageRenderer() {},
  getAllTools: () => [],
  registerTool(nameOrSpec, maybeSpec) {
    const spec = typeof nameOrSpec === "string" ? maybeSpec : nameOrSpec;
    tools.set(spec.name, spec);
  },
};

sisoAgentRouterExtension(pi);

const result = await tools.get("siso_spawn").execute("test-call", {
  task: "Review the auth module for risks",
  cwd: root,
  agent: "readonly-reviewer",
  dryRun: true,
});

assert.equal(result.details.status, "planned");
assert.equal(result.details.decision.profile, "project.readonly-reviewer");
assert.equal(result.details.decision.model, "gpt-5.4-mini");
assert.deepEqual(result.details.decision.tools, ["read", "find", "ls", "bash"]);
assert.equal(result.details.decision.permissionProfile, "plan");
assert.equal(result.details.decision.projectAgent.name, "readonly-reviewer");
assert.match(result.content[0].text, /project\.readonly-reviewer/);

const autoResult = await tools.get("siso_spawn").execute("test-auto-scorecard-route", {
  task: "Review the auth module for regressions and security risks",
  cwd: root,
  dryRun: true,
});

assert.equal(autoResult.details.status, "planned");
assert.equal(autoResult.details.decision.profile, "project.readonly-reviewer");
assert.equal(autoResult.details.decision.scorecardRoute.id, "project.readonly-reviewer@gpt-5.4-mini/review-regression-v1");
assert.match(autoResult.details.decision.rationale, /Scorecard-selected/);

console.log("SISO_PROJECT_AGENT_ROUTING_SMOKE_OK");
