#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workspace = mkdtempSync(join(tmpdir(), "siso-persistent-agent-cli-"));
const agentId = "persistent-agent-system-improver";
const agentDir = join(workspace, ".siso", "agents", agentId);

mkdirSync(join(agentDir, "inbox"), { recursive: true });
mkdirSync(join(agentDir, "outbox"), { recursive: true });
mkdirSync(join(agentDir, "runs"), { recursive: true });

writeFileSync(join(workspace, ".siso", "agents", "registry.md"), `# Registry

- ${agentId}
`, "utf8");
writeFileSync(join(agentDir, "agent.md"), `# Agent: Persistent Agent System Improver

ID: ${agentId}
Role: improves the persistent agent system
`, "utf8");
writeFileSync(join(agentDir, "goals.md"), `# Goals

## Current Goal

Build the persistent-agent MVP.

## Success Criteria

- Inspect durable files.
- Continue work across sessions.
`, "utf8");
writeFileSync(join(agentDir, "memory.md"), `# Memory

- Durable files are the source of truth.
`, "utf8");
writeFileSync(join(agentDir, "controlled-paths.md"), `# Controlled Paths

- .siso/agents/
- bin/siso
`, "utf8");
writeFileSync(join(agentDir, "worklog.md"), `# Worklog

## 2026-05-10 - Last useful work

Created manual workflows.
`, "utf8");
writeFileSync(join(agentDir, "changelog.md"), `# Changelog

## 2026-05-10

- Added inspect workflow.
`, "utf8");
writeFileSync(join(agentDir, "metrics.md"), `# Metrics

- Runs: 2
- Estimated tokens: 1200
`, "utf8");
writeFileSync(join(agentDir, "inbox", "2026-05-10-next.md"), `# Next Inbox Item

Build the command activation loop.
`, "utf8");
writeFileSync(join(agentDir, "outbox", "next-run-request.md"), `# Next Run Request

Wire inspect and run commands.
`, "utf8");
writeFileSync(join(agentDir, "runs", "2026-05-10-0002-inspect-agent.md"), `# Run Report: Inspect Agent

Status: complete

## Next recommendation

Add a real command.
`, "utf8");

function runSiso(args) {
  return spawnSync("bash", [join(process.cwd(), "bin", "siso"), ...args], {
    cwd: workspace,
    env: {
      ...process.env,
      SISO_AGENT_BASE_DIR: process.cwd(),
      PATH: process.env.PATH ?? "",
    },
    encoding: "utf8",
    timeout: 2000,
  });
}

function runSisoAgent(args) {
  return spawnSync("bash", [join(process.cwd(), "bin", "siso-agent"), ...args], {
    cwd: workspace,
    env: {
      ...process.env,
      SISO_AGENT_BASE_DIR: process.cwd(),
      PATH: process.env.PATH ?? "",
    },
    encoding: "utf8",
    timeout: 2000,
  });
}

const help = runSisoAgent(["--help"]);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /siso agent inspect <agent-id>/);
assert.match(help.stdout, /siso-agent inspect <agent-id>/);
assert.match(help.stdout, /Use `siso agent \.\.\.` from the main CLI/);

const inspect = runSiso(["agent", "inspect", agentId]);
assert.equal(inspect.status, 0, inspect.stderr);
assert.match(inspect.stdout, new RegExp(`# Agent Inspection: ${agentId}`));
assert.match(inspect.stdout, /Build the persistent-agent MVP/);
assert.match(inspect.stdout, /Last useful work/);
assert.match(inspect.stdout, /Durable files are the source of truth/);
assert.match(inspect.stdout, /Controlled paths/);
assert.match(inspect.stdout, /Open inbox\/outbox items/);
assert.match(inspect.stdout, /Next suggested action/);
assert.match(inspect.stdout, /Wire inspect and run commands/);

const directInspect = runSisoAgent(["inspect", agentId]);
assert.equal(directInspect.status, 0, directInspect.stderr);
assert.match(directInspect.stdout, new RegExp(`# Agent Inspection: ${agentId}`));
assert.match(directInspect.stdout, /Build the persistent-agent MVP/);

const run = runSiso(["agent", "run", agentId, "--dry-run"]);
assert.equal(run.status, 0, run.stderr);
assert.match(run.stdout, new RegExp(`Persistent Agent Run Prompt: ${agentId}`));
assert.match(run.stdout, /Read durable state before acting/);
assert.match(run.stdout, /agent.md/);
assert.match(run.stdout, /goals.md/);
assert.match(run.stdout, /latest run report/);
assert.match(run.stdout, /Required output contract/);
assert.match(run.stdout, /run report/);
assert.match(run.stdout, /worklog.md/);
assert.match(run.stdout, /changelog.md/);
assert.match(run.stdout, /metrics.md/);
assert.match(run.stdout, /optional next-run request/);

const missing = runSiso(["agent", "inspect", "missing-agent"]);
assert.notEqual(missing.status, 0);
assert.match(missing.stderr, /Unknown persistent agent: missing-agent/);

console.log("PERSISTENT_AGENT_CLI_SMOKE_OK");
