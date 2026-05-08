import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const DEFAULT_LIMIT = 12;
const FEATURE_RULES = [
    {
        id: "subagent-runtime",
        title: "Subagent runtime: parallel/background workers, chains, supervision",
        terms: ["subagent", "subagents", "worker", "workers", "parallel", "background", "team", "crew", "supervisor", "minion"],
        requiredTerms: ["subagent", "subagents", "worker", "workers", "parallel", "background", "crew", "supervisor", "minion"],
        buildNow: "Extend the existing siso spawn/council/workflow layer with source-backed queue, chain, and supervision patterns.",
    },
    {
        id: "session-memory",
        title: "Session memory: searchable history, handoff, correction learning",
        terms: ["memory", "session", "sessions", "handoff", "recall", "history", "checkpoint", "learning"],
        requiredTerms: ["memory", "session", "sessions", "handoff", "recall", "checkpoint", "learning"],
        buildNow: "Add a Pi-native session index command that searches prior runs, checkpoints, child outputs, and correction memories without eager prompt injection.",
    },
    {
        id: "context-pruning",
        title: "Context pruning: keep tool history, trim future prompt load",
        terms: ["context", "prune", "token", "tokens", "compress", "pack", "repomix", "lean", "budget"],
        requiredTerms: ["prune", "token", "tokens", "compress", "pack", "repomix", "budget"],
        buildNow: "Add a context budget advisor that recommends what to lazy-load, summarize, or omit before a child/council/workflow call.",
    },
    {
        id: "codebase-map",
        title: "Codebase map: repo wiki, symbol graph, impact/blast radius",
        terms: ["codebase", "graph", "wiki", "symbol", "ast", "tree-sitter", "impact", "blast", "pagerank", "map"],
        requiredTerms: ["graph", "wiki", "symbol", "ast", "tree-sitter", "impact", "blast", "pagerank", "map"],
        buildNow: "Expose a repo-map adapter contract behind siso repo/codebrain actions, starting with current catalogs and Repomix before heavier graph engines.",
    },
    {
        id: "task-workflow",
        title: "Task workflow: file-backed plans, task registry, structured execution",
        terms: ["task", "tasks", "workflow", "plan", "planning", "gsd", "tdd", "validate", "execute"],
        requiredTerms: ["task", "tasks", "workflow", "plan", "planning", "gsd", "tdd"],
        buildNow: "Tighten the existing task store/workflow layer into a visible plan/task board that workers can update independently.",
    },
    {
        id: "safety-permissions",
        title: "Safety and permissions: pre-edit guardrails, rollback, child limits",
        terms: ["permission", "permissions", "security", "safety", "guard", "rewind", "rollback", "checkpoint"],
        requiredTerms: ["permission", "permissions", "security", "safety", "guard", "rewind", "rollback"],
        buildNow: "Extend child guardrails with pre-edit impact checks and rollback checkpoints for risky file edits.",
    },
    {
        id: "status-telemetry",
        title: "Status and telemetry: live dashboard, diagnostics, test harness",
        terms: ["status", "metrics", "telemetry", "diag", "diagnostics", "test", "harness", "usage", "quota"],
        requiredTerms: ["status", "metrics", "telemetry", "diag", "diagnostics", "test", "harness", "usage", "quota"],
        buildNow: "Feed SystemDB/Bifrost/child-run metrics into the existing pi-codex dashboard and add regression smokes for every new extension.",
    },
    {
        id: "provider-mcp",
        title: "Provider/MCP bridge: reuse existing Pi providers and tool adapters",
        terms: ["provider", "mcp", "adapter", "minimax", "openai", "gateway", "api", "models"],
        requiredTerms: ["provider", "mcp", "adapter", "minimax", "openai", "gateway", "models"],
        buildNow: "Keep Bifrost as the primary router, but mine provider packages for model discovery, settings, and MCP import UX.",
    },
];
const RESEARCH_INTEGRATION_QUEUE = [
    {
        id: "claude-code-feel",
        title: "Claude Code-style terminal feel: compact tool/subagent/chat rendering",
        priority: "A",
        status: "build-now",
        sourceRepos: ["1jehuang-jcode", "kcosr-pi-extensions"],
        evidenceFiles: [
            "research/inbox/2026-05-05-jcode-harness-reference.md",
            "research/inbox/2026-05-05-design-reference-followups.md",
            "research/sources/kcosr-pi-extensions/toolwatch/extension/index.ts",
            "research/sources/kcosr-pi-extensions/assistant/format.js",
            "research/sources/1jehuang-jcode/src/tui/ui_input.rs",
            "research/sources/1jehuang-jcode/src/tui/ui_tools.rs",
            "research/sources/1jehuang-jcode/src/cli/terminal.rs",
        ],
        steal: "JCode's composer/status/tool-summary discipline plus kcosr's Pi TUI extension formatting patterns.",
        firstPatch: "Patch Pi/native shell/read/edit renderers and SISO child renderers so calls collapse to friendly one-line summaries; then add a compact status/composer strip.",
        testGate: "Add render tests plus a live pi-codex smoke that asserts no raw JSON/tool parameter dump appears for shell/read/edit/siso spawn/skill/task calls.",
    },
    {
        id: "worker-backlog",
        title: "Worker backlog: file-backed tasks with dependencies and lifecycle events",
        priority: "A",
        status: "steal-next",
        sourceRepos: ["pi-tasks", "planning-with-files"],
        evidenceFiles: [
            "research/inbox/2026-05-05-pi-tasks.md",
            "research/inbox/2026-05-05-planning-with-files.md",
            "research/sources/pi-tasks/src/index.ts",
            "research/sources/pi-tasks/src/task-store.ts",
            "research/sources/planning-with-files/scripts/resolve-plan-dir.sh",
            "research/sources/planning-with-files/skills/planning-with-files/SKILL.md",
        ],
        steal: "TaskCreate/TaskUpdate/TaskExecute model, dependency fields, atomic JSON store, and cross-extension completion events.",
        firstPatch: "Map current siso task rows to worker profile launches and write child completion back into task metadata.",
        testGate: "Dry-run workflow test must create tasks, assign MiniMax workers, emit child records, and mark completed/failed deterministically.",
    },
    {
        id: "supervised-verification",
        title: "Supervisor/verifier overlay: outcome-aware steering without bloating main context",
        priority: "A",
        status: "steal-next",
        sourceRepos: ["pi-supervisor"],
        evidenceFiles: [
            "research/inbox/2026-05-05-pi-supervisor.md",
            "research/sources/pi-supervisor/src/index.ts",
            "research/sources/pi-supervisor/src/engine.ts",
            "research/sources/pi-supervisor/src/state.ts",
            "research/sources/pi-supervisor/src/ui/status-widget.ts",
        ],
        steal: "Isolated in-memory Pi model call, bounded context snapshot, JSON decision schema, and turn_end/agent_end lifecycle hooks.",
        firstPatch: "Add a siso verifier action that asks a no-tools reviewer to continue/steer/done after workflows and records the decision.",
        testGate: "Unit test JSON decision parsing and live no-tools verifier smoke routed through Bifrost.",
    },
    {
        id: "lifecycle-control-plane",
        title: "Lifecycle control plane: session state, plan resolver, clean status widget, audit formatting",
        priority: "A",
        status: "build-now",
        sourceRepos: ["pi-supervisor", "kcosr-pi-extensions", "planning-with-files"],
        evidenceFiles: [
            "research/inbox/2026-05-05-pi-supervisor.md",
            "research/inbox/2026-05-05-pi-tasks.md",
            "research/inbox/2026-05-05-planning-with-files.md",
            "research/sources/pi-supervisor/src/state.ts",
            "research/sources/pi-supervisor/src/ui/status-widget.ts",
            "research/sources/kcosr-pi-extensions/toolwatch/collector/src/ui.ts",
            "research/sources/planning-with-files/scripts/resolve-plan-dir.sh",
        ],
        steal: "appendEntry-backed session restore, bounded status widget, Toolwatch display/full formatter, and Planning With Files plan directory resolution.",
        firstPatch: "Add a minimal siso lifecycle state module that records session events, resolves active plan dirs read-only, and feeds compact status/dashboard data.",
        testGate: "Unit test restore order, plan resolver precedence, width-truncated status lines, and tool display/full formatting.",
    },
    {
        id: "occ-parity-oracle",
        title: "Open Claude Code parity oracle: compare behavior without adopting decompile-informed source",
        priority: "B",
        status: "pilot-next",
        sourceRepos: ["ruvnet-open-claude-code"],
        evidenceFiles: [
            "research/inbox/2026-05-06-open-claude-code.md",
            "docs/claude-code-feature-parity-checklist.md",
            "experiments/open-claude-code-bifrost.md",
            "scripts/occ-bifrost.mjs",
            "scripts/smoke-pi-vs-occ-bifrost.mjs",
        ],
        steal: "Subsystem checklist, permission-mode vocabulary, event stream vocabulary, lazy tool/skill discovery pattern, and drift verification pipeline shape.",
        firstPatch: "Extend the Pi-vs-OCC bakeoff to grep and edit-dry-run, then use failures as Pi feature tickets rather than copying OCC code.",
        testGate: "Smoke must record Pi/OCC calls, tokens, latency, and pass/fail for text/read/grep/edit-dry-run through Bifrost.",
    },
    {
        id: "agentgrep-codebrain",
        title: "Agentgrep/codebrain: scoped search with symbols and seen-context memory",
        priority: "A",
        status: "build-now",
        sourceRepos: ["1jehuang-jcode", "yamadashy-repomix"],
        evidenceFiles: [
            "research/inbox/2026-05-05-jcode-harness-reference.md",
            "research/inbox/2026-05-05-code-brain-bakeoff-lab.md",
            "scripts/pi-brain-grep.mjs",
        ],
        steal: "Structure-aware grep returns containing symbols and avoids re-sending already seen regions.",
        firstPatch: "Keep expanding pi-brain-grep into the default search path and add a siso codebrain action over it.",
        testGate: "Smoke must prove scoped search ignores research by default, returns containing symbols, and marks repeated regions as already seen.",
    },
    {
        id: "wiki-context",
        title: "Wiki context: index-first repo knowledge instead of eager prompt stuffing",
        priority: "A",
        status: "pilot-next",
        sourceRepos: ["llm-wiki-plugin", "kausik-a-pi-llm-wiki"],
        evidenceFiles: [
            "research/inbox/2026-05-05-llm-wiki-plugin.md",
            "research/sources/llm-wiki-plugin/skills/llm-wiki/SKILL.md",
            "research/sources/kausik-a-pi-llm-wiki/extensions/llm-wiki/resources/skills/llm-wiki/SKILL.md",
        ],
        steal: "Markdown wiki with index-first retrieval, BM25 fallback, optional graph, and strict page-size conventions.",
        firstPatch: "Add a lab smoke that initializes a tiny wiki, ingests one source, queries via index first, and exposes it as a lazy skill only.",
        testGate: "Smoke must pass with python3 and fail if query reads the whole wiki instead of index/candidate pages.",
    },
    {
        id: "repo-map-registry",
        title: "Repo-map registry: cheap generated file/symbol/index context before heavy graph engines",
        priority: "A",
        status: "build-now",
        sourceRepos: ["kausik-a-pi-llm-wiki", "llm-wiki-plugin", "Understand-Anything", "jakedismo-codegraph-rust"],
        evidenceFiles: [
            "research/inbox/2026-05-05-llm-wiki-plugin.md",
            "research/inbox/2026-05-05-understand-anything.md",
            "research/inbox/2026-05-05-codebase-context-wave3.md",
            "research/sources/kausik-a-pi-llm-wiki/extensions/llm-wiki/src/indexer.ts",
            "research/sources/kausik-a-pi-llm-wiki/extensions/llm-wiki/src/search.ts",
            "research/sources/Understand-Anything/understand-anything-plugin/src/context-builder.ts",
            "research/sources/jakedismo-codegraph-rust/docs/AGENT_PROMPT_TIERS.md",
        ],
        steal: "Kausik registry/search, llm-wiki index-first retrieval, Understand-Anything top-K plus one-hop context, and CodeGraph truncation metadata.",
        firstPatch: "Add a read-only repo-map registry that emits files/symbols/imports/backlinks/index.md under .pi/repo-map and exposes bounded search/context actions.",
        testGate: "Smoke must prove search returns summaries not full files, one-hop expansion includes related files, and caps emit truncated metadata.",
    },
    {
        id: "swarm-server-model",
        title: "Swarm server model: task worktrees, shared coordination, file-touch notifications",
        priority: "B",
        status: "steal-next",
        sourceRepos: ["1jehuang-jcode", "pi-subagents"],
        evidenceFiles: [
            "research/inbox/2026-05-05-jcode-harness-reference.md",
            "research/inbox/0013-tintinweb-pi-subagents.json",
            "research/sources/1jehuang-jcode/docs/SWARM_ARCHITECTURE.md",
        ],
        steal: "Coordinator-owned swarm state, optional worktrees per task/sprint, DMs/broadcasts, and soft file-change interrupts.",
        firstPatch: "Extend child-run records with touched/read files and show conflict warnings before resuming related workers.",
        testGate: "Unit test two child records where one edits a file another read and assert dashboard warning output.",
    },
];
function defaultCatalogPath() {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, "..", "..", "..", "research", "repo-candidate-catalog.json");
}
function defaultBroadCatalogPath() {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, "..", "..", "..", "research", "pi-ecosystem-broad-candidate-catalog.json");
}
function countBy(rows, field) {
    const counts = {};
    for (const row of rows)
        counts[String(row[field])] = (counts[String(row[field])] ?? 0) + 1;
    return Object.fromEntries(Object.entries(counts).sort(([, a], [, b]) => b - a));
}
function matches(row, filters) {
    if (filters.priority && row.priority !== filters.priority)
        return false;
    if (filters.lane && row.lane !== filters.lane)
        return false;
    if (filters.action && row.action !== filters.action)
        return false;
    if (filters.kind && row.kind !== filters.kind)
        return false;
    if (!filters.query)
        return true;
    const needle = filters.query.toLowerCase();
    return [row.id, row.name, row.url, row.localPath, row.kind, row.package, row.npm, row.repo, row.lane, row.action, row.setup, row.license, row.description, row.steal, row.pi_relevance, row.harness_fit, row.local_status]
        .some((value) => String(value ?? "").toLowerCase().includes(needle));
}
export function loadRepoCatalog(path = process.env.SISO_REPO_CATALOG_PATH ?? defaultCatalogPath()) {
    if (!existsSync(path))
        return [];
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed.rows) ? parsed.rows.map((row) => ({ ...row, catalog: "cloned" })) : [];
}
export function loadBroadRepoCatalog(path = process.env.SISO_BROAD_REPO_CATALOG_PATH ?? defaultBroadCatalogPath()) {
    if (!existsSync(path))
        return [];
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed.rows) ? parsed.rows.map((row) => ({
        ...row,
        catalog: "broad",
        id: row.id ?? row.name,
        url: row.repo || row.npm,
        steal: row.steal ?? row.description,
    })) : [];
}
export function queryRepoCatalog(filters = {}, path) {
    const catalog = filters.catalog ?? "cloned";
    const rows = catalog === "broad"
        ? loadBroadRepoCatalog(path)
        : catalog === "both"
            ? [...loadRepoCatalog(), ...loadBroadRepoCatalog()]
            : loadRepoCatalog(path);
    const limit = Math.max(1, Math.min(filters.limit ?? DEFAULT_LIMIT, 50));
    const filtered = rows.filter((row) => matches(row, filters));
    return {
        catalogPath: catalog === "broad"
            ? path ?? process.env.SISO_BROAD_REPO_CATALOG_PATH ?? defaultBroadCatalogPath()
            : catalog === "both"
                ? `${process.env.SISO_REPO_CATALOG_PATH ?? defaultCatalogPath()} + ${process.env.SISO_BROAD_REPO_CATALOG_PATH ?? defaultBroadCatalogPath()}`
                : path ?? process.env.SISO_REPO_CATALOG_PATH ?? defaultCatalogPath(),
        totalRows: rows.length,
        returnedRows: Math.min(filtered.length, limit),
        rows: filtered.slice(0, limit),
        lanes: countBy(filtered, "lane"),
        priorities: countBy(filtered, "priority"),
        nextAction: filtered.length > limit
            ? `Inspect first ${limit}, then narrow by lane/action/query.`
            : catalog === "broad"
                ? "Clone the strongest missing candidate into research/sources, then rerun build_repo_catalog."
                : "Inspect these candidates and convert the best one into a Pi+Bifrost adapter, skill, or hook.",
    };
}
function rowHaystack(row) {
    return [row.name, row.id, row.lane, row.action, row.kind, row.description, row.steal, row.pi_relevance, row.harness_fit, row.local_status]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
}
function priorityWeight(priority) {
    if (priority === "A")
        return 10;
    if (priority === "B")
        return 5;
    if (priority === "C")
        return 2;
    return 1;
}
function sourceWeight(row) {
    const setupBoost = row.setup === "light" ? 2 : row.setup === "medium" ? 1 : 0;
    const actionBoost = row.action === "build-now" || row.action === "steal-patterns" || String(row.action).startsWith("inspect") ? 3 : 0;
    const catalogBoost = row.catalog === "cloned" ? 2 : 0;
    const numericScore = typeof row.score === "number" ? Math.min(row.score / 100, 4) : 0;
    return priorityWeight(String(row.priority)) + setupBoost + actionBoost + catalogBoost + numericScore;
}
function termMatches(haystack, terms) {
    return terms.filter((term) => haystack.includes(term)).length;
}
function searchText(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function recommendHarnessFeatures(filters = {}) {
    const catalog = filters.catalog ?? "both";
    const allRows = catalog === "broad"
        ? loadBroadRepoCatalog()
        : catalog === "cloned"
            ? loadRepoCatalog()
            : [...loadRepoCatalog(), ...loadBroadRepoCatalog()];
    const scopedRows = allRows.filter((row) => matches(row, {
        ...filters,
        action: undefined,
        catalog: undefined,
        limit: undefined,
    }));
    const limit = Math.max(1, Math.min(filters.limit ?? 8, FEATURE_RULES.length));
    const features = FEATURE_RULES.map((rule) => {
        const sources = scopedRows
            .map((row) => ({ row, haystack: rowHaystack(row) }))
            .filter(({ haystack }) => termMatches(haystack, rule.requiredTerms) > 0 && termMatches(haystack, rule.terms) >= 2)
            .map(({ row }) => row)
            .sort((a, b) => sourceWeight(b) - sourceWeight(a));
        return {
            id: rule.id,
            title: rule.title,
            score: Math.round(sources.reduce((total, row) => total + sourceWeight(row), 0)),
            rationale: sources.length > 0
                ? `Backed by ${sources.length} catalog candidates; strongest source is ${sources[0].name}.`
                : "No strong catalog source found yet.",
            buildNow: rule.buildNow,
            sourceCount: sources.length,
            topSources: sources.slice(0, 5),
        };
    }).filter((feature) => feature.sourceCount > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    return {
        catalogPath: catalog === "broad"
            ? process.env.SISO_BROAD_REPO_CATALOG_PATH ?? defaultBroadCatalogPath()
            : catalog === "cloned"
                ? process.env.SISO_REPO_CATALOG_PATH ?? defaultCatalogPath()
                : `${process.env.SISO_REPO_CATALOG_PATH ?? defaultCatalogPath()} + ${process.env.SISO_BROAD_REPO_CATALOG_PATH ?? defaultBroadCatalogPath()}`,
        totalRows: scopedRows.length,
        returnedRows: features.length,
        features,
        nextAction: "Pick the top feature, inspect its top sources, then convert the pattern into a Pi extension/tool with a smoke test.",
    };
}
function researchEvidenceExists(candidate) {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = join(here, "..", "..", "..");
    return candidate.evidenceFiles.some((file) => existsSync(join(root, file)));
}
export function recommendResearchIntegrations(filters = {}) {
    const limit = Math.max(1, Math.min(filters.limit ?? 8, RESEARCH_INTEGRATION_QUEUE.length));
    const query = filters.query ? searchText(filters.query) : undefined;
    const status = filters.action;
    const rows = RESEARCH_INTEGRATION_QUEUE
        .filter((candidate) => !filters.priority || candidate.priority === filters.priority)
        .filter((candidate) => !status || candidate.status === status)
        .filter((candidate) => !query || searchText([
        candidate.id,
        candidate.title,
        candidate.status,
        candidate.steal,
        candidate.firstPatch,
        candidate.testGate,
        ...candidate.sourceRepos,
        ...candidate.evidenceFiles,
    ].join(" ")).includes(query))
        .filter(researchEvidenceExists);
    return {
        catalogPath: "research/inbox + research/sources",
        totalRows: rows.length,
        returnedRows: Math.min(rows.length, limit),
        candidates: rows.slice(0, limit),
        nextAction: "Pick the first build-now candidate, inspect only its evidence files, implement the first patch, then add the listed test gate.",
    };
}
export function formatRepoCatalogResult(result) {
    if (result.rows.length === 0)
        return `No repo candidates matched. catalog=${result.catalogPath} total=${result.totalRows}`;
    return [
        `catalog=${result.catalogPath}`,
        `total=${result.totalRows} returned=${result.returnedRows}`,
        `lanes=${Object.entries(result.lanes).map(([lane, count]) => `${lane}:${count}`).join(",") || "none"}`,
        `priorities=${Object.entries(result.priorities).map(([priority, count]) => `${priority}:${count}`).join(",") || "none"}`,
        "",
        ...result.rows.map((row, index) => [
            `${index + 1}. ${row.priority} ${row.name}`,
            `catalog=${row.catalog ?? "unknown"} kind=${row.kind ?? "repo"} lane=${row.lane} action=${row.action} setup=${row.setup ?? "unknown"} license=${row.license ?? "unknown"} score=${row.score ?? "none"}`,
            `source=${row.localPath ?? row.repo ?? row.url ?? row.npm ?? "unknown"}`,
            `steal=${row.steal ?? row.description ?? "none"}`,
            `status=${row.local_status ?? "cloned-source-review"}`,
        ].join("\n")),
        "",
        `next_action=${result.nextAction}`,
    ].join("\n");
}
export function formatHarnessFeatureRecommendations(result) {
    if (result.features.length === 0)
        return `No harness feature recommendations matched. catalog=${result.catalogPath} total=${result.totalRows}`;
    return [
        `catalog=${result.catalogPath}`,
        `total_sources=${result.totalRows} returned_features=${result.returnedRows}`,
        "",
        ...result.features.map((feature, index) => [
            `${index + 1}. ${feature.title}`,
            `id=${feature.id} score=${feature.score} sources=${feature.sourceCount}`,
            `why=${feature.rationale}`,
            `build_now=${feature.buildNow}`,
            `top_sources=${feature.topSources.map((row) => `${row.priority}:${row.name}:${row.action}`).join(" | ")}`,
        ].join("\n")),
        "",
        `next_action=${result.nextAction}`,
    ].join("\n");
}
export function formatResearchIntegrationQueue(result) {
    if (result.candidates.length === 0)
        return `No research integration candidates matched. catalog=${result.catalogPath}`;
    return [
        `catalog=${result.catalogPath}`,
        `total=${result.totalRows} returned=${result.returnedRows}`,
        "",
        ...result.candidates.map((candidate, index) => [
            `${index + 1}. ${candidate.priority} ${candidate.title}`,
            `id=${candidate.id} status=${candidate.status} sources=${candidate.sourceRepos.join(",")}`,
            `steal=${candidate.steal}`,
            `first_patch=${candidate.firstPatch}`,
            `test_gate=${candidate.testGate}`,
            `evidence=${candidate.evidenceFiles.join(" | ")}`,
        ].join("\n")),
        "",
        `next_action=${result.nextAction}`,
    ].join("\n");
}
