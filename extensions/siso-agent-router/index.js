import { Text } from "@mariozechner/pi-tui";
import { chooseRoute, formatDecision } from "./route-policy.js";
import { loadCodexCasePacket } from "./codex-case-packet.js";
import { formatCouncilResult, runCouncil } from "./council-layer.js";
import { formatHarnessFeatureRecommendations, formatRepoCatalogResult, formatResearchIntegrationQueue, queryRepoCatalog, recommendHarnessFeatures, recommendResearchIntegrations } from "./repo-catalog.js";
import { formatSkillHubResult, querySkillHub } from "./skill-hub.js";
import { cleanupChildRunLogs, collectChildRunRecord, collectLatestChildRunRecords, controlChildRun, getChildRunStorageStats, setRouterStatus } from "./spawn-layer.js";
import { executeSpawnWithNativeSubagentBridge } from "./native-subagent-bridge.js";
import { createSisoTask, formatSisoTask, formatSisoTaskList, listSisoTasks, updateSisoTask } from "./task-store.js";
import { formatWorkflowResult, runWorkflow } from "./workflow-layer.js";
import { guardSisoAction } from "./worker-guard.js";
import { evaluatePiChildGuardrail } from "./child-context-guard.js";
import { createAgentEvent } from "./agent-events.js";
const PARAMS = {
    type: "object",
    properties: {
        task: {
            type: "string",
            description: "Task to route to the cheapest capable SISO Pi subagent profile.",
        },
    },
    required: ["task"],
    additionalProperties: false,
};
const SPAWN_PARAMS = {
    type: "object",
    properties: {
        task: {
            type: "string",
            description: "Task to spawn through the cheapest capable SISO Pi child-agent profile.",
        },
        cwd: {
            type: "string",
            description: "Optional child-agent working directory. Defaults to the current process cwd.",
        },
        timeoutMs: {
            type: "number",
            description: "Optional child-agent timeout in milliseconds. Defaults to 60000.",
        },
        dryRun: {
            type: "boolean",
            description: "When true, only return the spawn command/profile without starting the child process.",
        },
        background: {
            type: "boolean",
            description: "When true, start the child process and return immediately without waiting for output.",
        },
        maxDepth: {
            type: "number",
            description: "Maximum nested SISO spawn depth. Defaults to inherited PI_SUBAGENT_MAX_DEPTH or 1.",
        },
        noTools: {
            type: "boolean",
            description: "When true, launch the child with no tools for pure marker/format checks.",
        },
    },
    required: ["task"],
    additionalProperties: false,
};
const SISO_PARAMS = {
    type: "object",
    properties: {
        action: { type: "string", enum: ["route", "spawn", "council", "workflow", "workflow/orchestrate", "orchestrate", "child", "task", "skill", "repo"], description: "Domain." },
        op: { type: "string", description: "Sub-action." },
        mode: { type: "string", enum: ["compare", "synthesize", "review"], description: "Council mode." },
        task: { type: "string", description: "Route/spawn brief." },
        cwd: { type: "string", description: "Working directory." },
        id: { type: "string", description: "Child/task id." },
        title: { type: "string", description: "Task title." },
        description: { type: "string", description: "Task detail." },
        query: { type: "string", description: "Search text." },
        rubric: { type: "string", description: "Council rubric." },
        skillId: { type: "string", description: "Skill id/name." },
        message: { type: "string", description: "Resume message." },
        status: { type: "string", description: "Task status." },
        priority: { type: "string", description: "Task/repo priority." },
        limit: { type: "number", description: "Max rows." },
        background: { type: "boolean", description: "Run async." },
        timeoutMs: { type: "number", description: "Timeout ms." },
        dryRun: { type: "boolean", description: "Preview only." },
        maxDepth: { type: "number", description: "Spawn depth." },
        noTools: { type: "boolean", description: "Run spawned child/council members with no tools." },
        workerCount: { type: "number", description: "Workflow worker fan-out count. Defaults to 2, max 6." },
        council: { type: "boolean", description: "Workflow planning council toggle. Defaults to true." },
        owner: { type: "string", description: "Task owner." },
        blockedBy: { type: "array", items: { type: "string" }, description: "Blocking task ids." },
        members: { type: "array", items: { type: "string" }, description: "Council profile ids." },
        metadata: { type: "object", description: "Task metadata." },
        signal: { type: "string", enum: ["SIGTERM", "SIGKILL"], description: "Interrupt signal." },
        maxAgeHours: { type: "number", description: "Cleanup age." },
        maxRuns: { type: "number", description: "Runs to keep." },
        section: { type: "string", description: "Skill section." },
        source: { type: "string", description: "Skill source." },
        maxChars: { type: "number", description: "Max chars." },
        catalog: { type: "string", enum: ["cloned", "broad", "both"], description: "Repo catalog." },
        lane: { type: "string", description: "Repo lane." },
        kind: { type: "string", description: "Repo kind." },
        repoAction: { type: "string", description: "Repo action." },
        options: { type: "object", description: "Advanced fields." },
    },
    required: ["action"],
    additionalProperties: false,
};
function routerUiMode() {
    const mode = process.env.SISO_AGENT_ROUTER_UI;
    return mode === "compact" || mode === "full" ? mode : "off";
}
function routerWidgetPlacement() {
    return process.env.SISO_AGENT_ROUTER_WIDGET_PLACEMENT === "belowEditor" ? "belowEditor" : "aboveEditor";
}
function setRouterUiStatus(ctx, text) {
    if (routerUiMode() === "off")
        return;
    ctx?.ui?.setStatus?.("siso-agent-router", text);
}
function setRouterUiWidget(ctx, lines) {
    if (routerUiMode() !== "full")
        return;
    ctx?.ui?.setWidget?.("siso-agent-router", lines, { placement: routerWidgetPlacement() });
}
function trunc(value, limit = 72) {
    const compact = value.replace(/\s+/g, " ").trim();
    return compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact;
}
function sisoAction(params) {
    const options = optionBag(params);
    return (textParam(params, options, "action") ?? textParam(params, options, "domain") ?? inferDomain(params, options)).toLowerCase();
}
function renderLine(text, theme) {
    return new Text(theme.fg?.("toolOutput", text) ?? text, 0, 0);
}
function uiDot(kind, body) {
    return `• ${kind}${body ? ` ${body}` : ""}`;
}
function childVerb(status) {
    if (status === "background")
        return "launched";
    if (status === "completed")
        return "completed";
    if (status === "running" || status === "starting")
        return "running";
    if (status === "planned")
        return "planned";
    if (status === "failed" || status === "timeout" || status === "aborted" || status === "unsupported")
        return String(status);
    return "updated";
}
function ageSince(iso) {
    if (!iso)
        return "now";
    const ms = Math.max(0, Date.now() - Date.parse(iso));
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
function formatTokenCount(value) {
    const tokens = typeof value === "number" ? value : Number(value ?? 0);
    if (!Number.isFinite(tokens))
        return "0";
    if (tokens >= 1_000_000)
        return `${(tokens / 1_000_000).toFixed(1)}m`;
    if (tokens >= 1000)
        return `${Math.round(tokens / 100) / 10}k`;
    return String(tokens);
}
function displayModel(model) {
    const id = typeof model === "string" ? model : "";
    const map = {
        "claude-haiku-4-5-20251001": "MiniMax M2.7",
        "claude-sonnet-4-6": "Spark",
        "claude-opus-4-7": "Oracle GPT-5.5",
        "gpt-5.4-mini": "GPT-5.4 Mini",
        "gpt-5.5": "Oracle GPT-5.5",
        "gpt-5.3-codex-spark": "Spark",
        "MiniMax-M2.7-highspeed": "MiniMax M2.7",
    };
    return map[id] ?? (id.replace(/-202\d{5,8}$/, "") || "model");
}
function renderSisoCall(args, theme) {
    const action = sisoAction(args);
    const task = typeof args.task === "string" ? args.task
        : typeof args.query === "string" ? args.query
            : typeof args.skillId === "string" ? args.skillId
                : typeof args.title === "string" ? args.title
                    : typeof args.id === "string" ? args.id
                        : "";
    const labels = {
        spawn: "agent",
        council: "council",
        workflow: "workflow",
        orchestrate: "workflow",
        "workflow/orchestrate": "workflow",
        child: "agent",
        skill: "skill",
        task: "task",
        repo: "research",
        route: "route",
    };
    const label = labels[action] ?? action;
    const title = theme.fg?.("toolTitle", theme.bold?.(label) ?? label) ?? label;
    const suffix = task ? ` · ${trunc(task)}` : "";
    return new Text(`• ${title}${suffix}`, 0, 0);
}
function textOutput(result) {
    return result.content?.map((item) => item.type === "text" ? item.text ?? "" : "").filter(Boolean).join("\n") ?? "";
}
function lineValue(text, key) {
    const line = text.split(/\r?\n/).find((candidate) => candidate.startsWith(`${key}=`));
    return line?.slice(key.length + 1);
}
function tokensFrom(details) {
    return details.tokens && typeof details.tokens === "object" ? details.tokens.totalTokens ?? 0 : 0;
}
function renderSisoResult(result, _options, theme) {
    const details = result.details && typeof result.details === "object" ? result.details : {};
    const text = textOutput(result);
    if (details.id && details.status && details.decision && typeof details.decision === "object") {
        const decision = details.decision;
        const summary = details.compactResult && typeof details.compactResult === "object"
            ? details.compactResult.summary
            : details.id;
        const pid = details.status === "background" && details.pid ? ` · pid ${details.pid}` : "";
        return renderLine(uiDot("agent", `${childVerb(details.status)} · ${displayModel(decision.model)} · ${formatTokenCount(tokensFrom(details))}t${pid} · ${trunc(String(summary), 64)}`), theme);
    }
    if (details.status && Array.isArray(details.members)) {
        const mode = typeof details.mode === "string" ? `${details.mode} · ` : "";
        return renderLine(uiDot("council", `${details.status} · ${mode}${details.members.length} agents · ${formatTokenCount(details.totalTokens)}t`), theme);
    }
    if (details.status && Array.isArray(details.workers)) {
        const council = details.council && typeof details.council === "object" ? details.council.status : "skipped";
        return renderLine(uiDot("workflow", `${details.status} · ${details.workers.length} workers · council ${council} · ${formatTokenCount(details.totalTokens)}t`), theme);
    }
    if (details.task && typeof details.task === "object") {
        const task = details.task;
        return renderLine(uiDot("task", `${task.status ?? "ready"} · ${task.priority ?? "B"} · ${trunc(String(task.title ?? task.id ?? "task"), 56)}`), theme);
    }
    if (Array.isArray(details.tasks)) {
        return renderLine(uiDot("tasks", `${details.tasks.length}/${details.total ?? details.tasks.length}`), theme);
    }
    if (Array.isArray(details.entries)) {
        const first = details.entries[0];
        const body = typeof details.body === "string" ? ` · loaded ${details.body.length}c` : "";
        return renderLine(uiDot("skill", `${details.entries.length}/${details.total ?? details.entries.length}${first?.name ? ` · ${first.name}` : ""}${body}`), theme);
    }
    if (Array.isArray(details.rows)) {
        const first = details.rows[0];
        return renderLine(uiDot("repo", `${details.rows.length}/${details.totalRows ?? details.rows.length}${first?.name ? ` · ${trunc(String(first.name), 42)}` : ""}`), theme);
    }
    if (Array.isArray(details.features)) {
        const first = details.features[0];
        return renderLine(uiDot("feature", `${details.features.length}${first?.id ? ` · ${first.id}` : ""}`), theme);
    }
    if (Array.isArray(details.candidates)) {
        const first = details.candidates[0];
        return renderLine(uiDot("research", `${details.candidates.length}${first?.id ? ` · ${first.id}` : ""}`), theme);
    }
    if (Array.isArray(result.details)) {
        return renderLine(uiDot("agents", `${result.details.length}`), theme);
    }
    if (typeof details.action === "string" && Array.isArray(details.records)) {
        const records = details.records;
        const active = records.filter((record) => record.status === "background" || record.status === "running" || record.status === "starting").length;
        const first = records[0];
        const summary = first?.compactResult && typeof first.compactResult === "object" ? first.compactResult.summary : first?.id;
        return renderLine(uiDot("agents", `${active} running · ${records.length} shown${summary ? ` · ${trunc(String(summary), 48)}` : ""}`), theme);
    }
    const childStatus = lineValue(text, "child_status");
    const childModel = lineValue(text, "model");
    const tokens = lineValue(text, "child_tokens_total");
    if (childStatus) {
        return renderLine(uiDot("agent", `${childVerb(childStatus)} · ${displayModel(childModel)} · ${formatTokenCount(tokens)}t`), theme);
    }
    const routeProfile = lineValue(text, "profile");
    const lane = lineValue(text, "lane");
    if (routeProfile && lane) {
        const model = lineValue(text, "model");
        return renderLine(uiDot("route", model ? displayModel(model) : "ready"), theme);
    }
    const workflowStatus = lineValue(text, "workflow_status");
    if (workflowStatus) {
        return renderLine(uiDot("workflow", `${workflowStatus} · ${lineValue(text, "workers") ?? "0"} workers · council ${lineValue(text, "council_status") ?? "skipped"}`), theme);
    }
    const councilStatus = lineValue(text, "council_status");
    if (councilStatus) {
        return renderLine(uiDot("council", `${councilStatus} · ${lineValue(text, "members") ?? "0"} agents · ${formatTokenCount(lineValue(text, "total_tokens"))}t`), theme);
    }
    return renderLine(uiDot("done", trunc(text.split(/\r?\n/).filter(Boolean)[0] ?? "done", 100)), theme);
}
function publish(ctx, task) {
    const decision = chooseRoute(task);
    setRouterStatus({
        profile: decision.profile,
        lane: decision.lane,
        model: decision.model,
    });
    setRouterUiStatus(ctx, `route ${displayModel(decision.model)}`);
    setRouterUiWidget(ctx, [
        `profile=${decision.profile} lane=${decision.lane} model=${decision.model}`,
        `tools=${decision.tools.join(",")} context=${decision.contextTier} state=${decision.statePolicy} permission=${decision.permissionProfile}`,
        `worktree=${decision.needsWorktree} inherit_context=${decision.inheritContext} parallel=${decision.maxParallelAgents}`,
    ]);
}
function optionBag(params) {
    return params.options && typeof params.options === "object" && !Array.isArray(params.options)
        ? params.options
        : {};
}
function textParam(params, options, key) {
    const value = params[key] ?? options[key];
    return typeof value === "string" ? value : undefined;
}
function numberParam(params, options, key) {
    const value = params[key] ?? options[key];
    return typeof value === "number" ? value : undefined;
}
function booleanParam(params, options, key) {
    const value = params[key] ?? options[key];
    return typeof value === "boolean" ? value : undefined;
}
function stringArrayParam(params, options, key) {
    const value = params[key] ?? options[key];
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : undefined;
}
function objectParam(params, options, key) {
    const value = params[key] ?? options[key];
    return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function isSisoDomain(value) {
    return value === "route" || value === "spawn" || value === "council" || value === "workflow" || value === "orchestrate" || value === "child" || value === "task" || value === "skill" || value === "repo";
}
function councilModeParam(params, options) {
    const value = textParam(params, options, "mode") ?? textParam(params, options, "op");
    return value === "compare" || value === "synthesize" || value === "review" ? value : undefined;
}
function formatChildRunRecords(records) {
    return records.length > 0
        ? records.map(formatAgentRecord).join("\n")
        : "No child run records found.";
}
function formatAgentRecord(record) {
    const active = record.status === "background" || record.status === "running" || record.status === "starting";
    const dot = record.status === "completed" ? "✓" : active ? "●" : record.status === "failed" || record.status === "timeout" || record.status === "aborted" ? "!" : "•";
    const tokens = record.tokens?.totalTokens ?? 0;
    const summary = record.compactResult?.summary ? ` · ${trunc(record.compactResult.summary, 90)}` : "";
    const pid = record.pid ? ` · pid ${record.pid}` : "";
    return `${dot} ${record.id} · ${childVerb(record.status)} · ${record.profile} · ${ageSince(record.startedAt)} · ${formatTokenCount(tokens)}t${pid}${summary}`;
}
function defaultSpawnBackground() {
    if (process.env.SISO_SPAWN_DEFAULT_BACKGROUND === "1")
        return true;
    if (process.env.SISO_SPAWN_DEFAULT_BACKGROUND === "0")
        return false;
    return undefined;
}
async function agentsCommand(args, ctx) {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    const firstIsLimit = /^\d+$/.test(parts[0] ?? "");
    const op = firstIsLimit ? "list" : parts[0] ?? "list";
    const id = parts[1];
    const limit = Number.parseInt(firstIsLimit ? parts[0] ?? "" : parts[1] ?? "", 10);
    const childOp = op === "show" ? "status" : op === "tail" ? "logs" : op;
    const result = childOp === "list"
        ? await controlChildRun({ action: "list", limit: Number.isFinite(limit) ? limit : 12 })
        : await controlChildRun({ action: childOp, ...(id ? { id } : {}) });
    const records = result.records.length ? result.records : collectLatestChildRunRecords(Number.isFinite(limit) ? limit : 12);
    setRouterStatus({
        children: Object.fromEntries(records.map((record) => [record.id, {
                id: record.id,
                status: record.status,
                profile: record.profile,
                lane: record.lane,
                model: record.model,
                startedAt: record.startedAt,
                updatedAt: record.updatedAt,
                ...(record.pid !== undefined ? { pid: record.pid } : {}),
                ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
                ...(record.completedAt ? { durationMs: Date.parse(record.completedAt) - Date.parse(record.startedAt) } : {}),
                tokens: record.tokens,
                toolCalls: record.toolCalls,
                compactResult: record.compactResult,
                ...(record.error ? { error: record.error } : {}),
                runRecordPath: record.runRecordPath,
            }])),
    });
    setRouterUiStatus(ctx, `agents ${records.filter((record) => record.status === "background" || record.status === "running" || record.status === "starting").length} running`);
    return { content: [{ type: "text", text: formatChildRunRecords(records) }], details: { action: "agents", records } };
}
function inferDomain(params, options) {
    const explicit = textParam(params, options, "domain");
    if (explicit)
        return explicit;
    if (textParam(params, options, "skillId"))
        return "skill";
    if (textParam(params, options, "title") || textParam(params, options, "status"))
        return "task";
    if (textParam(params, options, "id") || textParam(params, options, "message"))
        return "child";
    if (textParam(params, options, "priority") || textParam(params, options, "lane") || textParam(params, options, "catalog"))
        return "repo";
    return textParam(params, options, "task") ? "route" : "skill";
}
function compositePermissionMode(domain, op) {
    if (domain === "route" || domain === "skill" || domain === "repo")
        return "plan";
    if (domain === "child" && (op === undefined || op === "list" || op === "runs" || op === "records" || op === "status" || op === "stats" || op === "logs"))
        return "plan";
    return "ask";
}
function compositeRunId(domain, op) {
    return `siso-${domain}${op ? `-${op}` : ""}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function appendEventsToDetails(details, events) {
    if (!details || typeof details !== "object" || Array.isArray(details))
        return details;
    const record = details;
    const existing = Array.isArray(record.events) ? record.events.filter((event) => Boolean(event && typeof event === "object")) : [];
    return {
        ...record,
        events: [...events.slice(0, 1), ...existing, ...events.slice(1)],
    };
}
function withCompositeEvents(result, context) {
    const text = result.content.map((item) => item.type === "text" ? item.text : "").filter(Boolean).join("\n");
    const events = [
        createAgentEvent({
            type: "permission_check",
            runId: context.runId,
            surface: "foreground",
            mode: compositePermissionMode(context.domain, context.op),
            action: context.op ? `${context.domain}/${context.op}` : context.domain,
            allowed: context.allowed,
            ...(context.reason ? { reason: context.reason } : {}),
        }),
        createAgentEvent({
            type: "tool_result",
            runId: context.runId,
            surface: "foreground",
            toolName: "siso",
            ok: context.allowed,
            summary: text.split(/\r?\n/).find(Boolean) ?? "siso completed",
        }),
    ];
    return {
        ...result,
        details: appendEventsToDetails(result.details, events),
    };
}
async function executeSiso(params, signal, ctx, pi) {
    const options = optionBag(params);
    const rawDomain = textParam(params, options, "domain")?.toLowerCase();
    const rawAction = textParam(params, options, "action")?.toLowerCase();
    const [actionDomain, actionOp] = rawAction?.split("/", 2) ?? [];
    const domain = (rawDomain ?? (isSisoDomain(actionDomain) ? actionDomain : undefined) ?? (isSisoDomain(rawAction) ? rawAction : undefined) ?? inferDomain(params, options)).toLowerCase();
    const op = (textParam(params, options, "op") ?? (rawDomain ? rawAction : undefined) ?? actionOp)?.toLowerCase();
    const guard = guardSisoAction({
        domain,
        op,
        command: textParam(params, options, "command") ?? textParam(params, options, "task") ?? textParam(params, options, "message"),
    });
    const runId = compositeRunId(domain, op);
    if (!guard.allowed)
        throw new Error(guard.reason ?? "worker_guard blocked action");
    if (domain === "route") {
        const task = textParam(params, options, "task") ?? textParam(params, options, "query") ?? "";
        publish(ctx, task);
        const decision = chooseRoute(task);
        const packet = decision.model === "codex" ? loadCodexCasePacket(task, { maxChars: 12000 }) : undefined;
        return withCompositeEvents({ content: [{ type: "text", text: [formatDecision(task, decision), packet ? `\n# Codex Case Packet Preview\n${packet}` : ""].join("") }], details: { ...decision, ...(packet ? { codexCasePacketChars: packet.length } : {}) } }, { runId, domain, op, allowed: true });
    }
    if (domain === "spawn") {
        const task = textParam(params, options, "task") ?? "";
        if (!task)
            throw new Error("task is required for domain=spawn");
        publish(ctx, task);
        const result = await executeSpawnWithNativeSubagentBridge({
            task,
            ctx: pi ? { ...ctx, getAllTools: pi.getAllTools } : ctx,
            signal,
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            ...(booleanParam(params, options, "background") !== undefined ? { background: booleanParam(params, options, "background") } : defaultSpawnBackground() !== undefined ? { background: defaultSpawnBackground() } : {}),
            ...(numberParam(params, options, "maxDepth") !== undefined ? { maxDepth: numberParam(params, options, "maxDepth") } : {}),
            ...(booleanParam(params, options, "noTools") !== undefined ? { noTools: booleanParam(params, options, "noTools") } : {}),
        });
        const details = result.details && typeof result.details === "object" ? result.details : {};
        const decision = details.decision && typeof details.decision === "object" ? details.decision : undefined;
        const model = typeof decision?.model === "string" ? decision.model : undefined;
        const runtime = result.usedNative ? "native-subagent" : "legacy";
        setRouterUiStatus(ctx, `agent ${runtime}${model ? ` ${displayModel(model)}` : ""}`);
        return withCompositeEvents({ content: result.content, details: result.details }, { runId, domain, op, allowed: true });
    }
    if (domain === "council") {
        const task = textParam(params, options, "task") ?? textParam(params, options, "query") ?? "";
        if (!task)
            throw new Error("task is required for domain=council");
        publish(ctx, task);
        const result = await runCouncil(task, {
            ...(councilModeParam(params, options) ? { mode: councilModeParam(params, options) } : {}),
            ...(stringArrayParam(params, options, "members") ? { members: stringArrayParam(params, options, "members") } : {}),
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(textParam(params, options, "rubric") ? { rubric: textParam(params, options, "rubric") } : {}),
            ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { maxMembers: numberParam(params, options, "limit") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            ...(booleanParam(params, options, "noTools") !== undefined ? { noTools: booleanParam(params, options, "noTools") } : {}),
        }, signal);
        setRouterUiStatus(ctx, `council ${result.status} ${result.members.length} ${result.totalTokens}t`);
        return withCompositeEvents({ content: [{ type: "text", text: formatCouncilResult(result) }], details: result }, { runId, domain, op, allowed: true });
    }
    if (domain === "workflow" || domain === "orchestrate") {
        const task = textParam(params, options, "task") ?? textParam(params, options, "query") ?? "";
        if (!task)
            throw new Error("task is required for domain=workflow");
        publish(ctx, task);
        const result = await runWorkflow(task, {
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
            ...(numberParam(params, options, "workerCount") !== undefined ? { workerCount: numberParam(params, options, "workerCount") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            ...(booleanParam(params, options, "background") !== undefined ? { background: booleanParam(params, options, "background") } : {}),
            ...(booleanParam(params, options, "noTools") !== undefined ? { noTools: booleanParam(params, options, "noTools") } : {}),
            ...(booleanParam(params, options, "council") !== undefined ? { council: booleanParam(params, options, "council") } : {}),
        }, signal);
        setRouterUiStatus(ctx, `workflow ${result.status} workers=${result.workers.length} ${result.totalTokens}t`);
        return withCompositeEvents({ content: [{ type: "text", text: formatWorkflowResult(result) }], details: result }, { runId, domain, op, allowed: true });
    }
    if (domain === "child") {
        if (op === "cleanup") {
            const result = cleanupChildRunLogs({
                ...(numberParam(params, options, "maxAgeHours") !== undefined ? { maxAgeHours: numberParam(params, options, "maxAgeHours") } : {}),
                ...(numberParam(params, options, "maxRuns") !== undefined ? { maxRuns: numberParam(params, options, "maxRuns") } : {}),
                ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            });
            return {
                content: [{ type: "text", text: `scanned_runs=${result.scannedRuns}\nremoved_files=${result.removedFiles.length}\nremoved_bytes=${result.removedBytes}\ndry_run=${result.dryRun}` }],
                details: result,
            };
        }
        if (op === "stats") {
            const stats = getChildRunStorageStats();
            return { content: [{ type: "text", text: `runs=${stats.runs}\nactive_runs=${stats.activeRuns}\ncompleted_runs=${stats.completedRuns}\nfailed_runs=${stats.failedRuns}\ntotal_bytes=${stats.totalBytes}` }], details: stats };
        }
        if (op === "runs" || op === "records") {
            const id = textParam(params, options, "id");
            const records = id ? [collectChildRunRecord(id)].filter((record) => Boolean(record)) : collectLatestChildRunRecords(numberParam(params, options, "limit") ?? 5);
            return { content: [{ type: "text", text: formatChildRunRecords(records) }], details: records };
        }
        const result = await controlChildRun({
            action: (op ?? "list"),
            ...(textParam(params, options, "id") ? { id: textParam(params, options, "id") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
            ...(textParam(params, options, "signal") === "SIGTERM" || textParam(params, options, "signal") === "SIGKILL" ? { signal: textParam(params, options, "signal") } : {}),
            ...(textParam(params, options, "message") ? { message: textParam(params, options, "message") } : {}),
            ...(booleanParam(params, options, "background") !== undefined ? { background: booleanParam(params, options, "background") } : {}),
            ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
        });
        return { content: [{ type: "text", text: result.text }], details: result };
    }
    if (domain === "task") {
        const taskAction = op ?? (textParam(params, options, "id") ? "update" : textParam(params, options, "title") ? "create" : "list");
        if (taskAction === "create") {
            const result = createSisoTask({
                ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
                title: textParam(params, options, "title") ?? "",
                ...(textParam(params, options, "description") ? { description: textParam(params, options, "description") } : {}),
                ...(textParam(params, options, "status") ? { status: textParam(params, options, "status") } : {}),
                ...(textParam(params, options, "priority") ? { priority: textParam(params, options, "priority") } : {}),
                ...(textParam(params, options, "owner") ? { owner: textParam(params, options, "owner") } : {}),
                ...(stringArrayParam(params, options, "blockedBy") ? { blockedBy: stringArrayParam(params, options, "blockedBy") } : {}),
                ...(objectParam(params, options, "metadata") ? { metadata: objectParam(params, options, "metadata") } : {}),
            });
            return { content: [{ type: "text", text: `store=${result.path}\n${formatSisoTask(result.task)}` }], details: result };
        }
        if (taskAction === "update") {
            const result = updateSisoTask({
                ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
                id: textParam(params, options, "id") ?? "",
                ...(textParam(params, options, "title") ? { title: textParam(params, options, "title") } : {}),
                ...(textParam(params, options, "description") ? { description: textParam(params, options, "description") } : {}),
                ...(textParam(params, options, "status") ? { status: textParam(params, options, "status") } : {}),
                ...(textParam(params, options, "priority") ? { priority: textParam(params, options, "priority") } : {}),
                ...(textParam(params, options, "owner") ? { owner: textParam(params, options, "owner") } : {}),
                ...(stringArrayParam(params, options, "blockedBy") ? { blockedBy: stringArrayParam(params, options, "blockedBy") } : {}),
                ...(objectParam(params, options, "metadata") ? { metadata: objectParam(params, options, "metadata") } : {}),
            });
            return { content: [{ type: "text", text: `store=${result.path}\n${formatSisoTask(result.task)}` }], details: result };
        }
        const result = listSisoTasks({
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(textParam(params, options, "status") ? { status: textParam(params, options, "status") } : {}),
            ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
        });
        return { content: [{ type: "text", text: formatSisoTaskList(result) }], details: result };
    }
    if (domain === "skill") {
        const result = querySkillHub({
            ...(op ? { op: op } : {}),
            ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
            ...(textParam(params, options, "skillId") ? { skillId: textParam(params, options, "skillId") } : {}),
            ...(textParam(params, options, "section") ? { section: textParam(params, options, "section") } : {}),
            ...(textParam(params, options, "source") ? { source: textParam(params, options, "source") } : {}),
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
            ...(numberParam(params, options, "maxChars") !== undefined ? { maxChars: numberParam(params, options, "maxChars") } : {}),
        });
        return { content: [{ type: "text", text: formatSkillHubResult(result) }], details: result };
    }
    if (domain === "repo") {
        const repoAction = textParam(params, options, "repoAction") ?? op;
        if (repoAction === "integrations" || repoAction === "mvp" || repoAction === "steal") {
            const result = recommendResearchIntegrations({
                ...(textParam(params, options, "priority") ? { priority: textParam(params, options, "priority") } : {}),
                ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
                ...(repoAction === "steal" ? { action: "steal-next" } : {}),
                ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
            });
            return { content: [{ type: "text", text: formatResearchIntegrationQueue(result) }], details: result };
        }
        if (repoAction === "recommend" || repoAction === "features") {
            const result = recommendHarnessFeatures({
                ...(textParam(params, options, "catalog") === "broad" || textParam(params, options, "catalog") === "both" || textParam(params, options, "catalog") === "cloned" ? { catalog: textParam(params, options, "catalog") } : {}),
                ...(textParam(params, options, "priority") ? { priority: textParam(params, options, "priority") } : {}),
                ...(textParam(params, options, "lane") ? { lane: textParam(params, options, "lane") } : {}),
                ...(textParam(params, options, "kind") ? { kind: textParam(params, options, "kind") } : {}),
                ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
                ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
            });
            return { content: [{ type: "text", text: formatHarnessFeatureRecommendations(result) }], details: result };
        }
        const result = queryRepoCatalog({
            ...(textParam(params, options, "catalog") === "broad" || textParam(params, options, "catalog") === "both" || textParam(params, options, "catalog") === "cloned" ? { catalog: textParam(params, options, "catalog") } : {}),
            ...(textParam(params, options, "priority") ? { priority: textParam(params, options, "priority") } : {}),
            ...(textParam(params, options, "lane") ? { lane: textParam(params, options, "lane") } : {}),
            ...(repoAction ? { action: repoAction } : {}),
            ...(textParam(params, options, "kind") ? { kind: textParam(params, options, "kind") } : {}),
            ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
        });
        return { content: [{ type: "text", text: formatRepoCatalogResult(result) }], details: result };
    }
    throw new Error(`unsupported siso domain: ${domain}`);
}
export default function sisoAgentRouterExtension(pi) {
    pi.on("before_agent_start", (event, ctx) => {
        const prompt = typeof event.prompt === "string" ? event.prompt : "";
        if (prompt)
            publish(ctx, prompt);
        const guard = evaluatePiChildGuardrail({ prompt });
        if (!guard.allowed) {
            setRouterUiStatus(ctx, guard.reason ?? "worker_guard blocked Pi child orchestration");
            setRouterUiWidget(ctx, [
                guard.reason ?? "worker_guard blocked Pi child orchestration",
                `matches=${guard.matches.map((match) => `${match.kind}:${match.value}`).join(",")}`,
            ]);
        }
    });
    pi.registerCommand("siso-route", {
        description: "Choose the automatic SISO Pi route for a task without starting a child agent",
        handler: async (args, ctx) => {
            const task = args.trim();
            publish(ctx, task);
            const decision = chooseRoute(task);
            return {
                content: [{ type: "text", text: formatDecision(task, decision) }],
            };
        },
    });
    pi.registerCommand("agents", {
        description: "List SISO background subagents. Usage: /agents [limit], /agents status <id>, /agents logs <id>, /agents interrupt <id>",
        handler: async (args, ctx) => agentsCommand(args, ctx),
    });
    pi.registerTool({
        name: "siso",
        label: "SISO Router",
        description: "SISO router: route/spawn/council/workflow, child runs, tasks, skills, repos.",
        promptSnippet: "Use siso first: action=route|spawn|council|workflow|child|task|skill|repo; op for sub-actions.",
        promptGuidelines: [
            "Route before delegating.",
            "Spawn bounded child work.",
            "Council for multi-agent compare/review/synthesis.",
            "Workflow for plan/task/worker fan-out in one bounded call.",
            "Lazy-load one skill at a time.",
            "Child ops: list,status,logs,resume,runs,cleanup,stats.",
        ],
        parameters: SISO_PARAMS,
        renderShell: "self",
        renderCall: renderSisoCall,
        renderResult: renderSisoResult,
        async execute(_toolCallId, params, signal, _onUpdate, ctx) {
            return executeSiso(params, signal, ctx, pi);
        },
    });
    if (process.env.SISO_AGENT_ROUTER_TOOL_MODE === "lean") {
        return;
    }
    pi.registerTool({
        name: "siso_route",
        label: "SISO Route",
        description: "Choose the cheapest capable SISO Pi subagent profile for a task. This only decides routing; it does not spawn the subagent.",
        promptSnippet: "Use siso_route before delegating work to choose model, tools, context inheritance, and worktree policy.",
        promptGuidelines: [
            "Do not expose manual lean/code/full modes to the user.",
            "Use worktrees per sprint or task, not per subagent.",
            "Prefer MiniMax/Haiku for read, search, verification, and small edits.",
            "Escalate complex rescue, repeated failures, and adversarial review to Codex.",
        ],
        parameters: PARAMS,
        async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
            const task = typeof params.task === "string" ? params.task : "";
            publish(ctx, task);
            const decision = chooseRoute(task);
            return {
                content: [{ type: "text", text: formatDecision(task, decision) }],
                details: decision,
            };
        },
    });
    pi.registerTool({
        name: "siso_spawn",
        label: "SISO Spawn",
        description: "Spawn a lean Pi child agent from the SISO profile registry and return its result, lifecycle, and token usage.",
        promptSnippet: "Use siso_spawn when you need to delegate a bounded task to the chosen SISO child-agent profile.",
        promptGuidelines: [
            "Prefer siso_route first when you only need a decision.",
            "Use siso_spawn for bounded child-agent work, not open-ended foreground chat.",
            "Do not create one worktree per child agent; worktrees are allocated per sprint or task.",
            "Keep child prompts concrete and small so token bloat stays visible.",
        ],
        parameters: SPAWN_PARAMS,
        renderShell: "self",
        renderCall: renderSisoCall,
        renderResult: renderSisoResult,
        async execute(_toolCallId, params, signal, _onUpdate, ctx) {
            const guard = evaluatePiChildGuardrail({ toolName: "siso_spawn", params });
            if (!guard.allowed)
                throw new Error(guard.reason ?? "worker_guard blocked action");
            const task = params.task ?? "";
            if (typeof task !== "string")
                throw new Error("task must be a string");
            publish(ctx, task);
            const result = await executeSpawnWithNativeSubagentBridge({
                task,
                ctx: pi ? { ...ctx, getAllTools: pi.getAllTools } : ctx,
                signal,
                ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
                ...(typeof params.timeoutMs === "number" ? { timeoutMs: params.timeoutMs } : {}),
                ...(typeof params.dryRun === "boolean" ? { dryRun: params.dryRun } : {}),
                ...(typeof params.background === "boolean" ? { background: params.background } : defaultSpawnBackground() !== undefined ? { background: defaultSpawnBackground() } : {}),
                ...(typeof params.maxDepth === "number" ? { maxDepth: params.maxDepth } : {}),
                ...(typeof params.noTools === "boolean" ? { noTools: params.noTools } : {}),
            });
            const details = result.details && typeof result.details === "object" ? result.details : {};
            const decision = details.decision && typeof details.decision === "object" ? details.decision : undefined;
            const model = typeof decision?.model === "string" ? decision.model : undefined;
            const profile = typeof decision?.profile === "string" ? decision.profile : "unknown";
            const lane = typeof decision?.lane === "string" ? decision.lane : "unknown";
            const runtime = result.usedNative ? "native-subagent" : "legacy";
            setRouterUiStatus(ctx, `agent ${runtime}${model ? ` ${displayModel(model)}` : ""}`);
            setRouterUiWidget(ctx, [
                `runtime=${runtime} profile=${profile} lane=${lane}${model ? ` model=${model}` : ""}`,
            ]);
            return { content: result.content, details: result.details };
        },
    });
    pi.registerTool({
        name: "siso_child",
        label: "SISO Child",
        description: "Control and inspect SISO child-agent runs: list, status, logs, interrupt, or resume.",
        promptSnippet: "Use siso_child to inspect background child agents before spawning more work.",
        promptGuidelines: [
            "Use action=list before assuming a child is gone.",
            "Use action=status for one child id.",
            "Use action=logs only when the compact result is insufficient.",
            "Use action=interrupt only for a SISO child run you intentionally started.",
        ],
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    description: "list, status, logs, interrupt, or resume.",
                },
                id: {
                    type: "string",
                    description: "Child id for status/logs/interrupt.",
                },
                limit: {
                    type: "number",
                    description: "Number of latest runs for action=list. Defaults to 10.",
                },
                signal: {
                    type: "string",
                    description: "SIGTERM or SIGKILL for action=interrupt. Defaults to SIGTERM.",
                },
                message: {
                    type: "string",
                    description: "Follow-up message for action=resume.",
                },
                background: {
                    type: "boolean",
                    description: "When true, resumed child runs in background. Defaults to true.",
                },
                timeoutMs: {
                    type: "number",
                    description: "Optional timeout for foreground resume.",
                },
            },
            required: ["action"],
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const guard = evaluatePiChildGuardrail({ toolName: "siso_child", params });
            if (!guard.allowed)
                throw new Error(guard.reason ?? "worker_guard blocked action");
            const action = typeof params.action === "string" ? params.action : "list";
            const result = await controlChildRun({
                action: action,
                ...(typeof params.id === "string" ? { id: params.id } : {}),
                ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
                ...(params.signal === "SIGTERM" || params.signal === "SIGKILL" ? { signal: params.signal } : {}),
                ...(typeof params.message === "string" ? { message: params.message } : {}),
                ...(typeof params.background === "boolean" ? { background: params.background } : {}),
                ...(typeof params.timeoutMs === "number" ? { timeoutMs: params.timeoutMs } : {}),
            });
            return {
                content: [{ type: "text", text: result.text }],
                details: result,
            };
        },
    });
    pi.registerTool({
        name: "siso_child_runs",
        label: "SISO Child Runs",
        description: "Collect file-backed SISO child-agent runs and return compact persisted summaries.",
        parameters: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Optional child id to collect. If omitted, returns latest child runs.",
                },
                limit: {
                    type: "number",
                    description: "Number of latest runs to return when id is omitted. Defaults to 5.",
                },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const id = typeof params.id === "string" ? params.id : undefined;
            const records = id ? [collectChildRunRecord(id)].filter(Boolean) : collectLatestChildRunRecords(typeof params.limit === "number" ? params.limit : 5);
            return {
                content: [{
                        type: "text",
                        text: records.length > 0
                            ? records.map((record) => record
                                ? [
                                    `child_id=${record.id}`,
                                    `status=${record.status}`,
                                    `tokens=${record.tokens.totalTokens}`,
                                ].join(" ")
                                : "").filter(Boolean).join("\n")
                            : "No child run records found.",
                    }],
                details: records,
            };
        },
    });
    pi.registerTool({
        name: "siso_child_cleanup",
        label: "SISO Child Cleanup",
        description: "Prune old persisted child-agent stdout/stderr logs while keeping compact JSON run records.",
        parameters: {
            type: "object",
            properties: {
                maxAgeHours: {
                    type: "number",
                    description: "Remove completed child stdout/stderr logs older than this many hours. Defaults to 24.",
                },
                maxRuns: {
                    type: "number",
                    description: "Keep logs for this many newest child runs regardless of age. Defaults to 50.",
                },
                dryRun: {
                    type: "boolean",
                    description: "When true, report what would be removed without deleting files.",
                },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const result = cleanupChildRunLogs({
                ...(typeof params.maxAgeHours === "number" ? { maxAgeHours: params.maxAgeHours } : {}),
                ...(typeof params.maxRuns === "number" ? { maxRuns: params.maxRuns } : {}),
                ...(typeof params.dryRun === "boolean" ? { dryRun: params.dryRun } : {}),
            });
            return {
                content: [{
                        type: "text",
                        text: [
                            `scanned_runs=${result.scannedRuns}`,
                            `removed_files=${result.removedFiles.length}`,
                            `removed_bytes=${result.removedBytes}`,
                            `dry_run=${result.dryRun}`,
                            `files=${result.removedFiles.slice(0, 10).join(",") || "none"}`,
                        ].join("\n"),
                    }],
                details: result,
            };
        },
    });
    pi.registerTool({
        name: "siso_child_stats",
        label: "SISO Child Stats",
        description: "Return persisted child-run storage stats for tuning retention and cleanup defaults.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
        },
        async execute() {
            const stats = getChildRunStorageStats();
            return {
                content: [{
                        type: "text",
                        text: [
                            `runs=${stats.runs}`,
                            `active_runs=${stats.activeRuns}`,
                            `completed_runs=${stats.completedRuns}`,
                            `failed_runs=${stats.failedRuns}`,
                            `record_bytes=${stats.recordBytes}`,
                            `stdout_bytes=${stats.stdoutBytes}`,
                            `stderr_bytes=${stats.stderrBytes}`,
                            `total_bytes=${stats.totalBytes}`,
                            `estimated_daily_growth_bytes=${stats.estimatedDailyGrowthBytes}`,
                            `oldest_updated_at=${stats.oldestUpdatedAt ?? "none"}`,
                            `newest_updated_at=${stats.newestUpdatedAt ?? "none"}`,
                        ].join("\n"),
                    }],
                details: stats,
            };
        },
    });
    pi.registerTool({
        name: "siso_task_create",
        label: "SISO Task Create",
        description: "Create a durable SISO task with automatic route/profile metadata for Pi child-agent coordination.",
        promptSnippet: "Use siso_task_create when a user request should be broken into durable work items before spawning child agents.",
        promptGuidelines: [
            "Create task state before spawning multiple workers.",
            "Use one task or sprint worktree for many agents; do not create worktrees per agent.",
            "Keep title and description concise so child agents receive small briefs.",
        ],
        parameters: {
            type: "object",
            properties: {
                cwd: { type: "string", description: "Project root for .pi/tasks/siso-tasks.json. Defaults to current cwd." },
                title: { type: "string", description: "Short task title." },
                description: { type: "string", description: "Task brief for agents." },
                status: { type: "string", description: "backlog, ready, running, blocked, done, failed, or cancelled." },
                priority: { type: "string", description: "A, B, C, or D." },
                owner: { type: "string", description: "Optional owner/profile/person." },
                blockedBy: { type: "array", items: { type: "string" }, description: "Task ids blocking this task." },
                metadata: { type: "object", description: "Optional JSON metadata." },
            },
            required: ["title"],
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const result = createSisoTask({
                ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
                title: String(params.title ?? ""),
                ...(typeof params.description === "string" ? { description: params.description } : {}),
                ...(typeof params.status === "string" ? { status: params.status } : {}),
                ...(typeof params.priority === "string" ? { priority: params.priority } : {}),
                ...(typeof params.owner === "string" ? { owner: params.owner } : {}),
                ...(Array.isArray(params.blockedBy) ? { blockedBy: params.blockedBy.filter((item) => typeof item === "string") } : {}),
                ...(params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata) ? { metadata: params.metadata } : {}),
            });
            return {
                content: [{ type: "text", text: `store=${result.path}\n${formatSisoTask(result.task)}` }],
                details: result,
            };
        },
    });
    pi.registerTool({
        name: "siso_task_list",
        label: "SISO Task List",
        description: "List durable SISO tasks with route/profile metadata for orchestration and status.",
        parameters: {
            type: "object",
            properties: {
                cwd: { type: "string", description: "Project root for .pi/tasks/siso-tasks.json. Defaults to current cwd." },
                status: { type: "string", description: "Optional status filter." },
                query: { type: "string", description: "Optional text search over title, description, profile, lane, model, and owner." },
                limit: { type: "number", description: "Maximum tasks to return. Defaults to 20, max 100." },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const result = listSisoTasks({
                ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
                ...(typeof params.status === "string" ? { status: params.status } : {}),
                ...(typeof params.query === "string" ? { query: params.query } : {}),
                ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
            });
            return {
                content: [{ type: "text", text: formatSisoTaskList(result) }],
                details: result,
            };
        },
    });
    pi.registerTool({
        name: "siso_task_update",
        label: "SISO Task Update",
        description: "Update a durable SISO task and refresh route/profile metadata if the task brief changes.",
        parameters: {
            type: "object",
            properties: {
                cwd: { type: "string", description: "Project root for .pi/tasks/siso-tasks.json. Defaults to current cwd." },
                id: { type: "string", description: "Task id." },
                title: { type: "string", description: "Replacement title." },
                description: { type: "string", description: "Replacement description." },
                status: { type: "string", description: "backlog, ready, running, blocked, done, failed, or cancelled." },
                priority: { type: "string", description: "A, B, C, or D." },
                owner: { type: "string", description: "Optional owner/profile/person." },
                blockedBy: { type: "array", items: { type: "string" }, description: "Task ids blocking this task." },
                metadata: { type: "object", description: "Metadata to merge into the existing task metadata." },
            },
            required: ["id"],
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const result = updateSisoTask({
                ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
                id: String(params.id ?? ""),
                ...(typeof params.title === "string" ? { title: params.title } : {}),
                ...(typeof params.description === "string" ? { description: params.description } : {}),
                ...(typeof params.status === "string" ? { status: params.status } : {}),
                ...(typeof params.priority === "string" ? { priority: params.priority } : {}),
                ...(typeof params.owner === "string" ? { owner: params.owner } : {}),
                ...(Array.isArray(params.blockedBy) ? { blockedBy: params.blockedBy.filter((item) => typeof item === "string") } : {}),
                ...(params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata) ? { metadata: params.metadata } : {}),
            });
            return {
                content: [{ type: "text", text: `store=${result.path}\n${formatSisoTask(result.task)}` }],
                details: result,
            };
        },
    });
    pi.registerTool({
        name: "siso_skill_hub",
        label: "SISO Skill Hub",
        description: "Search global SISO/Claude/Codex skills by name and short description without loading full skill bodies into the prompt.",
        promptSnippet: "Use siso_skill_hub to discover the right skill pointer, then load only the selected skill body.",
        promptGuidelines: [
            "Do not dump all skills into the prompt.",
            "Search by intent, then load one selected skill.",
            "Prefer global SISO skills before generic third-party skills when both match.",
        ],
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Optional search text over name, description, source, and path." },
                op: { type: "string", description: "list, search, route, info, or load_body. Defaults to search when query is provided, otherwise list." },
                skillId: { type: "string", description: "Specific skill id or name for info/load_body." },
                section: { type: "string", description: "Optional heading section to load for load_body." },
                source: { type: "string", description: "Optional source filter: claude, agents, codex, or superpowers." },
                limit: { type: "number", description: "Maximum skills to return. Defaults to 20, max 100." },
                maxChars: { type: "number", description: "Max body preview chars for info/load_body. Defaults to 800/4000." },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const result = querySkillHub({
                ...(typeof params.op === "string" ? { op: params.op } : {}),
                ...(typeof params.query === "string" ? { query: params.query } : {}),
                ...(typeof params.skillId === "string" ? { skillId: params.skillId } : {}),
                ...(typeof params.section === "string" ? { section: params.section } : {}),
                ...(typeof params.source === "string" ? { source: params.source } : {}),
                ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
                ...(typeof params.maxChars === "number" ? { maxChars: params.maxChars } : {}),
            });
            return {
                content: [{ type: "text", text: formatSkillHubResult(result) }],
                details: result,
            };
        },
    });
    pi.registerTool({
        name: "siso_repo_candidates",
        label: "SISO Repo Candidates",
        description: "Query broad or cloned repo candidate catalogs so agents can choose what to inspect/build without loading huge Markdown catalogs.",
        promptSnippet: "Use siso_repo_candidates before inspecting research repos. Use catalog=broad for discovery and catalog=cloned for locally reviewed build candidates.",
        promptGuidelines: [
            "Prefer priority A for immediate build influence.",
            "Use lane to split parallel research across agents.",
            "Use action=build-now or action=steal-patterns when choosing the next implementation candidate.",
            "Read candidate source files only after this tool returns a small target set.",
        ],
        parameters: {
            type: "object",
            properties: {
                priority: {
                    type: "string",
                    description: "Optional priority filter: A, B, C, or D.",
                },
                catalog: {
                    type: "string",
                    description: "Catalog layer to query: cloned, broad, or both. Defaults to cloned.",
                },
                lane: {
                    type: "string",
                    description: "Optional lane filter such as pi, context-pack, code-graph, memory, harness, skills, swarm, or Broad labels like Workers / Subagents.",
                },
                action: {
                    type: "string",
                    description: "Optional action filter such as build-now, inspect-next, steal-patterns, adapter-later.",
                },
                kind: {
                    type: "string",
                    description: "Optional broad-catalog kind filter such as npm-package or sourcegraph-repo.",
                },
                query: {
                    type: "string",
                    description: "Optional case-insensitive text search over id, URL, lane, action, setup, license, description, and steal notes.",
                },
                limit: {
                    type: "number",
                    description: "Maximum rows to return. Defaults to 12, max 50.",
                },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const result = queryRepoCatalog({
                ...(params.catalog === "broad" || params.catalog === "both" || params.catalog === "cloned" ? { catalog: params.catalog } : {}),
                ...(typeof params.priority === "string" ? { priority: params.priority } : {}),
                ...(typeof params.lane === "string" ? { lane: params.lane } : {}),
                ...(typeof params.action === "string" ? { action: params.action } : {}),
                ...(typeof params.kind === "string" ? { kind: params.kind } : {}),
                ...(typeof params.query === "string" ? { query: params.query } : {}),
                ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
            });
            return {
                content: [{ type: "text", text: formatRepoCatalogResult(result) }],
                details: result,
            };
        },
    });
}
