#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const registryPath = path.join(root, "docs", "capabilities", "registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const fail = (msg) => {
  console.error(`SISO_CAPABILITY_REGISTRY_SMOKE_FAIL ${msg}`);
  process.exit(1);
};

if (registry.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!Array.isArray(registry.statuses) || registry.statuses.length === 0) fail("statuses missing");
if (!Array.isArray(registry.capabilities) || registry.capabilities.length === 0) fail("capabilities missing");

const statuses = new Set(registry.statuses);
const ids = new Set();
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

for (const cap of registry.capabilities) {
  if (!cap || typeof cap !== "object") fail("capability entry must be object");
  if (!cap.id || !idPattern.test(cap.id)) fail(`bad id: ${cap.id}`);
  if (ids.has(cap.id)) fail(`duplicate id: ${cap.id}`);
  ids.add(cap.id);
  if (!cap.name) fail(`${cap.id} missing name`);
  if (!statuses.has(cap.status)) fail(`${cap.id} has invalid status ${cap.status}`);
  if (!cap.category) fail(`${cap.id} missing category`);
  if (!cap.priority) fail(`${cap.id} missing priority`);
  if (typeof cap.exists !== "boolean") fail(`${cap.id} exists must be boolean`);
  if (!cap.summary) fail(`${cap.id} missing summary`);
  if (!Array.isArray(cap.implementedIn)) fail(`${cap.id} implementedIn must be array`);
  if (!Array.isArray(cap.validatedBy)) fail(`${cap.id} validatedBy must be array`);
  if (typeof cap.changelogCandidate !== "boolean") fail(`${cap.id} changelogCandidate must be boolean`);

  if (["implemented", "validated", "released"].includes(cap.status) && cap.implementedIn.length === 0) {
    fail(`${cap.id} is ${cap.status} but has no implementedIn`);
  }
  if (["validated", "released"].includes(cap.status) && cap.validatedBy.length === 0) {
    fail(`${cap.id} is ${cap.status} but has no validatedBy`);
  }
  if (cap.exists && cap.implementedIn.length === 0) fail(`${cap.id} exists but has no implementedIn`);
  if (!cap.exists && cap.status === "validated") fail(`${cap.id} cannot be validated with exists=false`);
}

for (const rel of ["README.md", "current.md", "ideas.md", "changelog-candidates.md"]) {
  const p = path.join(root, "docs", "capabilities", rel);
  if (!fs.existsSync(p)) fail(`missing ${rel}`);
}

console.log("SISO_CAPABILITY_REGISTRY_SMOKE_OK");
