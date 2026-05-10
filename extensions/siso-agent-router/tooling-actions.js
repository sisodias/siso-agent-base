import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_IGNORES = new Set([".git", "node_modules", ".pi", ".siso", "dist", "build", "coverage", ".next", ".turbo", ".cache"]);
const SECRET_PATTERNS = [/\.env(?:\.|$)/i, /secret/i, /credential/i, /private[-_]?key/i, /auth/i, /token/i, /\.pem$/i, /id_rsa/i, /id_ed25519/i];
const TEXT_EXTS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".md", ".txt", ".yml", ".yaml", ".sh", ".py", ".css", ".html", ".xml", ".toml", ".ini", ".lock"]);
const SYMBOL_EXTS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".sh", ".md"]);
const LANG_BY_EXT = new Map([
  [".js", "js"],
  [".mjs", "js"],
  [".cjs", "js"],
  [".ts", "ts"],
  [".tsx", "tsx"],
  [".jsx", "jsx"],
  [".py", "py"],
  [".sh", "sh"],
  [".md", "md"],
  [".json", "json"],
  [".yml", "yaml"],
  [".yaml", "yaml"],
  [".css", "css"],
  [".html", "html"],
]);

function rootFrom(cwd) {
  return path.resolve(cwd || process.cwd());
}

function safeRel(root, p) {
  const abs = path.resolve(root, p || ".");
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(`path escapes cwd: ${p}`);
  return { abs, rel: rel || "." };
}

function isSecretPath(p) {
  return SECRET_PATTERNS.some((rx) => rx.test(p));
}

function assertNotSecretPath(rel) {
  if (isSecretPath(rel)) throw new Error(`refusing secret-like path: ${rel}`);
}

function safeToolPath(root, p) {
  const target = safeRel(root, p);
  assertNotSecretPath(target.rel);
  return target;
}

function shouldIgnore(name, extra = []) {
  return DEFAULT_IGNORES.has(name) || extra.includes(name);
}

function walk(root, start = ".", opts = {}) {
  const { abs } = safeRel(root, start);
  const out = [];
  const maxFiles = opts.maxFiles ?? 5000;
  const extraIgnores = opts.exclude ?? [];
  function rec(dir) {
    if (out.length >= maxFiles) return;
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (shouldIgnore(e.name, extraIgnores)) continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full);
      if (isSecretPath(rel)) continue;
      out.push({ abs: full, rel, dirent: e });
      if (e.isDirectory()) rec(full);
      if (out.length >= maxFiles) break;
    }
  }
  rec(abs);
  return out;
}

function isProbablyText(file) {
  const ext = path.extname(file).toLowerCase();
  if (TEXT_EXTS.has(ext)) return true;
  if (!ext) return true;
  return false;
}

function clip(s, n = 240) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function compactText(value, limit = 240) {
  const text = String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clip(text, limit);
}

function parseList(v) {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") return v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

export function repoSearch(options = {}) {
  const root = rootFrom(options.cwd);
  const query = String(options.query || "");
  if (!query) throw new Error("query is required");
  const mode = options.mode || "text";
  const maxResults = Math.max(1, Math.min(Number(options.limit ?? options.maxResults ?? 50), 200));
  const contextLines = Math.max(0, Math.min(Number(options.contextLines ?? 0), 5));
  const start = options.path || ".";
  const results = [];

  if (mode === "filename") {
    for (const item of walk(root, start, { maxFiles: 10000 })) {
      if (results.length >= maxResults) break;
      if (item.rel.toLowerCase().includes(query.toLowerCase())) results.push({ path: item.rel, kind: item.dirent.isDirectory() ? "dir" : "file" });
    }
    return { action: "repo-search", mode, query, results, truncated: results.length >= maxResults };
  }

  let regex;
  if (mode === "regex" || mode === "symbol") regex = new RegExp(query, "i");
  const literal = query.toLowerCase();
  for (const item of walk(root, start, { maxFiles: 10000 })) {
    if (results.length >= maxResults) break;
    if (!item.dirent.isFile() || !isProbablyText(item.rel) || isSecretPath(item.rel)) continue;
    let text;
    try { text = readFileSync(item.abs, "utf8"); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ok = regex ? regex.test(line) : line.toLowerCase().includes(literal);
      if (!ok) continue;
      const match = { path: item.rel, line: i + 1, preview: clip(line.trim(), 300) };
      if (contextLines) {
        const from = Math.max(0, i - contextLines);
        const to = Math.min(lines.length, i + contextLines + 1);
        match.context = lines.slice(from, to).map((body, idx) => ({ line: from + idx + 1, text: clip(body, 240) }));
      }
      results.push(match);
      if (results.length >= maxResults) break;
    }
  }
  return { action: "repo-search", mode, query, results, truncated: results.length >= maxResults };
}

function sourcegraphSearchQuery(query, count) {
  const text = String(query || "").trim();
  if (/\bcount:\d+\b/.test(text)) return text;
  return `${text} count:${count}`;
}

function sourcegraphUrl(pathOrUrl) {
  const value = String(pathOrUrl || "");
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://sourcegraph.com${value}`;
}

function parseSourcegraphResponse(json, options) {
  const count = clampNumber(options.limit ?? options.count, 5, 1, 20);
  const maxMatchesPerFile = clampNumber(options.maxMatchesPerFile, 5, 1, 20);
  const previewChars = clampNumber(options.previewChars, 240, 80, 1000);
  const searchResults = json?.data?.search?.results;
  const rawResults = Array.isArray(searchResults?.results) ? searchResults.results : [];
  const results = [];
  for (const item of rawResults) {
    if (results.length >= count) break;
    if (item?.__typename !== "FileMatch") continue;
    const repo = item.repository?.name ?? "";
    const file = item.file ?? {};
    const lineMatches = Array.isArray(item.lineMatches) ? item.lineMatches : [];
    const matches = lineMatches.slice(0, maxMatchesPerFile).map((match) => ({
      line: Number(match.lineNumber ?? 0),
      preview: compactText(match.preview, previewChars),
    })).filter((match) => match.preview);
    results.push({
      repo,
      path: file.path ?? "",
      url: sourcegraphUrl(file.url),
      matches,
      matchCount: lineMatches.length,
      truncatedMatches: lineMatches.length > maxMatchesPerFile,
    });
  }
  return {
    matchCount: Number(searchResults?.matchCount ?? 0),
    resultCount: Number(searchResults?.resultCount ?? rawResults.length),
    approximateResultCount: Number(searchResults?.approximateResultCount ?? 0),
    limitHit: Boolean(searchResults?.limitHit),
    indexUnavailable: Boolean(searchResults?.indexUnavailable),
    missing: Array.isArray(searchResults?.missing) ? searchResults.missing.map((item) => item.name).filter(Boolean) : [],
    timedOut: Array.isArray(searchResults?.timedout) ? searchResults.timedout.map((item) => item.name).filter(Boolean) : [],
    results,
  };
}

export async function publicCodeSearch(options = {}) {
  const query = String(options.query || "").trim();
  if (!query) throw new Error("query is required");
  const count = clampNumber(options.limit ?? options.count, 5, 1, 20);
  const timeoutMs = clampNumber(options.timeoutMs ?? options.timeout, 30_000, 1_000, 120_000);
  const maxChars = clampNumber(options.maxChars, 12_000, 1_000, 50_000);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch is not available for public code search");
  const sgQuery = sourcegraphSearchQuery(query, count);
  const body = JSON.stringify({
    query: "query Search($query: String!) { search(query: $query, version: V2, patternType: keyword) { results { matchCount limitHit resultCount approximateResultCount missing { name } timedout { name } indexUnavailable results { __typename ... on FileMatch { repository { name } file { path url } lineMatches { preview lineNumber offsetAndLengths } } } } } }",
    variables: { query: sgQuery },
  });
  const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(timeoutMs)
    : undefined;
  const startedAt = Date.now();
  const response = await fetchImpl("https://sourcegraph.com/.api/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "siso-agent-base/0.1",
    },
    body,
    signal,
  });
  const status = Number(response?.status ?? 0);
  const rawText = typeof response?.text === "function" ? await response.text() : "";
  if (!response?.ok) {
    return {
      action: "public-code-search",
      source: "sourcegraph",
      ok: false,
      query,
      sourcegraphQuery: sgQuery,
      status,
      elapsedMs: Date.now() - startedAt,
      error: compactText(rawText || `Sourcegraph request failed with status ${status}`, 1000),
      results: [],
    };
  }
  const json = JSON.parse(rawText);
  const parsed = parseSourcegraphResponse(json, { ...options, count });
  const result = {
    action: "public-code-search",
    source: "sourcegraph",
    ok: true,
    query,
    sourcegraphQuery: sgQuery,
    searchUrl: `https://sourcegraph.com/search?q=${encodeURIComponent(sgQuery)}`,
    elapsedMs: Date.now() - startedAt,
    ...parsed,
  };
  const jsonText = JSON.stringify(result);
  if (jsonText.length <= maxChars) return result;
  return {
    ...result,
    results: result.results.slice(0, Math.max(1, Math.floor(result.results.length / 2))),
    truncated: true,
    originalChars: jsonText.length,
    maxChars,
  };
}

export function readMany(options = {}) {
  const root = rootFrom(options.cwd);
  const paths = parseList(options.paths ?? options.query);
  if (!paths.length) throw new Error("paths are required");
  const maxBytes = Math.max(100, Math.min(Number(options.maxBytesPerFile ?? options.maxChars ?? 20000), 200000));
  const lineNumbers = Boolean(options.includeLineNumbers);
  const files = paths.map((p) => {
    try {
      const { abs, rel } = safeRel(root, p);
      if (isSecretPath(rel)) return { path: rel, ok: false, error: "refusing to read secret-like path" };
      const st = statSync(abs);
      if (!st.isFile()) return { path: rel, ok: false, error: "not a file" };
      let text = readFileSync(abs, "utf8");
      const truncated = Buffer.byteLength(text) > maxBytes;
      if (truncated) text = text.slice(0, maxBytes);
      if (lineNumbers) text = text.split(/\r?\n/).map((l, i) => `${String(i + 1).padStart(4)} ${l}`).join("\n");
      return { path: rel, ok: true, bytes: st.size, truncated, text };
    } catch (e) {
      return { path: p, ok: false, error: e.message };
    }
  });
  return { action: "read-many", files };
}

export function projectTree(options = {}) {
  const root = rootFrom(options.cwd);
  const depth = Math.max(0, Math.min(Number(options.depth ?? 3), 8));
  const includeFiles = options.includeFiles !== false;
  const extraIgnores = parseList(options.exclude);
  const lines = ["./"];
  function rec(dir, prefix, level) {
    if (level >= depth) return;
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    entries = entries.filter((e) => !shouldIgnore(e.name, extraIgnores));
    if (!includeFiles) entries = entries.filter((e) => e.isDirectory());
    entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    for (const e of entries.slice(0, 200)) {
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full);
      if (isSecretPath(rel)) continue;
      lines.push(`${prefix}${e.name}${e.isDirectory() ? "/" : ""}`);
      if (e.isDirectory()) rec(full, `${prefix}  `, level + 1);
    }
  }
  rec(root, "", 0);
  return { action: "project-tree", depth, text: lines.join("\n") };
}

export function workspaceStatus(options = {}) {
  const root = rootFrom(options.cwd);
  const r = spawnSync("git", ["status", "--short", "--branch"], { cwd: root, encoding: "utf8", timeout: 10000 });
  return { action: "workspace-status", ok: r.status === 0, exitCode: r.status, text: (r.stdout || r.stderr || "").trim() };
}

export function workspaceDiff(options = {}) {
  const root = rootFrom(options.cwd);
  const maxChars = Math.max(500, Math.min(Number(options.maxChars ?? 12000), 50000));
  const args = ["diff"];
  if (options.stat) args.push("--stat");
  const paths = parseList(options.paths).map((p) => safeToolPath(root, p).rel);
  if (paths.length) args.push("--", ...paths);
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024 * 5 });
  let text = r.stdout || r.stderr || "";
  const truncated = text.length > maxChars;
  if (truncated) text = text.slice(0, maxChars) + "\n[SISO_DIFF_TRUNCATED]";
  return { action: "workspace-diff", ok: r.status === 0, exitCode: r.status, truncated, text: text.trim() };
}

function envFlag(name, fallback) {
  return process.env[name] ?? fallback;
}

function pathState(pathValue) {
  if (!pathValue) return "unset";
  return existsSync(pathValue) ? "present" : "missing";
}

export function runtimeSummary(options = {}) {
  const home = process.env.HOME || "";
  const installDir = process.env.SISO_AGENT_BASE_DIR || (home ? path.join(home, ".siso-agent-base") : "");
  const profileDir = process.env.SISO_PROFILE_DIR || (home ? path.join(home, ".siso", "agent", "profile") : "");
  const extDir = path.join(installDir, "extensions");
  const extensionPaths = [
    path.join(extDir, "siso-lifecycle", "index.js"),
    path.join(extDir, "siso-context-manager", "index.js"),
    path.join(extDir, "siso-status", "index.js"),
    path.join(extDir, "siso-agent-router", "index.js"),
  ];
  const tools = String(process.env.SISO_TOOLS || "read,bash,edit,write,ls,siso,siso_context")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const registeredTools = Array.isArray(options.registeredTools)
    ? options.registeredTools.map(String).filter(Boolean).sort()
    : undefined;
  const settingsPath = path.join(profileDir, "settings.json");
  let profileDefaultModel = "";
  let profileDefaultProvider = "";
  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    profileDefaultModel = settings.defaultModel || "";
    profileDefaultProvider = settings.defaultProvider || "";
  } catch {}
  const summary = {
    action: "runtime-summary",
    cwd: rootFrom(options.cwd),
    provider: "bifrost-anthropic",
    model: process.env.SISO_MODEL || profileDefaultModel || "claude-opus-4-7",
    profileDefaultProvider,
    profileDefaultModel,
    toolAllowlist: tools,
    registeredTools,
    piDiscovery: {
      skills: "disabled by bin/siso --no-skills",
      contextFiles: "disabled by bin/siso --no-context-files",
      extensions: "disabled by bin/siso --no-extensions",
    },
    manualExtensions: extensionPaths.map((file) => ({
      name: path.basename(path.dirname(file)),
      path: file,
      state: pathState(file),
    })),
    paths: {
      installDir,
      profileDir,
      sisoHome: process.env.SISO_HOME || (home ? path.join(home, ".siso") : ""),
      agentHome: process.env.SISO_AGENT_HOME || (home ? path.join(home, ".siso", "agent") : ""),
      childRunDir: process.env.SISO_CHILD_RUN_DIR || (home ? path.join(home, ".siso", "agent", "child-runs") : ""),
      taskStorePath: process.env.SISO_TASK_STORE_PATH || (home ? path.join(home, ".siso", "agent", "tasks", "siso-tasks.json") : ""),
      transcriptDir: process.env.SISO_TRANSCRIPT_DIR || (home ? path.join(home, ".siso", "agent", "transcripts") : ""),
      contextManagerDir: process.env.SISO_CONTEXT_MANAGER_DIR || (home ? path.join(home, ".siso", "agent", "context-manager") : ""),
    },
    modes: {
      offline: envFlag("PI_OFFLINE", "1"),
      telemetry: envFlag("PI_TELEMETRY", "0"),
      contextFilter: envFlag("SISO_CONTEXT_FILTER", "1"),
      semanticLibrarian: envFlag("SISO_CONTEXT_SEMANTIC_LIBRARIAN", "1"),
      agentRouterToolMode: envFlag("SISO_AGENT_ROUTER_TOOL_MODE", "lean"),
      statusToolMode: envFlag("SISO_STATUS_TOOL_MODE", "lean"),
      lifecycleToolMode: envFlag("SISO_LIFECYCLE_TOOL_MODE", "lean"),
      statusUi: envFlag("SISO_STATUS_UI", "full"),
      routerUi: envFlag("SISO_AGENT_ROUTER_UI", "compact"),
      controllerFirstRouting: envFlag("SISO_CONTROLLER_FIRST_ROUTING", "1"),
      spawnRuntime: envFlag("SISO_SPAWN_RUNTIME", "native-when-available"),
      spawnDefaultBackground: envFlag("SISO_SPAWN_DEFAULT_BACKGROUND", "0"),
    },
    nativeSubagentAvailable: Boolean(options.nativeSubagentAvailable),
  };
  summary.text = [
    `provider=${summary.provider}`,
    `model=${summary.model}`,
    `profile_default_provider=${summary.profileDefaultProvider || "unknown"}`,
    `profile_default_model=${summary.profileDefaultModel || "unknown"}`,
    `tools=${summary.toolAllowlist.join(",") || "none"}`,
    registeredTools ? `registered_tools=${registeredTools.join(",") || "none"}` : undefined,
    `pi_skills=${summary.piDiscovery.skills}`,
    `pi_context_files=${summary.piDiscovery.contextFiles}`,
    `pi_extensions=${summary.piDiscovery.extensions}`,
    `manual_extensions=${summary.manualExtensions.map((item) => `${item.name}:${item.state}`).join(",")}`,
    `router_tool_mode=${summary.modes.agentRouterToolMode}`,
    `status_tool_mode=${summary.modes.statusToolMode}`,
    `lifecycle_tool_mode=${summary.modes.lifecycleToolMode}`,
    `context_filter=${summary.modes.contextFilter}`,
    `semantic_librarian=${summary.modes.semanticLibrarian}`,
    `controller_first_routing=${summary.modes.controllerFirstRouting}`,
    `spawn_runtime=${summary.modes.spawnRuntime}`,
    `native_subagent_available=${summary.nativeSubagentAvailable}`,
    `install_dir=${summary.paths.installDir}`,
    `profile_dir=${summary.paths.profileDir}`,
    `transcript_dir=${summary.paths.transcriptDir}`,
  ].filter(Boolean).join("\n");
  return summary;
}

function unsafeCheckReason(command) {
  const text = String(command ?? "").trim();
  if (!text) return "empty command";
  if (/[\n\r;]/.test(text)) return "shell command chaining is not allowed";
  if (/[|&<>`]/.test(text)) return "shell metacharacters are not allowed";
  if (/\$\s*\(|\$\{/.test(text)) return "shell expansion is not allowed";
  if (/\brm\s+-[^;\n\r]*[rf][^;\n\r]*\s+(?:\.|\/|~|\*)/i.test(text)) return "destructive rm command is not allowed";
  if (/\bgit\s+reset\s+--hard\b/i.test(text)) return "git reset --hard is not allowed";
  if (/\bgit\s+clean\s+-[^\s]*[fdx]/i.test(text)) return "git clean is not allowed";
  if (/\bgit\s+checkout\s+--\b/i.test(text)) return "git checkout -- is not allowed";
  if (/\bsudo\b/i.test(text)) return "sudo is not allowed";
  if (/\b(?:curl|wget)\b[\s\S]*\b(?:bash|sh)\b/i.test(text)) return "network pipe-to-shell is not allowed";
  if (/\bdd\b[\s\S]*\bof=/i.test(text)) return "dd writes are not allowed";
  if (/\b(?:chmod|chown)\s+-R\b/i.test(text)) return "recursive permission changes are not allowed";
  return undefined;
}

function checkOutputSummary(output, maxChars = 4000) {
  const lines = String(output ?? "").trim().split(/\r?\n/).filter(Boolean);
  let tail = lines.slice(-40).join("\n");
  if (tail.length <= maxChars) return tail;
  const omitted = tail.length - maxChars;
  return `${tail.slice(0, maxChars).trimEnd()}\n[SISO_CHECK_OUTPUT_TRUNCATED original_chars=${tail.length} shown_chars=${maxChars} omitted_chars=${omitted}]`;
}

export function runCheck(options = {}) {
  const root = rootFrom(options.cwd);
  const command = String(options.command || options.query || "");
  if (!command) throw new Error("command is required");
  const unsafeReason = options.allowUnsafe === true ? undefined : unsafeCheckReason(command);
  if (unsafeReason) {
    return {
      action: "run-check",
      ok: false,
      blocked: true,
      exitCode: null,
      elapsedMs: 0,
      timedOut: false,
      summary: `blocked unsafe check command: ${unsafeReason}`,
    };
  }
  const timeoutMs = Math.max(1000, Math.min(Number(options.timeoutMs ?? 120000), 600000));
  const start = Date.now();
  const r = spawnSync(command, { cwd: root, shell: true, encoding: "utf8", timeout: timeoutMs, maxBuffer: 1024 * 1024 * 5 });
  const elapsedMs = Date.now() - start;
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const tail = checkOutputSummary(out);
  return { action: "run-check", ok: r.status === 0, blocked: false, exitCode: r.status, elapsedMs, timedOut: Boolean(r.error && r.error.code === "ETIMEDOUT"), summary: tail };
}

export function autopilotPlan(options = {}) {
  const root = rootFrom(options.cwd);
  const objective = compactText(options.objective || options.task || options.query || "Verify the completed work against the requested specification.", 500);
  const specification = compactText(options.specification || options.rubric || options.description || options.content || objective, 800);
  const maxIterations = clampNumber(options.maxIterations ?? options.limit, 3, 1, 8);
  const verifier = String(options.verifier || options.profile || "Minimax").trim() || "Minimax";
  const autopilotRunId = String(options.autopilotRunId || options.id || `autopilot-${Date.now()}`);
  const sessionId = String(options.sessionId || "unknown");
  const threadId = String(options.threadId || "unknown");
  const parentRunId = String(options.parentRunId || "unknown");
  const scopedPaths = parseList(options.paths).slice(0, 30);
  const checks = parseList(options.checks || options.commands || options.command);
  const inferredChecks = checks.length ? checks : [
    ...(/(v2|readiness|capabilit|changelog|contract)/i.test(objective) ? ["npm run smoke:v2-readiness"] : []),
    ...(/(contract|final|readiness)/i.test(objective) ? ["npm run smoke:contracts"] : []),
  ];
  const requiredChecks = inferredChecks.slice(0, 12).map((command) => {
    const unsafeReason = unsafeCheckReason(command);
    return {
      command,
      blocked: Boolean(unsafeReason),
      ...(unsafeReason ? { unsafeReason } : {}),
    };
  });
  const verifierAllowed = sessionId !== "unknown" && threadId !== "unknown";
  return {
    action: "autopilot-plan",
    mode: "verify-after-worker",
    objective,
    specification,
    autopilotRunId,
    controller: {
      owner: "controller",
      maxIterations,
      checkpointRequired: true,
      verifierAllowed,
      noEditInPlanMode: true,
    },
    eventScope: {
      sessionId,
      threadId,
      parentRunId,
      autopilotRunId,
      visibility: "session",
    },
    roles: {
      worker: {
        owner: "current-agent",
        canEdit: true,
        receives: ["specification", "requiredChecks", "feedbackPacket"],
      },
      verifier: {
        profile: verifier,
        readOnly: true,
        canEdit: false,
        receives: ["specification", "changedFileSummary", "diffSummary", "checkResults", "contractSummary", "flightRecorderSummary"],
      },
    },
    phases: [
      { id: "spec", owner: "controller", output: "compact specification" },
      { id: "checkpoint", owner: "controller", output: "checkpoint metadata before edits" },
      { id: "worker-implementation", owner: "worker", output: "code/doc changes" },
      { id: "required-checks", owner: "controller", output: "compact check results" },
      { id: "failure-signature", owner: "controller", output: "deduplicated failure signature" },
      { id: "verifier-review", owner: "verifier", output: "pass/needs_fix/blocked verdict" },
      { id: "feedback", owner: "controller", output: "compact feedback packet or final report" },
    ],
    requiredChecks,
    scopedPaths,
    stopConditions: [
      "all required checks pass and verifier passes",
      "maxIterations reached",
      "failure signature repeats without meaningful diff change",
      "unsafe check or missing session identity blocks verifier",
    ],
    failureSignature: {
      fields: ["command", "exitCode", "firstMeaningfulErrorLine", "contractId", "changedFileSetHash", "verifierMissingRequirementId"],
    },
    feedbackPacket: {
      allowedFields: ["verdict", "missingRequirement", "failingCheckCommand", "failureSignature", "relevantFiles", "suggestedNextAction", "freshCheckpointRequired"],
      forbiddenFields: ["raw logs", "raw tool events", "full child-agent records", "full file contents", "provider payloads"],
    },
    checkpoint: {
      requiredBeforeEdits: true,
      rollbackMode: "explicit-only",
      captures: ["git diff snapshot", "untracked file list", "selected file snapshots", "flight recorder metadata"],
    },
    flightRecorder: {
      enabled: true,
      path: path.join(".siso", "flight-runs", `${autopilotRunId}.json`),
      records: ["specification", "checks", "checkpoint", "iterations", "verifierVerdicts", "failureSignatures", "outcome"],
    },
    parentVisible: {
      maxChars: clampNumber(options.maxChars, 4000, 500, 12000),
      noRawLogs: true,
      compactDetailsOnly: true,
    },
    root,
  };
}

export function autopilotFixLoop(options = {}) {
  const root = rootFrom(options.cwd);
  const command = String(options.command || options.query || "");
  if (!command) throw new Error("command is required");
  const task = String(options.task || options.objective || options.description || `Fix failing check: ${command}`);
  const maxIterations = clampNumber(options.maxIterations ?? options.limit, 3, 1, 8);
  const maxChars = clampNumber(options.maxChars, 8000, 1000, 20000);
  const iterations = [];
  const startedAt = Date.now();
  for (let i = 0; i < maxIterations; i++) {
    const check = runCheck({ cwd: root, command, timeoutMs: options.timeoutMs });
    iterations.push({
      iteration: i + 1,
      check,
      decision: check.ok ? "stop-passed" : check.blocked ? "stop-blocked" : "stop-needs-patch",
    });
    if (check.ok) {
      return {
        action: "autopilot-fix-loop",
        ok: true,
        outcome: "passed",
        command,
        task,
        maxIterations,
        elapsedMs: Date.now() - startedAt,
        iterations,
        suggestedNextActions: ["Record the passing check in the final verification summary."],
      };
    }
    if (check.blocked) {
      return {
        action: "autopilot-fix-loop",
        ok: false,
        outcome: "blocked",
        command,
        task,
        maxIterations,
        elapsedMs: Date.now() - startedAt,
        iterations,
        failureSummary: check.summary,
        suggestedNextActions: ["Choose a safer validation command before retrying the fix loop."],
      };
    }
    break;
  }
  const failureSummary = checkOutputSummary(iterations.at(-1)?.check?.summary || "", Math.min(4000, maxChars));
  let context = null;
  try {
    context = gatherContext({ cwd: root, task: `${task}\n${failureSummary}`, limit: 4, maxChars: Math.min(8000, maxChars) });
  } catch (error) {
    context = { error: error.message };
  }
  return {
    action: "autopilot-fix-loop",
    ok: false,
    outcome: "needs_patch",
    command,
    task,
    maxIterations,
    elapsedMs: Date.now() - startedAt,
    iterations,
    failureSummary,
    context,
    suggestedNextActions: [
      "Patch the files indicated by the gathered context and failure summary.",
      "Rerun the same command after the patch.",
      "Escalate if the same failure signature repeats after a meaningful diff.",
    ],
  };
}

function repoIndexDir(root) {
  return path.join(root, ".siso", "repo-index");
}

function repoIndexPath(root, name) {
  return path.join(repoIndexDir(root), name);
}

function fileLanguage(rel) {
  return LANG_BY_EXT.get(path.extname(rel).toLowerCase()) || "text";
}

function extractRepoImports(rel, text) {
  const imports = [];
  const ext = path.extname(rel).toLowerCase();
  if ([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"].includes(ext)) {
    for (const match of text.matchAll(/\bimport\s+(?:[^'"]+\s+from\s+)?["']([^"']+)["']|require\(["']([^"']+)["']\)/g)) imports.push(match[1] || match[2]);
  } else if (ext === ".py") {
    for (const match of text.matchAll(/^\s*(?:from\s+([A-Za-z0-9_.$-]+)\s+import|import\s+([A-Za-z0-9_.$-]+))/gm)) imports.push(match[1] || match[2]);
  }
  return sortedUnique(imports.map((item) => String(item || "").trim()).filter(Boolean)).slice(0, 80);
}

function shortFileSummary(rel, text) {
  const firstLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 8);
  const heading = firstLines.find((line) => /^#/.test(line));
  const named = firstLines.find((line) => /\b(function|class|const|export|import|def)\b/.test(line));
  return compactText(heading || named || firstLines[0] || rel, 180);
}

function readRepoIndex(root) {
  const base = repoIndexDir(root);
  if (!existsSync(repoIndexPath(root, "index.json"))) return null;
  try {
    return {
      index: JSON.parse(readFileSync(path.join(base, "index.json"), "utf8")),
      files: JSON.parse(readFileSync(path.join(base, "files.json"), "utf8")),
      symbols: JSON.parse(readFileSync(path.join(base, "symbols.json"), "utf8")),
      imports: JSON.parse(readFileSync(path.join(base, "imports.json"), "utf8")),
    };
  } catch {
    return null;
  }
}

export function repoIndexBuild(options = {}) {
  const root = rootFrom(options.cwd);
  const maxFiles = clampNumber(options.maxFiles ?? options.limit, 5000, 100, 50000);
  const maxFileBytes = clampNumber(options.maxFileBytes, 250_000, 10_000, 1_500_000);
  const files = [];
  const symbols = [];
  const imports = [];
  for (const item of walk(root, options.path || ".", { maxFiles, exclude: parseList(options.exclude) })) {
    if (!item.dirent.isFile() || isSecretPath(item.rel) || !isProbablyText(item.rel)) continue;
    let st;
    try { st = statSync(item.abs); } catch { continue; }
    if (st.size > maxFileBytes) continue;
    let text = "";
    try { text = readFileSync(item.abs, "utf8"); } catch { continue; }
    const lang = fileLanguage(item.rel);
    files.push({ path: item.rel, bytes: st.size, mtimeMs: Math.round(st.mtimeMs), lang, summary: shortFileSummary(item.rel, text) });
    if (SYMBOL_EXTS.has(path.extname(item.rel).toLowerCase())) {
      for (const symbol of extractSymbolTags(item.rel, text).filter((tag) => tag.kind === "def")) symbols.push({ name: symbol.name, path: symbol.path, line: symbol.line, preview: symbol.preview, lang });
    }
    const fileImports = extractRepoImports(item.rel, text);
    if (fileImports.length) imports.push({ path: item.rel, lang, imports: fileImports });
  }
  const dir = repoIndexDir(root);
  mkdirSync(dir, { recursive: true });
  const index = { version: 1, root: path.basename(root), builtAt: new Date().toISOString(), files: files.length, symbols: symbols.length, imports: imports.length };
  writeFileSync(repoIndexPath(root, "index.json"), JSON.stringify(index, null, 2) + "\n");
  writeFileSync(repoIndexPath(root, "files.json"), JSON.stringify(files, null, 2) + "\n");
  writeFileSync(repoIndexPath(root, "symbols.json"), JSON.stringify(symbols, null, 2) + "\n");
  writeFileSync(repoIndexPath(root, "imports.json"), JSON.stringify(imports, null, 2) + "\n");
  return { action: "repo-index-build", ok: true, ...index, fileCount: files.length, symbolCount: symbols.length, importCount: imports.length, indexDir: path.relative(root, dir) };
}

export function repoIndexStatus(options = {}) {
  const root = rootFrom(options.cwd);
  const loaded = readRepoIndex(root);
  if (!loaded) return { action: "repo-index-status", exists: false, indexDir: path.relative(root, repoIndexDir(root)) };
  return { action: "repo-index-status", exists: true, indexDir: path.relative(root, repoIndexDir(root)), builtAt: loaded.index.builtAt, version: loaded.index.version, files: loaded.files.length, symbols: loaded.symbols.length, imports: loaded.imports.length, fileCount: loaded.files.length, symbolCount: loaded.symbols.length, importCount: loaded.imports.length };
}

function parseCodeQuery(query) {
  const filters = { text: [] };
  for (const token of String(query || "").match(/"[^"]+"|\S+/g) || []) {
    const clean = token.replace(/^"|"$/g, "");
    const idx = clean.indexOf(":");
    if (idx > 0) {
      const key = clean.slice(0, idx).toLowerCase();
      const value = clean.slice(idx + 1).toLowerCase();
      if (["symbol", "file", "path", "lang", "import", "imports"].includes(key)) {
        filters[key === "imports" ? "import" : key] = value;
        continue;
      }
    }
    if (clean) filters.text.push(clean.toLowerCase());
  }
  return filters;
}

function scoreIndexedFile(file, filters) {
  const hay = `${file.path} ${file.lang} ${file.summary}`.toLowerCase();
  if (filters.path && !file.path.toLowerCase().includes(filters.path)) return 0;
  if (filters.file && !path.basename(file.path).toLowerCase().includes(filters.file)) return 0;
  if (filters.lang && file.lang.toLowerCase() !== filters.lang) return 0;
  let score = 1;
  for (const word of filters.text) {
    if (hay.includes(word)) score += 12;
    else return 0;
  }
  return score;
}

export function codeQuery(options = {}) {
  const root = rootFrom(options.cwd);
  const query = String(options.query || options.task || "");
  if (!query) throw new Error("query is required");
  const limit = clampNumber(options.limit, 20, 1, 100);
  let loaded = readRepoIndex(root);
  let autoBuilt = false;
  if (!loaded || options.rebuild) {
    repoIndexBuild({ cwd: root, maxFiles: options.maxFiles });
    loaded = readRepoIndex(root);
    autoBuilt = true;
  }
  if (!loaded) return { action: "code-query", query, autoBuilt, results: [], error: "repo index unavailable" };
  const filters = parseCodeQuery(query);
  if (filters.lang === "markdown") filters.lang = "md";
  if (filters.lang === "javascript") filters.lang = "js";
  if (filters.lang === "typescript") filters.lang = "ts";
  if (filters.imports && !filters.import) filters.import = filters.imports;
  const results = [];
  const symbolResults = [];
  const importResults = [];
  const fileResults = [];
  for (const symbol of loaded.symbols) {
    if (filters.symbol && !symbol.name.toLowerCase().includes(filters.symbol)) continue;
    if (filters.path && !symbol.path.toLowerCase().includes(filters.path)) continue;
    if (filters.file && !path.basename(symbol.path).toLowerCase().includes(filters.file)) continue;
    if (filters.lang && symbol.lang.toLowerCase() !== filters.lang) continue;
    const hay = `${symbol.name} ${symbol.path} ${symbol.preview}`.toLowerCase();
    if (filters.text.some((word) => !hay.includes(word))) continue;
    const item = { kind: "symbol", score: filters.symbol ? 80 : 40, ...symbol };
    symbolResults.push(item);
    results.push(item);
  }
  for (const entry of loaded.imports) {
    if (!filters.import) continue;
    if (filters.path && !entry.path.toLowerCase().includes(filters.path)) continue;
    if (filters.lang && entry.lang.toLowerCase() !== filters.lang) continue;
    const matchingImports = entry.imports.filter((item) => item.toLowerCase().includes(filters.import));
    if (matchingImports.length) {
      const item = { kind: "import", path: entry.path, lang: entry.lang, imports: matchingImports, score: 55 };
      importResults.push(item);
      results.push(item);
    }
  }
  if (!filters.symbol && !filters.import) {
    for (const file of loaded.files) {
      const score = scoreIndexedFile(file, filters);
      if (score > 0) {
        const item = { kind: "file", score, ...file };
        fileResults.push(item);
        if (!results.some((result) => result.path === file.path && result.kind === "symbol")) results.push(item);
      }
    }
  }
  results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path) || String(a.name || "").localeCompare(String(b.name || "")));
  return { action: "code-query", query, autoBuilt, indexBuiltAt: loaded.index.builtAt, filters, results: results.slice(0, limit), files: fileResults.slice(0, limit), symbols: symbolResults.slice(0, limit), imports: importResults.slice(0, Math.max(limit, 200)), truncated: results.length > limit };
}

export function relatedChecks(options = {}) {
  const root = rootFrom(options.cwd);
  const paths = parseList(options.paths || options.path).map((p) => p.replace(/^\.\//, ""));
  const task = String(options.task || options.query || "").toLowerCase();
  const capabilityId = String(options.capabilityId || options.id || "");
  const pkg = existsSync(path.join(root, "package.json")) ? JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) : { scripts: {} };
  const scripts = pkg.scripts || {};
  const primary = new Set();
  const secondary = new Set();
  const reasons = [];
  const add = (set, script, reason) => {
    if (scripts[script]) { set.add(`npm run ${script}`); if (reason) reasons.push(reason); }
  };
  const hay = `${paths.join(" ")} ${task} ${capabilityId}`.toLowerCase();
  if (/tooling-actions|siso-agent-router|agent-tooling|repo search|toolrecommend|tool recommendation|tool scenario|scenario cards|docs\/tools|scenario-cards|packs\.json/.test(hay)) {
    add(primary, "smoke:agent-tooling", "agent tooling/router/tool metadata changed");
    add(primary, "smoke:tool-scenario-cards", "tool scenario cards changed");
    add(primary, "smoke:tool-packs", "tool pack metadata changed");
    add(secondary, "smoke:tool-selection-eval", "tool recommendation behavior should remain correct");
  }
  if (/tool-selection|recommend|scenario-card|tool scenario/.test(hay)) add(primary, "smoke:tool-selection-eval", "tool selection ranking changed");
  if (/capabilit|docs\/capabilities|registry\.json/.test(hay)) add(primary, "smoke:capabilities", "capability registry/docs changed");
  if (/version|release|changelog|latest\.json|package\.json|package-lock/.test(hay)) add(primary, "smoke:release", "release metadata changed");
  if (/test-space|coverage\.json|test-plan/.test(hay)) {
    add(primary, "smoke:test-space", "test-space plan/scenarios changed");
    add(primary, "smoke:test-space-coverage", "test-space coverage changed");
  }
  if (/benchmark|harness/.test(hay)) add(primary, "smoke:harness-benchmark", "benchmark plan changed");
  if (/contract/.test(hay)) add(primary, "smoke:contracts", "contracts changed");
  if (/context-manager|provider-filter|schema lazy|tool-schema/.test(hay)) {
    add(primary, "smoke:tool-schema-lazy", "lazy schema/provider filter changed");
    add(secondary, "smoke:context", "context manager changed");
    add(secondary, "smoke:context-details", "context details should remain compact");
  }
  if (/doctor|install|runtime|gateway/.test(hay)) add(primary, "smoke:doctor-readiness", "runtime/doctor readiness changed");
  if (/source-drift|canonical source|installed runtime/.test(hay)) add(primary, "smoke:source-drift", "source drift behavior changed");
  if (!primary.size) {
    add(primary, "smoke:agent-tooling", "default lightweight agent tooling check");
    add(secondary, "smoke:capabilities", "default metadata consistency check");
  }
  const full = scripts["smoke:all"] ? ["npm run smoke:all"] : [];
  return { action: "related-checks", paths, capabilityId, task: task || undefined, primary: [...primary], secondary: [...secondary].filter((c) => !primary.has(c)), full, reasons: [...new Set(reasons)].slice(0, 12) };
}

export function gatherContext(options = {}) {
  const root = rootFrom(options.cwd);
  const task = String(options.task || options.query || "");
  if (!task) throw new Error("task or query is required");
  const limit = clampNumber(options.limit ?? options.maxFiles, 5, 1, 12);
  const recommendation = toolRecommend({ cwd: root, task, limit: 4 });
  const ranked = rankedRepoMap({ cwd: root, task, limit });
  const topPaths = (ranked.files || []).slice(0, Math.min(limit, 6)).map((f) => f.path);
  const search = repoSearch({ cwd: root, query: task.split(/\s+/).filter((w) => w.length > 4).slice(0, 4).join(" ") || task, limit: 8 });
  const searchPaths = [...new Set((search.results || []).map((r) => r.path).filter(Boolean))].slice(0, 4);
  const paths = [...new Set([...parseList(options.paths), ...topPaths, ...searchPaths])].slice(0, limit);
  const files = paths.length ? readMany({ cwd: root, paths: paths.join(","), maxChars: clampNumber(options.maxChars, 12000, 1000, 40000) }) : { files: [] };
  const checks = relatedChecks({ cwd: root, paths: paths.join(","), task });
  const evidence = paths.map((p) => ({ path: p, reason: ranked.files?.find((f) => f.path === p)?.reasons?.join(", ") || "matched task search/ranking" }));
  return { action: "gather-context", task, summary: `Gathered ${evidence.length} evidence files and ${checks.primary.length} primary checks for task.`, recommendation, ranked: { files: ranked.files?.slice(0, limit), symbols: ranked.symbols?.slice(0, limit) }, search: { results: search.results?.slice(0, 8) }, evidence, files, relatedChecks: checks };
}

export function capabilitySearch(options = {}) {
  const root = rootFrom(options.cwd);
  const registry = JSON.parse(readFileSync(path.join(root, "docs", "capabilities", "registry.json"), "utf8"));
  const query = String(options.query || "").toLowerCase();
  const limit = Math.max(1, Math.min(Number(options.limit ?? 30), 100));
  const caps = registry.capabilities.filter((c) => !query || [c.id, c.name, c.status, c.category, c.priority, c.summary].join(" ").toLowerCase().includes(query)).slice(0, limit);
  return { action: "capability-search", query, results: caps.map((c) => ({ id: c.id, name: c.name, status: c.status, priority: c.priority, summary: c.summary })) };
}

export function capabilityShow(options = {}) {
  const root = rootFrom(options.cwd);
  const id = String(options.id || options.skillId || options.query || "");
  if (!id) throw new Error("id is required");
  const registryPath = path.join(root, "docs", "capabilities", "registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const cap = registry.capabilities.find((c) => c.id === id || c.name.toLowerCase() === id.toLowerCase());
  if (!cap) return { action: "capability-show", id, found: false };
  return { action: "capability-show", id, found: true, capability: cap };
}

export function capabilityAdd(options = {}) {
  const root = rootFrom(options.cwd);
  const id = String(options.id || options.skillId || "").trim();
  if (!id) throw new Error("id is required");
  const registryPath = path.join(root, "docs", "capabilities", "registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  if (registry.capabilities.some((c) => c.id === id)) throw new Error(`capability already exists: ${id}`);
  const cap = {
    id,
    name: String(options.name || options.title || id).trim(),
    status: String(options.status || "idea"),
    category: String(options.category || "agent-system"),
    priority: String(options.priority || "medium"),
    exists: Boolean(options.exists ?? false),
    summary: String(options.summary || options.content || options.query || ""),
    implementedIn: parseList(options.paths),
    validatedBy: parseList(options.validatedBy),
    releasedIn: options.releasedIn || null,
    changelogCandidate: Boolean(options.changelogCandidate ?? true),
  };
  registry.capabilities.push(cap);
  if (!options.dryRun) writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  return { action: "capability-add", dryRun: Boolean(options.dryRun), capability: cap };
}

export function capabilityUpdate(options = {}) {
  const root = rootFrom(options.cwd);
  const id = String(options.id || options.skillId || options.query || "").trim();
  if (!id) throw new Error("id is required");
  const registryPath = path.join(root, "docs", "capabilities", "registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const cap = registry.capabilities.find((c) => c.id === id);
  if (!cap) return { action: "capability-update", id, found: false };
  for (const [key, value] of Object.entries({
    name: options.name || options.title,
    status: options.status,
    category: options.category,
    priority: options.priority,
    summary: options.summary || options.content,
    releasedIn: options.releasedIn,
  })) if (value !== undefined && value !== "") cap[key] = value;
  if (options.paths !== undefined) cap.implementedIn = parseList(options.paths);
  if (options.validatedBy !== undefined) cap.validatedBy = parseList(options.validatedBy);
  if (options.exists !== undefined) cap.exists = Boolean(options.exists);
  if (options.changelogCandidate !== undefined) cap.changelogCandidate = Boolean(options.changelogCandidate);
  if (!options.dryRun) writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  return { action: "capability-update", id, found: true, dryRun: Boolean(options.dryRun), capability: cap };
}

export function capabilityAudit(options = {}) {
  const root = rootFrom(options.cwd);
  const registry = JSON.parse(readFileSync(path.join(root, "docs", "capabilities", "registry.json"), "utf8"));
  const missing = [];
  for (const cap of registry.capabilities) for (const rel of cap.implementedIn || []) if (!existsSync(path.join(root, rel))) missing.push({ id: cap.id, path: rel });
  return { action: "capability-audit", ok: missing.length === 0, count: registry.capabilities.length, missingImplementedPaths: missing };
}

export function projectMap(options = {}) {
  const root = rootFrom(options.cwd);
  const pkg = existsSync(path.join(root, "package.json")) ? JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) : null;
  const dirs = ["bin", "scripts", "extensions", "docs", "templates", "test-space"].filter((d) => existsSync(path.join(root, d)));
  return { action: "project-map", name: pkg?.name, version: pkg?.version, directories: dirs.map((d) => ({ path: d, entries: readdirSync(path.join(root, d)).slice(0, 20) })), scripts: pkg?.scripts || {} };
}

function wordsFrom(value) {
  return new Set(String(value ?? "").toLowerCase().split(/[^a-z0-9_$-]+/).filter((word) => word.length >= 3));
}

function extractSymbolTags(rel, text) {
  const lines = text.split(/\r?\n/);
  const tags = [];
  const defPatterns = [
    /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g,
    /\b(?:export\s+)?let\s+([A-Za-z_$][\w$]*)\s*=/g,
    /\b(?:export\s+)?var\s+([A-Za-z_$][\w$]*)\s*=/g,
    /^\s*def\s+([A-Za-z_][\w]*)/g,
    /^\s*class\s+([A-Za-z_][\w]*)/g,
    /^##+\s+(.+)/g,
  ];
  lines.forEach((line, index) => {
    for (const pattern of defPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line))) {
        const name = compactText(match[1], 120);
        if (name) tags.push({ kind: "def", name, path: rel, line: index + 1, preview: clip(line.trim(), 220) });
      }
    }
  });
  const seenRefs = new Set();
  for (const match of text.matchAll(/\b[A-Za-z_$][\w$]{2,}\b/g)) {
    const name = match[0];
    const key = `${name}:${Math.floor(match.index / 2000)}`;
    if (seenRefs.has(key)) continue;
    seenRefs.add(key);
    tags.push({ kind: "ref", name, path: rel });
    if (seenRefs.size > 800) break;
  }
  return tags;
}

function rankFilesWithSymbols(files, mentioned) {
  const defByName = new Map();
  const refByName = new Map();
  const fileScores = new Map(files.map((file) => [file.path, 1]));
  for (const file of files) {
    for (const tag of file.tags) {
      const target = tag.kind === "def" ? defByName : refByName;
      if (!target.has(tag.name)) target.set(tag.name, new Set());
      target.get(tag.name).add(file.path);
    }
  }
  for (const file of files) {
    const pathWords = wordsFrom(file.path);
    for (const word of mentioned) if (pathWords.has(word)) fileScores.set(file.path, fileScores.get(file.path) + 25);
    for (const tag of file.tags.filter((tag) => tag.kind === "def")) {
      const symbolWords = wordsFrom(tag.name);
      for (const word of mentioned) if (symbolWords.has(word) || tag.name.toLowerCase().includes(word)) fileScores.set(file.path, fileScores.get(file.path) + 35);
    }
  }
  for (const [name, definers] of defByName) {
    const referrers = refByName.get(name);
    if (!referrers) continue;
    const isSpecific = /[_-]/.test(name) || /[a-z][A-Z]/.test(name) || name.length >= 8;
    const weight = (mentioned.has(name.toLowerCase()) ? 15 : 1) * (isSpecific ? 5 : 1) / Math.max(1, definers.size);
    for (const definer of definers) {
      for (const referrer of referrers) {
        if (definer === referrer) continue;
        fileScores.set(definer, fileScores.get(definer) + Math.sqrt(referrers.size) * weight);
        fileScores.set(referrer, fileScores.get(referrer) + 0.2 * weight);
      }
    }
  }
  return fileScores;
}

export function rankedRepoMap(options = {}) {
  const root = rootFrom(options.cwd);
  const start = options.path || ".";
  const limit = clampNumber(options.limit, 20, 1, 100);
  const maxChars = clampNumber(options.maxChars, 12000, 1000, 50000);
  const query = String(options.query || options.task || "");
  const mentioned = wordsFrom(query);
  const files = [];
  for (const item of walk(root, start, { maxFiles: clampNumber(options.maxFiles, 2000, 50, 20000), exclude: parseList(options.exclude) })) {
    if (!item.dirent.isFile() || isSecretPath(item.rel) || !SYMBOL_EXTS.has(path.extname(item.rel).toLowerCase())) continue;
    let text = "";
    try { text = readFileSync(item.abs, "utf8"); } catch { continue; }
    if (text.length > 250_000) continue;
    const tags = extractSymbolTags(item.rel, text);
    const defs = tags.filter((tag) => tag.kind === "def");
    files.push({ path: item.rel, bytes: Buffer.byteLength(text), tags, defs });
  }
  const scores = rankFilesWithSymbols(files, mentioned);
  const ranked = files
    .map((file) => ({
      path: file.path,
      score: Number((scores.get(file.path) ?? 0).toFixed(3)),
      bytes: file.bytes,
      symbols: [...file.defs]
        .sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aHit = [...mentioned].filter((word) => aName.includes(word)).reduce((sum, word) => sum + word.length, 0);
          const bHit = [...mentioned].filter((word) => bName.includes(word)).reduce((sum, word) => sum + word.length, 0);
          return bHit - aHit || a.line - b.line;
        })
        .slice(0, 5)
        .map((tag) => ({ name: tag.name, line: tag.line, preview: tag.preview })),
    }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
  const symbols = ranked.flatMap((file) => file.symbols.map((symbol) => ({ ...symbol, path: file.path }))).slice(0, limit * 4);
  let result = {
    action: "ranked-repo-map",
    query,
    root: start,
    scannedFiles: files.length,
    files: ranked,
    symbols,
    truncated: false,
  };
  while (JSON.stringify(result).length > maxChars && result.files.length > 1) {
    result = {
      ...result,
      files: result.files.slice(0, Math.max(1, Math.floor(result.files.length * 0.75))).map((file) => ({ ...file, symbols: file.symbols.slice(0, 6) })),
      symbols: result.symbols.slice(0, Math.max(1, Math.floor(result.symbols.length * 0.75))),
      truncated: true,
      maxChars,
    };
  }
  return result;
}

export function fileOutline(options = {}) {
  const root = rootFrom(options.cwd);
  const file = String(options.path || options.query || "");
  if (!file) throw new Error("path is required");
  const { abs, rel } = safeToolPath(root, file);
  const text = readFileSync(abs, "utf8");
  const lines = text.split(/\r?\n/);
  const patterns = [
    /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/,
    /^(?:export\s+)?class\s+([A-Za-z0-9_$]+)/,
    /^(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=/,
    /^##+\s+(.+)/
  ];
  const symbols = [];
  lines.forEach((line, i) => { for (const rx of patterns) { const m = line.match(rx); if (m) { symbols.push({ line: i + 1, name: m[1], preview: line.trim() }); break; } } });
  return { action: "file-outline", path: rel, symbols };
}

export function symbolSearch(options = {}) {
  const q = String(options.query || options.name || "");
  if (!q) throw new Error("query is required");
  return repoSearch({ ...options, query: `(?:function|class|const|let|var)\\s+${q}\\b|${q}\\s*[:=]\\s*(?:async\\s*)?\\(?`, mode: "regex" });
}

export function contextPack(options = {}) {
  const search = options.query ? repoSearch({ ...options, limit: options.limit ?? 20 }) : null;
  const files = options.paths ? readMany({ ...options, maxChars: options.maxChars ?? 12000 }) : null;
  return { action: "context-pack", purpose: options.purpose || "", search, files };
}

export function briefRepo(options = {}) {
  return { action: "brief-repo", task: options.task || options.query || "", map: projectMap(options), tree: projectTree({ ...options, depth: options.depth ?? 2 }), capabilities: capabilitySearch({ ...options, query: options.query || options.task || "", limit: 10 }) };
}

export function markdownOutline(options = {}) { return fileOutline(options); }

export function docUpdate(options = {}) {
  const root = rootFrom(options.cwd);
  const file = String(options.path || "");
  const section = String(options.section || "");
  const content = String(options.content || options.query || "");
  const mode = options.mode || "append";
  if (!file || !content) throw new Error("path and content are required");
  const { abs, rel } = safeToolPath(root, file);
  let text = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  if (mode === "append") text = `${text.trimEnd()}\n\n${content}\n`;
  else if (mode === "insert-after-heading") {
    const idx = text.indexOf(section);
    if (idx < 0) throw new Error("section not found");
    const end = text.indexOf("\n", idx);
    text = `${text.slice(0, end + 1)}${content}\n${text.slice(end + 1)}`;
  } else if (mode === "replace-section") {
    const idx = text.indexOf(section);
    if (idx < 0) throw new Error("section not found");
    const next = text.slice(idx + section.length).search(/\n##+\s/);
    const end = next < 0 ? text.length : idx + section.length + next;
    text = `${text.slice(0, idx)}${section}\n${content}\n${text.slice(end)}`;
  } else throw new Error(`unsupported doc update mode: ${mode}`);
  if (!options.dryRun) awaitWrite(abs, text);
  return { action: "doc-update", path: rel, dryRun: Boolean(options.dryRun), bytes: text.length };
}

function awaitWrite(abs, text) {
  writeFileSync(abs, text);
}

export function applyPatch(options = {}) {
  const root = rootFrom(options.cwd);
  const patches = Array.isArray(options.patches) ? options.patches : [];
  if (!patches.length) throw new Error("patches are required");
  const prepared = patches.map((p) => {
    const { abs, rel } = safeToolPath(root, p.path);
    const oldText = String(p.oldText ?? "");
    const newText = String(p.newText ?? "");
    const text = readFileSync(abs, "utf8");
    const count = oldText ? text.split(oldText).length - 1 : 0;
    if (count !== 1) throw new Error(`${rel} expected exactly one match, found ${count}`);
    return { abs, rel, text, oldText, newText };
  });
  if (!options.dryRun) for (const p of prepared) awaitWrite(p.abs, p.text.replace(p.oldText, p.newText));
  return { action: "apply-patch", dryRun: Boolean(options.dryRun), changed: prepared.map((p) => p.rel) };
}

export function toolInventory(options = {}) {
  const root = rootFrom(options.cwd);
  const cardsDoc = loadScenarioCards(root);
  const packsDoc = loadToolPacks(root);
  const domain = String(options.domain || options.kind || "").toLowerCase();
  const loaded = getLoadedToolState(root);
  const cards = cardsDoc.cards
    .filter((c) => !domain || c.workflowStages.some((s) => s.toLowerCase() === domain) || c.id.includes(domain) || c.tool.toLowerCase().includes(domain))
    .filter((c) => !options.loadedOnly || loaded.toolIds.includes(c.id))
    .map(compactScenarioCard);
  const packs = packsDoc.packs
    .filter((p) => !domain || p.id.includes(domain) || p.summary.toLowerCase().includes(domain))
    .filter((p) => !options.loadedOnly || loaded.packIds.includes(p.id))
    .map(compactToolPack);
  return { action: "tool-inventory", count: cards.length, cards, packs, loaded, ...(cardsDoc.missing ? { missingScenarioCards: true } : {}) };
}

export function toolSearch(options = {}) {
  const root = rootFrom(options.cwd);
  const query = String(options.query || options.task || "").toLowerCase();
  if (!query) throw new Error("query is required");
  const limit = Math.max(1, Math.min(Number(options.limit ?? 5), 20));
  const cardsDoc = loadScenarioCards(root);
  const packsDoc = loadToolPacks(root);
  const scored = cardsDoc.cards
    .map((card) => ({ card, score: scoreScenarioCard(card, query), reason: scenarioReason(card, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
    .slice(0, limit)
    .map((x) => ({ ...compactScenarioCard(x.card), score: x.score, reason: x.reason }));
  const packs = packsDoc.packs
    .map((pack) => ({ pack, score: scoreToolPack(pack, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.pack.id.localeCompare(b.pack.id))
    .slice(0, Math.min(3, limit))
    .map((x) => ({ ...compactToolPack(x.pack), score: x.score }));
  return { action: "tool-search", query, results: scored, packs, ...(cardsDoc.missing ? { missingScenarioCards: true } : {}) };
}

export function toolShow(options = {}) {
  const root = rootFrom(options.cwd);
  const id = String(options.id || options.query || "");
  if (!id) throw new Error("id is required");
  const cardsDoc = loadScenarioCards(root);
  const packsDoc = loadToolPacks(root);
  const card = cardsDoc.cards.find((c) => c.id === id || c.tool === id);
  if (card) return { action: "tool-show", found: true, type: "tool", card };
  const pack = packsDoc.packs.find((p) => p.id === id);
  return pack ? { action: "tool-show", found: true, type: "pack", pack } : { action: "tool-show", found: false, id, ...(cardsDoc.missing ? { missingScenarioCards: true } : {}) };
}

export function toolRecommend(options = {}) {
  const task = String(options.task || options.query || "").toLowerCase();
  if (!task) throw new Error("task or query is required");
  const limit = Math.max(1, Math.min(Number(options.limit ?? 5), 10));
  const root = rootFrom(options.cwd);
  const cardsDoc = loadScenarioCards(root);
  const packsDoc = loadToolPacks(root);
  const taskIntent = inferTaskIntent(task);
  const scoredCards = cardsDoc.cards
    .map((card) => ({ card, score: scoreRecommendationCard(card, task), reason: scenarioReason(card, task) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
    .slice(0, limit)
    .map((x) => ({
      ...compactScenarioCard(x.card),
      score: x.score,
      reason: x.reason || `Matches ${taskIntent} scenario.`,
      useFirst: x.card.tool,
      when: x.card.useWhen?.[0] || x.card.summary,
      avoid: x.card.avoidWhen?.[0] || "Avoid when a narrower or safer tool directly matches the task.",
    }));
  const packRecommendations = packsDoc.packs
    .map((pack) => ({ pack, score: scoreToolPack(pack, task) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.pack.id.localeCompare(b.pack.id))
    .slice(0, 3)
    .map((x) => ({ id: x.pack.id, type: "pack", score: x.score, reason: x.pack.useWhen?.[0] || x.pack.summary, useFirst: x.pack.firstTool, contains: x.pack.contains || [] }));
  const notRecommended = [];
  if (!/(fail|failing|error|test|smoke|repair|fix|verify|check)/i.test(task)) notRecommended.push({ id: "run-check", reason: "No failing check or validation request is present yet." });
  if (!/(change|edit|patch|write|update|fix|implement)/i.test(task)) notRecommended.push({ id: "apply-patch", reason: "Task does not require editing files." });
  const result = { action: "tool-recommend", taskIntent, packRecommendations, recommendations: scoredCards, notRecommended, ...(cardsDoc.missing ? { missingScenarioCards: true } : {}) };
  appendToolTelemetry(root, { event: "recommend", task, taskIntent, recommendedTools: scoredCards.map((r) => r.tool), recommendedPacks: packRecommendations.map((r) => r.id) });
  return result;
}

export function toolLoad(options = {}) {
  const root = rootFrom(options.cwd);
  const cardsDoc = loadScenarioCards(root);
  const packsDoc = loadToolPacks(root);
  const toolIds = parseList(options.toolIds || options.id || options.query);
  const packIds = parseList(options.packIds || options.packId);
  if (!toolIds.length && !packIds.length) throw new Error("toolIds or packIds are required");
  const validToolIds = new Set(cardsDoc.cards.map((c) => c.id));
  const validPackIds = new Set(packsDoc.packs.map((p) => p.id));
  for (const id of toolIds) if (!validToolIds.has(id)) throw new Error(`unknown tool card: ${id}`);
  for (const id of packIds) if (!validPackIds.has(id)) throw new Error(`unknown tool pack: ${id}`);
  const loaded = getLoadedToolState(root);
  loaded.toolIds = sortedUnique([...loaded.toolIds, ...toolIds]);
  loaded.packIds = sortedUnique([...loaded.packIds, ...packIds]);
  loaded.updatedAt = new Date().toISOString();
  loaded.reason = String(options.reason || options.task || "manual load");
  loaded.ttlTurns = Number(options.ttlTurns ?? loaded.ttlTurns ?? 6);
  if (!options.dryRun) writeLoadedToolState(root, loaded);
  appendToolTelemetry(root, { event: "load", toolIds: loaded.toolIds, packIds: loaded.packIds, reason: loaded.reason, dryRun: Boolean(options.dryRun) });
  return { action: "tool-load", dryRun: Boolean(options.dryRun), loaded };
}

export function toolUnload(options = {}) {
  const root = rootFrom(options.cwd);
  const toolIds = parseList(options.toolIds || options.id || options.query);
  const packIds = parseList(options.packIds || options.packId);
  const loaded = getLoadedToolState(root);
  loaded.toolIds = toolIds.length ? loaded.toolIds.filter((id) => !toolIds.includes(id)) : loaded.toolIds;
  loaded.packIds = packIds.length ? loaded.packIds.filter((id) => !packIds.includes(id)) : loaded.packIds;
  if (!toolIds.length && !packIds.length) {
    loaded.toolIds = [];
    loaded.packIds = [];
  }
  loaded.updatedAt = new Date().toISOString();
  if (!options.dryRun) writeLoadedToolState(root, loaded);
  appendToolTelemetry(root, { event: "unload", toolIds, packIds, dryRun: Boolean(options.dryRun), remainingToolIds: loaded.toolIds, remainingPackIds: loaded.packIds });
  return { action: "tool-unload", dryRun: Boolean(options.dryRun), loaded };
}

function compactScenarioCard(card) {
  return {
    id: card.id,
    tool: card.tool,
    summary: card.summary,
    workflowStages: card.workflowStages,
    useWhen: card.useWhen.slice(0, 2),
    avoidWhen: card.avoidWhen.slice(0, 2),
    validationCommands: card.validationCommands,
  };
}

export function toolStats(options = {}) {
  const root = rootFrom(options.cwd);
  const telemetry = readToolTelemetry(root);
  const counts = {};
  const recommendedTools = {};
  const recommendedPacks = {};
  for (const event of telemetry) {
    counts[event.event] = (counts[event.event] || 0) + 1;
    for (const tool of event.recommendedTools || []) recommendedTools[tool] = (recommendedTools[tool] || 0) + 1;
    for (const pack of event.recommendedPacks || event.packIds || []) recommendedPacks[pack] = (recommendedPacks[pack] || 0) + 1;
  }
  return { action: "tool-stats", events: telemetry.length, counts, recommendedTools, recommendedPacks, recent: telemetry.slice(-10) };
}

function appendToolTelemetry(root, event) {
  if (event.dryRun)
    return;
  const dir = path.join(root, ".siso");
  mkdirSync(dir, { recursive: true });
  const p = path.join(dir, "tool-telemetry.jsonl");
  writeFileSync(p, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n", { flag: "a" });
}

function readToolTelemetry(root) {
  const p = path.join(root, ".siso", "tool-telemetry.jsonl");
  if (!existsSync(p))
    return [];
  return readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(-200).map((line) => {
    try { return JSON.parse(line); } catch { return { event: "parse-error" }; }
  });
}

function compactToolPack(pack) {
  return {
    id: pack.id,
    summary: pack.summary,
    useWhen: (pack.useWhen || []).slice(0, 2),
    avoidWhen: (pack.avoidWhen || []).slice(0, 2),
    contains: pack.contains || [],
    firstTool: pack.firstTool,
    fallbackTool: pack.fallbackTool,
    nextPacks: pack.nextPacks || [],
  };
}

function loadToolPacks(root) {
  const p = path.join(root, "docs", "tools", "packs.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : { packs: [] };
}

function loadScenarioCards(root) {
  const p = path.join(root, "docs", "tools", "scenario-cards.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : { cards: [], missing: true };
}

function loadedToolStatePath(root) {
  return path.join(root, ".siso", "tool-state.json");
}

function getLoadedToolState(root) {
  const p = loadedToolStatePath(root);
  if (!existsSync(p)) return { toolIds: [], packIds: [], updatedAt: null, ttlTurns: 6 };
  try {
    const state = JSON.parse(readFileSync(p, "utf8"));
    return { toolIds: state.toolIds || [], packIds: state.packIds || [], updatedAt: state.updatedAt || null, ttlTurns: state.ttlTurns ?? 6, reason: state.reason || "" };
  } catch {
    return { toolIds: [], packIds: [], updatedAt: null, ttlTurns: 6 };
  }
}

function writeLoadedToolState(root, state) {
  const p = loadedToolStatePath(root);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(state, null, 2) + "\n");
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function scoreRecommendationCard(card, query) {
  const id = card.id;
  const tool = card.tool;
  let score = Math.min(scoreScenarioCard(card, query), 12);
  if (/(find|where|locate|search|reference|implemented|implementation|router|action)/.test(query)) {
    if (["repoSearch", "briefRepo", "contextPack", "rankedRepoMap", "symbolSearch"].includes(tool)) score += 30;
    if (["runCheck", "workspaceDiff", "workspaceStatus", "doctorReadiness"].includes(tool)) score -= 30;
  }
  if (/(read|open|inspect|contents).*(package\.json|version|file)|package\.json|version/.test(query)) {
    if (tool === "readMany") score += 40;
    if (["repoSearch", "runCheck"].includes(tool)) score -= 35;
  }
  if (/(fail|failing|error|smoke|test|run|check|summarize)/.test(query)) {
    if (tool === "runCheck") score += 45;
    if (["workspaceDiff", "capabilitySearch"].includes(tool)) score -= 35;
  }
  if (/(autopilot|verifier|verify.*spec|specification.*verif|post[- ]implementation|minimax|feedback packet|worker says.*done)/.test(query)) {
    if (tool === "autopilotPlan") score += 65;
    if (["repoSearch", "readMany"].includes(tool)) score -= 45;
  }
  if (/(changed|diff|review|summary|final response)/.test(query)) {
    if (["workspaceStatus", "workspaceDiff"].includes(tool)) score += 45;
    if (["repoSearch", "doctorReadiness"].includes(tool)) score -= 35;
  }
  if (/(capability|registry|already have|exists|before building)/.test(query)) {
    if (tool === "capabilitySearch") score += 50;
    if (["runCheck", "workspaceDiff", "doctorReadiness", "workspaceStatus", "sourceDrift"].includes(tool)) score -= 60;
  }
  if (/(runtime health|gateway|install doctor|doctor status|readiness)/.test(query)) {
    if (tool === "doctorReadiness") score += 50;
    if (["repoSearch", "readMany"].includes(tool)) score -= 40;
  }
  if (/(stale|drift|installed runtime|canonical source)/.test(query)) {
    if (tool === "sourceDrift") score += 50;
    if (["repoSearch", "capabilitySearch"].includes(tool)) score -= 40;
  }
  if (/(contract|contracts|contract drift|validation expectations)/.test(query)) {
    if (tool === "contractDiff") score += 50;
    if (tool === "doctorReadiness") score -= 40;
  }
  if (/public|github|sourcegraph|external/.test(query) && tool === "publicCodeSearch") score += 35;
  return Math.max(0, score);
}

function scoreToolPack(pack, query) {
  const hay = [pack.id, pack.summary, ...(pack.useWhen || []), ...(pack.avoidWhen || []), ...(pack.contains || [])].join(" ").toLowerCase();
  const words = query.split(/[^a-z0-9:_-]+/).filter((w) => w.length > 2);
  let score = 0;
  for (const w of words) if (hay.includes(w)) score += 2;
  if (/(find|search|where|locate|understand|inspect|code|repo)/.test(query) && pack.id === "repo-navigation") score += 10;
  if (/(test|smoke|check|verify|fail|failing|diff|status|review)/.test(query) && pack.id === "workspace-validation") score += 10;
  if (/(doc|docs|capability|registry|changelog|release|contract)/.test(query) && pack.id === "docs-capabilities") score += 10;
  if (/(doctor|runtime|install|gateway|drift|readiness)/.test(query) && pack.id === "operations-readiness") score += 10;
  return score;
}

function scoreScenarioCard(card, query) {
  const hay = [card.id, card.tool, card.summary, ...(card.workflowStages || []), ...(card.useWhen || []), ...(card.avoidWhen || []), ...(card.replacesShellPatterns || []), ...(card.failureModes || [])].join(" ").toLowerCase();
  const words = query.split(/[^a-z0-9:_-]+/).filter((w) => w.length > 2);
  let score = 0;
  for (const w of words) if (hay.includes(w)) score += 2;
  if (/(find|search|where|locate|grep|rg|reference)/.test(query) && /search|symbol|brief|context/.test(card.id)) score += 8;
  if (/(internet|public|github|sourcegraph|open[- ]?source|external|steal|pattern|other repos?)/.test(query) && /public-code/.test(card.id)) score += 12;
  if (/(map|rank|relevant|symbols?|files?|where.*start|understand|explore|repo)/.test(query) && /ranked-repo-map/.test(card.id)) score += 12;
  if (/(read|inspect|open|contents|file)/.test(query) && /read|outline|context/.test(card.id)) score += 6;
  if (/(test|smoke|check|verify|fail|failing|error)/.test(query) && /run-check|doctor|drift|contract|workspace/.test(card.id)) score += 8;
  if (/(autopilot|verifier|verify.*spec|specification|minimax|feedback)/.test(query) && /autopilot-plan/.test(card.id)) score += 14;
  if (/(diff|status|changed|review)/.test(query) && /workspace|contract/.test(card.id)) score += 8;
  if (/(capability|registry|feature|exists)/.test(query) && /capability/.test(card.id)) score += 8;
  if (/(doctor|install|runtime|gateway|readiness)/.test(query) && /doctor/.test(card.id)) score += 8;
  if (/(drift|stale|source|installed)/.test(query) && /source-drift/.test(card.id)) score += 8;
  return score;
}

function scenarioReason(card, query) {
  if ((card.useWhen || []).some((u) => query.split(/\s+/).some((w) => w.length > 3 && u.toLowerCase().includes(w)))) return card.useWhen[0];
  return `Scenario metadata matches task terms for ${card.tool}.`;
}

function inferTaskIntent(task) {
  if (/(fail|failing|error|test|smoke|verify|check)/.test(task)) return "verification/debugging";
  if (/(change|edit|patch|write|implement|fix)/.test(task)) return "implementation";
  if (/(find|where|search|locate|understand|inspect)/.test(task)) return "codebase exploration";
  if (/(doc|changelog|capability|release)/.test(task)) return "documentation/release";
  return "general tool selection";
}

export function formatToolResult(result) {
  if (result.action === "autopilot-plan") return [
    `autopilot_plan run=${result.autopilotRunId} verifier=${result.roles?.verifier?.profile} readOnly=${result.roles?.verifier?.readOnly} iterations=${result.controller?.maxIterations}`,
    `scope session=${result.eventScope?.sessionId} thread=${result.eventScope?.threadId} visibility=${result.eventScope?.visibility}`,
    `objective=${result.objective}`,
    `checks=${(result.requiredChecks || []).length}`,
    ...(result.requiredChecks || []).map((check) => `- ${check.blocked ? "blocked" : "check"}: ${check.command}${check.unsafeReason ? ` (${check.unsafeReason})` : ""}`),
    `phases=${(result.phases || []).map((phase) => phase.id).join(" -> ")}`,
    `flight=${result.flightRecorder?.path}`,
  ].join("\n");
  if (result.action === "repo-index-build") return `repo index built: files=${result.fileCount} symbols=${result.symbolCount} imports=${result.importCount} dir=${result.indexDir}`;
  if (result.action === "repo-index-status") return result.exists ? `repo index: files=${result.fileCount} symbols=${result.symbolCount} imports=${result.importCount} updated=${result.updatedAt}` : `repo index missing at ${result.indexDir}`;
  if (result.action === "code-query") return [
    `code query: ${result.query}`,
    ...(result.symbols || []).map((s) => `symbol ${s.name} ${s.kind} ${s.path}:${s.line}`),
    ...(result.files || []).map((f) => `file ${f.path} ${f.language} ${f.bytes}b`),
    ...(result.imports || []).map((i) => `import ${i.target} ${i.path}:${i.line}`),
  ].slice(0, 80).join("\n") || "no results";
  if (result.action === "related-checks") return [
    "primary:",
    ...(result.primary || []).map((c) => `- ${c}`),
    "secondary:",
    ...(result.secondary || []).map((c) => `- ${c}`),
    ...(result.full?.length ? ["full:", ...result.full.map((c) => `- ${c}`)] : []),
    ...(result.reasons?.length ? ["reasons:", ...result.reasons.map((r) => `- ${r}`)] : []),
  ].join("\n");
  if (result.action === "gather-context") return [
    result.summary,
    "evidence:",
    ...(result.evidence || []).map((e) => `- ${e.path}: ${e.reason}`),
    "primary checks:",
    ...(result.relatedChecks?.primary || []).map((c) => `- ${c}`),
  ].join("\n");
  if (result.action === "repo-index-build") return `repo_index_build ok=${result.ok} files=${result.files} symbols=${result.symbols} imports=${result.imports} dir=${result.indexDir}`;
  if (result.action === "repo-index-status") return result.exists
    ? `repo_index_status exists=true files=${result.files} symbols=${result.symbols} imports=${result.imports} builtAt=${result.builtAt}`
    : `repo_index_status exists=false dir=${result.indexDir}`;
  if (result.action === "code-query") return [
    `code_query results=${result.results?.length || 0} autoBuilt=${result.autoBuilt} truncated=${result.truncated}`,
    ...(result.results || []).map((r) => r.kind === "symbol"
      ? `${r.path}:${r.line}: ${r.name}`
      : r.kind === "import"
        ? `${r.path}: imports ${r.imports.join(", ")}`
        : `${r.path}: ${r.summary}`),
  ].join("\n");
  if (result.action === "autopilot-fix-loop") return [
    `autopilot_fix_loop outcome=${result.outcome} ok=${result.ok} iterations=${result.iterations?.length || 0}`,
    `command=${result.command}`,
    ...(result.failureSummary ? [`failure=${result.failureSummary}`] : []),
    ...(result.suggestedNextActions?.length ? ["next:", ...result.suggestedNextActions.map((item) => `- ${item}`)] : []),
  ].join("\n");
  if (result.action === "tool-recommend") return [
    `taskIntent=${result.taskIntent}`,
    ...result.recommendations.map((r) => `${r.id} (${r.tool}) score=${r.score}: ${r.reason}\n  use: ${r.when}\n  avoid: ${r.avoid}`),
    ...(result.notRecommended?.length ? ["not recommended:", ...result.notRecommended.map((r) => `- ${r.id}: ${r.reason}`)] : []),
  ].join("\n");
  if (result.action === "tool-search" || result.action === "tool-inventory") return (result.results || result.cards || []).map((r) => `${r.id} (${r.tool}): ${r.summary}\n  use: ${(r.useWhen || [])[0] || ""}\n  avoid: ${(r.avoidWhen || [])[0] || ""}`).join("\n") || "no tools";
  if (result.action === "tool-show") return result.found ? JSON.stringify(result.card, null, 2) : `tool not found: ${result.id}`;
  if (result.action === "public-code-search") return result.ok === false
    ? `public code search failed status=${result.status}: ${result.error}`
    : [
      `public_code_search source=${result.source} matches=${result.matchCount} results=${result.resultCount} limitHit=${result.limitHit}`,
      ...(result.results || []).flatMap((r) => [
        `${r.repo}/${r.path}`,
        ...(r.matches || []).map((m) => `  ${m.line}: ${m.preview}`),
        r.url ? `  ${r.url}` : "",
      ].filter(Boolean)),
    ].join("\n") || "no results";
  if (result.action === "ranked-repo-map") return [
    `ranked_repo_map scanned=${result.scannedFiles} files=${result.files.length} truncated=${result.truncated}`,
    ...(result.files || []).map((file) => [
      `${file.path} score=${file.score}`,
      ...(file.symbols || []).slice(0, 6).map((symbol) => `  ${symbol.line}: ${symbol.name}`),
    ].join("\n")),
  ].join("\n");
  if (result.text) return result.text;
  if (result.files) return result.files.map((f) => f.ok ? `## ${f.path}\n${f.text}` : `## ${f.path}\nERROR: ${f.error}`).join("\n\n");
  if (result.results) return result.results.map((r) => r.line ? `${r.path}:${r.line}: ${r.preview}` : `${r.id || r.path} ${r.name || ""} ${r.status || ""} ${r.summary || ""}`.trim()).join("\n") || "no results";
  if (result.symbols) return result.symbols.map((s) => `${s.line}: ${s.preview}`).join("\n") || "no symbols";
  if (result.summary) return result.summary;
  return JSON.stringify(result, null, 2);
}
