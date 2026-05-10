import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIMIT = 12;

function defaultCatalogPath() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "data", "extensions", "extension-catalog.json");
}

function defaultRegistryPath() {
  return join(homedir(), ".siso", "extensions", "registry.json");
}

function defaultStorePath() {
  return join(homedir(), ".siso", "extensions", "installed");
}

function emptyRegistry() {
  return { version: 1, updatedAt: new Date().toISOString(), extensions: [] };
}

function readRegistry(path = process.env.SISO_EXTENSION_REGISTRY_PATH ?? defaultRegistryPath()) {
  if (!existsSync(path)) return { path, registry: emptyRegistry() };
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return {
    path,
    registry: {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      extensions: Array.isArray(parsed.extensions) ? parsed.extensions : [],
    },
  };
}

function writeRegistry(path, registry) {
  mkdirSync(dirname(path), { recursive: true });
  const next = { ...registry, updatedAt: new Date().toISOString() };
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(tmp, path);
  return next;
}

function loadExtensionCatalog(path = process.env.SISO_EXTENSION_CATALOG_PATH ?? defaultCatalogPath()) {
  if (!existsSync(path)) {
    return {
      path,
      schemaVersion: 1,
      generatedAt: "",
      source: "https://pi.dev/packages",
      totalPackages: 0,
      detailedPackages: 0,
      packages: [],
      missing: true,
    };
  }
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return { ...parsed, path, packages: Array.isArray(parsed.packages) ? parsed.packages : [] };
}

function text(value) {
  return String(value ?? "").toLowerCase();
}

function compact(value, limit = 160) {
  const oneLine = String(value ?? "").replace(/\s+/g, " ").trim();
  return oneLine.length > limit ? `${oneLine.slice(0, limit - 1)}…` : oneLine;
}

function normalizeId(value) {
  const id = String(value ?? "").trim();
  if (!id) return "";
  return id.startsWith("pi.dev:") ? id : `pi.dev:${id}`;
}

function haystack(pkg) {
  return [
    pkg.id,
    pkg.name,
    pkg.description,
    pkg.author,
    pkg.types?.join(" "),
    pkg.categories?.join(" "),
    pkg.recommendation,
    pkg.sisoFit?.rationale,
    pkg.risk?.reasons?.join(" "),
    pkg.repoUrl,
    pkg.npmUrl,
  ].map(text).join("\n");
}

function matches(pkg, filters) {
  if (filters.id && pkg.id !== normalizeId(filters.id) && pkg.name !== filters.id) return false;
  if (filters.category && !pkg.categories?.includes(filters.category)) return false;
  if (filters.type && !pkg.types?.includes(filters.type)) return false;
  if (filters.recommendation && pkg.recommendation !== filters.recommendation) return false;
  if (filters.query) {
    const words = text(filters.query).split(/\s+/).filter(Boolean);
    const body = haystack(pkg);
    if (!words.every((word) => body.includes(word))) return false;
  }
  return true;
}

function scoreForQuery(pkg, query = "") {
  let score = pkg.sisoFit?.score ?? 0;
  const q = text(query);
  if (!q) return score;
  const name = text(pkg.name);
  const body = haystack(pkg);
  for (const word of q.split(/\s+/).filter(Boolean)) {
    if (name === word) score += 80;
    else if (name.includes(word)) score += 40;
    else if (text(pkg.categories?.join(" ")).includes(word)) score += 30;
    else if (body.includes(word)) score += 10;
  }
  return score;
}

function limitedRows(rows, limit) {
  return rows.slice(0, Math.max(1, Math.min(Number(limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 50)));
}

function filterRows(catalog, filters = {}) {
  return catalog.packages
    .filter((pkg) => matches(pkg, filters))
    .sort((a, b) => scoreForQuery(b, filters.query) - scoreForQuery(a, filters.query) || (b.downloadsMonthly ?? 0) - (a.downloadsMonthly ?? 0));
}

function findPackage(catalog, id) {
  const normalized = normalizeId(id);
  return catalog.packages.find((pkg) => pkg.id === normalized || pkg.name === id);
}

function summarize(pkg) {
  return {
    id: pkg.id,
    name: pkg.name,
    description: compact(pkg.description, 220),
    categories: pkg.categories?.slice(0, 5) ?? [],
    types: pkg.types ?? [],
    downloadsMonthly: pkg.downloadsMonthly,
    score: pkg.sisoFit?.score ?? 0,
    riskScore: pkg.risk?.score ?? 0,
    recommendation: pkg.recommendation,
    packageUrl: pkg.packageUrl,
    npmUrl: pkg.npmUrl,
    repoUrl: pkg.repoUrl,
  };
}

function registrySummary(entry, pkg) {
  return {
    id: entry.id,
    name: entry.name,
    version: entry.version,
    status: entry.status,
    decision: entry.decision,
    capabilities: entry.capabilities ?? [],
    activation: entry.activation ?? {},
    installed: entry.installed,
    description: entry.notes ?? pkg?.description,
    score: pkg?.sisoFit?.score ?? entry.score ?? 0,
    riskScore: pkg?.risk?.score ?? entry.risk?.score ?? 0,
    recommendation: pkg?.recommendation ?? entry.recommendation,
    packageUrl: pkg?.packageUrl ?? entry.packageUrl,
    repoUrl: pkg?.repoUrl ?? entry.repoUrl,
  };
}

function safeStoreName(name) {
  return String(name ?? "")
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "__")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function sha512Integrity(bytes) {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

function fetchNpmMetadataUrl(name, version) {
  const packagePath = String(name).startsWith("@") ? String(name).replace("/", "%2f") : encodeURIComponent(name);
  return `https://registry.npmjs.org/${packagePath}/${encodeURIComponent(version)}`;
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function fetchExtensionIntoStore(pkg, filters = {}) {
  const version = String(filters.version ?? pkg.version ?? "latest");
  const storeRoot = filters.storePath ?? process.env.SISO_EXTENSION_STORE_PATH ?? defaultStorePath();
  const packageDir = join(storeRoot, safeStoreName(pkg.name), version);
  const tarballOut = join(packageDir, "package.tgz");
  const manifestOut = join(packageDir, "manifest.json");
  let source = filters.tarballPath ? `file:${filters.tarballPath}` : undefined;
  let expectedIntegrity = filters.integrity;
  let tarballUrl = filters.tarballUrl;
  let bytes;

  if (filters.tarballPath) {
    bytes = readFileSync(filters.tarballPath);
  } else {
    const metadata = await fetch(fetchNpmMetadataUrl(pkg.name, version)).then(async (response) => {
      if (!response.ok) throw new Error(`Failed to fetch npm metadata for ${pkg.name}@${version}: ${response.status} ${response.statusText}`);
      return response.json();
    });
    expectedIntegrity = expectedIntegrity ?? metadata.dist?.integrity;
    tarballUrl = tarballUrl ?? metadata.dist?.tarball;
    if (!tarballUrl) throw new Error(`npm metadata for ${pkg.name}@${version} did not include dist.tarball`);
    source = tarballUrl;
    bytes = await fetchBytes(tarballUrl);
  }

  const integrity = sha512Integrity(bytes);
  if (expectedIntegrity && expectedIntegrity !== integrity) {
    throw new Error(`Integrity mismatch for ${pkg.name}@${version}: expected ${expectedIntegrity}, got ${integrity}`);
  }

  mkdirSync(packageDir, { recursive: true });
  writeFileSync(tarballOut, bytes);
  const manifest = {
    schemaVersion: 1,
    id: pkg.id,
    name: pkg.name,
    version,
    source,
    tarballUrl,
    packageUrl: pkg.packageUrl,
    npmUrl: pkg.npmUrl,
    repoUrl: pkg.repoUrl,
    integrity,
    bytes: bytes.length,
    loaded: false,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(manifestOut, `${JSON.stringify(manifest, null, 2)}\n`);
  return { ...manifest, path: packageDir, tarballPath: tarballOut, manifestPath: manifestOut };
}

function upsertRegistryEntry(pkg, filters) {
  const { path, registry } = readRegistry(filters.registryPath);
  const now = new Date().toISOString();
  const existing = registry.extensions.find((entry) => entry.id === pkg.id);
  const decision = filters.decision ?? existing?.decision ?? pkg.recommendation ?? "watch";
  const capabilities = Array.isArray(filters.capabilities) && filters.capabilities.length
    ? filters.capabilities
    : existing?.capabilities ?? pkg.categories?.slice(0, 3) ?? [];
  const next = {
    ...(existing ?? {}),
    id: pkg.id,
    name: pkg.name,
    version: pkg.version,
    source: pkg.source,
    packageUrl: pkg.packageUrl,
    npmUrl: pkg.npmUrl,
    repoUrl: pkg.repoUrl,
    status: "approved",
    decision,
    capabilities,
    recommendation: pkg.recommendation,
    score: pkg.sisoFit?.score ?? 0,
    risk: { score: pkg.risk?.score ?? 0, reasons: pkg.risk?.reasons ?? [] },
    notes: filters.notes ?? existing?.notes ?? "",
    approvedAt: existing?.approvedAt ?? now,
    updatedAt: now,
    activation: existing?.activation ?? { default: false, profiles: [], workspaces: [], commands: [], toolPacks: [] },
  };
  const extensions = [next, ...registry.extensions.filter((entry) => entry.id !== pkg.id)];
  const saved = writeRegistry(path, { ...registry, extensions });
  return { registryPath: path, registry: saved, registryEntry: next };
}

function activateRegistryEntry(pkg, filters) {
  const { path, registry } = readRegistry(filters.registryPath);
  const existing = registry.extensions.find((entry) => entry.id === pkg.id);
  const base = existing ?? upsertRegistryEntry(pkg, { ...filters, decision: filters.decision ?? pkg.recommendation }).registryEntry;
  const activation = {
    default: filters.scope === "default" ? true : Boolean(base.activation?.default),
    profiles: [...new Set([...(base.activation?.profiles ?? []), ...(filters.profile ? [filters.profile] : [])])],
    workspaces: [...new Set([...(base.activation?.workspaces ?? []), ...(filters.workspace ? [filters.workspace] : [])])],
    commands: [...new Set([...(base.activation?.commands ?? []), ...(filters.command ? [filters.command] : [])])],
    toolPacks: [...new Set([...(base.activation?.toolPacks ?? []), ...(filters.toolPack ? [filters.toolPack] : [])])],
  };
  const next = { ...base, status: "approved", activation, updatedAt: new Date().toISOString() };
  const latest = readRegistry(path).registry;
  const extensions = [next, ...latest.extensions.filter((entry) => entry.id !== pkg.id)];
  const saved = writeRegistry(path, { ...latest, extensions });
  return { registryPath: path, registry: saved, registryEntry: next };
}

function deactivateRegistryEntry(pkg, filters) {
  const { path, registry } = readRegistry(filters.registryPath);
  const existing = registry.extensions.find((entry) => entry.id === pkg.id);
  if (!existing) return { registryPath: path, registry, registryEntry: undefined };
  const activation = {
    default: filters.scope === "default" ? false : Boolean(existing.activation?.default),
    profiles: (existing.activation?.profiles ?? []).filter((item) => !filters.profile || item !== filters.profile),
    workspaces: (existing.activation?.workspaces ?? []).filter((item) => !filters.workspace || item !== filters.workspace),
    commands: (existing.activation?.commands ?? []).filter((item) => !filters.command || item !== filters.command),
    toolPacks: (existing.activation?.toolPacks ?? []).filter((item) => !filters.toolPack || item !== filters.toolPack),
  };
  const next = { ...existing, activation, updatedAt: new Date().toISOString() };
  const extensions = [next, ...registry.extensions.filter((entry) => entry.id !== pkg.id)];
  const saved = writeRegistry(path, { ...registry, extensions });
  return { registryPath: path, registry: saved, registryEntry: next };
}

async function fetchRegistryEntry(pkg, filters) {
  const { path, registry } = readRegistry(filters.registryPath);
  const existing = registry.extensions.find((entry) => entry.id === pkg.id);
  const base = existing ?? upsertRegistryEntry(pkg, { ...filters, decision: filters.decision ?? pkg.recommendation }).registryEntry;
  const installed = await fetchExtensionIntoStore(pkg, filters);
  const next = {
    ...base,
    version: installed.version,
    status: "installed",
    installed,
    updatedAt: new Date().toISOString(),
  };
  const latest = readRegistry(path).registry;
  const extensions = [next, ...latest.extensions.filter((entry) => entry.id !== pkg.id)];
  const saved = writeRegistry(path, { ...latest, extensions });
  return { registryPath: path, registry: saved, registryEntry: next };
}

function auditPlan(pkg) {
  return [
    `Audit ${pkg.name}`,
    "",
    "1. Inspect package metadata",
    `   npm view ${pkg.name} --json`,
    "2. Download tarball without installing",
    `   npm pack ${pkg.name}`,
    "3. Inspect package contents",
    `   tar -tf ${pkg.name.replace("/", "-")}-*.tgz | sed -n '1,160p'`,
    "4. Check install scripts and dependencies",
    "   inspect package/package.json for scripts, dependencies, bin, exports, and files",
    "5. Compare npm tarball to linked repo",
    `   repo=${pkg.repoUrl ?? "missing"}`,
    "6. Review Pi manifest and runtime entrypoints",
    `   manifest=${JSON.stringify(pkg.piManifest ?? {}, null, 2)}`,
    "7. Run only in a disposable workspace first",
    `   pi install npm:${pkg.name}`,
    "",
    `Risk reasons: ${pkg.risk?.reasons?.join(", ") || "none recorded"}`,
    `Recommendation before audit: ${pkg.recommendation}`,
  ].join("\n");
}

export function queryExtensionCatalog(filters = {}, path) {
  const catalog = loadExtensionCatalog(path);
  const op = filters.op ?? (filters.id ? "show" : filters.query ? "search" : "list");
  if (catalog.missing) {
    return {
      op,
      catalogPath: catalog.path,
      totalPackages: 0,
      returnedRows: 0,
      rows: [],
      missing: true,
      nextAction: "Run node scripts/scrape-pi-packages.mjs --pages=47 --detail-limit=150 to build the catalog.",
    };
  }
  if (op === "registry" || op === "approved" || op === "activation" || op === "store") {
    const { path: registryPath, registry } = readRegistry(filters.registryPath);
    const rows = limitedRows(registry.extensions
      .map((entry) => registrySummary(entry, findPackage(catalog, entry.id)))
      .filter((row) => !filters.query || haystack(row).includes(text(filters.query)))
      .filter((row) => !filters.capability || row.capabilities?.includes(filters.capability))
      .filter((row) => !filters.profile || row.activation?.profiles?.includes(filters.profile))
      .filter((row) => op !== "store" || row.installed)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), filters.limit);
    return {
      op,
      catalogPath: catalog.path,
      registryPath,
      totalPackages: catalog.totalPackages,
      totalRegistryRows: registry.extensions.length,
      returnedRows: rows.length,
      rows,
      nextAction: "Use op=activate to enable approved extensions by profile, workspace, command, or tool pack.",
    };
  }
  if (op === "show" || op === "audit-plan") {
    const pkg = findPackage(catalog, filters.id ?? filters.query);
    return {
      op,
      catalogPath: catalog.path,
      totalPackages: catalog.totalPackages,
      returnedRows: pkg ? 1 : 0,
      rows: pkg ? [summarize(pkg)] : [],
      package: pkg,
      ...(op === "audit-plan" && pkg ? { auditPlan: auditPlan(pkg) } : {}),
      nextAction: pkg ? "Audit before install; then choose install, fork, copy-pattern, watch, or ignore." : "Search by package name first, then rerun show/audit-plan with the exact id.",
    };
  }
  if (op === "fetch") {
    throw new Error("queryExtensionCatalog op=fetch is asynchronous; use queryExtensionCatalogAsync instead.");
  }
  if (op === "approve" || op === "activate" || op === "deactivate") {
    const pkg = findPackage(catalog, filters.id ?? filters.query);
    if (!pkg) {
      return {
        op,
        catalogPath: catalog.path,
        totalPackages: catalog.totalPackages,
        returnedRows: 0,
        rows: [],
        nextAction: "Search by package name first, then rerun the registry operation with the exact id.",
      };
    }
    const registryResult = op === "approve"
      ? upsertRegistryEntry(pkg, filters)
      : op === "activate"
        ? activateRegistryEntry(pkg, filters)
        : deactivateRegistryEntry(pkg, filters);
    const row = registryResult.registryEntry ? registrySummary(registryResult.registryEntry, pkg) : undefined;
    return {
      op,
      catalogPath: catalog.path,
      registryPath: registryResult.registryPath,
      totalPackages: catalog.totalPackages,
      returnedRows: row ? 1 : 0,
      rows: row ? [row] : [],
      package: pkg,
      registryEntry: registryResult.registryEntry,
      nextAction: op === "approve"
        ? "Activate this approved extension only for the relevant profile/workspace/tool pack."
        : op === "fetch"
          ? "Review the stored manifest, then activate only for a narrow profile/workspace/tool pack."
          : "Keep active extension count small; inspect registry before adding more active tools.",
    };
  }
  if (op === "compare") {
    const ids = Array.isArray(filters.ids) ? filters.ids : String(filters.ids ?? filters.id ?? "").split(/[,\n]/).map((id) => id.trim()).filter(Boolean);
    const rows = ids.map((id) => findPackage(catalog, id)).filter(Boolean).map(summarize);
    return {
      op,
      catalogPath: catalog.path,
      totalPackages: catalog.totalPackages,
      returnedRows: rows.length,
      rows,
      nextAction: "Deep-audit the highest-fit, lowest-risk package before installing or forking.",
    };
  }
  const rows = limitedRows(filterRows(catalog, filters), filters.limit).map(summarize);
  return {
    op,
    catalogPath: catalog.path,
    generatedAt: catalog.generatedAt,
    totalPackages: catalog.totalPackages,
    detailedPackages: catalog.detailedPackages,
    returnedRows: rows.length,
    rows,
    nextAction: rows.length
      ? "Run op=show for details or op=audit-plan before installing any package."
      : "Broaden query/category filters or refresh the catalog.",
  };
}

export async function queryExtensionCatalogAsync(filters = {}, path) {
  const op = filters.op ?? (filters.id ? "show" : filters.query ? "search" : "list");
  if (op === "fetch") {
    const catalog = loadExtensionCatalog(path);
    const pkg = findPackage(catalog, filters.id ?? filters.query);
    if (!pkg) {
      return {
        op,
        catalogPath: catalog.path,
        totalPackages: catalog.totalPackages,
        returnedRows: 0,
        rows: [],
        nextAction: "Search by package name first, then rerun fetch with the exact id.",
      };
    }
    const registryResult = await fetchRegistryEntry(pkg, filters);
    const row = registryResult.registryEntry ? registrySummary(registryResult.registryEntry, pkg) : undefined;
    return {
      op,
      catalogPath: catalog.path,
      registryPath: registryResult.registryPath,
      totalPackages: catalog.totalPackages,
      returnedRows: row ? 1 : 0,
      rows: row ? [row] : [],
      package: pkg,
      registryEntry: registryResult.registryEntry,
      nextAction: "Review the stored manifest, then activate only for a narrow profile/workspace/tool pack.",
    };
  }
  return queryExtensionCatalog(filters, path);
}

export function recommendExtensions(filters = {}) {
  return queryExtensionCatalog({ ...filters, op: "recommend", recommendation: filters.recommendation }, filters.path);
}

export function formatExtensionCatalogResult(result) {
  if (result.missing) {
    return [
      "SISO extension catalog missing.",
      `catalog=${result.catalogPath}`,
      `next_action=${result.nextAction}`,
    ].join("\n");
  }
  if (result.op === "audit-plan" && result.auditPlan) {
    return result.auditPlan;
  }
  if (!result.rows?.length) {
    return `No extension candidates matched. catalog=${result.catalogPath} total=${result.totalPackages}\nnext_action=${result.nextAction}`;
  }
  return [
    `catalog=${result.catalogPath}`,
    `op=${result.op} total=${result.totalPackages} returned=${result.returnedRows}`,
    "",
    ...result.rows.map((row, index) => [
      `${index + 1}. ${row.name}`,
      `id=${row.id} score=${row.score} risk=${row.riskScore} recommendation=${row.recommendation ?? row.decision ?? "none"}${row.status ? ` status=${row.status}` : ""}`,
      row.capabilities
        ? `capabilities=${row.capabilities.join(",") || "none"} activation=${JSON.stringify(row.activation ?? {})}${row.installed ? ` installed=${row.installed.version}@${row.installed.integrity}` : ""}`
        : `categories=${(row.categories ?? []).join(",") || "none"} types=${(row.types ?? []).join(",") || "package"} downloads=${row.downloadsMonthly ?? "unknown"}`,
      `source=${row.packageUrl}`,
      row.repoUrl ? `repo=${row.repoUrl}` : "repo=missing",
      `why=${compact(row.description, 180)}`,
    ].join("\n")),
    "",
    `next_action=${result.nextAction}`,
  ].join("\n");
}
