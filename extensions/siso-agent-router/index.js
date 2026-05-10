import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { Text } from "@mariozechner/pi-tui";
import { chooseRoute, formatDecision } from "./route-policy.js";
import { loadCodexCasePacket } from "./codex-case-packet.js";
import { formatCouncilResult, runCouncil } from "./council-layer.js";
import { formatExtensionCatalogResult, queryExtensionCatalog, queryExtensionCatalogAsync } from "./extension-catalog.js";
import { formatHarnessFeatureRecommendations, formatRepoCatalogResult, formatResearchIntegrationQueue, queryRepoCatalog, recommendHarnessFeatures, recommendResearchIntegrations } from "./repo-catalog.js";
import { formatSkillHubResult, getSkillCatalog, querySkillHub } from "./skill-hub.js";
import { applyPatch, autopilotFixLoop, autopilotPlan, briefRepo, capabilityAdd, capabilityAudit, capabilitySearch, capabilityShow, capabilityUpdate, codeQuery, contextPack, docUpdate, fileOutline, formatToolResult, gatherContext, markdownOutline, projectMap, projectTree, publicCodeSearch, rankedRepoMap, readMany, relatedChecks, repoIndexBuild, repoIndexStatus, repoSearch, runCheck, runtimeSummary, symbolSearch, toolInventory, toolLoad, toolRecommend, toolSearch, toolShow, toolStats, toolUnload, workspaceDiff, workspaceStatus } from "./tooling-actions.js";
import { stripFrontmatter } from "../../node_modules/@mariozechner/pi-coding-agent/dist/utils/frontmatter.js";
import { cleanupChildRunLogs, collectChildRunRecord, collectLatestChildRunRecords, compactChildRunRecord, controlChildRun, getChildRunStorageStats, setRouterStatus } from "./spawn-layer.js";
import { executeSpawnWithNativeSubagentBridge } from "./native-subagent-bridge.js";
import { startChildNotificationDispatcher } from "./notifications.js";
import { listMailboxMessages, markMailboxAcknowledged, markMailboxRead, readFeedEvents, readMailboxMessage } from "./mailbox-feed.js";
import { isToolAllowed, loadProjectAgentRegistry, normalizeToolAcl } from "./project-agent-registry.js";
import { createDeadletterRecord, listSupervisorRecords, nextRetryState, persistSupervisorRecord, shouldCleanupOrphanProcess, summarizeSupervisorHealth } from "./subagent-supervisor.js";
import { listAgentScorecards, recordAgentScorecard, summarizeAgentScorecards } from "./agent-scorecards.js";
import { createExtensionAdapterManifest, validateExtensionAdapter } from "./extension-adapter.js";
import { currentParentSessionId, currentTaskScope, findScopedTaskRecord, isQueuedTaskRecord, listScopedTaskRecords, readScopedTaskRecord, sanitizeChildBudget, summarizeTaskFleet, taskBudgetState, updateScopedTaskRecord } from "./task-registry.js";
import { buildSisoTaskWave, claimNextSisoTask, createSisoTask, failAndBlockSisoTask, formatSisoTask, formatSisoTaskList, formatSisoTaskScheduleResult, listSisoTasks, resumeFailedSisoTask, updateSisoTask } from "./task-store.js";
import { formatWorkflowResult, runWorkflow } from "./workflow-layer.js";
import { guardSisoAction } from "./worker-guard.js";
import { evaluatePiChildGuardrail } from "./child-context-guard.js";
import { SISO_OUTPUT_STYLE_PROMPT, buildSisoPreflightMessage, buildSisoPhaseMessage, renderSisoPhaseCard } from "./output-style.js";
import { createAgentEvent, formatAgentEvent } from "./agent-events.js";
const PARAMS = {
    type: "object",
    properties: {
        task: {
            type: "string",
            description: "Task to route through SISO controller-first allocation.",
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
            description: "Task to spawn through SISO controller-first child-agent allocation.",
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
        queue: {
            type: "boolean",
            description: "When true or omitted, max-parallel fleet pressure queues the child instead of failing the spawn.",
        },
        agent: {
            type: "string",
            description: "Optional trusted markdown project/user agent id from siso_project_agents.",
        },
        profile: {
            type: "string",
            description: "Alias for agent when selecting a trusted markdown project/user agent.",
        },
        fleetId: {
            type: "string",
            description: "Optional parent-scoped fleet id used to group and control related child agents.",
        },
        budget: {
            type: "object",
            description: "Optional child fleet budget object. Runtime/token/tool caps are ignored so child agents can use their full context and runtime.",
        },
        maxRuntimeMs: {
            type: "number",
            description: "Deprecated/no-op. Runtime budgets are ignored for child agents.",
        },
        maxParallel: {
            type: "number",
            description: "Optional maximum number of concurrently active children in this fleet.",
        },
        maxChildren: {
            type: "number",
            description: "Optional maximum total child count for this fleet, including queued and completed children.",
        },
    },
    required: ["task"],
    additionalProperties: false,
};
const SISO_PARAMS = {
    type: "object",
    properties: {
        action: { type: "string", enum: ["route", "spawn", "council", "workflow", "workflow/orchestrate", "orchestrate", "child", "task", "skill", "extension", "repo", "workspace", "check", "capability", "doc", "tool"], description: "Domain." },
        op: { type: "string", description: "Sub-action." },
        mode: { type: "string", description: "Council mode or tool mode." },
        task: { type: "string", description: "Route/spawn brief." },
        cwd: { type: "string", description: "Working directory." },
        agent: { type: "string", description: "Trusted markdown project/user agent id." },
        id: { type: "string", description: "Child/task id." },
        title: { type: "string", description: "Task title." },
        description: { type: "string", description: "Task detail." },
        query: { type: "string", description: "Search text." },
        rubric: { type: "string", description: "Council rubric." },
        skillId: { type: "string", description: "Skill id/name." },
        ids: { type: "array", items: { type: "string" }, description: "Extension/package ids for compare operations." },
        message: { type: "string", description: "Resume message." },
        status: { type: "string", description: "Task status." },
        priority: { type: "string", description: "Task/repo priority." },
        limit: { type: "number", description: "Max rows." },
        background: { type: "boolean", description: "Run async." },
        timeoutMs: { type: "number", description: "Timeout ms." },
        dryRun: { type: "boolean", description: "Preview only." },
        maxDepth: { type: "number", description: "Spawn depth." },
        noTools: { type: "boolean", description: "Run spawned child/council members with no tools." },
        queue: { type: "boolean", description: "Queue max-parallel-blocked fleet spawns instead of failing them. Defaults to true." },
        fleetId: { type: "string", description: "Parent-scoped fleet id for spawned child agents." },
        budget: { type: "object", description: "Optional child fleet budget object. Runtime/token/tool caps are ignored so child agents can use their full context and runtime." },
        maxRuntimeMs: { type: "number", description: "Deprecated/no-op. Runtime budgets are ignored for child agents." },
        maxParallel: { type: "number", description: "Optional maximum active child count for this fleet." },
        maxChildren: { type: "number", description: "Optional maximum total child count for this fleet, including queued and completed children." },
        workerCount: { type: "number", description: "Workflow worker fan-out count. Defaults to 2, max 6." },
        concurrency: { type: "number", description: "Maximum concurrent workers for structured workflow tasks/chain parallel stages." },
        recipe: { type: "string", description: "Named SISO workflow recipe: parallel-review, parallel-research, context-build, handoff-plan, or cleanup-review." },
        tasks: { type: "array", items: { type: "object" }, description: "Structured workflow parallel tasks: [{agent, task, count?}]." },
        chain: { type: "array", items: { type: "object" }, description: "Structured workflow chain steps; use {agent, task} or {parallel:[...]}." },
        allocationPlan: { type: "object", description: "Controller allocation plan with assignments, specialist ids, execution profiles, checks, and acceptance criteria." },
        allocationPlanText: { type: "string", description: "Controller allocation plan as JSON or fenced JSON text." },
        council: { type: "boolean", description: "Workflow planning council toggle. Defaults to true." },
        verify: { type: "boolean", description: "Workflow supervisor-verifier toggle. Defaults to native verifier when available." },
        verifyIterations: { type: "number", description: "Maximum verifier/feedback passes for workflow supervisor verification. Defaults to 2, max 4." },
        controllerAllocate: { type: "boolean", description: "Ask the GPT-5.5 controller to generate an allocation plan before workflow dispatch." },
        allocationId: { type: "string", description: "Optional durable allocation id for workflow parent/worker task metadata." },
        owner: { type: "string", description: "Task owner." },
        blockedBy: { type: "array", items: { type: "string" }, description: "Blocking task ids." },
        members: { type: "array", items: { type: "string" }, description: "Council profile ids." },
        metadata: { type: "object", description: "Task metadata." },
        signal: { type: "string", enum: ["SIGTERM", "SIGKILL"], description: "Interrupt signal." },
        maxAgeHours: { type: "number", description: "Cleanup age." },
        maxRuns: { type: "number", description: "Runs to keep." },
        confirm: { type: "boolean", description: "Confirm destructive cleanup." },
        section: { type: "string", description: "Skill section." },
        source: { type: "string", description: "Skill source." },
        maxChars: { type: "number", description: "Max chars." },
        catalog: { type: "string", enum: ["cloned", "broad", "both"], description: "Repo catalog." },
        category: { type: "string", description: "Extension catalog category filter." },
        recommendation: { type: "string", description: "Extension recommendation filter such as install-candidate, fork-candidate, copy-pattern, watch, or ignore." },
        decision: { type: "string", description: "Extension approval decision: install, fork, copy-pattern, watch, or ignore." },
        capabilities: { type: "array", items: { type: "string" }, description: "Approved extension capability ids." },
        notes: { type: "string", description: "Approval or audit notes." },
        scope: { type: "string", description: "Extension activation scope: default, profile, workspace, command, or tool-pack." },
        profile: { type: "string", description: "Profile id for extension activation." },
        workspace: { type: "string", description: "Workspace path/id for extension activation." },
        toolPack: { type: "string", description: "Tool pack id for lazy extension activation." },
        registryPath: { type: "string", description: "Optional extension approval registry path for tests or custom installs." },
        storePath: { type: "string", description: "Optional local extension store root for op=fetch." },
        tarballPath: { type: "string", description: "Optional already-downloaded tarball path for op=fetch." },
        tarballUrl: { type: "string", description: "Optional package tarball URL for op=fetch." },
        version: { type: "string", description: "Package version to fetch or audit." },
        integrity: { type: "string", description: "Expected package integrity for op=fetch." },
        lane: { type: "string", description: "Repo lane." },
        kind: { type: "string", description: "Repo kind." },
        repoAction: { type: "string", description: "Repo action." },
        path: { type: "string", description: "File or directory path." },
        paths: { type: "string", description: "Comma/newline-separated file paths." },
        depth: { type: "number", description: "Tree depth." },
        command: { type: "string", description: "Command for check/run." },
        checks: { type: "string", description: "Newline/comma-separated required workflow check commands." },
        commands: { type: "string", description: "Alias for checks." },
        checkTimeoutMs: { type: "number", description: "Timeout for required workflow check commands." },
        content: { type: "string", description: "Document content/new text for write-oriented tooling." },
        oldText: { type: "string", description: "Old text for patch tooling." },
        newText: { type: "string", description: "New text for patch tooling." },
        stat: { type: "boolean", description: "Return diff stat when true." },
        contextLines: { type: "number", description: "Search context lines." },
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
    if (status === "queued")
        return "queued";
    if (status === "failed" || status === "timeout" || status === "aborted" || status === "unsupported" || status === "cancelled")
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
        extension: "extension",
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
        if (typeof details.op === "string" && typeof details.catalogPath === "string" && details.catalogPath.includes("extension-catalog")) {
            return renderLine(uiDot("extension", `${details.rows.length}/${details.totalPackages ?? details.rows.length}${first?.name ? ` · ${trunc(String(first.name), 42)}` : ""}`), theme);
        }
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
function normalizeAgentKey(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/^project[._-]/, "")
        .replace(/^user[._-]/, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function scorecardMatchesAgent(scorecard, agent) {
    const scorecardKey = normalizeAgentKey(scorecard.agent);
    const keys = [agent.id, agent.name, `${agent.scope}.${agent.id}`, `${agent.scope}.${agent.name}`].map(normalizeAgentKey).filter(Boolean);
    return keys.some((key) => scorecardKey === key || scorecardKey.endsWith(`-${key}`) || scorecardKey.endsWith(`.${key}`));
}
function taskMatchesAgentPurpose(task, agent, scorecard) {
    const taskText = String(task ?? "").toLowerCase();
    const purpose = [
        agent.id,
        agent.name,
        agent.description,
        agent.body,
        ...(Array.isArray(agent.evals) ? agent.evals : []),
        scorecard?.taskSet,
    ].filter(Boolean).join(" ").toLowerCase();
    const rolePatterns = [
        ["review", /\b(review|audit|risk|security|critique|regression)\b/i],
        ["test", /\b(test|verify|smoke|lint|typecheck|build)\b/i],
        ["fix", /\b(fix|patch|debug|repair|resolve)\b/i],
        ["doc", /\b(doc|docs|documentation|readme)\b/i],
        ["package", /\b(package|extension|adapter|catalog|pi package)\b/i],
        ["browser", /\b(browser|ui|screenshot|playwright|visual)\b/i],
        ["plan", /\b(plan|architecture|design|strategy)\b/i],
    ];
    for (const [token, pattern] of rolePatterns) {
        if (purpose.includes(token) && pattern.test(taskText))
            return true;
    }
    const purposeTokens = new Set(purpose.split(/[^a-z0-9]+/).filter((token) => token.length >= 4));
    const taskTokens = taskText.split(/[^a-z0-9]+/).filter((token) => token.length >= 4);
    return taskTokens.some((token) => purposeTokens.has(token));
}
function scorecardProjectAgentRecommendation(task, registry, options = {}) {
    const scorecards = listAgentScorecards({
        ...(textParam({}, options, "cwd") ? { cwd: textParam({}, options, "cwd") } : {}),
        limit: 200,
    });
    const candidates = [];
    for (const agent of registry.agents) {
        const matching = scorecards.filter((scorecard) => scorecardMatchesAgent(scorecard, agent));
        if (!matching.length)
            continue;
        const best = matching.sort((left, right) => Number(right.score?.overall ?? 0) - Number(left.score?.overall ?? 0))[0];
        if (Number(best.score?.overall ?? 0) < 0.5)
            continue;
        if (!taskMatchesAgentPurpose(task, agent, best))
            continue;
        candidates.push({ agent, scorecard: best, score: Number(best.score?.overall ?? 0) });
    }
    candidates.sort((left, right) => right.score - left.score);
    return candidates[0];
}
function projectAgentDecision(task, params = {}, options = {}) {
    const explicitAgentId = textParam(params, options, "agent") ?? textParam(params, options, "profile");
    const registry = loadProjectAgentRegistry({
        ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
    });
    const recommendation = explicitAgentId && explicitAgentId !== "auto"
        ? undefined
        : scorecardProjectAgentRecommendation(task, registry, {
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
        });
    const agentId = explicitAgentId && explicitAgentId !== "auto" ? explicitAgentId : recommendation?.agent?.id;
    if (!agentId)
        return undefined;
    const agent = registry.agents.find((item) => item.id === agentId || item.name === agentId);
    if (!agent)
        throw new Error(`trusted project agent not found: ${agentId}`);
    const fallback = chooseRoute(task);
    const allTools = ["read", "find", "ls", "bash", "edit", "write"];
    const tools = allTools.filter((tool) => isToolAllowed(agent.tools, tool));
    const mutating = tools.includes("edit") || tools.includes("write");
    return {
        kind: "project-agent",
        profile: `${agent.scope}.${agent.id}`,
        lane: "project",
        model: agent.model ?? fallback.model,
        tools,
        contextTier: "project",
        statePolicy: "task-state",
        permissionProfile: mutating ? "accept_edits" : "plan",
        inheritContext: false,
        needsWorktree: mutating && fallback.needsWorktree,
        maxParallelAgents: 2,
        nativeAgent: agent.name,
        projectAgent: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            scope: agent.scope,
            sourcePath: agent.sourcePath,
            thinkingLevel: agent.thinkingLevel,
            costTier: agent.costTier,
            memoryScope: agent.memoryScope,
            background: agent.background,
            maxTurns: agent.maxTurns,
            writeScope: agent.writeScope,
            extensionDependencies: agent.extensionDependencies,
            evals: agent.evals,
            tools: agent.tools,
        },
        ...(recommendation ? { scorecardRoute: { id: recommendation.scorecard.id, overall: recommendation.scorecard.score?.overall, path: recommendation.scorecard.path } } : {}),
        rationale: recommendation
            ? `Scorecard-selected trusted ${agent.scope} markdown agent from ${agent.sourcePath} using ${recommendation.scorecard.id}.`
            : `Trusted ${agent.scope} markdown agent selected from ${agent.sourcePath}.`,
    };
}
function formatProjectAgentRegistryResult(registry) {
    if (registry.agents.length === 0) {
        return [
            "No trusted project/user agents found.",
            `trusted_project_roots=${registry.trustedProjectRoots.length}`,
            `skipped_project_roots=${registry.skippedProjectRoots.length}`,
            `trust_marker=${registry.trustMarkerName}`,
        ].join("\n");
    }
    return [
        `agents=${registry.agents.length}`,
        `project_agents=${registry.projectAgents.length}`,
        `user_agents=${registry.userAgents.length}`,
        `trusted_project_roots=${registry.trustedProjectRoots.length}`,
        `skipped_project_roots=${registry.skippedProjectRoots.length}`,
        ...registry.agents.map((agent) => [
            `id=${agent.id}`,
            `scope=${agent.scope}`,
            agent.description ? `description=${JSON.stringify(agent.description)}` : undefined,
            `model=${agent.model ?? "default"}`,
            `thinking=${agent.thinkingLevel ?? "default"}`,
            `cost=${agent.costTier ?? "default"}`,
            `memory=${agent.memoryScope ?? "none"}`,
            `background=${agent.background ?? false}`,
            `max_turns=${agent.maxTurns ?? "default"}`,
            `write_scope=${agent.writeScope?.join(",") || "none"}`,
            `extensions=${agent.extensionDependencies?.join(",") || "none"}`,
            `evals=${agent.evals?.join(",") || "none"}`,
            `tools=${agent.tools.all ? "all" : agent.tools.allow.join(",") || "none"}`,
            `deny=${agent.tools.deny.join(",") || "none"}`,
            `source=${agent.sourcePath}`,
        ].join(" ")),
    ].join("\n");
}
function formatMailboxMessages(records) {
    if (records.length === 0)
        return "No mailbox messages matched.";
    return [
        `messages=${records.length}`,
        ...records.map((record) => [
            `id=${record.id}`,
            `state=${record.state}`,
            `owner=${record.ownerSessionId}`,
            record.childId ? `child=${record.childId}` : undefined,
            record.status ? `status=${record.status}` : undefined,
            record.updatedAt ? `updated_at=${record.updatedAt}` : undefined,
            record.summary ? `summary=${trunc(String(record.summary), 120)}` : undefined,
        ].filter(Boolean).join(" ")),
    ].join("\n");
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
function objectArrayParam(params, options, key) {
    const value = params[key] ?? options[key];
    return Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) : undefined;
}
function budgetParam(params, options) {
    const raw = objectParam(params, options, "budget") ?? {};
    return sanitizeChildBudget({
        ...raw,
        ...(numberParam(params, options, "maxRuntimeMs") !== undefined ? { maxRuntimeMs: numberParam(params, options, "maxRuntimeMs") } : {}),
        ...(numberParam(params, options, "maxParallel") !== undefined ? { maxParallel: numberParam(params, options, "maxParallel") } : {}),
    }) ?? {};
}
function spawnMetadataParams(params, options) {
    const budget = budgetParam(params, options);
    return {
        ...(textParam(params, options, "fleetId") ? { fleetId: textParam(params, options, "fleetId") } : {}),
        ...(Object.keys(budget).length ? { budget } : {}),
    };
}
function isSisoDomain(value) {
    return value === "route" || value === "spawn" || value === "council" || value === "workflow" || value === "orchestrate" || value === "child" || value === "task" || value === "skill" || value === "extension" || value === "repo" || value === "workspace" || value === "check" || value === "capability" || value === "doc" || value === "tool";
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
function formatScopedTaskRecord(record) {
    const active = record.status === "background" || record.status === "running" || record.status === "starting";
    const dot = record.status === "completed" ? "✓" : active ? "●" : record.status === "queued" ? "○" : record.status === "failed" || record.status === "timeout" || record.status === "aborted" || record.status === "cancelled" ? "!" : "•";
    const tokens = record.progress?.tokens ?? 0;
    const tools = record.progress?.tools ?? 0;
    const events = scopedEventSummary(record);
    const fleet = record.fleetId ? ` · fleet ${record.fleetId}` : "";
    const name = record.name ? ` @${record.name}` : "";
    const queued = record.queuedAt ? ` · queued ${ageSince(record.queuedAt)}` : "";
    const eventBits = events.count > 0 ? ` · ${events.count} events${events.lastTool ? ` · last tool ${events.lastTool}` : ""}` : "";
    return `${dot} ${record.id}${name} · ${childVerb(record.status)} · ${record.role ?? "agent"} · ${ageSince(record.startedAt)}${queued} · ${formatTokenCount(tokens)}t · ${tools} tools${eventBits}${fleet} · ${trunc(record.description ?? record.id, 100)}`;
}
function compactScopedTaskRecord(record) {
    if (!record)
        return record;
    const events = scopedEventSummary(record);
    const budget = taskBudgetState(record);
    return {
        id: record.id,
        status: record.status,
        ...(record.name ? { name: record.name } : {}),
        ...(record.handle ? { handle: record.handle } : {}),
        ...(record.addressable !== undefined ? { addressable: record.addressable === true } : {}),
        ...(record.description ? { description: trunc(record.description, 240) } : {}),
        ...(record.role ? { role: record.role } : {}),
        ...(record.model ? { model: record.model } : {}),
        rootSessionId: record.rootSessionId,
        parentSessionId: record.parentSessionId,
        ownerAgentId: record.ownerAgentId,
        ...(record.spawnedByTaskId ? { spawnedByTaskId: record.spawnedByTaskId } : {}),
        ...(record.fleetId ? { fleetId: record.fleetId } : {}),
        ...(record.depth !== undefined ? { depth: record.depth } : {}),
        ...(record.startedAt ? { startedAt: record.startedAt } : {}),
        ...(record.updatedAt ? { updatedAt: record.updatedAt } : {}),
        ...(record.completedAt ? { completedAt: record.completedAt } : {}),
        ...(record.queuedAt ? { queuedAt: record.queuedAt } : {}),
        ...(record.queuedReason ? { queuedReason: trunc(record.queuedReason, 500) } : {}),
        ...(record.paths ? { paths: record.paths } : {}),
        ...(record.progress ? { progress: {
                ...(typeof record.progress.tokens === "number" ? { tokens: record.progress.tokens } : {}),
                ...(typeof record.progress.inputTokens === "number" ? { inputTokens: record.progress.inputTokens } : {}),
                ...(typeof record.progress.outputTokens === "number" ? { outputTokens: record.progress.outputTokens } : {}),
                ...(typeof record.progress.tools === "number" ? { tools: record.progress.tools } : {}),
                ...(record.progress.summary ? { summary: trunc(record.progress.summary, 300) } : {}),
                ...(record.progress.lastTool ? { lastTool: trunc(record.progress.lastTool, 120) } : {}),
            } } : {}),
        ...(record.result?.summary || record.progress?.summary ? { result: { summary: trunc(record.result?.summary ?? record.progress?.summary, 300), ...(Array.isArray(record.result?.files) ? { files: record.result.files.slice(0, 8) } : {}) } } : {}),
        ...(record.error ? { error: trunc(record.error, 600) } : {}),
        ...(record.notification ? { notification: record.notification } : {}),
        ...(Object.keys(budget.budget).length ? { budget: budget.budget, budgetState: { exceededAny: budget.exceededAny, exceeded: budget.exceeded } } : {}),
        ...(record.legacyChildRunPath ? { legacyChildRunPath: record.legacyChildRunPath } : {}),
        eventCount: events.count,
        ...(events.lastTool ? { lastTool: events.lastTool } : {}),
    };
}
function compactScopedTaskRecords(records) {
    return records.map(compactScopedTaskRecord);
}
function formatScopedTaskList(records) {
    if (records.length === 0)
        return "No scoped SISO task records found for this parent.";
    const summary = summarizeTaskFleet(records);
    const header = `Scoped agents: ${summary.running} running · ${summary.queued} queued · ${summary.completed} complete · ${summary.failed} failed · ${formatTokenCount(summary.tokens)}t · ${summary.tools} tools${summary.fleets.length ? ` · fleets ${summary.fleets.join(", ")}` : ""}`;
    return [header, ...records.map(formatScopedTaskRecord)].join("\n");
}
function formatAgentsHelp() {
    return [
        "SISO agents command",
        "",
        "Inspect",
        "- /agents [limit]",
        "- /agents status <task-id|name>",
        "- /agents events <task-id|name> [limit]",
        "- /agents files <task-id|name>",
        "- /agents peek <task-id|name> <artifact> [bytes]",
        "- /agents handoff <task-id|name>",
        "- /agents fleets [fleet-id]",
        "- /agents queue [fleet-id]",
        "",
        "Reports",
        "- /agents report",
        "- /agents report <fleet-id>",
        "- /agents report latest <limit>",
        "- /agents report active|queued|completed|failed",
        "- /agents report over-budget",
        "- /agents report stale <duration>",
        "- /agents summary <same filters>",
        "",
        "Control",
        "- /agents stop <task-id|name|fleet-id>",
        "- /agents cancel <queued-task-id|name|fleet-id>",
        "- /agents drain <fleet-id> [limit]",
        "- /agents name <task-id> <name>",
        "- /agents resume <task-id|name> <message>",
        "",
        "Durations: 30s, 5m, 1h, 1d. Report output is scoped to this parent session.",
    ].join("\n");
}
function formatQueueList(records) {
    const queued = records
        .filter(isQueuedTaskRecord)
        .sort((a, b) => Date.parse(a.queuedAt ?? a.startedAt ?? "0") - Date.parse(b.queuedAt ?? b.startedAt ?? "0"));
    if (queued.length === 0)
        return "No queued scoped SISO tasks found for this parent.";
    return [
        `Queued agents: ${queued.length}`,
        ...queued.map((record) => `○ ${record.id}${record.fleetId ? ` · fleet ${record.fleetId}` : ""} · queued ${ageSince(record.queuedAt ?? record.startedAt)} · ${trunc(record.description ?? record.id, 120)}${record.queuedReason ? ` · ${record.queuedReason}` : ""}`),
    ].join("\n");
}
function formatFleetList(records) {
    if (records.length === 0)
        return "No scoped SISO fleets found for this parent.";
    const groups = new Map();
    for (const record of records) {
        const id = record.fleetId ?? "unassigned";
        groups.set(id, [...(groups.get(id) ?? []), record]);
    }
    return [...groups.entries()].map(([fleetId, items]) => {
        const summary = summarizeTaskFleet(items);
        return `fleet ${fleetId} · ${summary.running} running · ${summary.queued} queued · ${summary.completed} complete · ${summary.failed} failed · ${formatTokenCount(summary.tokens)}t · ${summary.tools} tools · ${items.length} tasks`;
    }).join("\n");
}
function statusBucket(record) {
    if (record.status === "background" || record.status === "running" || record.status === "starting")
        return "Active";
    if (record.status === "queued")
        return "Queued";
    if (record.status === "completed")
        return "Completed";
    if (record.status === "failed" || record.status === "timeout" || record.status === "aborted" || record.status === "cancelled")
        return "Needs attention";
    return "Other";
}
function reportRecordLine(record, target = undefined) {
    const name = record.name ? `@${record.name}` : record.id;
    const tokens = record.progress?.tokens ?? 0;
    const tools = record.progress?.tools ?? 0;
    const events = scopedEventSummary(record);
    const budget = taskBudgetState(record);
    const summary = record.progress?.summary ?? record.result?.summary ?? record.error ?? record.description ?? record.id;
    const eventBit = events.count > 0 ? ` · ${events.count} events${events.lastTool ? ` · last tool ${events.lastTool}` : ""}` : "";
    const budgetBit = budget.exceededAny ? ` · budget ${budget.exceeded.join(", ")}` : "";
    const staleBit = isStaleActiveRecord(record, Date.now(), target?.staleMs) ? ` · stale ${ageSince(record.updatedAt ?? record.startedAt)}` : "";
    const fleet = record.fleetId ? ` · fleet ${record.fleetId}` : "";
    return `- ${name} · ${childVerb(record.status)} · ${record.role ?? "agent"} · ${formatTokenCount(tokens)}t · ${tools} tools${eventBit}${budgetBit}${staleBit}${fleet} · ${trunc(summary, 120)}`;
}
function reportTitle(records, target) {
    const fleetTarget = target ? ` · target ${target}` : "";
    const scope = `Scope: ${records[0]?.rootSessionId ?? "unknown"} / ${records[0]?.parentSessionId ?? "unknown"}`;
    return { title: `SISO agents report${fleetTarget}`, scope };
}
function normalizeFleetTarget(target) {
    const value = String(target ?? "").trim();
    if (!value || /^\d+$/.test(value) || value === "all" || value === "latest" || value === "recent" || value === "over-budget" || value === "budget" || REPORT_STATUS_FILTERS.has(value) || REPORT_STALE_FILTERS.has(value))
        return undefined;
    return value.replace(/^fleet:/, "");
}
const REPORT_STATUS_FILTERS = new Set(["active", "running", "queued", "completed", "complete", "failed", "attention"]);
const REPORT_STALE_FILTERS = new Set(["stale", "hung", "stuck"]);
function parseDurationArg(value) {
    const text = String(value ?? "").trim().toLowerCase();
    const match = text.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/);
    if (!match)
        return undefined;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0)
        return undefined;
    const unit = match[2] ?? "m";
    const multiplier = unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
    return Math.round(amount * multiplier);
}
function normalizeReportTarget(target, thresholdArg = undefined) {
    const value = String(target ?? "").trim();
    const staleMs = parseDurationArg(thresholdArg);
    if (!value || /^\d+$/.test(value) || value === "all")
        return {};
    if (value === "over-budget" || value === "budget")
        return { kind: "over-budget", label: "over-budget" };
    if (value === "latest" || value === "recent")
        return { kind: "latest", label: "latest" };
    if (REPORT_STATUS_FILTERS.has(value))
        return { kind: "status", label: value };
    if (REPORT_STALE_FILTERS.has(value))
        return { kind: "stale", label: "stale", ...(staleMs ? { staleMs } : {}) };
    return { kind: "fleet", label: value.replace(/^fleet:/, "") };
}
function staleCutoffMs() {
    const parsed = Number.parseInt(process.env.SISO_AGENT_STALE_MS ?? "900000", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 900000;
}
function formatDurationMs(ms) {
    if (ms >= 86_400_000)
        return `${Math.round(ms / 86_400_000)}d`;
    if (ms >= 3_600_000)
        return `${Math.round(ms / 3_600_000)}h`;
    if (ms >= 60_000)
        return `${Math.round(ms / 60_000)}m`;
    return `${Math.max(1, Math.round(ms / 1000))}s`;
}
function isStaleActiveRecord(record, nowMs = Date.now(), cutoffMs = staleCutoffMs()) {
    if (!activeScopedTask(record))
        return false;
    const timestamp = Date.parse(record.updatedAt ?? record.startedAt ?? "");
    return Number.isFinite(timestamp) ? nowMs - timestamp >= cutoffMs : true;
}
function recordMatchesReportStatus(record, label) {
    if (label === "active" || label === "running")
        return activeScopedTask(record);
    if (label === "queued")
        return record.status === "queued";
    if (label === "completed" || label === "complete")
        return record.status === "completed";
    if (label === "failed" || label === "attention")
        return record.status === "failed" || record.status === "timeout" || record.status === "aborted" || record.status === "cancelled";
    return true;
}
function scopedReportRecords(records, target) {
    if (target?.kind === "latest")
        return records;
    if (target?.kind === "over-budget")
        return records.filter((record) => taskBudgetState(record).exceededAny);
    if (target?.kind === "status")
        return records.filter((record) => recordMatchesReportStatus(record, target.label));
    if (target?.kind === "stale")
        return records.filter((record) => isStaleActiveRecord(record, Date.now(), target.staleMs ?? staleCutoffMs()));
    if (target?.kind === "fleet")
        return records.filter((record) => record.fleetId === target.label);
    return records;
}
function supervisorReportLine(records) {
    const watched = records.filter((record) => activeScopedTask(record));
    const health = summarizeSupervisorHealth(watched);
    return `Supervisor: ${health.total} watched · ${health.byState.healthy} healthy · ${health.byState.warn} warn · ${health.byState.stale} stale · ${health.byState.dead} dead · fingerprints ${health.uniqueFingerprints}`;
}
function mailboxReportLine(records) {
    const ownerSessionId = records[0]?.parentSessionId;
    if (!ownerSessionId || ownerSessionId === "unknown")
        return undefined;
    const messages = listMailboxMessages({ ownerSessionId, limit: 100 });
    const delivered = messages.filter((record) => record.state === "delivered").length;
    const read = messages.filter((record) => record.state === "read").length;
    const acknowledged = messages.filter((record) => record.state === "acknowledged").length;
    const unacked = messages.filter((record) => record.state !== "acknowledged").length;
    if (messages.length === 0)
        return "Mailbox: 0 delivered · 0 read · 0 acknowledged · 0 unacked";
    return `Mailbox: ${delivered} delivered · ${read} read · ${acknowledged} acknowledged · ${unacked} unacked`;
}
function formatScopedAgentsReport(records, limit = 20, target = undefined) {
    if (records.length === 0)
        return target?.kind === "latest" ? "No recent scoped SISO task records found for this parent." : target?.kind === "over-budget" ? "No over-budget scoped SISO task records found for this parent." : target?.kind === "stale" ? `No stale active scoped SISO task records found for this parent at threshold ${formatDurationMs(target.staleMs ?? staleCutoffMs())}.` : target?.kind === "status" ? `No ${target.label} scoped SISO task records found for this parent.` : target?.kind === "fleet" ? `No scoped SISO task records found for fleet ${target.label}.` : "No scoped SISO task records found for this parent.";
    const reportRecords = target?.kind === "latest" ? records.slice(0, Math.max(1, Number.isFinite(limit) ? limit : 20)) : records;
    const summary = summarizeTaskFleet(reportRecords);
    const eventCount = reportRecords.reduce((total, record) => total + scopedEventSummary(record).count, 0);
    const budgetExceededCount = reportRecords.filter((record) => taskBudgetState(record).exceededAny).length;
    const groups = new Map();
    for (const record of reportRecords) {
        const bucket = statusBucket(record);
        groups.set(bucket, [...(groups.get(bucket) ?? []), record]);
    }
    const orderedBuckets = ["Active", "Queued", "Needs attention", "Completed", "Other"];
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const header = reportTitle(reportRecords, target?.label);
    const lines = [
        header.title,
        header.scope,
        target?.kind === "stale" ? `Stale threshold: ${formatDurationMs(target.staleMs ?? staleCutoffMs())}` : undefined,
        `Totals: ${summary.total} agents · ${summary.running} active · ${summary.queued} queued · ${summary.completed} complete · ${summary.failed} failed · ${formatTokenCount(summary.tokens)}t · ${summary.tools} tools · ${eventCount} events${budgetExceededCount > 0 ? ` · ${budgetExceededCount} over budget` : ""}`,
        supervisorReportLine(reportRecords),
        mailboxReportLine(reportRecords),
        summary.fleets.length ? `Fleets: ${summary.fleets.join(", ")}` : "Fleets: none",
    ].filter(Boolean);
    for (const bucket of orderedBuckets) {
        const items = groups.get(bucket) ?? [];
        if (items.length === 0)
            continue;
        lines.push("", `${bucket} (${items.length})`);
        lines.push(...items.slice(0, safeLimit).map((record) => reportRecordLine(record, target)));
        if (items.length > safeLimit)
            lines.push(`- ... ${items.length - safeLimit} more`);
    }
    return lines.join("\n");
}
function parseTaskCommandArgs(args = "") {
    const parts = String(args ?? "").trim().split(/\s+/).filter(Boolean);
    return {
        op: parts[0] ?? "list",
        id: parts[1],
        value: parts[2],
    };
}
async function tasksCommand(args, ctx) {
    const parsed = parseTaskCommandArgs(args);
    const cwd = process.cwd();
    if (parsed.op === "help") {
        return {
            content: [{ type: "text", text: [
                        "SISO tasks command",
                        "- /tasks",
                        "- /tasks ready",
                        "- /tasks claim",
                        "- /tasks wave <max-parallel>",
                        "- /tasks fail <task-id>",
                        "- /tasks resume <task-id>",
                    ].join("\n") }],
        };
    }
    if (parsed.op === "claim" || parsed.op === "claim-next") {
        const result = claimNextSisoTask({ cwd });
        return { content: [{ type: "text", text: formatSisoTaskScheduleResult(result) }], details: result };
    }
    if (parsed.op === "wave") {
        const result = buildSisoTaskWave({ cwd, maxParallel: Number(parsed.id ?? 2) });
        return { content: [{ type: "text", text: formatSisoTaskScheduleResult(result) }], details: result };
    }
    if (parsed.op === "fail") {
        const result = failAndBlockSisoTask({ cwd, id: String(parsed.id ?? "") });
        return { content: [{ type: "text", text: formatSisoTaskScheduleResult(result) }], details: result };
    }
    if (parsed.op === "resume") {
        const result = resumeFailedSisoTask({ cwd, id: String(parsed.id ?? "") });
        return { content: [{ type: "text", text: formatSisoTaskScheduleResult(result) }], details: result };
    }
    const status = parsed.op === "list" || parsed.op === "all" ? undefined : parsed.op;
    const result = listSisoTasks({ cwd, ...(status ? { status } : {}), limit: 20 });
    return { content: [{ type: "text", text: formatSisoTaskList(result) }], details: result };
}
function activeScopedTask(record) {
    return record?.status === "background" || record?.status === "running" || record?.status === "starting";
}
function formatScopedTaskDetail(record) {
    if (!record)
        return "No scoped SISO task found for this parent.";
    const events = scopedEventSummary(record);
    const lines = [
        `${record.id} · ${childVerb(record.status)} · ${record.role ?? "agent"}`,
        record.name ? `Name: @${record.name}` : undefined,
        record.addressable ? "Addressable: yes" : undefined,
        `Task: ${record.description}`,
        `Model: ${record.model ?? "unknown"}`,
        `Scope: root=${record.rootSessionId} parent=${record.parentSessionId} owner=${record.ownerAgentId} depth=${record.depth ?? 0}`,
        record.fleetId ? `Fleet: ${record.fleetId}` : undefined,
        record.queuedAt ? `Queued: ${record.queuedAt}` : undefined,
        record.queuedReason ? `Queue reason: ${record.queuedReason}` : undefined,
        `Usage: ${formatTokenCount(record.progress?.tokens ?? 0)}t · ${record.progress?.tools ?? 0} tools`,
        events.count > 0 ? `Events: ${events.count}${events.last ? ` · latest ${events.last}` : ""}` : undefined,
        budgetLine(record),
        record.progress?.summary ? `Summary: ${record.progress.summary}` : undefined,
        record.error ? `Error: ${record.error}` : undefined,
        record.paths?.handoff ? `Handoff: ${record.paths.handoff}` : undefined,
        record.paths?.events ? `Events file: ${record.paths.events}` : undefined,
        record.paths?.task ? `Task record: ${record.paths.task}` : undefined,
        record.legacyChildRunPath ? `Legacy child run: ${record.legacyChildRunPath}` : undefined,
    ];
    return lines.filter(Boolean).join("\n");
}
function formatScopedTaskFiles(record) {
    if (!record)
        return "No scoped SISO task found for this parent.";
    const label = record.name ? `@${record.name}` : record.id;
    const entries = scopedTaskArtifactEntries(record).map(([name, path]) => {
        const metadata = pathMetadata(path);
        return { name, path, metadata };
    });
    const summary = entries.reduce((acc, entry) => {
        if (entry.metadata.exists)
            acc.existing++;
        else
            acc.missing++;
        if (entry.metadata.large)
            acc.large++;
        return acc;
    }, { existing: 0, missing: 0, large: 0 });
    const lines = [
        `Files for ${label}`,
        `Summary: ${summary.existing} existing · ${summary.missing} missing · ${summary.large} large`,
        ...entries.map((entry) => `${entry.name}: ${entry.path} · ${entry.metadata.text}`),
    ];
    return lines.join("\n");
}
function scopedTaskArtifactEntries(record) {
    const paths = record?.paths ?? {};
    return [
        ["task", paths.task],
        ["events", paths.events],
        ["transcript", paths.transcript],
        ["summary", paths.summary],
        ["handoff", paths.handoff],
        ["stdout", paths.stdout],
        ["stderr", paths.stderr],
        ["exit", paths.exit],
        ["artifacts", paths.artifacts],
        ["legacy_child_run", record?.legacyChildRunPath],
    ].filter(([, path]) => Boolean(path));
}
function artifactPeekMaxBytes() {
    const parsed = Number.parseInt(process.env.SISO_AGENT_PEEK_MAX_BYTES ?? "20000", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20000;
}
function boundedPeekBytes(value) {
    const parsed = Number.parseInt(value ?? "", 10);
    const requested = Number.isFinite(parsed) && parsed > 0 ? parsed : 4000;
    return Math.min(requested, artifactPeekMaxBytes());
}
function resolveScopedTaskArtifact(record, artifactName) {
    const normalized = (artifactName ?? "").trim().toLowerCase().replace(/^@/, "");
    const aliases = new Map([
        ["log", "stdout"],
        ["logs", "stdout"],
        ["out", "stdout"],
        ["err", "stderr"],
        ["error", "stderr"],
        ["errors", "stderr"],
        ["timeline", "events"],
        ["result", "summary"],
        ["results", "summary"],
    ]);
    const target = aliases.get(normalized) ?? normalized;
    return scopedTaskArtifactEntries(record).find(([name]) => name === target);
}
function formatScopedTaskPeek(record, artifactName, requestedBytes) {
    if (!record)
        return "No scoped SISO task found for this parent.";
    const label = record.name ? `@${record.name}` : record.id;
    if (!artifactName)
        return "Usage: /agents peek <task-id|name> <artifact> [bytes]";
    const entry = resolveScopedTaskArtifact(record, artifactName);
    if (!entry) {
        const names = scopedTaskArtifactEntries(record).map(([name]) => name).join(", ");
        return `No artifact "${artifactName}" found for ${label}. Available: ${names || "none"}.`;
    }
    const [name, path] = entry;
    if (!existsSync(path))
        return `${label} ${name}: missing (${path})`;
    const stat = statSync(path);
    if (stat.isDirectory())
        return `${label} ${name}: directory (${path}). Use targeted shell tools for directory inspection.`;
    const bytes = boundedPeekBytes(requestedBytes);
    const length = Math.min(bytes, stat.size);
    const buffer = Buffer.alloc(length);
    let fd;
    try {
        fd = openSync(path, "r");
        const read = readSync(fd, buffer, 0, length, 0);
        const body = buffer.subarray(0, read).toString("utf8").replace(/\0+$/g, "");
        const truncated = stat.size > read ? `\n---\ntruncated: showing ${formatBytes(read)} of ${formatBytes(stat.size)}. Use a smaller artifact or another bounded peek if needed.` : "";
        return `Peek ${label} ${name} · ${path} · ${formatBytes(read)} of ${formatBytes(stat.size)}\n---\n${body}${truncated}`;
    }
    finally {
        if (fd !== undefined)
            closeSync(fd);
    }
}
function formatBytes(bytes) {
    if (bytes >= 1_000_000)
        return `${Math.round(bytes / 100_000) / 10}mb`;
    if (bytes >= 1000)
        return `${Math.round(bytes / 100) / 10}kb`;
    return `${bytes}b`;
}
function largeArtifactBytes() {
    const parsed = Number.parseInt(process.env.SISO_AGENT_LARGE_ARTIFACT_BYTES ?? "50000", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 50000;
}
function pathMetadata(path) {
    if (!existsSync(path))
        return { text: "missing", exists: false, large: false };
    try {
        const stat = statSync(path);
        if (stat.isDirectory())
            return { text: "exists · dir", exists: true, large: false };
        const largeHint = stat.size >= largeArtifactBytes() ? " · large, use narrow reads" : "";
        return { text: `exists · ${formatBytes(stat.size)}${largeHint}`, exists: true, large: Boolean(largeHint) };
    }
    catch {
        return { text: "exists", exists: true, large: false };
    }
}
function budgetLine(record) {
    const budget = taskBudgetState(record);
    return budget.exceededAny ? `Budget: exceeded ${budget.exceeded.join(", ")}` : undefined;
}
function readJsonl(path) {
    try {
        return readFileSync(path, "utf8")
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => {
            try {
                return JSON.parse(line);
            }
            catch {
                return undefined;
            }
        })
            .filter(Boolean);
    }
    catch {
        return [];
    }
}
function scopedEvents(record) {
    return record?.paths?.events ? readJsonl(record.paths.events) : [];
}
function scopedEventSummary(record) {
    const events = scopedEvents(record);
    const latest = events.at(-1);
    const lastToolEvent = [...events].reverse().find((event) => event.type === "tool_call" && typeof event.toolName === "string");
    return {
        count: events.length,
        last: latest ? formatAgentEvent(latest) : undefined,
        lastTool: lastToolEvent?.toolName,
    };
}
function eventAge(timestamp) {
    return timestamp ? ageSince(timestamp) : "unknown";
}
function formatScopedTaskEvents(record, limit = 20) {
    if (!record)
        return "No scoped SISO task found for this parent.";
    const eventsPath = record.paths?.events;
    if (!eventsPath)
        return "No durable event log path found for this scoped SISO task.";
    const events = scopedEvents(record);
    if (events.length === 0)
        return `No durable events found for ${record.name ? `@${record.name}` : record.id}.`;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const selected = events.slice(-safeLimit);
    const label = record.name ? `@${record.name}` : record.id;
    const lines = [
        `Events for ${label}: ${events.length} total · showing ${selected.length} · ${eventsPath}`,
        ...selected.map((event) => `${eventAge(event.timestamp)} · ${formatAgentEvent(event)}`),
    ];
    return lines.join("\n");
}
async function stopScopedTask(record, scope, reason = "Stopped by parent") {
    if (!record)
        return undefined;
    let controlText;
    if (record.legacyChildRunPath) {
        try {
            const result = await controlChildRun({ action: "interrupt", id: record.id, signal: "SIGTERM" }, scope);
            controlText = result.text;
        }
        catch (error) {
            controlText = error instanceof Error ? error.message : String(error);
        }
    }
    const updated = updateScopedTaskRecord(record.id, {
        status: "aborted",
        completedAt: new Date().toISOString(),
        error: reason,
    }, scope);
    return { record: updated ?? record, controlText };
}
async function stopScopedTarget(target, scope) {
    const direct = findScopedTaskRecord(target, scope);
    if (direct) {
        if (!activeScopedTask(direct))
            return `No running scoped SISO task found for ${target}; current status is ${direct.status}.`;
        const stopped = await stopScopedTask(direct, scope);
        return `Stopped ${direct.name ? `@${direct.name}` : direct.id}.${stopped?.controlText ? `\n${stopped.controlText}` : ""}`;
    }
    const fleetId = String(target ?? "").replace(/^fleet:/, "");
    const records = listScopedTaskRecords(scope, { limit: 200 })
        .filter((record) => record.fleetId === fleetId && activeScopedTask(record));
    if (records.length === 0)
        return `No running scoped SISO task or fleet found for ${target}.`;
    const stopped = [];
    for (const record of records) {
        await stopScopedTask(record, scope, `Stopped with fleet ${fleetId} by parent`);
        stopped.push(record.name ? `@${record.name}` : record.id);
    }
    return `Stopped fleet ${fleetId}: ${stopped.join(", ")}`;
}
function cancelQueuedTask(record, scope, reason = "Cancelled by parent") {
    return updateScopedTaskRecord(record.id, {
        status: "cancelled",
        completedAt: new Date().toISOString(),
        error: reason,
        queuedSpawn: undefined,
    }, scope);
}
function cancelQueuedTarget(target, scope) {
    const direct = findScopedTaskRecord(target, scope);
    if (direct) {
        if (!isQueuedTaskRecord(direct))
            return `No queued scoped SISO task found for ${target}; current status is ${direct.status}.`;
        cancelQueuedTask(direct, scope);
        return `Cancelled queued task ${direct.name ? `@${direct.name}` : direct.id}.`;
    }
    const fleetId = String(target ?? "").replace(/^fleet:/, "");
    const records = listScopedTaskRecords(scope, { limit: 1000 })
        .filter((record) => record.fleetId === fleetId && isQueuedTaskRecord(record));
    if (records.length === 0)
        return `No queued scoped SISO task or fleet found for ${target}.`;
    const cancelled = [];
    for (const record of records) {
        cancelQueuedTask(record, scope, `Cancelled with fleet ${fleetId} by parent`);
        cancelled.push(record.name ? `@${record.name}` : record.id);
    }
    return `Cancelled queued fleet ${fleetId}: ${cancelled.join(", ")}`;
}
async function drainScopedFleet(fleetId, scope, ctx, limit = 1) {
    const queued = listScopedTaskRecords(scope, { limit: 1000 })
        .filter((record) => record.fleetId === fleetId && isQueuedTaskRecord(record))
        .sort((a, b) => Date.parse(a.queuedAt ?? a.startedAt ?? "0") - Date.parse(b.queuedAt ?? b.startedAt ?? "0"))
        .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 1);
    if (queued.length === 0)
        return "No queued scoped SISO tasks found for this fleet.";
    const lines = [];
    for (const record of queued) {
        const queuedSpawn = record.queuedSpawn ?? {};
        if (!queuedSpawn.task) {
            updateScopedTaskRecord(record.id, {
                status: "unsupported",
                completedAt: new Date().toISOString(),
                error: "Queued task has no spawn payload.",
            }, scope);
            lines.push(`skipped ${record.id}: missing queued spawn payload`);
            continue;
        }
        const result = await executeSpawnWithNativeSubagentBridge({
            ...queuedSpawn,
            task: queuedSpawn.task,
            background: queuedSpawn.background ?? true,
            queue: false,
            ctx,
        });
        if (result.details?.status === "unsupported" && /Fleet .* spawn blocked:/.test(result.details?.error ?? result.details?.finalOutput ?? "")) {
            const reason = result.details.error ?? result.details.finalOutput;
            updateScopedTaskRecord(record.id, {
                queuedReason: reason,
            }, scope);
            lines.push(`blocked ${record.id}: ${reason}`);
            continue;
        }
        const childId = result.details?.id ?? "unknown";
        updateScopedTaskRecord(record.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            result: {
                summary: `Dispatched queued task as ${childId}.`,
                final: result.content?.[0]?.text ?? "",
            },
            drainedAt: new Date().toISOString(),
            drainedChildId: childId,
        }, scope);
        lines.push(`dispatched ${record.id} -> ${childId}`);
    }
    return lines.join("\n");
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
    const scope = currentTaskScope(ctx);
    if (op === "help" || op === "--help" || op === "-h") {
        return { content: [{ type: "text", text: formatAgentsHelp() }], details: { action: "agent-help", scope } };
    }
    if (op === "list" || firstIsLimit) {
        const records = listScopedTaskRecords(scope, { limit: Number.isFinite(limit) ? limit : 20 });
        setRouterUiStatus(ctx, `agents ${records.filter((record) => record.status === "background" || record.status === "running" || record.status === "starting").length} running`);
        return { content: [{ type: "text", text: formatScopedTaskList(records) }], details: { action: "agents", records: compactScopedTaskRecords(records), scope } };
    }
    if (op === "fleets" || op === "fleet") {
        const records = listScopedTaskRecords(scope, { limit: Number.isFinite(limit) ? limit : 200 })
            .filter((record) => !id || record.fleetId === id);
        return { content: [{ type: "text", text: formatFleetList(records) }], details: { action: "agent-fleets", records: compactScopedTaskRecords(records), scope } };
    }
    if (op === "queue" || op === "queued") {
        const records = listScopedTaskRecords(scope, { limit: Number.isFinite(limit) ? limit : 200 })
            .filter((record) => !id || record.fleetId === id);
        return { content: [{ type: "text", text: formatQueueList(records) }], details: { action: "agent-queue", records: compactScopedTaskRecords(records), scope } };
    }
    if (op === "report" || op === "summary") {
        const reportTarget = normalizeReportTarget(id, parts[2]);
        const reportLimit = Number.parseInt(reportTarget.kind === "stale" ? parts[3] ?? "" : reportTarget.kind ? parts[2] ?? "" : firstIsLimit ? parts[0] ?? "" : parts[1] ?? "", 10);
        const records = scopedReportRecords(listScopedTaskRecords(scope, { limit: 1000 }), reportTarget);
        return { content: [{ type: "text", text: formatScopedAgentsReport(records, Number.isFinite(reportLimit) ? reportLimit : 20, reportTarget) }], details: { action: "agent-report", target: reportTarget, records: compactScopedTaskRecords(records), scope } };
    }
    if (op === "drain") {
        if (!id)
            return { content: [{ type: "text", text: "Usage: /agents drain <fleet-id> [limit]" }], details: { action: "agent-drain", scope } };
        const drainLimit = Number.parseInt(parts[2] ?? "1", 10);
        const text = await drainScopedFleet(id, scope, ctx, Number.isFinite(drainLimit) ? drainLimit : 1);
        return { content: [{ type: "text", text }], details: { action: "agent-drain", fleetId: id, scope } };
    }
    if (op === "status" || op === "show" || op === "detail") {
        const record = id ? findScopedTaskRecord(id, scope) : undefined;
        return { content: [{ type: "text", text: formatScopedTaskDetail(record) }], details: { action: "agent-detail", record: compactScopedTaskRecord(record), scope } };
    }
    if (op === "events" || op === "timeline") {
        const eventLimit = Number.parseInt(parts[2] ?? "", 10);
        const record = id ? findScopedTaskRecord(id, scope) : undefined;
        return { content: [{ type: "text", text: formatScopedTaskEvents(record, Number.isFinite(eventLimit) ? eventLimit : 20) }], details: { action: "agent-events", record: compactScopedTaskRecord(record), scope } };
    }
    if (op === "files" || op === "paths") {
        const record = id ? findScopedTaskRecord(id, scope) : undefined;
        return { content: [{ type: "text", text: formatScopedTaskFiles(record) }], details: { action: "agent-files", record: compactScopedTaskRecord(record), scope } };
    }
    if (op === "peek") {
        const artifactName = parts[2];
        const record = id ? findScopedTaskRecord(id, scope) : undefined;
        return { content: [{ type: "text", text: formatScopedTaskPeek(record, artifactName, parts[3]) }], details: { action: "agent-peek", record: compactScopedTaskRecord(record), artifactName, scope } };
    }
    if (op === "name") {
        const name = parts.slice(2).join(" ").trim().replace(/^@/, "");
        const record = id ? findScopedTaskRecord(id, scope) : undefined;
        if (!record)
            return { content: [{ type: "text", text: "No scoped SISO task found for this parent." }], details: { action: "agent-name", record: compactScopedTaskRecord(record), scope } };
        if (!name)
            return { content: [{ type: "text", text: "Usage: /agents name <task-id> <name>" }], details: { action: "agent-name", record: compactScopedTaskRecord(record), scope } };
        const updated = updateScopedTaskRecord(record.id, { name, handle: name, addressable: true }, scope);
        return { content: [{ type: "text", text: `Named ${record.id} as @${name}.` }], details: { action: "agent-name", record: compactScopedTaskRecord(updated), scope } };
    }
    if (op === "resume") {
        const message = parts.slice(2).join(" ").trim();
        const record = id ? findScopedTaskRecord(id, scope) : undefined;
        if (!record)
            return { content: [{ type: "text", text: "No scoped SISO task found for this parent." }], details: { action: "agent-resume", record: compactScopedTaskRecord(record), scope } };
        if (!message)
            return { content: [{ type: "text", text: "Usage: /agents resume <task-id-or-name> <message>" }], details: { action: "agent-resume", record: compactScopedTaskRecord(record), scope } };
        if (!record.legacyChildRunPath)
            return { content: [{ type: "text", text: "This scoped task has no legacy child-run path to resume yet." }], details: { action: "agent-resume", record: compactScopedTaskRecord(record), scope } };
        const result = await controlChildRun({ action: "resume", id: record.id, message, background: true, ctx }, scope);
        return { content: [{ type: "text", text: result.text }], details: { action: "agent-resume", record: compactScopedTaskRecord(record), result, scope } };
    }
    if (op === "stop" || op === "interrupt" || op === "abort") {
        if (!id)
            return { content: [{ type: "text", text: "Usage: /agents stop <task-id|name|fleet-id>" }], details: { action: "agent-stop", scope } };
        const text = await stopScopedTarget(id, scope);
        return { content: [{ type: "text", text }], details: { action: "agent-stop", target: id, scope } };
    }
    if (op === "cancel") {
        if (!id)
            return { content: [{ type: "text", text: "Usage: /agents cancel <queued-task-id|name|fleet-id>" }], details: { action: "agent-cancel", scope } };
        const text = cancelQueuedTarget(id, scope);
        return { content: [{ type: "text", text }], details: { action: "agent-cancel", target: id, scope } };
    }
    if (op === "handoff") {
        const record = id ? findScopedTaskRecord(id, scope) : undefined;
        if (!record?.paths?.handoff)
            return { content: [{ type: "text", text: "No handoff found for this scoped SISO task." }], details: { action: "agent-handoff", record: compactScopedTaskRecord(record), scope } };
        return { content: [{ type: "text", text: readFileSync(record.paths.handoff, "utf8") }], details: { action: "agent-handoff", record: compactScopedTaskRecord(record), scope } };
    }
    const childOp = op === "show" ? "status" : op === "tail" ? "logs" : op;
    const result = childOp === "list"
        ? await controlChildRun({ action: "list", limit: Number.isFinite(limit) ? limit : 12 }, scope)
        : await controlChildRun({ action: childOp, ...(id ? { id } : {}) }, scope);
    const records = result.records.length ? result.records : collectLatestChildRunRecords(Number.isFinite(limit) ? limit : 12, scope).map(compactChildRunRecord);
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
    return { content: [{ type: "text", text: result.records.length ? formatChildRunRecords(records) : result.text }], details: { action: "agents", records: records.map(compactChildRunRecord), scope } };
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
function appendEventCountToDetails(details, events) {
    if (!details || typeof details !== "object" || Array.isArray(details))
        return details;
    const record = details;
    const existing = Array.isArray(record.events) ? record.events.filter((event) => Boolean(event && typeof event === "object")) : [];
    const baseCount = typeof record.eventCount === "number" ? record.eventCount : existing.length;
    const { events: _events, ...rest } = record;
    return {
        ...rest,
        eventCount: baseCount + events.length,
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
        details: appendEventCountToDetails(result.details, events),
    };
}
function skillAliases(candidate) {
    const normalized = candidate.trim().replace(/\s+/g, " ");
    const dashed = normalized.replace(/\s+/g, "-");
    const aliases = [normalized, dashed];
    if (/^agent (improve|improvement)$/i.test(normalized) || /^agent-improve(ment)?$/i.test(dashed)) {
        aliases.unshift("improve-agent-system");
    }
    return [...new Set(aliases)];
}
function skillSearchText(entry) {
    return [
        entry.skillId,
        entry.name,
        entry.source,
        entry.path,
        entry.description,
        ...entry.triggers,
        ...entry.headings.map((heading) => heading.text),
    ].join("\n").toLowerCase();
}
function rankSkillCandidate(entry, alias) {
    const needle = alias.toLowerCase();
    const name = entry.name.toLowerCase();
    const id = entry.skillId.toLowerCase();
    if (name === needle || id === needle)
        return 1000;
    if (name.endsWith(`:${needle}`) || id.endsWith(`:${needle}`))
        return 900;
    if (name.startsWith(needle))
        return 700;
    if (name.includes(needle))
        return 600;
    if (entry.triggers.some((trigger) => trigger.toLowerCase().includes(needle)))
        return 500;
    if (entry.description.toLowerCase().includes(needle))
        return 300;
    if (entry.path.toLowerCase().includes(needle))
        return 100;
    return skillSearchText(entry).includes(needle) ? 50 : 0;
}
function findSkillCandidateFromCatalog(candidate, catalog) {
    for (const alias of skillAliases(candidate)) {
        const ranked = catalog
            .map((entry) => ({ entry, score: rankSkillCandidate(entry, alias) }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
        if (ranked.length > 0) {
            const topScore = ranked[0].score;
            const entries = ranked
                .filter((item) => item.score === topScore || topScore < 900)
                .slice(0, 2)
                .map((item) => item.entry);
            return { op: "list", total: catalog.length, returned: entries.length, entries };
        }
    }
    return { op: "list", total: catalog.length, returned: 0, entries: [] };
}
function skillPromptMaxChars() {
    const parsed = Number.parseInt(process.env.SISO_SKILL_PROMPT_MAX_CHARS ?? "6000", 10);
    return Number.isFinite(parsed) && parsed > 500 ? parsed : 6000;
}
function formatSkillPrompt(skill, args) {
    const rawBody = stripFrontmatter(readFileSync(skill.path, "utf8")).trim();
    const maxChars = skillPromptMaxChars();
    const truncated = rawBody.length > maxChars;
    const body = truncated
        ? `${rawBody.slice(0, maxChars).trimEnd()}\n\n[SISO_SKILL_BODY_TRUNCATED original_chars=${rawBody.length} shown_chars=${maxChars}. Load a specific section with: siso action=skill op=load_body skillId=${skill.skillId} section=<name>]`
        : rawBody;
    return `<skill name="${skill.name}" location="${skill.path}">\n${body}\n</skill>${args ? `\n\n${args}` : ""}`;
}
export function resolveSkillCommandFromCatalog(args, catalog = getSkillCatalog()) {
    const raw = String(args ?? "").trim();
    if (!raw) {
        return { error: "Usage: /skill <skill-name-or-query> [instructions]. Try /skills to list available skills." };
    }
    const parts = raw.split(/\s+/);
    for (let length = Math.min(parts.length, 6); length >= 1; length--) {
        const candidate = parts.slice(0, length).join(" ");
        const result = findSkillCandidateFromCatalog(candidate, catalog);
        if (result.entries.length === 1) {
            return {
                skill: result.entries[0],
                args: parts.slice(length).join(" ").trim(),
            };
        }
        if (result.entries.length > 1 && length === parts.length) {
            return { error: `Multiple skills match ${JSON.stringify(candidate)}:\n${formatSkillHubResult(result)}\n\nUse a more specific skill name.` };
        }
    }
    return { error: `No skill found for ${JSON.stringify(raw)}. Try /skills to list available skills.` };
}
function resolveSkillCommand(args) {
    return resolveSkillCommandFromCatalog(args, getSkillCatalog());
}
function listSkillsCommand(args) {
    const query = String(args ?? "").trim();
    const defaultLimit = Number.parseInt(process.env.SISO_SKILL_LIST_LIMIT ?? "20", 10);
    const limit = Number.isFinite(defaultLimit) && defaultLimit > 0 ? Math.min(defaultLimit, 50) : 20;
    const result = query ? findSkillCandidateFromCatalog(query, getSkillCatalog()) : querySkillHub({ op: "list", limit });
    return formatSkillHubResult({ ...result, entries: result.entries.slice(0, limit), returned: Math.min(result.returned, limit) });
}

async function executeSiso(params, signal, ctx, pi) {
    const options = optionBag(params);
    const scope = currentTaskScope(ctx);
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
        const agentDecision = projectAgentDecision(task, params, options);
        const result = await executeSpawnWithNativeSubagentBridge({
            task,
            ctx: pi ? { ...ctx, getAllTools: pi.getAllTools } : ctx,
            signal,
            ...(agentDecision ? { decision: agentDecision } : {}),
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            ...(booleanParam(params, options, "background") !== undefined ? { background: booleanParam(params, options, "background") } : defaultSpawnBackground() !== undefined ? { background: defaultSpawnBackground() } : {}),
            ...(numberParam(params, options, "maxDepth") !== undefined ? { maxDepth: numberParam(params, options, "maxDepth") } : {}),
            ...(booleanParam(params, options, "noTools") !== undefined ? { noTools: booleanParam(params, options, "noTools") } : {}),
            ...(booleanParam(params, options, "queue") !== undefined ? { queue: booleanParam(params, options, "queue") } : {}),
            ...spawnMetadataParams(params, options),
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
            ctx: pi ? { ...ctx, getAllTools: pi.getAllTools } : ctx,
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
            ctx: pi ? { ...ctx, getAllTools: pi.getAllTools } : ctx,
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
            ...(numberParam(params, options, "workerCount") !== undefined ? { workerCount: numberParam(params, options, "workerCount") } : {}),
            ...(numberParam(params, options, "concurrency") !== undefined ? { concurrency: numberParam(params, options, "concurrency") } : {}),
            ...(textParam(params, options, "recipe") ? { recipe: textParam(params, options, "recipe") } : {}),
            ...(objectArrayParam(params, options, "tasks") ? { tasks: objectArrayParam(params, options, "tasks") } : {}),
            ...(objectArrayParam(params, options, "chain") ? { chain: objectArrayParam(params, options, "chain") } : {}),
            ...(objectParam(params, options, "allocationPlan") ? { allocationPlan: objectParam(params, options, "allocationPlan") } : textParam(params, options, "allocationPlanText") ? { allocationPlan: textParam(params, options, "allocationPlanText") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            ...(booleanParam(params, options, "background") !== undefined ? { background: booleanParam(params, options, "background") } : {}),
            ...(booleanParam(params, options, "noTools") !== undefined ? { noTools: booleanParam(params, options, "noTools") } : {}),
            ...(booleanParam(params, options, "council") !== undefined ? { council: booleanParam(params, options, "council") } : {}),
            ...(booleanParam(params, options, "verify") !== undefined ? { verify: booleanParam(params, options, "verify") } : {}),
            ...(numberParam(params, options, "verifyIterations") !== undefined ? { verifyIterations: numberParam(params, options, "verifyIterations") } : {}),
            ...(booleanParam(params, options, "controllerAllocate") !== undefined ? { controllerAllocate: booleanParam(params, options, "controllerAllocate") } : {}),
            ...(textParam(params, options, "allocationId") ? { allocationId: textParam(params, options, "allocationId") } : {}),
            ...(textParam(params, options, "checks") ? { checks: textParam(params, options, "checks") } : textParam(params, options, "commands") ? { commands: textParam(params, options, "commands") } : textParam(params, options, "command") ? { command: textParam(params, options, "command") } : {}),
            ...(numberParam(params, options, "checkTimeoutMs") !== undefined ? { checkTimeoutMs: numberParam(params, options, "checkTimeoutMs") } : {}),
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
                ...(booleanParam(params, options, "confirm") !== undefined ? { confirm: booleanParam(params, options, "confirm") } : {}),
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
            const records = id ? [collectChildRunRecord(id, scope)].filter((record) => Boolean(record)) : collectLatestChildRunRecords(numberParam(params, options, "limit") ?? 5, scope);
            return { content: [{ type: "text", text: formatChildRunRecords(records) }], details: records.map(compactChildRunRecord) };
        }
        const result = await controlChildRun({
            action: (op ?? "list"),
            ...(textParam(params, options, "id") ? { id: textParam(params, options, "id") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
            ...(textParam(params, options, "signal") === "SIGTERM" || textParam(params, options, "signal") === "SIGKILL" ? { signal: textParam(params, options, "signal") } : {}),
            ...(textParam(params, options, "message") ? { message: textParam(params, options, "message") } : {}),
            ...(booleanParam(params, options, "background") !== undefined ? { background: booleanParam(params, options, "background") } : {}),
            ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
        }, scope);
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
    if (domain === "extension") {
        const result = await queryExtensionCatalogAsync({
            ...(op ? { op: op } : {}),
            ...(textParam(params, options, "id") ? { id: textParam(params, options, "id") } : {}),
            ...(stringArrayParam(params, options, "ids") ? { ids: stringArrayParam(params, options, "ids") } : {}),
            ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
            ...(textParam(params, options, "category") ? { category: textParam(params, options, "category") } : {}),
            ...(textParam(params, options, "type") ? { type: textParam(params, options, "type") } : {}),
            ...(textParam(params, options, "recommendation") ? { recommendation: textParam(params, options, "recommendation") } : {}),
            ...(textParam(params, options, "decision") ? { decision: textParam(params, options, "decision") } : {}),
            ...(stringArrayParam(params, options, "capabilities") ? { capabilities: stringArrayParam(params, options, "capabilities") } : {}),
            ...(textParam(params, options, "notes") ? { notes: textParam(params, options, "notes") } : {}),
            ...(textParam(params, options, "scope") ? { scope: textParam(params, options, "scope") } : {}),
            ...(textParam(params, options, "profile") ? { profile: textParam(params, options, "profile") } : {}),
            ...(textParam(params, options, "workspace") ? { workspace: textParam(params, options, "workspace") } : {}),
            ...(textParam(params, options, "command") ? { command: textParam(params, options, "command") } : {}),
            ...(textParam(params, options, "toolPack") ? { toolPack: textParam(params, options, "toolPack") } : {}),
            ...(textParam(params, options, "registryPath") ? { registryPath: textParam(params, options, "registryPath") } : {}),
            ...(textParam(params, options, "storePath") ? { storePath: textParam(params, options, "storePath") } : {}),
            ...(textParam(params, options, "tarballPath") ? { tarballPath: textParam(params, options, "tarballPath") } : {}),
            ...(textParam(params, options, "tarballUrl") ? { tarballUrl: textParam(params, options, "tarballUrl") } : {}),
            ...(textParam(params, options, "version") ? { version: textParam(params, options, "version") } : {}),
            ...(textParam(params, options, "integrity") ? { integrity: textParam(params, options, "integrity") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
        });
        return { content: [{ type: "text", text: formatExtensionCatalogResult(result) }], details: result };
    }
    if (domain === "repo") {
        const repoAction = textParam(params, options, "repoAction") ?? op;
        const toolingArgs = {
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
            ...(textParam(params, options, "path") ? { path: textParam(params, options, "path") } : {}),
            ...(textParam(params, options, "paths") ? { paths: textParam(params, options, "paths") } : {}),
            ...(textParam(params, options, "mode") ? { mode: textParam(params, options, "mode") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
            ...(numberParam(params, options, "maxChars") !== undefined ? { maxChars: numberParam(params, options, "maxChars") } : {}),
            ...(numberParam(params, options, "depth") !== undefined ? { depth: numberParam(params, options, "depth") } : {}),
            ...(numberParam(params, options, "contextLines") !== undefined ? { contextLines: numberParam(params, options, "contextLines") } : {}),
        };
        if (repoAction === "search") {
            const result = repoSearch(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "public" || repoAction === "public-code" || repoAction === "codesearch" || repoAction === "sourcegraph" || repoAction === "internet-code") {
            const result = await publicCodeSearch(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "read_many" || repoAction === "read-many" || repoAction === "read") {
            const result = readMany(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "tree") {
            const result = projectTree(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "map") {
            const result = projectMap(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "ranked-map" || repoAction === "repo-map" || repoAction === "repomap") {
            const result = rankedRepoMap({ ...toolingArgs, task: textParam(params, options, "task") ?? textParam(params, options, "query") ?? "" });
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "index" || repoAction === "index-build" || repoAction === "build-index") {
            const result = repoIndexBuild(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "index-status") {
            const result = repoIndexStatus(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "query" || repoAction === "code-query" || repoAction === "codequery") {
            const result = codeQuery(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "outline") {
            const result = fileOutline(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "symbol") {
            const result = symbolSearch(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "context" || repoAction === "context_pack") {
            const result = contextPack(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "gather" || repoAction === "gather-context") {
            const result = gatherContext({ ...toolingArgs, task: textParam(params, options, "task") ?? textParam(params, options, "query") ?? "" });
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "brief") {
            const result = briefRepo({ ...toolingArgs, task: textParam(params, options, "task") ?? textParam(params, options, "query") ?? "" });
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "index" || repoAction === "index-build") {
            const result = repoIndexBuild(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "index-status") {
            const result = repoIndexStatus(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (repoAction === "query" || repoAction === "code-query") {
            const result = codeQuery(toolingArgs);
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
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
    if (domain === "workspace") {
        const workspaceAction = op || textParam(params, options, "repoAction") || "status";
        if (workspaceAction === "runtime" || workspaceAction === "runtime-summary") {
            const registeredTools = typeof pi?.getAllTools === "function" ? pi.getAllTools().map((tool) => tool.name).filter(Boolean) : undefined;
            const result = runtimeSummary({
                ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
                registeredTools,
                nativeSubagentAvailable: Boolean(registeredTools?.includes("subagent")),
            });
            return { content: [{ type: "text", text: result.text }], details: result };
        }
        const args = {
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(textParam(params, options, "paths") ? { paths: textParam(params, options, "paths") } : {}),
            ...(numberParam(params, options, "maxChars") !== undefined ? { maxChars: numberParam(params, options, "maxChars") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            ...(booleanParam(params, options, "stat") !== undefined ? { stat: booleanParam(params, options, "stat") } : {}),
            ...(textParam(params, options, "mode") === "stat" ? { stat: true } : {}),
        };
        const result = workspaceAction === "diff" ? workspaceDiff(args) : workspaceStatus(args);
        return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
    }
    if (domain === "check") {
        const checkAction = op || textParam(params, options, "repoAction") || "run";
        if (checkAction === "autopilot-plan" || checkAction === "autopilot" || checkAction === "verify-plan") {
            const result = autopilotPlan({
                ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
                objective: textParam(params, options, "task") ?? textParam(params, options, "query") ?? "",
                specification: textParam(params, options, "rubric") ?? textParam(params, options, "description") ?? textParam(params, options, "content") ?? "",
                checks: textParam(params, options, "command") ?? textParam(params, options, "checks") ?? textParam(params, options, "commands") ?? "",
                verifier: textParam(params, options, "profile") ?? textParam(params, options, "verifier") ?? "Minimax",
                sessionId: textParam(params, options, "sessionId") ?? "",
                threadId: textParam(params, options, "threadId") ?? "",
                parentRunId: textParam(params, options, "parentRunId") ?? "",
                autopilotRunId: textParam(params, options, "autopilotRunId") ?? textParam(params, options, "id") ?? "",
                ...(textParam(params, options, "paths") ? { paths: textParam(params, options, "paths") } : {}),
                ...(numberParam(params, options, "limit") !== undefined ? { maxIterations: numberParam(params, options, "limit") } : {}),
                ...(numberParam(params, options, "maxChars") !== undefined ? { maxChars: numberParam(params, options, "maxChars") } : {}),
            });
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (checkAction === "related" || checkAction === "related-checks") {
            const result = relatedChecks({
                ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
                ...(textParam(params, options, "paths") ? { paths: textParam(params, options, "paths") } : {}),
                ...(textParam(params, options, "id") ? { id: textParam(params, options, "id") } : {}),
                task: textParam(params, options, "task") ?? textParam(params, options, "query") ?? "",
            });
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        if (checkAction === "fix" || checkAction === "fix-loop" || checkAction === "autopilot-fix") {
            const result = autopilotFixLoop({
                ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
                command: textParam(params, options, "command") ?? textParam(params, options, "query") ?? "",
                task: textParam(params, options, "task") ?? textParam(params, options, "description") ?? "",
                ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
                ...(numberParam(params, options, "limit") !== undefined ? { maxIterations: numberParam(params, options, "limit") } : {}),
                ...(numberParam(params, options, "maxChars") !== undefined ? { maxChars: numberParam(params, options, "maxChars") } : {}),
            });
            return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
        }
        const result = runCheck({
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            command: textParam(params, options, "command") ?? textParam(params, options, "query") ?? "",
            ...(numberParam(params, options, "timeoutMs") !== undefined ? { timeoutMs: numberParam(params, options, "timeoutMs") } : {}),
        });
        return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
    }
    if (domain === "tool") {
        const toolAction = op || textParam(params, options, "repoAction") || "recommend";
        const args = {
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
            ...(textParam(params, options, "task") ? { task: textParam(params, options, "task") } : {}),
            ...(textParam(params, options, "id") ? { id: textParam(params, options, "id") } : {}),
            ...(textParam(params, options, "paths") ? { toolIds: textParam(params, options, "paths") } : {}),
            ...(textParam(params, options, "title") ? { packIds: textParam(params, options, "title") } : {}),
            ...(textParam(params, options, "content") ? { reason: textParam(params, options, "content") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            ...(textParam(params, options, "kind") ? { domain: textParam(params, options, "kind") } : {}),
            ...(textParam(params, options, "mode") ? { mode: textParam(params, options, "mode") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
        };
        const result = toolAction === "search" ? toolSearch(args) : toolAction === "show" ? toolShow(args) : toolAction === "inventory" ? toolInventory(args) : toolAction === "load" ? toolLoad(args) : toolAction === "unload" ? toolUnload(args) : toolAction === "stats" ? toolStats(args) : toolRecommend(args);
        return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
    }
    if (domain === "capability") {
        const capAction = op || textParam(params, options, "repoAction") || "search";
        const args = {
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
            ...(textParam(params, options, "id") ? { id: textParam(params, options, "id") } : {}),
            ...(textParam(params, options, "title") ? { title: textParam(params, options, "title") } : {}),
            ...(textParam(params, options, "status") ? { status: textParam(params, options, "status") } : {}),
            ...(textParam(params, options, "kind") ? { category: textParam(params, options, "kind") } : {}),
            ...(textParam(params, options, "priority") ? { priority: textParam(params, options, "priority") } : {}),
            ...(textParam(params, options, "paths") ? { paths: textParam(params, options, "paths") } : {}),
            ...(textParam(params, options, "content") ? { content: textParam(params, options, "content") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
            ...(numberParam(params, options, "limit") !== undefined ? { limit: numberParam(params, options, "limit") } : {}),
        };
        const result = capAction === "show" ? capabilityShow(args) : capAction === "audit" ? capabilityAudit(args) : capAction === "add" ? capabilityAdd(args) : capAction === "update" ? capabilityUpdate(args) : capabilitySearch(args);
        return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
    }
    if (domain === "doc") {
        const docAction = op || textParam(params, options, "repoAction") || "outline";
        const args = {
            ...(textParam(params, options, "cwd") ? { cwd: textParam(params, options, "cwd") } : {}),
            ...(textParam(params, options, "path") ? { path: textParam(params, options, "path") } : {}),
            ...(textParam(params, options, "query") ? { query: textParam(params, options, "query") } : {}),
            ...(textParam(params, options, "section") ? { section: textParam(params, options, "section") } : {}),
            ...(textParam(params, options, "mode") ? { mode: textParam(params, options, "mode") } : {}),
            ...(textParam(params, options, "content") ? { content: textParam(params, options, "content") } : {}),
            ...(textParam(params, options, "oldText") ? { oldText: textParam(params, options, "oldText") } : {}),
            ...(textParam(params, options, "newText") ? { newText: textParam(params, options, "newText") } : {}),
            ...(booleanParam(params, options, "dryRun") !== undefined ? { dryRun: booleanParam(params, options, "dryRun") } : {}),
        };
        const result = docAction === "update" ? docUpdate(args) : docAction === "apply_patch" || docAction === "patch" ? applyPatch({ ...args, patches: [{ path: args.path, oldText: args.oldText, newText: args.newText }] }) : markdownOutline(args);
        return { content: [{ type: "text", text: formatToolResult(result) }], details: result };
    }
    throw new Error(`unsupported siso domain: ${domain}`);
}
export default function sisoAgentRouterExtension(pi) {
    pi.registerMessageRenderer?.("siso-preflight", (message, options, theme) => new Text(renderSisoPhaseCard(message, options, theme), 0, 0));
    pi.registerMessageRenderer?.("siso-phase", (message, options, theme) => new Text(renderSisoPhaseCard(message, options, theme), 0, 0));
    const stopChildNotificationDispatchers = new Map();
    pi.on("session_start", (_event, ctx) => {
        const parentSessionId = currentParentSessionId(ctx);
        if (!parentSessionId || parentSessionId === "unknown")
            return;
        stopChildNotificationDispatchers.get(parentSessionId)?.();
        stopChildNotificationDispatchers.set(parentSessionId, startChildNotificationDispatcher(pi, { ctx, parentSessionId, sessionStartedAt: new Date().toISOString() }));
    });
    pi.on("session_shutdown", (_event, ctx) => {
        const parentSessionId = ctx ? currentParentSessionId(ctx) : undefined;
        if (parentSessionId && parentSessionId !== "unknown" && stopChildNotificationDispatchers.has(parentSessionId)) {
            stopChildNotificationDispatchers.get(parentSessionId)?.();
            stopChildNotificationDispatchers.delete(parentSessionId);
            return;
        }
        for (const stop of stopChildNotificationDispatchers.values())
            stop?.();
        stopChildNotificationDispatchers.clear();
    });
    pi.on("before_agent_start", (event, ctx) => {
        const prompt = typeof event.prompt === "string" ? event.prompt : "";
        if (prompt)
            publish(ctx, prompt);
        ctx?.appendEntry?.("siso-phase", buildSisoPhaseMessage("recon", "I’m going to inspect the relevant files, choose the smallest safe change, then validate it.", { source: "before_agent_start" }));
        const guard = evaluatePiChildGuardrail({ prompt });
        if (!guard.allowed) {
            setRouterUiStatus(ctx, guard.reason ?? "worker_guard blocked Pi child orchestration");
            setRouterUiWidget(ctx, [
                guard.reason ?? "worker_guard blocked Pi child orchestration",
                `matches=${guard.matches.map((match) => `${match.kind}:${match.value}`).join(",")}`,
            ]);
        }
        const existingSystem = typeof event.systemPrompt === "string" ? event.systemPrompt : "";
        return {
            message: buildSisoPreflightMessage(prompt),
            systemPrompt: existingSystem.includes("SISO interaction style:") ? existingSystem : `${existingSystem}${SISO_OUTPUT_STYLE_PROMPT}`,
        };
    });
    pi.registerCommand("skills", {
        description: "List SISO/Pi skills; optionally filter by query",
        handler: async (args) => ({ content: [{ type: "text", text: listSkillsCommand(args) }] }),
    });
    pi.registerCommand("skill", {
        description: "Load and run a skill by name/query, e.g. /skill agent improve <instructions>",
        handler: async (args) => {
            const resolved = resolveSkillCommand(args);
            if (resolved.error) {
                return { content: [{ type: "text", text: resolved.error }] };
            }
            pi.sendUserMessage(formatSkillPrompt(resolved.skill, resolved.args));
            return {
                content: [{ type: "text", text: `Loaded skill ${resolved.skill.name}${resolved.args ? " with your instructions." : "."}` }],
            };
        },
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
    pi.registerCommand("tasks", {
        description: "List and schedule durable SISO tasks. Usage: /tasks, /tasks claim, /tasks wave 3, /tasks fail <id>, /tasks resume <id>",
        handler: async (args, ctx) => tasksCommand(args, ctx),
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
        description: "Choose the SISO controller-first subagent allocation for a task. This only decides routing; it does not spawn the subagent.",
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
            "When the user asks to send work off in the background or run parallel/delegated work, set background=true so SISO can notify this chat when the child completes.",
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
            const agentDecision = projectAgentDecision(task, params, {});
            const result = await executeSpawnWithNativeSubagentBridge({
                task,
                ctx: pi ? { ...ctx, getAllTools: pi.getAllTools } : ctx,
                signal,
                ...(agentDecision ? { decision: agentDecision } : {}),
                ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
                ...(typeof params.timeoutMs === "number" ? { timeoutMs: params.timeoutMs } : {}),
                ...(typeof params.dryRun === "boolean" ? { dryRun: params.dryRun } : {}),
                ...(typeof params.background === "boolean" ? { background: params.background } : defaultSpawnBackground() !== undefined ? { background: defaultSpawnBackground() } : {}),
                ...(typeof params.maxDepth === "number" ? { maxDepth: params.maxDepth } : {}),
                ...(typeof params.noTools === "boolean" ? { noTools: params.noTools } : {}),
                ...(typeof params.queue === "boolean" ? { queue: params.queue } : {}),
                ...spawnMetadataParams(params, {}),
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
        async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
            const guard = evaluatePiChildGuardrail({ toolName: "siso_child", params });
            if (!guard.allowed)
                throw new Error(guard.reason ?? "worker_guard blocked action");
            const action = typeof params.action === "string" ? params.action : "list";
            const scope = currentTaskScope(ctx);
            const result = await controlChildRun({
                action: action,
                ...(typeof params.id === "string" ? { id: params.id } : {}),
                ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
                ...(params.signal === "SIGTERM" || params.signal === "SIGKILL" ? { signal: params.signal } : {}),
                ...(typeof params.message === "string" ? { message: params.message } : {}),
                ...(typeof params.background === "boolean" ? { background: params.background } : {}),
                ...(typeof params.timeoutMs === "number" ? { timeoutMs: params.timeoutMs } : {}),
            }, scope);
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
        async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
            const id = typeof params.id === "string" ? params.id : undefined;
            const scope = currentTaskScope(ctx);
            const records = id ? [collectChildRunRecord(id, scope)].filter(Boolean) : collectLatestChildRunRecords(typeof params.limit === "number" ? params.limit : 5, scope);
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
                details: records.map(compactChildRunRecord),
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
                confirm: {
                    type: "boolean",
                    description: "Required to actually delete files. Without confirm=true cleanup remains a dry run.",
                },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const result = cleanupChildRunLogs({
                ...(typeof params.maxAgeHours === "number" ? { maxAgeHours: params.maxAgeHours } : {}),
                ...(typeof params.maxRuns === "number" ? { maxRuns: params.maxRuns } : {}),
                ...(typeof params.dryRun === "boolean" ? { dryRun: params.dryRun } : {}),
                ...(typeof params.confirm === "boolean" ? { confirm: params.confirm } : {}),
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
                status: { type: "string", description: "backlog, ready, claimed, running, blocked, done, failed, or cancelled." },
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
                status: { type: "string", description: "backlog, ready, claimed, running, blocked, done, failed, or cancelled." },
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
        name: "siso_task_schedule",
        label: "SISO Task Schedule",
        description: "Run durable SISO task-graph scheduler operations: claim next ready task, claim a ready wave, fail and block descendants, or resume a failed subtree.",
        promptSnippet: "Use siso_task_schedule after creating durable tasks to claim ready work, execute dependency waves, fail blocked subtrees, or resume failed work.",
        promptGuidelines: [
            "Use op=claim-next for one worker handoff.",
            "Use op=wave when starting a bounded parallel batch.",
            "Use op=fail when a blocker fails so dependent tasks stop advancing.",
            "Use op=resume when retrying a failed subtree.",
        ],
        parameters: {
            type: "object",
            properties: {
                cwd: { type: "string", description: "Project root for .pi/tasks/siso-tasks.json. Defaults to current cwd." },
                op: { type: "string", description: "claim-next, wave, fail, or resume." },
                id: { type: "string", description: "Task id for op=fail or op=resume." },
                maxParallel: { type: "number", description: "Maximum total active claimed/running tasks for op=wave." },
            },
            required: ["op"],
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const base = {
                ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
            };
            const op = String(params.op ?? "");
            let result;
            if (op === "claim-next" || op === "claim_next") {
                result = claimNextSisoTask(base);
            }
            else if (op === "wave") {
                result = buildSisoTaskWave({
                    ...base,
                    ...(typeof params.maxParallel === "number" ? { maxParallel: params.maxParallel } : {}),
                });
            }
            else if (op === "fail") {
                result = failAndBlockSisoTask({
                    ...base,
                    id: String(params.id ?? ""),
                });
            }
            else if (op === "resume") {
                result = resumeFailedSisoTask({
                    ...base,
                    id: String(params.id ?? ""),
                });
            }
            else {
                throw new Error(`unknown schedule op: ${op}`);
            }
            return {
                content: [{ type: "text", text: formatSisoTaskScheduleResult(result) }],
                details: {
                    op,
                    ...result,
                },
            };
        },
    });
    pi.registerTool({
        name: "siso_project_agents",
        label: "SISO Project Agents",
        description: "List trusted markdown project/user agents and evaluate tool ACL policies before routing or spawning local custom agents.",
        promptSnippet: "Use siso_project_agents before relying on repo-local markdown agents or custom tool ACL declarations.",
        promptGuidelines: [
            "Project-local agents are ignored unless their root contains the trust marker.",
            "Use op=list to inspect trusted project/user agents.",
            "Use op=check-tool to evaluate ACL grammar before handing tools to a child agent.",
        ],
        parameters: {
            type: "object",
            properties: {
                cwd: { type: "string", description: "Project root. Defaults to current cwd." },
                op: { type: "string", description: "list or check-tool. Defaults to list." },
                tool: { type: "string", description: "Tool name for op=check-tool." },
                acl: { type: "string", description: "Tool ACL policy such as 'all, !write, !edit' for op=check-tool." },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const op = String(params.op ?? "list");
            if (op === "check-tool" || op === "check_tool") {
                const policy = normalizeToolAcl(params.acl);
                const tool = String(params.tool ?? "");
                const allowed = isToolAllowed(policy, tool);
                return {
                    content: [{
                            type: "text",
                            text: [
                                `tool=${tool || "none"}`,
                                `allowed=${allowed}`,
                                `all=${policy.all}`,
                                `allow=${policy.allow.join(",") || "none"}`,
                                `deny=${policy.deny.join(",") || "none"}`,
                            ].join("\n"),
                        }],
                    details: { op, tool, allowed, policy },
                };
            }
            if (op !== "list") {
                throw new Error(`unknown project agents op: ${op}`);
            }
            const registry = loadProjectAgentRegistry({
                ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
            });
            return {
                content: [{ type: "text", text: formatProjectAgentRegistryResult(registry) }],
                details: { op, ...registry },
            };
        },
    });
    pi.registerTool({
        name: "siso_mailbox",
        label: "SISO Mailbox",
        description: "Inspect and update parent-session child notification mailbox records and append-only task/session feeds.",
        promptSnippet: "Use siso_mailbox to list child deliveries, mark them read or acknowledged, and inspect task/session feeds.",
        promptGuidelines: [
            "Use op=list for the parent inbox.",
            "Use op=read before acting on a child delivery.",
            "Use op=ack when the parent has handled the delivery.",
            "Use op=feed for append-only task or session replay.",
        ],
        parameters: {
            type: "object",
            properties: {
                op: { type: "string", description: "list, show, read, ack, or feed." },
                id: { type: "string", description: "Mailbox message id for show/read/ack." },
                ownerSessionId: { type: "string", description: "Owner session id. Defaults to current parent session." },
                channel: { type: "string", description: "Feed channel such as #task/<id> or #session/<id>." },
                state: { type: "string", description: "Optional mailbox state filter for list." },
                limit: { type: "number", description: "Maximum records to return." },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
            const op = String(params.op ?? "list");
            const ownerSessionId = typeof params.ownerSessionId === "string" ? params.ownerSessionId : currentParentSessionId(ctx);
            const base = {
                ownerSessionId,
                ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
            };
            if (op === "list") {
                const records = listMailboxMessages({
                    ...base,
                    ...(typeof params.state === "string" ? { state: params.state } : {}),
                });
                return { content: [{ type: "text", text: formatMailboxMessages(records) }], details: { op, records } };
            }
            if (op === "feed") {
                const channel = typeof params.channel === "string" ? params.channel : `#session/${ownerSessionId}`;
                const records = readFeedEvents(channel, base).slice(0, Number.isFinite(params.limit) ? params.limit : 20);
                return {
                    content: [{ type: "text", text: records.length ? [`events=${records.length}`, ...records.map((event) => `type=${event.type ?? "event"} channel=${event.channelName} at=${event.at ?? "unknown"} child=${event.childId ?? "none"}`)].join("\n") : "No feed events matched." }],
                    details: { op, channel, records },
                };
            }
            const id = String(params.id ?? "");
            if (!id)
                throw new Error("id is required for mailbox show/read/ack");
            const message = { id, ownerSessionId };
            const record = op === "read"
                ? markMailboxRead(message, new Date().toISOString(), base)
                : op === "ack"
                    ? markMailboxAcknowledged(message, new Date().toISOString(), base)
                    : op === "show"
                        ? readMailboxMessage(message, base)
                        : undefined;
            if (!record)
                throw new Error(`unknown mailbox op: ${op}`);
            return {
                content: [{ type: "text", text: formatMailboxMessages([record]) }],
                details: { op, record },
            };
        },
    });
    pi.registerTool({
        name: "siso_supervisor",
        label: "SISO Supervisor",
        description: "Evaluate subagent health, retry state, deadletter records, and orphan cleanup identity decisions.",
        promptSnippet: "Use siso_supervisor before retrying, deadlettering, or cleaning up child-agent process state.",
        promptGuidelines: [
            "Use op=health for aggregate heartbeat state.",
            "Use op=retry to compute the next retry attempt and delay.",
            "Use op=deadletter to create a terminal deadletter record.",
            "Use op=persist to append active/retry/deadletter/orphan records under .siso/supervisor.",
            "Use op=list to inspect persisted supervisor state.",
            "Use op=cleanup-check before any orphan process cleanup.",
        ],
        parameters: {
            type: "object",
            properties: {
                op: { type: "string", description: "health, retry, deadletter, cleanup-check, persist, or list." },
                kind: { type: "string", description: "Supervisor persistence kind: active, retries, deadletters, or orphans." },
                cwd: { type: "string", description: "Project root for persisted .siso/supervisor records." },
                limit: { type: "number", description: "Maximum persisted records for op=list." },
                records: { type: "array", items: { type: "object" }, description: "Records for op=health." },
                record: { type: "object", description: "Record for retry/deadletter/cleanup-check." },
                observed: { type: "object", description: "Observed process identity for cleanup-check." },
                policy: { type: "object", description: "Retry policy for op=retry." },
                reason: { type: "string", description: "Deadletter reason." },
                now: { type: "string", description: "Optional ISO timestamp for deterministic checks." },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const op = String(params.op ?? "health");
            const now = typeof params.now === "string" ? params.now : undefined;
            if (op === "health") {
                const records = Array.isArray(params.records) ? params.records : [];
                const result = summarizeSupervisorHealth(records, now);
                return {
                    content: [{ type: "text", text: [
                                `total=${result.total}`,
                                `healthy=${result.byState.healthy}`,
                                `warn=${result.byState.warn}`,
                                `stale=${result.byState.stale}`,
                                `dead=${result.byState.dead}`,
                                `fingerprints=${result.uniqueFingerprints}`,
                            ].join("\n") }],
                    details: result,
                };
            }
            if (op === "retry") {
                const result = nextRetryState(params.record ?? {}, params.policy ?? {}, now);
                return {
                    content: [{ type: "text", text: `attempt=${result.attempt}\nretryable=${result.retryable}\ndelay_ms=${result.delayMs}\nretry_at=${result.retryAt ?? "none"}\ndeadletter=${result.deadletter}` }],
                    details: result,
                };
            }
            if (op === "deadletter") {
                const result = createDeadletterRecord(params.record ?? {}, params.reason ?? "unknown", now);
                return {
                    content: [{ type: "text", text: `deadletter=${result.id}\nreason=${result.reason}\nattempt=${result.attempt}\nfingerprint=${result.fingerprint}` }],
                    details: result,
                };
            }
            if (op === "cleanup-check" || op === "cleanup_check") {
                const result = shouldCleanupOrphanProcess(params.record ?? {}, params.observed ?? {});
                return {
                    content: [{ type: "text", text: `safe=${result.safe}\nreason=${result.reason}\npid_matches=${result.pidMatches}\nfingerprint_matches=${result.fingerprintMatches}\ncommand_matches=${result.commandMatches}` }],
                    details: result,
                };
            }
            if (op === "persist") {
                const result = persistSupervisorRecord(params.kind ?? "active", params.record ?? {}, {
                    ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
                    ...(typeof now === "string" ? { at: now } : {}),
                });
                return {
                    content: [{ type: "text", text: `persisted=${result.kind}\nat=${result.at}\npath=${result.path}` }],
                    details: result,
                };
            }
            if (op === "list") {
                const records = listSupervisorRecords({
                    ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
                    ...(typeof params.kind === "string" ? { kind: params.kind } : {}),
                    ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
                });
                return {
                    content: [{ type: "text", text: records.length ? [`records=${records.length}`, ...records.map((entry) => `kind=${entry.kind} at=${entry.at} id=${entry.record?.id ?? entry.record?.sourceId ?? "none"}`)].join("\n") : "No supervisor records matched." }],
                    details: { op, records },
                };
            }
            throw new Error(`unknown supervisor op: ${op}`);
        },
    });
    pi.registerTool({
        name: "siso_agent_scorecards",
        label: "SISO Agent Scorecards",
        description: "Record, list, and summarize persisted agent eval scorecards under .siso/evals/results.",
        promptSnippet: "Use siso_agent_scorecards to measure subagents before promoting routes, prompts, or extension adapters.",
        promptGuidelines: [
            "Record scorecards after benchmark or dogfood runs.",
            "Use list/summary before deciding which specialist agent should own a task type.",
        ],
        parameters: {
            type: "object",
            properties: {
                op: { type: "string", description: "record, list, or summary. Defaults to list." },
                cwd: { type: "string", description: "Project root for .siso/evals/results." },
                agent: { type: "string", description: "Agent name filter or record field." },
                version: { type: "string", description: "Agent version for record." },
                taskSet: { type: "string", description: "Eval task set id for record." },
                runs: { type: "number", description: "Number of eval runs." },
                trueFindings: { type: "number", description: "True findings count." },
                falsePositives: { type: "number", description: "False positive count." },
                missedBugs: { type: "number", description: "Missed bug count." },
                avgCostUsd: { type: "number", description: "Average cost per run." },
                avgLatencySeconds: { type: "number", description: "Average latency per run." },
                limit: { type: "number", description: "Maximum records for list/summary." },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const op = String(params.op ?? "list");
            const base = {
                ...(typeof params.cwd === "string" ? { cwd: params.cwd } : {}),
                ...(typeof params.agent === "string" && op !== "record" ? { agent: params.agent } : {}),
                ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
            };
            if (op === "record") {
                const result = recordAgentScorecard({
                    agent: params.agent,
                    version: params.version,
                    taskSet: params.taskSet,
                    runs: params.runs,
                    trueFindings: params.trueFindings,
                    falsePositives: params.falsePositives,
                    missedBugs: params.missedBugs,
                    avgCostUsd: params.avgCostUsd,
                    avgLatencySeconds: params.avgLatencySeconds,
                }, base);
                return {
                    content: [{ type: "text", text: `recorded=${result.id}\noverall=${result.score.overall}\npath=${result.path}` }],
                    details: result,
                };
            }
            const records = listAgentScorecards(base);
            if (op === "summary") {
                const summary = summarizeAgentScorecards(records);
                return {
                    content: [{ type: "text", text: summary.summary }],
                    details: summary,
                };
            }
            if (op === "list") {
                return {
                    content: [{ type: "text", text: records.length ? [`scorecards=${records.length}`, ...records.map((record) => `id=${record.id} overall=${record.score?.overall ?? 0} runs=${record.runs}`)].join("\n") : "No scorecards matched." }],
                    details: { op, records },
                };
            }
            throw new Error(`unknown scorecards op: ${op}`);
        },
    });
    pi.registerTool({
        name: "siso_extension_adapter",
        label: "SISO Extension Adapter Contract",
        description: "Validate extension adapter manifests before a Pi package or repo candidate is allowed near SISO runtime.",
        promptSnippet: "Use siso_extension_adapter before promoting a package from catalog candidate to runtime adapter.",
        promptGuidelines: [
            "Adapters must declare id, name, risk, capabilities, and a run function at code level.",
            "Use validation results to reject packages that would own SISO core routing, permissions, or state.",
        ],
        parameters: {
            type: "object",
            properties: {
                adapter: { type: "object", description: "Adapter-like object or manifest to validate." },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const adapter = params.adapter ?? {};
            const validation = validateExtensionAdapter(adapter);
            const manifest = createExtensionAdapterManifest(adapter);
            return {
                content: [{ type: "text", text: [`valid=${validation.valid}`, `errors=${validation.errors.join("; ") || "none"}`, `id=${manifest.id || "none"}`, `risk=${manifest.risk}`, `capabilities=${manifest.capabilities.join(",") || "none"}`].join("\n") }],
                details: { validation, manifest },
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
        name: "siso_extension_catalog",
        label: "SISO Extension Catalog",
        description: "Search the local SISO extension/package catalog built from pi.dev so agents can find install, fork, or copy-pattern candidates before rebuilding features.",
        promptSnippet: "Use siso_extension_catalog before building agent features that may already exist in the Pi ecosystem.",
        promptGuidelines: [
            "Search by user need or feature category first.",
            "Run op=audit-plan before installing any third-party package.",
            "Prefer copy-pattern or fork-candidate when risk is non-trivial.",
            "Do not load the full catalog into context; use narrow queries and show one package at a time.",
        ],
        parameters: {
            type: "object",
            properties: {
                op: { type: "string", description: "list, search, show, recommend, compare, or audit-plan." },
                id: { type: "string", description: "Package id or name, for example pi.dev:pi-subagents or pi-subagents." },
                ids: { type: "array", items: { type: "string" }, description: "Package ids/names for compare." },
                query: { type: "string", description: "Search text over name, description, categories, risks, links, and recommendations." },
                category: { type: "string", description: "Category filter such as agent-orchestration, memory-context, web-research, mcp-integrations, code-intelligence, safety-permissions, ui-dashboard, task-workflow, developer-tools, or models-providers." },
                type: { type: "string", description: "Package type filter such as extension, skill, prompt, theme, or package." },
                recommendation: { type: "string", description: "Recommendation filter: install-candidate, fork-candidate, copy-pattern, watch, or ignore." },
                decision: { type: "string", description: "Approval decision for op=approve, such as install, fork, copy-pattern, watch, or ignore." },
                capabilities: { type: "array", items: { type: "string" }, description: "Capabilities approved for this extension." },
                notes: { type: "string", description: "Approval, audit, or integration notes." },
                scope: { type: "string", description: "Activation scope for op=activate/deactivate: default, profile, workspace, command, or tool-pack." },
                profile: { type: "string", description: "Profile id to activate this extension for." },
                workspace: { type: "string", description: "Workspace id/path to activate this extension for." },
                command: { type: "string", description: "Command/slash-command to activate this extension for." },
                toolPack: { type: "string", description: "Tool-pack id to activate this extension for." },
                registryPath: { type: "string", description: "Optional registry path for tests or custom installs." },
                storePath: { type: "string", description: "Optional local extension store root for op=fetch." },
                tarballPath: { type: "string", description: "Optional already-downloaded tarball path for op=fetch." },
                tarballUrl: { type: "string", description: "Optional package tarball URL for op=fetch." },
                version: { type: "string", description: "Package version to fetch or audit." },
                integrity: { type: "string", description: "Expected package integrity for op=fetch." },
                limit: { type: "number", description: "Maximum rows to return. Defaults to 12, max 50." },
            },
            additionalProperties: false,
        },
        async execute(_toolCallId, params) {
            const result = await queryExtensionCatalogAsync({
                ...(typeof params.op === "string" ? { op: params.op } : {}),
                ...(typeof params.id === "string" ? { id: params.id } : {}),
                ...(Array.isArray(params.ids) ? { ids: params.ids.filter((item) => typeof item === "string") } : {}),
                ...(typeof params.query === "string" ? { query: params.query } : {}),
                ...(typeof params.category === "string" ? { category: params.category } : {}),
                ...(typeof params.type === "string" ? { type: params.type } : {}),
                ...(typeof params.recommendation === "string" ? { recommendation: params.recommendation } : {}),
                ...(typeof params.decision === "string" ? { decision: params.decision } : {}),
                ...(Array.isArray(params.capabilities) ? { capabilities: params.capabilities.filter((item) => typeof item === "string") } : {}),
                ...(typeof params.notes === "string" ? { notes: params.notes } : {}),
                ...(typeof params.scope === "string" ? { scope: params.scope } : {}),
                ...(typeof params.profile === "string" ? { profile: params.profile } : {}),
                ...(typeof params.workspace === "string" ? { workspace: params.workspace } : {}),
                ...(typeof params.command === "string" ? { command: params.command } : {}),
                ...(typeof params.toolPack === "string" ? { toolPack: params.toolPack } : {}),
                ...(typeof params.registryPath === "string" ? { registryPath: params.registryPath } : {}),
                ...(typeof params.storePath === "string" ? { storePath: params.storePath } : {}),
                ...(typeof params.tarballPath === "string" ? { tarballPath: params.tarballPath } : {}),
                ...(typeof params.tarballUrl === "string" ? { tarballUrl: params.tarballUrl } : {}),
                ...(typeof params.version === "string" ? { version: params.version } : {}),
                ...(typeof params.integrity === "string" ? { integrity: params.integrity } : {}),
                ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
            });
            return {
                content: [{ type: "text", text: formatExtensionCatalogResult(result) }],
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
