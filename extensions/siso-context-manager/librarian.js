import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
export function librarianPolicyFromEnv(env = process.env) {
    return {
        semanticEnabled: env.SISO_CONTEXT_SEMANTIC_LIBRARIAN !== "0",
        turnsThreshold: Number.parseInt(env.SISO_CONTEXT_LIBRARIAN_TURNS ?? "4", 10),
        tokenThreshold: Number.parseInt(env.SISO_CONTEXT_LIBRARIAN_TOKENS ?? "25000", 10),
        pendingThreshold: Number.parseInt(env.SISO_CONTEXT_DISTILL_PENDING_EVENTS ?? "24", 10),
        largeFilterThreshold: Number.parseInt(env.SISO_CONTEXT_LIBRARIAN_LARGE_FILTERS ?? "1", 10),
    };
}
function finitePositive(value) {
    return Number.isFinite(value) && value > 0;
}
export function chooseLibrarianRun(state, pendingEvents, policy, reason = "threshold") {
    if (pendingEvents.length === 0)
        return undefined;
    if (reason === "manual" || reason === "pre_codex" || reason === "boundary")
        return { shouldRun: true, mode: policy.semanticEnabled ? "semantic" : "local", reason };
    if (finitePositive(policy.pendingThreshold) && pendingEvents.length >= policy.pendingThreshold)
        return { shouldRun: true, mode: policy.semanticEnabled ? "semantic" : "local", reason: "threshold" };
    if (policy.semanticEnabled && finitePositive(policy.turnsThreshold) && state.turnsSinceSemantic >= policy.turnsThreshold)
        return { shouldRun: true, mode: "semantic", reason: "turns" };
    if (policy.semanticEnabled && finitePositive(policy.tokenThreshold) && state.tokensSinceSemantic >= policy.tokenThreshold)
        return { shouldRun: true, mode: "semantic", reason: "tokens" };
    if (policy.semanticEnabled && finitePositive(policy.largeFilterThreshold) && state.largeFiltersSinceSemantic >= policy.largeFilterThreshold)
        return { shouldRun: true, mode: "semantic", reason: "large_filter" };
    return undefined;
}
export function updateLibrarianStateAfterRun(state, result, mode, reason) {
    if (mode === "semantic") {
        state.semanticRuns += 1;
        state.turnsSinceSemantic = 0;
        state.tokensSinceSemantic = 0;
        state.largeFiltersSinceSemantic = 0;
    }
    else {
        state.localRuns += 1;
    }
    state.lastRun = new Date().toISOString();
    state.lastMode = mode;
    state.lastReason = reason;
    state.lastSavedTokens = result.inputTokens;
}
export function renderLibrarianStatus(result, mode, reason) {
    return `librarian · ${mode} · distilled ${result.sourceIds.length} events · saved ~${result.inputTokens} tokens · reason=${reason}`;
}
export function buildCodexCasePacket(args) {
    const maxChars = args.maxChars ?? 12000;
    const byCategory = new Map();
    for (const memory of [...args.memories].sort((a, b) => b.importance - a.importance).slice(0, 80)) {
        const list = byCategory.get(memory.category) ?? [];
        list.push(memory);
        byCategory.set(memory.category, list);
    }
    const sections = [
        `# Codex Case Packet`,
        `## Current task\n${args.task.trim() || "Unknown current task."}`,
    ];
    for (const category of ["task_context", "project_context", "preference", "working_rule", "routing_rule", "skill_rule", "decision", "fact", "error", "file", "next_action", "open_question", "retrieval_pointer", "summary"]) {
        const rows = (byCategory.get(category) ?? []).slice(0, 10);
        if (rows.length === 0)
            continue;
        sections.push(`## ${category}\n${rows.map((row) => `- ${row.text}`).join("\n")}`);
    }
    const recent = (args.recentEvents ?? []).slice(-8).map((event) => [event.toolName, event.text].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 500)).filter(Boolean);
    if (recent.length)
        sections.push(`## Recent small context\n${recent.map((line) => `- ${line}`).join("\n")}`);
    sections.push("## Rule\nUse this packet instead of full transcript replay. Retrieve cold artifacts only when needed.");
    return sections.join("\n\n").slice(0, maxChars);
}
export function appendLibrarianLog(root, line) {
    const path = join(root, "librarian", "events.log");
    mkdirSync(join(path, ".."), { recursive: true });
    appendFileSync(path, `${new Date().toISOString()} ${line}\n`);
}
