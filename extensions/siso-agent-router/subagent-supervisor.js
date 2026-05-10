import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const DEFAULT_HEARTBEAT_THRESHOLDS = Object.freeze({
  warnMs: 30_000,
  staleMs: 120_000,
  deadMs: 300_000,
});

const TERMINAL_STATUSES = new Set([
  "dead",
  "deadletter",
  "dead-letter",
  "failed",
  "fatal",
  "killed",
  "terminated",
  "cancelled",
  "canceled",
  "aborted",
]);

const REFERENCE_PACKAGES = new Set([
  "pi-subagents",
  "pi-crew",
  "pi-messenger-swarm",
  "taskplane",
]);

const CANDIDATE_PACKAGES = new Set([
  "@spences10/pi-team-mode",
  "@melihmucuk/pi-crew",
  "@0xkobold/pi-orchestration",
  "@x1any/pi-swarm",
  "@tintinweb/pi-subagents",
  "@e9n/pi-subagent",
  "pi-agent-router",
  "pi-task-subagents",
]);

const SUPERVISOR_KINDS = new Set(["active", "retries", "deadletters", "orphans"]);

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toEpochMs(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeNow(now) {
  const parsed = toEpochMs(now);
  return parsed ?? Date.now();
}

function stableValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry));
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = stableValue(value[key]);
      return acc;
    }, {});
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeSupervisorKind(kind) {
  const normalized = String(kind ?? "active").trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "deadletter" || normalized === "dead-letter") return "deadletters";
  if (normalized === "retry") return "retries";
  if (normalized === "orphan") return "orphans";
  return SUPERVISOR_KINDS.has(normalized) ? normalized : "active";
}

function readJsonLines(path) {
  if (!existsSync(path)) return [];
  let content = "";
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function firstDefined(record, keys) {
  for (const key of keys) {
    if (record && Object.prototype.hasOwnProperty.call(record, key) && record[key] != null) {
      return { key, value: record[key] };
    }
  }
  return { key: null, value: undefined };
}

function formatReason(parts) {
  return parts.filter(Boolean).join("; ");
}

function hasTerminalStatus(record) {
  const status = String(record?.status ?? record?.state ?? "").toLowerCase();
  if (TERMINAL_STATUSES.has(status)) return true;
  if (record?.deadletterAt || record?.deadletteredAt || record?.deadAt) return true;
  const exitCode = toFiniteNumber(record?.exitCode);
  return exitCode != null && exitCode !== 0 && (status === "failed" || status === "dead" || status === "terminated");
}

function heartbeatThresholds(record) {
  const policy = record?.heartbeatPolicy && typeof record.heartbeatPolicy === "object" ? record.heartbeatPolicy : {};
  return {
    warnMs: toFiniteNumber(policy.warnMs ?? record?.heartbeatWarnMs) ?? DEFAULT_HEARTBEAT_THRESHOLDS.warnMs,
    staleMs: toFiniteNumber(policy.staleMs ?? record?.heartbeatStaleMs) ?? DEFAULT_HEARTBEAT_THRESHOLDS.staleMs,
    deadMs: toFiniteNumber(policy.deadMs ?? record?.heartbeatDeadMs) ?? DEFAULT_HEARTBEAT_THRESHOLDS.deadMs,
  };
}

export function deriveHeartbeatState(record, now = Date.now()) {
  const nowMs = normalizeNow(now);
  const thresholds = heartbeatThresholds(record);
  const heartbeatCandidate = firstDefined(record ?? {}, [
    "heartbeatAt",
    "lastHeartbeatAt",
    "heartbeatTime",
    "lastSeenAt",
    "seenAt",
    "updatedAt",
    "startedAt",
    "createdAt",
  ]);
  const heartbeatAtMs = toEpochMs(heartbeatCandidate.value);
  const ageMs = heartbeatAtMs == null ? null : Math.max(0, nowMs - heartbeatAtMs);
  const terminal = hasTerminalStatus(record);
  const reasons = [];

  if (terminal) {
    reasons.push("terminal status or deadletter marker");
  }
  if (heartbeatCandidate.key === null) {
    reasons.push("no heartbeat timestamp available");
  } else if (heartbeatCandidate.key !== "heartbeatAt") {
    reasons.push(`using ${heartbeatCandidate.key} fallback`);
  }
  if (ageMs != null) {
    reasons.push(`age=${ageMs}ms`);
  }

  let state = "healthy";
  if (terminal) {
    state = "dead";
  } else if (ageMs == null) {
    state = "stale";
  } else if (ageMs <= thresholds.warnMs) {
    state = "healthy";
  } else if (ageMs <= thresholds.staleMs) {
    state = "warn";
  } else if (ageMs <= thresholds.deadMs) {
    state = "stale";
  } else {
    state = "dead";
  }

  if (state === "healthy") {
    reasons.push("within healthy window");
  } else if (state === "warn") {
    reasons.push(`past warn threshold ${thresholds.warnMs}ms`);
  } else if (state === "stale") {
    reasons.push(`past stale threshold ${thresholds.staleMs}ms`);
  } else {
    reasons.push(`past dead threshold ${thresholds.deadMs}ms`);
  }

  return {
    state,
    ageMs,
    heartbeatAt: heartbeatCandidate.value != null ? String(heartbeatCandidate.value) : null,
    heartbeatAtMs,
    heartbeatSource: heartbeatCandidate.key,
    warnAtMs: thresholds.warnMs,
    staleAtMs: thresholds.staleMs,
    deadAtMs: thresholds.deadMs,
    terminal,
    reason: formatReason(reasons),
  };
}

export function buildProcessFingerprint(record = {}) {
  const processBlock = {
    pid: record.pid,
    ppid: record.ppid,
    childPid: record.childPid,
    childId: record.childId,
    sessionId: record.sessionId,
    parentSessionId: record.parentSessionId,
    taskId: record.taskId,
    runId: record.runId,
    fleetId: record.fleetId,
    cwd: record.cwd,
    cwdPath: record.cwdPath,
    command: record.command ?? record.cmd ?? record.commandLine,
    argv: record.argv ?? record.args,
    model: record.model,
    profile: record.profile,
    role: record.role,
    startedAt: record.startedAt,
    spawnAt: record.spawnAt,
    heartbeatAt: record.heartbeatAt,
    worktreePath: record.worktreePath,
    host: record.host,
    platform: record.platform,
    process: record.process,
    spawn: record.spawn,
    identity: record.identity,
  };
  const raw = stableStringify(processBlock);
  const digest = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return `proc-${digest}`;
}

export function summarizeSupervisorHealth(records = [], now = Date.now()) {
  const nowMs = normalizeNow(now);
  const rows = [];
  const byState = {
    healthy: 0,
    warn: 0,
    stale: 0,
    dead: 0,
  };
  const fingerprints = new Map();
  let oldestAgeMs = null;
  let newestHeartbeatAtMs = null;
  let missingHeartbeat = 0;
  let deadletters = 0;

  for (const record of Array.isArray(records) ? records : []) {
    const heartbeat = deriveHeartbeatState(record, nowMs);
    const fingerprint = buildProcessFingerprint(record);
    const id = record?.id ?? record?.taskId ?? record?.sessionId ?? fingerprint;
    rows.push({
      id,
      fingerprint,
      state: heartbeat.state,
      ageMs: heartbeat.ageMs,
      reason: heartbeat.reason,
    });
    byState[heartbeat.state] += 1;
    if (heartbeat.heartbeatAtMs == null) missingHeartbeat += 1;
    if (heartbeat.state === "dead") deadletters += 1;
    if (heartbeat.heartbeatAtMs != null) {
      newestHeartbeatAtMs = newestHeartbeatAtMs == null ? heartbeat.heartbeatAtMs : Math.max(newestHeartbeatAtMs, heartbeat.heartbeatAtMs);
    }
    if (heartbeat.ageMs != null) {
      oldestAgeMs = oldestAgeMs == null ? heartbeat.ageMs : Math.max(oldestAgeMs, heartbeat.ageMs);
    }
    fingerprints.set(fingerprint, (fingerprints.get(fingerprint) ?? 0) + 1);
  }

  const duplicateFingerprints = [...fingerprints.values()].filter((count) => count > 1).length;
  const total = rows.length;
  const summary = total
    ? `${total} total · ${byState.healthy} healthy · ${byState.warn} warn · ${byState.stale} stale · ${byState.dead} dead`
    : "0 total";

  return {
    total,
    byState,
    deadletters,
    missingHeartbeat,
    uniqueFingerprints: fingerprints.size,
    duplicateFingerprints,
    oldestAgeMs,
    newestHeartbeatAtMs,
    newestHeartbeatAt: newestHeartbeatAtMs == null ? null : new Date(newestHeartbeatAtMs).toISOString(),
    nowMs,
    records: rows,
    summary,
  };
}
export function createDeadletterRecord(record = {}, reason = "unknown", now = Date.now()) {
  const deadletterAt = new Date(normalizeNow(now)).toISOString();
  return {
    id: record.id ?? record.taskId ?? record.sessionId ?? buildProcessFingerprint(record),
    sourceId: record.id ?? record.taskId ?? record.sessionId,
    status: "deadletter",
    reason: String(reason ?? "unknown"),
    deadletterAt,
    attempt: toFiniteNumber(record.attempt) ?? toFiniteNumber(record.retryAttempt) ?? 0,
    fingerprint: buildProcessFingerprint(record),
    record,
  };
}

export function nextRetryState(record = {}, policy = {}, now = Date.now()) {
  const attempt = (toFiniteNumber(record.attempt) ?? toFiniteNumber(record.retryAttempt) ?? 0) + 1;
  const maxAttempts = toFiniteNumber(policy.maxAttempts ?? record.maxAttempts) ?? 3;
  const baseDelayMs = toFiniteNumber(policy.baseDelayMs ?? record.retryDelayMs) ?? 30_000;
  const backoff = Math.max(1, toFiniteNumber(policy.backoff) ?? 2);
  const retryable = attempt <= maxAttempts;
  const delayMs = retryable ? Math.round(baseDelayMs * Math.pow(backoff, attempt - 1)) : 0;
  const nowMs = normalizeNow(now);
  return {
    attempt,
    maxAttempts,
    retryable,
    delayMs,
    retryAt: retryable ? new Date(nowMs + delayMs).toISOString() : null,
    deadletter: !retryable,
  };
}

export function shouldCleanupOrphanProcess(record = {}, observed = {}) {
  const expected = buildProcessFingerprint(record);
  const actual = observed.fingerprint ?? buildProcessFingerprint({ ...record, ...observed });
  const pidMatches = record.pid == null || observed.pid == null || String(record.pid) === String(observed.pid);
  const fingerprintMatches = expected === actual;
  const commandMatches = !record.command || !observed.command || String(observed.command).includes(String(record.command));
  const safe = Boolean(pidMatches && fingerprintMatches && commandMatches);
  return {
    safe,
    expectedFingerprint: expected,
    observedFingerprint: actual,
    pidMatches,
    fingerprintMatches,
    commandMatches,
    reason: safe ? "process identity matched" : "process identity ambiguous; refuse cleanup",
  };
}

export function supervisorStorePath(kind = "active", options = {}) {
  const rootDir = resolve(options.rootDir ?? join(options.cwd ?? process.cwd(), ".siso", "supervisor"));
  return join(rootDir, `${normalizeSupervisorKind(kind)}.jsonl`);
}

export function persistSupervisorRecord(kind = "active", record = {}, options = {}) {
  const normalizedKind = normalizeSupervisorKind(kind);
  const path = supervisorStorePath(normalizedKind, options);
  const at = options.at ?? options.now?.() ?? nowIso();
  const entry = {
    kind: normalizedKind,
    at,
    record,
  };
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
  return {
    ...entry,
    path,
  };
}

export function listSupervisorRecords(options = {}) {
  const kinds = options.kind
    ? [normalizeSupervisorKind(options.kind)]
    : ["active", "retries", "deadletters", "orphans"];
  let records = kinds.flatMap((kind) => readJsonLines(supervisorStorePath(kind, options)).map((entry) => ({
    ...entry,
    kind: normalizeSupervisorKind(entry.kind ?? kind),
    path: supervisorStorePath(kind, options),
  })));
  records.sort((left, right) => String(right.at ?? "").localeCompare(String(left.at ?? "")));
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : undefined;
  if (limit) records = records.slice(0, limit);
  return records;
}

function packageText(pkg = {}) {
  return [
    pkg.name,
    pkg.description,
    pkg.category,
    Array.isArray(pkg.categories) ? pkg.categories.join(" ") : "",
    pkg.recommendation,
    pkg.rationale,
    pkg.readme,
    pkg.repoUrl,
    pkg.packageUrl,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function packageSignals(pkg = {}) {
  const text = packageText(pkg);
  const signals = [];
  const push = (label, condition) => {
    if (condition) signals.push(label);
  };

  push("subagent", /\bsubagent(s)?\b/.test(text));
  push("orchestration", /\borchestr|coordination|delegat|swarm|crew|team|router|workflow\b/.test(text));
  push("mailbox", /\bmailbox|message|ack|deliver|inbox|channel\b/.test(text));
  push("supervisor", /\bsupervisor|heartbeat|deadletter|retry|lease|watchdog\b/.test(text));
  push("graph", /\bdag|dependency|task graph|scheduler|queue|parallel|chain|fork\b/.test(text));
  push("tooling", /\btool|acl|permission|policy|guard|sandbox\b/.test(text));
  return signals;
}

export function classifyPackageForSubagentUse(pkg = {}) {
  const signals = packageSignals(pkg);
  const name = String(pkg.name ?? "").trim();
  const recommendation = String(pkg.recommendation ?? "").toLowerCase();
  const reasons = [];
  let use = "watch";
  let action = "watch";
  let tier = "low";

  if (!name && signals.length === 0) {
    return {
      use: "ignore",
      action: "ignore",
      tier: "low",
      signals,
      reasons: ["package metadata is too sparse to classify"],
    };
  }

  if (REFERENCE_PACKAGES.has(name)) {
    use = "reference";
    action = "copy-pattern";
    tier = "high";
    reasons.push("already audited as a pattern source");
  } else if (CANDIDATE_PACKAGES.has(name)) {
    use = "candidate";
    action = recommendation === "install-candidate" ? "install-check" : "audit";
    tier = recommendation === "install-candidate" ? "medium" : "high";
    reasons.push("future candidate from the catalog");
  } else if (recommendation === "fork-candidate" || recommendation === "install-candidate") {
    use = "candidate";
    action = recommendation === "install-candidate" ? "install-check" : "audit";
    tier = signals.length >= 3 ? "high" : "medium";
    reasons.push(`catalog recommendation=${recommendation}`);
  } else if (recommendation === "watch") {
    use = "watch";
    action = "watch";
    tier = "low";
    reasons.push("catalog says to watch");
  } else if (signals.includes("subagent") || signals.includes("orchestration") || signals.includes("mailbox") || signals.includes("supervisor") || signals.includes("graph")) {
    use = "candidate";
    action = "audit";
    tier = signals.length >= 3 ? "high" : "medium";
    reasons.push("signal match on subagent or orchestration vocabulary");
  } else {
    use = "watch";
    action = "watch";
    reasons.push("insufficient orchestration signal");
  }

  if (signals.includes("mailbox")) reasons.push("mailbox or delivery semantics");
  if (signals.includes("supervisor")) reasons.push("heartbeat or deadletter semantics");
  if (signals.includes("graph")) reasons.push("task graph or execution chain semantics");
  if (signals.includes("tooling")) reasons.push("tool ACL or guardrail semantics");

  return {
    use,
    action,
    tier,
    signals,
    reasons,
  };
}
