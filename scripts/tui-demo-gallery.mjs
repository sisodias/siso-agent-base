#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "artifacts", "tui-demo");
const script = join(root, "scripts", "tui-demo.mjs");
const modes = [
  "composer", "prompt-complete", "messages", "message-complete", "tool-cards", "tool-variants",
  "permissions", "permissions-full", "permission-variants", "permission-rules", "agent-ops", "agent-detail",
  "agent-manager", "fleet-deep", "workflow", "tasks", "mcp", "mcp-deep", "settings", "settings-deep",
  "diff", "diff-deep", "review", "repo", "search", "bifrost", "telemetry", "context-deep",
  "notifications", "notifications-deep", "models", "auth", "doctor", "release", "quality", "opensource",
  "all",
];
const widths = (process.argv.includes("--all-widths") ? [40, 80, 120] : [100]);
const height = Number(process.env.SISO_TUI_GALLERY_HEIGHT ?? 60);
mkdirSync(outDir, { recursive: true });

const index = ["# SISO TUI Demo Gallery", "", `Generated: ${new Date().toISOString()}`, ""];
for (const width of widths) {
  index.push(`## Width ${width}`, "");
  for (const mode of modes) {
    const result = spawnSync(process.execPath, [script, mode, `--width=${width}`, `--height=${height}`], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1", COLUMNS: String(width), LINES: String(height) },
    });
    if (result.status !== 0) {
      throw new Error(`${mode}@${width} failed\n${result.stderr}`);
    }
    const file = `${mode}-${width}.txt`;
    writeFileSync(join(outDir, file), result.stdout);
    index.push(`### ${mode}`, "", `\`artifacts/tui-demo/${file}\``, "", "```text", result.stdout.trimEnd(), "```", "");
  }
}
writeFileSync(join(outDir, "README.md"), index.join("\n"));
console.log(`SISO_TUI_DEMO_GALLERY_OK ${outDir}`);
