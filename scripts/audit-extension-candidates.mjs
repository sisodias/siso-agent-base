#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_CATALOG = path.join(ROOT, "data", "extensions", "extension-catalog.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "strategy", "extension-audits");
const DEFAULT_CANDIDATES = [
  "pi-subagents",
  "context-mode",
  "pi-hermes-memory",
  "@samfp/pi-memory",
  "pi-mcp-adapter",
  "pi-lens",
  "@juicesharp/rpiv-todo",
  "pi-web-access",
];

const SISO_BASELINES = {
  "pi-subagents": "SISO already owns Bifrost profile routing, scoped child records, task registry, native subagent bridge, and workflow-layer fan-out.",
  "context-mode": "SISO already owns provider-payload filtering, context capture, typed memory, librarian distillation, and retrieval pointers.",
  "pi-hermes-memory": "SISO already has JSONL event capture, memory items, typed central memory, project memory promotion, and retrieval pointers.",
  "@samfp/pi-memory": "SISO has memory capture and project memory, but does not yet have a polished preference-learning product surface.",
  "pi-mcp-adapter": "SISO has router tools and Codex app/plugin access, but no broad Pi MCP import compatibility layer.",
  "pi-lens": "SISO has repo search, repo index, code query, file outlines, and public code search, but not live LSP/lint/typecheck diagnostics.",
  "@juicesharp/rpiv-todo": "SISO has durable task store and scoped task records, but the visible todo/task UX is still basic.",
  "pi-web-access": "SISO can use available web/browser tools, but does not own a Pi-native all-in-one web/PDF/GitHub/YouTube package.",
};

function parseArgs(argv) {
  const args = { catalog: DEFAULT_CATALOG, out: DEFAULT_OUT, candidates: DEFAULT_CANDIDATES, refresh: false };
  for (const arg of argv) {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    if (key === "catalog") args.catalog = path.resolve(value);
    if (key === "out") args.out = path.resolve(value);
    if (key === "candidates") args.candidates = value.split(",").map((item) => item.trim()).filter(Boolean);
    if (key === "refresh") args.refresh = value !== "false";
  }
  return args;
}

function safeFileName(name) {
  return name.replace(/^@/, "").replace(/[\/\\]/g, "__").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function loadCatalog(catalogPath) {
  const parsed = JSON.parse(readFileSync(catalogPath, "utf8"));
  return Array.isArray(parsed.packages) ? parsed.packages : [];
}

function findPackage(packages, name) {
  return packages.find((pkg) => pkg.name === name || pkg.id === name || pkg.id === `pi.dev:${name}`);
}

async function npmMeta(name, fetchImpl = globalThis.fetch) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name).replace(/^%40/, "@")}`;
  const res = await fetchImpl(url, { headers: { "user-agent": "siso-extension-audit/1.0" } });
  if (!res.ok) return { ok: false, status: res.status, url };
  const data = await res.json();
  const latest = data["dist-tags"]?.latest;
  const version = latest ? data.versions?.[latest] : undefined;
  return { ok: true, url, latest, data, version };
}

function count(obj) {
  return obj && typeof obj === "object" ? Object.keys(obj).length : 0;
}

function scripts(meta) {
  const value = meta.version?.scripts;
  return value && typeof value === "object" ? value : {};
}

function riskNotes(pkg, meta) {
  const notes = [...(pkg.risk?.reasons ?? [])];
  const scriptKeys = Object.keys(scripts(meta));
  if (scriptKeys.some((key) => /preinstall|install|postinstall|prepare/i.test(key))) notes.push(`npm lifecycle scripts: ${scriptKeys.join(", ")}`);
  if (meta.version?.bin) notes.push("declares CLI/bin entrypoints");
  if (!pkg.repoUrl || pkg.repoUrl.includes("issues/new")) notes.push("missing usable source repo link");
  if (pkg.piManifest?.extensions?.length) notes.push("Pi manifest declares extension entrypoints");
  return [...new Set(notes)];
}

function recommendation(pkg, meta) {
  const risks = riskNotes(pkg, meta);
  if (pkg.name === "pi-subagents") return "Fork/copy patterns. Do not let it own SISO child routing.";
  if (pkg.name === "context-mode") return "Fork/copy retrieval and FTS ideas after source review. Keep provider filtering in SISO core.";
  if (pkg.name === "pi-mcp-adapter") return "Audit as compatibility adapter. Keep permissions and tool exposure in SISO core.";
  if (risks.length >= 5) return "Copy pattern or fork only after deeper source review.";
  if ((pkg.sisoFit?.score ?? 0) >= 90 && risks.length <= 3) return "Candidate for controlled approval, then profile/tool-pack activation.";
  return "Watch or copy selected ideas.";
}

function auditMarkdown(pkg, meta) {
  const scriptRows = Object.entries(scripts(meta)).map(([key, value]) => `- \`${key}\`: \`${String(value)}\``);
  const risks = riskNotes(pkg, meta);
  return [
    `# ${pkg.name} Extension Audit`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Catalog",
    "",
    `- Package: \`${pkg.name}\``,
    `- Pi URL: ${pkg.packageUrl}`,
    `- npm URL: ${pkg.npmUrl ?? "missing"}`,
    `- Repo: ${pkg.repoUrl ?? "missing"}`,
    `- Types: ${(pkg.types ?? []).join(", ") || "package"}`,
    `- Downloads/month: ${pkg.downloadsMonthly ?? "unknown"}`,
    `- SISO score: ${pkg.sisoFit?.score ?? 0}`,
    `- Catalog risk: ${pkg.risk?.score ?? 0}`,
    `- Catalog recommendation: ${pkg.recommendation}`,
    "",
    "## npm Registry",
    "",
    `- Registry status: ${meta.ok ? "ok" : `failed ${meta.status}`}`,
    `- Latest version: ${meta.latest ?? pkg.version ?? "unknown"}`,
    `- License: ${meta.version?.license ?? pkg.license ?? "unknown"}`,
    `- Dependencies: ${count(meta.version?.dependencies)}`,
    `- Peer dependencies: ${count(meta.version?.peerDependencies)}`,
    `- Optional dependencies: ${count(meta.version?.optionalDependencies)}`,
    `- Bin entrypoints: ${meta.version?.bin ? JSON.stringify(meta.version.bin) : "none"}`,
    "",
    "## npm Scripts",
    "",
    scriptRows.length ? scriptRows.join("\n") : "No scripts declared in latest npm metadata.",
    "",
    "## Pi Manifest",
    "",
    "```json",
    JSON.stringify(pkg.piManifest ?? {}, null, 2),
    "```",
    "",
    "## SISO Baseline",
    "",
    SISO_BASELINES[pkg.name] ?? "No direct SISO baseline recorded yet.",
    "",
    "## Risks",
    "",
    risks.length ? risks.map((item) => `- ${item}`).join("\n") : "- No major risk markers from metadata. Source still needs review.",
    "",
    "## Recommendation",
    "",
    recommendation(pkg, meta),
    "",
    "## Required Before Install",
    "",
    "```bash",
    `npm view ${pkg.name} --json`,
    `npm pack ${pkg.name}`,
    `tar -tf ${pkg.name.replace("/", "-")}-*.tgz | sed -n '1,200p'`,
    "```",
    "",
  ].join("\n");
}

function matrixMarkdown(rows) {
  return [
    "# SISO Extension Audit Matrix",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Package | Area | Score | Risk | Downloads | Decision | What to take |",
    "|---|---|---:|---:|---:|---|---|",
    ...rows.map(({ pkg, meta }) => `| [${pkg.name}](${pkg.packageUrl}) | ${(pkg.categories ?? []).slice(0, 2).join(", ")} | ${pkg.sisoFit?.score ?? 0} | ${pkg.risk?.score ?? 0} | ${pkg.downloadsMonthly ?? 0} | ${recommendation(pkg, meta).replace(/\|/g, "/")} | ${(SISO_BASELINES[pkg.name] ?? "Compare against SISO local implementation.").replace(/\|/g, "/")} |`),
    "",
    "## Harness Rule",
    "",
    "Index thousands of packages, audit hundreds, install tens, activate single digits per session.",
    "",
  ].join("\n");
}

export async function generateExtensionAudits(options = {}) {
  const args = { ...parseArgs([]), ...options };
  const packages = loadCatalog(args.catalog);
  mkdirSync(args.out, { recursive: true });
  const rows = [];
  for (const name of args.candidates) {
    const pkg = findPackage(packages, name);
    if (!pkg) continue;
    const meta = await npmMeta(pkg.name, args.fetchImpl ?? globalThis.fetch);
    rows.push({ pkg, meta });
    writeFileSync(path.join(args.out, `${safeFileName(pkg.name)}.md`), auditMarkdown(pkg, meta));
  }
  writeFileSync(path.join(args.out, "matrix.md"), matrixMarkdown(rows));
  return { out: args.out, count: rows.length, packages: rows.map((row) => row.pkg.name) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateExtensionAudits(parseArgs(process.argv.slice(2)));
  console.log(`SISO_EXTENSION_AUDITS_BUILT count=${result.count} out=${result.out}`);
}
