#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  listAgentScorecards,
  recordAgentScorecard,
  summarizeAgentScorecards,
} from "../extensions/siso-agent-router/agent-scorecards.js";

const cwd = mkdtempSync(join(tmpdir(), "siso-agent-scorecards-"));

const first = recordAgentScorecard(
  {
    agent: "code-reviewer",
    version: "1.1.0",
    taskSet: "subagent-regression-v1",
    runs: 20,
    trueFindings: 31,
    falsePositives: 6,
    missedBugs: 4,
    avgCostUsd: 0.08,
    avgLatencySeconds: 94,
  },
  { cwd, now: () => "2026-05-10T12:00:00.000Z" },
);

const second = recordAgentScorecard(
  {
    agent: "package-auditor",
    version: "1.0.0",
    taskSet: "extension-catalog-v1",
    runs: 10,
    trueFindings: 18,
    falsePositives: 2,
    missedBugs: 3,
    avgCostUsd: 0.03,
    avgLatencySeconds: 41,
  },
  { cwd, now: () => "2026-05-10T12:01:00.000Z" },
);

assert.equal(first.agent, "code-reviewer");
assert.equal(first.id, "code-reviewer@1.1.0/subagent-regression-v1");
assert.equal(first.score.accuracy, 0.7561);
assert.equal(first.score.cost, 0.9259);
assert.equal(first.score.overall, 0.7909);
assert.ok(first.path.endsWith("/.siso/evals/results/code-reviewer@1.1.0/subagent-regression-v1.json"));
assert.ok(existsSync(first.path));
assert.equal(JSON.parse(readFileSync(first.path, "utf8")).score.overall, 0.7909);

const records = listAgentScorecards({ cwd });
assert.deepEqual(
  records.map((record) => record.agent),
  ["package-auditor", "code-reviewer"],
);
assert.equal(records[0].id, second.id);

const filtered = listAgentScorecards({ cwd, agent: "code-reviewer" });
assert.equal(filtered.length, 1);
assert.equal(filtered[0].agent, "code-reviewer");

const summary = summarizeAgentScorecards(records);
assert.equal(summary.total, 2);
assert.equal(summary.best.agent, "package-auditor");
assert.equal(summary.byAgent["code-reviewer"].runs, 20);
assert.match(summary.summary, /2 scorecards/);

console.log("SISO_AGENT_SCORECARDS_SMOKE_OK");
