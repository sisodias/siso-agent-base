#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chooseRoute } from "../extensions/siso-agent-router/route-policy.js";
import { parseWorkflowAllocationPlan, runWorkflow } from "../extensions/siso-agent-router/workflow-layer.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scorecardPath = path.join(root, "benchmarks", "harness", "codex-parity-cases.json");
const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));

assert.equal(scorecard.version, 1);
assert.ok(Array.isArray(scorecard.capabilities));

const evidence = {};

const controllerPlan = parseWorkflowAllocationPlan({
  assignments: [{
    task: "Patch auth middleware route guards.",
    specialistId: "specialist.auth.security",
    executionProfile: "spark.worker",
    requiredChecks: ["node -e \"process.exit(0)\""],
    acceptanceCriteria: ["Route guards are covered."],
  }],
});
evidence["controller-plan-ingestion"] = controllerPlan.assignments.length === 1;

const workflow = await runWorkflow("Patch auth middleware route guards.", {
  dryRun: true,
  noTools: true,
  council: false,
  allocationPlan: controllerPlan,
});
evidence["specialist-routing"] = workflow.workers[0].task.owner === "spark.worker" &&
  workflow.workers[0].task.metadata.specialistId === "specialist.auth.security" &&
  workflow.workers[0].task.metadata.riskTier === "high";
evidence["live-child-joins"] = Boolean(workflow.workers[0].task.metadata.allocationId === workflow.task.metadata.allocationId &&
  workflow.workers[0].task.metadata.assignmentId &&
  workflow.workers[0].task.metadata.stepId);
evidence["evidence-contracts"] = /changed_files, checks_run, acceptance_status, risks, blockers/.test(workflow.workers[0].task.description);

const route = chooseRoute("Implement Stripe subscription checkout, webhook idempotency, and billing portal in the Next.js app", { controllerFirst: true });
evidence["route-controller-first"] = route.routing === "controller_allocation" &&
  route.profile === "gpt55.planner" &&
  route.specialistCandidates?.some((item) => item.id === "specialist.payments.stripe");

evidence["verification-loop"] = fs.readFileSync(path.join(root, "extensions", "siso-agent-router", "workflow-layer.js"), "utf8").includes("passed_after_feedback") &&
  fs.readFileSync(path.join(root, "scripts", "smoke-workflow-structures.mjs"), "utf8").includes("needs_fix should trigger one bounded feedback worker pass");

evidence["side-by-side-live-evals"] = false;
evidence["first-class-tool-runtime"] = false;

let achieved = 0;
let total = 0;
for (const capability of scorecard.capabilities) {
  total += capability.weight;
  if (evidence[capability.id] === true)
    achieved += capability.weight;
}

const percent = Math.round((achieved / total) * 100);
assert.ok(percent >= 70, `local Codex-parity architecture score too low: ${percent}`);
assert.equal(evidence["side-by-side-live-evals"], false, "live eval gap should stay explicit until implemented");
assert.equal(evidence["first-class-tool-runtime"], false, "first-class runtime gap should stay explicit until implemented");

const outDir = path.join(root, "artifacts", "evals");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "codex-parity-scorecard.json"), `${JSON.stringify({
  achieved,
  total,
  percent,
  evidence,
}, null, 2)}\n`);

console.log(`SISO_CODEX_PARITY_SCORECARD_OK architecture=${percent}% achieved=${achieved}/${total}`);
