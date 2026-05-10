#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runWorkflow, formatWorkflowResult, parseWorkflowAllocationPlan, validateWorkflowAllocationPlan } from "../extensions/siso-agent-router/workflow-layer.js";
import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";
import { listScopedTaskRecords } from "../extensions/siso-agent-router/task-registry.js";

const tmp = mkdtempSync(join(tmpdir(), "siso-workflow-structures-"));
process.env.SISO_CHILD_RUN_DIR = join(tmp, "child-runs");
process.env.SISO_TASK_ROOT_DIR = join(tmp, "scoped-tasks");
process.env.SISO_TASK_STORE_PATH = join(tmp, "tasks", "siso-tasks.json");
process.env.SISO_ROOT_SESSION_ID = "root-workflow-structures";
process.env.SISO_PARENT_SESSION_ID = "parent-workflow-structures";
process.env.SISO_AGENT_ID = "agent-workflow-structures";

const parallel = await runWorkflow("Ship a structured workflow.", {
  dryRun: true,
  noTools: true,
  council: false,
  cwd: tmp,
  concurrency: 2,
  tasks: [
    { agent: "scout", task: "Map the existing implementation.", output: "reports/scout.md", outputMode: "file-only" },
    { agent: "reviewer", task: "Review risks." },
    { agent: "worker", task: "Patch the narrow implementation." },
  ],
});

assert.equal(parallel.mode, "parallel");
assert.equal(parallel.workers.length, 3);
assert.deepEqual(parallel.stages.map((stage) => stage.mode), ["parallel"]);
assert.equal(parallel.task.metadata.workflowMode, "parallel");
assert.equal(parallel.task.metadata.workerCount, 3);
assert.equal(parallel.workers[0].task.metadata.agent, "scout");
assert.equal(parallel.workers[0].task.metadata.outputMode, "file-only");
assert.match(parallel.workers[0].child.finalOutput, /Output saved to:/);
assert.ok(fs.existsSync(join(tmp, "reports", "scout.md")));
assert.equal(parallel.workers[1].task.owner, "spark.reviewer");
assert.match(parallel.workers[2].task.description, /Patch the narrow implementation/);
assert.match(formatWorkflowResult(parallel), /workflow_mode=parallel/);

const allocationPlan = await runWorkflow("Controller allocation plan smoke.", {
  dryRun: true,
  noTools: true,
  council: false,
  cwd: tmp,
  allocationPlan: {
    taskKind: "implementation",
    complexity: "single_domain",
    riskTier: "high",
    domains: ["auth", "security"],
    assignments: [{
      task: "Patch auth middleware route guards and harden session cookies.",
      specialistId: "specialist.auth.security",
      executionProfile: "spark.worker",
      requiredChecks: ["node -e \"process.exit(0)\""],
      acceptanceCriteria: ["Route guards reject unauthenticated access.", "Session cookies are hardened."],
    }],
  },
});
assert.equal(allocationPlan.mode, "parallel");
assert.equal(allocationPlan.workers.length, 1);
assert.equal(allocationPlan.task.metadata.allocationPlan.assignments.length, 1);
assert.deepEqual(allocationPlan.requiredChecks, ["node -e \"process.exit(0)\""]);
assert.equal(allocationPlan.workers[0].task.owner, "spark.worker");
assert.equal(allocationPlan.workers[0].task.metadata.specialistId, "specialist.auth.security");
assert.equal(allocationPlan.workers[0].task.metadata.specialistAlias, "auth-security");
assert.equal(allocationPlan.workers[0].task.metadata.requestedExecutionProfile, "spark.worker");
assert.deepEqual(allocationPlan.workers[0].task.metadata.requiredChecks, ["node -e \"process.exit(0)\""]);
assert.deepEqual(allocationPlan.workers[0].task.metadata.acceptanceCriteria, ["Route guards reject unauthenticated access.", "Session cookies are hardened."]);
const allocationPlanScopedRecords = listScopedTaskRecords({
  rootSessionId: "root-workflow-structures",
  parentSessionId: "parent-workflow-structures",
  ownerAgentId: "agent-workflow-structures",
}, { limit: 50 });
const allocationPlanScoped = allocationPlanScopedRecords.find((record) => record.id === allocationPlan.workers[0].child.id);
assert.ok(allocationPlanScoped, "allocation-plan dry-run worker should write a scoped task record");
assert.equal(allocationPlanScoped.metadata.specialistId, "specialist.auth.security");
assert.deepEqual(allocationPlanScoped.metadata.acceptanceCriteria, ["Route guards reject unauthenticated access.", "Session cookies are hardened."]);
const parsedPlan = parseWorkflowAllocationPlan(`Controller output:\n\n\`\`\`json\n${JSON.stringify({
  assignments: [{
    task: "Review auth middleware risks.",
    specialistId: "specialist.security.appsec",
    executionProfile: "spark.reviewer",
    acceptanceCriteria: ["Risk findings are explicit."],
  }],
})}\n\`\`\``);
assert.equal(parsedPlan.assignments[0].specialistId, "specialist.security.appsec");
const allocationPlanText = await runWorkflow("Controller allocation plan text smoke.", {
  dryRun: true,
  noTools: true,
  council: false,
  cwd: tmp,
  allocationPlan: `{"assignments":[{"task":"Review auth middleware risks.","specialistId":"specialist.security.appsec","executionProfile":"spark.reviewer","acceptanceCriteria":["Risk findings are explicit."]}]}`,
});
assert.equal(allocationPlanText.workers[0].task.owner, "spark.reviewer");
assert.equal(allocationPlanText.workers[0].task.metadata.specialistId, "specialist.security.appsec");
assert.deepEqual(allocationPlanText.workers[0].task.metadata.acceptanceCriteria, ["Risk findings are explicit."]);
assert.throws(() => parseWorkflowAllocationPlan("not json"), /Invalid workflow allocation plan JSON/);
assert.throws(() => validateWorkflowAllocationPlan({ assignments: [{}] }), /assignments\[0\]\.task is required/);
const generatedAllocationPlan = await runWorkflow("Automatically allocate auth hardening work.", {
  dryRun: true,
  noTools: true,
  council: false,
  cwd: tmp,
  controllerAllocate: true,
  executeControllerAllocation: async (prompt) => {
    assert.match(prompt, /strict JSON only/);
    return {
      taskKind: "implementation",
      complexity: "single_domain",
      riskTier: "high",
      domains: ["auth", "security"],
      assignments: [{
        task: "Patch auth middleware route guards.",
        specialistId: "specialist.auth.security",
        executionProfile: "spark.worker",
        requiredChecks: ["node -e \"process.exit(0)\""],
        acceptanceCriteria: ["Route guard behavior is covered."],
        reason: "Controller selected auth/security specialist.",
      }],
    };
  },
});
assert.equal(generatedAllocationPlan.controllerAllocation.status, "generated");
assert.equal(generatedAllocationPlan.controllerAllocation.source, "test-hook");
assert.equal(generatedAllocationPlan.workers[0].task.owner, "spark.worker");
assert.equal(generatedAllocationPlan.workers[0].task.metadata.specialistId, "specialist.auth.security");
assert.equal(generatedAllocationPlan.workers[0].task.metadata.allocationReason, "Controller selected auth/security specialist.");
assert.deepEqual(generatedAllocationPlan.workers[0].task.metadata.acceptanceCriteria, ["Route guard behavior is covered."]);

const chain = await runWorkflow("Build the handoff chain.", {
  dryRun: true,
  noTools: true,
  council: false,
  cwd: tmp,
  chain: [
    { agent: "scout", task: "Find facts for {task}" },
    { agent: "planner", task: "Plan using previous output: {previous}" },
    {
      parallel: [
        { agent: "worker", task: "Implement from: {previous}" },
        { agent: "reviewer", task: "Review from: {previous}" },
      ],
    },
  ],
});

assert.equal(chain.mode, "chain");
assert.equal(chain.workers.length, 4);
assert.deepEqual(chain.stages.map((stage) => stage.mode), ["single", "single", "parallel"]);
assert.equal(chain.task.metadata.workflowMode, "chain");
assert.equal(chain.workers[0].task.metadata.stageIndex, 1);
assert.equal(chain.workers[3].task.metadata.stageIndex, 3);
assert.match(chain.workers[1].task.description, /dry_run=true/);
assert.match(chain.workers[2].task.description, /dry_run=true/);
assert.match(formatWorkflowResult(chain), /stages=3/);

const tools = new Map();
sisoAgentRouterExtension({
  on() {},
  registerCommand() {},
  registerTool(spec) {
    tools.set(spec.name, spec);
  },
  registerMessageRenderer() {},
  sendUserMessage() {},
  getAllTools: () => [],
});
const siso = tools.get("siso");
assert.ok(siso, "siso tool should be registered");
const wrapped = await siso.execute("tool-call-workflow-structures", {
  action: "workflow",
  task: "Route through structured workflow wrapper.",
  dryRun: true,
  noTools: true,
  council: false,
  options: {
    tasks: [
      { agent: "scout", task: "Inspect." },
      { agent: "worker", task: "Implement." },
    ],
  },
});
assert.equal(wrapped.details.mode, "parallel");
assert.equal(wrapped.details.workers.length, 2);

const nativeCalls = [];
const verified = await runWorkflow("Implement and verify a native workflow.", {
  council: false,
  cwd: tmp,
  tasks: [{ agent: "worker", task: "Make the bounded implementation change." }],
  ctx: {
    getAllTools: () => [{
      name: "subagent",
      execute: async (_id, params) => {
        nativeCalls.push(params);
        const isVerifier = params.task.includes("Verifier task:");
        return {
          content: [{ type: "text", text: isVerifier ? "VERDICT: pass\nAll required checks and worker evidence line up." : "Worker completed the bounded implementation." }],
          details: {
            results: [{
              messages: [{
                role: "assistant",
                content: [{ type: "text", text: isVerifier ? "VERDICT: pass\nAll required checks and worker evidence line up." : "Worker completed the bounded implementation." }],
              }],
              usage: { input: isVerifier ? 31 : 17, output: isVerifier ? 9 : 8, contextTokens: isVerifier ? 40 : 25 },
            }],
          },
        };
      },
    }],
  },
});
assert.equal(verified.status, "completed");
assert.match(verified.task.metadata.allocationId, /^alloc-/);
assert.equal(verified.task.metadata.verificationContract.verifier, "minimax.verifier");
assert.equal(verified.workers[0].task.metadata.allocationId, verified.task.metadata.allocationId);
assert.equal(verified.workers[0].task.metadata.assignmentId, `${verified.task.metadata.allocationId}-assign-1`);
assert.equal(verified.workers[0].task.metadata.stepId, "parallel-stage-1-worker-1");
assert.equal(verified.workers[0].task.metadata.specialistId, "specialist.agent-system.runtime");
assert.equal(verified.workers[0].task.metadata.specialistAlias, "agent-runtime");
assert.equal(verified.workers[0].task.metadata.riskTier, "high");
assert.match(verified.workers[0].task.metadata.ownershipBoundary, /Make the bounded implementation change/);
const verifiedScopedRecords = listScopedTaskRecords({
  rootSessionId: "root-workflow-structures",
  parentSessionId: "parent-workflow-structures",
  ownerAgentId: "agent-workflow-structures",
}, { limit: 20 });
const verifiedWorkerScoped = verifiedScopedRecords.find((record) => record.id === verified.workers[0].child.id);
assert.ok(verifiedWorkerScoped, "workflow native worker should write a scoped task record");
assert.equal(verifiedWorkerScoped.metadata.allocationId, verified.task.metadata.allocationId);
assert.equal(verifiedWorkerScoped.metadata.assignmentId, `${verified.task.metadata.allocationId}-assign-1`);
assert.equal(verifiedWorkerScoped.metadata.stepId, "parallel-stage-1-worker-1");
assert.equal(verifiedWorkerScoped.metadata.specialistId, "specialist.agent-system.runtime");
assert.equal(verifiedWorkerScoped.metadata.specialistAlias, "agent-runtime");
assert.match(verifiedWorkerScoped.metadata.ownershipBoundary, /Make the bounded implementation change/);
const verifiedVerifierScoped = verifiedScopedRecords.find((record) => record.id === verified.verifier.id);
assert.ok(verifiedVerifierScoped, "workflow native verifier should write a scoped task record");
assert.equal(verifiedVerifierScoped.metadata.kind, "workflow-verifier");
assert.equal(verifiedVerifierScoped.metadata.allocationId, verified.task.metadata.allocationId);
assert.equal(verifiedVerifierScoped.metadata.stepId, "verifier-1");
assert.equal(verifiedVerifierScoped.metadata.specialistId, "minimax.verifier");
assert.equal(verified.verifier.status, "completed");
assert.equal(verified.verifier.profile, "minimax.verifier");
assert.equal(verified.verifier.verdict, "pass");
assert.equal(nativeCalls.length, 2, "workflow should run one worker and one verifier through native subagents");
assert.match(nativeCalls[1].task, /Verifier task:/);
assert.match(formatWorkflowResult(verified), /verifier_status=completed/);
assert.match(formatWorkflowResult(verified), /verifier_verdict=pass/);

const feedbackCalls = [];
let feedbackVerifierCount = 0;
const feedbackLoop = await runWorkflow("Loop workflow once when verifier rejects.", {
  council: false,
  cwd: tmp,
  verifyIterations: 2,
  tasks: [{ agent: "worker", task: "Implement the requested behavior." }],
  ctx: {
    getAllTools: () => [{
      name: "subagent",
      execute: async (_id, params) => {
        feedbackCalls.push(params);
        const isVerifier = params.task.includes("Verifier task:");
        const isFeedbackWorker = params.task.includes("Verifier feedback:");
        if (isVerifier) {
          feedbackVerifierCount += 1;
          const text = feedbackVerifierCount === 1
            ? "VERDICT: needs_fix\nMissing requirement: include validation evidence."
            : "VERDICT: pass\nFeedback worker added the missing validation evidence.";
          return {
            content: [{ type: "text", text }],
            details: { results: [{ messages: [{ role: "assistant", content: [{ type: "text", text }] }], usage: { input: 13, output: 5, contextTokens: 18 } }] },
          };
        }
        const text = isFeedbackWorker
          ? "Feedback worker added validation evidence."
          : "Initial worker finished without enough validation evidence.";
        return {
          content: [{ type: "text", text }],
          details: { results: [{ messages: [{ role: "assistant", content: [{ type: "text", text }] }], usage: { input: 11, output: 6, contextTokens: 17 } }] },
        };
      },
    }],
  },
});
assert.equal(feedbackLoop.status, "completed");
assert.equal(feedbackLoop.verifier.verdict, "pass");
assert.equal(feedbackLoop.verifierIterations.length, 2);
assert.equal(feedbackLoop.loopOutcome, "passed_after_feedback");
assert.deepEqual(feedbackLoop.task.metadata.verifierVerdicts, ["needs_fix", "pass"]);
assert.equal(feedbackLoop.task.metadata.feedbackPackets.length, 1);
assert.equal(feedbackLoop.task.metadata.reentryWorkerIds.length, 1);
assert.equal(feedbackLoop.task.metadata.checkpoints.length, 1);
assert.equal(feedbackLoop.checkpoints.length, 1);
assert.equal(feedbackLoop.checkpoints[0].rollbackMode, "explicit-only");
assert.ok(feedbackLoop.flightRecorder?.path);
assert.ok(fs.existsSync(feedbackLoop.flightRecorder.path));
const feedbackFlight = JSON.parse(fs.readFileSync(feedbackLoop.flightRecorder.path, "utf8"));
assert.equal(feedbackFlight.loopOutcome, "passed_after_feedback");
assert.deepEqual(feedbackFlight.verifierVerdicts, ["needs_fix", "pass"]);
assert.equal(feedbackLoop.workers.length, 2, "needs_fix should trigger one bounded feedback worker pass");
assert.equal(feedbackCalls.length, 4, "workflow should call initial worker, verifier, feedback worker, verifier");
assert.match(feedbackCalls[2].task, /Verifier feedback:/);
assert.match(feedbackCalls[2].task, /verdict=needs_fix/);
assert.match(feedbackCalls[2].task, /missingRequirement=include validation evidence/);
assert.match(feedbackCalls[2].task, /suggestedNextAction=/);
assert.match(feedbackCalls[2].task, /freshCheckpointRequired=true/);
assert.match(formatWorkflowResult(feedbackLoop), /verifier_iterations=2/);
assert.match(formatWorkflowResult(feedbackLoop), /loop_outcome=passed_after_feedback/);
assert.match(formatWorkflowResult(feedbackLoop), /feedback_packets=1/);
assert.match(formatWorkflowResult(feedbackLoop), /reentry_workers=1/);
assert.match(formatWorkflowResult(feedbackLoop), /workers=2/);

const checkMarker = join(tmp, "workflow-check-marker.txt");
const checkCalls = [];
const checkLoop = await runWorkflow("Loop workflow when required check fails.", {
  council: false,
  cwd: tmp,
  verifyIterations: 2,
  checks: `node -e "process.exit(require('fs').existsSync('${checkMarker}') ? 0 : 7)"`,
  tasks: [{ agent: "worker", task: "Implement and satisfy required check." }],
  ctx: {
    getAllTools: () => [{
      name: "subagent",
      execute: async (_id, params) => {
        checkCalls.push(params);
        const isVerifier = params.task.includes("Verifier task:");
        const isFeedbackWorker = params.task.includes("Required checks failed") || params.task.includes("failingCheckCommand=");
        if (isFeedbackWorker) {
          fs.writeFileSync(checkMarker, "ok\n", "utf8");
        }
        const text = isVerifier
          ? "VERDICT: pass\nRequired check evidence is present."
          : isFeedbackWorker
            ? "Feedback worker created the required check marker."
            : "Initial worker omitted the required check marker.";
        return {
          content: [{ type: "text", text }],
          details: { results: [{ messages: [{ role: "assistant", content: [{ type: "text", text }] }], usage: { input: 8, output: 4, contextTokens: 12 } }] },
        };
      },
    }],
  },
});
assert.equal(checkLoop.status, "completed");
assert.equal(checkLoop.loopOutcome, "passed_after_feedback");
assert.equal(checkLoop.checkIterations.length, 2);
assert.equal(checkLoop.checkIterations[0].ok, false);
assert.equal(checkLoop.checkIterations[1].ok, true);
assert.equal(checkLoop.checkpoints.length, 1);
assert.equal(checkLoop.feedbackPackets[0].failingCheckCommand, `node -e "process.exit(require('fs').existsSync('${checkMarker}') ? 0 : 7)"`);
assert.equal(checkCalls.length, 3, "workflow should call initial worker, feedback worker, verifier when first check fails");
assert.match(checkCalls[1].task, /failingCheckCommand=/);
assert.match(formatWorkflowResult(checkLoop), /check_iterations=2/);
assert.match(formatWorkflowResult(checkLoop), /checks_ok=true/);

const passCheckCalls = [];
const passCheck = await runWorkflow("Verifier receives passing check evidence.", {
  council: false,
  cwd: tmp,
  checks: "node -e \"process.exit(0)\"",
  tasks: [{ agent: "worker", task: "Implement with passing check." }],
  ctx: {
    getAllTools: () => [{
      name: "subagent",
      execute: async (_id, params) => {
        passCheckCalls.push(params);
        const isVerifier = params.task.includes("Verifier task:");
        const text = isVerifier ? "VERDICT: pass\nPassing check evidence was reviewed." : "Worker completed before passing check.";
        return {
          content: [{ type: "text", text }],
          details: { results: [{ messages: [{ role: "assistant", content: [{ type: "text", text }] }], usage: { input: 6, output: 3, contextTokens: 9 } }] },
        };
      },
    }],
  },
});
assert.equal(passCheck.status, "completed");
assert.equal(passCheck.checkIterations.length, 1);
assert.equal(passCheck.checksOk, true);
assert.equal(passCheck.verifier.verdict, "pass");
assert.equal(passCheckCalls.length, 2);
assert.match(passCheckCalls[1].task, /Required check evidence:/);
assert.match(passCheckCalls[1].task, /ok=true/);

const blockedCheckCalls = [];
const blockedCheck = await runWorkflow("Block unsafe required check.", {
  council: false,
  cwd: tmp,
  checks: "rm -rf .",
  tasks: [{ agent: "worker", task: "Implement before blocked check." }],
  ctx: {
    getAllTools: () => [{
      name: "subagent",
      execute: async (_id, params) => {
        blockedCheckCalls.push(params);
        const text = "Worker completed before unsafe check was blocked.";
        return {
          content: [{ type: "text", text }],
          details: { results: [{ messages: [{ role: "assistant", content: [{ type: "text", text }] }], usage: { input: 4, output: 2, contextTokens: 6 } }] },
        };
      },
    }],
  },
});
assert.equal(blockedCheck.status, "failed");
assert.equal(blockedCheck.loopOutcome, "check_blocked");
assert.equal(blockedCheck.checkIterations.length, 1);
assert.equal(blockedCheck.checkIterations[0].results[0].blocked, true);
assert.equal(blockedCheck.verifier.verdict, "needs_fix");
assert.equal(blockedCheck.reentryWorkerIds.length, 0);
assert.equal(blockedCheckCalls.length, 1, "blocked check should not spawn verifier or feedback worker");
assert.match(formatWorkflowResult(blockedCheck), /loop_outcome=check_blocked/);
assert.match(formatWorkflowResult(blockedCheck), /failed_check=rm -rf \./);

const exhaustedCalls = [];
const exhausted = await runWorkflow("Stop after repeated verifier rejection.", {
  council: false,
  cwd: tmp,
  verifyIterations: 2,
  tasks: [{ agent: "worker", task: "Implement but keep missing evidence." }],
  ctx: {
    getAllTools: () => [{
      name: "subagent",
      execute: async (_id, params) => {
        exhaustedCalls.push(params);
        const text = params.task.includes("Verifier task:")
          ? "VERDICT: needs_fix\nMissing requirement: still missing evidence."
          : "Worker attempted the requested change.";
        return {
          content: [{ type: "text", text }],
          details: { results: [{ messages: [{ role: "assistant", content: [{ type: "text", text }] }], usage: { input: 7, output: 3, contextTokens: 10 } }] },
        };
      },
    }],
  },
});
assert.equal(exhausted.status, "failed");
assert.equal(exhausted.task.status, "failed");
assert.equal(exhausted.loopOutcome, "needs_fix_exhausted");
assert.deepEqual(exhausted.task.metadata.verifierVerdicts, ["needs_fix", "needs_fix"]);
assert.equal(exhausted.feedbackPackets.length, 2);
assert.equal(exhausted.reentryWorkerIds.length, 1);
assert.equal(exhaustedCalls.length, 4, "repeated needs_fix should not spawn a third worker");
assert.match(formatWorkflowResult(exhausted), /loop_outcome=needs_fix_exhausted/);

const blockedCalls = [];
const blockedWorkflow = await runWorkflow("Stop when verifier is blocked.", {
  council: false,
  cwd: tmp,
  tasks: [{ agent: "worker", task: "Implement blocked workflow." }],
  ctx: {
    getAllTools: () => [{
      name: "subagent",
      execute: async (_id, params) => {
        blockedCalls.push(params);
        const text = params.task.includes("Verifier task:")
          ? "VERDICT: blocked\nCannot verify safely."
          : "Worker completed but verifier cannot check it.";
        return {
          content: [{ type: "text", text }],
          details: { results: [{ messages: [{ role: "assistant", content: [{ type: "text", text }] }], usage: { input: 6, output: 4, contextTokens: 10 } }] },
        };
      },
    }],
  },
});
assert.equal(blockedWorkflow.status, "failed");
assert.equal(blockedWorkflow.loopOutcome, "blocked");
assert.equal(blockedWorkflow.reentryWorkerIds.length, 0);
assert.equal(blockedCalls.length, 2);
assert.match(formatWorkflowResult(blockedWorkflow), /verifier_verdict=blocked/);

const verifyDisabledCalls = [];
const verifyDisabled = await runWorkflow("Skip verifier when disabled.", {
  council: false,
  cwd: tmp,
  verify: false,
  tasks: [{ agent: "worker", task: "Implement without verifier." }],
  ctx: {
    getAllTools: () => [{
      name: "subagent",
      execute: async (_id, params) => {
        verifyDisabledCalls.push(params);
        const text = "Worker completed with verifier disabled.";
        return {
          content: [{ type: "text", text }],
          details: { results: [{ messages: [{ role: "assistant", content: [{ type: "text", text }] }], usage: { input: 5, output: 5, contextTokens: 10 } }] },
        };
      },
    }],
  },
});
assert.equal(verifyDisabled.status, "completed");
assert.equal(verifyDisabled.verifier, undefined);
assert.equal(verifyDisabled.loopOutcome, "skipped");
assert.equal(verifyDisabledCalls.length, 1);
assert.match(formatWorkflowResult(verifyDisabled), /verifier_verdict=skipped/);

const reviewRecipe = await runWorkflow("Review the current diff.", {
  dryRun: true,
  noTools: true,
  council: false,
  cwd: tmp,
  recipe: "parallel-review",
});
assert.equal(reviewRecipe.mode, "parallel");
assert.equal(reviewRecipe.recipe, "parallel-review");
assert.equal(reviewRecipe.workers.length, 3);
assert.ok(reviewRecipe.workers.every((worker) => worker.task.owner === "spark.reviewer"));
assert.match(reviewRecipe.workers[0].task.description, /correctness/i);
assert.match(formatWorkflowResult(reviewRecipe), /recipe=parallel-review/);

const handoffRecipe = await runWorkflow("Study package X and produce a build plan.", {
  dryRun: true,
  noTools: true,
  council: false,
  cwd: tmp,
  recipe: "handoff-plan",
});
assert.equal(handoffRecipe.mode, "chain");
assert.equal(handoffRecipe.recipe, "handoff-plan");
assert.deepEqual(handoffRecipe.stages.map((stage) => stage.mode), ["parallel", "single"]);
assert.match(handoffRecipe.workers.at(-1).task.description, /synthesize/i);

console.log("SISO_WORKFLOW_STRUCTURES_SMOKE_OK");
