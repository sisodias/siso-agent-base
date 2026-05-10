import { formatToolDisplay } from "./tool-display.js";
import { toTimelineRows } from "./timeline.js";
const DEFAULTS = {
    route: "local",
    model: "unknown",
    promptChars: 0,
    responseChars: 0,
    toolChars: 0,
    toolCalls: 0,
    requestChars: 0,
    inputTextChars: 0,
    toolSchemaChars: 0,
    toolSchemaCount: 0,
    historyItems: 0,
    inputBreakdown: { totalChars: 0, categories: {}, topBlocks: [] },
    lastTool: null,
    currentSkill: null,
    lastPrompt: null,
    runStartedAt: null,
    activity: [],
};
export function createStatusState() {
    const state = { ...DEFAULTS, activity: [] };
    globalThis.__SISO_ACTIVITY__ = state.activity;
    return state;
}
export function toText(state) {
    const router = getRouterSnapshot();
    const model = state.model || "unknown";
    const route = state.route || "local";
    const skill = state.currentSkill || "none";
    const tool = state.lastTool || "none";
    const prompt = state.lastPrompt ? `${state.lastPrompt.slice(0, 80)}${state.lastPrompt.length > 80 ? "..." : ""}` : "none";
    const child = router?.child;
    const tokens = router?.tokens?.totalTokens ?? child?.tokens?.totalTokens ?? 0;
    const lastActivity = state.activity[0];
    return `siso-status | route=${route} model=${router?.model ?? model} profile=${router?.profile ?? "none"} lane=${router?.lane ?? "none"} tokens=${tokens} child=${child?.status ?? "none"} child_id=${child?.id ?? "none"} child_profile=${child?.profile ?? "none"} child_model=${child?.model ?? "none"} child_result="${child?.compactResult?.summary ?? "none"}" child_record=${child?.runRecordPath ?? "none"} token_delta=${tokens - estimatePromptTokens(state.requestChars)} prompt=${state.promptChars} chars response=${state.responseChars} chars tool_input=${state.toolChars} chars tool_schemas=${state.toolSchemaChars} chars tool_schema_count=${state.toolSchemaCount} request=${state.requestChars} chars input_text=${state.inputTextChars} chars history_items=${state.historyItems} input_sections=${formatCategories(state.inputBreakdown.categories)} tool_calls=${state.toolCalls} last_tool=${tool} skill=${skill} activity=${state.activity.length} latest_activity="${lastActivity ? formatActivityLine(lastActivity) : "none"}" last_prompt="${prompt}"`;
}
export function toStatusLine(state) {
    const router = getRouterSnapshot();
    const child = router?.child;
    const model = mainModel(state, router);
    const tool = state.lastTool || "-";
    const skill = state.currentSkill || "-";
    void skill;
    const inputTokens = estimatePromptTokens(state.inputTextChars + state.toolSchemaChars);
    const outputTokens = estimatePromptTokens(state.responseChars);
    const children = childSnapshots(router);
    const activeChildren = children.filter((item) => isActiveChild(item.status));
    const routedTokens = realTokenTotal(activeChildren) || router?.tokens?.totalTokens || child?.tokens?.totalTokens || realTokenTotal(children);
    const bits = ["π"];
    if (model && model !== "unknown")
        bits.push(displayModel(model));
    bits.push(contextHud(inputTokens, outputTokens));
    if (activeChildren.length > 0)
        bits.push(`${activeChildren.length} agent${activeChildren.length === 1 ? "" : "s"}`);
    else if (child?.status)
        bits.push(`agent ${childVerb(child.status)}`);
    if (routedTokens > 0)
        bits.push(`${formatTokens(routedTokens)} tok`);
    if (state.toolCalls > 0)
        bits.push(`${state.toolCalls} call${state.toolCalls === 1 ? "" : "s"}`);
    if (tool !== "-")
        bits.push(tool);
    if (state.runStartedAt)
        bits.push(ageSince(state.runStartedAt));
    if (bits.length === 2)
        bits.push("ready");
    return bits.join(" · ");
}
function runStateLine(state, router) {
    const child = router?.child;
    const currentTask = state.lastPrompt ? truncate(state.lastPrompt.replace(/\s+/g, " "), 72) : "idle";
    const activeAgent = child?.profile ?? router?.profile ?? "main";
    const activeModel = displayModel(child?.model ?? router?.model ?? state.model ?? "unknown");
    const elapsed = state.runStartedAt ? ageSince(state.runStartedAt) : "now";
    const lastAction = state.activity[0] ? truncate(formatActivityLine(state.activity[0]), 72) : "none";
    return `run task=${currentTask} · agent=${activeAgent} · model=${activeModel} · elapsed=${elapsed} · last=${lastAction}`;
}
function mainModel(state, router) {
    if (state.model && state.model !== "unknown")
        return state.model;
    if (typeof process !== "undefined" && process.env.PI_CODEX_MODEL)
        return process.env.PI_CODEX_MODEL;
    const routerModel = router?.model;
    if (routerModel === "claude-opus-4-7" || routerModel === "gpt-5.5")
        return routerModel;
    return "unknown";
}
export function toAgentWidgetLines(state) {
    const children = childSnapshots(getRouterSnapshot());
    if (children.length === 0)
        return [];
    const activeChildren = children.filter((item) => isActiveChild(item.status));
    const visibleChildren = activeChildren.length > 0 ? activeChildren.slice(0, 4) : children.slice(0, 4);
    return visibleChildren.map(childHudLine);
}
export function toWidgetLines(state) {
    const router = getRouterSnapshot();
    const children = childSnapshots(router);
    const activeChildren = children.filter((item) => isActiveChild(item.status));
    if (activeChildren.length === 0)
        return [];
    return activeChildren.slice(0, 4).map(childHudLine);
}
export function toTimelineWidgetLines(state, limit = 4) {
    return toTimelineRows(state, { limit, children: childSnapshots(getRouterSnapshot()) });
}
export function pushActivity(state, event) {
    const { ts, ...rest } = event;
    state.activity = [{ ts: ts ?? new Date().toISOString(), ...rest }, ...state.activity].slice(0, 8);
    globalThis.__SISO_ACTIVITY__ = state.activity;
}
export function formatActivityLine(event) {
    return `${event.kind}:${event.phase} ${event.label}${event.detail ? ` ${event.detail}` : ""}`;
}
function compactActivityLine(event) {
    return `${activityDot(event)} ${event.kind}:${event.phase} ${truncate(event.label, 28)}`;
}
export function toActivityLines(state, limit = 4) {
    return state.activity.slice(0, limit).map((event) => `activity ${formatActivityLine(event)}`);
}
export function formatContextExplain(state) {
    const categories = Object.entries(state.inputBreakdown?.categories ?? {})
        .filter(([, chars]) => chars > 0)
        .sort(([, a], [, b]) => b - a);
    const topBlocks = [...(state.inputBreakdown?.topBlocks ?? [])]
        .sort((a, b) => b.chars - a.chars)
        .slice(0, 6);
    const categoryLines = categories.length
        ? categories.slice(0, 10).map(([name, chars]) => `- ${name}: ${formatChars(chars)} chars (~${formatTokens(estimatePromptTokens(chars))} tokens)`)
        : ["- none: no input text blocks recorded yet"];
    const blockLines = topBlocks.length
        ? topBlocks.map((block) => `- ${block.category}: ${formatChars(block.chars)} chars at ${compactPath(block.path)} · ${truncate(block.preview, 96)}`)
        : ["- none"];
    const inputTokens = estimatePromptTokens(state.inputTextChars + state.toolSchemaChars);
    const warningLines = contextWarningLines(state, categories);
    return [
        "SISO context explain",
        "",
        `request=${formatChars(state.requestChars)} chars (~${formatTokens(estimatePromptTokens(state.requestChars))} tokens)`,
        `input_text=${formatChars(state.inputTextChars)} chars (~${formatTokens(estimatePromptTokens(state.inputTextChars))} tokens)`,
        `tool_schemas=${formatChars(state.toolSchemaChars)} chars across ${state.toolSchemaCount} tools (~${formatTokens(estimatePromptTokens(state.toolSchemaChars))} tokens)`,
        `history_items=${state.historyItems}`,
        `visible_context_estimate=${formatTokens(inputTokens)} tokens`,
        "",
        "Warnings",
        ...warningLines,
        "",
        "By category",
        ...categoryLines,
        "",
        "Top blocks",
        ...blockLines,
    ].join("\n");
}
function contextWarningLines(state, categories) {
    const warnings = [];
    const totalText = state.inputTextChars || 1;
    const largest = categories[0];
    if (largest) {
        const [name, chars] = largest;
        const share = chars / totalText;
        if (name === "tool_output_history" && share >= 0.35) {
            warnings.push(`- tool output is the largest context bucket (${Math.round(share * 100)}% of input text); prefer summaries or retrieval pointers.`);
        }
        else if (share >= 0.5 && name !== "user_prompt") {
            warnings.push(`- ${name} dominates context (${Math.round(share * 100)}% of input text); check whether it can be summarized or lazily retrieved.`);
        }
    }
    if (state.toolSchemaChars >= 20_000) {
        warnings.push(`- tool schemas are heavy (${formatChars(state.toolSchemaChars)} chars); consider lean/deferred tool mode for this turn.`);
    }
    if (state.historyItems >= 80) {
        warnings.push(`- history is large (${state.historyItems} items); consider a handoff/summary before more subagent work.`);
    }
    if (estimatePromptTokens(state.inputTextChars + state.toolSchemaChars) >= 200_000) {
        warnings.push("- visible context estimate is already high; avoid pasting child transcripts or broad grep output.");
    }
    return warnings.length ? warnings.slice(0, 4) : ["- none"];
}
function estimatePromptTokens(chars) {
    return Math.ceil(chars / 4);
}
function formatChars(chars) {
    if (chars >= 1_000_000)
        return `${(chars / 1_000_000).toFixed(1)}m`;
    if (chars >= 1000)
        return `${Math.round(chars / 100) / 10}k`;
    return String(chars);
}
function truncate(value, limit) {
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
function compactPath(path, limit = 56) {
    const value = String(path ?? "");
    return value.length > limit ? `…${value.slice(-(limit - 1))}` : value;
}
function formatTopCategories(categories, limit) {
    return Object.entries(categories)
        .filter(([, chars]) => chars > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([category, chars]) => `${category} ${formatChars(chars)}`)
        .join(" · ");
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
    return map[model] ?? model.replace(/-202\d{5,8}$/, "");
}
function contextHud(inputTokens, outputTokens) {
    return `ctx ${contextBar(inputTokens)} ${formatTokens(inputTokens)}→${formatTokens(outputTokens)}`;
}
function contextBar(inputTokens) {
    const contextWindow = 1_000_000;
    const pct = Math.min(100, Math.max(0, (inputTokens / contextWindow) * 100));
    const filled = Math.max(inputTokens > 0 ? 1 : 0, Math.min(10, Math.round(pct / 10)));
    const bar = `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
    return `${bar} ${pct.toFixed(pct < 1 ? 1 : 0)}%/1M`;
}
function formatTokens(tokens) {
    if (tokens >= 1_000_000)
        return `${(tokens / 1_000_000).toFixed(1)}m`;
    if (tokens >= 1000)
        return `${Math.round(tokens / 100) / 10}k`;
    return String(tokens);
}
function childSnapshots(router) {
    const children = Object.values(router?.children ?? {});
    if (children.length === 0 && router?.child)
        return [router.child];
    return children.sort((a, b) => {
        const started = Date.parse(a.startedAt ?? a.updatedAt ?? "0") - Date.parse(b.startedAt ?? b.updatedAt ?? "0");
        if (started !== 0)
            return started;
        return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });
}
function isActiveChild(status) {
    return !isTerminalChild(status) && (status === "starting" || status === "running" || status === "background");
}
function isTerminalChild(status) {
    return status === "completed" || status === "failed" || status === "timeout" || status === "aborted" || status === "unsupported";
}
function childHudLine(child) {
    const name = childAgentName(child);
    const task = activeChildTask(child);
    const taskText = task ? ` · ${task}` : "";
    const age = child.durationMs && Number.isFinite(child.durationMs) ? formatDuration(child.durationMs) : ageSince(child.startedAt ?? child.updatedAt);
    const verb = child.status === "starting" ? "spawning" : "running";
    return `Agent ${verb} · ${name}${taskText} · ${age} · ${childMetricText(child)}`;
}
function agentDrawerLine(children) {
    const running = children.filter((child) => isActiveChild(child.status)).length;
    const done = children.filter((child) => child.status === "completed").length;
    const failed = children.filter((child) => isFailedChild(child.status)).length;
    const latest = children[0];
    const latestAge = latest && running === 0 ? ` · latest ${ageSince(latest.startedAt ?? latest.updatedAt)}` : "";
    const failedText = failed > 0 ? ` · ${failed} failed` : "";
    const doneText = done > 0 ? ` · ${done} complete` : "";
    const grid = agentDotGrid(children);
    const gridText = grid ? ` ${grid}` : "";
    if (running > 0)
        return `agents${gridText} · ${running} active`;
    return `agents${gridText} · ${children.length} total${doneText}${failedText}${latestAge}`;
}
export function agentDotGrid(children) {
    return children.slice(0, 12).map((child) => childStatusGlyph(child.status)).join("");
}
function childStatusGlyph(status) {
    if (status === "completed")
        return "●";
    if (isActiveChild(status)) {
        const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
        return frames[Math.floor(Date.now() / 120) % frames.length];
    }
    if (isFailedChild(status))
        return "×";
    if (status === "cancelled" || status === "aborted")
        return "⊘";
    return "○";
}
function isFailedChild(status) {
    return status === "failed" || status === "error" || status === "timeout";
}
function groupedToolLine(state) {
    const tools = state.activity.filter((event) => event.kind === "tool").slice(0, 8);
    if (tools.length < 3)
        return undefined;
    const running = tools.filter((event) => event.phase === "start" || event.phase === "update").length;
    const complete = tools.filter((event) => event.phase === "end").length;
    const errors = tools.filter((event) => event.phase === "error").length;
    const latest = tools[0];
    const errorText = errors > 0 ? ` · ${errors} errors` : "";
    const runningText = running > 0 ? ` · ${running} active` : "";
    return `tools ${tools.length}${runningText} · ${complete} complete${errorText} · latest ${truncate(latest.label, 36)}`;
}
function compactChildId(id) {
    const compact = id.replace(/^siso-child-/, "").replace(/^child-/, "");
    return truncate(compact || "agent", 18);
}
function compactProfile(profile) {
    return profile.replace(/^minimax\./, "mm.").replace(/^gpt54mini\./, "g54.").replace(/^spark\./, "sp.").replace(/^gpt55\./, "o.");
}
function childAgentName(child) {
    const profile = child.profile ?? "";
    const profileNames = {
        "minimax.scout": "scout",
        "minimax.worker": "worker",
        "minimax.verifier": "MiniMax verifier",
        "spark.worker": "Spark worker",
        "spark.scout": "Spark scout",
        "gpt54mini.worker": "GPT-5.4 Mini worker",
        "gpt55.oracle": "Oracle",
    };
    if (profileNames[profile])
        return profileNames[profile];
    if (profile) {
        return profile
            .split(".")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    }
    return "subagent";
}
function activeChildTask(child) {
    if (typeof child.task === "string" && child.task.trim())
        return compactTaskLabel(child.task);
    const summary = child.compactResult?.summary ?? "";
    if (!summary || /^background child supervisor started/i.test(summary))
        return "";
    return compactTaskLabel(summary);
}
function compactTaskLabel(value) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!text)
        return "";
    if (isCommandDiagnostic(text))
        return commandDiagnosticLabel(text);
    const cleaned = text
        .replace(/^yo\s+/i, "")
        .replace(/^please\s+/i, "")
        .replace(/^can you\s+/i, "")
        .replace(/^spawn\s+\d+\s+/i, "spawn ")
        .replace(/[^\p{L}\p{N}._/-]+/gu, " ")
        .split(/\s+/)
        .filter(Boolean)
        .filter((word) => !TASK_LABEL_STOPWORDS.has(word.toLowerCase()))
        .slice(0, 4)
        .join(" ");
    return cleaned || truncate(text, 32);
}
const TASK_LABEL_STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "about",
    "across",
    "for",
    "from",
    "in",
    "into",
    "it",
    "of",
    "on",
    "please",
    "the",
    "to",
    "with",
    "display",
]);
function isCommandDiagnostic(text) {
    return /run commands?\s*·|latest\s+(bash|zsh|sh|node|npm)|\b(tail|grep|rg|sed|cat|awk|npm|node)\b.*\b(scripts\/|extensions\/|package\.json|CHANGELOG\.md)/i.test(text);
}
function commandDiagnosticLabel(text) {
    if (/tui-demo-components|ChildAgentRow|tui-demo/i.test(text))
        return "Inspect TUI components";
    if (/siso-status|status-state|status-widget/i.test(text))
        return "Inspect SISO status";
    if (/subagent|child-agent|child/i.test(text))
        return "Inspect subagent status";
    if (/changelog|version|release/i.test(text))
        return "Inspect release files";
    return "Inspect command output";
}
function childMetricText(child) {
    const toolCalls = child.toolCalls ?? 0;
    const tokens = child.tokens?.totalTokens ?? 0;
    const parts = [];
    if (toolCalls > 0)
        parts.push(`${toolCalls} check${toolCalls === 1 ? "" : "s"}`);
    if (tokens > 0)
        parts.push(`${formatTokens(tokens)} tok`);
    return parts.length ? parts.join(" · ") : "working";
}
function realTokenTotal(children) {
    return children.reduce((sum, child) => sum + Number(child.tokens?.totalTokens ?? 0), 0);
}
function runtimeLabel(child) {
    if (isActiveChild(child.status))
        return `${workingFrame()} ${ageSince(child.startedAt ?? child.updatedAt)}`;
    if (child.durationMs && Number.isFinite(child.durationMs))
        return formatDuration(child.durationMs);
    return childVerb(child.status);
}
function workingFrame() {
    const frames = ["launching", "launching·", "launching··", "launching···"];
    return frames[Math.floor(Date.now() / 250) % frames.length];
}
function formatDuration(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
}
function childVerb(status) {
    if (status === "background")
        return "launched";
    if (status === "completed")
        return "complete";
    if (status === "running" || status === "starting")
        return "working";
    return status;
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
function activityDot(event) {
    if (event.phase === "error")
        return "×";
    if (event.kind === "child" || event.kind === "workflow" || event.kind === "council")
        return "●";
    if (event.kind === "skill")
        return "◆";
    if (event.kind === "tool")
        return event.phase === "end" ? "●" : "◐";
    return "·";
}
export function getRouterSnapshot() {
    return globalThis.__SISO_ROUTER_STATUS__;
}
export function summarizeProviderPayload(payload) {
    const requestChars = JSON.stringify(payload ?? {}).length;
    let inputTextChars = 0;
    let toolSchemaChars = 0;
    let toolSchemaCount = 0;
    let historyItems = 0;
    const visit = (value) => {
        if (typeof value === "string") {
            inputTextChars += value.length;
            return;
        }
        if (Array.isArray(value)) {
            historyItems += value.length;
            for (const item of value)
                visit(item);
            return;
        }
        if (!value || typeof value !== "object")
            return;
        const record = value;
        const tools = record.tools;
        if (Array.isArray(tools)) {
            toolSchemaCount = tools.length;
            toolSchemaChars = JSON.stringify(tools).length;
        }
        for (const [key, child] of Object.entries(record)) {
            if (key !== "tools")
                visit(child);
        }
    };
    visit(payload);
    return { requestChars, inputTextChars, toolSchemaChars, toolSchemaCount, historyItems, inputBreakdown: summarizeInputBreakdown(payload) };
}
export function summarizeInputBreakdown(payload) {
    const blocks = [];
    collectInputTextBlocks(payload, "", blocks);
    const categories = {};
    for (const block of blocks) {
        categories[block.category] = (categories[block.category] ?? 0) + block.chars;
    }
    return {
        totalChars: blocks.reduce((sum, block) => sum + block.chars, 0),
        categories,
        topBlocks: blocks.sort((a, b) => b.chars - a.chars).slice(0, 8),
    };
}
function collectInputTextBlocks(value, path, blocks, role) {
    if (Array.isArray(value)) {
        value.forEach((child, index) => collectInputTextBlocks(child, `${path}[${index}]`, blocks, role));
        return;
    }
    if (!value || typeof value !== "object")
        return;
    if (path.startsWith(".tools"))
        return;
    const record = value;
    const nextRole = typeof record.role === "string" ? record.role : role;
    if (typeof record.text === "string") {
        blocks.push({
            path: `${path}.text`,
            category: classifyInputText(record.text, nextRole, path),
            chars: record.text.length,
            preview: record.text.replace(/\s+/g, " ").trim().slice(0, 140),
        });
    }
    for (const [key, child] of Object.entries(record)) {
        if (key === "tools")
            continue;
        collectInputTextBlocks(child, `${path}.${key}`, blocks, nextRole);
    }
}
function classifyInputText(text, role, path) {
    if (text.length === 0)
        return "empty";
    if (text.startsWith("x-anthropic-billing-header:"))
        return "billing_header";
    if (text.startsWith("Bifrost input breakdown"))
        return "siso_bifrost_metrics";
    if (text.includes("# Pi Codex Kernel") || text.includes("# SISO Pi Kernel"))
        return "pi_kernel";
    if (text.includes("You are a SISO Pi child agent."))
        return "child_agent_prompt";
    if (text.includes("You are a Claude Code subagent"))
        return "subagent_core_prompt";
    if (text.includes("You are a Claude agent, built on Anthropic"))
        return "agent_core_prompt";
    if (text.includes("Compressed local Claude context for Shaan"))
        return "compressed_claude_context";
    if (text.includes("The following skills are available") || text.includes("Skills are available via the Skill tool"))
        return "skills_index";
    if (text.includes("The following deferred tools") || text.includes("Deferred tools available through ToolSearch"))
        return "deferred_tools_index";
    if (text.includes("<system-reminder>"))
        return "system_reminder";
    if (role === "user" && path.includes(".input"))
        return "user_prompt";
    if (role === "assistant")
        return "assistant_history";
    if (path.includes(".output"))
        return "tool_output_history";
    if (text.length > 1000)
        return "large_other_text";
    return "small_other_text";
}
function formatCategories(categories) {
    return Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([key, chars]) => `${key}:${chars}`)
        .join(",") || "none";
}
export function applyEvent(state, eventType, payload = {}) {
    if (eventType === "model_select") {
        if (typeof payload.route === "string") {
            state.route = payload.route;
        }
        if (typeof payload.model === "string") {
            state.model = payload.model;
        }
        pushActivity(state, {
            kind: "model",
            phase: "update",
            label: state.model,
            detail: typeof payload.route === "string" ? `route=${payload.route}` : undefined,
        });
        return;
    }
    if (eventType === "before_agent_start") {
        state.toolChars = 0;
        state.toolCalls = 0;
        state.lastTool = null;
        if (typeof payload.prompt === "string") {
            state.lastPrompt = payload.prompt;
            state.promptChars = payload.prompt.length;
            state.runStartedAt = new Date().toISOString();
        }
        else {
            state.lastPrompt = null;
            state.promptChars = 0;
            state.runStartedAt = new Date().toISOString();
        }
        if (typeof payload.model === "string") {
            state.model = payload.model;
        }
        if (typeof payload.route === "string") {
            state.route = payload.route;
        }
        if (typeof payload.skill === "string") {
            state.currentSkill = payload.skill;
            pushActivity(state, { kind: "skill", phase: "start", label: payload.skill });
        }
        pushActivity(state, {
            kind: "turn",
            phase: "start",
            label: state.lastPrompt ? state.lastPrompt.replace(/\s+/g, " ").slice(0, 80) : "agent start",
            detail: `model=${state.model}`,
        });
        return;
    }
    if (eventType === "before_provider_request") {
        const providerPayload = payload.payload && typeof payload.payload === "object" ? payload.payload : payload;
        if (typeof providerPayload.model === "string") {
            state.model = providerPayload.model;
        }
        const summary = summarizeProviderPayload(payload.payload ?? payload);
        state.requestChars = summary.requestChars;
        state.inputTextChars = summary.inputTextChars;
        state.toolSchemaChars = summary.toolSchemaChars;
        state.toolSchemaCount = summary.toolSchemaCount;
        state.historyItems = summary.historyItems;
        state.inputBreakdown = summary.inputBreakdown;
        return;
    }
    if (eventType === "tool_call") {
        const toolName = typeof payload.toolName === "string"
            ? payload.toolName
            : typeof payload.name === "string"
                ? payload.name
                : null;
        if (toolName) {
            const display = formatToolDisplay(toolName, payload.input);
            state.lastTool = toolName;
            state.toolCalls += 1;
            pushActivity(state, {
                kind: "tool",
                phase: "start",
                label: display.display,
                toolName,
                detail: `input=${toolInputChars(payload.input)}c`,
                full: display.full,
            });
        }
        const rawInput = payload.input;
        if (typeof rawInput === "string") {
            state.toolChars += rawInput.length;
        }
        else if (typeof rawInput === "object" && rawInput !== null) {
            state.toolChars += JSON.stringify(rawInput).length;
        }
        return;
    }
    if (eventType === "tool_execution_start" || eventType === "tool_execution_update") {
        const toolName = typeof payload.toolName === "string"
            ? payload.toolName
            : typeof payload.name === "string"
                ? payload.name
                : "tool";
        const display = formatToolDisplay(toolName, payload.input);
        pushActivity(state, {
            kind: "tool",
            phase: eventType === "tool_execution_start" ? "start" : "update",
            label: display.display,
            toolName,
            detail: typeof payload.status === "string" ? payload.status : undefined,
            full: display.full,
        });
        return;
    }
    if (eventType === "tool_execution_end" || eventType === "tool_result") {
        const result = payload.result;
        if (typeof result === "string") {
            state.responseChars += result.length;
        }
        const toolName = typeof payload.toolName === "string"
            ? payload.toolName
            : typeof payload.name === "string"
                ? payload.name
                : state.lastTool ?? "tool";
        pushActivity(state, {
            kind: "tool",
            phase: "end",
            label: formatToolDisplay(toolName, payload.input).display,
            toolName,
            detail: typeof result === "string" ? `result=${result.length}c` : undefined,
        });
    }
}
function toolInputChars(input) {
    if (typeof input === "string")
        return input.length;
    if (typeof input === "object" && input !== null)
        return JSON.stringify(input).length;
    return 0;
}
