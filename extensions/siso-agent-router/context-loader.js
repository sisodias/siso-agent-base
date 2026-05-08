import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
const STOP_DIR = "/";
const DEFAULT_CAPS = {
    globalRules: 1_000,
    globalLessons: 600,
    memoryIndex: 800,
    projectRules: 800,
    lessons: 500,
    sisoWiki: 400,
};
function findUp(cwd, names) {
    let current = resolve(cwd);
    while (current !== STOP_DIR) {
        for (const name of names) {
            const candidate = join(current, name);
            if (existsSync(candidate))
                return candidate;
        }
        const next = dirname(current);
        if (next === current)
            break;
        current = next;
    }
    return undefined;
}
function projectRoot(cwd) {
    return dirname(findUp(cwd, ["package.json", ".git", "AGENTS.md", "CLAUDE.md"]) ?? resolve(cwd, "x"));
}
function firstMetadataValue(text, key) {
    const prefix = `${key}:`;
    const line = text.split(/\r?\n/, 24).find((item) => item.startsWith(prefix));
    const value = line?.slice(prefix.length).trim();
    return value || undefined;
}
function envInt(name, fallback) {
    const value = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
}
function capFor(name) {
    const envName = `SISO_CONTEXT_${name.replace(/[A-Z]/g, (char) => `_${char}`).toUpperCase()}_CHARS`;
    return envInt(envName, DEFAULT_CAPS[name]);
}
function snippet(path, maxChars) {
    if (!path || maxChars <= 0 || !existsSync(path))
        return undefined;
    try {
        const text = readFileSync(path, "utf8").slice(0, maxChars);
        return { file: path, chars: text.length, text };
    }
    catch {
        return undefined;
    }
}
function safeProjectSlug(root) {
    return resolve(root).replace(/[^A-Za-z0-9._-]/g, "-");
}
function memoryIndexPath(root) {
    const home = homedir();
    const candidates = [
        process.env.SISO_MEMORY_INDEX_PATH ?? "",
        join(home, ".claude", "projects", safeProjectSlug(root), "memory", "MEMORY.md"),
        join(home, ".claude", "projects", safeProjectSlug(dirname(root)), "memory", "MEMORY.md"),
        join(home, ".claude", "projects", "-Users-shaansisodia-SISO-Workspace", "memory", "MEMORY.md"),
    ];
    return candidates.find((candidate) => existsSync(candidate));
}
function globalRulesPath() {
    const candidate = process.env.SISO_GLOBAL_CLAUDE_MD ?? join(homedir(), ".claude", "CLAUDE.md");
    return existsSync(candidate) ? candidate : undefined;
}
function globalLessonsPath() {
    const candidate = process.env.SISO_GLOBAL_LESSONS_INDEX ?? join(homedir(), ".claude", "lessons", "INDEX.md");
    return existsSync(candidate) ? candidate : undefined;
}
function latestCheckpoint(root) {
    const dir = join(root, ".pi", "session-context");
    let files;
    try {
        files = readdirSync(dir)
            .filter((name) => name.endsWith(".md"))
            .map((name) => join(dir, name))
            .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    }
    catch {
        return undefined;
    }
    const latest = files[0];
    if (!latest)
        return undefined;
    let text = "";
    try {
        text = readFileSync(latest, "utf8");
    }
    catch {
        return { file: latest };
    }
    return {
        file: latest,
        ...(firstMetadataValue(text, "Reason") ? { reason: firstMetadataValue(text, "Reason") } : {}),
        ...(firstMetadataValue(text, "Timestamp") ? { timestamp: firstMetadataValue(text, "Timestamp") } : {}),
    };
}
export function loadContextPacket(cwd = process.cwd()) {
    const root = projectRoot(cwd);
    const sisoWiki = findUp(cwd, [".siso-wiki/index.md"]);
    const projectRules = findUp(cwd, ["CLAUDE.md", "AGENTS.md"]);
    const lessons = existsSync(join(root, "tasks", "lessons.md")) ? join(root, "tasks", "lessons.md") : undefined;
    return {
        projectRoot: root,
        ...(sisoWiki ? { sisoWiki } : {}),
        ...(projectRules ? { projectRules } : {}),
        ...(lessons ? { lessons } : {}),
        ...(snippet(globalRulesPath(), capFor("globalRules")) ? { globalRules: snippet(globalRulesPath(), capFor("globalRules")) } : {}),
        ...(snippet(globalLessonsPath(), capFor("globalLessons")) ? { globalLessons: snippet(globalLessonsPath(), capFor("globalLessons")) } : {}),
        ...(snippet(memoryIndexPath(root), capFor("memoryIndex")) ? { memoryIndex: snippet(memoryIndexPath(root), capFor("memoryIndex")) } : {}),
        ...(snippet(projectRules, capFor("projectRules")) ? { projectRulesSnippet: snippet(projectRules, capFor("projectRules")) } : {}),
        ...(snippet(lessons, capFor("lessons")) ? { lessonsSnippet: snippet(lessons, capFor("lessons")) } : {}),
        ...(snippet(sisoWiki, capFor("sisoWiki")) ? { sisoWikiSnippet: snippet(sisoWiki, capFor("sisoWiki")) } : {}),
        ...(latestCheckpoint(root) ? { latestCheckpoint: latestCheckpoint(root) } : {}),
    };
}
function formatSnippet(label, snippetValue) {
    if (!snippetValue)
        return [`${label}=none`];
    return [
        `${label}=${snippetValue.file} chars=${snippetValue.chars}`,
        `--- ${label} excerpt ---`,
        snippetValue.text.trim(),
        `--- end ${label} ---`,
    ];
}
export function formatContextPacket(packet) {
    return [
        "Context packet:",
        `PROJECT_ROOT=${packet.projectRoot}`,
        `siso_wiki=${packet.sisoWiki ?? "none"}`,
        `project_rules=${packet.projectRules ?? "none"}`,
        `lessons=${packet.lessons ?? "none"}`,
        ...formatSnippet("global_rules", packet.globalRules),
        ...formatSnippet("global_lessons", packet.globalLessons),
        ...formatSnippet("memory_index", packet.memoryIndex),
        ...formatSnippet("project_rules", packet.projectRulesSnippet),
        ...formatSnippet("project_lessons", packet.lessonsSnippet),
        ...formatSnippet("siso_wiki_index", packet.sisoWikiSnippet),
        packet.latestCheckpoint
            ? `latest_checkpoint=${basename(packet.latestCheckpoint.file)} reason=${packet.latestCheckpoint.reason ?? "unknown"} timestamp=${packet.latestCheckpoint.timestamp ?? "unknown"} path=${packet.latestCheckpoint.file}`
            : "latest_checkpoint=none",
    ].join("\n");
}
