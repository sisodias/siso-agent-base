#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const piRoot = process.env.SISO_PI_PACKAGE_ROOT
  ?? join(homedir(), ".siso-agent-base", "node_modules", "@mariozechner", "pi-coding-agent", "dist");

const checks = [
  {
    file: "modes/interactive/components/tool-execution.js",
    needles: ["function sisoCompactToolDisplay", "function sisoCompactToolExecution", "function sisoStatusIcon", "function sisoErrorReason", "function sisoBashIntent", "missing file", "readableStatus", "launching", "labels = {", "council", "if (!this.expanded)", "const expandHint = \"\"", "const bgFn = (text) => text;", "this.contentBox = new Box(1, 0", "this.contentText = new Text(\"\", 1, 0", "this.addChild(this.contentBox);", "const useSelfShell = this.expanded && this.getRenderShell() === \"self\"", "inactiveContainer.clear()", "animationPhase = 0", "startSisoAnimation()", "setInterval(() =>", "sisoStatusIcon(statusKind, phase)", "sisoToolChip(name)", "working···"],
  },
  {
    file: "core/tools/bash.js",
    needles: ["const BASH_PREVIEW_LINES = 1;"],
  },
  {
    file: "core/tools/read.js",
    needles: ["const maxLines = options.expanded ? lines.length : 1;"],
  },
  {
    file: "core/tools/grep.js",
    needles: ["const maxLines = options.expanded ? lines.length : 1;"],
  },
  {
    file: "core/tools/find.js",
    needles: ["const maxLines = options.expanded ? lines.length : 1;"],
  },
  {
    file: "core/tools/ls.js",
    needles: ["const maxLines = options.expanded ? lines.length : 1;"],
  },
  {
    file: "modes/interactive/components/tree-selector.js",
    needles: ["Object.entries(args || {})", "return `["],
  },
  {
    file: "modes/interactive/components/skill-invocation-message.js",
    needles: ["`◆ \\x1b[1mskill\\x1b[22m ${this.skillBlock.name} · active`", "`◆ \\x1b[1mskill\\x1b[22m `", "· loaded"],
  },
  {
    file: "modes/interactive/components/footer.js",
    needles: ["function sisoDisplayModel", "function sanitizeStatusText", "Oracle GPT-5.5", "Build clean SISO footer", "sisoContextTokens", "contextBar", "calls", "sub", "active", "const modelText = theme.fg(\"accent\", sisoDisplayModel", "Footer is intentionally single-line"],
  },
  {
    file: "modes/interactive/components/model-selector.js",
    needles: ["function sisoDisplayModel", "sisoDisplayModel(item.id)", "Model Name: ${sisoDisplayModel(selected.model.id)}"],
  },
  {
    file: "modes/interactive/components/scoped-models-selector.js",
    needles: ["function sisoDisplayModel", "sisoDisplayModel(item.model.id)", "Model Name: ${sisoDisplayModel(selected.model.id)}"],
  },
  {
    file: "modes/interactive/interactive-mode.js",
    needles: ["function sisoDisplayModel", "Model: ${sisoDisplayModel(model.id)}"],
  },
];

for (const check of checks) {
  const path = join(piRoot, check.file);
  if (!existsSync(path)) throw new Error(`missing ${path}`);
  const syntax = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  if (syntax.status !== 0) throw new Error(`syntax check failed for ${path}\n${syntax.stdout}\n${syntax.stderr}`);
  const text = readFileSync(path, "utf8");
  for (const needle of check.needles) {
    if (!text.includes(needle)) throw new Error(`missing renderer patch marker "${needle}" in ${path}`);
  }
}

console.log("SISO_PI_NATIVE_RENDERERS_SMOKE_OK");
