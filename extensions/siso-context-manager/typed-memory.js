import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appendJsonl, defaultRoot, ensureStore, newId, readJsonl } from "./store.js";
function centralMemoryPath(root = defaultRoot()) {
    return join(ensureStore(root).root, "central-memory.jsonl");
}
function normalizeKey(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "memory";
}
function projectKey(cwd) {
    return normalizeKey(cwd.replace(/^\/Users\/[^/]+\//, ""));
}
export function typedMemoryFromItem(item, agent = "pi-codex") {
    const type = typeForItem(item);
    if (!type)
        return undefined;
    const key = [type, normalizeKey(item.text.slice(0, 120))].join(":");
    return {
        id: newId("tm"),
        type,
        projectKey: projectKey(item.cwd),
        agent,
        runId: item.runId,
        ts: item.ts,
        content: item.text,
        key,
        status: type === "status" ? "active" : undefined,
        confidence: item.confidence,
        importance: item.importance,
        sourceIds: item.sourceIds,
        corroboratedBy: [],
        conflictsWith: [],
    };
}
function typeForItem(item) {
    if (item.category === "decision")
        return /\b(wrong|avoid|never|failed|root cause)\b/i.test(item.text) ? "caveat" : "decision";
    if (item.category === "preference" || item.category === "fact" || item.category === "file")
        return "fact";
    if (item.category === "error")
        return "error_fix";
    if (item.category === "next_action" || item.category === "open_question")
        return "status";
    if (item.category === "summary" && item.importance >= 0.8)
        return "handoff";
    return undefined;
}
export function readCentralMemory(root = defaultRoot()) {
    return readJsonl(centralMemoryPath(root));
}
function isConflict(a, b) {
    if (a.type !== b.type)
        return false;
    const at = a.content.toLowerCase();
    const bt = b.content.toLowerCase();
    return (at.includes(" use ") && bt.includes(" never use "))
        || (at.includes(" always ") && bt.includes(" never "))
        || (at.includes(" enabled") && bt.includes(" disabled"));
}
export function promoteTypedMemories(items, options = {}) {
    const root = options.root ?? defaultRoot();
    const existing = readCentralMemory(root);
    const promoted = [];
    for (const item of items) {
        if (!(item.promoted || item.scope === "project" || item.importance >= 0.82))
            continue;
        const typed = typedMemoryFromItem(item, options.agent ?? "pi-codex");
        if (!typed)
            continue;
        const same = existing.find((row) => row.key === typed.key || normalizeKey(row.content.slice(0, 160)) === normalizeKey(typed.content.slice(0, 160)));
        if (same) {
            const merged = {
                ...same,
                id: newId("tm"),
                ts: typed.ts,
                confidence: Math.max(same.confidence, typed.confidence),
                importance: Math.max(same.importance, typed.importance),
                sourceIds: [...new Set([...same.sourceIds, ...typed.sourceIds])],
                corroboratedBy: [...new Set([...same.corroboratedBy, typed.agent])],
            };
            appendJsonl(centralMemoryPath(root), merged);
            existing.push(merged);
            promoted.push(merged);
            continue;
        }
        const conflicts = existing.filter((row) => isConflict(row, typed)).map((row) => row.id);
        const withConflicts = { ...typed, conflictsWith: conflicts };
        appendJsonl(centralMemoryPath(root), withConflicts);
        existing.push(withConflicts);
        promoted.push(withConflicts);
    }
    return promoted;
}
export function formatCentralMemory(rows, limit = 20) {
    if (rows.length === 0)
        return "No central typed memories.";
    return rows.slice(-limit).reverse().map((row) => [
        `${row.type} importance=${row.importance.toFixed(2)} confidence=${row.confidence.toFixed(2)}`,
        `key=${row.key ?? row.id}`,
        row.corroboratedBy.length ? `corroborated_by=${row.corroboratedBy.join(",")}` : undefined,
        row.conflictsWith.length ? `conflicts=${row.conflictsWith.join(",")}` : undefined,
        row.content,
    ].filter(Boolean).join("\n  ")).join("\n");
}
export function centralMemoryStats(root = defaultRoot()) {
    const path = centralMemoryPath(root);
    const rows = readCentralMemory(root);
    const byType = {};
    for (const row of rows)
        byType[row.type] = (byType[row.type] ?? 0) + 1;
    return { memories: rows.length, byType, path, bytes: existsSync(path) ? readFileSync(path).length : 0 };
}
