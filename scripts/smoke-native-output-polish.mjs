#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const assistant = fs.readFileSync("node_modules/@mariozechner/pi-coding-agent/dist/modes/interactive/components/assistant-message.js", "utf8");
assert.match(assistant, /function sisoPolishAssistantText/);
assert.match(assistant, /sisoPolishAssistantText\(content\.text\)/);
assert.match(assistant, /TXT\|TEXT/);
assert.match(assistant, /```\(\?:txt\|text\)/);

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
