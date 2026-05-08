import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
const RESTORE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const DEFAULT_RESTORE_MAX_CHARS = 6000;
const CORRECTION_PATTERNS = [
    /\bno,?\s+(use|do|try|make|build)\b/i,
    /\bremember:?\s/i,
    /\b(don'?t|dont|stop|never)\b/i,
    /\b(actually|wait),?\s/i,
    /\bI prefer\b/i,
    /\b(should be|should always|should never)\b/i,
    /\b(that'?s wrong|that'?s not right|incorrect)\b/i,
    /\b(not that|instead|avoid)\b/i,
];
function agentDir() {
    return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi-bifrost", "agent");
}
function transcriptRoot() {
    return process.env.SISO_TRANSCRIPT_DIR ?? join(homedir(), ".siso", "pi-harness-lab", "transcripts");
}
function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}
function safeFilePart(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "unknown";
}
function transcriptPathFor(sessionId) {
    return join(transcriptRoot(), dayKey(), `${safeFilePart(sessionId)}.jsonl`);
}
function errorsPathFor() {
    return join(transcriptRoot(), dayKey(), "errors.jsonl");
}
function providerPayloadPathFor(sessionId, timestamp) {
    return join(transcriptRoot(), dayKey(), safeFilePart(sessionId), "provider-requests", `${timestamp.replace(/[:.]/g, "-")}.json`);
}
function reflectQueuePath() {
    return join(agentDir(), ".reflect-queue.jsonl");
}
function checkpointDir(cwd) {
    return join(cwd, ".pi", "session-context");
}
function projectLessonsPath(cwd) {
    return join(cwd, "tasks", "lessons.md");
}
function readQueueLines() {
    try {
        return readFileSync(reflectQueuePath(), "utf8").split(/\r?\n/).filter(Boolean);
    }
    catch {
        return [];
    }
}
function parseQueueLine(line) {
    try {
        const entry = JSON.parse(line);
        if (typeof entry.session_id !== "string" || typeof entry.prompt !== "string")
            return undefined;
        return {
            session_id: entry.session_id,
            prompt: entry.prompt,
            ...(typeof entry.cwd === "string" ? { cwd: entry.cwd } : {}),
        };
    }
    catch {
        return undefined;
    }
}
function projectRoot(event) {
    return typeof event.cwd === "string" ? event.cwd : process.cwd();
}
function sessionIdFrom(event, ctx) {
    const ctxRecord = ctx;
    const sessionManager = ctxRecord?.sessionManager && typeof ctxRecord.sessionManager === "object"
        ? ctxRecord.sessionManager
        : undefined;
    const candidates = [
        event.session_id,
        event.sessionId,
        ctxRecord?.sessionId,
        sessionManager?.currentSessionId,
    ];
    return candidates.find((value) => typeof value === "string" && value.length > 0) ?? "unknown";
}
function promptTextFromInputEvent(event) {
    for (const key of ["text", "prompt", "message"]) {
        const value = event[key];
        if (typeof value === "string" && value.trim())
            return value;
    }
    return textFromContent(event.content);
}
function textFromContent(value) {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value))
        return value.map(textFromContent).filter(Boolean).join("\n");
    if (!value || typeof value !== "object")
        return "";
    const record = value;
    if (typeof record.text === "string")
        return record.text;
    if ("content" in record)
        return textFromContent(record.content);
    return "";
}
function compactText(value, maxChars = 4000) {
    const text = value.replace(/\s+/g, " ").trim();
    return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}
function summarizeProviderPayload(payload) {
    const record = payload && typeof payload === "object" ? payload : {};
    const input = Array.isArray(record.input) ? record.input : [];
    const tools = Array.isArray(record.tools) ? record.tools : [];
    const toolNames = tools.map((tool) => {
        const item = tool && typeof tool === "object" ? tool : {};
        const fn = item.function && typeof item.function === "object" ? item.function : {};
        return typeof fn.name === "string" ? fn.name : typeof item.name === "string" ? item.name : typeof item.type === "string" ? item.type : "unknown";
    });
    return {
        model: typeof record.model === "string" ? record.model : "unknown",
        inputItems: input.length,
        inputTextChars: textFromContent(input).length,
        toolCount: tools.length,
        toolNames,
    };
}
function toolNameFromEvent(event) {
    if (typeof event.toolName === "string")
        return event.toolName;
    if (typeof event.name === "string")
        return event.name;
    if (typeof event.tool === "string")
        return event.tool;
    const tool = event.tool && typeof event.tool === "object" ? event.tool : undefined;
    return typeof tool?.name === "string" ? tool.name : undefined;
}
function errorTextFromEvent(eventType, event) {
    const direct = event.error ?? event.errorMessage ?? event.message;
    const nestedMessage = event.message && typeof event.message === "object" ? event.message : undefined;
    if (typeof nestedMessage?.errorMessage === "string")
        return nestedMessage.errorMessage;
    if (nestedMessage?.stopReason === "error")
        return JSON.stringify(nestedMessage).slice(0, 2000);
    if (event.isError === true)
        return JSON.stringify(event).slice(0, 2000);
    if (eventType.includes("error"))
        return JSON.stringify(event).slice(0, 2000);
    if (typeof direct === "string" && direct.includes("api_error"))
        return direct;
    if (direct && typeof direct === "object" && JSON.stringify(direct).includes("api_error"))
        return JSON.stringify(direct).slice(0, 2000);
    const serialized = JSON.stringify(event);
    return serialized.includes("api_error") ? serialized.slice(0, 2000) : undefined;
}
function transcriptKind(eventType, event) {
    if (errorTextFromEvent(eventType, event))
        return "error";
    if (eventType === "input")
        return "input";
    if (eventType === "before_provider_request")
        return "provider";
    if (eventType.includes("tool"))
        return "tool";
    if (eventType.includes("message") || eventType === "turn_end" || eventType === "agent_end")
        return "assistant";
    if (["before_agent_start", "session_start", "session_shutdown", "session_before_switch", "session_before_fork", "session_before_tree", "session_tree", "session_end", "stop", "before_compact", "pre_compact", "session_before_compact", "session_compact", "model_select", "user_bash"].includes(eventType))
        return "lifecycle";
    return "session";
}
function appendJsonl(path, value) {
    mkdirSync(join(path, ".."), { recursive: true });
    appendFileSync(path, JSON.stringify(value) + "\n");
}
function writeProviderPayload(sessionId, timestamp, payload) {
    if (!payload)
        return undefined;
    const path = providerPayloadPathFor(sessionId, timestamp);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, JSON.stringify(payload, null, 2));
    return path;
}
function captureTranscriptEvent(state, eventType, event, ctx) {
    const sessionId = sessionIdFrom(event, ctx);
    if (sessionId !== "unknown")
        state.sessionId = sessionId;
    const effectiveSessionId = state.sessionId || sessionId || "unknown";
    const timestamp = new Date().toISOString();
    const cwd = projectRoot(event) || state.cwd;
    const error = errorTextFromEvent(eventType, event);
    const providerSummary = eventType === "before_provider_request" ? summarizeProviderPayload(event.payload) : undefined;
    const providerRequestPath = eventType === "before_provider_request"
        ? writeProviderPayload(effectiveSessionId, timestamp, event.payload)
        : undefined;
    const text = eventType === "input"
        ? promptTextFromInputEvent(event)
        : textFromContent(event.content ?? event.message ?? event.output ?? event.result);
    const row = {
        timestamp,
        session_id: effectiveSessionId,
        cwd,
        event_type: eventType,
        kind: error ? "error" : transcriptKind(eventType, event),
        ...(text ? { text: compactText(text) } : {}),
        ...(providerSummary?.model ? { model: providerSummary.model } : {}),
        ...(toolNameFromEvent(event) ? { tool_name: toolNameFromEvent(event) } : {}),
        ...(providerRequestPath ? { provider_request_path: providerRequestPath } : {}),
        ...(error ? { error } : {}),
        ...(eventType === "before_provider_request" ? { payload: providerSummary } : { payload: event }),
    };
    const path = transcriptPathFor(effectiveSessionId);
    appendJsonl(path, row);
    state.transcriptPath = path;
    state.transcriptRows += 1;
    if (error) {
        state.errors += 1;
        state.latestError = error;
        appendJsonl(errorsPathFor(), row);
    }
}
function gitOutput(cwd, args) {
    const result = spawnSync("git", args, {
        cwd,
        encoding: "utf8",
        timeout: 1500,
        maxBuffer: 64 * 1024,
    });
    return result.status === 0 ? result.stdout.trim() : "";
}
function checkpointGitMetadata(cwd) {
    const branch = gitOutput(cwd, ["branch", "--show-current"]) || "unknown";
    const commit = gitOutput(cwd, ["rev-parse", "--short", "HEAD"]) || "unknown";
    const statusLines = gitOutput(cwd, ["status", "--short"])
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter(Boolean)
        .slice(0, 40);
    const touchedFiles = statusLines
        .map((line) => line.slice(3).trim())
        .filter(Boolean)
        .slice(0, 20);
    return {
        branch,
        commit,
        dirtyCount: statusLines.length,
        dirtyFiles: statusLines,
        touchedFiles,
    };
}
function pathFromToolInput(input) {
    if (!input || typeof input !== "object")
        return undefined;
    const record = input;
    for (const key of ["path", "file", "filePath", "filepath", "targetPath", "target_path"]) {
        const value = record[key];
        if (typeof value === "string" && value.trim())
            return value;
    }
    return undefined;
}
function trackTouchedFile(state, event) {
    const toolName = typeof event.toolName === "string"
        ? event.toolName
        : typeof event.name === "string"
            ? event.name
            : "";
    if (!["read", "edit", "write"].includes(toolName))
        return;
    const path = pathFromToolInput(event.input);
    if (path)
        state.touchedFiles.add(path);
}
function lessonRuleFromPrompt(prompt) {
    const compact = prompt.replace(/\s+/g, " ").trim().slice(0, 220);
    return [
        "## Captured Pi Correction",
        "",
        `Rule: Apply this correction in future work: ${compact}`,
        "",
        "**Why:** Shaan corrected the agent during an active Pi session.",
        "",
        "**How to apply:** Check this rule before repeating the same workflow or agent-routing behavior.",
        "",
    ].join("\n");
}
export function appendProjectLesson(prompt, cwd) {
    if (!prompt.trim())
        return false;
    const path = projectLessonsPath(cwd);
    mkdirSync(join(cwd, "tasks"), { recursive: true });
    const lesson = lessonRuleFromPrompt(prompt);
    const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
    const signature = prompt.replace(/\s+/g, " ").trim().slice(0, 120);
    if (signature && existing.includes(signature))
        return false;
    if (!existing.trim()) {
        writeFileSync(path, `# Lessons\n\n${lesson}`);
    }
    else {
        appendFileSync(path, `\n${lesson}`);
    }
    return true;
}
export function drainCorrectionLessons(cwd, sessionId) {
    const lines = readQueueLines();
    const remaining = [];
    let appended = 0;
    let duplicates = 0;
    let processed = 0;
    for (const line of lines) {
        const entry = parseQueueLine(line);
        if (!entry) {
            remaining.push(line);
            continue;
        }
        if (entry.cwd && entry.cwd !== cwd) {
            remaining.push(line);
            continue;
        }
        if (sessionId && entry.session_id !== sessionId) {
            remaining.push(line);
            continue;
        }
        processed += 1;
        if (appendProjectLesson(entry.prompt, cwd))
            appended += 1;
        else
            duplicates += 1;
    }
    if (processed > 0) {
        writeFileSync(reflectQueuePath(), remaining.join("\n") + (remaining.length ? "\n" : ""));
    }
    return { appended, duplicates, processed, remaining: remaining.length, lessonsPath: projectLessonsPath(cwd) };
}
export function captureCorrection(prompt, cwd, sessionId = "unknown") {
    const matched = CORRECTION_PATTERNS.find((pattern) => pattern.test(prompt));
    if (!matched)
        return { captured: false };
    mkdirSync(agentDir(), { recursive: true });
    appendFileSync(reflectQueuePath(), JSON.stringify({
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        cwd,
        prompt: prompt.slice(0, 500),
        matched_pattern: matched.source,
        source: "pi-lifecycle",
    }) + "\n");
    const lessonAppended = appendProjectLesson(prompt, cwd);
    return { captured: true, matchedPattern: matched.source, lessonAppended };
}
export function writeCheckpoint(state, reason) {
    const dir = checkpointDir(state.cwd);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${reason}.md`);
    const summary = state.lastProviderSummary;
    const git = checkpointGitMetadata(state.cwd);
    const touchedFiles = [...new Set([...state.touchedFiles, ...git.touchedFiles])].slice(0, 40);
    writeFileSync(path, [
        "# Pi Session Checkpoint",
        "",
        `Reason: ${reason}`,
        `Timestamp: ${new Date().toISOString()}`,
        `CWD: ${state.cwd}`,
        `Prompt: ${state.prompt || "none"}`,
        "",
        "## Git",
        `Branch: ${git.branch}`,
        `Commit: ${git.commit}`,
        `Dirty files: ${git.dirtyCount}`,
        ...(git.dirtyFiles.length ? git.dirtyFiles.map((file) => `- ${file}`) : ["- none"]),
        "",
        "## Latest Provider Request",
        `Model: ${summary?.model ?? "unknown"}`,
        `Input items: ${summary?.inputItems ?? 0}`,
        `Input text chars: ${summary?.inputTextChars ?? 0}`,
        `Tool schemas: ${summary?.toolCount ?? 0}`,
        `Tools: ${summary?.toolNames.join(",") ?? "none"}`,
        "",
        "## Touched Files",
        ...(touchedFiles.length ? touchedFiles.map((file) => `- ${file}`) : ["- none"]),
        "",
        "## Resume Hint",
        "Use siso_lifecycle_status includeContent=true only if this checkpoint is needed.",
        "",
    ].join("\n"));
    state.checkpoints += 1;
    return path;
}
export function discoverRestoreSummary(cwd) {
    const dir = checkpointDir(cwd);
    let latestPath;
    try {
        latestPath = readdirSync(dir)
            .filter((name) => name.endsWith(".md"))
            .map((name) => join(dir, name))
            .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
    }
    catch {
        return undefined;
    }
    if (!latestPath)
        return undefined;
    let text = "";
    try {
        text = readFileSync(latestPath, "utf8");
    }
    catch {
        return {
            file: basename(latestPath),
            path: latestPath,
            reason: "unknown",
            timestamp: "unknown",
            ageMs: Number.POSITIVE_INFINITY,
            eligible: false,
        };
    }
    const ageMs = Date.now() - statSync(latestPath).mtimeMs;
    return {
        file: basename(latestPath),
        path: latestPath,
        reason: firstMetadataValue(text, "Reason") ?? "unknown",
        timestamp: firstMetadataValue(text, "Timestamp") ?? "unknown",
        ageMs,
        eligible: ageMs <= RESTORE_MAX_AGE_MS,
    };
}
export function readRestoreCheckpoint(cwd, maxChars = DEFAULT_RESTORE_MAX_CHARS) {
    const summary = discoverRestoreSummary(cwd);
    if (!summary) {
        return { summary: undefined, content: "restore=none", truncated: false };
    }
    if (!summary.eligible) {
        return { summary, content: `restore=${summary.file}\neligible=false`, truncated: false };
    }
    const cappedMax = Math.max(500, Math.min(12000, Math.floor(maxChars)));
    const text = readFileSync(summary.path, "utf8");
    const truncated = text.length > cappedMax;
    return {
        summary,
        content: truncated ? text.slice(0, cappedMax) : text,
        truncated,
    };
}
function firstMetadataValue(text, key) {
    const prefix = `${key}:`;
    const line = text.split(/\r?\n/, 16).find((item) => item.startsWith(prefix));
    const value = line?.slice(prefix.length).trim();
    return value || undefined;
}
function countLines(path) {
    try {
        return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).length;
    }
    catch {
        return 0;
    }
}
function tailJsonl(path, limit) {
    try {
        return readFileSync(path, "utf8")
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(-Math.max(1, Math.min(100, limit)))
            .map((line) => {
            try {
                return JSON.parse(line);
            }
            catch {
                return { parse_error: line };
            }
        });
    }
    catch {
        return [];
    }
}
function transcriptStatusResult(state, args = []) {
    const op = args[0] ?? "status";
    const limit = Number.isFinite(Number(args[1])) ? Number(args[1]) : 10;
    const path = op === "errors" ? errorsPathFor() : state.transcriptPath;
    const rows = path ? tailJsonl(path, limit) : [];
    const contentLines = [
        `op=${op}`,
        `transcript_root=${transcriptRoot()}`,
        `session_id=${state.sessionId}`,
        `transcript=${state.transcriptPath ?? "none"}`,
        `transcript_rows=${state.transcriptRows}`,
        `errors=${state.errors}`,
        `errors_file=${errorsPathFor()}`,
        `latest_error=${state.latestError ?? "none"}`,
    ];
    if (op === "tail" || op === "errors") {
        contentLines.push("--- rows ---", ...rows.map((row) => JSON.stringify(row)));
    }
    return {
        content: [{
                type: "text",
                text: contentLines.join("\n"),
            }],
    };
}
function lifecycleStatusResult(state, options = {}) {
    const restore = options.includeContent ? readRestoreCheckpoint(state.cwd, options.maxChars) : undefined;
    const contentLines = [
        `cwd=${state.cwd}`,
        `checkpoint_dir=${checkpointDir(state.cwd)}`,
        `checkpoints=${state.checkpoints}`,
        `corrections=${state.corrections}`,
        `queued_corrections=${state.queuedCorrections}`,
        `lessons=${state.lessons}`,
        `lessons_path=${projectLessonsPath(state.cwd)}`,
        `reflect_queue=${reflectQueuePath()}`,
        `reflect_queue_lines=${countLines(reflectQueuePath())}`,
        `transcript_root=${transcriptRoot()}`,
        `transcript=${state.transcriptPath ?? "none"}`,
        `transcript_rows=${state.transcriptRows}`,
        `errors=${state.errors}`,
        `errors_file=${errorsPathFor()}`,
        `latest_error=${state.latestError ?? "none"}`,
        `restore=${state.restoreSummary?.file ?? "none"}`,
        `restore_reason=${state.restoreSummary?.reason ?? "none"}`,
        `restore_timestamp=${state.restoreSummary?.timestamp ?? "none"}`,
        `restore_eligible=${state.restoreSummary?.eligible ?? false}`,
    ];
    if (restore) {
        contentLines.push(`restore_content_file=${restore.summary?.file ?? "none"}`, `restore_content_truncated=${restore.truncated}`, "--- checkpoint_content ---", restore.content);
    }
    return {
        content: [{
                type: "text",
                text: contentLines.join("\n"),
            }],
    };
}
export default function sisoLifecycleExtension(pi) {
    const state = {
        cwd: process.cwd(),
        prompt: "",
        sessionId: "unknown",
        transcriptPath: undefined,
        lastProviderSummary: undefined,
        restoreSummary: undefined,
        corrections: 0,
        lessons: 0,
        queuedCorrections: 0,
        checkpoints: 0,
        transcriptRows: 0,
        errors: 0,
        latestError: undefined,
        touchedFiles: new Set(),
    };
    const publish = (ctx) => {
        state.queuedCorrections = readQueueLines()
            .map(parseQueueLine)
            .filter((entry) => Boolean(entry))
            .filter((entry) => !entry.cwd || entry.cwd === state.cwd)
            .length;
        if (process.env.SISO_LIFECYCLE_UI !== "compact")
            return;
        const restore = state.restoreSummary ? state.restoreSummary.file : "none";
        ctx?.ui?.setStatus?.("siso-lifecycle", `checkpoint:${state.checkpoints} reflect:${state.corrections} queued:${state.queuedCorrections} lessons:${state.lessons} errors:${state.errors} log:${state.transcriptRows} restore:${restore}`);
    };
    pi.on("before_agent_start", (event, ctx) => {
        captureTranscriptEvent(state, "before_agent_start", event, ctx);
        state.cwd = projectRoot(event);
        state.sessionId = sessionIdFrom(event, ctx);
        state.prompt = typeof event.prompt === "string" ? event.prompt : "";
        state.restoreSummary = discoverRestoreSummary(state.cwd);
        if (state.prompt) {
            const result = captureCorrection(state.prompt, state.cwd, sessionIdFrom(event, ctx));
            if (result.captured)
                state.corrections += 1;
            if (result.lessonAppended)
                state.lessons += 1;
        }
        publish(ctx);
    });
    pi.on("input", (event, ctx) => {
        if (event.source === "extension")
            return { action: "continue" };
        captureTranscriptEvent(state, "input", event, ctx);
        state.cwd = projectRoot(event);
        const prompt = promptTextFromInputEvent(event);
        if (prompt) {
            const result = captureCorrection(prompt, state.cwd, sessionIdFrom(event, ctx));
            if (result.captured)
                state.corrections += 1;
            if (result.lessonAppended)
                state.lessons += 1;
        }
        publish(ctx);
        return { action: "continue" };
    });
    pi.on("before_provider_request", (event, ctx) => {
        captureTranscriptEvent(state, "before_provider_request", event, ctx);
        state.lastProviderSummary = summarizeProviderPayload(event.payload);
        publish(ctx);
    });
    for (const eventName of ["session_start", "session_before_switch", "session_before_fork", "session_before_tree", "session_tree", "model_select", "user_bash", "after_provider_response", "message_end", "turn_end", "agent_end", "tool_execution_start", "tool_execution_update", "tool_execution_end", "tool_result"]) {
        pi.on(eventName, (event, ctx) => {
            captureTranscriptEvent(state, eventName, event, ctx);
            publish(ctx);
        });
    }
    pi.on("tool_call", (event, ctx) => {
        captureTranscriptEvent(state, "tool_call", event, ctx);
        trackTouchedFile(state, event);
        publish(ctx);
    });
    for (const eventName of ["pre_compact", "before_compact", "session_before_compact", "session_compact", "session_end", "session_shutdown", "stop"]) {
        pi.on(eventName, (event, ctx) => {
            captureTranscriptEvent(state, eventName, event, ctx);
            const sessionId = sessionIdFrom(event, ctx);
            const drain = drainCorrectionLessons(state.cwd, sessionId === "unknown" ? undefined : sessionId);
            state.lessons += drain.appended;
            writeCheckpoint(state, eventName);
            publish(ctx);
        });
    }
    pi.registerCommand?.("siso-lifecycle-status", {
        description: "Print Pi lifecycle checkpoint and reflection capture status",
        handler: async () => lifecycleStatusResult(state),
    });
    pi.registerCommand?.("siso-transcripts", {
        description: "Print local Pi transcript/error ledger status, tail, or errors",
        handler: async (args) => transcriptStatusResult(state, Array.isArray(args) ? args : String(args ?? "").split(/\s+/).filter(Boolean)),
    });
    pi.registerCommand?.("exit", {
        description: "Exit Pi Codex",
        handler: async () => {
            setTimeout(() => process.exit(0), 0);
            return { content: [{ type: "text", text: "Exiting Pi Codex..." }] };
        },
    });
    if (process.env.SISO_LIFECYCLE_TOOL_MODE === "lean") {
        return;
    }
    pi.registerTool?.({
        name: "siso_lifecycle_status",
        label: "SISO Lifecycle Status",
        description: "Return lifecycle metadata. Set includeContent only when continuing a previous checkpoint.",
        parameters: {
            type: "object",
            properties: {
                includeContent: {
                    type: "boolean",
                    default: false,
                    description: "Include capped checkpoint body only when explicitly restoring a previous session.",
                },
                maxChars: {
                    type: "integer",
                    minimum: 500,
                    maximum: 12000,
                    default: DEFAULT_RESTORE_MAX_CHARS,
                },
            },
            additionalProperties: false,
        },
        execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
            publish(ctx);
            return lifecycleStatusResult(state, {
                includeContent: params?.includeContent === true,
                maxChars: typeof params?.maxChars === "number" ? params.maxChars : DEFAULT_RESTORE_MAX_CHARS,
            });
        },
    });
}
