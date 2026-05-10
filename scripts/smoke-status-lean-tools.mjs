#!/usr/bin/env node
import assert from "node:assert/strict";

process.env.SISO_STATUS_TOOL_MODE = "lean";

const { default: sisoStatusExtension } = await import("../extensions/siso-status/index.js");

const commands = new Map();
const tools = [];

sisoStatusExtension({
  on() {},
  registerCommand(name, spec) {
    commands.set(name, spec);
  },
  registerTool(tool) {
    tools.push(tool.name);
  },
  registerMessageRenderer() {},
});

assert.ok(commands.has("siso-status"), "lean status mode should keep /siso-status command");
assert.ok(commands.has("siso-context-explain"), "lean status mode should keep /siso-context-explain command");
assert.ok(commands.has("siso-bifrost-metrics"), "lean status mode should keep /siso-bifrost-metrics command");
assert.ok(commands.has("siso-bifrost-dashboard"), "lean status mode should keep /siso-bifrost-dashboard command");
assert.ok(commands.has("siso-bifrost-duplicates"), "lean status mode should keep /siso-bifrost-duplicates command");
assert.deepEqual(tools, [], "lean status mode should not register status/Bifrost tool schemas");

console.log("SISO_STATUS_LEAN_TOOLS_SMOKE_OK");
