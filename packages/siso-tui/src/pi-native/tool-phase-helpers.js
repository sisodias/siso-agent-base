export const toolPhaseHelpersSource = String.raw`
function sisoToolPhase(name, args) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const data = args && typeof args === "object" ? args : {};
    if (tool === "read" || tool === "ls" || tool === "find" || tool === "grep") return "Explore";
    if (tool === "write" || tool === "edit") return "Modify";
    if (tool === "siso") {
        const action = String(data.action ?? data.domain ?? "").toLowerCase();
        if (action === "spawn" || action === "council" || action === "workflow" || action === "orchestrate" || action === "child") return "Delegate";
        if (action === "task" || action === "repo" || action === "skill") return "Explore";
        return "Delegate";
    }
    if (tool.includes("spawn") || tool.includes("agent") || tool.includes("subagent") || tool.includes("council") || tool.includes("workflow")) return "Delegate";
    if (tool === "bash") {
        const command = sisoSingleLine(data.command);
        if (/\b(test|tests|smoke|lint|typecheck|tsc|build|check|doctor|pytest|vitest|jest|bun test|npm run)\b/i.test(command)) return "Verify";
        if (/\b(git diff|git status|git log|rg|grep|find|ls|sed|cat|head|tail)\b/i.test(command)) return "Explore";
        return "Verify";
    }
    return "Tools";
}
function sisoToolPhaseStats(name, args, result, statusKind) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const data = args && typeof args === "object" ? args : {};
    if (tool === "read" || tool === "ls" || tool === "find" || tool === "grep") return "1 lookup";
    if (tool === "write") return "1 file";
    if (tool === "edit") {
        const oldText = data.old_string ?? data.oldText ?? "";
        const newText = data.new_string ?? data.newText ?? "";
        const delta = sisoCountLines(newText) - sisoCountLines(oldText);
        return oldText || newText ? (delta >= 0 ? "+" : "") + delta + " lines" : "1 edit";
    }
    if (tool === "bash") {
        const command = sisoSingleLine(data.command);
        if (/\bnpm run\s+([^\s;&|]+)/.test(command)) return "npm " + command.match(/\bnpm run\s+([^\s;&|]+)/)?.[1];
        if (/\b(git status|git diff)\b/.test(command)) return RegExp.lastMatch;
        if (/\b(rg|grep|find)\b/.test(command)) return "search";
        if (/\b(test|tests|smoke|lint|typecheck|tsc|build|check|doctor)\b/i.test(command)) return "check";
        return "command";
    }
    if (tool === "siso" || tool.includes("spawn") || tool.includes("agent") || tool.includes("subagent")) {
        const action = String(data.action ?? data.domain ?? tool).toLowerCase();
        const childStatus = result?.details?.child_status ?? result?.details?.status ?? statusKind;
        if (action === "spawn" || tool.includes("spawn")) return "agent " + childStatus;
        if (action === "council") return "council";
        if (action === "workflow" || action === "orchestrate") return "workflow";
        if (action === "child") return "child " + childStatus;
        return "agent";
    }
    return statusKind;
}
function sisoToolAggregateFacet(name, args) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const data = args && typeof args === "object" ? args : {};
    if (tool === "read") return ["read", "file"];
    if (tool === "grep") return ["searched", "pattern"];
    if (tool === "find") return ["searched", "pattern"];
    if (tool === "ls") return ["listed", "dir"];
    if (tool === "write") return ["wrote", "file"];
    if (tool === "edit") return ["edited", "file"];
    if (tool === "bash") {
        const command = sisoSingleLine(data.command);
        if (/\b(rg|grep|find)\b/.test(command)) return ["searched", "pattern"];
        if (/\b(test|tests|smoke|lint|typecheck|tsc|build|check|doctor|pytest|vitest|jest|bun test|npm run)\b/i.test(command)) return ["ran", "check"];
        return ["ran", "command"];
    }
    if (tool === "siso" || tool.includes("spawn") || tool.includes("agent") || tool.includes("subagent")) return ["delegated", "agent"];
    return ["used", "tool"];
}
`;
