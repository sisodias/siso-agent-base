#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildScorecardFromChildRun,
  listAgentScorecards,
  recordChildRunScorecard,
} from "../extensions/siso-agent-router/agent-scorecards.js";
import { markParentNotificationDelivered } from "../extensions/siso-agent-router/notifications.js";

const cwd = mkdtempSync(join(tmpdir(), "siso-child-run-scorecards-workspace-"));
const runDir = mkdtempSync(join(tmpdir(), "siso-child-run-scorecards-runs-"));
const mailboxFeedDir = mkdtempSync(join(tmpdir(), "siso-child-run-scorecards-mailbox-"));
process.env.SISO_MAILBOX_FEED_ROOT_DIR = mailboxFeedDir;

const record = {
  id: "siso-child-scorecard-1",
  status: "completed",
  task: "Review auth risks",
  profile: "project.code-reviewer",
  model: "gpt-5.4-mini",
  cwd,
  startedAt: "2026-05-10T12:00:00.000Z",
  completedAt: "2026-05-10T12:01:34.000Z",
  updatedAt: "2026-05-10T12:01:34.000Z",
  parentSessionId: "parent-scorecard",
  rootSessionId: "root-scorecard",
  ownerAgentId: "parent-scorecard",
  runRecordPath: join(runDir, "siso-child-scorecard-1.json"),
  compactResult: {
    summary: "Found two auth risks.",
    findings: ["Missing expiry check.", "Missing permission regression test."],
    files: ["src/auth.ts"],
    next_action: "Patch auth guard.",
  },
  tokens: { input: 1000, output: 2000, totalTokens: 3000 },
  toolCalls: 4,
};

const built = buildScorecardFromChildRun(record, {
  recordedAt: "2026-05-10T12:02:00.000Z",
  reason: "smoke",
});
assert.equal(built.agent, "project.code-reviewer");
assert.equal(built.version, "gpt-5.4-mini");
assert.equal(built.taskSet, "child-run-siso-child-scorecard-1");
assert.equal(built.runs, 1);
assert.equal(built.trueFindings, 2);
assert.equal(built.avgCostUsd, 0.003);
assert.equal(built.avgLatencySeconds, 94);

const manual = recordChildRunScorecard(record, {
  cwd,
  recordedAt: "2026-05-10T12:02:00.000Z",
  reason: "manual-smoke",
});
assert.equal(manual.id, "project.code-reviewer@gpt-5.4-mini/child-run-siso-child-scorecard-1");
assert.ok(existsSync(manual.path));

writeFileSync(record.runRecordPath, `${JSON.stringify(record, null, 2)}\n`);
const delivered = markParentNotificationDelivered(record, "2026-05-10T12:03:00.000Z", {
  parentSessionId: "parent-scorecard",
});
assert.ok(delivered.scorecard?.id);
assert.ok(delivered.scorecard?.path);
assert.equal(delivered.scorecard.id, manual.id);

const updated = JSON.parse(readFileSync(record.runRecordPath, "utf8"));
assert.equal(updated.scorecard.id, manual.id);
assert.equal(updated.parentNotification.deliveredAt, "2026-05-10T12:03:00.000Z");

const scorecards = listAgentScorecards({ cwd });
assert.equal(scorecards.length, 1);
assert.equal(scorecards[0].id, manual.id);
assert.equal(scorecards[0].recordedAt, "2026-05-10T12:03:00.000Z");

console.log("SISO_CHILD_RUN_SCORECARDS_SMOKE_OK");
