#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE_URL = "https://pi.dev";
const DEFAULT_OUT = path.join(ROOT, "data", "extensions");
const CATEGORY_RULES = [
  { id: "agent-orchestration", terms: ["subagent", "subagents", "agent", "agents", "delegate", "delegation", "parallel", "worker", "crew", "swarm", "orchestration", "workflow", "planner"] },
  { id: "memory-context", terms: ["memory", "context", "session", "sessions", "recall", "history", "compress", "token", "tokens", "handoff", "knowledge"] },
  { id: "web-research", terms: ["web", "search", "fetch", "browser", "chrome", "research", "pdf", "youtube", "scrape", "url"] },
  { id: "mcp-integrations", terms: ["mcp", "model context protocol", "notion", "obsidian", "convex", "slack", "discord", "telegram", "whatsapp", "integration"] },
  { id: "code-intelligence", terms: ["lsp", "lint", "type", "types", "symbol", "code", "grep", "ast", "tree-sitter", "review", "diff"] },
  { id: "safety-permissions", terms: ["permission", "permissions", "security", "safety", "guard", "sandbox", "policy", "secret", "rollback"] },
  { id: "ui-dashboard", terms: ["ui", "dashboard", "kanban", "board", "studio", "webui", "status", "footer", "preview", "markdown"] },
  { id: "task-workflow", terms: ["task", "tasks", "todo", "plan", "planning", "tdd", "validate", "execute", "gsd", "pipeline"] },
  { id: "developer-tools", terms: ["tool", "tools", "shell", "terminal", "tmux", "process", "git", "apply", "patch", "dev"] },
  { id: "models-providers", terms: ["model", "models", "provider", "openai", "anthropic", "ollama", "llama", "gateway", "router"] },
];
const HIGH_RISK_TERMS = ["shell", "exec", "execute", "filesystem", "file system", "write", "permission", "browser", "chrome", "websocket", "server", "daemon", "mcp", "token", "secret", "system prompt"];

function parseArgs(argv) {
  const args = { pages: 47, detailLimit: "150", out: DEFAULT_OUT, fixtureDir: "", refresh: false, concurrency: 8 };
  for (const arg of argv) {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    if (key === "pages") args.pages = Number(value);
    if (key === "detail-limit") args.detailLimit = value;
    if (key === "out") args.out = path.resolve(value);
    if (key === "fixture-dir") args.fixtureDir = path.resolve(value);
    if (key === "refresh") args.refresh = value !== "false";
    if (key === "concurrency") args.concurrency = Math.max(1, Math.min(Number(value) || 8, 20));
  }
  return args;
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function attr(block, name) {
  const match = block.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? decodeHtml(match[1]) : undefined;
}

function textMatch(block, rx) {
  const match = block.match(rx);
  return match ? stripTags(match[1]) : undefined;
}

function numberFrom(value) {
  const text = String(value ?? "").replace(/,/g, "").trim().toLowerCase();
  if (!text || text === "not available") return undefined;
  const match = text.match(/([\d.]+)\s*([km])?/);
  if (!match) return undefined;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * (match[2] === "k" ? 1000 : match[2] === "m" ? 1000000 : 1));
}

function absoluteUrl(href) {
  if (!href) return undefined;
  return new URL(href, BASE_URL).href;
}

function packageId(name) {
  return `pi.dev:${name}`;
}

function parseTypes(value = "") {
  return [...new Set(String(value).split(/[,\s]+/).map((item) => item.trim()).filter(Boolean))];
}

function parseCatalogPage(html, page) {
  const articles = html.match(/<article\b[\s\S]*?<\/article>/gi) ?? [];
  return articles.filter((block) => block.includes("data-package-card")).map((block) => {
    const name = attr(block, "data-package-name") ?? textMatch(block, /<h3[^>]*class="packages-name"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) ?? "";
    const packagePath = attr(block, "data-package-path") ?? block.match(/href="(\/packages\/[^"]+)"/)?.[1];
    const meta = [...block.matchAll(/<div class="packages-meta">([\s\S]*?)<\/div>/gi)][0]?.[1] ?? "";
    const metaSpans = [...meta.matchAll(/<span>([\s\S]*?)<\/span>/gi)].map((m) => stripTags(m[1]));
    const links = [...block.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: decodeHtml(m[1]), text: stripTags(m[2]).toLowerCase() }));
    const npmUrl = links.find((link) => link.href.includes("npmjs.com/package"))?.href;
    const repoUrl = links.find((link) => link.text.includes("repo") && link.href.includes("github.com"))?.href;
    const installCommand = attr(block, "data-copy-text") ?? `pi install npm:${name}`;
    return {
      id: packageId(name),
      source: "pi.dev",
      page,
      name,
      description: textMatch(block, /<p class="packages-desc">([\s\S]*?)<\/p>/i) ?? "",
      author: metaSpans[0],
      downloadsMonthly: numberFrom(metaSpans[1] ?? attr(block, "data-package-downloads")),
      published: metaSpans[2],
      types: parseTypes(attr(block, "data-package-types") || [...block.matchAll(/data-type="([^"]+)"/g)].map((m) => m[1]).join(" ")),
      packageUrl: absoluteUrl(packagePath),
      npmUrl,
      repoUrl,
      installCommand,
      sortName: attr(block, "data-package-sort-name") ?? name,
    };
  }).filter((pkg) => pkg.name && pkg.packageUrl);
}

function parseDefinition(html, label) {
  const rx = new RegExp(`<dt>\\s*${label}\\s*<\\/dt>\\s*<dd>([\\s\\S]*?)<\\/dd>`, "i");
  return textMatch(html, rx);
}

function parseManifest(html) {
  const raw = textMatch(html, /<summary>Pi manifest JSON<\/summary>\s*<pre>([\s\S]*?)<\/pre>/i);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parseReadme(html) {
  const match = html.match(/<div class="rich-text packages-readme">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/i);
  return match ? stripTags(match[1]).slice(0, 12000) : undefined;
}

function parseDetailPage(html, base = {}) {
  const links = [...html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: decodeHtml(m[1]), text: stripTags(m[2]).toLowerCase() }));
  const expectedNpmPath = `/package/${base.name}`;
  const npmUrl = links.find((link) => link.href.includes("npmjs.com/package") && decodeURIComponent(link.href).includes(expectedNpmPath))?.href
    ?? base.npmUrl
    ?? (base.name ? `https://www.npmjs.com/package/${base.name}` : undefined);
  const reportUrl = "github.com/earendil-works/pi/issues/new";
  const repoUrl = links.find((link) => link.text.includes("repo") && link.href.includes("github.com") && !link.href.includes(reportUrl))?.href ?? base.repoUrl;
  const homepageUrl = links.find((link) => link.text === "home")?.href;
  const installCommand = attr(html, "data-copy-text");
  return {
    ...base,
    description: textMatch(html, /<p class="content-description">([\s\S]*?)<\/p>/i) ?? base.description,
    npmUrl: npmUrl ?? base.npmUrl,
    repoUrl: repoUrl ?? base.repoUrl,
    homepageUrl,
    installCommand: installCommand ?? base.installCommand,
    version: parseDefinition(html, "Version"),
    license: parseDefinition(html, "License"),
    size: parseDefinition(html, "Size"),
    sizeKb: numberFrom(parseDefinition(html, "Size")),
    dependencies: parseDefinition(html, "Dependencies"),
    published: parseDefinition(html, "Published") ?? base.published,
    author: parseDefinition(html, "Author") ?? base.author,
    types: parseTypes(parseDefinition(html, "Types") ?? base.types?.join(" ") ?? ""),
    piManifest: parseManifest(html),
    readmeText: parseReadme(html),
  };
}

function scorePackage(pkg) {
  const haystack = [pkg.name, pkg.description, pkg.readmeText, pkg.types?.join(" ")].filter(Boolean).join(" ").toLowerCase();
  const categories = CATEGORY_RULES.map((rule) => ({
    id: rule.id,
    hits: rule.terms.filter((term) => haystack.includes(term)).length,
  })).filter((rule) => rule.hits > 0).sort((a, b) => b.hits - a.hits);
  const downloadsScore = Math.min(30, Math.log10(Math.max(1, pkg.downloadsMonthly ?? 0) + 1) * 8);
  const categoryScore = Math.min(35, categories.reduce((sum, row) => sum + row.hits, 0) * 3);
  const detailScore = (pkg.repoUrl ? 8 : 0) + (pkg.piManifest ? 8 : 0) + (pkg.readmeText ? 6 : 0) + (pkg.license ? 4 : 0);
  const typeScore = pkg.types?.some((type) => ["extension", "skill", "prompt"].includes(type)) ? 10 : 2;
  const riskReasons = [];
  if (!pkg.repoUrl) riskReasons.push("missing repo link");
  if (pkg.types?.includes("extension")) riskReasons.push("can influence agent runtime");
  if (pkg.piManifest?.extensions?.length) riskReasons.push("declares executable extension entrypoints");
  for (const term of HIGH_RISK_TERMS) {
    if (haystack.includes(term)) riskReasons.push(`mentions ${term}`);
  }
  const riskScore = Math.min(40, new Set(riskReasons).size * 5);
  const score = Math.round(downloadsScore + categoryScore + detailScore + typeScore - riskScore * 0.35);
  const recommendation = score >= 55 && riskScore <= 20 ? "install-candidate"
    : score >= 45 ? "fork-candidate"
      : score >= 30 ? "copy-pattern"
        : score >= 18 ? "watch"
          : "ignore";
  return {
    ...pkg,
    categories: categories.map((row) => row.id),
    sisoFit: {
      score,
      lanes: categories.slice(0, 4).map((row) => row.id),
      rationale: categories.length ? `Matched ${categories.slice(0, 3).map((row) => `${row.id}:${row.hits}`).join(", ")}.` : "No strong SISO category match.",
    },
    risk: {
      score: riskScore,
      reasons: [...new Set(riskReasons)].slice(0, 10),
      requiresAudit: riskScore > 0 || pkg.types?.includes("extension") || Boolean(pkg.piManifest?.extensions?.length),
    },
    recommendation,
  };
}

async function fetchCached(url, file, { refresh = false, fixture } = {}) {
  if (fixture && existsSync(fixture)) return readFileSync(fixture, "utf8");
  if (!refresh && existsSync(file)) return readFileSync(file, "utf8");
  const res = await fetch(url, { headers: { "user-agent": "siso-extension-catalog/1.0" } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} ${url}`);
  const html = await res.text();
  ensureDir(path.dirname(file));
  writeFileSync(file, html);
  return html;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      out[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function detailFileName(name) {
  return encodeURIComponent(name).replace(/%2F/g, "__") + ".html";
}

function shortlistMarkdown(catalog) {
  const rows = catalog.packages.slice().sort((a, b) => b.sisoFit.score - a.sisoFit.score).slice(0, 80);
  return [
    "# SISO Extension Catalog Shortlist",
    "",
    `Generated: ${catalog.generatedAt}`,
    `Source packages: ${catalog.totalPackages}`,
    "",
    "| Rank | Package | Score | Categories | Downloads | Risk | Recommendation |",
    "|---:|---|---:|---|---:|---:|---|",
    ...rows.map((pkg, index) => `| ${index + 1} | [${pkg.name}](${pkg.packageUrl}) | ${pkg.sisoFit.score} | ${pkg.categories.slice(0, 3).join(", ")} | ${pkg.downloadsMonthly ?? 0} | ${pkg.risk.score} | ${pkg.recommendation} |`),
    "",
    "## Audit Rule",
    "",
    "Do not install a package from this shortlist until its npm tarball, install scripts, repo source, manifest, dependencies, and runtime behavior have been reviewed.",
    "",
  ].join("\n");
}

export async function buildPiPackageCatalog(options = {}) {
  const args = { ...parseArgs([]), ...options };
  const out = args.out ?? DEFAULT_OUT;
  const sourceDir = path.join(out, "sources", "pi.dev");
  const catalogDir = path.join(sourceDir, "catalog-pages");
  const detailDir = path.join(sourceDir, "detail-pages");
  ensureDir(out);
  ensureDir(catalogDir);
  ensureDir(detailDir);

  const pageCount = Math.max(1, Number(args.pages) || 47);
  const catalogPages = await mapLimit(Array.from({ length: pageCount }, (_, i) => i + 1), args.concurrency ?? 8, async (page) => {
    const url = page === 1 ? `${BASE_URL}/packages` : `${BASE_URL}/packages?page=${page}`;
    const fixture = args.fixtureDir ? path.join(args.fixtureDir, `packages-page-${page}.html`) : undefined;
    const html = await fetchCached(url, path.join(catalogDir, `page-${page}.html`), { refresh: args.refresh, fixture });
    return parseCatalogPage(html, page);
  });
  const byName = new Map();
  for (const pkg of catalogPages.flat()) byName.set(pkg.name, { ...(byName.get(pkg.name) ?? {}), ...pkg });
  const rawPackages = [...byName.values()].sort((a, b) => (b.downloadsMonthly ?? 0) - (a.downloadsMonthly ?? 0));

  const detailLimit = args.detailLimit === "all" ? rawPackages.length : Math.max(0, Number(args.detailLimit ?? 0) || 0);
  const detailTargets = rawPackages.slice(0, detailLimit);
  const detailed = new Map(rawPackages.map((pkg) => [pkg.name, pkg]));
  await mapLimit(detailTargets, args.concurrency ?? 8, async (pkg) => {
    const fixture = args.fixtureDir ? path.join(args.fixtureDir, `detail-${detailFileName(pkg.name)}`) : undefined;
    const html = await fetchCached(pkg.packageUrl, path.join(detailDir, detailFileName(pkg.name)), { refresh: args.refresh, fixture });
    detailed.set(pkg.name, parseDetailPage(html, pkg));
  });

  const packages = [...detailed.values()].map(scorePackage).sort((a, b) => b.sisoFit.score - a.sisoFit.score || (b.downloadsMonthly ?? 0) - (a.downloadsMonthly ?? 0));
  const catalog = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "https://pi.dev/packages",
    pages: pageCount,
    totalPackages: packages.length,
    detailedPackages: detailTargets.length,
    packages,
  };
  writeFileSync(path.join(out, "pi-packages.raw.json"), JSON.stringify({ generatedAt: catalog.generatedAt, packages: rawPackages }, null, 2));
  writeFileSync(path.join(out, "extension-catalog.json"), JSON.stringify(catalog, null, 2));
  writeFileSync(path.join(out, "shortlist.md"), shortlistMarkdown(catalog));
  return catalog;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const catalog = await buildPiPackageCatalog(args);
  console.log(`SISO_EXTENSION_CATALOG_BUILT packages=${catalog.totalPackages} detailed=${catalog.detailedPackages} out=${args.out}`);
}
