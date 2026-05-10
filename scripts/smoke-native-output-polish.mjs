#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

execFileSync(process.execPath, ["scripts/patch-pi-native-renderers.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    SISO_PI_PACKAGE_ROOT: "node_modules/@mariozechner/pi-coding-agent/dist"
  },
  stdio: "ignore"
});

const tool = fs.readFileSync("node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/components/tool-execution.js", "utf8");
assert.match(tool, /function sisoCompactToolExecution/);
assert.match(tool, /function sisoCompactToolDisplay/);
assert.match(tool, /function sisoErrorReason/);
assert.match(tool, /function sisoBashIntent/);
assert.match(tool, /readableStatus/);
assert.match(tool, /launching/);
assert.match(tool, /working···/);
assert.match(tool, /if \(!this\.expanded\)/);

console.log("SISO_NATIVE_OUTPUT_POLISH_SMOKE_OK");
