#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/components/assistant-message.js",
  "node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/components/custom-message.js",
  "node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/components/tool-execution.js",
  "extensions/siso-agent-router/output-style.js",
  "docs/capabilities/pi-output-ux-map.md"
];
for (const file of files) assert.ok(fs.existsSync(file), `missing ${file}`);
const map = fs.readFileSync("docs/capabilities/pi-output-ux-map.md", "utf8");
assert.match(map, /phase-level communication/);
assert.match(map, /assistant-message\.js/);
assert.match(map, /tool-execution\.js/);
console.log("SISO_PI_OUTPUT_MAP_SMOKE_OK");
