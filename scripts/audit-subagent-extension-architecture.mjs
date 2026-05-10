#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyPackageForSubagentUse } from "../extensions/siso-agent-router/subagent-supervisor.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalogPath = path.join(ROOT, "data", "extensions", "extension-catalog.json");
const outPath = path.join(ROOT, "docs", "strategy", "subagent-extension-architecture-audit.md");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const names = [
  "pi-subagents",
  "pi-crew",
  "@spences10/pi-team-mode",
  "@melihmucuk/pi-crew",
  "pi-messenger-swarm",
  "taskplane",
  "@0xkobold/pi-orchestration",
  "@x1any/pi-swarm",
  "@tintinweb/pi-subagents",
  "@e9n/pi-subagent",
  "pi-agent-router",
  "pi-task-subagents",
];

function pkg(name) {
  return catalog.packages.find((item) => item.name === name);
}

function layerFit(name) {
  const map = {
    "pi-subagents": "workflow recipes, parallel/chain ergonomics, result handoff patterns",
    "pi-crew": "task graph, heartbeat, mailbox, retry/deadletter references",
    "@spences10/pi-team-mode": "lead-owned mailbox, read/ack semantics, team grammar, orphan identity checks",
    "@melihmucuk/pi-crew": "interactive respond/done lifecycle and owner-session delivery",
    "pi-messenger-swarm": "append-only channel feed model and channel grammar",
    "taskplane": "batch orchestration, DAG waves, quality gates, integration/merge telemetry",
    "@0xkobold/pi-orchestration": "context mode vocabulary, worktree/fork semantics",
    "@x1any/pi-swarm": "markdown agent registry, trust prompt, tool ACL grammar",
    "@tintinweb/pi-subagents": "markdown agent definitions and subagent invocation patterns",
    "@e9n/pi-subagent": "small subagent definition and delegation pattern reference",
    "pi-agent-router": "router/delegation controls and extension-tool guardrails",
    "pi-task-subagents": "task-oriented retained-session and retry vocabulary",
  };
  return map[name] ?? "watch for future fit";
}

function currentSisoLayer(name) {
  if (["pi-subagents", "taskplane", "pi-crew", "@spences10/pi-team-mode"].includes(name)) return "task scheduler / supervisor / mailbox";
  if (["pi-messenger-swarm"].includes(name)) return "mailbox-feed channel projection";
  if (["@x1any/pi-swarm", "@tintinweb/pi-subagents", "@e9n/pi-subagent"].includes(name)) return "project-agent registry / ACL";
  if (["@melihmucuk/pi-crew"].includes(name)) return "mailbox owner-session lifecycle";
  if (["@0xkobold/pi-orchestration", "pi-task-subagents"].includes(name)) return "workflow context/worktree backlog";
  if (["pi-agent-router"].includes(name)) return "router policy / ACL backlog";
  return "catalog watch";
}

function nextAction(row) {
  if (row.use === "reference") return "keep as copy-pattern reference; do not install as runtime";
  if (row.action === "install-check") return "test in isolated extension store before any activation";
  if (row.action === "audit") return "deep audit before copying narrow patterns";
  return "watch";
}

const rows = names.map((name) => {
  const item = pkg(name);
  if (!item) throw new Error(`missing package: ${name}`);
  const classification = classifyPackageForSubagentUse(item);
  return {
    name,
    packageUrl: item.packageUrl,
    repoUrl: item.repoUrl,
    recommendation: item.recommendation,
    layer: currentSisoLayer(name),
    fit: layerFit(name),
    ...classification,
  };
});

const lines = [
  "# Subagent Extension Architecture Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "This audit compares the tracked Pi subagent packages against the now-wired SISO subagent layers.",
  "",
  "## Current SISO Layers",
  "",
  "- Task graph: `task-scheduler.js`, `task-store.js`, `siso_task_schedule`, `/tasks`.",
  "- Mailbox/feed: `mailbox-feed.js`, `notifications.js`, `siso_mailbox`, `/agents report` mailbox summary.",
  "- Project agents/ACL: `project-agent-registry.js`, `siso_project_agents`, `siso_spawn agent=...`.",
  "- Supervisor: `subagent-supervisor.js`, `siso_supervisor`, `/agents report` supervisor summary.",
  "- Package workspace: `subagent-extension-workspace.md`, `subagent-improve-log.md`, `subagent-extension-package-map.md`.",
  "",
  "## Package Fit",
  "",
  "| Package | SISO Layer | Classification | Next Action | Useful Pattern |",
  "|---|---|---|---|---|",
  ...rows.map((row) => `| [${row.name}](${row.packageUrl}) | ${row.layer} | ${row.use} / ${row.action} / ${row.tier} | ${nextAction(row)} | ${row.fit} |`),
  "",
  "## Rule",
  "",
  "External packages remain references unless they provide a narrow, isolated adapter. SISO core owns routing, task graph, lifecycle, permissions, mailbox state, and supervisor records.",
  "",
];

fs.writeFileSync(outPath, lines.join("\n"));
console.log(`SISO_SUBAGENT_EXTENSION_ARCHITECTURE_AUDIT_OK packages=${rows.length} out=${outPath}`);
