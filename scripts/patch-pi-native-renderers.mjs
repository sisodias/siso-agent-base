#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const piRoot = process.env.SISO_PI_PACKAGE_ROOT
  ?? join(homedir(), ".siso-agent-base", "node_modules", "@mariozechner", "pi-coding-agent", "dist");

const toolHelpers = `import { theme } from "../theme/theme.js";
function sisoSingleLine(value) {
    return String(value ?? "").replace(/\\s+/g, " ").trim();
}
function sisoShortPath(value) {
    const path = String(value ?? "").replaceAll("\\\\", "/");
    const parts = path.split("/").filter(Boolean);
    return parts.length <= 3 ? path : \`…/\${parts.slice(-3).join("/")}\`;
}
function sisoCountLines(value) {
    const text = String(value ?? "");
    return text ? text.split(/\\r?\\n/).length : 0;
}
function sisoStatusIcon(kind, phase = 0) {
    if (kind === "error") return theme.fg("error", "●");
    if (kind === "running") {
        const frames = [
            theme.fg("accent", "◐"),
            theme.fg("accent", "◓"),
            theme.fg("warning", "◑"),
            theme.fg("accent", "◒"),
        ];
        return frames[Math.abs(phase) % frames.length];
    }
    if (kind === "queued") return theme.fg("muted", "○");
    return theme.fg("success", "●");
}
function sisoStatusText(text, kind, phase = 0) {
    if (kind === "error") return theme.fg("error", text);
    if (kind === "running") {
        const shimmer = ["working", "working·", "working··", "working···"];
        const label = text === "launching" ? "launching" : shimmer[Math.abs(phase) % shimmer.length];
        return theme.fg("accent", label);
    }
    if (kind === "done") return theme.fg("success", text);
    return theme.fg("muted", text);
}
function sisoToolKind(name) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    if (tool === "bash") return "term";
    if (tool === "read" || tool === "write" || tool === "edit" || tool === "ls" || tool === "find" || tool === "grep") return "file";
    if (tool === "siso") return "agent";
    return "tool";
}
function sisoPadRight(value, width) {
    const text = String(value ?? "");
    return text.length >= width ? text.slice(0, width) : \`\${text}\${" ".repeat(width - text.length)}\`;
}
function sisoToolChip(name) {
    return theme.fg("muted", sisoPadRight(sisoToolKind(name), 5));
}
function sisoErrorReason(name, args, result) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const data = args && typeof args === "object" ? args : {};
    const output = result?.content ? sisoSingleLine(getRenderedTextOutput(result, false)).toLowerCase() : "";
    if (tool === "read" && (output.includes("no such file") || output.includes("not found") || output.includes("enoent"))) return "missing file";
    if (output.includes("permission denied") || output.includes("eacces")) return "permission denied";
    if (output.includes("command not found") || output.includes("not found:")) return "command not found";
    if (output.includes("no such file") || output.includes("enoent")) return "missing file";
    if (output.includes("timed out") || output.includes("timeout")) return "timeout";
    if (tool === "grep" || tool === "find") return "no matches";
    if (tool === "bash" && data.command) return "command failed";
    return "error";
}
function sisoBashIntent(command) {
    const cmd = sisoSingleLine(command);
    if (!cmd) return "";
    if (/\\bagent-deck\\b/.test(cmd)) return "inspect agent-deck";
    if (/\\btmux\\b/.test(cmd)) return "inspect tmux";
    if (/\\bgit status\\b/.test(cmd)) return "git status";
    if (/\\brg\\b|\\bgrep\\b/.test(cmd)) return "search workspace";
    if (/\\bfind\\b/.test(cmd)) return "find files";
    if (/\\bls\\b/.test(cmd)) return "list files";
    if (/\\bsed\\b|\\bcat\\b|\\bhead\\b|\\btail\\b/.test(cmd)) return "inspect file";
    if (/\\bnpm\\b|\\bpnpm\\b|\\byarn\\b/.test(cmd)) return "run package script";
    return cmd;
}
function sisoCompactToolDisplay(name, args, width = 96) {
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const data = args && typeof args === "object" ? args : {};
    let suffix = "";
    if (tool === "bash") suffix = \` \${sisoBashIntent(data.command)}\`;
    else if (tool === "read" || tool === "write" || tool === "ls" || tool === "find") suffix = data.path || data.file_path ? \` \${sisoShortPath(data.path ?? data.file_path)}\` : "";
    else if (tool === "edit") {
        const oldText = data.old_string ?? data.oldText ?? "";
        const newText = data.new_string ?? data.newText ?? "";
        const delta = sisoCountLines(newText) - sisoCountLines(oldText);
        suffix = \`\${data.path || data.file_path ? \` \${sisoShortPath(data.path ?? data.file_path)}\` : ""}\${oldText || newText ? \` (\${delta >= 0 ? "+" : ""}\${delta} lines)\` : ""}\`;
    }
    else if (tool.includes("spawn")) suffix = data.task || data.prompt ? \` \${sisoSingleLine(data.task ?? data.prompt)}\` : "";
    else if (tool === "siso") {
        const action = String(data.action ?? data.domain ?? "route").toLowerCase();
        const op = data.op || data.mode ? \` \${data.op ?? data.mode}\` : "";
        const labels = {
            spawn: "agent",
            council: "council",
            workflow: "workflow",
            "workflow/orchestrate": "workflow",
            orchestrate: "workflow",
            child: "agent",
            skill: "skill",
            task: "task",
            repo: "research",
            route: "route",
        };
        const title = labels[action] ?? action;
        const brief = data.task ?? data.query ?? data.title ?? data.id ?? "";
        return sisoSingleLine(\`\${title}\${op}\${brief ? \` · \${brief}\` : ""}\`).slice(0, width);
    }
    else {
        const first = Object.entries(data).find(([, value]) => ["string", "number", "boolean"].includes(typeof value));
        suffix = first ? \` \${first[0]}=\${sisoSingleLine(first[1])}\` : "";
    }
    const text = \`\${tool}\${suffix}\`;
    return text.length > width ? \`\${text.slice(0, width - 1)}…\` : text;
}
function sisoCompactToolExecution(name, args, result, isPartial, phase = 0) {
    const data = args && typeof args === "object" ? args : {};
    const tool = String(name ?? "tool").replace(/^siso_/, "siso ");
    const statusKind = isPartial ? "running" : result?.isError ? "error" : result ? "done" : "queued";
    const action = String(data.action ?? data.domain ?? "").toLowerCase();
    const readableStatus = tool === "siso" && action === "spawn"
        ? statusKind === "running" ? "launching" : statusKind === "done" ? "launched" : statusKind
        : tool === "siso" && action === "child"
            ? statusKind === "done" ? "updated" : statusKind
            : statusKind === "error" ? sisoErrorReason(name, args, result)
                : statusKind;
    const expandHint = "";
    const text = \`\${sisoStatusIcon(statusKind, phase)} \${sisoToolChip(name)} \${theme.fg("toolTitle", sisoCompactToolDisplay(name, args))} \${theme.fg("muted", "·")} \${sisoStatusText(readableStatus, statusKind, phase)}\${expandHint}\`;
    return text.length > 140 ? \`\${text.slice(0, 139)}…\` : text;
}
`;

const modelHelpers = `function sisoDisplayModel(id) {
    const map = {
        "claude-opus-4-7": "Oracle GPT-5.5",
        "claude-sonnet-4-6": "Spark",
        "claude-haiku-4-5-20251001": "MiniMax M2.7",
        "gpt-5.4-mini": "GPT-5.4 Mini",
        "gpt-5.5": "Oracle GPT-5.5",
        "gpt-5.3-codex-spark": "Spark",
        "MiniMax-M2.7-highspeed": "MiniMax M2.7",
    };
    return map[id] ?? String(id ?? "no-model").replace(/-202\\d{5,8}$/, "");
}
`;

const footerHelpers = `${modelHelpers}function sanitizeStatusText(text) {
    return String(text ?? "")
        .split(/\\s+/g)
        .join(" ")
        .trim();
}
`;

const cleanFooterBlock = [
  "        // Build clean SISO footer: context left, live activity middle, model right.",
  "        const sisoContextTokens = totalInput + totalOutput;",
  "        const sisoContextWindow = state.model?.contextWindow ?? 200000;",
  "        const sisoContextPercentValue = sisoContextWindow > 0 ? Math.round((sisoContextTokens / sisoContextWindow) * 100) : 0;",
  "        const contextWidth = Math.max(8, Math.min(28, Math.floor(width * 0.22)));",
  "        const filled = Math.max(0, Math.min(contextWidth, Math.round((sisoContextPercentValue / 100) * contextWidth)));",
  "        const empty = Math.max(0, contextWidth - filled);",
  "        const barColor = sisoContextPercentValue > 90 ? \"error\" : sisoContextPercentValue > 70 ? \"warning\" : \"accent\";",
  "        const contextBar = `${theme.fg(barColor, \"█\".repeat(filled))}${theme.fg(\"dim\", \"░\".repeat(empty))}`;",
  "        const contextText = `${contextBar} ${theme.fg(barColor, `${sisoContextPercentValue}%`)} ${theme.fg(\"dim\", formatTokens(sisoContextTokens))}`;",
  "        const extensionStatuses = this.footerData.getExtensionStatuses();",
  "        let calls = 0;",
  "        let activeAgents = 0;",
  "        let subAgents = 0;",
  "        for (const [key, rawValue] of extensionStatuses.entries()) {",
  "            const value = sanitizeStatusText(String(rawValue ?? \"\")).toLowerCase();",
  "            const combined = `${String(key).toLowerCase()} ${value}`;",
  "            const nums = [...combined.matchAll(/(calls?|tools?|sub-?agents?|agents?|active|running)[:= ]+(\\d+)/g)];",
  "            for (const match of nums) {",
  "                const label = match[1];",
  "                const n = Number(match[2]);",
  "                if (!Number.isFinite(n)) continue;",
  "                if (label.includes(\"call\") || label.includes(\"tool\")) calls = Math.max(calls, n);",
  "                else if (label.includes(\"sub\")) subAgents = Math.max(subAgents, n);",
  "                else if (label.includes(\"active\") || label.includes(\"running\")) activeAgents = Math.max(activeAgents, n);",
  "                else if (label.includes(\"agent\")) subAgents = Math.max(subAgents, n);",
  "            }",
  "            if (/active|running|spawn|agent/.test(combined) && !nums.length) activeAgents += 1;",
  "        }",
  "        const activityParts = [];",
  "        activityParts.push(`${theme.fg(\"muted\", \"calls\")} ${theme.fg(calls ? \"accent\" : \"dim\", String(calls))}`);",
  "        activityParts.push(`${theme.fg(\"muted\", \"sub\")} ${theme.fg(subAgents ? \"accent\" : \"dim\", String(subAgents))}`);",
  "        activityParts.push(`${theme.fg(\"muted\", \"active\")} ${theme.fg(activeAgents ? \"success\" : \"dim\", String(activeAgents))}`);",
  "        const activityText = activityParts.join(theme.fg(\"dim\", \"  ·  \"));",
  "        const modelText = theme.fg(\"accent\", sisoDisplayModel(state.model?.id || \"no-model\"));",
  "        const left = `${contextText}  ${theme.fg(\"dim\", \"│\")}  ${activityText}`;",
  "        const leftWidth = visibleWidth(left);",
  "        const modelWidth = visibleWidth(modelText);",
  "        let footerLine;",
  "        if (leftWidth + modelWidth + 2 <= width) {",
  "            footerLine = left + \" \".repeat(width - leftWidth - modelWidth) + modelText;",
  "        }",
  "        else {",
  "            const availableLeft = Math.max(0, width - modelWidth - 2);",
  "            footerLine = `${truncateToWidth(left, availableLeft, theme.fg(\"dim\", \"…\"))}  ${modelText}`;",
  "        }",
  "        const lines = [footerLine];",
].join("\n");

const patches = [
  {
    file: "modes/interactive/components/tool-execution.js",
    replacements: [
      {
        from: [
          `import { theme } from "../theme/theme.js";\n`,
          toolHelpers,
        ],
        to: toolHelpers,
      },
      {
        from: [
          `            renderContainer.clear();\n            const callRenderer = this.getCallRenderer();\n`,
          `            renderContainer.clear();\n            if (!this.expanded) {\n                renderContainer.addChild(new Text(theme.fg("toolTitle", theme.bold(sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase))), 0, 0));\n                hasContent = true;\n            }\n            else {\n            const callRenderer = this.getCallRenderer();\n`,
          `            renderContainer.clear();\n            if (!this.expanded) {\n                renderContainer.addChild(new Text(sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase), 0, 0));\n                hasContent = true;\n            }\n            else {\n            const callRenderer = this.getCallRenderer();\n`,
          `            inactiveContainer.clear();\n            if (renderContainer instanceof Box) {\n                renderContainer.setBgFn(bgFn);\n            }\n            renderContainer.clear();\n            if (!this.expanded) {\n                renderContainer.addChild(new Text(sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase), 0, 0));\n                hasContent = true;\n            }\n            else {\n            const callRenderer = this.getCallRenderer();\n`,
        ],
        to: `            renderContainer.clear();\n            const callRenderer = this.getCallRenderer();\n`,
      },
      {
        from: [
          `            }\n        }\n        else {\n            this.contentText.setCustomBgFn(bgFn);\n`,
          `            }\n            }\n        }\n        else {\n            this.contentText.setCustomBgFn(bgFn);\n`,
          `            }\n        }\n        else {\n            this.contentText.setCustomBgFn(bgFn);\n`,
        ],
        to: `            }\n            }\n        }\n        else {\n            this.contentText.setCustomBgFn(bgFn);\n`,
      },
      {
        from: [
          `        let text = theme.fg("toolTitle", theme.bold(this.toolName));\n        const content = JSON.stringify(this.args, null, 2);\n        if (content) {\n            text += \`\\n\\n\${content}\`;\n        }\n`,
          `        let text = theme.fg("toolTitle", theme.bold(sisoCompactToolDisplay(this.toolName, this.args)));\n        const content = this.expanded ? JSON.stringify(this.args, null, 2) : "";\n        if (content) {\n            text += \`\\n\\n\${content}\`;\n        }\n`,
          `        let text = theme.fg("toolTitle", theme.bold(\`• \${sisoCompactToolDisplay(this.toolName, this.args)}\`));\n        const content = this.expanded ? JSON.stringify(this.args, null, 2) : "";\n        if (content) {\n            text += \`\\n\\n\${content}\`;\n        }\n`,
          `        if (!this.expanded) return theme.fg("toolTitle", theme.bold(sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase)));\n        let text = theme.fg("toolTitle", theme.bold(\`• \${sisoCompactToolDisplay(this.toolName, this.args)}\`));\n        const content = JSON.stringify(this.args, null, 2);\n        if (content) {\n            text += \`\\n\\n\${content}\`;\n        }\n`,
          `        if (!this.expanded) return sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase);\n        let text = theme.fg("toolTitle", theme.bold(\`\${sisoStatusDot(this.result?.isError ? "error" : this.isPartial ? "running" : "done")} \${sisoCompactToolDisplay(this.toolName, this.args)}\`));\n        const content = JSON.stringify(this.args, null, 2);\n        if (content) {\n            text += \`\\n\\n\${content}\`;\n        }\n`,
        ],
        to: `        if (!this.expanded) return sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase);\n        let text = theme.fg("toolTitle", theme.bold(\`\${sisoStatusIcon(this.result?.isError ? "error" : this.isPartial ? "running" : "done", this.animationPhase)} \${sisoCompactToolDisplay(this.toolName, this.args)}\`));\n        const content = JSON.stringify(this.args, null, 2);\n        if (content) {\n            text += \`\\n\\n\${content}\`;\n        }\n`,
      },
      {
        from: [
          `        const bgFn = this.isPartial\n            ? (text) => theme.bg("toolPendingBg", text)\n            : this.result?.isError\n                ? (text) => theme.bg("toolErrorBg", text)\n                : (text) => theme.bg("toolSuccessBg", text);\n`,
          `        const bgFn = (text) => text;\n`,
        ],
        to: `        const bgFn = (text) => text;\n`,
      },
    ],
  },
  {
    file: "core/tools/bash.js",
    replacements: [
      { from: [`const BASH_PREVIEW_LINES = 5;`, `const BASH_PREVIEW_LINES = 3;`, `const BASH_PREVIEW_LINES = 1;`], to: `const BASH_PREVIEW_LINES = 1;` },
    ],
  },
  {
    file: "core/tools/read.js",
    replacements: [
      { from: [`    const maxLines = options.expanded ? lines.length : 10;`, `    const maxLines = options.expanded ? lines.length : 4;`, `    const maxLines = options.expanded ? lines.length : 1;`], to: `    const maxLines = options.expanded ? lines.length : 1;` },
    ],
  },
  {
    file: "core/tools/grep.js",
    replacements: [
      { from: [`        const maxLines = options.expanded ? lines.length : 15;`, `        const maxLines = options.expanded ? lines.length : 1;`], to: `        const maxLines = options.expanded ? lines.length : 1;` },
    ],
  },
  {
    file: "core/tools/find.js",
    replacements: [
      { from: [`        const maxLines = options.expanded ? lines.length : 20;`, `        const maxLines = options.expanded ? lines.length : 1;`], to: `        const maxLines = options.expanded ? lines.length : 1;` },
    ],
  },
  {
    file: "core/tools/ls.js",
    replacements: [
      { from: [`        const maxLines = options.expanded ? lines.length : 20;`, `        const maxLines = options.expanded ? lines.length : 1;`], to: `        const maxLines = options.expanded ? lines.length : 1;` },
    ],
  },
  {
    file: "modes/interactive/components/tree-selector.js",
    replacements: [
      {
        from: [
          `                // Custom tool - show name and truncated JSON args\n                const argsStr = JSON.stringify(args).slice(0, 40);\n                return \`[\${name}: \${argsStr}\${JSON.stringify(args).length > 40 ? "..." : ""}]\`;\n`,
          `                const first = Object.entries(args || {}).find(([, value]) => ["string", "number", "boolean"].includes(typeof value));\n                const detail = first ? \`\${first[0]}=\${String(first[1]).replace(/\\s+/g, " ").trim().slice(0, 50)}\` : "ready";\n                return \`[\${name}: \${detail}\${detail.length >= 50 ? "..." : ""}]\`;\n`,
        ],
        to: `                const first = Object.entries(args || {}).find(([, value]) => ["string", "number", "boolean"].includes(typeof value));\n                const detail = first ? \`\${first[0]}=\${String(first[1]).replace(/\\s+/g, " ").trim().slice(0, 50)}\` : "ready";\n                return \`[\${name}: \${detail}\${detail.length >= 50 ? "..." : ""}]\`;\n`,
      },
    ],
  },
  {
    file: "modes/interactive/components/skill-invocation-message.js",
    replacements: [
      {
        from: [`            const label = theme.fg("customMessageLabel", \`\\x1b[1m[skill]\\x1b[22m\`);\n`, `            const label = theme.fg("customMessageLabel", \`\\x1b[1mskill\\x1b[22m \${this.skillBlock.name}\`);\n`, `            const label = theme.fg("customMessageLabel", \`• \\x1b[1mskill\\x1b[22m \${this.skillBlock.name}\`);\n`, `            const label = theme.fg("customMessageLabel", \`◆ \\x1b[1mskill\\x1b[22m \${this.skillBlock.name} · active\`);\n`],
        to: `            const label = theme.fg("customMessageLabel", \`◆ \\x1b[1mskill\\x1b[22m \${this.skillBlock.name} · active\`);\n`,
      },
      {
        from: [`            const line = theme.fg("customMessageLabel", \`\\x1b[1m[skill]\\x1b[22m \`) +\n`, `            const line = theme.fg("customMessageLabel", \`\\x1b[1mskill\\x1b[22m \`) +\n`, `            const line = theme.fg("customMessageLabel", \`• \\x1b[1mskill\\x1b[22m \`) +\n`, `            const line = theme.fg("customMessageLabel", \`◆ \\x1b[1mskill\\x1b[22m \`) +\n`],
        to: `            const line = theme.fg("customMessageLabel", \`◆ \\x1b[1mskill\\x1b[22m \`) +\n`,
      },
      {
        from: [`                theme.fg("dim", \` (\${keyText("app.tools.expand")} to expand)\`);\n`, `                theme.fg("dim", " · loaded");\n`],
        to: `                theme.fg("dim", " · loaded");\n`,
      },
    ],
  },
  {
    file: "modes/interactive/components/footer.js",
    replacements: [],
  },
  {
    file: "modes/interactive/components/model-selector.js",
    replacements: [
      {
        from: [
          `                const modelText = \`\${item.id}\`;\n`,
          `                const modelText = \`\${sisoDisplayModel(item.id)} (\${item.id})\`;\n`,
          `                const modelText = \`\${sisoDisplayModel(item.id)}\`;\n`,
        ],
        to: `                const modelText = \`\${sisoDisplayModel(item.id)}\`;\n`,
      },
      {
        from: [
          `                const modelText = \`  \${item.id}\`;\n`,
          `                const modelText = \`  \${sisoDisplayModel(item.id)} (\${item.id})\`;\n`,
          `                const modelText = \`  \${sisoDisplayModel(item.id)}\`;\n`,
        ],
        to: `                const modelText = \`  \${sisoDisplayModel(item.id)}\`;\n`,
      },
      {
        from: [
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${selected.model.name}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${selected.model.name} · \${selected.model.id}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${sisoDisplayModel(selected.model.id)}\`), 0, 0));\n`,
        ],
        to: `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${sisoDisplayModel(selected.model.id)}\`), 0, 0));\n`,
      },
    ],
  },
  {
    file: "modes/interactive/components/scoped-models-selector.js",
    replacements: [
      {
        from: [
          `            const modelText = isSelected ? theme.fg("accent", item.model.id) : item.model.id;\n`,
          `            const modelLabel = \`\${sisoDisplayModel(item.model.id)} (\${item.model.id})\`;\n            const modelText = isSelected ? theme.fg("accent", modelLabel) : modelLabel;\n`,
          `            const modelLabel = \`\${sisoDisplayModel(item.model.id)}\`;\n            const modelText = isSelected ? theme.fg("accent", modelLabel) : modelLabel;\n`,
        ],
        to: `            const modelLabel = \`\${sisoDisplayModel(item.model.id)}\`;\n            const modelText = isSelected ? theme.fg("accent", modelLabel) : modelLabel;\n`,
      },
      {
        from: [
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${selected.model.name}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${selected.model.name} · \${selected.model.id}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${sisoDisplayModel(selected.model.id)}\`), 0, 0));\n`,
        ],
        to: `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${sisoDisplayModel(selected.model.id)}\`), 0, 0));\n`,
      },
    ],
  },
  {
    file: "modes/interactive/interactive-mode.js",
    replacements: [
      {
        from: [
          `                this.showStatus(\`Model: \${model.id}\`);\n`,
          `                this.showStatus(\`Model: \${sisoDisplayModel(model.id)}\`);\n`,
        ],
        to: `                this.showStatus(\`Model: \${sisoDisplayModel(model.id)}\`);\n`,
      },
      {
        from: [
          `                    this.showStatus(\`Model: \${model.id}\`);\n`,
          `                    this.showStatus(\`Model: \${sisoDisplayModel(model.id)}\`);\n`,
        ],
        to: `                    this.showStatus(\`Model: \${sisoDisplayModel(model.id)}\`);\n`,
      },
    ],
  },
];

let changed = 0;
for (const patch of patches) {
  const path = join(piRoot, patch.file);
  if (!existsSync(path)) throw new Error(`missing Pi renderer file: ${path}`);
  let text = readFileSync(path, "utf8");
  let next = text;
  if (patch.file === "modes/interactive/components/tool-execution.js") {
    next = next.replace(
      /import \{ theme \} from "\.\.\/theme\/theme\.js";\n(?:function sisoSingleLine[\s\S]*?)?export class ToolExecutionComponent/,
      `${toolHelpers}export class ToolExecutionComponent`,
    );
    next = next.replace(
      /    animationInterval;\n    animationPhase = 0;\n/g,
      "",
    );
    const animationMethods = `    startSisoAnimation() {
        if (this.animationInterval) return;
        this.animationInterval = setInterval(() => {
            if (!this.executionStarted || (!this.isPartial && this.result)) {
                this.stopSisoAnimation();
                return;
            }
            this.animationPhase = (this.animationPhase + 1) % 4;
            this.updateDisplay();
            this.ui.requestRender();
        }, 180);
    }
    stopSisoAnimation() {
        if (!this.animationInterval) return;
        clearInterval(this.animationInterval);
        this.animationInterval = undefined;
        this.animationPhase = 0;
    }
`;
    next = next.split(animationMethods).join("");
    next = next.replace(
      `        this.addChild(new Spacer(1));\n        // Always create all shell variants. contentBox is used for default renderer-based composition.\n`,
      `        // Always create all shell variants. contentBox is used for default renderer-based composition.\n`,
    );
    next = next.replace(
      `    convertedImages = new Map();\n    hideComponent = false;\n`,
      `    convertedImages = new Map();\n    animationInterval;\n    animationPhase = 0;\n    hideComponent = false;\n`,
    );
    next = next.replace(
      `    markExecutionStarted() {\n        this.executionStarted = true;\n        this.updateDisplay();\n        this.ui.requestRender();\n    }\n`,
      `    markExecutionStarted() {\n        this.executionStarted = true;\n        this.startSisoAnimation();\n        this.updateDisplay();\n        this.ui.requestRender();\n    }\n`,
    );
    next = next.replace(
      `    updateResult(result, isPartial = false) {\n        this.result = result;\n        this.isPartial = isPartial;\n        this.updateDisplay();\n        this.maybeConvertImagesForKitty();\n    }\n`,
      `    updateResult(result, isPartial = false) {\n        this.result = result;\n        this.isPartial = isPartial;\n        if (isPartial) this.startSisoAnimation();\n        else this.stopSisoAnimation();\n        this.updateDisplay();\n        this.maybeConvertImagesForKitty();\n    }\n`,
    );
    next = next.replace(
      `    maybeConvertImagesForKitty() {\n`,
      `${animationMethods}    maybeConvertImagesForKitty() {\n`,
    );
    if (!next.includes("sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase)")) {
    next = next.replace(
      `        this.contentBox = new Box(1, 1, (text) => theme.bg("toolPendingBg", text));\n`,
      `        this.contentBox = new Box(1, 0, (text) => theme.bg("toolPendingBg", text));\n`,
    );
    next = next.replace(
      `        this.contentText = new Text("", 1, 1, (text) => theme.bg("toolPendingBg", text));\n`,
      `        this.contentText = new Text("", 1, 0, (text) => theme.bg("toolPendingBg", text));\n`,
    );
    next = next.replace(
      `        if (this.hasRendererDefinition()) {\n            this.addChild(this.getRenderShell() === "self" ? this.selfRenderContainer : this.contentBox);\n        }\n        else {\n`,
      `        if (this.hasRendererDefinition()) {\n            if (this.getRenderShell() === "self") {\n                this.addChild(this.contentBox);\n                this.addChild(this.selfRenderContainer);\n            }\n            else {\n                this.addChild(this.contentBox);\n            }\n        }\n        else {\n`,
    );
    }
  }
  if (patch.file === "modes/interactive/components/footer.js") {
    next = next.replace(
      /import \{ theme \} from "\.\.\/theme\/theme\.js";\n(?:function sisoDisplayModel[\s\S]*?function sanitizeStatusText[\s\S]*?\n}\n|function sisoDisplayModel[\s\S]*?\n}\n)?/,
      `import { theme } from "../theme/theme.js";\n${footerHelpers}`,
    );
    next = next.replace(
      /\/\*\*\n \* Sanitize text for display in a single-line status\.[\s\S]*?function sanitizeStatusText\(text\) \{\n[\s\S]*?\n}\n/,
      "",
    );
    next = next.replace(
      /        \/\/ Build stats line[\s\S]*?        const lines = process\.env\.SISO_PI_FOOTER_CLEAN === "1" \? \[dimStatsLeft \+ dimRemainder\] : \[pwdLine, dimStatsLeft \+ dimRemainder\];/,
      cleanFooterBlock,
    );
    next = next.replace(
      /        \/\/ Build stats line[\s\S]*?        return lines;/,
      `${cleanFooterBlock}\n        // Footer is intentionally single-line: context, activity, model.\n        return lines;`,
    );
    next = next.replace(
      /        \/\/ Build clean SISO footer: context left, live activity middle, model right\.[\s\S]*?        const lines = \[footerLine\];/,
      cleanFooterBlock,
    );
    next = next.replace(
      /        \/\/ Extension statuses are merged into the stats\/model line above\.\n        return lines;/,
      `        // Footer is intentionally single-line: context, activity, model.\n        return lines;`,
    );
  }
  if (patch.file === "modes/interactive/components/model-selector.js" || patch.file === "modes/interactive/components/scoped-models-selector.js") {
    next = next.replace(
      /import \{ theme \} from "\.\.\/theme\/theme\.js";\n(?:function sisoDisplayModel[\s\S]*?\n}\n(?:function sanitizeStatusText[\s\S]*?\n}\n)*)?/,
      `import { theme } from "../theme/theme.js";\n${modelHelpers}`,
    );
  }
  if (patch.file === "modes/interactive/interactive-mode.js") {
    next = next.replace(
      /function sanitizeStatusText\(text\) \{[\s\S]*?\n}\n/g,
      "",
    );
    next = next.replace(
      /(const DEFAULT_CHECKPOINT_WARNING_THRESHOLD = 0\.8;\n|function isUnknownModel\(model\) \{)/,
      (match) => match.includes("DEFAULT_CHECKPOINT") ? `${match}${modelHelpers}` : `${modelHelpers}${match}`,
    );
    next = next.replace(
      /function sisoDisplayModel\(id\) \{[\s\S]*?\n}\nfunction sisoDisplayModel\(id\) \{/,
      "function sisoDisplayModel(id) {",
    );
  }
  for (const replacement of patch.replacements) {
    if (next.includes(replacement.to)) continue;
    const sources = Array.isArray(replacement.from) ? replacement.from : [replacement.from];
    const source = sources.find((candidate) => next.includes(candidate));
    if (!source) {
      if (patch.file === "modes/interactive/components/tool-execution.js") continue;
      throw new Error(`patch target not found in ${path}`);
    }
    next = next.replace(source, replacement.to);
  }
  if (next !== text) {
    writeFileSync(path, next);
    changed += 1;
    console.log(`patched ${path}`);
  } else {
    console.log(`ok ${path}`);
  }
}
console.log(`SISO_PI_NATIVE_RENDERERS_PATCH_OK changed=${changed}`);
