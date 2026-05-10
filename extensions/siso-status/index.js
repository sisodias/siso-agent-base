import { existsSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync, closeSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CustomEditor } from "@mariozechner/pi-coding-agent";
import { Container, Key, Loader, matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { applyEvent, createStatusState, formatContextExplain, toStatusLine, toText, toTimelineWidgetLines, toWidgetLines, } from "./status-state.js";
import { readDuplicateRequestReport, readLatestMetricsDashboard, readLatestMetricsTable } from "./bifrost-metrics.js";
import { isRecordVisibleToScope, taskBudgetState, writeScopedTaskRecord } from "../siso-agent-router/task-registry.js";
import { projectSessionRouterStatus, writeSessionAgent } from "../siso-agent-router/session-store.js";
const DEFAULT_STATUS_PREFIX = "[siso-status]";
const MAX_WIDGET_LINES = 4;
function publish(ctx, state, promptQueue = []) {
    if (!ctx?.hasUI || !ctx.ui)
        return;
    scopeRouterStatusToContext(ctx);
    const uiMode = process.env.SISO_STATUS_UI ?? "off";
    const showStatus = uiMode === "compact" || uiMode === "full";
    const statusWidgetLines = uiMode === "full" ? toWidgetLines(state) : [];
    const showTimeline = process.env.SISO_STATUS_TIMELINE === "1";
    const timelineLines = uiMode === "full" && showTimeline ? toTimelineWidgetLines(state, 3) : [];
    const queueLines = promptQueue.length > 0 ? queueWidgetLines(promptQueue) : [];
    const widget = buildWidgetContent(statusWidgetLines, timelineLines, queueLines);
    ctx.ui.setStatus?.("siso-status", showStatus ? toStatusLine(state) : undefined);
    ctx.ui.setWidget?.("siso-status", widget, { placement: "belowEditor" });
}
function scopeRouterStatusToContext(ctx) {
    const current = currentSessionId(ctx);
    const router = globalThis.__SISO_ROUTER_STATUS__;
    if (!current)
        return;
    const projection = projectSessionRouterStatus({ parentSessionId: current, ownerAgentId: current });
    const routerChildren = Object.fromEntries(Object.entries(router?.children ?? {}).filter(([, child]) => isRecordVisibleToScope(child, {
        parentSessionId: current,
        ownerAgentId: current,
    })));
    const children = {
        ...(projection.children ?? {}),
        ...routerChildren,
    };
    const child = router?.child?.id && children[router.child.id] ? router.child : Object.values(children)[0];
    const activeChildId = router?.activeChildId && children[router.activeChildId] ? router.activeChildId : child?.id;
    if (router && Object.keys(children).length === Object.keys(router.children ?? {}).length && child === router.child && activeChildId === router.activeChildId)
        return;
    globalThis.__SISO_ROUTER_STATUS__ = {
        ...(router ?? {}),
        profile: child?.profile,
        lane: child?.lane,
        model: child?.model,
        children,
        child,
        activeChildId,
        tokens: child?.tokens,
        updatedAt: new Date().toISOString(),
    };
}
function buildWidgetContent(agentLines, timelineLines, queueLines) {
    const sections = allocateWidgetLines(agentLines, timelineLines, queueLines);
    agentLines = sections.agentLines;
    timelineLines = sections.timelineLines;
    queueLines = sections.queueLines;
    if (agentLines.length === 0 && timelineLines.length === 0 && queueLines.length === 0)
        return undefined;
    if (agentLines.length === 0 && timelineLines.length === 0)
        return queueLines;
    return (tui, theme) => {
        const container = new Container();
        const loaders = [];
        for (const line of agentLines) {
            const loader = new Loader(tui, (spinner) => theme.fg("accent", spinner), (text) => theme.fg("muted", text), line);
            loaders.push(loader);
            container.addChild(loader);
        }
        if (timelineLines.length > 0) {
            for (const line of timelineLines) {
                container.addChild(new Text(line, 0, 0));
            }
        }
        if (queueLines.length > 0) {
            for (const line of queueLines) {
                container.addChild(new Text(line, 1, 0));
            }
        }
        const render = container.render.bind(container);
        container.render = (width) => render(width).filter((line) => line.trim() !== "").slice(0, MAX_WIDGET_LINES);
        container.dispose = () => {
            for (const loader of loaders)
                loader.stop();
        };
        return container;
    };
}
function allocateWidgetLines(agentLines, timelineLines, queueLines) {
    if (timelineLines.length > 0) {
        const nextTimelineLines = timelineLines.slice(0, Math.min(3, MAX_WIDGET_LINES));
        const remainingForAgents = Math.max(0, MAX_WIDGET_LINES - nextTimelineLines.length);
        return {
            agentLines: agentLines.slice(0, remainingForAgents),
            timelineLines: nextTimelineLines,
            queueLines: [],
        };
    }
    let remaining = MAX_WIDGET_LINES;
    const nextAgentLines = agentLines.slice(0, remaining);
    remaining -= nextAgentLines.length;
    const nextTimelineLines = remaining > 0 ? timelineLines.slice(0, remaining) : [];
    remaining -= nextTimelineLines.length;
    const nextQueueLines = remaining > 0 ? queueLines.slice(0, remaining) : [];
    return { agentLines: nextAgentLines, timelineLines: nextTimelineLines, queueLines: nextQueueLines };
}
function queueWidgetLines(queue) {
    const head = `queue ${queue.length} prompt${queue.length === 1 ? "" : "s"} · Shift+Enter queues · /siso-queue-pop loads next`;
    const previewLimit = queue.length > 3 ? 2 : 3;
    const preview = queue.slice(0, previewLimit).map((item, index) => `${index + 1} ○ ${truncate(item.text, 72)}`);
    const more = queue.length > previewLimit ? [`… ${queue.length - previewLimit} more`] : [];
    return [head, ...preview, ...more];
}
export default function sisoStatusExtension(pi) {
    const state = createStatusState();
    const lastCtxBySession = new Map();
    const notifiedChildren = new Set();
    const promptQueues = new Map();
    const queueForSession = (sessionId) => {
        let queue = promptQueues.get(sessionId);
        if (!queue) {
            queue = [];
            promptQueues.set(sessionId, queue);
        }
        return queue;
    };
    const renderAgentMessage = (message, options, theme) => {
        const record = message.details;
        if (!record)
            return new Text(String(message.content ?? ""), 0, 0);
        const text = renderChildRunCard(record, Boolean(options.expanded), theme);
        return new Text(text, 0, 0);
    };
    pi.registerMessageRenderer?.("siso-agent", renderAgentMessage);
    pi.registerMessageRenderer?.("siso-agent-completion", renderAgentMessage);
    const publishWith = (ctx) => {
        const sessionId = explicitSessionId(ctx);
        if (ctx?.hasUI && sessionId)
            lastCtxBySession.set(sessionId, ctx);
        publish(ctx, state, sessionId ? queueForSession(sessionId) : []);
    };
    const pollMs = Number.parseInt(process.env.SISO_STATUS_POLL_MS ?? "2000", 10);
    if (Number.isFinite(pollMs) && pollMs > 0) {
        const poll = setInterval(() => {
            for (const [sessionId, ctx] of lastCtxBySession) {
                const records = refreshRouterChildrenFromDisk(30, ctx);
                notifyCompletedChildren(pi, records, notifiedChildren);
                const children = Object.values(globalThis.__SISO_ROUTER_STATUS__?.children ?? {});
                if (children.some((child) => child.status === "background" || child.status === "running" || child.status === "starting")) {
                    publish(ctx, state, queueForSession(sessionId));
                }
                else if (children.length > 0) {
                    publish(ctx, state, queueForSession(sessionId));
                }
            }
        }, pollMs);
        poll.unref?.();
    }
    const emitStatus = () => {
        return `${DEFAULT_STATUS_PREFIX} ${toText(state)}`;
    };
    pi.on("session_start", (event, ctx) => {
        const payload = event;
        ctx?.ui?.setHiddenThinkingLabel?.("");
        const sessionId = explicitSessionId(ctx);
        installQueueEditor(ctx, {
            queueCurrentEditor: (editor) => sessionId ? queueCurrentEditor(queueForSession(sessionId), editor, ctx, publishWith) : true,
            queuedCount: () => sessionId ? queueForSession(sessionId).length : 0,
        });
        if (typeof payload.skill === "string") {
            state.currentSkill = payload.skill;
        }
        publishWith(ctx);
    });
    pi.on("before_agent_start", (event, ctx) => {
        applyEvent(state, "before_agent_start", event);
        publishWith(ctx);
    });
    pi.on("model_select", (event, ctx) => {
        applyEvent(state, "model_select", event);
        publishWith(ctx);
    });
    pi.on("before_provider_request", (event, ctx) => {
        applyEvent(state, "before_provider_request", event);
        publishWith(ctx);
    });
    pi.on("tool_call", (event, ctx) => {
        applyEvent(state, "tool_call", event);
        publishWith(ctx);
    });
    pi.on("tool_execution_start", (event, ctx) => {
        applyEvent(state, "tool_execution_start", event);
        publishWith(ctx);
    });
    pi.on("tool_execution_update", (event, ctx) => {
        applyEvent(state, "tool_execution_update", event);
        publishWith(ctx);
    });
    pi.on("tool_result", (event, ctx) => {
        applyEvent(state, "tool_result", event);
        publishWith(ctx);
    });
    pi.on("tool_execution_end", (event, ctx) => {
        applyEvent(state, "tool_execution_end", event);
        publishWith(ctx);
    });
    pi.registerCommand("siso-status", {
        description: "Prints the latest local status snapshot for model/route/tool metrics",
        handler: async () => {
            const result = {
                content: [
                    {
                        type: "text",
                        text: emitStatus(),
                    },
                ],
            };
            return result;
        },
    });
    pi.registerCommand("siso-context-explain", {
        description: "Explain the current provider input/context breakdown without dumping raw prompt text.",
        handler: async (_args, ctx) => {
            publishWith(ctx);
            return textResult(formatContextExplain(state));
        },
    });
    pi.registerCommand("siso-queue", {
        description: "Queue a prompt for later. Use /siso-queue-pop to load the next queued prompt into the editor.",
        handler: async (args, ctx) => {
            const sessionId = explicitSessionId(ctx);
            if (!sessionId)
                return textResult("current session required for prompt queue");
            const promptQueue = queueForSession(sessionId);
            const text = args.join(" ").trim();
            if (!text)
                return textResult(formatPromptQueue(promptQueue));
            const item = { id: `q-${Date.now().toString(36)}`, text, queuedAt: new Date().toISOString() };
            promptQueue.push(item);
            ctx?.ui?.notify?.(`Queued prompt ${promptQueue.length}`, "info");
            publishWith(ctx);
            return textResult(`queued ${promptQueue.length}: ${truncate(text, 160)}\n\n${formatPromptQueue(promptQueue)}`);
        },
    });
    pi.registerCommand("siso-queue-list", {
        description: "List queued SISO prompts.",
        handler: async (_args, ctx) => {
            const sessionId = explicitSessionId(ctx);
            return textResult(sessionId ? formatPromptQueue(queueForSession(sessionId)) : "current session required for prompt queue");
        },
    });
    pi.registerCommand("siso-queue-pop", {
        description: "Load the next queued prompt into the Pi editor without auto-running it.",
        handler: async (_args, ctx) => {
            const sessionId = explicitSessionId(ctx);
            if (!sessionId)
                return textResult("current session required for queue pop");
            const promptQueue = queueForSession(sessionId);
            const item = promptQueue.shift();
            if (!item)
                return textResult("queue empty");
            const targetCtx = ctx;
            targetCtx?.ui?.setEditorText?.(item.text);
            targetCtx?.ui?.notify?.("Loaded queued prompt into editor", "info");
            publishWith(targetCtx);
            return textResult(`loaded queued prompt into editor:\n${item.text}`);
        },
    });
    pi.registerCommand("siso-queue-clear", {
        description: "Clear queued SISO prompts.",
        handler: async (_args, ctx) => {
            const sessionId = explicitSessionId(ctx);
            if (!sessionId)
                return textResult("current session required for prompt queue");
            const promptQueue = queueForSession(sessionId);
            const cleared = promptQueue.length;
            promptQueue.splice(0, promptQueue.length);
            publishWith(ctx);
            return textResult(`cleared ${cleared} queued prompt${cleared === 1 ? "" : "s"}`);
        },
    });
    pi.registerCommand("siso-bifrost-metrics", {
        description: "Prints latest Bifrost prompt/tool section breakdown rows",
        handler: async (args) => {
            const limit = Number(args[0] ?? 3);
            const result = {
                content: [
                    {
                        type: "text",
                        text: await readLatestMetricsTable(undefined, Number.isFinite(limit) ? limit : 3),
                    },
                ],
            };
            return result;
        },
    });
    pi.registerCommand("siso-bifrost-dashboard", {
        description: "Prints a compact dashboard summary of recent Bifrost prompt/tool telemetry",
        handler: async (args) => {
            const limit = Number(args[0] ?? 20);
            const result = {
                content: [
                    {
                        type: "text",
                        text: await readLatestMetricsDashboard(undefined, Number.isFinite(limit) ? limit : 20),
                    },
                ],
            };
            return result;
        },
    });
    pi.registerCommand("siso-bifrost-duplicates", {
        description: "Prints near-duplicate Bifrost request groups from recent prompt/tool telemetry",
        handler: async (args) => {
            const limit = Number(args[0] ?? 50);
            return textResult(await readDuplicateRequestReport(undefined, Number.isFinite(limit) ? limit : 50));
        },
    });
    if (process.env.SISO_STATUS_TOOL_MODE === "lean") {
        return;
    }
    pi.registerTool?.({
        name: "siso_status",
        label: "SISO Status",
        description: "Compact SISO observability surface. op=status returns local HUD state; op=context explains current context; op=metrics returns recent Bifrost rows; op=dashboard aggregates recent Bifrost telemetry.",
        parameters: {
            type: "object",
            properties: {
                op: {
                    type: "string",
                    enum: ["status", "context", "metrics", "dashboard"],
                    description: "Defaults to status.",
                },
                limit: {
                    type: "number",
                    description: "Rows to read for metrics/dashboard.",
                },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
            publishWith(ctx);
            if (params.op === "context") {
                return {
                    content: [{ type: "text", text: formatContextExplain(state) }],
                };
            }
            if (params.op === "metrics") {
                return {
                    content: [{ type: "text", text: await readLatestMetricsTable(undefined, typeof params.limit === "number" ? params.limit : 3) }],
                };
            }
            if (params.op === "dashboard") {
                return {
                    content: [{ type: "text", text: await readLatestMetricsDashboard(undefined, typeof params.limit === "number" ? params.limit : 20) }],
                };
            }
            const result = {
                content: [
                    {
                        type: "text",
                        text: emitStatus(),
                    },
                ],
            };
            return result;
        },
    });
    pi.registerTool?.({
        name: "siso_bifrost_metrics",
        label: "SISO Bifrost Metrics",
        description: "Return recent Bifrost input breakdown rows as a compact table with section categories, top text blocks, and top tool schemas.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of latest rows to show. Defaults to 3.",
                },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const limit = typeof params.limit === "number" ? params.limit : 3;
            const result = {
                content: [
                    {
                        type: "text",
                        text: await readLatestMetricsTable(undefined, limit),
                    },
                ],
            };
            return result;
        },
    });
    pi.registerTool?.({
        name: "siso_bifrost_dashboard",
        label: "SISO Bifrost Dashboard",
        description: "Return compact aggregate telemetry from recent Bifrost rows: request sizes, tool sizes, models, sections, and latest SISO child result.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of latest rows to aggregate. Defaults to 20.",
                },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const limit = typeof params.limit === "number" ? params.limit : 20;
            const result = {
                content: [
                    {
                        type: "text",
                        text: await readLatestMetricsDashboard(undefined, limit),
                    },
                ],
            };
            return result;
        },
    });
    pi.registerTool?.({
        name: "siso_bifrost_duplicates",
        label: "SISO Bifrost Duplicates",
        description: "Return near-duplicate Bifrost request groups with timestamps, coarse prompt shape, model, body size, dominant section, and SISO profile counts.",
        parameters: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Number of latest rows to inspect. Defaults to 50.",
                },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const limit = typeof params.limit === "number" ? params.limit : 50;
            return textResult(await readDuplicateRequestReport(undefined, limit));
        },
    });
}
function textResult(text) {
    return { content: [{ type: "text", text }] };
}
function queueCurrentEditor(queue, editor, ctx, publishWith) {
    const text = editor.getText().trim();
    if (!text) {
        ctx?.ui?.notify?.("Nothing to queue", "warning");
        return true;
    }
    queue.push({ id: `q-${Date.now().toString(36)}`, text, queuedAt: new Date().toISOString() });
    editor.setText("");
    ctx?.ui?.notify?.(`Queued prompt ${queue.length}`, "info");
    publishWith(ctx);
    return true;
}
class SisoQueueEditor extends CustomEditor {
    controller;
    constructor(tui, theme, keybindings, controller) {
        super(tui, theme, keybindings);
        this.controller = controller;
    }
    handleInput(data) {
        if (matchesKey(data, Key.shift("enter")) || matchesKey(data, Key.ctrl("enter"))) {
            this.controller.queueCurrentEditor(this);
            return;
        }
        super.handleInput(data);
    }
    render(width) {
        const lines = super.render(width);
        const queued = this.controller.queuedCount();
        if (queued > 0 && lines.length > 0) {
            const label = ` queue ${queued} `;
            const last = lines[lines.length - 1] ?? "";
            lines[lines.length - 1] = truncateToWidth(last, Math.max(0, width - label.length), "") + label;
        }
        return lines;
    }
}
function installQueueEditor(ctx, controller) {
    if (!ctx?.hasUI || !ctx.ui?.setEditorComponent)
        return;
    ctx.ui.setEditorComponent((tui, theme, keybindings) => new SisoQueueEditor(tui, theme, keybindings, controller));
}
function formatPromptQueue(queue) {
    if (queue.length === 0)
        return "queue empty";
    return queue.map((item, index) => `${index + 1}. ${truncate(item.text, 180)} · queued ${ageSince(item.queuedAt)}`).join("\n");
}
function ageSince(iso) {
    if (!iso)
        return "now";
    const ms = Math.max(0, Date.now() - Date.parse(iso));
    if (!Number.isFinite(ms))
        return "now";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 5)
        return "now";
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
}
function currentSessionId(ctx) {
    return explicitSessionId(ctx) ?? process.env.CLAUDE_SESSION_ID ?? process.env.SISO_PARENT_SESSION_ID ?? process.env.PI_SESSION_ID ?? process.env.SISO_SESSION_ID;
}
function explicitSessionId(ctx) {
    const fromCtx = ctx && typeof ctx.sessionId === "string" && ctx.sessionId ? ctx.sessionId : undefined;
    const sessionManager = ctx?.sessionManager && typeof ctx.sessionManager === "object" ? ctx.sessionManager : undefined;
    const fromManager = typeof sessionManager?.currentSessionId === "string" && sessionManager.currentSessionId ? sessionManager.currentSessionId : undefined;
    return fromCtx ?? fromManager;
}
function childRunDir() {
    return process.env.SISO_CHILD_RUN_DIR ?? join(homedir(), ".siso", "agent", "child-runs");
}
function refreshRouterChildrenFromDisk(limit = 30, ctx) {
    const dir = childRunDir();
    let records = [];
    try {
        records = readdirSync(dir)
            .filter((name) => name.endsWith(".json") && !name.endsWith(".exit.json"))
            .map((name) => join(dir, name))
            .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
            .slice(0, limit)
            .map((path) => {
            try {
                return JSON.parse(readFileSync(path, "utf8"));
            }
            catch {
                return undefined;
            }
        })
            .filter((record) => Boolean(record));
    }
    catch {
        return [];
    }
    const current = explicitSessionId(ctx);
    if (current) {
        records = records.filter((record) => isRecordVisibleToScope(record, { parentSessionId: current }));
    }
    else if (process.env.SISO_STATUS_GLOBAL_HUD === "1" || process.env.SISO_STATUS_ADMIN_GLOBAL === "1") {
        records = records.filter((record) => isActiveRecordStatus(record.status) && isLiveChildProcess(record.pid));
    }
    else {
        records = [];
    }
    if (records.length === 0) {
        globalThis.__SISO_ROUTER_STATUS__ = {
            ...globalThis.__SISO_ROUTER_STATUS__,
            children: {},
            child: undefined,
            activeChildId: undefined,
            updatedAt: new Date().toISOString(),
        };
        return [];
    }
    const refreshed = records.map(refreshRecordFromExit);
    for (const record of refreshed)
        writeSessionAgent(record);
    const children = Object.fromEntries(refreshed.map((record) => {
        return [record.id, {
                id: record.id,
                status: record.status,
                task: record.task,
                profile: record.profile,
                lane: record.lane,
                model: record.model,
                startedAt: record.startedAt,
                updatedAt: record.updatedAt,
                pid: record.pid,
                rootSessionId: record.rootSessionId,
                parentSessionId: record.parentSessionId,
                ownerAgentId: record.ownerAgentId,
                spawnedByTaskId: record.spawnedByTaskId,
                depth: record.depth,
                exitCode: record.exitCode,
                tokens: record.tokens,
                toolCalls: record.toolCalls,
                compactResult: record.compactResult,
                error: record.error,
                runRecordPath: record.runRecordPath,
            }];
    }));
    globalThis.__SISO_ROUTER_STATUS__ = {
        ...globalThis.__SISO_ROUTER_STATUS__,
        children,
        child: Object.values(children)[0],
        activeChildId: Object.values(children)[0]?.id,
        updatedAt: new Date().toISOString(),
    };
    return refreshed;
}
function readExit(path) {
    if (!path || !existsSync(path))
        return undefined;
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    }
    catch {
        return undefined;
    }
}
function refreshRecordFromExit(record) {
    if (record.status === "background") {
        const exit = readExit(record.exitPath);
        const stdoutOffset = record.progress?.stdoutOffset ?? 0;
        const stdout = exit ? { text: readText(record.stdoutPath), nextOffset: undefined } : readTextDelta(record.stdoutPath, stdoutOffset);
        const parsed = parseChildOutput(stdout.text);
        const stderr = readText(record.stderrPath);
        if (exit) {
            const hasCapturedChildResult = Boolean(parsed.finalOutput.trim()) || parsed.tokens.totalTokens > 0 || parsed.toolCalls > 0;
            const supervisorOnly = !hasCapturedChildResult && !stderr.trim() && (record.compactResult?.summary ?? "").startsWith("background child supervisor started");
            const completed = exit.exitCode === 0 && !exit.error && !supervisorOnly;
            const error = supervisorOnly ? "Background child exited without captured output." : exit.error ?? stderr ?? record.error;
            const next = {
                ...record,
                status: completed ? "completed" : "failed",
                updatedAt: exit.completedAt ?? new Date().toISOString(),
                exitCode: exit.exitCode ?? record.exitCode,
                tokens: parsed.tokens.totalTokens > 0 ? parsed.tokens : record.tokens,
                toolCalls: parsed.toolCalls || record.toolCalls,
                compactResult: compactChildResult(parsed.finalOutput || stderr || error || record.compactResult?.summary || ""),
                error: completed ? record.error : error,
            };
            writeChildRecord(next);
            return next;
        }
        const nextTokens = parsed.tokens.totalTokens > 0 ? parsed.tokens : record.tokens;
        const nextToolCalls = (record.toolCalls ?? 0) + parsed.toolCalls;
        const nextCompactResult = parsed.finalOutput.trim() ? compactChildResult(parsed.finalOutput) : record.compactResult;
        const changed = (nextTokens?.totalTokens ?? 0) !== (record.tokens?.totalTokens ?? 0) ||
            (nextToolCalls ?? 0) !== (record.toolCalls ?? 0) ||
            (nextCompactResult?.summary ?? "") !== (record.compactResult?.summary ?? "") ||
            stdout.nextOffset !== stdoutOffset;
        if (changed) {
            const next = {
                ...record,
                updatedAt: new Date().toISOString(),
                tokens: nextTokens,
                toolCalls: nextToolCalls,
                compactResult: nextCompactResult,
                progress: {
                    ...(record.progress ?? {}),
                    stdoutOffset: stdout.nextOffset ?? stdoutOffset,
                },
            };
            const governed = enforceBudgetForRecord(next);
            if (governed === next)
                writeChildRecord(next);
            return governed;
        }
        return enforceBudgetForRecord(record);
    }
    if (isActiveRecordStatus(record.status) && record.pid && !isLiveChildProcess(record.pid)) {
        const next = {
            ...record,
            status: "aborted",
            updatedAt: new Date().toISOString(),
            error: record.error ?? "Child process is no longer running.",
            compactResult: record.compactResult?.summary
                ? record.compactResult
                : compactChildResult("Child process is no longer running."),
        };
        writeChildRecord(next);
        return next;
    }
    return record;
}
function enforceBudgetForRecord(record) {
    if (!isActiveRecordStatus(record.status))
        return record;
    const budget = taskBudgetState(record);
    if (!budget.exceededAny)
        return record;
    signalChildTree(record.pid, "SIGTERM");
    const next = {
        ...record,
        status: "aborted",
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: budget.reason,
        compactResult: compactChildResult(budget.reason),
        budget: budget.budget,
        budgetEnforcedAt: new Date().toISOString(),
    };
    writeChildRecord(next);
    return next;
}
function writeChildRecord(record) {
    try {
        if (record.runRecordPath) {
            writeFileSync(record.runRecordPath, `${JSON.stringify(record, null, 2)}\n`);
            writeScopedTaskRecord(record);
        }
    }
    catch { }
}
function signalChildTree(pid, signal) {
    if (!isLiveChildProcess(pid))
        return;
    try {
        process.kill(-pid, signal);
    }
    catch {
        try {
            process.kill(pid, signal);
        }
        catch { }
    }
}
function isActiveRecordStatus(status) {
    return status === "starting" || status === "running" || status === "background";
}
function isLiveChildProcess(pid) {
    if (typeof pid !== "number" || !Number.isFinite(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function completionInjectionMode() {
    const mode = process.env.SISO_AGENT_COMPLETION_INJECT;
    return mode === "1" || mode === "entry" ? "entry" : "off";
}
function notifyCompletedChildren(pi, records, notified) {
    if (completionInjectionMode() === "off")
        return;
    for (const record of records) {
        if (!isTerminalRecordStatus(record.status))
            continue;
        if (record.notified)
            continue;
        if (notified.has(record.id))
            continue;
        notified.add(record.id);
        const notification = {
            id: record.id,
            status: record.status,
            task: record.task,
            profile: record.profile,
            model: record.model,
            startedAt: record.startedAt,
            completedAt: record.completedAt ?? record.updatedAt,
            durationMs: record.durationMs,
            runRecordPath: record.runRecordPath,
            compactResult: record.compactResult,
            error: record.error,
            tokens: record.tokens,
            toolCalls: record.toolCalls,
        };
        pi.appendEntry?.("siso-agent-completion", notification);
        markChildRecordNotified(record);
    }
}
function isTerminalRecordStatus(status) {
    return status === "completed" || status === "failed" || status === "timeout" || status === "aborted" || status === "unsupported";
}
function markChildRecordNotified(record) {
    if (!record.runRecordPath)
        return;
    try {
        writeFileSync(record.runRecordPath, `${JSON.stringify({ ...record, notified: true }, null, 2)}\n`);
        record.notified = true;
    }
    catch { }
}
function readText(path) {
    if (!path)
        return "";
    try {
        return readFileSync(path, "utf8");
    }
    catch {
        return "";
    }
}
function readTextDelta(path, offset = 0) {
    if (!path)
        return { text: "", nextOffset: offset };
    let fd;
    try {
        const size = statSync(path).size;
        const start = Math.max(0, Math.min(offset, size));
        const length = size - start;
        if (length <= 0)
            return { text: "", nextOffset: size };
        fd = openSync(path, "r");
        const buffer = Buffer.alloc(length);
        readSync(fd, buffer, 0, length, start);
        return { text: buffer.toString("utf8"), nextOffset: size };
    }
    catch {
        return { text: "", nextOffset: offset };
    }
    finally {
        if (fd !== undefined) {
            try {
                closeSync(fd);
            }
            catch { }
        }
    }
}
function parseChildOutput(text) {
    const state = { finalOutput: "", tokens: { input: 0, output: 0, totalTokens: 0 }, toolCalls: 0 };
    for (const line of text.split(/\r?\n/)) {
        if (!line.trim())
            continue;
        let event;
        try {
            event = JSON.parse(line);
        }
        catch {
            continue;
        }
        if (event.type === "tool_call" || event.type === "tool_start")
            state.toolCalls += 1;
        if (event.type === "turn.completed" && event.usage && typeof event.usage === "object") {
            const usage = event.usage;
            const input = typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
            const output = typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
            state.tokens = { input, output, totalTokens: input + output };
        }
        const message = event.message;
        if ((event.type === "message_end" || event.type === "turn_end") && message && typeof message === "object") {
            state.finalOutput = textFromMessage(message);
            const usage = message.usage;
            if (usage && typeof usage === "object") {
                const record = usage;
                const input = typeof record.input === "number" ? record.input : 0;
                const output = typeof record.output === "number" ? record.output : 0;
                const totalTokens = typeof record.totalTokens === "number" ? record.totalTokens : input + output;
                state.tokens = { input, output, totalTokens };
            }
        }
        if (event.type === "item.completed" && event.item && typeof event.item === "object") {
            const item = event.item;
            if (item.type === "agent_message" && typeof item.text === "string")
                state.finalOutput = item.text;
            if (item.type === "function_call")
                state.toolCalls += 1;
        }
    }
    return state;
}
function textFromMessage(value) {
    if (!value || typeof value !== "object")
        return "";
    const content = value.content;
    if (!Array.isArray(content))
        return "";
    return content.map((item) => item && typeof item === "object" && typeof item.text === "string" ? item.text : "").join("");
}
function compactChildResult(text) {
    const parsed = jsonObjectFrom(text);
    if (parsed) {
        return {
            summary: truncate(typeof parsed.summary === "string" ? parsed.summary : "Child completed without a summary.", 300),
            findings: stringArray(parsed.findings, 5, 240),
            files: stringArray(parsed.files, 8, 220),
            next_action: truncate(typeof parsed.next_action === "string" ? parsed.next_action : "Parent should inspect the child result.", 240),
        };
    }
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return {
        summary: truncate(lines[0] ?? "Child completed without text output.", 300),
        findings: lines.slice(1, 6).map((line) => truncate(line.replace(/^[-*]\s*/, ""), 240)),
        files: [],
        next_action: "Parent should inspect the child result.",
    };
}
function jsonObjectFrom(text) {
    const trimmed = text.trim();
    for (const candidate of [trimmed, trimmed.match(/\{[\s\S]*\}/)?.[0]]) {
        if (!candidate)
            continue;
        try {
            const value = JSON.parse(candidate);
            if (value && typeof value === "object" && !Array.isArray(value))
                return value;
        }
        catch { }
    }
    return undefined;
}
function stringArray(value, limit, maxChars) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, limit).map((item) => truncate(item, maxChars)) : [];
}
function renderChildRunCard(record, expanded, theme) {
    const glyph = childGlyph(record.status);
    const color = childColor(record.status);
    const status = theme.fg(color, glyph);
    const title = theme.bold(`Agent ${childStatusWord(record.status)}`);
    const role = compactAgentRole(record.profile);
    const checks = `${record.toolCalls ?? 0} check${record.toolCalls === 1 ? "" : "s"}`;
    const duration = childDuration(record);
    const meta = [
        role,
        record.toolCalls ? checks : undefined,
        duration,
        record.tokens?.totalTokens ? `${formatTokens(record.tokens.totalTokens)} tok` : undefined,
    ].filter(Boolean).join(` ${theme.fg("dim", "·")} `);
    const summary = truncate(record.compactResult?.summary ?? record.error ?? "Child finished without a summary.", 140);
    let text = [
        `${status} ${title} ${theme.fg("dim", "·")} ${theme.fg("muted", meta)}`,
        `  ${theme.fg("dim", "│")} ${theme.fg("muted", summary)}`,
    ].join("\n");
    if (expanded) {
        const result = record.compactResult;
        const findings = result?.findings?.slice(0, 5).map((item) => `  ${theme.fg("dim", "├")} ${truncate(item, 160)}`).join("\n");
        const files = result?.files?.slice(0, 4).map((item) => `  ${theme.fg("dim", "├ file")} ${truncate(item, 140)}`).join("\n");
        const next = result?.next_action ? `\n  ${theme.fg("dim", "╰ next")} ${truncate(result.next_action, 160)}` : "";
        const report = record.runRecordPath ? `\n  ${theme.fg("dim", "report")} ${record.runRecordPath}` : "";
        text += `${findings ? `\n${findings}` : ""}${files ? `\n${files}` : ""}${next}${report}`;
    }
    else {
        text += `\n  ${theme.fg("dim", "╰ summary compact")}`;
    }
    return text;
}
function childGlyph(status) {
    if (status === "completed")
        return "✓";
    if (status === "running" || status === "starting" || status === "background")
        return "◐";
    if (status === "cancelled" || status === "aborted")
        return "⊘";
    if (status === "failed" || status === "error" || status === "timeout")
        return "×";
    return "○";
}
function childStatusWord(status) {
    if (status === "completed")
        return "complete";
    if (status === "running" || status === "background")
        return "running";
    if (status === "starting")
        return "starting";
    return status ?? "status";
}
function compactAgentRole(profile) {
    const value = String(profile ?? "").split(".").filter(Boolean).at(-1);
    return value || "agent";
}
function childDuration(record) {
    if (record.durationMs && Number.isFinite(record.durationMs))
        return formatClockDuration(record.durationMs);
    const start = Date.parse(record.startedAt ?? "");
    const end = Date.parse(record.completedAt ?? record.updatedAt ?? "");
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start)
        return formatClockDuration(end - start);
    return undefined;
}
function formatClockDuration(ms) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function childColor(status) {
    if (status === "completed")
        return "success";
    if (status === "failed" || status === "error" || status === "timeout")
        return "error";
    if (status === "cancelled" || status === "aborted")
        return "muted";
    if (status === "running" || status === "starting" || status === "background")
        return "warning";
    return "muted";
}
function truncate(value, limit) {
    const trimmed = value.trim();
    return trimmed.length <= limit ? trimmed : `${trimmed.slice(0, limit - 1)}…`;
}
function displayModel(model) {
    const map = {
        "claude-haiku-4-5-20251001": "MiniMax M2.7",
        "claude-sonnet-4-6": "Spark",
        "claude-opus-4-7": "Oracle GPT-5.5",
        "gpt-5.4-mini": "GPT-5.4 Mini",
        "gpt-5.5": "Oracle GPT-5.5",
        "gpt-5.3-codex-spark": "Spark",
        "MiniMax-M2.7-highspeed": "MiniMax M2.7",
    };
    return map[model] ?? model;
}
function formatTokens(tokens) {
    if (tokens >= 1_000_000)
        return `${(tokens / 1_000_000).toFixed(1)}m`;
    if (tokens >= 1000)
        return `${Math.round(tokens / 100) / 10}k`;
    return String(tokens);
}
