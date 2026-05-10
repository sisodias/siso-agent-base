import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const DEFAULT_PROJECT_ROOTS = [".siso/agents", ".claude/agents", ".pi/agents"];
const DEFAULT_USER_ROOTS = ["~/.siso/agents", "~/.claude/agents", "~/.pi/agents"];
const DEFAULT_TRUST_MARKER_NAME = ".siso-agent-trusted";
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "cache", ".cache"]);

function expandHome(root) {
    if (!root.startsWith("~/"))
        return root;
    const home = process.env.HOME ?? "";
    return join(home, root.slice(2));
}

function resolveRoot(root, cwd) {
    const expanded = expandHome(root);
    return resolve(cwd, expanded);
}

function splitFrontmatterList(value) {
    if (Array.isArray(value)) {
        return value.flatMap((entry) => splitFrontmatterList(entry));
    }
    if (value == null)
        return [];
    const text = String(value).trim();
    if (!text)
        return [];
    const trimmed = text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1) : text;
    return trimmed
        .split(/[\r\n,]/)
        .map((entry) => entry.trim().replace(/^[-+*]\s*/, "").replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
}

function parseFrontmatterValue(raw, blockLines) {
    const trimmed = raw.trim();
    if (trimmed === "") {
        const list = blockLines
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => line.replace(/^[-+*]\s*/, "").replace(/^['"]|['"]$/g, ""));
        if (list.length > 0 && list.every((line) => line.length > 0))
            return list;
        return blockLines.map((line) => line.trim()).filter(Boolean).join("\n");
    }
    if (trimmed === "|" || trimmed === ">") {
        const parts = blockLines.map((line) => line.replace(/^\s{2,}/, "").trimEnd());
        return trimmed === ">" ? parts.filter(Boolean).join(" ") : parts.join("\n");
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]"))
        return splitFrontmatterList(trimmed);
    return trimmed.replace(/^['"]|['"]$/g, "");
}

function readFrontmatter(text) {
    const normalized = text.replace(/^\uFEFF/, "");
    const lines = normalized.split(/\r?\n/);
    if (lines[0]?.trim() !== "---")
        return { frontmatter: {}, body: normalized, hasFrontmatter: false };
    const frontmatter = {};
    let index = 1;
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === "---") {
            index += 1;
            break;
        }
        if (!line.trim()) {
            index += 1;
            continue;
        }
        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!match) {
            index += 1;
            continue;
        }
        const key = match[1];
        const raw = match[2];
        const blockLines = [];
        if (raw.trim() === "" || raw.trim() === "|" || raw.trim() === ">") {
            index += 1;
            while (index < lines.length) {
                const next = lines[index];
                if (next.trim() === "---")
                    break;
                if (/^[A-Za-z0-9_-]+:\s*/.test(next) && !/^\s/.test(next))
                    break;
                blockLines.push(next);
                index += 1;
            }
        }
        else {
            index += 1;
        }
        frontmatter[key] = parseFrontmatterValue(raw, blockLines);
    }
    return { frontmatter, body: lines.slice(index).join("\n"), hasFrontmatter: true };
}

function normalizeToolToken(token) {
    return String(token ?? "")
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .toLowerCase();
}

function addUnique(list, seen, value) {
    const normalized = normalizeToolToken(value);
    if (!normalized || seen.has(normalized))
        return;
    seen.add(normalized);
    list.push(normalized);
}

export function normalizeToolAcl(input) {
    const allow = [];
    const deny = [];
    const allowSeen = new Set();
    const denySeen = new Set();
    let all = false;
    const source = input && typeof input === "object" && !Array.isArray(input) ? input : undefined;
    const pushTokens = (value, mode = "allow") => {
        for (const token of splitFrontmatterList(value)) {
            const normalized = normalizeToolToken(token);
            if (!normalized)
                continue;
            if (normalized === "all" || normalized === "*") {
                all = true;
                continue;
            }
            if (normalized === "none")
                continue;
            if (normalized.startsWith("!")) {
                addUnique(deny, denySeen, normalized.slice(1));
                continue;
            }
            if (normalized.startsWith("deny:")) {
                addUnique(deny, denySeen, normalized.slice("deny:".length));
                continue;
            }
            if (normalized.startsWith("allow:")) {
                addUnique(allow, allowSeen, normalized.slice("allow:".length));
                continue;
            }
            if (mode === "deny")
                addUnique(deny, denySeen, normalized);
            else
                addUnique(allow, allowSeen, normalized);
        }
    };
    if (source) {
        if (source.all)
            all = true;
        pushTokens(source.allow, "allow");
        pushTokens(source.deny, "deny");
        return { allow, deny, all };
    }
    pushTokens(input, "allow");
    return { allow, deny, all };
}

export function isToolAllowed(policy, tool) {
    const normalizedPolicy = normalizeToolAcl(policy);
    const normalizedTool = normalizeToolToken(tool);
    if (!normalizedTool)
        return false;
    if (normalizedPolicy.deny.includes(normalizedTool))
        return false;
    if (normalizedPolicy.all)
        return true;
    return normalizedPolicy.allow.includes(normalizedTool);
}

function pickFrontmatterValue(frontmatter, keys) {
    for (const key of keys) {
        if (!(key in frontmatter))
            continue;
        const value = frontmatter[key];
        if (Array.isArray(value))
            return value.length > 0 ? value[0] : undefined;
        if (value != null && String(value).trim() !== "")
            return String(value).trim();
    }
    return undefined;
}

function parseFrontmatterBoolean(frontmatter, keys) {
    const value = pickFrontmatterValue(frontmatter, keys);
    if (value == null)
        return undefined;
    const text = String(value).trim().toLowerCase();
    if (["true", "yes", "1", "on"].includes(text))
        return true;
    if (["false", "no", "0", "off"].includes(text))
        return false;
    return undefined;
}

function parseFrontmatterNumber(frontmatter, keys) {
    const value = pickFrontmatterValue(frontmatter, keys);
    if (value == null)
        return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function hasAgentSignals(frontmatter) {
    return ["model", "thinkingLevel", "thinking", "tools"].some((key) => key in frontmatter);
}

export function parseAgentMarkdown(text, sourcePath, scope, rootPath) {
    const { frontmatter, body, hasFrontmatter } = readFrontmatter(text);
    if (!hasFrontmatter || !hasAgentSignals(frontmatter))
        return undefined;
    const name = pickFrontmatterValue(frontmatter, ["name"]);
    const model = pickFrontmatterValue(frontmatter, ["model"]);
    const thinkingLevel = pickFrontmatterValue(frontmatter, ["thinkingLevel", "thinking"]);
    const tools = normalizeToolAcl(frontmatter.tools);
    const costTier = pickFrontmatterValue(frontmatter, ["costTier", "cost_tier"]);
    const memoryScope = pickFrontmatterValue(frontmatter, ["memoryScope", "memory_scope", "memory"]);
    const background = parseFrontmatterBoolean(frontmatter, ["background"]);
    const maxTurns = parseFrontmatterNumber(frontmatter, ["maxTurns", "max_turns"]);
    const writeScope = splitFrontmatterList(frontmatter.writeScope ?? frontmatter.write_scope);
    const extensionDependencies = splitFrontmatterList(frontmatter.extensionDependencies ?? frontmatter.extension_dependencies);
    const evals = splitFrontmatterList(frontmatter.evals ?? frontmatter.evalSets ?? frontmatter.eval_sets);
    const fallbackId = rootPath ? relative(rootPath, sourcePath).replace(/\.md$/i, "") : basename(sourcePath, ".md");
    const displayName = name ?? fallbackId ?? basename(sourcePath, ".md");
    return {
        id: displayName,
        name: displayName,
        model,
        thinkingLevel,
        costTier,
        memoryScope,
        background,
        maxTurns,
        writeScope,
        extensionDependencies,
        evals,
        tools,
        frontmatter,
        body,
        sourcePath,
        rootPath,
        scope,
    };
}

function isMarkdownFile(fileName) {
    return fileName.toLowerCase().endsWith(".md");
}

function readAgentFiles(rootPath, scope) {
    if (!existsSync(rootPath))
        return [];
    const entries = [];
    const stack = [rootPath];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        let dirEntries;
        try {
            dirEntries = readdirSync(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        dirEntries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of dirEntries) {
            const entryPath = join(current, entry.name);
            if (entry.isDirectory()) {
                if (IGNORED_DIRECTORIES.has(entry.name))
                    continue;
                stack.push(entryPath);
                continue;
            }
            if (!entry.isFile() || !isMarkdownFile(entry.name))
                continue;
            let text;
            try {
                text = readFileSync(entryPath, "utf8");
            }
            catch {
                continue;
            }
            const parsed = parseAgentMarkdown(text, entryPath, scope, rootPath);
            if (parsed)
                entries.push(parsed);
        }
    }
    return entries.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

function defaultProjectRoots(cwd) {
    return DEFAULT_PROJECT_ROOTS.map((root) => resolveRoot(root, cwd));
}

function defaultUserRoots() {
    return DEFAULT_USER_ROOTS.map((root) => resolveRoot(root, process.env.HOME ?? ""));
}

function rootTrustMarkerPath(rootPath, trustMarkerName) {
    return join(rootPath, trustMarkerName);
}
function agentKey(agent) {
    return String(agent.id ?? agent.name ?? "").trim().toLowerCase();
}

function mergeAgentsWithPrecedence(projectAgents, userAgents) {
    const selected = new Map();
    const collisions = [];
    for (const agent of userAgents) {
        const key = agentKey(agent);
        if (!key)
            continue;
        selected.set(key, agent);
    }
    for (const agent of projectAgents) {
        const key = agentKey(agent);
        if (!key)
            continue;
        const existing = selected.get(key);
        if (existing) {
            collisions.push({
                id: agent.id,
                name: agent.name,
                winnerScope: "project",
                winnerPath: agent.sourcePath,
                shadowedScope: existing.scope,
                shadowedPath: existing.sourcePath,
            });
        }
        selected.set(key, agent);
    }
    return {
        agents: [...selected.values()].sort((left, right) => {
            if (left.scope !== right.scope)
                return left.scope === "project" ? -1 : 1;
            return left.sourcePath.localeCompare(right.sourcePath);
        }),
        collisions,
    };
}

export function loadProjectAgentRegistry(options = {}) {
    const cwd = resolve(options.cwd ?? process.cwd());
    const projectRoots = (options.projectRoots?.length ? options.projectRoots : defaultProjectRoots(cwd)).map((root) => resolveRoot(root, cwd));
    const userRoots = (options.userRoots?.length ? options.userRoots : defaultUserRoots()).map((root) => resolveRoot(root, cwd));
    const trustMarkerName = options.trustMarkerName ?? DEFAULT_TRUST_MARKER_NAME;
    const projectAgents = [];
    const userAgents = [];
    const trustedProjectRoots = [];
    const skippedProjectRoots = [];
    for (const rootPath of projectRoots) {
        if (!existsSync(rootPath))
            continue;
        const trustMarkerPath = rootTrustMarkerPath(rootPath, trustMarkerName);
        if (!existsSync(trustMarkerPath)) {
            skippedProjectRoots.push(rootPath);
            continue;
        }
        trustedProjectRoots.push(rootPath);
        projectAgents.push(...readAgentFiles(rootPath, "project"));
    }
    for (const rootPath of userRoots) {
        if (!existsSync(rootPath))
            continue;
        userAgents.push(...readAgentFiles(rootPath, "user"));
    }
    const merged = mergeAgentsWithPrecedence(projectAgents, userAgents);
    return {
        cwd,
        projectRoots,
        userRoots,
        trustMarkerName,
        trustedProjectRoots,
        skippedProjectRoots,
        projectAgents,
        userAgents,
        agents: merged.agents,
        collisions: merged.collisions,
    };
}
