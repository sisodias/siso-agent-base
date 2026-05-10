#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const writeReport = !args.includes("--no-report");
const fail = (msg) => {
  console.error(`SISO_SOURCE_DRIFT_SMOKE_FAIL ${msg}`);
  process.exit(1);
};
const warn = [];
const errors = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const exists = (rel) => fs.existsSync(path.join(root, rel));

function latestChangelogVersion() {
  const text = read("CHANGELOG.md");
  const match = text.match(/^##\s+([^\s]+)/m);
  return match?.[1] ?? null;
}

function npmScriptCommand(command) {
  const match = /^npm run ([a-z0-9:._-]+)$/.exec(command);
  return match?.[1] ?? null;
}

function checkScriptCommand(scriptName, scripts) {
  const command = scripts[scriptName];
  if (!command) return [`missing npm script ${scriptName}`];
  const problems = [];
  const fileRefs = [...command.matchAll(/(?:node|bash)\s+([^\s;&|]+)/g)].map((m) => m[1]).filter((item) => !item.startsWith("-"));
  for (const ref of fileRefs) {
    if (!fs.existsSync(path.join(root, ref))) problems.push(`${scriptName} references missing file ${ref}`);
  }
  return problems;
}

function packageSmokeScripts(scripts) {
  return Object.keys(scripts).filter((name) => name.startsWith("smoke:")).sort();
}

function installedVersion() {
  const installDir = process.env.SISO_AGENT_BASE_DIR || path.join(homedir(), ".siso-agent-base");
  const pkgPath = path.join(installDir, "package.json");
  const versionPath = path.join(installDir, "VERSION");
  return {
    installDir,
    exists: fs.existsSync(installDir),
    packageVersion: fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, "utf8")).version : null,
    versionFile: fs.existsSync(versionPath) ? fs.readFileSync(versionPath, "utf8").trim() : null
  };
}

function diffFiles(rel, installDir) {
  const source = path.join(root, rel);
  const installed = path.join(installDir, rel);
  if (!fs.existsSync(source) || !fs.existsSync(installed)) return "missing";
  return fs.readFileSync(source).equals(fs.readFileSync(installed)) ? "same" : "different";
}

function maybeGitChangedFiles() {
  try {
    const out = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
    return out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

const pkg = readJson("package.json");
const release = readJson("releases/latest.json");
const versionFile = read("VERSION").trim();
const changelogVersion = latestChangelogVersion();
const versions = {
  VERSION: versionFile,
  packageJson: pkg.version,
  releaseLatest: release.version,
  changelogLatest: changelogVersion
};

for (const [key, value] of Object.entries(versions)) {
  if (!value) errors.push(`missing version value for ${key}`);
}
const uniqueVersions = new Set(Object.values(versions).filter(Boolean));
if (uniqueVersions.size > 1) errors.push(`version drift: ${JSON.stringify(versions)}`);

const scripts = pkg.scripts ?? {};
for (const script of packageSmokeScripts(scripts)) {
  for (const problem of checkScriptCommand(script, scripts)) errors.push(problem);
}
if (scripts["smoke:all"]) {
  for (const script of packageSmokeScripts(scripts)) {
    if (script !== "smoke:all" && !scripts["smoke:all"].includes(`npm run ${script}`)) {
      warn.push(`smoke:all omits ${script}`);
    }
  }
}

const capabilityRegistry = readJson("docs/capabilities/registry.json");
const capabilityIds = new Set(capabilityRegistry.capabilities.map((cap) => cap.id));
for (const cap of capabilityRegistry.capabilities) {
  if (["validated", "released"].includes(cap.status)) {
    for (const command of cap.validatedBy ?? []) {
      const script = npmScriptCommand(command);
      if (script && !scripts[script]) errors.push(`${cap.id} validatedBy missing script ${script}`);
    }
  }
  for (const rel of cap.implementedIn ?? []) {
    if (rel.endsWith("/") || rel.includes("**")) continue;
    if (!exists(rel)) warn.push(`${cap.id} implementedIn missing path ${rel}`);
  }
}

const testPlan = readJson("test-space/test-plan.json");
for (const suite of testPlan.suites ?? []) {
  if (!capabilityIds.has(suite.capabilityId)) errors.push(`test suite ${suite.id} references unknown capability ${suite.capabilityId}`);
  for (const command of suite.commands ?? []) {
    const script = npmScriptCommand(command);
    if (script && !scripts[script]) errors.push(`test suite ${suite.id} references missing script ${script}`);
  }
}

const contracts = readJson("docs/contracts/contracts.json");
for (const contract of contracts.contracts ?? []) {
  for (const capId of contract.capabilityIds ?? []) {
    if (!capabilityIds.has(capId)) errors.push(`contract ${contract.id} references unknown capability ${capId}`);
  }
  for (const command of contract.requiredCommands ?? []) {
    const script = npmScriptCommand(command);
    if (script && !scripts[script]) errors.push(`contract ${contract.id} references missing script ${script}`);
  }
}

const install = installedVersion();
if (!install.exists) {
  warn.push(`install dir missing: ${install.installDir}`);
} else {
  if (install.packageVersion && install.packageVersion !== pkg.version) warn.push(`installed package version ${install.packageVersion} != workspace ${pkg.version}`);
  if (install.versionFile && install.versionFile !== versionFile) warn.push(`installed VERSION ${install.versionFile} != workspace ${versionFile}`);
}
const installCriticalPaths = [
  "bin/siso",
  "bin/siso-doctor",
  "bin/siso-update",
  "bin/siso-where",
  "install.sh",
  "scripts/install-local.sh",
  "scripts/smoke-source-drift.mjs",
  "templates/profile/models.json.template",
  "templates/profile/settings.json",
  "templates/profile/SYSTEM.md",
  "package.json",
  "VERSION",
  "releases/latest.json"
];
if (fs.existsSync(path.join(root, "templates/profile/skills"))) {
  for (const rel of fs.readdirSync(path.join(root, "templates/profile/skills"), { recursive: true })) {
    const skillRel = path.join("templates/profile/skills", rel);
    if (fs.statSync(path.join(root, skillRel)).isFile()) installCriticalPaths.push(skillRel);
  }
}
const installComparisons = install.exists ? installCriticalPaths.map((rel) => ({ path: rel, status: diffFiles(rel, install.installDir) })) : [];
for (const item of installComparisons) {
  if (item.status === "different") warn.push(`installed ${item.path} differs from workspace`);
  if (item.status === "missing") warn.push(`installed ${item.path} missing or source missing`);
}

const report = {
  generatedAt: new Date().toISOString(),
  strict,
  versions,
  install,
  installComparisons,
  gitStatus: maybeGitChangedFiles(),
  errors,
  warnings: warn,
  summary: {
    errorCount: errors.length,
    warningCount: warn.length,
    versionDrift: uniqueVersions.size > 1,
    installDrift: warn.some((item) => item.includes("installed"))
  }
};
if (writeReport) {
  const outDir = path.join(root, "test-space", "results");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "source-drift-report.json"), JSON.stringify(report, null, 2) + "\n");
}
if (errors.length || (strict && warn.length)) fail(`errors=${errors.length} warnings=${warn.length}`);
console.log(`SISO_SOURCE_DRIFT_SMOKE_OK errors=${errors.length} warnings=${warn.length} versionDrift=${report.summary.versionDrift} installDrift=${report.summary.installDrift}`);
