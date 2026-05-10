import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function sanitizePathSegment(value, fallback = "unknown") {
  const text = String(value ?? "").trim();
  const safe = text.replace(/[^A-Za-z0-9._@-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || fallback;
}

function scorecardRoot(options = {}) {
  return resolve(options.rootDir ?? join(options.cwd ?? process.cwd(), ".siso", "evals", "results"));
}

function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tempPath, path);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round4(value) {
  return Math.round(value * 10_000) / 10_000;
}

function scoreFromMetrics(metrics = {}) {
  const trueFindings = toNumber(metrics.trueFindings);
  const falsePositives = toNumber(metrics.falsePositives);
  const missedBugs = toNumber(metrics.missedBugs);
  const avgCostUsd = Math.max(0, toNumber(metrics.avgCostUsd));
  const avgLatencySeconds = Math.max(0, toNumber(metrics.avgLatencySeconds));
  const accuracyDenominator = trueFindings + falsePositives + missedBugs;
  const accuracy = accuracyDenominator > 0 ? trueFindings / accuracyDenominator : 0;
  const cost = 1 / (1 + avgCostUsd);
  const speed = 1 / (1 + avgLatencySeconds / 300);
  const overall = accuracy * 0.65 + cost * 0.2 + speed * 0.15;
  return {
    accuracy: round4(accuracy),
    cost: round4(cost),
    speed: round4(speed),
    overall: round4(overall),
  };
}

function durationSeconds(record = {}) {
  const started = Date.parse(record.startedAt ?? "");
  const ended = Date.parse(record.completedAt ?? record.updatedAt ?? "");
  if (!Number.isFinite(started) || !Number.isFinite(ended)) return 0;
  return Math.max(0, (ended - started) / 1000);
}

function estimateCostUsd(record = {}) {
  const totalTokens = toNumber(record.tokens?.totalTokens ?? record.tokens?.total ?? record.totalTokens);
  if (totalTokens <= 0) return 0;
  return round4(totalTokens / 1_000_000);
}

function childRunAgentName(record = {}) {
  return sanitizePathSegment(record.agent ?? record.profile ?? record.lane ?? record.adapter ?? "child-agent", "child-agent");
}

function childRunVersion(record = {}) {
  return sanitizePathSegment(record.agentVersion ?? record.model ?? record.adapter ?? "0.0.0", "0.0.0");
}

function childRunTaskSet(record = {}) {
  return sanitizePathSegment(record.scorecardTaskSet ?? record.taskSet ?? record.spawnedByTaskId ?? record.taskId ?? `child-run-${record.id ?? "unknown"}`, "child-run");
}

export function agentScorecardPath(scorecard = {}, options = {}) {
  const agent = sanitizePathSegment(scorecard.agent, "agent");
  const version = sanitizePathSegment(scorecard.version ?? "0.0.0", "0.0.0");
  const taskSet = sanitizePathSegment(scorecard.taskSet ?? scorecard.task_set, "taskset");
  return join(scorecardRoot(options), `${agent}@${version}`, `${taskSet}.json`);
}

export function recordAgentScorecard(scorecard = {}, options = {}) {
  const agent = sanitizePathSegment(scorecard.agent, "agent");
  const version = sanitizePathSegment(scorecard.version ?? "0.0.0", "0.0.0");
  const taskSet = sanitizePathSegment(scorecard.taskSet ?? scorecard.task_set, "taskset");
  const recordedAt = scorecard.recordedAt ?? options.now?.() ?? nowIso();
  const next = {
    id: `${agent}@${version}/${taskSet}`,
    agent,
    version,
    taskSet,
    recordedAt,
    runs: toNumber(scorecard.runs),
    trueFindings: toNumber(scorecard.trueFindings ?? scorecard.true_findings),
    falsePositives: toNumber(scorecard.falsePositives ?? scorecard.false_positives),
    missedBugs: toNumber(scorecard.missedBugs ?? scorecard.missed_bugs),
    avgCostUsd: toNumber(scorecard.avgCostUsd ?? scorecard.avg_cost_usd),
    avgLatencySeconds: toNumber(scorecard.avgLatencySeconds ?? scorecard.avg_latency_seconds),
    notes: scorecard.notes ?? "",
  };
  next.score = scoreFromMetrics(next);
  const path = agentScorecardPath(next, options);
  atomicWriteJson(path, next);
  return { ...next, path };
}

function walkJsonFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(entryPath);
    }
  }
  return files;
}

export function listAgentScorecards(options = {}) {
  const records = walkJsonFiles(scorecardRoot(options))
    .map((path) => {
      const record = readJson(path);
      return record ? { ...record, path } : undefined;
    })
    .filter(Boolean)
    .filter((record) => !options.agent || record.agent === options.agent);
  records.sort((left, right) => String(right.recordedAt ?? "").localeCompare(String(left.recordedAt ?? "")));
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : undefined;
  return limit ? records.slice(0, limit) : records;
}

export function summarizeAgentScorecards(records = []) {
  const rows = Array.isArray(records) ? records : [];
  const byAgent = {};
  for (const record of rows) {
    const key = record.agent ?? "agent";
    const existing = byAgent[key] ?? { agent: key, runs: 0, bestOverall: 0, scorecards: 0 };
    existing.runs += toNumber(record.runs);
    existing.scorecards += 1;
    existing.bestOverall = Math.max(existing.bestOverall, toNumber(record.score?.overall));
    byAgent[key] = existing;
  }
  const best = [...rows].sort((left, right) => toNumber(right.score?.overall) - toNumber(left.score?.overall))[0] ?? null;
  return {
    total: rows.length,
    best,
    byAgent,
    summary: rows.length ? `${rows.length} scorecards · best=${best?.agent ?? "none"} score=${best?.score?.overall ?? 0}` : "0 scorecards",
  };
}

export function buildScorecardFromChildRun(record = {}, options = {}) {
  const status = String(record.status ?? "").toLowerCase();
  const completed = status === "completed" || status === "success";
  const findings = Array.isArray(record.compactResult?.findings) ? record.compactResult.findings : [];
  const error = record.error || (!completed && status ? status : "");
  return {
    agent: childRunAgentName(record),
    version: childRunVersion(record),
    taskSet: childRunTaskSet(record),
    runs: 1,
    trueFindings: completed ? Math.max(1, findings.length) : 0,
    falsePositives: 0,
    missedBugs: completed ? 0 : 1,
    avgCostUsd: estimateCostUsd(record),
    avgLatencySeconds: durationSeconds(record),
    notes: [
      `child_id=${record.id ?? "unknown"}`,
      `status=${record.status ?? "unknown"}`,
      record.task ? `task=${String(record.task).slice(0, 240)}` : undefined,
      error ? `error=${String(error).slice(0, 240)}` : undefined,
      options.reason ? `reason=${options.reason}` : undefined,
    ].filter(Boolean).join("\n"),
    ...(options.recordedAt ? { recordedAt: options.recordedAt } : {}),
  };
}

export function recordChildRunScorecard(record = {}, options = {}) {
  const cwd = options.cwd ?? record.cwd ?? process.cwd();
  const scorecard = buildScorecardFromChildRun(record, options);
  return recordAgentScorecard(scorecard, {
    ...options,
    cwd,
  });
}
