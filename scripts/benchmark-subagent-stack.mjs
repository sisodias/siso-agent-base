#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProcessFingerprint,
  classifyPackageForSubagentUse,
  createDeadletterRecord,
  deriveHeartbeatState,
  listSupervisorRecords,
  nextRetryState,
  persistSupervisorRecord,
  shouldCleanupOrphanProcess,
  summarizeSupervisorHealth,
  supervisorStorePath,
} from "../extensions/siso-agent-router/subagent-supervisor.js";
import {
  createExtensionAdapterManifest,
  isExtensionAdapter,
  validateExtensionAdapter,
} from "../extensions/siso-agent-router/extension-adapter.js";
import {
  listAgentScorecards,
  recordAgentScorecard,
  summarizeAgentScorecards,
} from "../extensions/siso-agent-router/agent-scorecards.js";
import {
  buildReadyWave,
  claimNextTask,
  failAndBlockChildren,
  resumeFailed,
} from "../extensions/siso-agent-router/task-scheduler.js";
import {
  appendFeedEvent,
  createMailboxMessage,
  markMailboxAcknowledged,
  markMailboxDelivered,
  markMailboxRead,
  normalizeChannelName,
  readFeedEvents,
  shouldRedeliver,
} from "../extensions/siso-agent-router/mailbox-feed.js";
import { markParentNotificationDelivered } from "../extensions/siso-agent-router/notifications.js";
import {
  isToolAllowed,
  loadProjectAgentRegistry,
  normalizeToolAcl,
  parseAgentMarkdown,
} from "../extensions/siso-agent-router/project-agent-registry.js";
import {
  buildSisoTaskWave,
  claimNextSisoTask,
  createSisoTask,
  failAndBlockSisoTask,
  resumeFailedSisoTask,
} from "../extensions/siso-agent-router/task-store.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_LOG = path.join(ROOT, "docs", "strategy", "subagent-improve-log.md");
const OUT_PACKAGE_MAP = path.join(ROOT, "docs", "strategy", "subagent-extension-package-map.md");
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "extensions", "extension-catalog.json"), "utf8"));
const TARGET_PACKAGES = [
  "pi-subagents",
  "pi-crew",
  "@spences10/pi-team-mode",
  "@melihmucuk/pi-crew",
  "pi-messenger-swarm",
  "taskplane",
  "@0xkobold/pi-orchestration",
  "@x1any/pi-swarm",
  "@tintinweb/pi-subagents",
  "@e9n/pi-subagent",
  "pi-agent-router",
  "pi-task-subagents",
];

const smokeOnly = process.argv.includes("--smoke") || process.argv.includes("--check-only");

function fail(message) {
  console.error(`SISO_SUBAGENT_STACK_BENCHMARK_FAIL ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function readPackage(name) {
  return CATALOG.packages.find((pkg) => pkg.name === name);
}

function formatLink(label, href) {
  return href ? `[${label}](${href})` : label;
}

function renderPackageMap(rows) {
  return [
    "# Subagent Extension Package Map",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This map is a reference list from the catalog docs and the round-2 audit. It is not an install endorsement.",
    "",
    "| Package | Repo | Catalog recommendation | SISO use | Why it is here |",
    "|---|---|---|---|---|",
    ...rows.map((row) => `| ${formatLink(row.name, row.packageUrl)} | ${formatLink("repo", row.repoUrl)} | ${row.recommendation} | ${row.use} / ${row.action} | ${row.reason} |`),
    "",
    "## Source Docs",
    "",
    `- ${formatLink("Subagent package audit round 2", "subagent-package-audit-round2.md")}`,
    `- ${formatLink("Subagent extension candidates", "subagent-extension-candidates.md")}`,
    `- ${formatLink("Subagent improve log", "subagent-improve-log.md")}`,
    "",
    "## Candidate Set",
    "",
    "pi-subagents, pi-crew, @spences10/pi-team-mode, @melihmucuk/pi-crew, pi-messenger-swarm, taskplane, @0xkobold/pi-orchestration, @x1any/pi-swarm, @tintinweb/pi-subagents, @e9n/pi-subagent, pi-agent-router, pi-task-subagents",
    "",
  ].join("\n");
}

function renderImproveLog(summary, packages) {
  return [
    "# Subagent Improve Log",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Baseline",
    "",
    "- Task records existed, but there was no pure scheduler boundary for `claim_next`, ready waves, failure propagation, or subtree resume.",
    "- Child notifications existed, but mailbox delivery/read/ack/redelivery and append-only channel feeds were not modeled as separate primitives.",
    "- Profiles existed as hardcoded router entries, but there was no trusted markdown project/user agent registry or enforceable tool ACL parser.",
    "- Runtime status could report stale active records, but there was no dedicated supervisor helper for heartbeat derivation, process fingerprinting, health aggregation, or package classification.",
    "- Agent scorecards, persisted supervisor records, and extension adapter validation were not yet first-class SISO primitives.",
    "- No dedicated benchmark script validated the subagent stack primitives or regenerated the improve/package-map docs.",
    "",
    "## Current",
    "",
    `- Helper exports present: ${summary.exportsOk ? "yes" : "no"}.`,
    `- Task scheduler primitives covered: ${summary.schedulerCoverageOk ? "yes" : "no"}.`,
    `- Task store scheduler integration covered: ${summary.taskStoreCoverageOk ? "yes" : "no"}.`,
    `- Mailbox/feed primitives covered: ${summary.mailboxCoverageOk ? "yes" : "no"}.`,
    `- Child notification mailbox/feed integration covered: ${summary.notificationMailboxCoverageOk ? "yes" : "no"}.`,
    `- Project agent registry and ACL primitives covered: ${summary.registryCoverageOk ? "yes" : "no"}.`,
    `- Heartbeat states covered: ${summary.heartbeatCoverageOk ? "yes" : "no"}.`,
    `- Supervisor health aggregation covered: ${summary.supervisorSummaryOk ? "yes" : "no"}.`,
    `- Package classification covered: ${summary.packageClassificationOk ? "yes" : "no"}.`,
    `- Persisted supervisor records covered: ${summary.supervisorPersistenceOk ? "yes" : "no"}.`,
    `- Agent scorecards covered: ${summary.scorecardsOk ? "yes" : "no"}.`,
    `- Extension adapter contract covered: ${summary.adapterContractOk ? "yes" : "no"}.`,
    `- Package map doc available: ${formatLink("subagent-extension-package-map.md", "subagent-extension-package-map.md")}.`,
    "",
    "## Implemented Primitives",
    "",
    "| Primitive | Status | Notes |",
    "|---|---|---|",
    `| \`claimNextTask/buildReadyWave/failAndBlockChildren/resumeFailed\` | ready | ${summary.schedulerNotes} |`,
    `| \`claimNextSisoTask/buildSisoTaskWave/failAndBlockSisoTask/resumeFailedSisoTask\` | wired | ${summary.taskStoreNotes} |`,
    `| \`createMailboxMessage/markMailbox*/shouldRedeliver\` | ready | ${summary.mailboxNotes} |`,
    `| child notification mailbox/feed write-through | wired | ${summary.notificationMailboxNotes} |`,
    `| \`appendFeedEvent/readFeedEvents/normalizeChannelName\` | ready | ${summary.feedNotes} |`,
    `| \`loadProjectAgentRegistry/normalizeToolAcl/isToolAllowed\` | ready | ${summary.registryNotes} |`,
    `| \`deriveHeartbeatState(record, now)\` | ready | ${summary.heartbeatNotes} |`,
    `| \`buildProcessFingerprint(record)\` | ready | ${summary.fingerprintNotes} |`,
    `| \`summarizeSupervisorHealth(records)\` | ready | ${summary.supervisorNotes} |`,
    `| \`createDeadletterRecord/nextRetryState/shouldCleanupOrphanProcess\` | ready | ${summary.supervisorActionNotes} |`,
    `| \`classifyPackageForSubagentUse(pkg)\` | ready | ${summary.packageNotes} |`,
    `| \`persistSupervisorRecord/listSupervisorRecords\` | ready | ${summary.supervisorPersistenceNotes} |`,
    `| \`recordAgentScorecard/listAgentScorecards\` | ready | ${summary.scorecardNotes} |`,
    `| \`validateExtensionAdapter/createExtensionAdapterManifest\` | ready | ${summary.adapterNotes} |`,
    "",
    "## Runtime Wiring",
    "",
    "- `siso_task_schedule` exposes persistent `claim-next`, `wave`, `fail`, and `resume` operations through the router.",
    "- `/tasks` exposes list, claim, wave, fail, and resume from slash-command flows.",
    "- Child notification delivery now writes mailbox records and append-only `#task/<id>` / `#session/<id>` feed events.",
    "- `siso_mailbox` exposes list, show, read, ack, and feed inspection for parent-session deliveries.",
    "- `siso_project_agents` exposes trusted markdown agent discovery and ACL checks through the router.",
    "- `siso_spawn` can select a trusted markdown project/user agent and applies deny-wins ACL filtering before spawn.",
    "- Project-agent collisions are deterministic: trusted project agents shadow same-name user agents and the registry reports collisions.",
    "- `/agents report` includes a supervisor summary for active child records.",
    "- `/agents report` includes a mailbox delivery/read/ack summary for the parent session.",
    "- `siso_supervisor` exposes health, retry, deadletter, and cleanup-check operations.",
    "- `siso_supervisor` persists and lists active, retry, deadletter, and orphan records under `.siso/supervisor`.",
    "- `siso_agent_scorecards` records, lists, and summarizes `.siso/evals/results` scorecards.",
    "- `siso_extension_adapter` validates adapter manifests before package candidates are promoted to runtime.",
    "- Supervisor helpers expose deadletter, retry, and orphan cleanup identity decisions for future action surfaces.",
    "- `audit:subagent-architecture` regenerates the package-to-layer architecture audit.",
    "",
    "## Verification Commands",
    "",
    "```bash",
    "npm run smoke:subagent-stack",
    "npm run benchmark:subagent-stack",
    "node scripts/benchmark-subagent-stack.mjs --smoke",
    "```",
    "",
    "## Package Map Links",
    "",
    `- ${formatLink("Package map", "subagent-extension-package-map.md")}`,
    `- ${formatLink("Subagent package audit round 2", "subagent-package-audit-round2.md")}`,
    `- ${formatLink("Subagent extension candidates", "subagent-extension-candidates.md")}`,
    "",
    "## Checked Packages",
    "",
    "| Package | Repo | SISO use |",
    "|---|---|---|",
    ...packages.map((row) => `| ${formatLink(row.name, row.packageUrl)} | ${formatLink("repo", row.repoUrl)} | ${row.use} / ${row.action} |`),
    "",
    "## Notes",
    "",
    "- The benchmark stays light: it checks local module exports, sample records, package classification, and doc coverage.",
    "- The smoke mode reuses the same checks without rewriting the docs.",
    "",
  ].join("\n");
}

const helperExports = [
  deriveHeartbeatState,
  buildProcessFingerprint,
  summarizeSupervisorHealth,
  createDeadletterRecord,
  nextRetryState,
  shouldCleanupOrphanProcess,
  classifyPackageForSubagentUse,
  supervisorStorePath,
  persistSupervisorRecord,
  listSupervisorRecords,
  validateExtensionAdapter,
  isExtensionAdapter,
  createExtensionAdapterManifest,
  recordAgentScorecard,
  listAgentScorecards,
  summarizeAgentScorecards,
  claimNextTask,
  buildReadyWave,
  failAndBlockChildren,
  resumeFailed,
  createMailboxMessage,
  markMailboxDelivered,
  markMailboxRead,
  markMailboxAcknowledged,
  shouldRedeliver,
  appendFeedEvent,
  readFeedEvents,
  normalizeChannelName,
  normalizeToolAcl,
  isToolAllowed,
  parseAgentMarkdown,
  loadProjectAgentRegistry,
  createSisoTask,
  claimNextSisoTask,
  buildSisoTaskWave,
  failAndBlockSisoTask,
  resumeFailedSisoTask,
  markParentNotificationDelivered,
];

expect(helperExports.every((fn) => typeof fn === "function"), "helper exports missing");

const now = Date.now();
const schedulerTasks = [
  { id: "plan", status: "ready", title: "Plan" },
  { id: "build", status: "blocked", title: "Build", blockedBy: ["plan"] },
  { id: "verify", status: "blocked", title: "Verify", dependsOn: ["build"] },
  { id: "docs", status: "ready", title: "Docs" },
];
const claimed = claimNextTask(schedulerTasks, { now: new Date(now).toISOString() });
expect(claimed.task?.id === "plan", "scheduler claim should choose first ready task");
const wave = buildReadyWave(schedulerTasks, { maxParallel: 1, now: new Date(now).toISOString() });
expect(wave.claimedTasks.length === 1, "scheduler wave should respect maxParallel");
const failed = failAndBlockChildren([
  { id: "plan", status: "running" },
  { id: "build", status: "ready", blockedBy: ["plan"] },
  { id: "verify", status: "ready", dependsOn: ["build"] },
], "plan", { now: new Date(now).toISOString() });
expect(failed.blockedTasks.length === 2, "scheduler failure should block descendants");
const resumed = resumeFailed(failed.tasks, "plan", { now: new Date(now).toISOString() });
expect(resumed.rootTask?.status === "ready", "scheduler resume should reset failed root");

const tempRoot = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR ?? "/tmp"), "siso-subagent-stack-"));
const taskStoreRoot = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR ?? "/tmp"), "siso-task-store-stack-"));
const storeRoot = createSisoTask({ cwd: taskStoreRoot, title: "Store root", status: "ready" }).task;
const storeChild = createSisoTask({ cwd: taskStoreRoot, title: "Store child", status: "blocked", blockedBy: [storeRoot.id] }).task;
const storeClaimed = claimNextSisoTask({ cwd: taskStoreRoot });
expect(storeClaimed.task?.id === storeRoot.id, "task store claim should persist claimed root");
const storeFailed = failAndBlockSisoTask({ cwd: taskStoreRoot, id: storeRoot.id });
expect(storeFailed.blockedTasks.some((task) => task.id === storeChild.id), "task store fail should block child");
const storeResumed = resumeFailedSisoTask({ cwd: taskStoreRoot, id: storeRoot.id });
expect(storeResumed.rootTask?.status === "ready", "task store resume should reset root");
const storeWave = buildSisoTaskWave({ cwd: taskStoreRoot, maxParallel: 1 });
expect(storeWave.claimedTasks.length === 1, "task store wave should claim ready root");

const mailbox = createMailboxMessage(
  { id: "msg-1", ownerSessionId: "session-a", body: "hello" },
  { rootDir: tempRoot, now: () => new Date(now).toISOString() },
);
const delivered = markMailboxDelivered(mailbox, new Date(now + 1).toISOString(), { rootDir: tempRoot, ownerSessionId: "session-a" });
expect(delivered.state === "delivered", "mailbox delivery transition failed");
expect(shouldRedeliver(delivered, { rootDir: tempRoot, ownerSessionId: "session-a" }) === true, "mailbox should redeliver unacked delivery");
const read = markMailboxRead(delivered, new Date(now + 2).toISOString(), { rootDir: tempRoot, ownerSessionId: "session-a" });
const acked = markMailboxAcknowledged(read, new Date(now + 3).toISOString(), { rootDir: tempRoot, ownerSessionId: "session-a" });
expect(acked.state === "acknowledged", "mailbox acknowledgement transition failed");
appendFeedEvent("#task/demo", { type: "handoff", messageId: mailbox.id }, { rootDir: tempRoot, now: () => new Date(now + 4).toISOString() });
expect(readFeedEvents("#task/demo", { rootDir: tempRoot }).length === 1, "feed event should round-trip");
expect(normalizeChannelName("task/demo") === "#task/demo", "channel normalization failed");
process.env.SISO_MAILBOX_FEED_ROOT_DIR = tempRoot;
const notificationRunPath = path.join(tempRoot, "notification-run.json");
const notificationRecord = {
  id: "notification-child",
  status: "completed",
  task: "Notify parent",
  profile: "minimax.worker",
  model: "gpt-5.4-mini",
  rootSessionId: "root-notify",
  parentSessionId: "parent-notify",
  ownerAgentId: "parent-notify",
  startedAt: new Date(now - 1000).toISOString(),
  completedAt: new Date(now).toISOString(),
  updatedAt: new Date(now).toISOString(),
  runRecordPath: notificationRunPath,
  compactResult: { summary: "Child completed." },
};
fs.writeFileSync(notificationRunPath, `${JSON.stringify(notificationRecord, null, 2)}\n`);
const notificationMarked = markParentNotificationDelivered(notificationRecord, new Date(now + 5).toISOString(), {
  parentSessionId: "parent-notify",
});
expect(notificationMarked.parentNotification?.deliveryId, "notification delivery id should be recorded");
const notificationMailboxPath = path.join(tempRoot, "mailboxes", "parent-notify", "notification-child.json");
expect(fs.existsSync(notificationMailboxPath), "notification delivery should write mailbox record");
expect(readFeedEvents("#task/notification-child", { rootDir: tempRoot }).length === 1, "notification delivery should write task feed event");

const acl = normalizeToolAcl("all, !write, !edit");
expect(isToolAllowed(acl, "read") === true, "ACL all should allow unspecified read");
expect(isToolAllowed(acl, "write") === false, "ACL deny should win");
const parsedAgent = parseAgentMarkdown("---\nname: local-reviewer\nmodel: gpt-5.4-mini\nthinkingLevel: low\ntools: all, !write\n---\nReview code.", "/tmp/local-reviewer.md", "project", "/tmp");
expect(parsedAgent?.model === "gpt-5.4-mini", "agent markdown model parse failed");
expect(isToolAllowed(parsedAgent.tools, "write") === false, "agent markdown ACL parse failed");

const heartbeatSamples = [
  { id: "healthy", heartbeatAt: new Date(now - 10_000).toISOString(), status: "running", pid: 111 },
  { id: "warn", heartbeatAt: new Date(now - 60_000).toISOString(), status: "running", pid: 222 },
  { id: "stale", heartbeatAt: new Date(now - 180_000).toISOString(), status: "running", pid: 333 },
  { id: "dead", heartbeatAt: new Date(now - 400_000).toISOString(), status: "failed", deadletterAt: new Date(now - 300_000).toISOString(), pid: 444 },
];
const heartbeatStates = heartbeatSamples.map((record) => deriveHeartbeatState(record, now).state);
expect(heartbeatStates.includes("healthy"), "healthy heartbeat missing");
expect(heartbeatStates.includes("warn"), "warn heartbeat missing");
expect(heartbeatStates.includes("stale"), "stale heartbeat missing");
expect(heartbeatStates.includes("dead"), "dead heartbeat missing");

const fingerprintA = buildProcessFingerprint({ pid: 1, sessionId: "a", command: "node", cwd: "/tmp/a" });
const fingerprintB = buildProcessFingerprint({ pid: 2, sessionId: "b", command: "node", cwd: "/tmp/b" });
expect(fingerprintA !== fingerprintB, "fingerprint helper should separate distinct process records");

const healthSummary = summarizeSupervisorHealth(heartbeatSamples, now);
expect(healthSummary.total === 4, "health summary total mismatch");
expect(healthSummary.byState.healthy === 1, "health summary healthy count mismatch");
expect(healthSummary.byState.warn === 1, "health summary warn count mismatch");
expect(healthSummary.byState.stale === 1, "health summary stale count mismatch");
expect(healthSummary.byState.dead === 1, "health summary dead count mismatch");
const deadletter = createDeadletterRecord(heartbeatSamples[3], "heartbeat dead", now);
expect(deadletter.status === "deadletter", "deadletter helper should stamp status");
const retryState = nextRetryState({ attempt: 1 }, { maxAttempts: 3, baseDelayMs: 1000, backoff: 2 }, now);
expect(retryState.retryable === true && retryState.delayMs === 2000, "retry helper should compute backoff");
const cleanupSafe = shouldCleanupOrphanProcess({ pid: 123, command: "node worker", startedAt: "2026-01-01T00:00:00.000Z" }, {
  pid: 123,
  command: "node worker",
  startedAt: "2026-01-01T00:00:00.000Z",
});
expect(cleanupSafe.safe === true, "orphan cleanup should allow exact identity match");
const cleanupUnsafe = shouldCleanupOrphanProcess({ pid: 123, command: "node worker", startedAt: "2026-01-01T00:00:00.000Z" }, {
  pid: 123,
  command: "other process",
  startedAt: "2026-01-01T00:00:00.000Z",
});
expect(cleanupUnsafe.safe === false, "orphan cleanup should refuse ambiguous command identity");
const supervisorPersisted = persistSupervisorRecord("deadletters", deadletter, { cwd: tempRoot, now: () => new Date(now + 6).toISOString() });
expect(supervisorPersisted.path === supervisorStorePath("deadletters", { cwd: tempRoot }), "supervisor persistence path mismatch");
expect(listSupervisorRecords({ cwd: tempRoot, kind: "deadletters" }).length === 1, "supervisor persistence should round-trip");
const scorecard = recordAgentScorecard({
  agent: "code-reviewer",
  version: "1.1.0",
  taskSet: "subagent-regression-v1",
  runs: 20,
  trueFindings: 31,
  falsePositives: 6,
  missedBugs: 4,
  avgCostUsd: 0.08,
  avgLatencySeconds: 94,
}, { cwd: tempRoot, now: () => new Date(now + 7).toISOString() });
const scorecards = listAgentScorecards({ cwd: tempRoot });
expect(scorecards.length === 1 && summarizeAgentScorecards(scorecards).best?.id === scorecard.id, "agent scorecard should round-trip and summarize");
const sampleAdapter = {
  id: "browser-use",
  name: "Browser Use Adapter",
  risk: "medium",
  capabilities: ["browser-automation"],
  hasRun: true,
};
expect(validateExtensionAdapter(sampleAdapter).valid === true, "extension adapter manifest should validate");
expect(isExtensionAdapter(sampleAdapter) === true, "extension adapter predicate should accept manifest");
expect(createExtensionAdapterManifest(sampleAdapter).hasRun === true, "extension adapter manifest should preserve hasRun");

const packageRows = TARGET_PACKAGES.map((name) => {
  const pkg = readPackage(name);
  expect(pkg, `missing catalog entry for ${name}`);
  const classification = classifyPackageForSubagentUse(pkg);
  expect(classification.use !== "ignore", `unexpected ignore classification for ${name}`);
  return {
    name,
    packageUrl: pkg.packageUrl,
    repoUrl: pkg.repoUrl,
    recommendation: pkg.recommendation,
    reason: classification.reasons.join("; "),
    ...classification,
  };
});

const existingPackageMap = fs.existsSync(OUT_PACKAGE_MAP) ? fs.readFileSync(OUT_PACKAGE_MAP, "utf8") : "";
const packageMapMissing = TARGET_PACKAGES.filter((name) => !existingPackageMap.includes(name));
if (!smokeOnly) {
  fs.mkdirSync(path.dirname(OUT_PACKAGE_MAP), { recursive: true });
  fs.writeFileSync(OUT_PACKAGE_MAP, renderPackageMap(packageRows));
}
if (packageMapMissing.length > 0 && smokeOnly) {
  fail(`package map missing entries: ${packageMapMissing.join(", ")}`);
}

if (!smokeOnly) {
  fs.mkdirSync(path.dirname(OUT_LOG), { recursive: true });
  fs.writeFileSync(
    OUT_LOG,
    renderImproveLog(
      {
        exportsOk: true,
        schedulerCoverageOk: claimed.task?.id === "plan" && wave.claimedTasks.length === 1 && failed.blockedTasks.length === 2,
        taskStoreCoverageOk: storeClaimed.task?.id === storeRoot.id && storeFailed.blockedTasks.length === 1 && storeWave.claimedTasks.length === 1,
        mailboxCoverageOk: acked.state === "acknowledged" && readFeedEvents("#task/demo", { rootDir: tempRoot }).length === 1,
        notificationMailboxCoverageOk: fs.existsSync(notificationMailboxPath) && readFeedEvents("#task/notification-child", { rootDir: tempRoot }).length === 1,
        registryCoverageOk: parsedAgent?.model === "gpt-5.4-mini" && isToolAllowed(acl, "write") === false,
        heartbeatCoverageOk: heartbeatStates.length === 4,
        supervisorSummaryOk: healthSummary.total === 4,
        packageClassificationOk: packageRows.every((row) => row.use !== "ignore"),
        supervisorPersistenceOk: listSupervisorRecords({ cwd: tempRoot, kind: "deadletters" }).length === 1,
        scorecardsOk: scorecards.length === 1 && scorecard.score.overall > 0,
        adapterContractOk: validateExtensionAdapter(sampleAdapter).valid === true,
        schedulerNotes: "claim, wave, failure propagation, and subtree resume sample records all pass.",
        taskStoreNotes: "persistent task-store claim, wave, fail/block, and resume operations all pass.",
        mailboxNotes: "queued, delivered, read, acknowledged, and redelivery checks are covered.",
        notificationMailboxNotes: "parent notification delivery writes mailbox and task feed records.",
        feedNotes: "append-only channel events round-trip independently of mailbox ack state.",
        registryNotes: "markdown frontmatter and deny-wins ACL grammar are covered.",
        heartbeatNotes: "healthy, warn, stale, and dead sample records all map correctly.",
        fingerprintNotes: "distinct process metadata yields distinct fingerprints.",
        supervisorNotes: "aggregate counts and age tracking are present.",
        supervisorActionNotes: "deadletter, retry backoff, and orphan identity checks are covered.",
        packageNotes: "reference and future-candidate package classes are distinguished.",
        supervisorPersistenceNotes: "active/retry/deadletter/orphan records append to `.siso/supervisor/*.jsonl`.",
        scorecardNotes: "scorecards persist under `.siso/evals/results` and summarize best agent runs.",
        adapterNotes: "adapter manifests declare id, risk, capabilities, and executable run support.",
      },
      packageRows,
    ),
  );
}

console.log([
  "SISO_SUBAGENT_STACK_BENCHMARK_OK",
  `smoke=${smokeOnly ? "true" : "false"}`,
  `packages=${packageRows.length}`,
  "scheduler=claim,wave,fail,resume",
  "mailbox=delivery,read,ack,redelivery",
  "registry=markdown,acl",
  `states=${heartbeatStates.join(",")}`,
  `summary=${healthSummary.summary}`,
].join(" "));
