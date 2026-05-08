const ORCHESTRATION_ACTIONS = new Set(["spawn", "council", "workflow", "workflow/orchestrate", "orchestrate"]);
export function isPiSubagentChild(env = process.env) {
    return env.PI_SUBAGENT_CHILD === "1" || env.SISO_SPAWN_CHILD === "1";
}
function text(value) {
    return typeof value === "string" ? value : undefined;
}
function addTextMatches(value, matches) {
    if (!value)
        return;
    if (/\bsiso(?:\s+action=|\s+)(spawn|council|workflow|orchestrate)\b/i.test(value) || /\bsiso_(spawn|council|workflow)\b/i.test(value)) {
        matches.push({ kind: "siso-orchestration", value: "prompt" });
    }
    if (/\btmux\b[\s\S]{0,80}\b(team|orchestrat|worker|agent|pane|session)/i.test(value) || /\b(team|orchestrat|worker|agent)\b[\s\S]{0,80}\btmux\b/i.test(value)) {
        matches.push({ kind: "tmux-team-orchestration", value: "prompt" });
    }
    if (/\bteam(?:create|run|start|spawn)?\b/i.test(value) && /\b(orchestrat|spawn|workers?|agents?)\b/i.test(value)) {
        matches.push({ kind: "tmux-team-orchestration", value: "prompt" });
    }
    if (/\b(child\s+resume|resume\s+(the\s+)?child|action=resume|siso_child)\b/i.test(value)) {
        matches.push({ kind: "child-resume", value: "prompt" });
    }
}
function reasonFor(matches) {
    if (matches.some((match) => match.kind === "siso-orchestration")) {
        return "worker_guard blocked recursive SISO orchestration from Pi child context";
    }
    if (matches.some((match) => match.kind === "child-resume")) {
        return "worker_guard blocked child resume from Pi child context";
    }
    if (matches.some((match) => match.kind === "tmux-team-orchestration")) {
        return "worker_guard blocked tmux/team orchestration from Pi child context";
    }
    return undefined;
}
export function evaluatePiChildGuardrail(input) {
    const env = input.env ?? process.env;
    const matches = [];
    if (!isPiSubagentChild(env))
        return { allowed: true, matches };
    const toolName = input.toolName ?? "";
    const params = input.params ?? {};
    const action = text(params.action) ?? text(params.domain) ?? "";
    const op = text(params.op) ?? text(params.action);
    if ((toolName === "siso" && ORCHESTRATION_ACTIONS.has(action.toLowerCase())) || /^siso_(spawn|council|workflow)$/.test(toolName)) {
        matches.push({ kind: "siso-orchestration", value: action || toolName });
    }
    if ((toolName === "siso" && action.toLowerCase() === "child" && op?.toLowerCase() === "resume") || (toolName === "siso_child" && op?.toLowerCase() === "resume")) {
        matches.push({ kind: "child-resume", value: op ?? toolName });
    }
    addTextMatches(input.prompt, matches);
    addTextMatches(text(params.command), matches);
    addTextMatches(text(params.task), matches);
    addTextMatches(text(params.message), matches);
    const reason = reasonFor(matches);
    if (reason)
        return { allowed: false, reason, matches };
    return { allowed: true, matches };
}
