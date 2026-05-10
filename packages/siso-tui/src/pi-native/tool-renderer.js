import { toolPhaseHelpersSource } from "./tool-phase-helpers.js";

export const toolHelpersSource = `import { theme } from "../theme/theme.js";
function sisoSingleLine(value) {
    return String(value ?? "").replace(/\\s+/g, " ").trim();
}
function sisoShortPath(value) {
    const path = String(value ?? "").replaceAll("\\\\", "/");
    const parts = path.split("/").filter(Boolean);
    return parts.length <= 3 ? path : \`…/\${parts.slice(-3).join("/")}\`;
}
function sisoCountLines(value) {
    const text = String(value ?? "");
    return text ? text.split(/\\r?\\n/).length : 0;
}
function sisoStatusIcon(kind, phase = 0) {
    if (kind === "error") return theme.fg("error", "●");
    if (kind === "running") {
        const frames = [
            theme.fg("accent", "◐"),
            theme.fg("accent", "◓"),
            theme.fg("warning", "◑"),
            theme.fg("accent", "◒"),
        ];
        return frames[Math.abs(phase) % frames.length];
    }
    if (kind === "queued") return theme.fg("muted", "○");
    return theme.fg("success", "●");
}
function sisoStatusText(text, kind, phase = 0) {
    if (kind === "error") return theme.fg("error", text);
    if (kind === "running") {
        const shimmer = ["working", "working·", "working··", "working···"];
        const label = text === "launching" ? "launching" : shimmer[Math.abs(phase) % shimmer.length];
        return theme.fg("accent", label);
    }
    if (kind === "done") return theme.fg("success", text);
    return theme.fg("muted", text);
}
function sisoToolKind(name) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    if (tool === "bash") return "term";
    if (tool === "read" || tool === "write" || tool === "edit" || tool === "ls" || tool === "find" || tool === "grep") return "file";
    if (tool === "siso") return "agent";
    return "tool";
}
${toolPhaseHelpersSource}
function sisoPadRight(value, width) {
    const text = String(value ?? "");
    return text.length >= width ? text.slice(0, width) : \`\${text}\${" ".repeat(width - text.length)}\`;
}
function sisoToolChip(name) {
    return theme.fg("muted", sisoPadRight(sisoToolKind(name), 5));
}
function sisoErrorReason(name, args, result) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const data = args && typeof args === "object" ? args : {};
    const output = result?.content ? sisoSingleLine(getRenderedTextOutput(result, false)).toLowerCase() : "";
    if (tool === "read" && (output.includes("no such file") || output.includes("not found") || output.includes("enoent"))) return "missing file";
    if (output.includes("permission denied") || output.includes("eacces")) return "permission denied";
    if (output.includes("command not found") || output.includes("not found:")) return "command not found";
    if (output.includes("no such file") || output.includes("enoent")) return "missing file";
    if (output.includes("timed out") || output.includes("timeout")) return "hit timeout";
    if (tool === "grep" || tool === "find") return "no matches";
    if (tool === "bash" && data.command) return "command failed";
    return "error";
}
function sisoBashIntent(command) {
    const cmd = sisoSingleLine(command);
    if (!cmd) return "";
    if (/\\b(agent-deck|tmux)\\b/.test(cmd)) return cmd.replace(/\\s+/g, " ").slice(0, 80);
    if (/\\bgit status\\b/.test(cmd)) return "git status";
    if (/\\brg\\b|\\bgrep\\b/.test(cmd)) return "search workspace";
    if (/\\bfind\\b/.test(cmd)) return "find files";
    if (/\\bls\\b/.test(cmd)) return "list files";
    if (/\\b(sed|cat|head|tail)\\b/.test(cmd)) {
        const match = cmd.match(/(?:^|[;&|]\\s*)(sed|cat|head|tail)\\b\\s+([^;&|]+)/);
        const detail = match?.[2]?.trim().replace(/^-[^\\s]+\\s+/, "");
        return detail ? \`inspect \${sisoShortPath(detail)}\` : "inspect file";
    }
    if (/\\bnpm\\b|\\bpnpm\\b|\\byarn\\b/.test(cmd)) return "run package script";
    return cmd;
}
function sisoCompactToolDisplay(name, args, width = 96) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const data = args && typeof args === "object" ? args : {};
    let suffix = "";
    if (tool === "bash") {
        suffix = \` \${sisoBashIntent(data.command)}\`;
    }
    else if (tool === "read" || tool === "write" || tool === "ls" || tool === "find") suffix = data.path || data.file_path ? \` \${sisoShortPath(data.path ?? data.file_path)}\` : "";
    else if (tool === "edit") {
        const oldText = data.old_string ?? data.oldText ?? "";
        const newText = data.new_string ?? data.newText ?? "";
        const delta = sisoCountLines(newText) - sisoCountLines(oldText);
        suffix = \`\${data.path || data.file_path ? \` \${sisoShortPath(data.path ?? data.file_path)}\` : ""}\${oldText || newText ? \` (\${delta >= 0 ? "+" : ""}\${delta} lines)\` : ""}\`;
    }
    else if (tool.includes("spawn")) suffix = data.task || data.prompt ? \` \${sisoSingleLine(data.task ?? data.prompt)}\` : "";
    else if (tool === "siso") {
        const action = String(data.action ?? data.domain ?? "route").toLowerCase();
        const op = data.op || data.mode ? \` \${data.op ?? data.mode}\` : "";
        const labels = {
            spawn: "agent",
            council: "council",
            workflow: "workflow",
            "workflow/orchestrate": "workflow",
            orchestrate: "workflow",
            child: "agent",
            skill: "skill",
            task: "task",
            repo: "research",
            route: "route",
        };
        const title = labels[action] ?? action;
        const brief = data.task ?? data.query ?? data.title ?? data.id ?? "";
        return sisoSingleLine(\`\${title}\${op}\${brief ? \` · \${brief}\` : ""}\`).slice(0, width);
    }
    else {
        const first = Object.entries(data).find(([, value]) => ["string", "number", "boolean"].includes(typeof value));
        suffix = first ? \` \${first[0]}=\${sisoSingleLine(first[1])}\` : "";
    }
    const text = \`\${tool}\${suffix}\`;
    return text.length > width ? \`\${text.slice(0, width - 1)}…\` : text;
}
function sisoToolGroupTitle(phase, statusKind) {
    const done = {
        Explore: "Explored",
        Modify: "Modified",
        Verify: "Verified",
        Delegate: "Delegated",
        Tools: "Used tools",
    };
    const running = {
        Explore: "Exploring",
        Modify: "Modifying",
        Verify: "Verifying",
        Delegate: "Delegating",
        Tools: "Using tools",
    };
    return statusKind === "running" ? running[phase] ?? phase : done[phase] ?? phase;
}
function sisoToolGroupLine(name, args, phaseLabel, phaseStats, readableStatus, statusKind, phase) {
    const title = sisoToolGroupTitle(phaseLabel, statusKind);
    const header = \`\${sisoStatusIcon(statusKind, phase)} \${theme.fg("accent", "▾ " + title)} \${theme.fg("muted", "·")} \${theme.fg("dim", phaseStats)} \${theme.fg("muted", "·")} \${sisoStatusText(readableStatus, statusKind, phase)}\`;
    const detail = \`  \${theme.fg("muted", "└")} \${sisoToolChip(name)} \${theme.fg("toolTitle", sisoCompactToolDisplay(name, args, 104))}\`;
    const trimLine = (line, width) => line.length > width ? \`\${line.slice(0, width - 1)}…\` : line;
    return \`\${trimLine(header, 220)}\\n\${trimLine(detail, 220)}\`;
}
const sisoToolGroupRegistry = new WeakMap();
function sisoRegisterToolGroupComponent(component) {
    const key = component.ui && typeof component.ui === "object" ? component.ui : globalThis;
    const existing = sisoToolGroupRegistry.get(key) ?? [];
    if (!existing.includes(component)) {
        existing.push(component);
        sisoToolGroupRegistry.set(key, existing);
        sisoRefreshToolGroupPeers(component);
    }
}
function sisoRefreshToolGroupPeers(component) {
    const key = component.ui && typeof component.ui === "object" ? component.ui : globalThis;
    const components = sisoToolGroupRegistry.get(key) ?? [];
    for (const peer of components) {
        if (peer !== component && typeof peer.updateDisplay === "function") peer.updateDisplay();
    }
}
function sisoToolComponentStatusKind(component) {
    if (component.isPartial) return "running";
    if (component.result?.isError) return "error";
    if (component.result) return "done";
    return "queued";
}
function sisoToolGroupStatusKind(members) {
    if (members.some((member) => member.result?.isError)) return "error";
    if (members.some((member) => member.isPartial)) return "running";
    if (members.every((member) => !member.result)) return "queued";
    return "done";
}
function sisoPlural(count, word) {
    return \`\${count} \${word}\${count === 1 ? "" : "s"}\`;
}
function sisoToolGroupSummary(members) {
    const counts = new Map();
    for (const member of members) {
        const [verb, noun] = sisoToolAggregateFacet(member.toolName, member.args);
        const key = \`\${verb} \${noun}\`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const toolLabel = sisoPlural(members.length, "tool");
    const details = [...counts.entries()].map(([key, count]) => {
        const [verb, noun] = key.split(" ");
        return \`\${verb} \${sisoPlural(count, noun)}\`;
    });
    // Smoke marker for the target parent copy shape: tools · read.
    return [toolLabel, ...details.slice(0, 3)].join(" · ");
}
function sisoToolGroupMembers(component) {
    const key = component.ui && typeof component.ui === "object" ? component.ui : globalThis;
    const components = sisoToolGroupRegistry.get(key) ?? [component];
    const index = components.indexOf(component);
    if (index === -1 || component.expanded) return [component];
    const phaseLabel = sisoToolPhase(component.toolName, component.args);
    const members = [component];
    for (let i = index - 1; i >= 0; i -= 1) {
        const candidate = components[i];
        if (candidate.expanded || sisoToolPhase(candidate.toolName, candidate.args) !== phaseLabel) break;
        members.unshift(candidate);
    }
    for (let i = index + 1; i < components.length; i += 1) {
        const candidate = components[i];
        if (candidate.expanded || sisoToolPhase(candidate.toolName, candidate.args) !== phaseLabel) break;
        members.push(candidate);
    }
    return members;
}
function sisoRenderAggregatedToolGroup(component, phase = 0) {
    const members = sisoToolGroupMembers(component);
    if (members.length <= 1) return sisoCompactToolExecution(component.toolName, component.args, component.result, component.isPartial, phase);
    if (members[0] !== component) return null;
    const phaseLabel = sisoToolPhase(component.toolName, component.args);
    const statusKind = sisoToolGroupStatusKind(members);
    const title = sisoToolGroupTitle(phaseLabel, statusKind);
    const summary = sisoToolGroupSummary(members);
    const readableStatus = statusKind === "error" ? "needs attention" : statusKind === "running" ? "working" : statusKind;
    const header = \`\${sisoStatusIcon(statusKind, phase)} \${theme.fg("accent", "▾ " + title)} \${theme.fg("muted", "·")} \${theme.fg("dim", summary)} \${theme.fg("muted", "·")} \${sisoStatusText(readableStatus, statusKind, phase)}\`;
    const trimLine = (line, width) => line.length > width ? \`\${line.slice(0, width - 1)}…\` : line;
    const childLines = members.map((member) => {
        const memberStatus = sisoToolComponentStatusKind(member);
        const prefix = memberStatus === "error" ? "!" : "└";
        return \`  \${theme.fg(memberStatus === "error" ? "error" : "muted", prefix)} \${sisoToolChip(member.toolName)} \${theme.fg("toolTitle", sisoCompactToolDisplay(member.toolName, member.args, 104))}\`;
    });
    return [header, ...childLines].map((line) => trimLine(line, 220)).join("\\n");
}
function sisoCompactToolExecution(name, args, result, isPartial, phase = 0) {
    const data = args && typeof args === "object" ? args : {};
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const statusKind = isPartial ? "running" : result?.isError ? "error" : result ? "done" : "queued";
    const phaseLabel = sisoToolPhase(name, args);
    const phaseStats = sisoToolPhaseStats(name, args, result, statusKind);
    const action = String(data.action ?? data.domain ?? "").toLowerCase();
    const readableStatus = tool === "siso" && action === "spawn"
        ? statusKind === "running" ? "launching" : statusKind === "done" ? "launched" : statusKind
        : tool === "siso" && action === "child"
            ? statusKind === "done" ? "updated" : statusKind
            : statusKind === "error" ? sisoErrorReason(name, args, result)
                : statusKind;
    const expandHint = "";
    return sisoToolGroupLine(name, args, phaseLabel, phaseStats, readableStatus, statusKind, phase) + expandHint;
}
`;
