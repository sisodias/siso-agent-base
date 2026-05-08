import { basename } from "node:path";
import { decisionForProfile, runCouncil } from "./council-layer.js";
import { createSisoTask, updateSisoTask } from "./task-store.js";
import { publicSpawnResult, runProfileSpawn } from "./spawn-layer.js";
import { executeSpawnWithNativeSubagentBridge } from "./native-subagent-bridge.js";
function titleFrom(task) {
    const compact = task.trim().replace(/\s+/g, " ");
    return compact.length <= 80 ? compact : `${compact.slice(0, 77)}...`;
}
function statusFrom(workers, dryRun, background) {
    if (dryRun)
        return "planned";
    if (background)
        return "background";
    const completed = workers.filter((worker) => worker.child.status === "completed").length;
    if (completed === workers.length)
        return "completed";
    if (completed > 0)
        return "partial";
    return "failed";
}
function workerPrompt(task, parentTask, workerIndex, council) {
    return [
        `SISO workflow parent task: ${parentTask.id}`,
        `Worker slot: ${workerIndex}`,
        "Do only this bounded slice. Return compact JSON only.",
        council ? `Council summary: ${council.synthesis.summary}` : "",
        "",
        "Task:",
        task,
    ].filter(Boolean).join("\n");
}
function updateWorkerTask(cwd, task, child) {
    const terminalStatus = child.status === "planned"
        ? "ready"
        : child.status === "completed"
            ? "done"
            : child.status === "background"
                ? "running"
                : "failed";
    return updateSisoTask({
        cwd,
        id: task.id,
        status: terminalStatus,
        metadata: {
            ...(task.metadata ?? {}),
            childId: child.id,
            childStatus: child.status,
            childTokens: child.tokens.totalTokens,
        },
    }).task;
}
export async function runWorkflow(task, options = {}, signal) {
    const parent = createSisoTask({
        cwd: options.cwd,
        title: `Workflow: ${titleFrom(task)}`,
        description: task,
        priority: "A",
        status: options.dryRun ? "ready" : "running",
        owner: "siso.workflow",
        metadata: { kind: "workflow" },
    }).task;
    const council = options.council === false
        ? undefined
        : await runCouncil(task, {
            cwd: options.cwd,
            mode: "compare",
            maxMembers: 2,
            timeoutMs: options.timeoutMs,
            dryRun: options.dryRun,
            noTools: options.noTools,
        }, signal);
    const workerCount = Math.max(1, Math.min(Math.floor(options.workerCount ?? 2), 6));
    const workerDecision = decisionForProfile("minimax.worker", "SISO workflow fans execution out to cheap MiniMax workers.");
    const workers = await Promise.all(Array.from({ length: workerCount }, async (_, index) => {
        const workerTask = createSisoTask({
            cwd: options.cwd,
            title: `Worker ${index + 1}: ${titleFrom(task)}`,
            description: workerPrompt(task, parent, index + 1, council),
            priority: "A",
            status: options.dryRun ? "ready" : "running",
            owner: "minimax.worker",
            blockedBy: [parent.id],
            metadata: { kind: "workflow-worker", parentTaskId: parent.id, workerIndex: index + 1 },
        }).task;
        const child = await runWorkflowWorkerViaNativeBridge(workerPrompt(task, parent, index + 1, council), {
            cwd: options.cwd,
            timeoutMs: options.timeoutMs,
            dryRun: options.dryRun,
            background: options.background,
            noTools: options.noTools,
            decision: workerDecision,
            signal,
        });
        return { task: updateWorkerTask(options.cwd, workerTask, child), child };
    }));
    const status = statusFrom(workers, options.dryRun, options.background);
    const parentStatus = status === "completed" || status === "planned" ? "done" : status === "background" || status === "partial" ? "running" : "failed";
    const updatedParent = updateSisoTask({
        cwd: options.cwd,
        id: parent.id,
        status: parentStatus,
        metadata: {
            ...(parent.metadata ?? {}),
            workflowStatus: status,
            councilStatus: council?.status ?? "skipped",
            workerCount,
            childIds: workers.map((worker) => worker.child.id),
        },
    }).task;
    return {
        task: updatedParent,
        council,
        workers,
        status,
        totalTokens: (council?.totalTokens ?? 0) + workers.reduce((sum, worker) => sum + worker.child.tokens.totalTokens, 0),
        events: [
            ...(council?.events ?? []),
            ...workers.flatMap((worker) => worker.child.events ?? []),
        ],
    };
}
async function runWorkflowWorkerViaNativeBridge(task, options) {
    if (options.dryRun || options.background || process.env.SISO_WORKFLOW_RUNTIME !== "native-pi-process") {
        return publicSpawnResult(await runProfileSpawn(task, {
            cwd: options.cwd,
            timeoutMs: options.timeoutMs,
            dryRun: options.dryRun,
            background: options.background,
            noTools: options.noTools,
            decision: options.decision,
        }, options.signal));
    }
    const bridged = await executeSpawnWithNativeSubagentBridge({
        task,
        cwd: options.cwd,
        timeoutMs: options.timeoutMs,
        background: false,
        noTools: options.noTools,
        decision: options.decision,
        signal: options.signal,
    });
    const text = bridged.content.map((item) => item.text).join("\n");
    const details = bridged.details && typeof bridged.details === "object" ? bridged.details : {};
    const native = details.native && typeof details.native === "object" ? details.native : {};
    const tokens = tokensFromNative(native);
    return {
        id: typeof native.id === "string" ? native.id : `native-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        status: nativeStatus(native),
        adapter: "pi",
        decision: options.decision,
        command: "subagent",
        args: [],
        cwd: options.cwd ?? process.cwd(),
        durationMs: 0,
        timedOut: false,
        finalOutput: text,
        compactResult: {
            summary: text.replace(/\s+/g, " ").trim().slice(0, 240) || "Native workflow worker completed.",
            findings: [],
            files: [],
            next_action: "Use the native worker result if relevant.",
        },
        rawOutputChars: text.length,
        truncatedOutputChars: 0,
        tokens,
        toolCalls: 0,
        stderrPreview: "",
    };
}
function nativeStatus(native) {
    const status = native.status;
    if (status === "completed" || status === "background" || status === "failed" || status === "timeout" || status === "aborted" || status === "planned" || status === "unsupported")
        return status;
    return "completed";
}
function tokensFromNative(native) {
    const resultTokens = Array.isArray(native.results)
        ? native.results.reduce((sum, item) => {
            const result = item && typeof item === "object" ? item : {};
            return sum + tokensFromUsage(result.usage).totalTokens;
        }, 0)
        : 0;
    if (resultTokens > 0)
        return { input: 0, output: 0, totalTokens: resultTokens };
    return tokensFromUsage(native.usage ?? native.tokens);
}
function tokensFromUsage(value) {
    const usage = value && typeof value === "object" ? value : {};
    const input = typeof usage.input === "number" ? usage.input : typeof usage.inputTokens === "number" ? usage.inputTokens : 0;
    const output = typeof usage.output === "number" ? usage.output : typeof usage.outputTokens === "number" ? usage.outputTokens : 0;
    const totalTokens = typeof usage.totalTokens === "number" ? usage.totalTokens : typeof usage.total === "number" ? usage.total : input + output;
    return { input, output, totalTokens };
}
export function formatWorkflowResult(result) {
    return [
        `workflow_status=${result.status}`,
        `parent_task=${result.task.id}`,
        `total_tokens=${result.totalTokens}`,
        `council_status=${result.council?.status ?? "skipped"}`,
        `workers=${result.workers.length}`,
        `parent_status=${result.task.status}`,
        `parent_profile=${result.task.profile}`,
        result.council ? `council_members=${result.council.members.length}` : "",
        ...result.workers.map((worker, index) => [
            `worker_${index + 1}_task=${worker.task.id}`,
            `status=${worker.child.status}`,
            `owner=${worker.task.owner ?? "none"}`,
            `profile=${worker.child.decision.profile}`,
            `tokens=${worker.child.tokens.totalTokens}`,
            `child_id=${worker.child.id}`,
            `record=${worker.child.runRecordPath ? basename(worker.child.runRecordPath) : "none"}`,
        ].join(" ")),
    ].filter(Boolean).join("\n");
}
