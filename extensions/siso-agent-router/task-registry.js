import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DEFAULT_TASK_ROOT = join(homedir(), ".siso", "agent", "tasks");

function nowIso() {
    return new Date().toISOString();
}
function taskRootDir() {
    return process.env.SISO_TASK_ROOT_DIR ?? DEFAULT_TASK_ROOT;
}
function sanitizePathSegment(value, fallback = "unknown") {
    const text = String(value ?? "").trim();
    const safe = text.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    return safe || fallback;
}
function numericDepth(value) {
    const parsed = Number.parseInt(String(value ?? "0"), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
function numericLimit(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
export function currentParentSessionId(ctx) {
    const fromCtx = ctx && typeof ctx.sessionId === "string" ? ctx.sessionId : undefined;
    return fromCtx ?? process.env.CLAUDE_SESSION_ID ?? process.env.SISO_PARENT_SESSION_ID ?? process.env.PI_SESSION_ID ?? process.env.SISO_SESSION_ID ?? "unknown";
}
export function currentTaskScope(ctx = undefined) {
    const parentSessionId = currentParentSessionId(ctx);
    const rootSessionId = process.env.SISO_ROOT_SESSION_ID ?? parentSessionId;
    const ownerAgentId = process.env.SISO_AGENT_ID ?? parentSessionId;
    const spawnedByTaskId = process.env.SISO_PARENT_TASK_ID;
    return {
        rootSessionId,
        parentSessionId,
        ownerAgentId,
        ...(spawnedByTaskId ? { spawnedByTaskId } : {}),
        depth: numericDepth(process.env.PI_SUBAGENT_DEPTH),
    };
}
export function taskPaths(recordOrId, rootSessionId = undefined) {
    const id = typeof recordOrId === "string" ? recordOrId : recordOrId?.id;
    const root = sanitizePathSegment(rootSessionId ?? recordOrId?.rootSessionId ?? "unknown");
    const taskId = sanitizePathSegment(id, "task");
    const dir = join(taskRootDir(), root, "tasks", taskId);
    return {
        dir,
        taskRecordPath: join(dir, "task.json"),
        transcriptPath: join(dir, "transcript.jsonl"),
        eventsPath: join(dir, "events.jsonl"),
        stdoutPath: join(dir, "stdout.jsonl"),
        stderrPath: join(dir, "stderr.log"),
        exitPath: join(dir, "exit.json"),
        summaryPath: join(dir, "summary.md"),
        handoffPath: join(dir, "handoff.md"),
        artifactsDir: join(dir, "artifacts"),
    };
}
export function attachTaskScope(record, scope = currentTaskScope()) {
    const rootSessionId = record.rootSessionId ?? scope.rootSessionId;
    const parentSessionId = record.parentSessionId ?? scope.parentSessionId;
    const ownerAgentId = record.ownerAgentId ?? scope.ownerAgentId;
    const spawnedByTaskId = record.spawnedByTaskId ?? scope.spawnedByTaskId;
    const depth = record.depth ?? scope.depth ?? 0;
    const fleetId = record.fleetId ?? process.env.SISO_FLEET_ID;
    const paths = taskPaths(record.id, rootSessionId);
    return {
        ...record,
        rootSessionId,
        parentSessionId,
        ownerAgentId,
        ...(spawnedByTaskId ? { spawnedByTaskId } : {}),
        ...(fleetId ? { fleetId } : {}),
        depth,
        taskRecordPath: record.taskRecordPath ?? paths.taskRecordPath,
        handoffPath: record.handoffPath ?? paths.handoffPath,
        taskPaths: {
            ...(record.taskPaths ?? {}),
            dir: paths.dir,
            task: record.taskRecordPath ?? paths.taskRecordPath,
            transcript: record.taskPaths?.transcript ?? paths.transcriptPath,
            events: record.taskPaths?.events ?? paths.eventsPath,
            stdout: record.stdoutPath ?? record.taskPaths?.stdout ?? paths.stdoutPath,
            stderr: record.stderrPath ?? record.taskPaths?.stderr ?? paths.stderrPath,
            exit: record.exitPath ?? record.taskPaths?.exit ?? paths.exitPath,
            summary: record.taskPaths?.summary ?? paths.summaryPath,
            handoff: record.handoffPath ?? paths.handoffPath,
            artifacts: record.taskPaths?.artifacts ?? paths.artifactsDir,
        },
    };
}
export function isRecordVisibleToScope(record, scope = {}) {
    if (!record)
        return false;
    const parentSessionId = scope.parentSessionId && scope.parentSessionId !== "unknown" ? scope.parentSessionId : undefined;
    const ownerAgentId = scope.ownerAgentId && scope.ownerAgentId !== "unknown" ? scope.ownerAgentId : undefined;
    const rootSessionId = scope.rootSessionId && scope.rootSessionId !== "unknown" ? scope.rootSessionId : undefined;
    if (parentSessionId && record.parentSessionId === parentSessionId)
        return true;
    if (ownerAgentId && record.ownerAgentId === ownerAgentId && (!rootSessionId || record.rootSessionId === rootSessionId))
        return true;
    if (scope.includeDescendants && rootSessionId && record.rootSessionId === rootSessionId)
        return true;
    return false;
}
export function sanitizeChildBudget(budget = {}) {
    if (!budget || typeof budget !== "object" || Array.isArray(budget))
        return undefined;
    const sanitized = {};
    const maxParallel = numericLimit(budget.maxParallel);
    const maxChildren = numericLimit(budget.maxChildren);
    if (maxParallel !== undefined)
        sanitized.maxParallel = maxParallel;
    if (maxChildren !== undefined)
        sanitized.maxChildren = maxChildren;
    return Object.keys(sanitized).length ? sanitized : undefined;
}
export function taskBudget(record = {}) {
    return sanitizeChildBudget(record.budget) ?? {};
}
export function taskBudgetState(record = {}, nowMs = Date.now()) {
    const budget = taskBudget(record);
    const startedMs = Date.parse(record.startedAt ?? "");
    const runtimeMs = Number.isFinite(startedMs) ? Math.max(0, nowMs - startedMs) : 0;
    const usage = {
        tokens: Number(record.progress?.tokens ?? record.tokens?.totalTokens ?? 0),
        tools: Number(record.progress?.tools ?? record.toolCalls ?? 0),
        runtimeMs,
    };
    return {
        budget,
        usage,
        exceeded: [],
        exceededAny: false,
        reason: undefined,
    };
}
export function taskRecordFromChild(record) {
    const scoped = attachTaskScope(record);
    const tokens = scoped.tokens ?? { input: 0, output: 0, totalTokens: 0 };
    const metadata = compactTaskMetadata(scoped);
    return {
        id: scoped.id,
        status: scoped.status,
        ...(scoped.name ? { name: scoped.name } : {}),
        ...(scoped.handle ? { handle: scoped.handle } : {}),
        ...(scoped.addressable !== undefined ? { addressable: scoped.addressable } : {}),
        description: scoped.task ?? scoped.compactResult?.summary ?? scoped.id,
        role: scoped.profile,
        model: scoped.model,
        rootSessionId: scoped.rootSessionId,
        parentSessionId: scoped.parentSessionId,
        ownerAgentId: scoped.ownerAgentId,
        ...(scoped.spawnedByTaskId ? { spawnedByTaskId: scoped.spawnedByTaskId } : {}),
        ...(scoped.fleetId ? { fleetId: scoped.fleetId } : {}),
        ...(scoped.allocationId ? { allocationId: scoped.allocationId } : {}),
        ...(scoped.assignmentId ? { assignmentId: scoped.assignmentId } : {}),
        ...(scoped.parentTaskId ? { parentTaskId: scoped.parentTaskId } : {}),
        ...(scoped.stepId ? { stepId: scoped.stepId } : {}),
        ...(scoped.specialistId ? { specialistId: scoped.specialistId } : {}),
        ...(scoped.specialistAlias ? { specialistAlias: scoped.specialistAlias } : {}),
        ...(scoped.domain ? { domain: scoped.domain } : {}),
        ...(Array.isArray(scoped.domains) ? { domains: scoped.domains } : {}),
        ...(scoped.riskTier ? { riskTier: scoped.riskTier } : {}),
        ...(scoped.ownershipBoundary ? { ownershipBoundary: scoped.ownershipBoundary } : {}),
        ...(scoped.verificationContract ? { verificationContract: scoped.verificationContract } : {}),
        ...(Object.keys(metadata).length ? { metadata } : {}),
        depth: scoped.depth ?? 0,
        startedAt: scoped.startedAt,
        updatedAt: scoped.updatedAt ?? nowIso(),
        ...(scoped.completedAt ? { completedAt: scoped.completedAt } : {}),
        ...(scoped.queuedAt ? { queuedAt: scoped.queuedAt } : {}),
        ...(scoped.queuedReason ? { queuedReason: scoped.queuedReason } : {}),
        ...(scoped.queuedSpawn ? { queuedSpawn: scoped.queuedSpawn } : {}),
        paths: {
            task: scoped.taskRecordPath,
            transcript: scoped.taskPaths?.transcript,
            events: scoped.taskPaths?.events,
            stdout: scoped.stdoutPath ?? scoped.taskPaths?.stdout,
            stderr: scoped.stderrPath ?? scoped.taskPaths?.stderr,
            exit: scoped.exitPath ?? scoped.taskPaths?.exit,
            summary: scoped.taskPaths?.summary,
            handoff: scoped.handoffPath,
            artifacts: scoped.taskPaths?.artifacts,
        },
        progress: {
            tokens: Number(tokens.totalTokens ?? 0),
            inputTokens: Number(tokens.input ?? 0),
            outputTokens: Number(tokens.output ?? 0),
            tools: Number(scoped.toolCalls ?? 0),
            summary: scoped.compactResult?.summary,
            ...(scoped.progress?.stdoutOffset !== undefined ? { stdoutOffset: scoped.progress.stdoutOffset } : {}),
            ...(scoped.progress?.lastTool ? { lastTool: scoped.progress.lastTool } : {}),
        },
        result: scoped.finalOutput || scoped.compactResult?.summary ? {
            summary: scoped.compactResult?.summary ?? scoped.finalOutput,
            final: scoped.finalOutput ?? scoped.compactResult?.summary ?? "",
            ...(scoped.compactResult?.files ? { files: scoped.compactResult.files } : {}),
        } : undefined,
        ...(scoped.error ? { error: scoped.error } : {}),
        notification: {
            deliveredAt: scoped.parentNotifiedAt ?? scoped.parentNotification?.deliveredAt,
        },
        budget: taskBudget(scoped),
        legacyChildRunPath: scoped.runRecordPath,
    };
}
function compactTaskMetadata(record = {}) {
    return {
        ...(record.kind ? { kind: record.kind } : {}),
        ...(record.workflowMode ? { workflowMode: record.workflowMode } : {}),
        ...(record.parentTaskId ? { parentTaskId: record.parentTaskId } : {}),
        ...(record.allocationId ? { allocationId: record.allocationId } : {}),
        ...(record.assignmentId ? { assignmentId: record.assignmentId } : {}),
        ...(record.stepId ? { stepId: record.stepId } : {}),
        ...(record.specialistId ? { specialistId: record.specialistId } : {}),
        ...(record.specialistAlias ? { specialistAlias: record.specialistAlias } : {}),
        ...(record.domain ? { domain: record.domain } : {}),
        ...(Array.isArray(record.domains) ? { domains: record.domains } : {}),
        ...(record.domainRatings ? { domainRatings: record.domainRatings } : {}),
        ...(record.riskTier ? { riskTier: record.riskTier } : {}),
        ...(record.ownershipBoundary ? { ownershipBoundary: record.ownershipBoundary } : {}),
        ...(record.contextTier ? { contextTier: record.contextTier } : {}),
        ...(record.permissionProfile ? { permissionProfile: record.permissionProfile } : {}),
        ...(record.executionProfile ? { executionProfile: record.executionProfile } : {}),
        ...(record.specialistScore !== undefined ? { specialistScore: record.specialistScore } : {}),
        ...(Array.isArray(record.verification) ? { verification: record.verification } : {}),
        ...(Array.isArray(record.requiredChecks) ? { requiredChecks: record.requiredChecks } : {}),
        ...(Array.isArray(record.acceptanceCriteria) ? { acceptanceCriteria: record.acceptanceCriteria } : {}),
        ...(record.stageIndex !== undefined ? { stageIndex: record.stageIndex } : {}),
        ...(record.workerIndex !== undefined ? { workerIndex: record.workerIndex } : {}),
        ...(record.agent ? { agent: record.agent } : {}),
        ...(record.verifierId ? { verifierId: record.verifierId } : {}),
        ...(record.verifierVerdict ? { verifierVerdict: record.verifierVerdict } : {}),
        ...(record.feedbackIteration !== undefined ? { feedbackIteration: record.feedbackIteration } : {}),
        ...(record.verificationContract ? { verificationContract: record.verificationContract } : {}),
    };
}
function atomicWriteJson(path, value) {
    mkdirSync(dirname(path), { recursive: true });
    const tempPath = `${path}.${process.pid}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
    renameSync(tempPath, path);
}
function handoffMarkdown(record, taskRecord) {
    const status = record.status ?? "unknown";
    const summary = record.error ?? record.compactResult?.summary ?? record.result?.summary ?? record.finalOutput ?? "No summary captured.";
    const final = record.finalOutput ?? record.result?.final ?? record.error ?? summary;
    const tokens = record.tokens?.totalTokens ?? record.progress?.tokens ?? 0;
    const tools = record.toolCalls ?? record.progress?.tools ?? 0;
    return [
        "# SISO Child Task Handoff",
        "",
        `Status: ${status}`,
        `Task: ${taskRecord.description}`,
        `Agent: ${record.profile ?? record.role ?? "unknown"}`,
        `Model: ${record.model ?? "unknown"}`,
        `Started: ${record.startedAt ?? "unknown"}`,
        record.completedAt ? `Completed: ${record.completedAt}` : undefined,
        "",
        "## Summary",
        "",
        summary,
        "",
        "## Result",
        "",
        final,
        "",
        "## Usage",
        "",
        `Tokens: ${tokens}`,
        `Tools: ${tools}`,
        "",
        "## Paths",
        "",
        `Task record: ${taskRecord.paths.task}`,
        taskRecord.paths.events ? `Events: ${taskRecord.paths.events}` : undefined,
        taskRecord.paths.stdout ? `Stdout: ${taskRecord.paths.stdout}` : undefined,
        taskRecord.paths.stderr ? `Stderr: ${taskRecord.paths.stderr}` : undefined,
        record.runRecordPath ?? record.legacyChildRunPath ? `Legacy child run: ${record.runRecordPath ?? record.legacyChildRunPath}` : undefined,
        "",
    ].filter((line) => line !== undefined).join("\n");
}
function isTerminalTaskStatus(status) {
    return status === "completed" || status === "failed" || status === "timeout" || status === "aborted" || status === "unsupported" || status === "cancelled";
}
function writeScopedTaskArtifacts(scoped, taskRecord) {
    if (taskRecord.paths?.summary) {
        mkdirSync(dirname(taskRecord.paths.summary), { recursive: true });
        writeFileSync(taskRecord.paths.summary, `${taskRecord.error ?? taskRecord.progress?.summary ?? taskRecord.result?.summary ?? taskRecord.description}\n`);
    }
    if (isTerminalTaskStatus(scoped.status) && taskRecord.paths?.handoff) {
        mkdirSync(dirname(taskRecord.paths.handoff), { recursive: true });
        writeFileSync(taskRecord.paths.handoff, handoffMarkdown(scoped, taskRecord));
    }
}
function transcriptEvent(scoped, taskRecord) {
    return {
        type: "task_update",
        taskId: taskRecord.id,
        status: taskRecord.status,
        at: taskRecord.updatedAt ?? nowIso(),
        rootSessionId: taskRecord.rootSessionId,
        parentSessionId: taskRecord.parentSessionId,
        ownerAgentId: taskRecord.ownerAgentId,
        ...(taskRecord.fleetId ? { fleetId: taskRecord.fleetId } : {}),
        ...(taskRecord.allocationId ? { allocationId: taskRecord.allocationId } : {}),
        ...(taskRecord.assignmentId ? { assignmentId: taskRecord.assignmentId } : {}),
        ...(taskRecord.parentTaskId ? { parentTaskId: taskRecord.parentTaskId } : {}),
        ...(taskRecord.stepId ? { stepId: taskRecord.stepId } : {}),
        ...(taskRecord.specialistId ? { specialistId: taskRecord.specialistId } : {}),
        ...(taskRecord.domain ? { domain: taskRecord.domain } : {}),
        description: taskRecord.description,
        role: taskRecord.role,
        model: taskRecord.model,
        progress: {
            tokens: taskRecord.progress?.tokens ?? 0,
            inputTokens: taskRecord.progress?.inputTokens ?? 0,
            outputTokens: taskRecord.progress?.outputTokens ?? 0,
            tools: taskRecord.progress?.tools ?? 0,
            ...(taskRecord.progress?.lastTool ? { lastTool: taskRecord.progress.lastTool } : {}),
        },
        ...(taskRecord.queuedAt ? { queuedAt: taskRecord.queuedAt } : {}),
        ...(taskRecord.queuedReason ? { queuedReason: taskRecord.queuedReason } : {}),
        ...(taskRecord.result?.summary ? { summary: taskRecord.result.summary } : {}),
        ...(scoped.error ? { error: scoped.error } : {}),
    };
}
function appendTranscriptEvent(scoped, taskRecord) {
    const path = scoped.taskPaths?.transcript ?? taskRecord.paths?.transcript;
    if (!path)
        return;
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(transcriptEvent(scoped, taskRecord))}\n`);
}
function eventIdentity(event) {
    return [
        event.timestamp,
        event.type,
        event.runId,
        event.surface,
        event.toolName,
        event.toolCallId,
        event.status,
        event.totalTokens,
    ].filter((value) => value !== undefined).join("|");
}
function existingEventKeys(path) {
    try {
        return new Set(readFileSync(path, "utf8")
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => {
            try {
                return eventIdentity(JSON.parse(line));
            }
            catch {
                return undefined;
            }
        })
            .filter(Boolean));
    }
    catch {
        return new Set();
    }
}
function appendAgentEvents(scoped, taskRecord) {
    const events = Array.isArray(scoped.events) ? scoped.events.filter((event) => event && typeof event === "object") : [];
    const path = scoped.taskPaths?.events ?? taskRecord.paths?.events;
    if (!path || events.length === 0)
        return;
    mkdirSync(dirname(path), { recursive: true });
    const seen = existingEventKeys(path);
    const lines = [];
    for (const event of events) {
        const normalized = {
            ...event,
            taskId: taskRecord.id,
            rootSessionId: taskRecord.rootSessionId,
            parentSessionId: taskRecord.parentSessionId,
            ownerAgentId: taskRecord.ownerAgentId,
            ...(taskRecord.fleetId ? { fleetId: taskRecord.fleetId } : {}),
        };
        const key = eventIdentity(normalized);
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        lines.push(JSON.stringify(normalized));
    }
    if (lines.length > 0)
        appendFileSync(path, `${lines.join("\n")}\n`);
}
export function writeScopedTaskRecord(record) {
    if (!record?.id)
        return record;
    const scoped = attachTaskScope(record);
    const taskRecord = taskRecordFromChild(scoped);
    atomicWriteJson(scoped.taskRecordPath, taskRecord);
    appendTranscriptEvent(scoped, taskRecord);
    appendAgentEvents(scoped, taskRecord);
    writeScopedTaskArtifacts(scoped, taskRecord);
    return scoped;
}
function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch {
        return undefined;
    }
}
export function listScopedTaskRecords(scope = currentTaskScope(), options = {}) {
    const root = sanitizePathSegment(scope.rootSessionId ?? scope.parentSessionId ?? "unknown");
    const tasksDir = join(taskRootDir(), root, "tasks");
    let records = [];
    try {
        records = readdirSync(tasksDir)
            .map((name) => join(tasksDir, name, "task.json"))
            .filter((path) => existsSync(path))
            .map((path) => readJson(path))
            .filter(Boolean);
    }
    catch {
        return [];
    }
    records = records.filter((record) => isRecordVisibleToScope(record, scope));
    records.sort((a, b) => {
        const bMs = statTimeMs(b.paths?.task) ?? Date.parse(b.updatedAt ?? b.startedAt ?? "0") ?? 0;
        const aMs = statTimeMs(a.paths?.task) ?? Date.parse(a.updatedAt ?? a.startedAt ?? "0") ?? 0;
        return bMs - aMs;
    });
    const limit = Number.isFinite(options.limit) ? options.limit : 20;
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
export function readScopedTaskRecord(id, scope = currentTaskScope()) {
    const root = sanitizePathSegment(scope.rootSessionId ?? scope.parentSessionId ?? "unknown");
    const record = readJson(taskPaths(id, root).taskRecordPath);
    return isRecordVisibleToScope(record, scope) ? record : undefined;
}
export function findScopedTaskRecord(query, scope = currentTaskScope()) {
    const value = String(query ?? "").trim();
    if (!value)
        return undefined;
    return listScopedTaskRecords(scope, { limit: 200 }).find((record) => record.id === value || record.name === value || record.handle === value);
}
export function updateScopedTaskRecord(id, patch, scope = currentTaskScope()) {
    const record = readScopedTaskRecord(id, scope);
    if (!record)
        return undefined;
    const next = {
        ...record,
        ...patch,
        updatedAt: nowIso(),
    };
    atomicWriteJson(record.paths.task, next);
    appendTranscriptEvent(next, next);
    appendAgentEvents(next, next);
    writeScopedTaskArtifacts(next, next);
    return next;
}
export function summarizeTaskFleet(records) {
    const totals = records.reduce((acc, record) => {
        if (record.status === "running" || record.status === "background" || record.status === "starting")
            acc.running++;
        else if (record.status === "queued")
            acc.queued++;
        else if (record.status === "completed")
            acc.completed++;
        else if (record.status === "failed" || record.status === "timeout" || record.status === "aborted" || record.status === "cancelled")
            acc.failed++;
        acc.tokens += Number(record.progress?.tokens ?? 0);
        acc.tools += Number(record.progress?.tools ?? 0);
        if (record.fleetId)
            acc.fleets.add(record.fleetId);
        return acc;
    }, { running: 0, queued: 0, completed: 0, failed: 0, tokens: 0, tools: 0, fleets: new Set() });
    return {
        total: records.length,
        running: totals.running,
        queued: totals.queued,
        completed: totals.completed,
        failed: totals.failed,
        tokens: totals.tokens,
        tools: totals.tools,
        fleets: [...totals.fleets],
    };
}
export function isActiveTaskRecord(record) {
    return record?.status === "background" || record?.status === "running" || record?.status === "starting";
}
export function isQueuedTaskRecord(record) {
    return record?.status === "queued";
}
