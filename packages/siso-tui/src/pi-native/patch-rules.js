import { modelHelpersSource as modelHelpers } from "./model-helpers.js";
import { toolHelpersSource as toolHelpers } from "./tool-renderer.js";

export const piNativeRendererPatches = [
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
        to: `            inactiveContainer.clear();\n            if (renderContainer instanceof Box) {\n                renderContainer.setBgFn(bgFn);\n            }\n            renderContainer.clear();\n            if (!this.expanded) {\n                renderContainer.addChild(new Text(sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase), 0, 0));\n                hasContent = true;\n            }\n            else {\n            const callRenderer = this.getCallRenderer();\n`,
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
{
from: [
`    timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (optional, no default timeout)" })),`,
`    timeout: Type.Optional(Type.Number({ description: "Timeout in seconds. Use a generous value for file inspection/search commands that may traverse large trees; defaults to 120 seconds if omitted." })),`,
],
to: `    timeout: Type.Optional(Type.Number({ description: "Timeout in seconds. Use a generous value for file inspection/search commands that may traverse large trees; defaults to 120 seconds if omitted." })),`,
},
{
from: [
`        description: \`Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last \${DEFAULT_MAX_LINES} lines or \${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). If truncated, full output is saved to a temp file. Optionally provide a timeout in seconds.\`,`,
`        description: \`Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last \${DEFAULT_MAX_LINES} lines or \${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). If truncated, full output is saved to a temp file. Defaults to a 120 second timeout when timeout is omitted; pass a larger timeout for expensive file inspection/search commands.\`,`,
],
to: `        description: \`Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last \${DEFAULT_MAX_LINES} lines or \${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). If truncated, full output is saved to a temp file. Defaults to a 120 second timeout when timeout is omitted; pass a larger timeout for expensive file inspection/search commands.\`,`,
},
{
from: [
`        async execute(_toolCallId, { command, timeout }, signal, onUpdate, _ctx) {
            const resolvedCommand = commandPrefix ? \`\${commandPrefix}\\n\${command}\` : command;`,
`        async execute(_toolCallId, { command, timeout }, signal, onUpdate, _ctx) {
            const effectiveTimeout = timeout === undefined ? 120 : timeout;
            const resolvedCommand = commandPrefix ? \`\${commandPrefix}\\n\${command}\` : command;`,
],
to: `        async execute(_toolCallId, { command, timeout }, signal, onUpdate, _ctx) {
            const effectiveTimeout = timeout === undefined ? 120 : timeout;
            const resolvedCommand = commandPrefix ? \`\${commandPrefix}\\n\${command}\` : command;`,
},
{
from: [
`                        timeout,`,
`                        timeout: effectiveTimeout,`,
],
to: `                        timeout: effectiveTimeout,`,
},
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
          `            const item = this.filteredModels[i];\n            if (!item)\n                continue;\n            const isSelected = i === this.selectedIndex;\n            const isCurrent = modelsAreEqual(this.currentModel, item.model);\n            let line = "";\n`,
          `            const item = this.filteredModels[i];\n            if (!item)\n                continue;\n            const isSelected = i === this.selectedIndex;\n            const isCurrent = modelsAreEqual(this.currentModel, item.model);\n            const defaultProvider = this.settingsManager.getDefaultProvider?.();\n            const defaultModel = this.settingsManager.getDefaultModel?.();\n            const isDefault = item.provider === defaultProvider && item.id === defaultModel;\n            let line = "";\n`,
        ],
        to: `            const item = this.filteredModels[i];\n            if (!item)\n                continue;\n            const isSelected = i === this.selectedIndex;\n            const isCurrent = modelsAreEqual(this.currentModel, item.model);\n            const defaultProvider = this.settingsManager.getDefaultProvider?.();\n            const defaultModel = this.settingsManager.getDefaultModel?.();\n            const isDefault = item.provider === defaultProvider && item.id === defaultModel;\n            let line = "";\n`,
      },
      {
        from: [
          `                const modelText = \`\${item.id}\`;\n                const providerBadge = theme.fg("muted", \`[\${item.provider}]\`);\n                const checkmark = isCurrent ? theme.fg("success", " ✓") : "";\n                line = \`\${prefix + theme.fg("accent", modelText)} \${providerBadge}\${checkmark}\`;\n`,
          `                const modelText = \`\${sisoDisplayModel(item.id)} (\${item.id})\`;\n                const providerBadge = theme.fg("muted", \`[\${item.provider}]\`);\n                const checkmark = isCurrent ? theme.fg("success", " ✓") : "";\n                line = \`\${prefix + theme.fg("accent", modelText)} \${providerBadge}\${checkmark}\`;\n`,
          `                const modelText = \`\${sisoDisplayModel(item.id)}\`;\n                const providerBadge = theme.fg("muted", \`[\${item.provider}]\`);\n                const checkmark = isCurrent ? theme.fg("success", " ✓") : "";\n                line = \`\${prefix + theme.fg("accent", modelText)} \${providerBadge}\${checkmark}\`;\n`,
          `                const modelText = \`\${sisoDisplayModel(item.id)} · \${sisoModelAnnotation(item.id, item.provider)}\`;\n                const providerBadge = theme.fg("muted", \`[\${sisoModelGroup(item.id, item.provider)}]\`);\n                const currentMark = isCurrent ? theme.fg("success", " · current") : "";\n                const defaultMark = isDefault && !isCurrent ? theme.fg("muted", " · default") : "";\n                line = \`\${prefix + theme.fg("accent", modelText)} \${providerBadge}\${currentMark}\${defaultMark}\`;\n`,
          `                const modelText = \`\${sisoDisplayModel(item.id)} · \${sisoDisplayModel(item.id, item.provider, "annotation")}\`;\n                const providerBadge = theme.fg("muted", \`[\${sisoDisplayModel(item.id, item.provider, "group")}]\`);\n                const currentMark = isCurrent ? theme.fg("success", " · current") : "";\n                const defaultMark = isDefault && !isCurrent ? theme.fg("muted", " · default") : "";\n                line = \`\${prefix + theme.fg("accent", modelText)} \${providerBadge}\${currentMark}\${defaultMark}\`;\n`,
        ],
        to: `                const modelText = \`\${sisoDisplayModel(item.id)} · \${sisoDisplayModel(item.id, item.provider, "annotation")}\`;\n                const providerBadge = theme.fg("muted", \`[\${sisoDisplayModel(item.id, item.provider, "group")}]\`);\n                const currentMark = isCurrent ? theme.fg("success", " · current") : "";\n                const defaultMark = isDefault && !isCurrent ? theme.fg("muted", " · default") : "";\n                line = \`\${prefix + theme.fg("accent", modelText)} \${providerBadge}\${currentMark}\${defaultMark}\`;\n`,
      },
      {
        from: [
          `                const modelText = \`  \${item.id}\`;\n                const providerBadge = theme.fg("muted", \`[\${item.provider}]\`);\n                const checkmark = isCurrent ? theme.fg("success", " ✓") : "";\n                line = \`\${modelText} \${providerBadge}\${checkmark}\`;\n`,
          `                const modelText = \`  \${sisoDisplayModel(item.id)} (\${item.id})\`;\n                const providerBadge = theme.fg("muted", \`[\${item.provider}]\`);\n                const checkmark = isCurrent ? theme.fg("success", " ✓") : "";\n                line = \`\${modelText} \${providerBadge}\${checkmark}\`;\n`,
          `                const modelText = \`  \${sisoDisplayModel(item.id)}\`;\n                const providerBadge = theme.fg("muted", \`[\${item.provider}]\`);\n                const checkmark = isCurrent ? theme.fg("success", " ✓") : "";\n                line = \`\${modelText} \${providerBadge}\${checkmark}\`;\n`,
          `                const modelText = \`  \${sisoDisplayModel(item.id)} · \${sisoModelAnnotation(item.id, item.provider)}\`;\n                const providerBadge = theme.fg("muted", \`[\${sisoModelGroup(item.id, item.provider)}]\`);\n                const currentMark = isCurrent ? theme.fg("success", " · current") : "";\n                const defaultMark = isDefault && !isCurrent ? theme.fg("muted", " · default") : "";\n                line = \`\${modelText} \${providerBadge}\${currentMark}\${defaultMark}\`;\n`,
          `                const modelText = \`  \${sisoDisplayModel(item.id)} · \${sisoDisplayModel(item.id, item.provider, "annotation")}\`;\n                const providerBadge = theme.fg("muted", \`[\${sisoDisplayModel(item.id, item.provider, "group")}]\`);\n                const currentMark = isCurrent ? theme.fg("success", " · current") : "";\n                const defaultMark = isDefault && !isCurrent ? theme.fg("muted", " · default") : "";\n                line = \`\${modelText} \${providerBadge}\${currentMark}\${defaultMark}\`;\n`,
        ],
        to: `                const modelText = \`  \${sisoDisplayModel(item.id)} · \${sisoDisplayModel(item.id, item.provider, "annotation")}\`;\n                const providerBadge = theme.fg("muted", \`[\${sisoDisplayModel(item.id, item.provider, "group")}]\`);\n                const currentMark = isCurrent ? theme.fg("success", " · current") : "";\n                const defaultMark = isDefault && !isCurrent ? theme.fg("muted", " · default") : "";\n                line = \`\${modelText} \${providerBadge}\${currentMark}\${defaultMark}\`;\n`,
      },
      {
        from: [
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${selected.model.name}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${selected.model.name} · \${selected.model.id}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${sisoDisplayModel(selected.model.id)}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model: \${sisoDisplayModel(selected.model.id)} · \${sisoModelAnnotation(selected.model.id, selected.provider)}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model: \${sisoDisplayModel(selected.model.id)} · \${sisoDisplayModel(selected.model.id, selected.provider, "annotation")}\`), 0, 0));\n`,
        ],
        to: `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model: \${sisoDisplayModel(selected.model.id)} · \${sisoDisplayModel(selected.model.id, selected.provider, "annotation")}\`), 0, 0));\n`,
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
          `            const modelLabel = \`\${sisoDisplayModel(item.model.id)} · \${sisoModelAnnotation(item.model.id, item.model.provider)}\`;\n            const modelText = isSelected ? theme.fg("accent", modelLabel) : modelLabel;\n`,
          `            const modelLabel = \`\${sisoDisplayModel(item.model.id)} · \${sisoDisplayModel(item.model.id, item.model.provider, "annotation")}\`;\n            const modelText = isSelected ? theme.fg("accent", modelLabel) : modelLabel;\n`,
        ],
        to: `            const modelLabel = \`\${sisoDisplayModel(item.model.id)} · \${sisoDisplayModel(item.model.id, item.model.provider, "annotation")}\`;\n            const modelText = isSelected ? theme.fg("accent", modelLabel) : modelLabel;\n`,
      },
      {
        from: [
          `            const providerBadge = theme.fg("muted", \` [\${item.model.provider}]\`);\n`,
          `            const providerBadge = theme.fg("muted", \` [\${sisoModelGroup(item.model.id, item.model.provider)}]\`);\n`,
          `            const providerBadge = theme.fg("muted", \` [\${sisoDisplayModel(item.model.id, item.model.provider, "group")}]\`);\n`,
        ],
        to: `            const providerBadge = theme.fg("muted", \` [\${sisoDisplayModel(item.model.id, item.model.provider, "group")}]\`);\n`,
      },
      {
        from: [
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${selected.model.name}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${selected.model.name} · \${selected.model.id}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model Name: \${sisoDisplayModel(selected.model.id)}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model: \${sisoDisplayModel(selected.model.id)} · \${sisoModelAnnotation(selected.model.id, selected.model.provider)}\`), 0, 0));\n`,
          `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model: \${sisoDisplayModel(selected.model.id)} · \${sisoDisplayModel(selected.model.id, selected.model.provider, "annotation")}\`), 0, 0));\n`,
        ],
        to: `            this.listContainer.addChild(new Text(theme.fg("muted", \`  Model: \${sisoDisplayModel(selected.model.id)} · \${sisoDisplayModel(selected.model.id, selected.model.provider, "annotation")}\`), 0, 0));\n`,
      },
    ],
  },
  {
    file: "modes/interactive/interactive-mode.js",
    replacements: [
      {
        from: [
          `        // Add header with keybindings from config (unless silenced)\n        if (this.options.verbose || !this.settingsManager.getQuietStartup()) {\n`,
          `        // Add header with keybindings from config (unless silenced)\n        if (sisoStartupEnabled()) {\n            this.builtInHeader = new Text(sisoStartupHeader(this.session.model), 1, 0);\n            this.headerContainer.addChild(new Spacer(1));\n            this.headerContainer.addChild(this.builtInHeader);\n            this.headerContainer.addChild(new Spacer(1));\n        }\n        else if (this.options.verbose || !this.settingsManager.getQuietStartup()) {\n`,
          `        // Add header with keybindings from config (unless silenced)\n        if (!this.options.verbose && sisoStartupEnabled()) {\n            this.builtInHeader = new Text(sisoStartupHeader(this.session.model), 1, 0);\n            this.headerContainer.addChild(new Spacer(1));\n            this.headerContainer.addChild(this.builtInHeader);\n            this.headerContainer.addChild(new Spacer(1));\n        }\n        else if (this.options.verbose || !this.settingsManager.getQuietStartup()) {\n`,
        ],
        to: `        // Add header with keybindings from config (unless silenced)\n        if (!this.options.verbose && sisoStartupEnabled()) {\n            this.builtInHeader = new Text(sisoStartupHeader(this.session.model), 1, 0);\n            this.headerContainer.addChild(new Spacer(1));\n            this.headerContainer.addChild(this.builtInHeader);\n            this.headerContainer.addChild(new Spacer(1));\n        }\n        else if (this.options.verbose || !this.settingsManager.getQuietStartup()) {\n`,
      },
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
      {
        from: [
          `        // Initialize extensions first so resources are shown before messages\n        await this.rebindCurrentSession();\n        // Render initial messages AFTER showing loaded resources\n`,
          `        // Initialize extensions first so resources are shown before messages\n        await this.rebindCurrentSession();\n        if (sisoStartupEnabled() && !this.customHeader) {\n            this.builtInHeader?.setText?.(sisoReadyHeader(this.session.model));\n            this.ui.requestRender();\n        }\n        // Render initial messages AFTER showing loaded resources\n`,
          `        // Initialize extensions first so resources are shown before messages\n        await this.rebindCurrentSession();\n        if (!this.options.verbose && sisoStartupEnabled() && !this.customHeader) {\n            this.builtInHeader?.setText?.(sisoReadyHeader(this.session.model));\n            this.ui.requestRender();\n        }\n        // Render initial messages AFTER showing loaded resources\n`,
        ],
        to: `        // Initialize extensions first so resources are shown before messages\n        await this.rebindCurrentSession();\n        if (!this.options.verbose && sisoStartupEnabled() && !this.customHeader) {\n            this.builtInHeader?.setText?.(sisoReadyHeader(this.session.model));\n            this.ui.requestRender();\n        }\n        // Render initial messages AFTER showing loaded resources\n`,
      },
      {
        from: [
          `        this.renderInitialMessages();\n        // Set up theme file watcher\n`,
          `        this.renderInitialMessages();\n        if (sisoStartupEnabled() && !this.customHeader) {\n            this.builtInHeader?.setText?.("");\n            this.ui.requestRender();\n        }\n        // Set up theme file watcher\n`,
          `        this.renderInitialMessages();\n        if (!this.options.verbose && sisoStartupEnabled() && !this.customHeader) {\n            this.builtInHeader?.setText?.("");\n            this.ui.requestRender();\n        }\n        // Set up theme file watcher\n`,
        ],
        to: `        this.renderInitialMessages();\n        if (!this.options.verbose && sisoStartupEnabled() && !this.customHeader) {\n            this.builtInHeader?.setText?.("");\n            this.ui.requestRender();\n        }\n        // Set up theme file watcher\n`,
      },
      {
        from: [
          `        this.ui.addChild(this.editorContainer);\n        this.ui.addChild(this.widgetContainerBelow);\n        this.ui.addChild(this.footer);\n`,
          `        this.ui.addChild(this.editorContainer);\n        this.ui.addChild(this.footer);\n        this.ui.addChild(this.widgetContainerBelow);\n`,
        ],
        to: `        this.ui.addChild(this.editorContainer);\n        this.ui.addChild(this.widgetContainerBelow);\n        this.ui.addChild(this.footer);\n`,
      },
    ],
  },
];
