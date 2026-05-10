#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { animationHelpersBlockSource as animationHelpersBlock } from "../packages/siso-tui/src/pi-native/animation-helpers.js";
import { cleanFooterBlockSource as cleanFooterBlock, footerHelpersSource as footerHelpers } from "../packages/siso-tui/src/pi-native/footer-renderer.js";
import { modelHelpersSource as modelHelpers } from "../packages/siso-tui/src/pi-native/model-helpers.js";
import { startupLoadingSource as startupLoading } from "../packages/siso-tui/src/pi-native/startup-loading.js";
import { toolHelpersSource as toolHelpers } from "../packages/siso-tui/src/pi-native/tool-renderer.js";
import { piNativeRendererPatches as patches } from "../packages/siso-tui/src/pi-native/patch-rules.js";

const piRoot = process.env.SISO_PI_PACKAGE_ROOT
  ?? join(homedir(), ".siso-agent-base", "node_modules", "@mariozechner", "pi-coding-agent", "dist");

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
      `    updateResult(result, isPartial = false) {\n        this.result = result;\n        this.isPartial = isPartial;\n        if (isPartial) this.startSisoAnimation();\n        else this.stopSisoAnimation();\n        this.updateDisplay();\n        sisoRefreshToolGroupPeers(this);\n        this.maybeConvertImagesForKitty();\n    }\n`,
    );
    next = next.replace(
      `    updateResult(result, isPartial = false) {\n        this.result = result;\n        this.isPartial = isPartial;\n        if (isPartial) this.startSisoAnimation();\n        else this.stopSisoAnimation();\n        this.updateDisplay();\n        this.maybeConvertImagesForKitty();\n    }\n`,
      `    updateResult(result, isPartial = false) {\n        this.result = result;\n        this.isPartial = isPartial;\n        if (isPartial) this.startSisoAnimation();\n        else this.stopSisoAnimation();\n        this.updateDisplay();\n        sisoRefreshToolGroupPeers(this);\n        this.maybeConvertImagesForKitty();\n    }\n`,
    );
    next = next.replace(
      `    updateArgs(args) {\n        this.args = args;\n        this.updateDisplay();\n    }\n`,
      `    updateArgs(args) {\n        this.args = args;\n        this.updateDisplay();\n        sisoRefreshToolGroupPeers(this);\n    }\n`,
    );
    next = next.replace(
      `    setExpanded(expanded) {\n        this.expanded = expanded;\n        this.updateDisplay();\n    }\n`,
      `    setExpanded(expanded) {\n        this.expanded = expanded;\n        this.updateDisplay();\n        sisoRefreshToolGroupPeers(this);\n    }\n`,
    );
    next = next.replace(
      /(?:    startSisoAnimation\(\) \{[\s\S]*?    stopSisoAnimation\(\) \{[\s\S]*?        this\.animationPhase = 0;\n    }\n)+(?=    maybeConvertImagesForKitty\(\) \{)/,
      animationHelpersBlock,
    );
    if (!next.includes("    startSisoAnimation() {")) {
      next = next.replace(
        `    maybeConvertImagesForKitty() {\n`,
        `${animationHelpersBlock}    maybeConvertImagesForKitty() {\n`,
      );
    }
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
    next = next.replace(
      `            const renderContainer = this.getRenderShell() === "self" ? this.selfRenderContainer : this.contentBox;\n            if (renderContainer instanceof Box) {\n`,
      `            const useSelfShell = this.expanded && this.getRenderShell() === "self";\n            const renderContainer = useSelfShell ? this.selfRenderContainer : this.contentBox;\n            const inactiveContainer = useSelfShell ? this.contentBox : this.selfRenderContainer;\n            inactiveContainer.clear();\n            if (renderContainer instanceof Box) {\n`,
    );
    next = next.replace(
      `            const useSelfShell = this.expanded && this.getRenderShell() === "self";\n            const renderContainer = useSelfShell ? this.selfRenderContainer : this.contentBox;\n            const inactiveContainer = useSelfShell ? this.contentBox : this.selfRenderContainer;\n            inactiveContainer.clear();\n            if (renderContainer instanceof Box) {\n`,
      `            const useSelfShell = this.expanded && this.getRenderShell() === "self";\n            const renderContainer = useSelfShell ? this.selfRenderContainer : this.contentBox;\n            const inactiveContainer = useSelfShell ? this.contentBox : this.selfRenderContainer;\n            inactiveContainer.clear();\n            if (renderContainer instanceof Box) {\n`,
    );
    next = next.replace(
      `        this.ui = ui;\n        this.cwd = cwd;\n        // Always create all shell variants. contentBox is used for default renderer-based composition.\n`,
      `        this.ui = ui;\n        this.cwd = cwd;\n        sisoRegisterToolGroupComponent(this);\n        // Always create all shell variants. contentBox is used for default renderer-based composition.\n`,
    );
    next = next.replace(
      `            if (!this.expanded) {\n                renderContainer.addChild(new Text(sisoCompactToolExecution(this.toolName, this.args, this.result, this.isPartial, this.animationPhase), 0, 0));\n                hasContent = true;\n            }\n`,
      `            if (!this.expanded) {\n                const aggregated = sisoRenderAggregatedToolGroup(this, this.animationPhase);\n                if (aggregated === null) {\n                    this.hideComponent = true;\n                    return;\n                }\n                renderContainer.addChild(new Text(aggregated, 0, 0));\n                hasContent = true;\n            }\n`,
    );
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
      /function sisoDisplayModel\(id\) \{[\s\S]*?\n}\n(?=function sisoDisplayModel|function isUnknownModel|const DEFAULT_CHECKPOINT_WARNING_THRESHOLD)/g,
      "",
    );
    next = next.replace(
      /function sisoDisplayModel\(id, provider, mode\) \{[\s\S]*?\n}\n(?=function isUnknownModel|const DEFAULT_CHECKPOINT_WARNING_THRESHOLD)/g,
      "",
    );
    next = next.replace(
      /(const DEFAULT_CHECKPOINT_WARNING_THRESHOLD = 0\.8;\n|function isUnknownModel\(model\) \{)/,
      (match) => match.includes("DEFAULT_CHECKPOINT") ? `${match}${modelHelpers}` : `${modelHelpers}${match}`,
    );
    next = next.replace(
      /function sisoStartupEnabled\(\) \{[\s\S]*?\n}\nfunction sisoStartupHeader\(model\) \{[\s\S]*?\n}\nfunction sisoReadyHeader\(model\) \{[\s\S]*?\n}\n/,
      "",
    );
    next = next.replace(
      /(function hasDefaultModelProvider\(providerId\) \{[\s\S]*?\n}\n)/,
      `$1${startupLoading}`,
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
  if (patch.file === "modes/interactive/components/tool-execution.js") {
    next = next.replace(
      `            }\n            }\n            }\n            }\n        }\n        else {\n            this.contentText.setCustomBgFn(bgFn);\n`,
      `            }\n            }\n        }\n        else {\n            this.contentText.setCustomBgFn(bgFn);\n`,
    );
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
