import { spawn as spawnProcess, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { chooseRoute } from "./route-policy.js";
import { formatContextPacket, loadContextPacket } from "./context-loader.js";
import { loadCodexCasePacket } from "./codex-case-packet.js";
import { rolePrompt } from "./agent-prompts.js";
import { createAgentEvent } from "./agent-events.js";
const PI_BUILTIN_TOOLS = new Set(["read", "bash", "edit", "write", "find", "ls"]);
const PI_MUTATING_TOOLS = new Set(["edit", "write"]);
const DEFAULT_PROVIDER = "bifrost-anthropic";
const DEFAULT_TIMEOUT_MS = 60_000;
const OUTPUT_LIMIT = 24_000;
const CHILD_OUTPUT_LIMIT = 1_600;
const CHILD_ERROR_LIMIT = 4_000;
const KILL_GRACE_MS = 3_000;
const FORCE_FINISH_MS = 8_000;
const CHILD_RUN_DIR = join(homedir(), ".siso", "agent", "child-runs");
const SYSTEMDB_PATH = join(homedir(), "SISO_Workspace", ".SystemDB", "sisosystem.db");
const BACKGROUND_SUPERVISOR_SCRIPT = `
const { spawn } = require("node:child_process");
const { closeSync, mkdirSync, openSync, writeFileSync } = require("node:fs");
const { dirname } = require("node:path");
const cfg = JSON.parse(process.argv[1]);
mkdirSync(dirname(cfg.stdoutPath), { recursive: true });
const stdoutFd = openSync(cfg.stdoutPath, "a");
const stderrFd = openSync(cfg.stderrPath, "a");
const child = spawn(cfg.command, cfg.args, { cwd: cfg.cwd, env: process.env, detached: true, stdio: ["ignore", stdoutFd, stderrFd] });
closeSync(stdoutFd);
closeSync(stderrFd);
child.on("error", (error) => {
  writeFileSync(cfg.exitPath, JSON.stringify({ exitCode: 1, signal: null, error: error.message, completedAt: new Date().toISOString() }) + "\\n");
});
child.on("close", (exitCode, signal) => {
  writeFileSync(cfg.exitPath, JSON.stringify({ exitCode, signal, completedAt: new Date().toISOString() }) + "\\n");
});
`;
function nowIso() {
    return new Date().toISOString();
}
function childId() {
    return `siso-child-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function appendLimited(current, chunk) {
    const next = current + chunk;
    return next.length <= OUTPUT_LIMIT ? next : next.slice(next.length - OUTPUT_LIMIT);
}
function defaultCodexCommand() {
    const home = process.env.HOME;
    const candidate = home ? `${home}/.npm-global/bin/codex` : "";
    return candidate && existsSync(candidate) ? candidate : "codex";
}
function defaultPiCodexCommand() {
    const home = process.env.HOME;
    const candidate = home ? `${home}/bin/pi-codex` : "";
    return candidate && existsSync(candidate) ? candidate : "pi-codex";
}
function resolveSpawnCwd(cwd) {
    return cwd && existsSync(cwd) ? cwd : process.cwd();
}
function defaultCodexHome() {
    const home = process.env.HOME;
    if (!home)
        return undefined;
    const candidate = `${home}/.codex-siso-child`;
    return existsSync(`${candidate}/auth.json`) ? candidate : undefined;
}
function defaultNodeCommand() {
    return process.env.SISO_NODE_COMMAND ?? "node";
}
function spawnEnv(spec, options) {
    const codexHome = options.codexHome ?? process.env.SISO_CODEX_HOME ?? defaultCodexHome();
    const depth = subagentDepth() + 1;
    const maxDepth = options.maxDepth ?? subagentMaxDepth();
    return {
        ...process.env,
        ...(spec.adapter === "codex-cli" && codexHome ? { CODEX_HOME: codexHome } : {}),
        PI_SUBAGENT_CHILD: "1",
        PI_SUBAGENT_DEPTH: String(depth),
        PI_SUBAGENT_MAX_DEPTH: String(maxDepth),
        SISO_SPAWN_CHILD: "1",
        PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR ?? `${process.env.HOME ?? ""}/.siso/agent/profile`,
        PI_OFFLINE: process.env.PI_OFFLINE ?? "1",
        PI_TELEMETRY: process.env.PI_TELEMETRY ?? "0",
    };
}
function subagentDepth() {
    const value = Number.parseInt(process.env.PI_SUBAGENT_DEPTH ?? "0", 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}
function subagentMaxDepth() {
    const value = Number.parseInt(process.env.PI_SUBAGENT_MAX_DEPTH ?? "1", 10);
    return Number.isFinite(value) && value >= 0 ? value : 1;
}
function depthBlocked(options) {
    const depth = subagentDepth();
    const maxDepth = options.maxDepth ?? subagentMaxDepth();
    return depth >= maxDepth
        ? `Nested SISO spawn blocked at depth=${depth} max_depth=${maxDepth}. Parent agent must coordinate child work.`
        : undefined;
}
function parentSessionId() {
    return process.env.CLAUDE_SESSION_ID ?? process.env.SISO_PARENT_SESSION_ID ?? process.env.PI_SESSION_ID ?? process.env.SISO_SESSION_ID ?? "unknown";
}
function childRunDir() {
    return process.env.SISO_CHILD_RUN_DIR ?? CHILD_RUN_DIR;
}
function childRunPaths(id) {
    const dir = childRunDir();
    return {
        dir,
        runRecordPath: join(dir, `${id}.json`),
        stdoutPath: join(dir, `${id}.stdout.jsonl`),
        stderrPath: join(dir, `${id}.stderr.log`),
        exitPath: join(dir, `${id}.exit.json`),
    };
}
function writeChildRunRecord(record) {
    mkdirSync(dirname(record.runRecordPath), { recursive: true });
    const tempPath = `${record.runRecordPath}.${process.pid}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(record, null, 2)}\n`);
    renameSync(tempPath, record.runRecordPath);
}
function writeChildRunLogs(paths, stdout, stderr) {
    mkdirSync(paths.dir, { recursive: true });
    writeFileSync(paths.stdoutPath, stdout);
    writeFileSync(paths.stderrPath, stderr);
}
function readTextFile(path) {
    try {
        return readFileSync(path, "utf8");
    }
    catch {
        return "";
    }
}
function systemDbTelemetryEnabled() {
    return process.env.SISO_SYSTEMDB_TELEMETRY === "1";
}
function systemDbPath() {
    return process.env.SISO_SYSTEMDB_PATH ?? SYSTEMDB_PATH;
}
function sqlLiteral(value) {
    if (value === undefined || value === null)
        return "NULL";
    return `'${String(value).replace(/'/g, "''")}'`;
}
function emitSystemDbTelemetry(event, payload) {
    if (!systemDbTelemetryEnabled())
        return;
    const dbPath = systemDbPath();
    if (!existsSync(dbPath))
        return;
    const fullPayload = {
        source: "pi-harness-lab",
        event,
        ...payload,
    };
    const summary = event === "SISO_CHILD_START"
        ? `SISO child start: ${payload.id ?? "unknown"} ${payload.profile ?? "unknown"}`
        : `SISO child stop: ${payload.id ?? "unknown"} status=${payload.status ?? "unknown"}`;
    const sessionId = process.env.CLAUDE_SESSION_ID ?? process.env.SISO_PARENT_SESSION_ID ?? "siso-router";
    const sql = `
    INSERT INTO observability_events (
      source_app, session_id, hook_event_type, payload, summary, timestamp,
      model_name, agent_id, agent_type, error
    )
    SELECT
      'pi-harness-lab',
      ${sqlLiteral(sessionId)},
      ${sqlLiteral(event)},
      ${sqlLiteral(JSON.stringify(fullPayload))},
      ${sqlLiteral(summary)},
      ${Date.now()},
      ${sqlLiteral(payload.model)},
      ${sqlLiteral(payload.id)},
      ${sqlLiteral(payload.profile)},
      ${sqlLiteral(payload.error)}
    WHERE EXISTS (
      SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'observability_events'
    );
  `;
    spawnSync("/usr/bin/sqlite3", [dbPath], {
        input: sql,
        encoding: "utf8",
        timeout: 2_000,
        stdio: ["pipe", "ignore", "ignore"],
    });
}
function isPidAlive(pid) {
    if (!pid)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function signalChildTree(pid, signal) {
    if (!pid)
        return;
    try {
        process.kill(-pid, signal);
    }
    catch {
        try {
            process.kill(pid, signal);
        }
        catch {
            return;
        }
    }
}
function parseChildOutput(text) {
    const state = { finalOutput: "", tokens: { input: 0, output: 0, totalTokens: 0 }, toolCalls: 0 };
    for (const line of text.split(/\r?\n/))
        parseJsonEventLine(line, state);
    return state;
}
function recordFromResult(result, paths, startedAt = nowIso()) {
    return {
        id: result.id,
        status: result.status,
        adapter: result.adapter,
        profile: result.decision.profile,
        lane: result.decision.lane,
        model: result.decision.model,
        cwd: result.cwd,
        pid: result.pid,
        exitCode: result.exitCode,
        signal: result.signal,
        startedAt,
        updatedAt: nowIso(),
        ...(result.status !== "background" && result.status !== "running" && result.status !== "starting" ? { completedAt: nowIso() } : {}),
        parentSessionId: parentSessionId(),
        stdoutPath: paths.stdoutPath,
        stderrPath: paths.stderrPath,
        exitPath: paths.exitPath,
        runRecordPath: paths.runRecordPath,
        tokens: result.tokens,
        toolCalls: result.toolCalls,
        compactResult: result.compactResult,
        rawOutputChars: result.rawOutputChars,
        truncatedOutputChars: result.truncatedOutputChars,
        ...(result.error ? { error: result.error } : {}),
        ...(result.status !== "background" && result.status !== "running" && result.status !== "starting" ? { notified: result.notified ?? false } : {}),
        ...(result.events ? { events: result.events } : {}),
    };
}
function markTerminalNotified(record) {
    if (!isTerminalChildStatus(record.status) || record.notified)
        return record;
    const next = { ...record, notified: true, updatedAt: nowIso() };
    writeChildRunRecord(next);
    return next;
}
export function readChildRunRecord(id) {
    const path = childRunPaths(id).runRecordPath;
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch {
        return undefined;
    }
}
export function collectChildRunRecord(id) {
    const current = readChildRunRecord(id);
    if (!current)
        return undefined;
    if (current.status !== "background")
        return isTerminalChildStatus(current.status) ? markTerminalNotified(current) : current;
    const exitState = readExitState(current.exitPath);
    if (!exitState && isPidAlive(current.pid))
        return current;
    const parsed = parseChildOutput(readTextFile(current.stdoutPath));
    const stderr = readTextFile(current.stderrPath);
    const output = truncateForParent(parsed.finalOutput);
    const missingExitState = !exitState && !isPidAlive(current.pid);
    const hasCapturedChildResult = Boolean(parsed.finalOutput.trim()) || parsed.tokens.totalTokens > 0 || parsed.toolCalls > 0;
    const supervisorOnly = !hasCapturedChildResult && !stderr.trim() && current.compactResult.summary.startsWith("background child supervisor started");
    const compactResult = compactChildResult(parsed.finalOutput || stderr || exitState?.error || (supervisorOnly ? "Background child exited without captured output." : current.compactResult.summary));
    const exitCode = exitState?.exitCode ?? (missingExitState ? 1 : undefined);
    const closeSignal = exitState?.signal ?? undefined;
    const completed = exitCode === 0 && !exitState?.error && !supervisorOnly;
    const error = supervisorOnly ? "Background child exited without captured output." : exitState?.error || stderr || "Background child exited without an exit marker.";
    const next = {
        ...current,
        status: completed ? "completed" : "failed",
        updatedAt: nowIso(),
        completedAt: exitState?.completedAt ?? nowIso(),
        exitCode,
        signal: closeSignal,
        tokens: parsed.tokens,
        toolCalls: parsed.toolCalls,
        compactResult,
        rawOutputChars: output.originalChars,
        truncatedOutputChars: output.truncatedChars,
        ...(completed ? {} : { error: truncateForParent(error, CHILD_ERROR_LIMIT).text }),
        notified: true,
    };
    writeChildRunRecord(next);
    emitSystemDbTelemetry("SISO_CHILD_STOP", {
        id: next.id,
        status: next.status,
        adapter: next.adapter,
        profile: next.profile,
        lane: next.lane,
        model: next.model,
        cwd: next.cwd,
        pid: next.pid,
        exitCode: next.exitCode,
        signal: next.signal,
        tokens: next.tokens,
        toolCalls: next.toolCalls,
        startedAt: next.startedAt,
        completedAt: next.completedAt,
        durationMs: Date.parse(next.completedAt ?? next.updatedAt) - Date.parse(next.startedAt),
        error: next.error,
        runRecordPath: next.runRecordPath,
    });
    return next;
}
function readExitState(path) {
    if (!path)
        return undefined;
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch {
        return undefined;
    }
}
export function collectLatestChildRunRecords(limit = 5) {
    const dir = childRunDir();
    try {
        return readdirSync(dir)
            .filter((name) => name.endsWith(".json") && !name.endsWith(".exit.json"))
            .map((name) => join(dir, name))
            .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
            .slice(0, limit)
            .map((path) => collectChildRunRecord(path.slice(path.lastIndexOf("/") + 1, -".json".length)))
            .filter((record) => Boolean(record));
    }
    catch {
        return [];
    }
}
function recordLine(record) {
    const alive = isPidAlive(record.pid);
    const tokens = record.tokens ?? { input: 0, output: 0, totalTokens: 0 };
    const result = record.compactResult ?? { summary: "none", findings: [], files: [], next_action: "none" };
    return [
        `child_id=${record.id}`,
        `status=${record.status}`,
        `pid=${record.pid ?? "none"}`,
        `pid_alive=${alive}`,
        `profile=${record.profile ?? "unknown"}`,
        `lane=${record.lane ?? "unknown"}`,
        `model=${record.model ?? "unknown"}`,
        `tokens_estimated=${tokens.totalTokens ?? 0}`,
        `tool_calls=${record.toolCalls ?? 0}`,
        `notified=${record.notified === true}`,
        `summary=${JSON.stringify(result.summary)}`,
        `next_action=${JSON.stringify(result.next_action)}`,
    ].join(" ");
}
function compactRecordLine(record) {
    const tokens = record.tokens ?? { input: 0, output: 0, totalTokens: 0 };
    return [
        `child_id=${record.id}`,
        `status=${record.status}`,
        `tokens_estimated=${tokens.totalTokens ?? 0}`,
        `tool_calls=${record.toolCalls ?? 0}`,
        `notified=${record.notified === true}`,
    ].join(" ");
}
export async function controlChildRun(input) {
    const action = input.action;
    if (action === "list") {
        const records = collectLatestChildRunRecords(input.limit ?? 10);
        return {
            action,
            records,
            text: records.length ? records.map(compactRecordLine).join("\n") : "No child run records found.",
        };
    }
    if (!input.id) {
        return { action, records: [], text: `id is required for action=${action}` };
    }
    const record = collectChildRunRecord(input.id);
    if (!record) {
        return { action, records: [], text: `child not found: ${input.id}` };
    }
    if (action === "status") {
        return { action, records: [record], text: recordLine(record) };
    }
    if (action === "logs") {
        const stdout = truncateForParent(readTextFile(record.stdoutPath), 4_000).text;
        const stderr = truncateForParent(readTextFile(record.stderrPath), 2_000).text;
        return {
            action,
            records: [record],
            text: [
                recordLine(record),
                `stdout_preview=${JSON.stringify(stdout)}`,
                `stderr_preview=${JSON.stringify(stderr)}`,
            ].join("\n"),
        };
    }
    if (action === "interrupt") {
        if (!isPidAlive(record.pid)) {
            return {
                action,
                records: [record],
                text: `${recordLine(record)}\ninterrupt=noop reason=pid_not_alive`,
            };
        }
        const signal = input.signal ?? "SIGTERM";
        signalChildTree(record.pid, signal);
        const next = {
            ...record,
            status: "aborted",
            signal,
            updatedAt: nowIso(),
            completedAt: nowIso(),
            notified: true,
            error: `Interrupted with ${signal}`,
        };
        writeChildRunRecord(next);
        emitSystemDbTelemetry("SISO_CHILD_STOP", {
            id: next.id,
            status: next.status,
            adapter: next.adapter,
            profile: next.profile,
            lane: next.lane,
            model: next.model,
            cwd: next.cwd,
            pid: next.pid,
            signal: next.signal,
            startedAt: next.startedAt,
            completedAt: next.completedAt,
            error: next.error,
            runRecordPath: next.runRecordPath,
        });
        return {
            action,
            records: [next],
            text: `${recordLine(next)}\ninterrupt=sent signal=${signal}`,
        };
    }
    if (action === "resume") {
        const message = input.message?.trim();
        if (!message) {
            return { action, records: [record], text: "action=resume requires message" };
        }
        if ((record.status === "background" || record.status === "running" || record.status === "starting") && isPidAlive(record.pid)) {
            return {
                action,
                records: [record],
                text: `${recordLine(record)}\nresume=noop reason=child_still_running`,
            };
        }
        const prompt = [
            "You are resuming a previous SISO child run.",
            "",
            `Previous child id: ${record.id}`,
            `Previous status: ${record.status}`,
            `Previous profile: ${record.profile}`,
            `Previous model: ${record.model}`,
            `Previous compact result: ${JSON.stringify(record.compactResult)}`,
            `Previous stdout path: ${record.stdoutPath}`,
            `Previous stderr path: ${record.stderrPath}`,
            "",
            "Follow-up:",
            message,
        ].join("\n");
        const result = await runProfileSpawn(prompt, {
            cwd: record.cwd,
            background: input.background ?? true,
            ...(typeof input.timeoutMs === "number" ? { timeoutMs: input.timeoutMs } : {}),
            ...(input.spawnOptions ?? {}),
        });
        const next = collectChildRunRecord(result.id);
        return {
            action,
            records: [record, ...(next ? [next] : [])],
            text: [
                `resumed_child_id=${result.id}`,
                `parent_child_id=${record.id}`,
                `resume_status=${result.status}`,
                `resume_record=${result.runRecordPath ?? "none"}`,
                `resume_result=${JSON.stringify(result.compactResult)}`,
            ].join("\n"),
        };
    }
    return { action, records: [record], text: `unsupported action=${action}` };
}
export function cleanupChildRunLogs(options = {}) {
    const dir = childRunDir();
    const now = Date.now();
    const maxAgeHours = options.maxAgeHours ?? 24;
    const maxRuns = options.maxRuns ?? 50;
    const dryRun = options.dryRun ?? false;
    let records;
    try {
        records = readdirSync(dir)
            .filter((name) => name.endsWith(".json"))
            .map((name) => {
            try {
                return JSON.parse(readFileSync(join(dir, name), "utf8"));
            }
            catch {
                return undefined;
            }
        })
            .filter((record) => Boolean(record))
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    }
    catch {
        return { scannedRuns: 0, removedFiles: [], removedBytes: 0, dryRun };
    }
    const keepIds = new Set(records.slice(0, maxRuns).map((record) => record.id));
    const removedFiles = [];
    let removedBytes = 0;
    for (const record of records) {
        const ageHours = (now - Date.parse(record.updatedAt)) / 3_600_000;
        const shouldPrune = ageHours > maxAgeHours || !keepIds.has(record.id);
        if (!shouldPrune || record.status === "background" || record.status === "running" || record.status === "starting")
            continue;
        for (const path of [record.stdoutPath, record.stderrPath]) {
            try {
                const stats = statSync(path);
                if (stats.size === 0)
                    continue;
                removedBytes += stats.size;
                removedFiles.push(path);
                if (!dryRun)
                    unlinkSync(path);
            }
            catch {
                continue;
            }
        }
    }
    return { scannedRuns: records.length, removedFiles, removedBytes, dryRun };
}
export function getChildRunStorageStats() {
    const dir = childRunDir();
    let records = [];
    try {
        records = readdirSync(dir)
            .filter((name) => name.endsWith(".json"))
            .map((name) => {
            try {
                return JSON.parse(readFileSync(join(dir, name), "utf8"));
            }
            catch {
                return undefined;
            }
        })
            .filter((record) => Boolean(record));
    }
    catch {
        return {
            runs: 0,
            activeRuns: 0,
            completedRuns: 0,
            failedRuns: 0,
            recordBytes: 0,
            stdoutBytes: 0,
            stderrBytes: 0,
            totalBytes: 0,
            estimatedDailyGrowthBytes: 0,
        };
    }
    const sizes = { recordBytes: 0, stdoutBytes: 0, stderrBytes: 0 };
    for (const record of records) {
        sizes.recordBytes += fileSize(record.runRecordPath);
        sizes.stdoutBytes += fileSize(record.stdoutPath);
        sizes.stderrBytes += fileSize(record.stderrPath);
    }
    const timestamps = records
        .map((record) => Date.parse(record.updatedAt))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);
    const totalBytes = sizes.recordBytes + sizes.stdoutBytes + sizes.stderrBytes;
    const spanDays = timestamps.length > 1 ? Math.max((timestamps.at(-1) - timestamps[0]) / 86_400_000, 1 / 24) : 1;
    return {
        runs: records.length,
        activeRuns: records.filter((record) => record.status === "background" || record.status === "running" || record.status === "starting").length,
        completedRuns: records.filter((record) => record.status === "completed").length,
        failedRuns: records.filter((record) => record.status === "failed" || record.status === "timeout" || record.status === "aborted").length,
        recordBytes: sizes.recordBytes,
        stdoutBytes: sizes.stdoutBytes,
        stderrBytes: sizes.stderrBytes,
        totalBytes,
        ...(timestamps[0] ? { oldestUpdatedAt: new Date(timestamps[0]).toISOString() } : {}),
        ...(timestamps.at(-1) ? { newestUpdatedAt: new Date(timestamps.at(-1)).toISOString() } : {}),
        estimatedDailyGrowthBytes: Math.round(totalBytes / spanDays),
    };
}
function fileSize(path) {
    try {
        return statSync(path).size;
    }
    catch {
        return 0;
    }
}
export function truncateForParent(text, limit = CHILD_OUTPUT_LIMIT) {
    if (text.length <= limit)
        return { text, originalChars: text.length, truncatedChars: 0 };
    const head = Math.floor(limit * 0.7);
    const tail = limit - head;
    const omitted = text.length - limit;
    return {
        text: `${text.slice(0, head)}\n\n[... truncated ${omitted} chars ...]\n\n${text.slice(text.length - tail)}`,
        originalChars: text.length,
        truncatedChars: omitted,
    };
}
function truncateField(text, limit) {
    const trimmed = text.trim();
    return trimmed.length <= limit ? trimmed : `${trimmed.slice(0, limit - 3)}...`;
}
function compactStringArray(value, limit, itemLimit) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((item) => typeof item === "string")
        .map((item) => truncateField(item, itemLimit))
        .filter(Boolean)
        .slice(0, limit);
}
function jsonObjectFrom(text) {
    const trimmed = text.trim();
    if (!trimmed)
        return undefined;
    for (const candidate of [trimmed, trimmed.match(/\{[\s\S]*\}/)?.[0]]) {
        if (!candidate)
            continue;
        try {
            const value = JSON.parse(candidate);
            if (value && typeof value === "object" && !Array.isArray(value))
                return value;
        }
        catch {
            continue;
        }
    }
    return undefined;
}
function extractFiles(text) {
    const matches = [
        ...text.matchAll(/\]\((\/Users\/[^):\s]+)(?::\d+)?\)/g),
        ...text.matchAll(/(?:^|\s)(\/Users\/[^\s):]+)(?::\d+)?/g),
    ];
    return [...new Set(matches.map((match) => match[1]).filter(Boolean))].slice(0, 8);
}
function fallbackFindings(lines, summary) {
    return lines
        .filter((line) => line !== summary)
        .filter((line) => !/^next action/i.test(line))
        .map((line) => truncateField(line.replace(/^[-*]\s*/, ""), 240))
        .filter(Boolean)
        .slice(0, 5);
}
export function compactChildResult(text) {
    const parsed = jsonObjectFrom(text);
    if (parsed) {
        const summary = typeof parsed.summary === "string" ? parsed.summary : "";
        const nextAction = typeof parsed.next_action === "string" ? parsed.next_action : "";
        return {
            summary: truncateField(summary || "Child completed without a summary.", 300),
            findings: compactStringArray(parsed.findings, 5, 240),
            files: compactStringArray(parsed.files, 8, 220),
            next_action: truncateField(nextAction || "Parent should inspect the child result.", 240),
        };
    }
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const summary = truncateField(lines[0] ?? "Child completed without text output.", 300);
    const nextActionLine = lines.find((line) => /^next action/i.test(line));
    return {
        summary,
        findings: fallbackFindings(lines, summary),
        files: extractFiles(text),
        next_action: truncateField(nextActionLine?.replace(/^next action\s*:?\s*/i, "") || "Parent should inspect the child result.", 240),
    };
}
export function setRouterStatus(patch) {
    const previous = globalThis.__SISO_ROUTER_STATUS__;
    const next = {
        ...previous,
        ...patch,
        updatedAt: nowIso(),
    };
    globalThis.__SISO_ROUTER_STATUS__ = next;
    return next;
}
export function isTerminalChildStatus(status) {
    return status === "completed" || status === "failed" || status === "timeout" || status === "aborted" || status === "unsupported";
}
function chooseActiveChildId(children, previousActiveId, candidateId) {
    if (previousActiveId && !isTerminalChildStatus(children[previousActiveId]?.status))
        return previousActiveId;
    if (!isTerminalChildStatus(children[candidateId]?.status))
        return candidateId;
    const active = Object.values(children)
        .filter((child) => !isTerminalChildStatus(child.status))
        .sort((a, b) => Date.parse(b.updatedAt ?? b.startedAt ?? "0") - Date.parse(a.updatedAt ?? a.startedAt ?? "0"))[0];
    return active?.id;
}
export function setChildStatus(snapshot, activate) {
    const previous = globalThis.__SISO_ROUTER_STATUS__;
    const previousChild = previous?.children?.[snapshot.id];
    const now = nowIso();
    const nextSnapshot = {
        ...snapshot,
        startedAt: snapshot.startedAt ?? previousChild?.startedAt ?? now,
        updatedAt: snapshot.updatedAt ?? now,
    };
    const children = {
        ...(previous?.children ?? {}),
        [nextSnapshot.id]: nextSnapshot,
    };
    const activeChildId = activate && !isTerminalChildStatus(nextSnapshot.status) ? nextSnapshot.id : chooseActiveChildId(children, previous?.activeChildId, nextSnapshot.id);
    const activeChild = activeChildId ? children[activeChildId] : undefined;
    return setRouterStatus({
        profile: activeChild?.profile,
        lane: activeChild?.lane,
        model: activeChild?.model,
        tokens: activeChild?.tokens,
        activeChildId,
        child: activeChild,
        children,
    });
}
export function getRouterStatus() {
    return globalThis.__SISO_ROUTER_STATUS__;
}
export function normalizePiTools(tools) {
    return tools.filter((tool) => PI_BUILTIN_TOOLS.has(tool));
}
function permissionedPiTools(tools, permissionProfile) {
    const normalized = normalizePiTools(tools);
    if (permissionProfile === "deny_by_default")
        return [];
    if (permissionProfile === "accept_edits" || permissionProfile === "lab_bypass")
        return normalized;
    return normalized.filter((tool) => !PI_MUTATING_TOOLS.has(tool));
}
function childRunStartedEvent(id, spec) {
    return createAgentEvent({
        type: "run_started",
        runId: id,
        surface: "child",
        profile: spec.decision.profile,
        model: spec.decision.model,
        permissionProfile: spec.decision.permissionProfile,
    });
}
function agentRunStatus(status) {
    return status === "starting" || status === "running" ? "background" : status;
}
function childRunFinishedEvent(id, spec, status, totalTokens = 0) {
    return createAgentEvent({
        type: "run_finished",
        runId: id,
        surface: "child",
        status: agentRunStatus(status),
        totalTokens,
    });
}
export function buildChildPrompt(task, decision, contextPacket) {
    return [
        "You are a SISO Pi child agent.",
        "You were dispatched as a subagent; skip any startup or using-superpowers skill.",
        `Profile: ${decision.profile}`,
        `Lane: ${decision.lane}`,
        `Model: ${decision.model}`,
        `Tools: ${decision.tools.join(",") || "none"}`,
        `Context: ${decision.contextTier}`,
        `State policy: ${decision.statePolicy}`,
        `Permission profile: ${decision.permissionProfile}`,
        rolePrompt(decision),
        "Do not spawn child agents. Use only the tools needed for the assigned task.",
        "For search, use scoped `rg` via Bash; avoid native grep and avoid workspace-root searches over generated/session/research trees.",
        'Return JSON only: {"summary":"...","findings":["..."],"files":["..."],"next_action":"..."}',
        contextPacket ? ["", contextPacket].join("\n") : "",
        "",
        "Task:",
        task,
    ].join("\n");
}
export function buildCodexPrompt(task, decision, contextPacket, casePacket) {
    return [
        "You are a SISO Codex child agent running as an advisory/review/rescue worker.",
        "You were dispatched as a subagent; skip any startup or using-superpowers skill.",
        `Profile: ${decision.profile}`,
        `Lane: ${decision.lane}`,
        `Permission profile: ${decision.permissionProfile}`,
        rolePrompt(decision),
        "Run read-only unless the parent explicitly asks for a patch.",
        "Do not spawn child agents.",
        "Use the Codex Case Packet as the source of truth. Do not request or replay raw transcripts, node_modules, sourcemaps, .git, or giant tool outputs unless a narrow retrieval is essential.",
        'Return JSON only: {"summary":"...","findings":["..."],"files":["..."],"next_action":"..."}',
        casePacket ? ["", casePacket].join("\n") : "",
        contextPacket ? ["", "# Project Context Packet", contextPacket].join("\n") : "",
        "",
        "Task:",
        task,
    ].join("\n");
}
export function buildSpawnSpec(task, options = {}, decision = chooseRoute(task)) {
    const cwd = resolveSpawnCwd(options.cwd);
    if (decision.model === "codex") {
        const codexAdapter = options.codexAdapter ?? (process.env.SISO_CODEX_ADAPTER === "codex-cli" ? "codex-cli" : "pi");
        const codexCasePacket = loadCodexCasePacket(task);
        if (codexAdapter === "pi") {
            const command = options.command ?? process.env.SISO_PI_CODEX_COMMAND ?? defaultPiCodexCommand();
            return {
                adapter: "codex-pi",
                command,
                args: [
                    "--provider",
                    options.provider ?? DEFAULT_PROVIDER,
                    "--model",
                    options.codexModel ?? process.env.SISO_CODEX_MODEL ?? "gpt-5.5",
                    "--no-session",
                    "--no-skills",
                    "--no-context-files",
                    "--no-extensions",
                    "--mode",
                    "json",
                    "--tools",
                    "read,find,ls,bash",
                    "-p",
                    buildCodexPrompt(task, decision, formatContextPacket(loadContextPacket(cwd)), codexCasePacket),
                ],
                cwd,
                decision,
                task,
            };
        }
        const command = options.codexCommand ?? process.env.SISO_CODEX_COMMAND ?? defaultCodexCommand();
        return {
            adapter: "codex-cli",
            command,
            args: [
                "exec",
                "--ephemeral",
                "--ignore-rules",
                "--sandbox",
                "read-only",
                "-c",
                "approval_policy=\"never\"",
                "-m",
                options.codexModel ?? process.env.SISO_CODEX_MODEL ?? "gpt-5.5",
                "-C",
                cwd,
                "--json",
                buildCodexPrompt(task, decision, formatContextPacket(loadContextPacket(cwd)), codexCasePacket),
            ],
            cwd,
            decision,
            task,
        };
    }
    const command = options.command ?? process.env.SISO_PI_CODEX_COMMAND ?? defaultPiCodexCommand();
    const tools = options.noTools ? [] : permissionedPiTools(decision.tools, decision.permissionProfile);
    const effectiveDecision = {
        ...decision,
        tools,
    };
    const args = [
        "--no-session",
        "--no-skills",
        "--no-context-files",
        "--no-extensions",
        "--mode",
        "json",
    ];
    if (tools.length > 0) {
        args.push("--tools", tools.join(","));
    }
    else {
        args.push("--no-tools");
    }
    args.push("-p", buildChildPrompt(task, effectiveDecision, formatContextPacket(loadContextPacket(cwd))));
    return { adapter: "pi", command, args, cwd, decision: effectiveDecision, task };
}
function usageFrom(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const usage = value.usage;
    if (!usage || typeof usage !== "object")
        return undefined;
    const record = usage;
    const input = typeof record.input === "number" ? record.input : 0;
    const output = typeof record.output === "number" ? record.output : 0;
    const totalTokens = typeof record.totalTokens === "number" ? record.totalTokens : input + output;
    return { input, output, totalTokens };
}
function textFromMessage(value) {
    if (!value || typeof value !== "object")
        return "";
    const content = value.content;
    if (!Array.isArray(content))
        return "";
    return content
        .map((item) => {
        if (!item || typeof item !== "object")
            return "";
        const record = item;
        return typeof record.text === "string" ? record.text : "";
    })
        .join("");
}
function appendParsedEvent(current, event) {
    if (!current.events || !current.runId || !current.surface)
        return;
    current.events.push(createAgentEvent(event));
}
function eventToolName(event) {
    if (typeof event.name === "string")
        return event.name;
    if (typeof event.toolName === "string")
        return event.toolName;
    if (typeof event.tool === "string")
        return event.tool;
    const item = event.item;
    if (item && typeof item === "object") {
        const record = item;
        if (typeof record.name === "string")
            return record.name;
        if (typeof record.toolName === "string")
            return record.toolName;
    }
    return undefined;
}
function eventToolCallId(event) {
    if (typeof event.id === "string")
        return event.id;
    if (typeof event.toolCallId === "string")
        return event.toolCallId;
    if (typeof event.call_id === "string")
        return event.call_id;
    const item = event.item;
    if (item && typeof item === "object") {
        const record = item;
        if (typeof record.id === "string")
            return record.id;
        if (typeof record.call_id === "string")
            return record.call_id;
    }
    return undefined;
}
function toolsCountFrom(event) {
    return Array.isArray(event.tools) ? event.tools.length : undefined;
}
export function parseJsonEventLine(line, current) {
    const trimmed = line.trim();
    if (!trimmed)
        return;
    let event;
    try {
        event = JSON.parse(trimmed);
    }
    catch {
        return;
    }
    if (event.type === "message_start" || event.type === "turn.started") {
        const message = event.message;
        const usage = usageFrom(message);
        const model = message && typeof message === "object" && typeof message.model === "string"
            ? message.model
            : current.model;
        appendParsedEvent(current, {
            type: "model_request",
            runId: current.runId ?? "",
            surface: current.surface ?? "child",
            model: model ?? "unknown",
            toolCount: toolsCountFrom(event),
            promptTokens: usage?.input,
        });
    }
    if (event.type === "tool_call" || event.type === "tool_start") {
        current.toolCalls += 1;
        appendParsedEvent(current, {
            type: "tool_call",
            runId: current.runId ?? "",
            surface: current.surface ?? "child",
            toolName: eventToolName(event) ?? "unknown",
            ...(eventToolCallId(event) ? { toolCallId: eventToolCallId(event) } : {}),
        });
    }
    if (event.type === "item.completed") {
        const item = event.item;
        if (item && typeof item === "object") {
            const record = item;
            if (record.type === "agent_message" && typeof record.text === "string") {
                current.finalOutput = record.text;
                appendParsedEvent(current, {
                    type: "assistant_message",
                    runId: current.runId ?? "",
                    surface: current.surface ?? "child",
                    text: record.text,
                });
            }
            if (record.type === "function_call") {
                current.toolCalls += 1;
                appendParsedEvent(current, {
                    type: "tool_call",
                    runId: current.runId ?? "",
                    surface: current.surface ?? "child",
                    toolName: eventToolName(event) ?? "unknown",
                    ...(eventToolCallId(event) ? { toolCallId: eventToolCallId(event) } : {}),
                });
            }
        }
    }
    if (event.type === "turn.completed") {
        const usageRecord = event.usage;
        if (usageRecord && typeof usageRecord === "object") {
            const record = usageRecord;
            const input = typeof record.input_tokens === "number" ? record.input_tokens : 0;
            const output = typeof record.output_tokens === "number" ? record.output_tokens : 0;
            current.tokens = { input, output, totalTokens: input + output };
        }
    }
    if (Array.isArray(event.toolResults)) {
        current.toolCalls = Math.max(current.toolCalls, event.toolResults.length);
    }
    const message = event.message;
    const usage = usageFrom(message);
    if (usage)
        current.tokens = usage;
    if (event.type === "message_end" && message && typeof message === "object") {
        const role = message.role;
        if (role === "assistant") {
            current.finalOutput = textFromMessage(message);
            appendParsedEvent(current, {
                type: "assistant_message",
                runId: current.runId ?? "",
                surface: current.surface ?? "child",
                text: current.finalOutput,
            });
        }
    }
    if (event.type === "turn_end" && message && typeof message === "object") {
        const role = message.role;
        if (role === "assistant") {
            current.finalOutput = textFromMessage(message);
            appendParsedEvent(current, {
                type: "assistant_message",
                runId: current.runId ?? "",
                surface: current.surface ?? "child",
                text: current.finalOutput,
            });
        }
    }
}
export async function runProfileSpawn(task, options = {}, signal) {
    const spec = buildSpawnSpec(task, options, options.decision ?? chooseRoute(task));
    const id = childId();
    const startedEvent = childRunStartedEvent(id, spec);
    const start = Date.now();
    const tokens = { input: 0, output: 0, totalTokens: 0 };
    const paths = childRunPaths(id);
    const depthError = depthBlocked(options);
    if (depthError || spec.unsupportedReason || options.dryRun) {
        const status = depthError || spec.unsupportedReason ? "unsupported" : "planned";
        const finalOutput = depthError ?? spec.unsupportedReason ?? "dry_run=true";
        const events = [startedEvent, childRunFinishedEvent(id, spec, status, 0)];
        const result = {
            id,
            status,
            adapter: spec.adapter,
            decision: spec.decision,
            command: spec.command,
            args: spec.args,
            cwd: spec.cwd,
            durationMs: 0,
            timedOut: false,
            stdout: "",
            stderr: "",
            finalOutput,
            compactResult: compactChildResult(finalOutput),
            rawOutputChars: finalOutput.length,
            truncatedOutputChars: 0,
            tokens,
            toolCalls: 0,
            events,
            runRecordPath: paths.runRecordPath,
            stdoutPath: paths.stdoutPath,
            stderrPath: paths.stderrPath,
            ...(spec.unsupportedReason ? { error: spec.unsupportedReason } : {}),
        };
        writeChildRunLogs(paths, "", "");
        writeChildRunRecord(recordFromResult(result, paths));
        setChildStatus(snapshotFromResult(result), true);
        return result;
    }
    if (signal?.aborted) {
        const finalOutput = "Aborted before child spawn.";
        const events = [startedEvent, childRunFinishedEvent(id, spec, "aborted", 0)];
        const result = {
            id,
            status: "aborted",
            adapter: spec.adapter,
            decision: spec.decision,
            command: spec.command,
            args: spec.args,
            cwd: spec.cwd,
            durationMs: 0,
            timedOut: false,
            stdout: "",
            stderr: "",
            finalOutput,
            compactResult: compactChildResult(finalOutput),
            rawOutputChars: finalOutput.length,
            truncatedOutputChars: 0,
            tokens,
            toolCalls: 0,
            events,
            error: "Aborted",
            runRecordPath: paths.runRecordPath,
            stdoutPath: paths.stdoutPath,
            stderrPath: paths.stderrPath,
        };
        writeChildRunLogs(paths, "", "");
        writeChildRunRecord(recordFromResult(result, paths));
        setChildStatus(snapshotFromResult(result), true);
        return result;
    }
    if (options.background) {
        mkdirSync(paths.dir, { recursive: true });
        writeChildRunLogs(paths, "", "");
        const supervisorConfig = JSON.stringify({
            command: spec.command,
            args: spec.args,
            cwd: spec.cwd,
            stdoutPath: paths.stdoutPath,
            stderrPath: paths.stderrPath,
            exitPath: paths.exitPath,
        });
        const child = spawnProcess(defaultNodeCommand(), ["-e", BACKGROUND_SUPERVISOR_SCRIPT, supervisorConfig], {
            cwd: spec.cwd,
            env: spawnEnv(spec, options),
            detached: true,
            stdio: "ignore",
        });
        child.on("error", (error) => {
            const compactResult = {
                summary: `background child failed to start: ${error.message}`,
                findings: [error.message],
                files: [],
                next_action: "Fix the spawn command or rerun foreground for details.",
            };
            setChildStatus({
                id,
                status: "failed",
                profile: spec.decision.profile,
                lane: spec.decision.lane,
                model: spec.decision.model,
                pid: child.pid,
                tokens,
                toolCalls: 0,
                compactResult,
                error: error.message,
            }, false);
            writeChildRunRecord({
                id,
                status: "failed",
                adapter: spec.adapter,
                profile: spec.decision.profile,
                lane: spec.decision.lane,
                model: spec.decision.model,
                cwd: spec.cwd,
                pid: child.pid,
                startedAt: nowIso(),
                updatedAt: nowIso(),
                completedAt: nowIso(),
                stdoutPath: paths.stdoutPath,
                stderrPath: paths.stderrPath,
                runRecordPath: paths.runRecordPath,
                tokens,
                toolCalls: 0,
                compactResult,
                rawOutputChars: 0,
                truncatedOutputChars: 0,
                error: error.message,
            });
            emitSystemDbTelemetry("SISO_CHILD_STOP", {
                id,
                status: "failed",
                adapter: spec.adapter,
                profile: spec.decision.profile,
                lane: spec.decision.lane,
                model: spec.decision.model,
                cwd: spec.cwd,
                pid: child.pid,
                error: error.message,
                runRecordPath: paths.runRecordPath,
            });
        });
        child.unref();
        const finalOutput = `background child supervisor started pid=${child.pid ?? "unknown"}`;
        const result = {
            id,
            status: "background",
            adapter: spec.adapter,
            decision: spec.decision,
            command: spec.command,
            args: spec.args,
            cwd: spec.cwd,
            pid: child.pid,
            durationMs: Date.now() - start,
            timedOut: false,
            stdout: "",
            stderr: "",
            finalOutput,
            compactResult: {
                summary: finalOutput,
                findings: [],
                files: [],
                next_action: "Track the background child from status/logs, or rerun foreground for captured output.",
            },
            rawOutputChars: finalOutput.length,
            truncatedOutputChars: 0,
            tokens,
            toolCalls: 0,
            events: [startedEvent],
            runRecordPath: paths.runRecordPath,
            stdoutPath: paths.stdoutPath,
            stderrPath: paths.stderrPath,
        };
        writeChildRunRecord(recordFromResult(result, paths));
        emitSystemDbTelemetry("SISO_CHILD_START", {
            id,
            status: "background",
            adapter: spec.adapter,
            profile: spec.decision.profile,
            lane: spec.decision.lane,
            model: spec.decision.model,
            cwd: spec.cwd,
            pid: child.pid,
            startedAt: nowIso(),
            runRecordPath: paths.runRecordPath,
        });
        setChildStatus(snapshotFromResult(result), true);
        return result;
    }
    setChildStatus({
        id,
        status: "starting",
        profile: spec.decision.profile,
        lane: spec.decision.lane,
        model: spec.decision.model,
        tokens,
        toolCalls: 0,
    }, true);
    return await new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let stdoutFull = "";
        let stderrFull = "";
        let stdoutBuffer = "";
        let settled = false;
        let timedOut = false;
        let aborted = false;
        let terminalIntent;
        let killGraceTimer;
        let forceFinishTimer;
        const state = {
            finalOutput: "",
            tokens,
            toolCalls: 0,
            runId: id,
            surface: "child",
            model: spec.decision.model,
            events: [],
        };
        const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const child = spawnProcess(spec.command, spec.args, {
            cwd: spec.cwd,
            env: spawnEnv(spec, options),
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
        });
        emitSystemDbTelemetry("SISO_CHILD_START", {
            id,
            status: "starting",
            adapter: spec.adapter,
            profile: spec.decision.profile,
            lane: spec.decision.lane,
            model: spec.decision.model,
            cwd: spec.cwd,
            pid: child.pid,
            startedAt: nowIso(),
            runRecordPath: paths.runRecordPath,
        });
        const finish = (status, exitCode, closeSignal, error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            if (killGraceTimer)
                clearTimeout(killGraceTimer);
            if (forceFinishTimer)
                clearTimeout(forceFinishTimer);
            signal?.removeEventListener("abort", abortHandler);
            const output = truncateForParent(state.finalOutput);
            const errorText = error ? truncateForParent(error, CHILD_ERROR_LIMIT).text : undefined;
            const compactResult = compactChildResult(state.finalOutput || errorText || "");
            const events = [startedEvent, ...state.events, childRunFinishedEvent(id, spec, status, state.tokens.totalTokens)];
            const notified = isTerminalChildStatus(status);
            const result = {
                id,
                status,
                adapter: spec.adapter,
                decision: spec.decision,
                command: spec.command,
                args: spec.args,
                cwd: spec.cwd,
                pid: child.pid,
                exitCode,
                signal: closeSignal,
                durationMs: Date.now() - start,
                timedOut,
                stdout,
                stderr,
                finalOutput: output.text,
                compactResult,
                rawOutputChars: output.originalChars,
                truncatedOutputChars: output.truncatedChars,
                tokens: state.tokens,
                toolCalls: state.toolCalls,
                notified,
                events,
                runRecordPath: paths.runRecordPath,
                stdoutPath: paths.stdoutPath,
                stderrPath: paths.stderrPath,
                ...(errorText ? { error: errorText } : {}),
            };
            writeChildRunLogs(paths, stdoutFull, stderrFull);
            writeChildRunRecord(recordFromResult(result, paths));
            emitSystemDbTelemetry("SISO_CHILD_STOP", {
                id,
                status,
                adapter: spec.adapter,
                profile: spec.decision.profile,
                lane: spec.decision.lane,
                model: spec.decision.model,
                cwd: spec.cwd,
                pid: child.pid,
                exitCode,
                signal: closeSignal,
                durationMs: result.durationMs,
                tokens: result.tokens,
                toolCalls: result.toolCalls,
                error: result.error,
                runRecordPath: paths.runRecordPath,
            });
            setChildStatus(snapshotFromResult(result), false);
            resolve(result);
        };
        const requestTermination = (status) => {
            if (settled || terminalIntent)
                return;
            terminalIntent = status;
            timedOut = status === "timeout";
            aborted = status === "aborted";
            signalChildTree(child.pid, "SIGTERM");
            killGraceTimer = setTimeout(() => {
                if (settled)
                    return;
                signalChildTree(child.pid, "SIGKILL");
            }, KILL_GRACE_MS);
            forceFinishTimer = setTimeout(() => {
                if (settled)
                    return;
                const error = status === "timeout" ? `Timed out after ${timeoutMs}ms` : "Aborted";
                finish(status, null, "SIGKILL", error);
            }, FORCE_FINISH_MS);
        };
        const timer = setTimeout(() => {
            requestTermination("timeout");
        }, timeoutMs);
        const abortHandler = () => {
            requestTermination("aborted");
        };
        signal?.addEventListener("abort", abortHandler, { once: true });
        if (signal?.aborted)
            abortHandler();
        child.stdout.on("data", (chunk) => {
            const text = chunk.toString("utf8");
            stdoutFull += text;
            stdout = appendLimited(stdout, text);
            stdoutBuffer += text;
            const lines = stdoutBuffer.split(/\r?\n/);
            stdoutBuffer = lines.pop() ?? "";
            for (const line of lines)
                parseJsonEventLine(line, state);
            setChildStatus({
                id,
                status: "running",
                profile: spec.decision.profile,
                lane: spec.decision.lane,
                model: spec.decision.model,
                pid: child.pid,
                tokens: state.tokens,
                toolCalls: state.toolCalls,
            }, false);
        });
        child.stderr.on("data", (chunk) => {
            const text = chunk.toString("utf8");
            stderrFull += text;
            stderr = appendLimited(stderr, text);
        });
        child.on("error", (error) => {
            finish("failed", 1, null, error.message);
        });
        child.on("close", (exitCode, closeSignal) => {
            if (stdoutBuffer)
                parseJsonEventLine(stdoutBuffer, state);
            if (settled)
                return;
            const status = terminalIntent ?? (timedOut ? "timeout" : aborted ? "aborted" : exitCode === 0 ? "completed" : "failed");
            const error = status === "completed" ? undefined : status === "timeout" ? `Timed out after ${timeoutMs}ms` : status === "aborted" ? "Aborted" : stderr || `Exited with code ${exitCode}`;
            finish(status, exitCode, closeSignal, error);
        });
    });
}
export function snapshotFromResult(result) {
    return {
        id: result.id,
        status: result.status,
        profile: result.decision.profile,
        lane: result.decision.lane,
        model: result.decision.model,
        startedAt: new Date(Date.now() - result.durationMs).toISOString(),
        updatedAt: nowIso(),
        pid: result.pid,
        exitCode: result.exitCode,
        signal: result.signal,
        durationMs: result.durationMs,
        tokens: result.tokens,
        toolCalls: result.toolCalls,
        notified: result.notified === true,
        outputChars: result.rawOutputChars,
        truncatedOutputChars: result.truncatedOutputChars,
        compactResult: result.compactResult,
        error: result.error,
        runRecordPath: result.runRecordPath,
    };
}
export function publicSpawnResult(result) {
    const { stdout: _stdout, stderr, ...rest } = result;
    return {
        ...rest,
        stderrPreview: truncateForParent(stderr, CHILD_ERROR_LIMIT).text,
    };
}
export function formatSpawnResult(task, result) {
    return [
        `kind=${result.decision.kind}`,
        `profile=${result.decision.profile}`,
        `lane=${result.decision.lane}`,
        `model=${result.decision.model}`,
        `child_id=${result.id}`,
        `child_status=${result.status}`,
        `child_tokens_estimated=${result.tokens.totalTokens}`,
        `child_tool_calls=${result.toolCalls}`,
        `child_notified=${result.notified === true}`,
        ...(result.error ? [`child_error=${JSON.stringify(truncateForParent(result.error, 80).text)}`] : []),
    ].join("\n");
}
