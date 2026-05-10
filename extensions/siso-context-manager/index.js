import { Text } from "@mariozechner/pi-tui";
import { deterministicDistill, minimaxDistill, promoteProjectMemories } from "./distill.js";
import { appendContextEvent, appendMemoryItems, defaultRoot, estimateTokensFromText, latestRunIds, newId, readRunEvents, readRunMemory, storeStats } from "./store.js";
import { analyzeSupersede, formatSupersedeReport } from "./supersede.js";
import { formatRetrievalPointers, retrieveEvent } from "./retrieve.js";
import { filterContextMessages } from "./filter.js";
import { estimateProviderPayloadMetrics, filterProviderPayload } from "./provider-filter.js";
import { centralMemoryStats, formatCentralMemory, promoteTypedMemories, readCentralMemory } from "./typed-memory.js";
import { appendLibrarianLog, buildCodexCasePacket, chooseLibrarianRun, librarianPolicyFromEnv, renderLibrarianStatus, updateLibrarianStateAfterRun } from "./librarian.js";
function sessionRunId(sessionId) {
    return process.env.SISO_CONTEXT_RUN_ID || sessionId || process.env.PI_SESSION_ID || newId("run");
}
function explicitSessionId(ctx, event) {
    const ctxRecord = ctx;
    const sessionManager = ctxRecord?.sessionManager && typeof ctxRecord.sessionManager === "object"
        ? ctxRecord.sessionManager
        : undefined;
    const candidates = [
        event?.session_id,
        event?.sessionId,
        ctxRecord?.sessionId,
        sessionManager?.currentSessionId,
    ];
    return candidates.find((value) => typeof value === "string" && value.length > 0);
}
function createContextState(sessionId) {
    return { sessionId, runId: sessionRunId(sessionId), cwd: process.cwd(), pending: [], captured: 0, memories: 0, tokens: 0, filtered: 0, filterSavedTokens: 0, librarian: { turnsSinceSemantic: 0, tokensSinceSemantic: 0, largeFiltersSinceSemantic: 0, semanticRuns: 0, localRuns: 0 } };
}
function textFrom(value, max = 8000) {
    if (typeof value === "string")
        return value.slice(0, max);
    if (value === undefined || value === null)
        return "";
    try {
        return JSON.stringify(value).slice(0, max);
    }
    catch {
        return String(value).slice(0, max);
    }
}
function eventText(eventName, event) {
    if (typeof event.text === "string")
        return event.text;
    if (typeof event.prompt === "string")
        return event.prompt;
    if (typeof event.content === "string")
        return event.content;
    if (typeof event.result === "string")
        return event.result;
    if (typeof event.error === "string")
        return event.error;
    if (eventName === "before_provider_request")
        return textFrom(event.payload, 4000);
    return textFrom(event, 3000);
}
function cwdFrom(event, fallback) {
    return typeof event.cwd === "string" ? event.cwd : fallback;
}
function toolNameFrom(event) {
    return typeof event.toolName === "string" ? event.toolName : typeof event.name === "string" ? event.name : undefined;
}
function kindFor(eventName) {
    if (eventName === "input" || eventName === "user_prompt")
        return "input";
    if (eventName === "message_end" || eventName === "assistant")
        return "assistant";
    if (eventName === "tool_call" || eventName === "tool_execution_start")
        return "tool_call";
    if (eventName === "tool_result" || eventName === "tool_execution_end")
        return "tool_result";
    if (eventName === "before_provider_request")
        return "provider";
    return "lifecycle";
}
function publish(ctx, state) {
    const mode = process.env.SISO_CONTEXT_UI ?? "compact";
    if (!ctx?.hasUI || mode === "off")
        return;
    ctx.ui?.setStatus?.("siso-context", `ctxmgr ${state.captured}e ${state.memories}m ${state.tokens}t ${state.filtered}f`);
    if (mode === "full") {
        ctx.ui?.setWidget?.("siso-context", [
            `context-manager run=${state.runId}`,
            `captured=${state.captured} pending=${state.pending.length} memories=${state.memories} tokens=${state.tokens}`,
            `filtered=${state.filtered} saved_tokens=${state.filterSavedTokens}`,
            `last=${state.lastDistill ?? "none"}${state.lastError ? ` error=${state.lastError}` : ""}`,
            `librarian=semantic:${state.librarian.semanticRuns} local:${state.librarian.localRuns} turns:${state.librarian.turnsSinceSemantic} tokens:${state.librarian.tokensSinceSemantic}`,
        ], { placement: "belowEditor" });
    }
}
async function distillPending(state, ctx, mode = "semantic", reason = "manual") {
    if (!state.sessionId)
        return "Current session required to distill pending context events.";
    const pending = state.pending.splice(0, state.pending.length);
    if (pending.length === 0)
        return "No pending context events.";
    const semantic = mode === "semantic" ? await minimaxDistill(pending) : undefined;
    const actualMode = semantic ? "semantic" : "local";
    const result = semantic ?? deterministicDistill(pending);
    appendMemoryItems(state.runId, result.items);
    const promoted = promoteProjectMemories(result.items);
    const typedPromoted = promoteTypedMemories(result.items, { agent: process.env.SISO_AGENT_PROFILE ?? process.env.PI_AGENT_NAME ?? "pi-codex" });
    state.memories += result.items.length;
    updateLibrarianStateAfterRun(state.librarian, result, actualMode, reason);
    const status = renderLibrarianStatus(result, actualMode, reason);
    state.lastDistill = `${result.items.length} items (${promoted.length} project, ${typedPromoted.length} typed) ${actualMode}`;
    appendLibrarianLog(defaultRoot(), status);
    publish(ctx, state);
    return [status, `distilled_events=${pending.length}`, `items=${result.items.length}`, `promoted=${promoted.length}`, `tokens=${result.inputTokens}`, `summary=${result.summary}`].join("\n");
}
function statusText(state) {
    const stats = storeStats();
    return [
        "SISO_CONTEXT_MANAGER",
        `run_id=${state.runId}`,
        `captured=${state.captured}`,
        `pending=${state.pending.length}`,
        `memories=${state.memories}`,
        `estimated_tokens=${state.tokens}`,
        `filtered=${state.filtered}`,
        `filter_saved_tokens=${state.filterSavedTokens}`,
        `store_runs=${stats.runs}`,
        `store_memories=${stats.memories}`,
        `project_memories=${stats.projectMemories}`,
        `central_memories=${centralMemoryStats().memories}`,
        `root=${stats.root}`,
        `minimax_librarian=${process.env.SISO_CONTEXT_SEMANTIC_LIBRARIAN === "0" ? "disabled" : "enabled"}`,
        ...(state.lastDistill ? [`last_distill=${state.lastDistill}`] : []),
        `librarian_semantic_runs=${state.librarian.semanticRuns}`,
        `librarian_local_runs=${state.librarian.localRuns}`,
        `librarian_turns_since_semantic=${state.librarian.turnsSinceSemantic}`,
        `librarian_tokens_since_semantic=${state.librarian.tokensSinceSemantic}`,
        `librarian_large_filters_since_semantic=${state.librarian.largeFiltersSinceSemantic}`,
    ].join("\n");
}
function compactDetailText(text, limit = 500) {
    const value = typeof text === "string" ? text : "";
    if (value.length <= limit) {
        return { textPreview: value, textChars: value.length, truncatedTextChars: 0 };
    }
    return {
        textPreview: `[${value.length} chars omitted from details; use the rendered text or a retrieve pointer for raw content]`,
        textChars: value.length,
        truncatedTextChars: value.length,
    };
}
function compactMemoryItem(item) {
    const { textPreview, textChars, truncatedTextChars } = compactDetailText(item?.text, 500);
    return {
        category: item?.category,
        importance: item?.importance,
        confidence: item?.confidence,
        scope: item?.scope,
        cwd: item?.cwd,
        runId: item?.runId,
        ts: item?.ts,
        sourceIds: Array.isArray(item?.sourceIds) ? item.sourceIds.slice(0, 8) : [],
        textPreview,
        textChars,
        truncatedTextChars,
    };
}
function compactCentralRow(row) {
    const { textPreview, textChars, truncatedTextChars } = compactDetailText(row?.content, 500);
    return {
        id: row?.id,
        type: row?.type,
        projectKey: row?.projectKey,
        agent: row?.agent,
        runId: row?.runId,
        ts: row?.ts,
        key: row?.key,
        status: row?.status,
        confidence: row?.confidence,
        importance: row?.importance,
        sourceIds: Array.isArray(row?.sourceIds) ? row.sourceIds.slice(0, 8) : [],
        corroboratedBy: Array.isArray(row?.corroboratedBy) ? row.corroboratedBy.slice(0, 8) : [],
        conflictsWith: Array.isArray(row?.conflictsWith) ? row.conflictsWith.slice(0, 8) : [],
        contentPreview: textPreview,
        contentChars: textChars,
        truncatedContentChars: truncatedTextChars,
    };
}
function compactCandidate(candidate) {
    return {
        eventId: candidate?.eventId,
        keptEventId: candidate?.keptEventId,
        reason: candidate?.reason,
        estimatedTokens: candidate?.estimatedTokens,
        summary: typeof candidate?.summary === "string" && candidate.summary.length > 500
            ? `${candidate.summary.slice(0, 500)}...`
            : candidate?.summary,
    };
}
function compactContextEvent(event) {
    const { textPreview, textChars, truncatedTextChars } = compactDetailText(event?.text, 500);
    return {
        id: event?.id,
        runId: event?.runId,
        parentRunId: event?.parentRunId,
        ts: event?.ts,
        cwd: event?.cwd,
        agent: event?.agent,
        kind: event?.kind,
        eventName: event?.eventName,
        toolName: event?.toolName,
        bytes: event?.bytes,
        estimatedTokens: event?.estimatedTokens,
        payload: event?.payload,
        textPreview,
        textChars,
        truncatedTextChars,
    };
}
function compactContextState(state) {
    return {
        runId: state.runId,
        cwd: state.cwd,
        captured: state.captured,
        pendingCount: state.pending.length,
        memories: state.memories,
        tokens: state.tokens,
        filtered: state.filtered,
        filterSavedTokens: state.filterSavedTokens,
        lastDistill: state.lastDistill,
        lastError: state.lastError,
        librarian: state.librarian,
    };
}
function compactRetrieveDetails(result) {
    return {
        runId: result.runId,
        eventId: result.eventId,
        found: result.found,
        event: result.event ? compactContextEvent(result.event) : undefined,
        candidate: result.candidate ? compactCandidate(result.candidate) : undefined,
        textChars: typeof result.text === "string" ? result.text.length : 0,
    };
}
function renderResult(result, _options, theme) {
    return new Text(theme.fg?.("toolOutput", result.content?.[0]?.text ?? "") ?? result.content?.[0]?.text ?? "", 0, 0);
}
export default function sisoContextManager(pi) {
    const states = new Map();
    const stateFor = (ctx, event) => {
        const sessionId = explicitSessionId(ctx, event);
        const key = sessionId ?? "__no_session__";
        let state = states.get(key);
        if (!state) {
            state = createContextState(sessionId);
            states.set(key, state);
        }
        return state;
    };
    const capture = (eventName, event, ctx) => {
        const state = stateFor(ctx, event);
        const text = eventText(eventName, event);
        const record = {
            id: newId("evt"),
            runId: state.runId,
            ...(typeof process.env.SISO_PARENT_CONTEXT_RUN_ID === "string" ? { parentRunId: process.env.SISO_PARENT_CONTEXT_RUN_ID } : {}),
            ts: new Date().toISOString(),
            cwd: cwdFrom(event, state.cwd),
            agent: process.env.SISO_AGENT_PROFILE ?? process.env.PI_AGENT_NAME ?? "pi-codex",
            kind: kindFor(eventName),
            eventName,
            ...(text ? { text } : {}),
            ...(toolNameFrom(event) ? { toolName: toolNameFrom(event) } : {}),
            bytes: text.length,
            estimatedTokens: estimateTokensFromText(text),
            payload: eventName === "before_provider_request" ? estimateProviderPayloadMetrics(event.payload) : undefined,
        };
        state.cwd = record.cwd;
        state.captured += 1;
        state.tokens += record.estimatedTokens;
        state.pending.push(record);
        state.librarian.tokensSinceSemantic += record.estimatedTokens;
        appendContextEvent(record);
        publish(ctx, state);
        const decision = chooseLibrarianRun(state.librarian, state.pending, librarianPolicyFromEnv());
        if (decision?.shouldRun) {
            void distillPending(state, ctx, decision.mode, decision.reason).catch((error) => { state.lastError = error instanceof Error ? error.message : String(error); });
        }
        return state;
    };
    pi.on("context", (event, ctx) => {
        if (process.env.SISO_CONTEXT_FILTER !== "1")
            return undefined;
        const state = stateFor(ctx, event);
        const messages = Array.isArray(event.messages) ? event.messages : undefined;
        if (!messages)
            return undefined;
        const result = filterContextMessages(messages, { runId: state.runId });
        if (result.replacements.length === 0)
            return undefined;
        state.filtered += result.replacements.length;
        state.filterSavedTokens += result.estimatedSavedTokens;
        state.librarian.largeFiltersSinceSemantic += result.replacements.length;
        publish(ctx, state);
        return { messages: result.messages };
    });
    pi.on("before_provider_request", (event, ctx) => {
        if (process.env.SISO_CONTEXT_FILTER !== "1")
            return undefined;
        const state = stateFor(ctx, event);
        const filtered = filterProviderPayload(event.payload, { runId: state.runId, cwd: ctx?.cwd });
        if (filtered.replacements.length === 0 && !filtered.promptSlim && !filtered.toolSlim)
            return undefined;
        state.filtered += filtered.replacements.length;
        state.filterSavedTokens += filtered.estimatedSavedTokens + (filtered.toolSlim?.estimatedSavedTokens ?? 0);
        state.librarian.largeFiltersSinceSemantic += filtered.replacements.length;
        publish(ctx, state);
        return filtered.payload;
    });
    for (const eventName of ["input", "message_end", "tool_call", "tool_result", "tool_execution_start", "tool_execution_end", "before_provider_request", "turn_end", "agent_end", "session_end", "session_shutdown", "stop"]) {
        pi.on(eventName, (event, ctx) => {
            const state = capture(eventName, event, ctx);
            if (eventName === "turn_end")
                state.librarian.turnsSinceSemantic += 1;
            if (["turn_end", "agent_end", "session_end", "session_shutdown", "stop"].includes(eventName) && process.env.SISO_CONTEXT_AUTO_DISTILL !== "0") {
                const decision = chooseLibrarianRun(state.librarian, state.pending, librarianPolicyFromEnv(), ["agent_end", "session_end", "session_shutdown", "stop"].includes(eventName) ? "boundary" : "threshold");
                if (decision?.shouldRun)
                    void distillPending(state, ctx, decision.mode, decision.reason).catch((error) => { state.lastError = error instanceof Error ? error.message : String(error); });
            }
        });
    }
    pi.registerCommand?.("siso-context", {
        description: "Print SISO context-manager capture and memory status",
        handler: async (_args, ctx) => ({ content: [{ type: "text", text: statusText(stateFor(ctx)) }] }),
    });
    pi.registerTool?.({
        name: "siso_context",
        label: "SISO Context Manager",
        description: "Inspect and distill read-only per-agent context memory. Does not prune live context yet.",
        parameters: { type: "object", properties: { op: { type: "string", description: "status, distill, latest, memory, central, supersede, pointers, retrieve" }, runId: { type: "string" }, eventId: { type: "string" }, limit: { type: "number" }, maxChars: { type: "number" } }, additionalProperties: false },
        renderResult,
        execute: async (_id, params, _signal, _onUpdate, ctx) => {
            const state = stateFor(ctx);
            const op = typeof params?.op === "string" ? params.op : "status";
            if (op === "distill")
                return { content: [{ type: "text", text: await distillPending(state, ctx, process.env.SISO_CONTEXT_SEMANTIC_LIBRARIAN === "0" ? "local" : "semantic", "manual") }] };
            if (op === "case" || op === "case_packet") {
                const run = typeof params?.runId === "string" && params.runId ? params.runId : state.runId;
                const task = typeof params?.eventId === "string" && params.eventId ? params.eventId : "Current Pi/Codex task";
                const text = buildCodexCasePacket({ task, memories: readRunMemory(run), recentEvents: readRunEvents(run).slice(-12), maxChars: typeof params?.maxChars === "number" ? params.maxChars : 12000 });
                return { content: [{ type: "text", text }] };
            }
            if (op === "latest")
                return { content: [{ type: "text", text: latestRunIds(typeof params?.limit === "number" ? params.limit : 10).join("\n") || "No context runs." }] };
            if (op === "memory") {
                const runId = typeof params?.runId === "string" ? params.runId : state.runId;
                const memories = readRunMemory(runId).slice(0, typeof params?.limit === "number" ? params.limit : 20);
                return { content: [{ type: "text", text: memories.map((item) => `${item.category} importance=${item.importance} ${item.text}`).join("\n") || "No memory items." }], details: memories.map(compactMemoryItem) };
            }
            if (op === "central") {
                const rows = readCentralMemory();
                return { content: [{ type: "text", text: formatCentralMemory(rows, typeof params?.limit === "number" ? params.limit : 20) }], details: { stats: centralMemoryStats(), rows: rows.slice(-(typeof params?.limit === "number" ? params.limit : 20)).map(compactCentralRow) } };
            }
            if (op === "supersede") {
                const runId = typeof params?.runId === "string" ? params.runId : state.runId;
                const report = analyzeSupersede(readRunEvents(runId));
                return { content: [{ type: "text", text: formatSupersedeReport(report, typeof params?.limit === "number" ? params.limit : 20) }], details: { ...report, candidates: report.candidates.map(compactCandidate) } };
            }
            if (op === "pointers") {
                const runId = typeof params?.runId === "string" ? params.runId : state.runId;
                const report = analyzeSupersede(readRunEvents(runId));
                return { content: [{ type: "text", text: formatRetrievalPointers(runId, report.candidates, typeof params?.limit === "number" ? params.limit : 20) }], details: report.candidates.map(compactCandidate) };
            }
            if (op === "retrieve") {
                const runId = typeof params?.runId === "string" ? params.runId : state.runId;
                const eventId = typeof params?.eventId === "string" ? params.eventId : "";
                const result = retrieveEvent(runId, eventId, { maxChars: typeof params?.maxChars === "number" ? params.maxChars : 12000 });
                return { content: [{ type: "text", text: result.text }], details: compactRetrieveDetails(result) };
            }
            return { content: [{ type: "text", text: statusText(state) }], details: { state: compactContextState(state), stats: storeStats(), events: readRunEvents(state.runId).length, root: defaultRoot() } };
        },
    });
}
export { deterministicDistill } from "./distill.js";
export { readRunEvents, readRunMemory, storeStats } from "./store.js";
