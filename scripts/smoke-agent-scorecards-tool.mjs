#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";

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

const cwd = mkdtempSync(join(tmpdir(), "siso-agent-scorecards-tool-"));
const recorded = await tools.get("siso_agent_scorecards").execute("scorecard-record", {
  op: "record",
  cwd,
  agent: "code-reviewer",
  version: "1.1.0",
  taskSet: "subagent-regression-v1",
  runs: 20,
  trueFindings: 31,
  falsePositives: 6,
  missedBugs: 4,
  avgCostUsd: 0.08,
  avgLatencySeconds: 94,
});
assert.equal(recorded.details.id, "code-reviewer@1.1.0/subagent-regression-v1");
assert.match(recorded.content[0].text, /overall=/);

const listed = await tools.get("siso_agent_scorecards").execute("scorecard-list", {
  op: "list",
  cwd,
});
assert.equal(listed.details.records.length, 1);
assert.match(listed.content[0].text, /scorecards=1/);

const summary = await tools.get("siso_agent_scorecards").execute("scorecard-summary", {
  op: "summary",
  cwd,
});
assert.equal(summary.details.total, 1);
assert.match(summary.content[0].text, /best=code-reviewer/);

const adapter = await tools.get("siso_extension_adapter").execute("adapter-validate", {
  adapter: {
    id: "browser-use",
    name: "Browser Use Adapter",
    risk: "medium",
    capabilities: ["browser-automation"],
    hasRun: true,
  },
});
assert.equal(adapter.details.validation.valid, true);
assert.match(adapter.content[0].text, /valid=true/);

console.log("SISO_AGENT_SCORECARDS_TOOL_SMOKE_OK");
