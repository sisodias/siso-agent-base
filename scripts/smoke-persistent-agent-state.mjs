#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const agentsDir = join(root, ".siso", "agents");
const executiveDir = join(root, ".siso", "executive");
const registryPath = join(agentsDir, "registry.md");

const requiredAgentFiles = [
  "agent.md",
  "goals.md",
  "memory.md",
  "controlled-paths.md",
  "worklog.md",
  "changelog.md",
  "metrics.md",
];

const requiredAgentDirs = ["inbox", "outbox", "runs"];
const reservedAgentDirs = new Set(["templates", "workflows", "_runtime"]);

function fail(message) {
  throw new Error(message);
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function read(path) {
  return readFileSync(path, "utf8");
}

assert.equal(isDirectory(agentsDir), true, "Missing .siso/agents directory");
assert.equal(isDirectory(executiveDir), true, "Missing .siso/executive directory");
assert.equal(existsSync(registryPath), true, "Missing .siso/agents/registry.md");

const registry = read(registryPath);
const durableStateBody = [
  ...readdirSync(agentsDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name)),
  ...readdirSync(executiveDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name)),
]
  .filter((path) => path.endsWith(".md"))
  .map((path) => read(path))
  .join("\n");

assert.doesNotMatch(
  durableStateBody,
  /\/Users\/[^/\s]+\/(?:SISO_Workspace|siso_workspace)\/SISO_Agent_Base/,
  "Persistent agent/executive state must use repo-relative paths, not absolute local checkout paths",
);

const registryIds = new Set(
  [...registry.matchAll(/^###\s+([a-z0-9][a-z0-9-]*)\s*$/gm)].map((match) => match[1]),
);

const agentIds = readdirSync(agentsDir)
  .filter((entry) => isDirectory(join(agentsDir, entry)))
  .filter((entry) => !reservedAgentDirs.has(entry))
  .sort();

assert.ok(agentIds.length > 0, "Expected at least one live persistent agent");

for (const id of agentIds) {
  assert.ok(registryIds.has(id), `Agent directory is missing from registry: ${id}`);
  const dir = join(agentsDir, id);
  for (const file of requiredAgentFiles) {
    const path = join(dir, file);
    assert.equal(existsSync(path), true, `Missing ${id}/${file}`);
    assert.ok(read(path).trim().length > 0, `Empty ${id}/${file}`);
  }
  for (const childDir of requiredAgentDirs) {
    assert.equal(isDirectory(join(dir, childDir)), true, `Missing ${id}/${childDir}/`);
  }

  const agentBody = read(join(dir, "agent.md"));
  assert.match(agentBody, new RegExp(`\\bID:\\s*${id}\\b`), `agent.md ID does not match folder: ${id}`);
}

for (const id of registryIds) {
  assert.equal(isDirectory(join(agentsDir, id)), true, `Registry references missing agent directory: ${id}`);
}

for (const dir of ["decisions", "inbox", "reviews", "state", "tasks", "workflows"]) {
  assert.equal(isDirectory(join(executiveDir, dir)), true, `Missing .siso/executive/${dir}/`);
}

for (const file of ["README.md", "profile.md", "research-index.md"]) {
  assert.equal(existsSync(join(executiveDir, file)), true, `Missing .siso/executive/${file}`);
}

if (registryIds.has("_runtime")) {
  fail("Registry must not include _runtime");
}

console.log("PERSISTENT_AGENT_STATE_SMOKE_OK");
