#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(root, "scripts", "tui-demo.mjs");
const modes = ["composer", "tool-cards", "agent-ops", "workflow", "permissions", "messages", "menus", "settings", "mcp", "diff", "markdown", "budget", "transcript", "code", "agent-detail", "permissions-full", "help", "wizard", "sandbox", "narrow", "short", "all"];
const widths = [40, 80, 120];
const forbidden = [/child[_-]?(?:id|agent)?[_-]?[a-z0-9]*\d[a-z0-9-]{5,}/i, /task[_-]?(?:id)?[_-]?[a-z0-9]*\d[a-z0-9-]{5,}/i, /[a-f0-9]{24,}/i, /undefined/, /null/, /NaN/, /\[object Object\]/];

function stripAnsi(value) {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function assertIncludes(output, text, label) {
  if (!output.includes(text)) throw new Error(`${label}: missing ${JSON.stringify(text)}`);
}

for (const mode of modes) {
  for (const width of widths) {
    const result = spawnSync(process.execPath, [script, mode, `--width=${width}`, "--height=32"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, COLUMNS: String(width), LINES: "32", NO_COLOR: "1" },
    });
    if (result.status !== 0) {
      throw new Error(`${mode}@${width} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
    const plain = stripAnsi(result.stdout);
    assertIncludes(plain, "SISO", `${mode}@${width}`);
    assertIncludes(plain, width === 40 ? "TUI de" : "TUI demo", `${mode}@${width}`);
    assertIncludes(plain, width === 40 ? "Bifro" : "Bifrost", `${mode}@${width}`);
    for (const pattern of forbidden) {
      if (pattern.test(plain)) throw new Error(`${mode}@${width}: forbidden diagnostic/id ${pattern} in output\n${plain}`);
    }
    const maxLine = Math.max(...plain.split(/\r?\n/).map((line) => line.length));
    if (maxLine > width + 2) throw new Error(`${mode}@${width}: line too wide (${maxLine})`);

    if (mode === "tool-cards") {
      for (const label of ["Bash", "File edit", "Search"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "agent-ops") {
      for (const label of (width === 40 ? ["Active child", "Fleet"] : ["Active child agents", "5 tools", "2 tools", "0 tools", "Fleet budget"])) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "workflow") {
      for (const label of ["clean-room", "40 / 80", "Council"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "composer") {
      for (const label of ["Composer", "Prompt", "Enter"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "permissions") {
      for (const label of ["Permission", "Allow", "Deny"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "messages") {
      for (const label of ["Message", "Assistant", "System"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "menus") {
      for (const label of ["Slash", "/agents", "/workflow"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "settings") {
      for (const label of ["Settings", "Model", "Spark"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "mcp") {
      for (const label of ["MCP", "filesystem", "github"]) assertIncludes(plain, label, `${mode}@${width}`);
    }

    if (mode === "diff") {
      for (const label of ["Structured", "Diff", "+"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "markdown") {
      for (const label of ["Markdown", "UI plan", "Thinking"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "budget") {
      for (const label of ["Budget", "Context", "fleet"]) assertIncludes(plain, label, `${mode}@${width}`);
    }

    if (mode === "transcript") {
      for (const label of ["Transcript", "User", "Assistant", "Bash"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "code") {
      for (const label of ["Code", "export", "demo-only"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "agent-detail") {
      for (const label of ["Agent", "timeline", "tokens"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "permissions-full") {
      for (const label of ["Bash", "Edit", "Web", "Child"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "help") {
      for (const label of ["Help", "/agents", "Key"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "wizard") {
      for (const label of ["Wizard", "Project", "Approval"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "sandbox") {
      for (const label of ["Sandbox", "filesystem", "workspace"]) assertIncludes(plain, label, `${mode}@${width}`);
    }

    if (mode === "models") {
      for (const label of ["Models", "Spark", "Providers"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "search") {
      for (const label of ["Search", "Permission", "scripts"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "notifications") {
      for (const label of ["Notifications", "Child", "Rate"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "memory") {
      for (const label of ["Memory", "UI", "project"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "skills") {
      for (const label of ["Skills", "improve", "profile"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "tasks") {
      for (const label of ["Tasks", "Build", "worker"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "bifrost") {
      for (const label of ["Bifrost", "route", "calls"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "resume") {
      for (const label of ["Resume", "SISO", "TUI"]) assertIncludes(plain, label, `${mode}@${width}`);
    }

    if (mode === "prompt-complete") {
      for (const label of ["Prompt", "Queued", "sandbox"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "message-complete") {
      for (const label of ["User", "Assistant", "Tool group"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "tool-variants") {
      for (const label of ["Bash", "Read", "Search"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "permission-variants") {
      for (const label of ["Notebook", "Workflow", "Council"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "auth") {
      for (const label of ['Auth', 'OAuth', 'API']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "doctor") {
      for (const label of ['Doctor', 'launcher', 'Update']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "repo") {
      for (const label of ['Repo', 'Git', 'Branch']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "session") {
      for (const label of ['Session', 'Cost', 'Compaction']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "commands") {
      for (const label of ['Commands', '/agents', 'Theme']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "dialogs") {
      for (const label of ['Dialogs', 'Trust', 'Toast']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "media") {
      for (const label of ['Media', 'Image', 'Input']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "feedback") {
      for (const label of ['Feedback', 'Team', 'Desktop']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "layout") {
      for (const label of ['Layout', 'Nav', 'Tree']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "telemetry") {
      for (const label of ['Telemetry', 'calls', 'events']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "fleet-deep") {
      for (const label of ['Fleet', 'Queue', 'Council']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "security") {
      for (const label of ['Security', 'Approval', 'Environment']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "changes") {
      for (const label of ['Change', 'scripts', '+']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "accessibility") {
      for (const label of ['Accessibility', 'NO_COLOR', 'Keybinding']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "smoke-report") {
      for (const label of ['Smoke', 'tui-demo', 'failure']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "release") {
      for (const label of ['Release', '0.1', 'Install']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "router") {
      for (const label of ['Router', 'route', 'approval']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "context-deep") {
      for (const label of ['Context', 'system', 'Budget']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "notifications-deep") {
      for (const label of ['Child', 'Parent', 'hidden']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "attachments") {
      for (const label of ['Attachments', 'File', 'IDE']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "plan") {
      for (const label of ['Plan', 'Todos', 'Notebook']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "history") {
      for (const label of ['History', 'Export', 'JSONL']) assertIncludes(plain, label, `${mode}@${width}`);
    }

    if (mode === "review") {
      for (const label of ["Review", "Patch", "Rollback"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "data-tools") {
      for (const label of ["Data", "JSON", "CSV"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "browser") {
      for (const label of ["Browser", "Computer", "approval"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "processes") {
      for (const label of ["Processes", "Terminal", "TUI"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "experiments") {
      for (const label of ["Experiments", "Feature", "locale"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "theme-lab") {
      for (const label of ["Theme", "Color", "Density"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "privacy") {
      for (const label of ["Privacy", "retention", "Audit"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "templates") {
      for (const label of ["Templates", "Snippets", "Macro"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "extensions") {
      for (const label of ['Extensions', 'Profiles', 'Skill']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "catalog") {
      for (const label of ['Repo', 'SISO', 'recommend']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "benchmarks") {
      for (const label of ['Benchmarks', 'Latency', 'render']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "timeline-deep") {
      for (const label of ['Timeline', 'tools', 'Command']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "terminal") {
      for (const label of ['Terminal', 'truecolor', 'Resize']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "server") {
      for (const label of ['Server', 'Bifrost', 'tunnels']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "maintenance") {
      for (const label of ['Maintenance', 'Backups', 'Prune']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "migration") {
      for (const label of ['Migration', 'Compatibility', 'cards']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "opensource") {
      for (const label of ['Open source', 'licenses', 'Contributing']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "onboarding-deep") {
      for (const label of ['Onboarding', 'Project', 'Trust']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "workspace") {
      for (const label of ['Workspace', 'Dependency', 'Package']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "quality") {
      for (const label of ['Quality', 'Coverage', 'Typecheck']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "artifacts") {
      for (const label of ['Artifacts', 'Downloads', 'Cache']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "network-deep") {
      for (const label of ['Network', 'Rate', 'Quota']) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "alerts") {
      for (const label of ['Alerts', 'Incident', 'Recovery']) assertIncludes(plain, label, `${mode}@${width}`);
    }

    if (mode === "loading") {
      for (const label of ["SISO", "loading", "Bifrost"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "app-shell") {
      for (const label of ["SISO", "OpenCode", "Chat"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "centered-chat") {
      for (const label of ["SISO Chat", "centered", "Agent ops"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
    if (mode === "all") {
      for (const label of ["Primitive", "Composer", "Permissions", "Agents"]) assertIncludes(plain, label, `${mode}@${width}`);
    }
  }
}

console.log("SISO_TUI_DEMO_SMOKE_OK");
