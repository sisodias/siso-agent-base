import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { currentTaskScope, isRecordVisibleToScope } from "./task-registry.js";

const DEFAULT_SESSION_ROOT = join(homedir(), ".siso", "agent", "sessions");

function nowIso() {
    return new Date().toISOString();
}
function sessionRootDir() {
    return process.env.SISO_SESSION_ROOT_DIR ?? DEFAULT_SESSION_ROOT;
}
function sanitizePathSegment(value, fallback = "unknown") {
    const text = String(value ?? "").trim();
    const safe = text.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    return safe || fallback;
}
function normalizeScope(scope = currentTaskScope()) {
    const parentSessionId = scope.parentSessionId ?? scope.sessionId ?? currentTaskScope().parentSessionId;
    const rootSessionId = scope.rootSessionId ?? parentSessionId;
    const ownerAgentId = scope.ownerAgentId ?? parentSessionId;
    return {
        rootSessionId,
        parentSessionId,
        ownerAgentId,
        ...(scope.spawnedByTaskId ? { spawnedByTaskId: scope.spawnedByTaskId } : {}),
        depth: Number.isFinite(scope.depth) ? scope.depth : 0,
    };
}
function scopeFromRecord(record, fallbackScope = currentTaskScope()) {
    const fallback = normalizeScope(fallbackScope);
    return normalizeScope({
        rootSessionId: record.rootSessionId ?? fallback.rootSessionId,
        parentSessionId: record.parentSessionId ?? fallback.parentSessionId,
        ownerAgentId: record.ownerAgentId ?? fallback.ownerAgentId,
        spawnedByTaskId: record.spawnedByTaskId ?? fallback.spawnedByTaskId,
        depth: record.depth ?? fallback.depth,
    });
}
export function sessionPaths(sessionId) {
    const session = sanitizePathSegment(sessionId);
    const dir = join(sessionRootDir(), session);
    return {
        dir,
        sessionRecordPath: join(dir, "session.json"),
        eventsPath: join(dir, "events.jsonl"),
        agentsDir: join(dir, "agents"),
    };
}
export function sessionAgentPaths(sessionId, agentId) {
    const session = sanitizePathSegment(sessionId);
    const agent = sanitizePathSegment(agentId, "agent");
    const sessionPathSet = sessionPaths(session);
    const dir = join(sessionPathSet.agentsDir, agent);
    return {
        ...sessionPathSet,
        agentDir: dir,
        agentRecordPath: join(dir, "agent.json"),
        transcriptPath: join(dir, "transcript.jsonl"),
        eventsPath: join(dir, "events.jsonl"),
        stdoutPath: join(dir, "stdout.jsonl"),
        stderrPath: join(dir, "stderr.log"),
        summaryPath: join(dir, "summary.json"),
    };
}
function atomicWriteJson(path, value) {
    mkdirSync(dirname(path), { recursive: true });
    const tempPath = `${path}.${process.pid}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
    renameSync(tempPath, path);
}
function compactAgentRecord(record, scope, paths, eventCount) {
    const id = record.agentId ?? record.id;
    const tokens = record.tokens ?? { input: 0, output: 0, totalTokens: 0 };
    return {
        id,
        agentId: id,
        taskId: record.taskId ?? record.id,
        status: record.status ?? "unknown",
        runtime: record.runtime ?? record.adapter,
        adapter: record.adapter,
        profile: record.profile,
        lane: record.lane,
        model: record.model,
        task: record.task,
        cwd: record.cwd,
        rootSessionId: scope.rootSessionId,
        parentSessionId: scope.parentSessionId,
        ownerAgentId: scope.ownerAgentId,
        ...(scope.spawnedByTaskId ? { spawnedByTaskId: scope.spawnedByTaskId } : {}),
        ...(record.fleetId ? { fleetId: record.fleetId } : {}),
        depth: scope.depth,
        startedAt: record.startedAt ?? nowIso(),
        updatedAt: record.updatedAt ?? nowIso(),
        ...(record.completedAt ? { completedAt: record.completedAt } : {}),
        ...(record.pid !== undefined ? { pid: record.pid } : {}),
        ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
        ...(record.signal !== undefined ? { signal: record.signal } : {}),
        tokens,
        toolCalls: record.toolCalls ?? 0,
        ...(record.compactResult ? { compactResult: record.compactResult } : {}),
        ...(record.error ? { error: String(record.error).slice(0, 600) } : {}),
        ...(record.notified !== undefined ? { notified: record.notified === true } : {}),
        ...(record.runRecordPath ? { legacyChildRunPath: record.runRecordPath } : {}),
        paths: {
            agent: paths.agentRecordPath,
            transcript: paths.transcriptPath,
            events: paths.eventsPath,
            stdout: record.stdoutPath ?? paths.stdoutPath,
            stderr: record.stderrPath ?? paths.stderrPath,
            summary: paths.summaryPath,
        },
        eventCount,
    };
}
function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch {
        return undefined;
    }
}
function readEventCount(path) {
    try {
        return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).length;
    }
    catch {
        return 0;
    }
}
function appendSessionEvent(path, event) {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(event)}\n`);
}
function writeSessionRecord(scope) {
    const paths = sessionPaths(scope.parentSessionId);
    const previous = readJson(paths.sessionRecordPath);
    atomicWriteJson(paths.sessionRecordPath, {
        id: scope.parentSessionId,
        rootSessionId: scope.rootSessionId,
        parentSessionId: scope.parentSessionId,
        ownerAgentId: scope.ownerAgentId,
        startedAt: previous?.startedAt ?? nowIso(),
        updatedAt: nowIso(),
    });
}
export function appendSessionAgentEvent(scopeInput, agentId, event = {}) {
    const scope = normalizeScope(scopeInput);
    const paths = sessionAgentPaths(scope.parentSessionId, agentId);
    const normalized = {
        ...event,
        at: event.at ?? event.timestamp ?? nowIso(),
        sessionId: scope.parentSessionId,
        rootSessionId: scope.rootSessionId,
        parentSessionId: scope.parentSessionId,
        ownerAgentId: scope.ownerAgentId,
        agentId,
    };
    appendSessionEvent(paths.eventsPath, normalized);
    appendSessionEvent(sessionPaths(scope.parentSessionId).eventsPath, normalized);
    const record = readJson(paths.agentRecordPath);
    if (record) {
        atomicWriteJson(paths.agentRecordPath, {
            ...record,
            updatedAt: nowIso(),
            eventCount: readEventCount(paths.eventsPath),
        });
    }
    return normalized;
}
export function writeSessionAgent(record, scopeInput = undefined) {
    if (!record?.id && !record?.agentId)
        return record;
    const scope = scopeFromRecord(record, scopeInput);
    const agentId = record.agentId ?? record.id;
    const paths = sessionAgentPaths(scope.parentSessionId, agentId);
    writeSessionRecord(scope);
    const rawEvents = Array.isArray(record.events) ? record.events : [];
    for (const event of rawEvents)
        appendSessionAgentEvent(scope, agentId, event);
    const eventCount = typeof record.eventCount === "number" ? record.eventCount : readEventCount(paths.eventsPath);
    const compact = compactAgentRecord(record, scope, paths, eventCount);
    atomicWriteJson(paths.agentRecordPath, compact);
    if (compact.compactResult || compact.error) {
        atomicWriteJson(paths.summaryPath, {
            agentId,
            status: compact.status,
            summary: compact.error ?? compact.compactResult?.summary ?? "",
            updatedAt: compact.updatedAt,
        });
    }
    return compact;
}
export function readSessionAgent(scopeInput, agentId) {
    const scope = normalizeScope(scopeInput);
    const record = readJson(sessionAgentPaths(scope.parentSessionId, agentId).agentRecordPath);
    return isRecordVisibleToScope(record, scope) ? record : undefined;
}
export function listSessionAgents(scopeInput = currentTaskScope(), options = {}) {
    const scope = normalizeScope(scopeInput);
    const agentsDir = sessionPaths(scope.parentSessionId).agentsDir;
    let records = [];
    try {
        records = readdirSync(agentsDir)
            .map((name) => join(agentsDir, name, "agent.json"))
            .filter((path) => existsSync(path))
            .map((path) => readJson(path))
            .filter(Boolean)
            .filter((record) => isRecordVisibleToScope(record, scope));
    }
    catch {
        return [];
    }
    records.sort((a, b) => {
        const bMs = Date.parse(b.completedAt ?? b.updatedAt ?? b.startedAt ?? "0") || statTimeMs(b.paths?.agent) || 0;
        const aMs = Date.parse(a.completedAt ?? a.updatedAt ?? a.startedAt ?? "0") || statTimeMs(a.paths?.agent) || 0;
        return bMs - aMs;
    });
    const limit = Number.isFinite(options.limit) ? options.limit : 50;
    return records.slice(0, limit);
}
function statTimeMs(path) {
    try {
        return path ? statSync(path).mtimeMs : undefined;
    }
    catch {
        return undefined;
    }
}
function isTerminalStatus(status) {
    return status === "completed" || status === "failed" || status === "timeout" || status === "aborted" || status === "unsupported" || status === "cancelled";
}
export function projectSessionRouterStatus(scopeInput = currentTaskScope(), options = {}) {
    const agents = listSessionAgents(scopeInput, { limit: options.limit ?? 30 });
    const children = Object.fromEntries(agents.map((agent) => [agent.id, {
            id: agent.id,
            status: agent.status,
            runtime: agent.runtime,
            adapter: agent.adapter,
            profile: agent.profile,
            lane: agent.lane,
            model: agent.model,
            task: agent.task,
            rootSessionId: agent.rootSessionId,
            parentSessionId: agent.parentSessionId,
            ownerAgentId: agent.ownerAgentId,
            ...(agent.spawnedByTaskId ? { spawnedByTaskId: agent.spawnedByTaskId } : {}),
            ...(agent.fleetId ? { fleetId: agent.fleetId } : {}),
            depth: agent.depth,
            startedAt: agent.startedAt,
            updatedAt: agent.updatedAt,
            pid: agent.pid,
            exitCode: agent.exitCode,
            signal: agent.signal,
            tokens: agent.tokens,
            toolCalls: agent.toolCalls,
            compactResult: agent.compactResult,
            error: agent.error,
            runRecordPath: agent.legacyChildRunPath,
            eventCount: agent.eventCount,
        }]));
    const active = agents.find((agent) => !isTerminalStatus(agent.status));
    const child = active ? children[active.id] : agents[0] ? children[agents[0].id] : undefined;
    return {
        updatedAt: nowIso(),
        profile: child?.profile,
        lane: child?.lane,
        model: child?.model,
        tokens: child?.tokens,
        activeChildId: active?.id,
        child,
        children,
    };
}
