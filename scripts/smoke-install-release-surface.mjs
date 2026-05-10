#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const exists = (rel) => fs.existsSync(path.join(root, rel));
const errors = [];
const warnings = [];
const strict = process.argv.includes("--strict") || process.env.SISO_STRICT_RELEASE_SURFACE === "1";

const intentionallyUntracked = new Set([
  "test-space/results/source-drift-report.json"
]);

function gitTracked(rel) {
  if (intentionallyUntracked.has(rel)) return true;
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", rel], {
      cwd: root,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

function scriptRefs(command) {
  const refs = new Set();
  const pattern = /(?:^|\s)(?:node|bash)\s+((?:(?![;&|]).)+)/g;
  let match;
  while ((match = pattern.exec(command))) {
    for (const token of match[1].trim().split(/\s+/)) {
      const ref = token.replace(/^"|"$/g, "");
      if (ref.startsWith("-") || ref.startsWith("$") || ref.includes("*")) continue;
      if (/\.(?:mjs|js|sh)$/.test(ref) || ref === "install.sh") refs.add(ref);
    }
  }
  return [...refs];
}

function requireReleaseFile(rel, reason) {
  if (!exists(rel)) {
    errors.push(`${reason} missing: ${rel}`);
    return;
  }
  if (!gitTracked(rel)) {
    warnings.push(`${reason} is not tracked: ${rel}`);
  }
}

const installSh = read("install.sh");
const installLocal = read("scripts/install-local.sh");
const update = read("bin/siso-update");
const sourceDrift = read("scripts/smoke-source-drift.mjs");
const doctor = read("bin/siso-doctor");
const pkg = readJson("package.json");

assert.match(installSh, /\.siso-agent-base-install/, "install.sh must use the install ownership marker");
assert.doesNotMatch(installSh, /rm\s+-rf\s+"\$INSTALL_DIR"/, "install.sh must not destructively delete INSTALL_DIR");
assert.match(installLocal, /\.siso-agent-base-install/, "install-local.sh must use the install ownership marker");
assert.doesNotMatch(installLocal, /rsync\s+-a\s+--delete/, "install-local.sh must not delete arbitrary install-dir contents during sync");
assert.match(update, /SISO_AGENT_BASE_SOURCE_DIR/, "siso-update must support an explicit canonical source checkout path");
assert.match(update, /SISO_Workspace\/SISO_Agent_Base/, "siso-update must fall back to the canonical source checkout");
assert.match(update, /scripts\/install-local\.sh/, "siso-update must rerun install-local.sh from the source checkout when needed");
assert.match(sourceDrift, /SISO_AGENT_BASE_DIR/, "source-drift smoke must honor SISO_AGENT_BASE_DIR");

for (const rel of [
  "install.sh",
  "scripts/install-local.sh",
  "bin/siso-update",
  "bin/siso",
  "bin/siso-agent",
  "bin/siso-doctor",
  "bin/siso-where",
  "bin/siso-tui-preview",
  "bin/siso-opentui-live",
  "templates/profile/models.json.template",
  "templates/profile/settings.json",
  "templates/profile/SYSTEM.md"
]) {
  requireReleaseFile(rel, "installer release file");
}

for (const rel of fs.readdirSync(path.join(root, "templates/profile/skills"), { recursive: true })) {
  const skillRel = path.join("templates/profile/skills", rel);
  if (fs.statSync(path.join(root, skillRel)).isFile()) {
    requireReleaseFile(skillRel, "template skill file");
  }
}

const copiedBins = [...installLocal.matchAll(/for name in ([^;]+); do/g)]
  .flatMap((match) => match[1].trim().split(/\s+/));
assert.ok(copiedBins.includes("siso-update"), "install-local.sh must copy siso-update");
for (const name of copiedBins) {
  requireReleaseFile(`bin/${name}`, "copied bin target");
}

for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
  for (const rel of scriptRefs(command)) {
    requireReleaseFile(rel, `package script ${name} target`);
  }
}

for (const rel of [...doctor.matchAll(/node\s+"\$INSTALL_DIR\/([^"]+)"/g)].map((match) => match[1])) {
  requireReleaseFile(rel, "doctor subcommand target");
}
for (const rel of [...doctor.matchAll(/exec node ([^\s]+)/g)].map((match) => match[1])) {
  requireReleaseFile(rel, "doctor readiness target");
}

const tmpInstall = fs.mkdtempSync(path.join(os.tmpdir(), "siso-drift-install-"));
const driftOut = execFileSync(
  process.execPath,
  ["scripts/smoke-source-drift.mjs", "--no-report"],
  {
    cwd: root,
    env: { ...process.env, SISO_AGENT_BASE_DIR: tmpInstall },
    encoding: "utf8"
  }
);
assert.match(driftOut, /SISO_SOURCE_DRIFT_SMOKE_OK/, "source-drift smoke must pass with an env install dir");

if (errors.length || (strict && warnings.length)) {
  console.error(`SISO_INSTALL_RELEASE_SURFACE_SMOKE_FAIL errors=${errors.length} warnings=${warnings.length} strict=${strict}`);
  for (const error of errors) console.error(`- ${error}`);
  for (const warning of warnings) console.error(`- ${warning}`);
  process.exit(1);
}

if (warnings.length) {
  const shown = warnings.slice(0, 12);
  console.error(`SISO_INSTALL_RELEASE_SURFACE_SMOKE_WARN warnings=${warnings.length} strict=${strict}`);
  for (const warning of shown) console.error(`- ${warning}`);
  if (warnings.length > shown.length) console.error(`- ... ${warnings.length - shown.length} more untracked release-surface files`);
}

console.log(`SISO_INSTALL_RELEASE_SURFACE_SMOKE_OK warnings=${warnings.length} strict=${strict}`);
