#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPiPackageCatalog } from "./scrape-pi-packages.mjs";
import { formatExtensionCatalogResult, queryExtensionCatalog, queryExtensionCatalogAsync } from "../extensions/siso-agent-router/extension-catalog.js";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const fixtureDir = path.join(root, "test-space", "extension-catalog-fixtures");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "siso-extension-catalog-"));

const catalog = await buildPiPackageCatalog({
  pages: 1,
  detailLimit: "all",
  out,
  fixtureDir,
  concurrency: 2,
});

assert.equal(catalog.totalPackages, 2);
assert.equal(catalog.detailedPackages, 2);
assert.ok(fs.existsSync(path.join(out, "extension-catalog.json")));
assert.ok(fs.existsSync(path.join(out, "shortlist.md")));

const search = queryExtensionCatalog({ op: "search", query: "subagent parallel", limit: 5 }, path.join(out, "extension-catalog.json"));
assert.equal(search.returnedRows, 1);
assert.equal(search.rows[0].name, "pi-subagents");
assert.ok(search.rows[0].categories.includes("agent-orchestration"));

const memory = queryExtensionCatalog({ op: "recommend", category: "memory-context", limit: 5 }, path.join(out, "extension-catalog.json"));
assert.ok(memory.rows.some((row) => row.name === "pi-memory-lite"));

const show = queryExtensionCatalog({ op: "show", id: "pi.dev:pi-subagents" }, path.join(out, "extension-catalog.json"));
assert.equal(show.package.version, "0.24.0");
assert.equal(show.package.npmUrl, "https://www.npmjs.com/package/pi-subagents");
assert.deepEqual(show.package.piManifest.extensions, ["./src/extension/index.ts"]);

const compare = queryExtensionCatalog({ op: "compare", ids: ["pi-subagents", "pi-memory-lite"] }, path.join(out, "extension-catalog.json"));
assert.equal(compare.returnedRows, 2);

const audit = queryExtensionCatalog({ op: "audit-plan", id: "pi-subagents" }, path.join(out, "extension-catalog.json"));
const auditText = formatExtensionCatalogResult(audit);
assert.match(auditText, /npm view pi-subagents --json/);
assert.match(auditText, /Risk reasons:/);

const formatted = formatExtensionCatalogResult(search);
assert.match(formatted, /op=search/);
assert.match(formatted, /pi-subagents/);
assert.ok(formatted.length < 2500);

const registryPath = path.join(out, "registry.json");
const approved = queryExtensionCatalog({
  op: "approve",
  id: "pi-subagents",
  decision: "copy-pattern",
  capabilities: ["agent-orchestration", "task-workflow"],
  notes: "Use orchestration prompts and chain UX; keep SISO routing as source of truth.",
  registryPath,
}, path.join(out, "extension-catalog.json"));
assert.equal(approved.registryEntry.status, "approved");
assert.equal(approved.registryEntry.decision, "copy-pattern");
assert.deepEqual(approved.registryEntry.capabilities, ["agent-orchestration", "task-workflow"]);

const activated = queryExtensionCatalog({
  op: "activate",
  id: "pi-subagents",
  scope: "profile",
  profile: "planner",
  toolPack: "orchestration",
  registryPath,
}, path.join(out, "extension-catalog.json"));
assert.equal(activated.registryEntry.activation.profiles.includes("planner"), true);
assert.equal(activated.registryEntry.activation.toolPacks.includes("orchestration"), true);

const registry = queryExtensionCatalog({ op: "registry", registryPath }, path.join(out, "extension-catalog.json"));
assert.equal(registry.rows.length, 1);
assert.equal(registry.rows[0].name, "pi-subagents");
assert.equal(registry.rows[0].status, "approved");

const fetched = await queryExtensionCatalogAsync({
  op: "fetch",
  id: "pi-subagents",
  registryPath,
  storePath: path.join(out, "installed"),
  tarballPath: path.join(fixtureDir, "pi-subagents-0.24.0.tgz"),
}, path.join(out, "extension-catalog.json"));
assert.equal(fetched.registryEntry.status, "installed");
assert.equal(fetched.registryEntry.installed.version, "0.24.0");
assert.equal(fetched.registryEntry.installed.loaded, false);
assert.match(fetched.registryEntry.installed.integrity, /^sha512-/);
assert.ok(fs.existsSync(fetched.registryEntry.installed.path));
assert.ok(fs.existsSync(path.join(fetched.registryEntry.installed.path, "manifest.json")));

const store = queryExtensionCatalog({ op: "store", registryPath }, path.join(out, "extension-catalog.json"));
assert.equal(store.rows.length, 1);
assert.equal(store.rows[0].status, "installed");
assert.match(formatExtensionCatalogResult(store), /installed=/);

console.log("SISO_EXTENSION_CATALOG_SMOKE_OK");
