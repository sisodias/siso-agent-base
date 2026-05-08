import { chooseRoute } from "./route-policy.js";
import { formatSpawnResult, publicSpawnResult, runProfileSpawn } from "./spawn-layer.js";
export function nativeSubagentAvailable(ctx) {
    try {
        return Boolean(ctx?.getAllTools?.().some((tool) => tool.name === "subagent"));
    }
    catch {
        return false;
    }
}
export function sisoRoleToNativeAgent(decision) {
    if (decision.kind === "rescue" || decision.kind === "codex")
        return "reviewer";
    return decision.kind;
}
export function modelForNativeSubagent(decision) {
    return decision.model === "codex" ? undefined : decision.model;
}
export function buildNativeSubagentParams(task, decision, options) {
    return {
        agent: sisoRoleToNativeAgent(decision),
        task: [options.task, "", "Do not call tools. Return the requested final answer directly."].join("\n"),
        context: "fresh",
        clarify: false,
        async: options.background === true,
        noTools: true,
        tools: false,
        ...(options.cwd ? { cwd: options.cwd } : {}),
        ...(modelForNativeSubagent(decision) ? { model: modelForNativeSubagent(decision) } : {}),
    };
}
export function formatNativeSpawnResult(task, decision, native) {
    const nativeText = native.content?.map((item) => item.text ?? "").filter(Boolean).join("\n") ?? "";
    return [
        `kind=${decision.kind}`,
        `profile=${decision.profile}`,
        `lane=${decision.lane}`,
        `model=${decision.model}`,
        `runtime=native-subagent`,
        nativeText,
    ].filter(Boolean).join("\n");
}
export async function executeSpawnWithNativeSubagentBridge(options) {
    const decision = options.decision ?? chooseRoute(options.task);
    const shouldUseNative = process.env.SISO_SPAWN_RUNTIME !== "legacy" && nativeSubagentAvailable(options.ctx) && !options.dryRun;
    if (shouldUseNative) {
        const executor = options.executeNative ?? defaultNativeSubagentExecutor(options.ctx);
        if (executor) {
            const params = buildNativeSubagentParams(options.task, decision, options);
            const native = await executor(params, options.signal);
            return {
                usedNative: true,
                content: [{ type: "text", text: formatNativeSpawnResult(options.task, decision, native) }],
                details: {
                    runtime: "native-subagent",
                    decision,
                    params,
                    native: native.details ?? native,
                },
            };
        }
    }
    const result = await runProfileSpawn(options.task, {
        ...(options.cwd ? { cwd: options.cwd } : {}),
        ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
        ...(options.dryRun !== undefined ? { dryRun: options.dryRun } : {}),
        ...(options.background !== undefined ? { background: options.background } : {}),
        ...(options.maxDepth !== undefined ? { maxDepth: options.maxDepth } : {}),
        ...(options.noTools !== undefined ? { noTools: options.noTools } : {}),
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
