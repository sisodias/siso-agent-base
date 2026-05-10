import { chooseRoute } from "./route-policy.js";
import { checkFleetSpawnPolicy, compactChildResult, effectivePiTools, formatSpawnResult, publicSpawnResult, runProfileSpawn, setChildStatus } from "./spawn-layer.js";
import { currentTaskScope, sanitizeChildBudget, writeScopedTaskRecord } from "./task-registry.js";
function nativeResultMaxChars() {
    const parsed = Number.parseInt(process.env.SISO_NATIVE_SUBAGENT_RESULT_MAX_CHARS ?? "900", 10);
    return Number.isFinite(parsed) && parsed >= 200 ? parsed : 900;
}
function truncateNativeResult(text) {
    const maxChars = nativeResultMaxChars();
    if (text.length <= maxChars) {
        return { text, rawOutputChars: text.length, truncatedOutputChars: 0 };
    }
    const preview = text.slice(0, maxChars).trimEnd();
    return {
        text: `${preview}\n[SISO_NATIVE_RESULT_TRUNCATED original_chars=${text.length} shown_chars=${maxChars}]`,
        rawOutputChars: text.length,
        truncatedOutputChars: text.length - maxChars,
    };
}
export function nativeSubagentAvailable(ctx) {
    try {
        return Boolean(ctx?.getAllTools?.().some((tool) => tool.name === "subagent"));
    }
    catch {
        return false;
    }
}
export function sisoRoleToNativeAgent(decision) {
    if (decision.nativeAgent)
        return decision.nativeAgent;
    if (decision.kind === "rescue" || decision.kind === "codex")
        return "reviewer";
    return decision.kind;
}
export function modelForNativeSubagent(decision) {
    return decision.model === "codex" ? undefined : decision.model;
}
export function buildNativeSubagentParams(task, decision, options) {
    const tools = effectivePiTools(decision, options.noTools === true);
    return {
        agent: sisoRoleToNativeAgent(decision),
        task: [
            options.task,
            "",
            "Return a concise final answer for the parent agent to report back to the user.",
        ].join("\n"),
        context: "fresh",
        clarify: false,
        ...(tools.length > 0 ? { tools } : { noTools: true }),
        ...(options.cwd ? { cwd: options.cwd } : {}),
        ...(modelForNativeSubagent(decision) ? { model: modelForNativeSubagent(decision) } : {}),
    };
}
export function formatNativeSpawnResult(task, decision, native, childId, childStatus, timing = {}) {
    const tokens = nativeTokens(native);
    const toolCalls = nativeToolCalls(native);
    const resultText = nativeText(native) || "Child completed without text output.";
    const resultPreview = truncateNativeResult(resultText);
    const result = compactChildResult(resultText);
    const role = compactAgentRole(decision.profile ?? decision.kind);
    const checkLabel = `${toolCalls} ${toolCalls === 1 ? "check" : "checks"}`;
    const duration = formatDuration(timing.durationMs);
    const taskText = compactTaskText(task);
    return [
        `✓ Agent ${childStatus === "completed" ? "complete" : childStatus} · ${role} · ${checkLabel}${duration ? ` · ${duration}` : ""}`,
        taskText ? `Task: ${taskText}` : undefined,
        "",
        result.summary,
        ...result.findings.slice(0, 3).map((item) => `- ${item}`),
        result.files.length ? `Files: ${result.files.slice(0, 4).join(", ")}` : undefined,
        resultPreview.truncatedOutputChars > 0 ? `[SISO_NATIVE_RESULT_TRUNCATED original_chars=${resultPreview.rawOutputChars} shown_chars=${nativeResultMaxChars()}]` : undefined,
        "",
        `Details: ${formatTokens(tokens.totalTokens)} tokens · ${displayModel(decision.model)}`,
    ].filter(Boolean).join("\n");
}
function compactAgentRole(value) {
    const text = String(value ?? "agent").split(".").filter(Boolean).at(-1) ?? "agent";
    return text || "agent";
}
function compactTaskText(value) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text.length > 120 ? `${text.slice(0, 119)}…` : text;
}
function formatTokens(tokens) {
    if (tokens >= 1_000_000)
        return `${(tokens / 1_000_000).toFixed(1)}m`;
    if (tokens >= 1000)
        return `${Math.round(tokens / 100) / 10}k`;
    return String(tokens);
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
function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0)
        return "";
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function nativeText(native) {
    const direct = native.content?.map((item) => item.text ?? "").filter(Boolean).join("\n") ?? "";
    if (direct.trim())
        return direct;
    const details = native.details && typeof native.details === "object" ? native.details : {};
    const results = Array.isArray(details.results) ? details.results : [];
    for (let i = results.length - 1; i >= 0; i--) {
        const messages = Array.isArray(results[i]?.messages) ? results[i].messages : [];
        const text = finalAssistantText(messages);
        if (text)
            return text;
    }
    return "";
}
function finalAssistantText(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg?.role !== "assistant" || !Array.isArray(msg.content))
            continue;
        for (const part of msg.content) {
            if (part?.type === "text" && typeof part.text === "string" && part.text.trim())
                return part.text;
        }
    }
    return "";
}
function nativeTokens(native) {
    const details = native.details && typeof native.details === "object" ? native.details : {};
    const results = Array.isArray(details.results) ? details.results : [];
    const aggregate = results.reduce((acc, result) => {
        const usage = result?.usage && typeof result.usage === "object" ? result.usage : {};
        acc.input += numberField(usage, "input", "input_tokens");
        acc.output += numberField(usage, "output", "output_tokens");
        acc.totalTokens += numberField(usage, "contextTokens", "totalTokens", "total_tokens");
        return acc;
    }, { input: 0, output: 0, totalTokens: 0 });
    if (aggregate.input || aggregate.output || aggregate.totalTokens) {
        return {
            input: aggregate.input,
            output: aggregate.output,
            totalTokens: aggregate.totalTokens || aggregate.input + aggregate.output,
        };
    }
    const raw = details.tokens && typeof details.tokens === "object" ? details.tokens : details.usage && typeof details.usage === "object" ? details.usage : {};
    const input = numberField(raw, "input", "input_tokens");
    const output = numberField(raw, "output", "output_tokens");
    const totalTokens = numberField(raw, "totalTokens", "total_tokens") || input + output;
    return { input, output, totalTokens };
}
function numberField(obj, ...keys) {
    for (const key of keys) {
        if (typeof obj[key] === "number")
            return obj[key];
    }
    return 0;
}
function nativeToolCalls(native) {
    const details = native.details && typeof native.details === "object" ? native.details : {};
    if (typeof details.toolCalls === "number")
        return details.toolCalls;
    const results = Array.isArray(details.results) ? details.results : [];
    let count = 0;
    for (const result of results) {
        const messages = Array.isArray(result?.messages) ? result.messages : [];
        for (const msg of messages) {
            if (msg?.role !== "assistant" || !Array.isArray(msg.content))
                continue;
            count += msg.content.filter((part) => part?.type === "toolCall" || part?.type === "tool_use").length;
        }
    }
    return count;
}
function nativeDetails(statusId, status, task, decision, native, params, timing = {}) {
    const resultText = nativeText(native);
    const resultPreview = truncateNativeResult(resultText);
    const tokens = nativeTokens(native);
    const compactResult = compactChildResult(resultText || "Child completed without text output.");
    return {
        id: statusId,
        status,
        runtime: "native-subagent",
        adapter: "native-subagent",
        decision,
        task,
        profile: decision.profile,
        lane: decision.lane,
        model: decision.model,
        tokens,
        toolCalls: nativeToolCalls(native),
        compactResult,
        finalOutput: resultPreview.text,
        rawOutputChars: resultPreview.rawOutputChars,
        truncatedOutputChars: resultPreview.truncatedOutputChars,
        ...(timing.startedAt ? { startedAt: timing.startedAt } : {}),
        ...(timing.completedAt ? { completedAt: timing.completedAt } : {}),
        ...(Number.isFinite(timing.durationMs) ? { durationMs: timing.durationMs } : {}),
        params: compactNativeParams(params),
        ...(params.fleetId ? { fleetId: params.fleetId } : {}),
        ...(params.budget ? { budget: params.budget } : {}),
        ...allocationMetadataFields(params.allocationMetadata),
        nativeSummary: summarizeNativeDetails(native),
    };
}
function allocationMetadataFields(value = {}) {
    const metadata = value && typeof value === "object" ? value : {};
    return {
        ...(metadata.kind ? { kind: metadata.kind } : {}),
        ...(metadata.workflowMode ? { workflowMode: metadata.workflowMode } : {}),
        ...(metadata.allocationId ? { allocationId: metadata.allocationId } : {}),
        ...(metadata.assignmentId ? { assignmentId: metadata.assignmentId } : {}),
        ...(metadata.parentTaskId ? { parentTaskId: metadata.parentTaskId } : {}),
        ...(metadata.stepId ? { stepId: metadata.stepId } : {}),
        ...(metadata.specialistId ? { specialistId: metadata.specialistId } : {}),
        ...(metadata.specialistAlias ? { specialistAlias: metadata.specialistAlias } : {}),
        ...(metadata.domain ? { domain: metadata.domain } : {}),
        ...(Array.isArray(metadata.domains) ? { domains: metadata.domains } : {}),
        ...(metadata.domainRatings ? { domainRatings: metadata.domainRatings } : {}),
        ...(metadata.riskTier ? { riskTier: metadata.riskTier } : {}),
        ...(metadata.ownershipBoundary ? { ownershipBoundary: metadata.ownershipBoundary } : {}),
        ...(metadata.executionProfile ? { executionProfile: metadata.executionProfile } : {}),
        ...(metadata.specialistScore !== undefined ? { specialistScore: metadata.specialistScore } : {}),
        ...(Array.isArray(metadata.requiredChecks) ? { requiredChecks: metadata.requiredChecks } : {}),
        ...(Array.isArray(metadata.acceptanceCriteria) ? { acceptanceCriteria: metadata.acceptanceCriteria } : {}),
        ...(metadata.stageIndex !== undefined ? { stageIndex: metadata.stageIndex } : {}),
        ...(metadata.workerIndex !== undefined ? { workerIndex: metadata.workerIndex } : {}),
        ...(metadata.agent ? { agent: metadata.agent } : {}),
        ...(metadata.verifierId ? { verifierId: metadata.verifierId } : {}),
        ...(metadata.verifierVerdict ? { verifierVerdict: metadata.verifierVerdict } : {}),
        ...(metadata.feedbackIteration !== undefined ? { feedbackIteration: metadata.feedbackIteration } : {}),
        ...(metadata.verificationContract ? { verificationContract: metadata.verificationContract } : {}),
    };
}
function compactNativeParams(params = {}) {
    return {
        ...(params.agent ? { agent: params.agent } : {}),
        ...(params.cwd ? { cwd: params.cwd } : {}),
        ...(params.model ? { model: params.model } : {}),
        ...(params.context ? { context: params.context } : {}),
        ...(params.clarify !== undefined ? { clarify: params.clarify } : {}),
        ...(Array.isArray(params.tools) ? { tools: params.tools } : {}),
        ...(params.noTools !== undefined ? { noTools: params.noTools } : {}),
        taskChars: typeof params.task === "string" ? params.task.length : 0,
    };
}
function summarizeNativeDetails(native) {
    const details = native.details && typeof native.details === "object" ? native.details : {};
    const results = Array.isArray(details.results) ? details.results : [];
    return {
        resultCount: results.length,
        contentItems: Array.isArray(native.content) ? native.content.length : 0,
        hasDetails: Boolean(native.details),
    };
}
function nativeSnapshot(id, status, task, decision, native, options = {}) {
    const text = native ? nativeText(native) : task;
    const tokens = native ? nativeTokens(native) : { input: 0, output: 0, totalTokens: 0 };
    return {
        id,
        status,
        runtime: "native-subagent",
        adapter: "native-subagent",
        profile: decision.profile,
        lane: decision.lane,
        model: decision.model,
        task,
        ...(options.startedAt ? { startedAt: options.startedAt } : {}),
        ...(options.completedAt ? { completedAt: options.completedAt } : {}),
        ...(Number.isFinite(options.durationMs) ? { durationMs: options.durationMs } : {}),
        tokens,
        toolCalls: native ? nativeToolCalls(native) : 0,
        compactResult: compactChildResult(text || "Native child started."),
        ...(options.fleetId ? { fleetId: options.fleetId } : {}),
        ...(options.budget ? { budget: options.budget } : {}),
        ...allocationMetadataFields(options.allocationMetadata),
    };
}
function writeNativeScopedTaskRecord(snapshot, scope) {
    return writeScopedTaskRecord({
        rootSessionId: scope.rootSessionId,
        parentSessionId: scope.parentSessionId,
        ownerAgentId: scope.ownerAgentId,
        ...(scope.spawnedByTaskId ? { spawnedByTaskId: scope.spawnedByTaskId } : {}),
        depth: scope.depth,
        ...snapshot,
    });
}
export async function executeSpawnWithNativeSubagentBridge(options) {
    const sanitizedBudget = sanitizeChildBudget(options.budget);
    options = {
        ...options,
        budget: sanitizedBudget,
    };
    const decision = options.decision ?? chooseRoute(options.task);
    const scope = currentTaskScope(options.ctx);
    const fleetPolicyError = checkFleetSpawnPolicy(options);
    if (fleetPolicyError) {
        const result = await runProfileSpawn(options.task, {
            ...options,
            decision,
            fleetPolicyError,
        }, options.signal);
        return formatLegacySpawnBridgeResult(options.task, result);
    }
    const shouldUseNative = process.env.SISO_SPAWN_RUNTIME !== "legacy" && nativeSubagentAvailable(options.ctx) && !options.dryRun && options.background !== true;
    if (shouldUseNative) {
        const executor = options.executeNative ?? defaultNativeSubagentExecutor(options.ctx);
        if (executor) {
            const params = buildNativeSubagentParams(options.task, decision, options);
            const statusId = `siso-native-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            const startedAtMs = Date.now();
            const startedAt = new Date(startedAtMs).toISOString();
            const runningSnapshot = nativeSnapshot(statusId, "running", options.task, decision, undefined, { ...options, startedAt });
            writeNativeScopedTaskRecord(runningSnapshot, scope);
            setChildStatus(runningSnapshot, true, scope);
            const native = await executor(params, options.signal);
            const completedStatus = options.background === true ? "background" : "completed";
            const completedAtMs = Date.now();
            const timing = {
                startedAt,
                completedAt: new Date(completedAtMs).toISOString(),
                durationMs: completedAtMs - startedAtMs,
            };
            const details = nativeDetails(statusId, completedStatus, options.task, decision, native, {
                ...params,
                ...(options.fleetId ? { fleetId: options.fleetId } : {}),
                ...(options.budget ? { budget: options.budget } : {}),
                ...(options.allocationMetadata ? { allocationMetadata: options.allocationMetadata } : {}),
            }, timing);
            writeNativeScopedTaskRecord(details, scope);
            setChildStatus(nativeSnapshot(statusId, completedStatus, options.task, decision, native, { ...options, ...timing }), completedStatus !== "completed", scope);
            return {
                usedNative: true,
                content: [{ type: "text", text: formatNativeSpawnResult(options.task, decision, native, statusId, completedStatus, timing) }],
                details,
            };
        }
    }
    const result = await runProfileSpawn(options.task, {
        ...(options.cwd ? { cwd: options.cwd } : {}),
        decision,
        ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
        ...(options.dryRun !== undefined ? { dryRun: options.dryRun } : {}),
        ...(options.background !== undefined ? { background: options.background } : {}),
        ...(options.maxDepth !== undefined ? { maxDepth: options.maxDepth } : {}),
        ...(options.noTools !== undefined ? { noTools: options.noTools } : {}),
        ...(options.fleetId !== undefined ? { fleetId: options.fleetId } : {}),
        ...(options.budget !== undefined ? { budget: options.budget } : {}),
        ...(options.allocationMetadata !== undefined ? { allocationMetadata: options.allocationMetadata } : {}),
        ctx: options.ctx,
    }, options.signal);
    return formatLegacySpawnBridgeResult(options.task, result);
}
function formatLegacySpawnBridgeResult(task, result) {
    return {
        usedNative: false,
        content: [{ type: "text", text: formatSpawnResult(task, result) }],
        details: publicSpawnResult(result),
    };
}
function defaultNativeSubagentExecutor(ctx) {
    const tool = ctx?.getAllTools?.().find((item) => item.name === "subagent");
    return typeof tool?.execute === "function"
        ? async (params, signal) => tool.execute?.("siso-native-bridge", params, signal, undefined, ctx)
        : undefined;
}
