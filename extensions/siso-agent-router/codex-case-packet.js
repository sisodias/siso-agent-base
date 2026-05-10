import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
function defaultContextRoot() {
    return process.env.SISO_CONTEXT_MANAGER_DIR ?? join(homedir(), ".siso", "agent", "context-manager");
}
function readJsonl(path) {
    if (!existsSync(path))
        return [];
    return readFileSync(path, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}
function latestJsonlId(dir) {
    if (!existsSync(dir))
        return undefined;
    const files = readdirSync(dir)
        .filter((name) => name.endsWith(".jsonl"))
        .map((name) => ({ name, path: join(dir, name), mtime: statSync(join(dir, name)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
    return files[0]?.name.replace(/\.jsonl$/, "");
}
function compactLine(text, limit) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length <= limit ? cleaned : `${cleaned.slice(0, limit - 3)}...`;
}
function isReplaySludge(memory) {
    const text = String(memory.text ?? "");
    if (/type.?:(message_end|toolResult)|toolCallId|content\s*:\s*\[|"type"\s*:\s*"(message_end|turn_end)"|"role"\s*:\s*"/i.test(text))
        return true;
    if (text.length > 900 && /\b(role|content|toolName|toolCallId|message|messages|toolCall)\b/i.test(text))
        return true;
    return false;
}
function groupMemories(memories) {
    const grouped = new Map();
    for (const memory of memories
        .filter((item) => typeof item.text === "string" && item.text.trim() && !isReplaySludge(item))
        .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
        .slice(0, 80)) {
        const category = memory.category ?? "fact";
        const rows = grouped.get(category) ?? [];
        rows.push(memory);
        grouped.set(category, rows);
    }
    return grouped;
}
export function formatCodexCasePacket(args) {
    const maxChars = args.maxChars ?? Number.parseInt(process.env.SISO_CODEX_CASE_PACKET_MAX_CHARS ?? "12000", 10);
    const grouped = groupMemories(args.memories ?? []);
    const sections = [
        "# Codex Case Packet",
        "Purpose: give Codex distilled context only; raw logs/tool outputs stay cold and are retrieved explicitly if needed.",
        `## Current task\n${compactLine(args.task || "Unknown task", 1200)}`,
    ];
    for (const category of ["task_context", "project_context", "preference", "working_rule", "routing_rule", "skill_rule", "fact", "error", "file", "retrieval_pointer", "summary", "decision"]) {
        const rowLimit = category === "decision" || category === "summary" || category === "error" ? 3 : 8;
        const rows = (grouped.get(category) ?? []).slice(0, rowLimit);
        if (!rows.length)
            continue;
        sections.push(`## ${category}\n${rows.map((row) => `- ${compactLine(row.text ?? "", 700)}`).join("\n")}`);
    }
    const recent = (args.recentEvents ?? [])
        .filter((event) => (event.estimatedTokens ?? 0) <= 1000 && !isReplaySludge({ text: event.text, category: event.eventName }))
        .slice(-10)
        .map((event) => compactLine([event.toolName, event.text].filter(Boolean).join(" "), 500))
        .filter(Boolean);
    if (recent.length)
        sections.push(`## Recent small signals\n${recent.map((line) => `- ${line}`).join("\n")}`);
    sections.push("## Retrieval rule\nDo not ask for or replay full transcripts, node_modules, sourcemaps, .git, raw JSONL, or giant grep/find outputs. Request narrow files or retrieval pointers only when required.");
    return sections.join("\n\n").slice(0, Number.isFinite(maxChars) && maxChars > 0 ? maxChars : 12000);
}
export function loadCodexCasePacket(task, options = {}) {
    const root = options.root ?? defaultContextRoot();
    const runId = options.runId ?? process.env.SISO_CONTEXT_RUN_ID ?? latestJsonlId(join(root, "runs"));
    if (!runId)
        return undefined;
    const memories = readJsonl(join(root, "memory", `${runId}.jsonl`));
    const projectMemories = readJsonl(join(root, "project-memory.jsonl")).slice(-40);
    const events = readJsonl(join(root, "runs", `${runId}.jsonl`)).slice(-20);
    if (memories.length === 0 && projectMemories.length === 0 && events.length === 0)
        return undefined;
    return formatCodexCasePacket({ task, memories: [...projectMemories, ...memories], recentEvents: events, maxChars: options.maxChars });
}
