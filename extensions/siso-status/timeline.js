const TOOL_FAMILIES = [
    {
        id: "search",
        title: "Search repo",
        names: ["rg", "grep", "find", "search", "read", "ls"],
    },
    {
        id: "edit",
        title: "Edit files",
        names: ["apply_patch", "edit", "write", "multi_edit"],
    },
    {
        id: "agent",
        title: "Agents",
        names: ["subagent", "siso_spawn", "spawn_agent", "siso child", "siso spawn", "action=spawn", "action=council", "action=workflow", "action=orchestrate"],
    },
    {
        id: "command",
        title: "Run commands",
        names: ["bash", "shell", "exec_command"],
    },
];

export function toTimelineRows(state, options = {}) {
    const activity = Array.isArray(state?.activity) ? state.activity : [];
    const limit = Number.isFinite(options.limit) ? options.limit : 4;
    const children = Array.isArray(options.children) ? options.children : [];
    const rows = [
        ...skillRows(activity),
        ...childRows(children),
        ...toolFamilyRows(activity),
    ];
    return rows.slice(0, limit);
}

function skillRows(activity) {
    const seen = new Set();
    return activity
        .filter((event) => event.kind === "skill")
        .filter((event) => {
        const key = event.label;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    })
        .slice(0, 2)
        .map((event) => `Skill ${cleanLabel(event.label)} · ${skillPhase(event.phase)}`);
}

function toolFamilyRows(activity) {
    const starts = activity.filter((event) => event.kind === "tool" && event.phase === "start");
    const ends = activity.filter((event) => event.kind === "tool" && event.phase === "end");
    const families = new Map();
    for (const event of starts) {
        const family = classifyTool(event);
        const row = families.get(family.id) ?? { ...family, calls: 0, latest: event, completed: 0 };
        row.calls += 1;
        if (Date.parse(event.ts ?? "0") >= Date.parse(row.latest?.ts ?? "0"))
            row.latest = event;
        families.set(family.id, row);
    }
    for (const event of ends) {
        const family = classifyTool(event);
        const row = families.get(family.id);
        if (row)
            row.completed += 1;
    }
    return [...families.values()]
        .sort((a, b) => Date.parse(b.latest?.ts ?? "0") - Date.parse(a.latest?.ts ?? "0"))
        .map((family) => {
        const completed = family.completed > 0 ? ` · ${family.completed} done` : "";
        return `${family.title} · ${family.calls} call${family.calls === 1 ? "" : "s"}${completed} · latest ${cleanLabel(family.latest?.label ?? family.id)}`;
    });
}

function childRows(children) {
    return children
        .filter((child) => Number(child?.tokens?.totalTokens ?? 0) > 0)
        .filter((child) => isTerminalChild(child.status))
        .slice()
        .sort((a, b) => Date.parse(b.updatedAt ?? b.startedAt ?? "0") - Date.parse(a.updatedAt ?? a.startedAt ?? "0"))
        .slice(0, 2)
        .map((child) => {
        const checks = Number(child.toolCalls ?? 0);
        const checkText = checks > 0 ? ` · ${checks} check${checks === 1 ? "" : "s"}` : "";
        return `Agent ${childPhase(child.status)} · ${agentName(child.profile)}${checkText} · ${formatTokens(child.tokens.totalTokens)} tok`;
    });
}

function isTerminalChild(status) {
    return status === "completed" || status === "failed" || status === "timeout" || status === "aborted" || status === "unsupported";
}

function classifyTool(event) {
    const name = `${String(event.toolName ?? "")} ${String(event.label ?? "")}`.toLowerCase();
    const family = TOOL_FAMILIES.find((item) => item.names.some((needle) => name.includes(needle)));
    return family ?? { id: "tool", title: "Use tools", names: [] };
}

function childPhase(status) {
    if (status === "completed")
        return "complete";
    if (status === "failed" || status === "timeout" || status === "aborted")
        return "needs attention";
    return "active";
}

function agentName(profile) {
    const text = String(profile ?? "").trim();
    if (!text)
        return "subagent";
    return text
        .replace(/^minimax\./, "")
        .replace(/^spark\./, "Spark ")
        .replace(/^gpt55\./, "")
        .replace(/^gpt54mini\./, "GPT-5.4 Mini ");
}

function formatTokens(tokens) {
    if (tokens >= 1_000_000)
        return `${(tokens / 1_000_000).toFixed(1)}m`;
    if (tokens >= 1000)
        return `${Math.round(tokens / 100) / 10}k`;
    return String(tokens);
}

function skillPhase(phase) {
    if (phase === "end")
        return "done";
    if (phase === "error")
        return "needs attention";
    return "active";
}

function cleanLabel(value, limit = 64) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    const withoutDiagnostics = text
        .replace(/^siso action=(spawn|council|workflow|orchestrate)$/i, (_match, action) => `${action} agents`)
        .replace(/\s+(input|result)=\d+c\b/g, "");
    return withoutDiagnostics.length > limit ? `${withoutDiagnostics.slice(0, limit - 1)}…` : withoutDiagnostics;
}
