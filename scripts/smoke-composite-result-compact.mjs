#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runCouncil } from "../extensions/siso-agent-router/council-layer.js";
import { runWorkflow } from "../extensions/siso-agent-router/workflow-layer.js";
import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";

const tmp = mkdtempSync(join(tmpdir(), "siso-composite-compact-"));
process.env.SISO_CHILD_RUN_DIR = join(tmp, "child-runs");
process.env.SISO_TASK_STORE_PATH = join(tmp, "tasks", "siso-tasks.json");
process.env.SISO_ROOT_SESSION_ID = "root-composite-compact";
process.env.SISO_PARENT_SESSION_ID = "parent-composite-compact";
process.env.SISO_AGENT_ID = "agent-composite-compact";

const council = await runCouncil("Plan a compact result smoke.", {
  dryRun: true,
  noTools: true,
  members: ["minimax.scout", "minimax.verifier"],
  maxMembers: 2,
});
const councilJson = JSON.stringify(council);
assert.equal("events" in council, false, "council result should not expose raw event arrays");
assert.equal(typeof council.eventCount, "number");
assert.ok(council.eventCount >= 2);
for (const member of council.members) {
  assert.equal("events" in member, false, "council members should not expose raw event arrays");
  assert.equal(typeof member.eventCount, "number");
}
assert.doesNotMatch(councilJson, /permission_check|tool_result/, "council details should keep raw event payloads out of model-visible details");

const aliasCouncil = await runCouncil("Plan an architecture smoke.", {
  dryRun: true,
  noTools: true,
  members: ["architect"],
  maxMembers: 1,
});
assert.equal(aliasCouncil.members[0].profile, "gpt55.planner", "council should map architect alias to the planner profile");

const workflow = await runWorkflow("Plan a compact workflow result smoke.", {
  dryRun: true,
  noTools: true,
  council: true,
  workerCount: 2,
  cwd: tmp,
});
const workflowJson = JSON.stringify(workflow);
assert.equal("events" in workflow, false, "workflow result should not expose raw event arrays");
assert.equal(typeof workflow.eventCount, "number");
assert.ok(workflow.eventCount >= 2);
assert.equal("events" in workflow.council, false, "nested workflow council result should not expose raw event arrays");
for (const worker of workflow.workers) {
  assert.equal("events" in worker.child, false, "workflow child details should not expose raw event arrays");
  assert.equal(typeof worker.child.eventCount, "number");
}
assert.doesNotMatch(workflowJson, /permission_check|tool_result/, "workflow details should keep raw event payloads out of model-visible details");

process.env.SISO_AGENT_ROUTER_TOOL_MODE = "lean";
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
assert.ok(siso, "lean composite siso tool should be registered");
const compositeCouncil = await siso.execute("tool-call-composite", {
  action: "council",
  task: "Plan compact composite wrapper result.",
  dryRun: true,
  noTools: true,
  members: ["minimax.scout", "minimax.verifier"],
  limit: 2,
});
const compositeJson = JSON.stringify(compositeCouncil.details);
assert.equal("events" in compositeCouncil.details, false, "siso composite wrapper should not append raw event arrays");
assert.equal(typeof compositeCouncil.details.eventCount, "number");
assert.ok(compositeCouncil.details.eventCount >= 4, "siso composite wrapper should preserve event counts");
assert.doesNotMatch(compositeJson, /permission_check|tool_result/, "siso composite wrapper details should keep raw event payloads out of model-visible details");

console.log("SISO_COMPOSITE_RESULT_COMPACT_SMOKE_OK");
