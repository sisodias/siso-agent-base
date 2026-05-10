import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
export function defaultRoot() {
    return process.env.SISO_CONTEXT_MANAGER_DIR ?? join(homedir(), ".siso", "agent", "context-manager");
}
export function contextPaths(root = defaultRoot()) {
    return {
        root,
        runsDir: join(root, "runs"),
        memoryDir: join(root, "memory"),
        projectMemoryPath: join(root, "project-memory.jsonl"),
    };
}
export function ensureStore(root = defaultRoot()) {
    const paths = contextPaths(root);
    mkdirSync(paths.runsDir, { recursive: true });
    mkdirSync(paths.memoryDir, { recursive: true });
    return paths;
}
export function safeIdPart(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "unknown";
}
export function newId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
export function estimateTokensFromText(text) {
    return Math.ceil(text.length / 4);
}
export function runEventsPath(runId, root = defaultRoot()) {
    return join(ensureStore(root).runsDir, `${safeIdPart(runId)}.jsonl`);
}
export function runMemoryPath(runId, root = defaultRoot()) {
    return join(ensureStore(root).memoryDir, `${safeIdPart(runId)}.jsonl`);
}
export function appendJsonl(path, row) {
    mkdirSync(join(path, ".."), { recursive: true });
    appendFileSync(path, `${JSON.stringify(row)}\n`);
}
export function appendContextEvent(event, root = defaultRoot()) {
    appendJsonl(runEventsPath(event.runId, root), event);
}
export function appendMemoryItems(runId, items, root = defaultRoot()) {
    if (items.length === 0)
        return;
    const path = runMemoryPath(runId, root);
    for (const item of items)
        appendJsonl(path, item);
}
export function appendProjectMemory(items, root = defaultRoot()) {
    const promoted = items.filter((item) => item.scope === "project" || item.promoted);
    if (promoted.length === 0)
        return;
    const path = ensureStore(root).projectMemoryPath;
    for (const item of promoted)
        appendJsonl(path, { ...item, scope: "project", promoted: true });
}
export function readJsonl(path) {
    if (!existsSync(path))
        return [];
    return readFileSync(path, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}
export function readRunEvents(runId, root = defaultRoot()) {
    return readJsonl(runEventsPath(runId, root));
}
export function readRunMemory(runId, root = defaultRoot()) {
    return readJsonl(runMemoryPath(runId, root));
}
export function latestRunIds(limit = 10, root = defaultRoot()) {
    const dir = ensureStore(root).runsDir;
    return readdirSync(dir)
        .filter((name) => name.endsWith(".jsonl"))
        .map((name) => join(dir, name))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
        .slice(0, limit)
        .map((path) => basename(path, ".jsonl"));
}
export function storeStats(root = defaultRoot()) {
    const paths = ensureStore(root);
    const runFiles = readdirSync(paths.runsDir).filter((name) => name.endsWith(".jsonl"));
    const memoryFiles = readdirSync(paths.memoryDir).filter((name) => name.endsWith(".jsonl"));
    const eventBytes = runFiles.reduce((sum, name) => sum + statSync(join(paths.runsDir, name)).size, 0);
    const memoryBytes = memoryFiles.reduce((sum, name) => sum + statSync(join(paths.memoryDir, name)).size, 0) + (existsSync(paths.projectMemoryPath) ? statSync(paths.projectMemoryPath).size : 0);
    const memories = memoryFiles.reduce((sum, name) => sum + readJsonl(join(paths.memoryDir, name)).length, 0);
    const projectMemories = readJsonl(paths.projectMemoryPath).length;
    return { runs: runFiles.length, memories, projectMemories, eventBytes, memoryBytes, root: paths.root };
}
export function writeSnapshot(path, value) {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, JSON.stringify(value, null, 2));
}
