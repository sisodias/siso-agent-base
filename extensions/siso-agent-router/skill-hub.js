import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
const DEFAULT_ROOTS = [
    "~/.siso/agent/profile/skills",
    "~/.claude/skills",
    "~/.agents/skills",
    "~/.codex/skills",
    "~/.codex/superpowers/skills",
    "~/SISO_Workspace/.agents/skills",
];
const CORE_SKILL_NAMES = new Set([
    "ai-slop-cleaner",
    "async-codex-review",
    "capability-router",
    "codex:rescue",
    "codex:setup",
    "convex-feature",
    "dispatch",
    "gh-cli",
    "gitsearch",
    "graphify",
    "impeccable",
    "iso",
    "opencli",
    "pi-fleet",
    "playwright-cli",
    "reflect",
    "run-spark",
    "session-checkpoint",
    "siso-codex",
    "siso-graph",
    "siso-lsp",
    "siso-routing",
    "sourcegraph",
    "systemdb-query",
    "websearch",
]);
const SOURCE_SCORE = {
    workspace: 90,
    claude: 80,
    agents: 70,
    superpowers: 55,
    codex: 45,
};
let catalogCache;
const stats = {
    catalogScans: 0,
    catalogCacheHits: 0,
};
function expandHome(path) {
    return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}
function skillRoots() {
    const envRoots = process.env.SISO_SKILL_ROOTS?.split(":").map((root) => root.trim()).filter(Boolean);
    return (envRoots?.length ? envRoots : DEFAULT_ROOTS).map((root) => resolve(expandHome(root)));
}
function projectSkillRoots(cwd) {
    if (!cwd)
        return [];
    return [".claude/skills", ".pi/skills", ".omc/skills"]
        .map((suffix) => resolve(cwd, suffix));
}
function inferSource(root) {
    if (root.includes("/.siso/agent/profile/skills") || root.includes("/templates/profile/skills"))
        return "siso-profile";
    if (root.includes("/SISO_Workspace/"))
        return "workspace";
    if (root.includes("/.claude/"))
        return "claude";
    if (root.includes("/.agents/"))
        return "agents";
    if (root.includes("/.codex/superpowers/"))
        return "superpowers";
    if (root.includes("/.codex/"))
        return "codex";
    return basename(dirname(root)) || "unknown";
}
function frontmatterValue(text, key) {
    if (!text.startsWith("---"))
        return undefined;
    const end = text.indexOf("\n---", 3);
    if (end < 0)
        return undefined;
    const body = text.slice(3, end);
    const lines = body.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
        const match = lines[i].match(new RegExp(`^${key}:\\s*(.*?)\\s*$`));
        if (!match)
            continue;
        const value = match[1].trim().replace(/^["']|["']$/g, "");
        if (value === ">" || value === "|") {
            const collected = [];
            for (let j = i + 1; j < lines.length; j += 1) {
                if (/^\S[^:]*:\s*/.test(lines[j]))
                    break;
                collected.push(lines[j].trim());
            }
            return collected.filter(Boolean).join(value === ">" ? " " : "\n").trim();
        }
        return value;
    }
    return undefined;
}
function frontmatterList(text, key) {
    const value = frontmatterValue(text, key);
    if (!value)
        return [];
    return value
        .split(/[,\n]/)
        .map((item) => item.trim().replace(/^-\s*/, ""))
        .filter(Boolean);
}
function firstUsefulLine(text) {
    const withoutFrontmatter = text.startsWith("---")
        ? text.slice(Math.max(text.indexOf("\n---", 3) + 4, 0))
        : text;
    const line = withoutFrontmatter
        .split(/\r?\n/)
        .map((part) => part.trim().replace(/^#+\s*/, ""))
        .find((part) => part.length > 0 && !part.startsWith("<"));
    return line ?? "";
}
function headingOutline(text) {
    return text.split(/\r?\n/).flatMap((line, index) => {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        return match ? [{ level: match[1].length, text: match[2].trim(), line: index + 1 }] : [];
    });
}
function skillId(source, name, path) {
    const suffix = basename(dirname(path));
    return `${source}:${name || suffix}`;
}
function readSkill(filePath, root) {
    const text = readFileSync(filePath, "utf8");
    const folderName = basename(dirname(filePath));
    const name = frontmatterValue(text, "name") ?? folderName;
    const description = frontmatterValue(text, "description") ?? firstUsefulLine(text);
    const source = inferSource(root);
    return {
        skillId: skillId(source, name, filePath),
        name,
        source,
        path: filePath,
        description: description.slice(0, 240),
        triggers: frontmatterList(text, "triggers"),
        hasFrontmatter: text.startsWith("---"),
        headings: headingOutline(text),
    };
}
function scanRoot(root, maxDepth = 4) {
    if (!existsSync(root))
        return [];
    const entries = [];
    const walk = (dir, depth) => {
        if (depth > maxDepth)
            return;
        const skillPath = join(dir, "SKILL.md");
        if (existsSync(skillPath)) {
            entries.push(readSkill(skillPath, root));
            return;
        }
        for (const child of readdirSync(dir, { withFileTypes: true })) {
            if (!child.isDirectory())
                continue;
            if ([".git", "node_modules", "dist", "cache"].includes(child.name))
                continue;
            walk(join(dir, child.name), depth + 1);
        }
    };
    walk(root, 0);
    return entries;
}
function statFingerprint(path) {
    try {
        const stat = statSync(path);
        return `${path}:${stat.mtimeMs}:${stat.size}`;
    }
    catch {
        return `${path}:missing`;
    }
}
function skillCacheTtlMs() {
    const parsed = Number.parseInt(process.env.SISO_SKILL_CACHE_TTL_MS ?? "30000", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30000;
}
function catalogForQuery(query = {}) {
    const roots = [...projectSkillRoots(query.cwd), ...skillRoots()];
    const cacheKey = `${roots.join("\0")}\n${roots.map(statFingerprint).join("\0")}`;
    const ttlMs = skillCacheTtlMs();
    if (process.env.SISO_SKILL_CACHE !== "0" && catalogCache?.key === cacheKey && Date.now() < catalogCache.expiresAt) {
        stats.catalogCacheHits += 1;
        return catalogCache.entries;
    }
    stats.catalogScans += 1;
    const entries = roots.flatMap((root) => scanRoot(root));
    if (process.env.SISO_SKILL_CACHE !== "0") {
        catalogCache = { key: cacheKey, entries, expiresAt: Date.now() + ttlMs };
    }
    return entries;
}
export function getSkillCatalog(query = {}) {
    return catalogForQuery(query);
}
export function clearSkillHubCache() {
    catalogCache = undefined;
}
export function clearSkillHubStats() {
    stats.catalogScans = 0;
    stats.catalogCacheHits = 0;
}
export function skillHubStats() {
    return { ...stats };
}
function skillRank(entry, needle) {
    const name = entry.name.toLowerCase();
    const id = entry.skillId.toLowerCase();
    const query = needle?.trim().toLowerCase();
    let score = SOURCE_SCORE[entry.source] ?? 10;
    if (CORE_SKILL_NAMES.has(name) || name.startsWith("siso-") || name.startsWith("token-optimizer:"))
        score += 300;
    if (name.startsWith("superpowers:"))
        score += 150;
    if (!query)
        return score;
    if (name === query || id === query)
        score += 500;
    else if (name.endsWith(`:${query}`) || id.endsWith(`:${query}`))
        score += 420;
    else if (name.startsWith(query))
        score += 260;
    else if (name.includes(query))
        score += 180;
    else if (entry.triggers.some((trigger) => trigger.toLowerCase().includes(query)))
        score += 160;
    else if (entry.description.toLowerCase().includes(query))
        score += 80;
    else if (entry.path.toLowerCase().includes(query))
        score += 30;
    return score;
}
export function querySkillHub(query = {}) {
    const all = catalogForQuery(query);
    const op = query.op ?? (query.query ? "search" : "list");
    const needle = (op === "route" ? query.query : query.query)?.trim().toLowerCase();
    const source = query.source?.trim().toLowerCase();
    const filtered = all
        .filter((entry) => !query.skillId || entry.skillId === query.skillId || entry.name === query.skillId)
        .filter((entry) => !source || entry.source.toLowerCase() === source)
        .filter((entry) => !needle || [
        entry.skillId,
        entry.name,
        entry.source,
        entry.path,
        entry.description,
        ...entry.triggers,
        ...entry.headings.map((heading) => heading.text),
    ].join("\n").toLowerCase().includes(needle))
        .sort((a, b) => {
        const rank = skillRank(b, needle) - skillRank(a, needle);
        return rank || a.name.localeCompare(b.name);
    });
    const limit = Math.max(1, Math.min(typeof query.limit === "number" ? Math.floor(query.limit) : 20, 100));
    const entries = filtered.slice(0, limit);
    const selected = query.skillId ? filtered[0] : op === "info" || op === "load_body" ? entries[0] : undefined;
    const body = selected && (op === "info" || op === "load_body")
        ? readSkillBody(selected.path, {
            section: query.section,
            maxChars: typeof query.maxChars === "number" ? query.maxChars : op === "info" ? 800 : 4000,
        })
        : undefined;
    return {
        op,
        total: all.length,
        returned: entries.length,
        entries,
        ...(body !== undefined ? { body } : {}),
    };
}
function readSkillBody(path, options) {
    const text = readFileSync(path, "utf8");
    const section = options.section?.trim().toLowerCase();
    const source = section ? extractSection(text, section) : text;
    return source.slice(0, Math.max(200, Math.min(options.maxChars, 12000)));
}
function extractSection(text, section) {
    const lines = text.split(/\r?\n/);
    let start = -1;
    let level = 0;
    for (let i = 0; i < lines.length; i += 1) {
        const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
        if (match && match[2].trim().toLowerCase().includes(section)) {
            start = i;
            level = match[1].length;
            break;
        }
    }
    if (start < 0)
        return text;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
        const match = lines[i].match(/^(#{1,6})\s+/);
        if (match && match[1].length <= level) {
            end = i;
            break;
        }
    }
    return lines.slice(start, end).join("\n");
}
export function formatSkillHubResult(result) {
    if (result.entries.length === 0) {
        return `No SISO skills matched.\ntotal=${result.total}`;
    }
    const compact = (result.op === "list" || result.op === "search" || !result.body) && process.env.SISO_SKILL_OUTPUT_MODE !== "full";
    if (compact) {
        return [
            `returned=${result.returned}`,
            `total=${result.total}`,
            ...result.entries.map((entry) => [
                `id=${entry.skillId}`,
                `name=${entry.name}`,
                `source=${entry.source}`,
                `summary=${JSON.stringify(entry.description.slice(0, 120))}`,
            ].join(" ")),
        ].join("\n");
    }
    return [
        `returned=${result.returned}`,
        `total=${result.total}`,
        ...result.entries.map((entry) => [
            `id=${entry.skillId}`,
            `name=${entry.name}`,
            `source=${entry.source}`,
            `description=${JSON.stringify(entry.description)}`,
            `headings=${entry.headings.slice(0, 5).map((heading) => `${heading.line}:${heading.text}`).join("|") || "none"}`,
            `path=${entry.path}`,
        ].join(" ")),
        ...(result.body ? [`body_preview=${JSON.stringify(result.body)}`] : []),
    ].join("\n");
}
