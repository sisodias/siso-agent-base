#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.SISO_AGENT_ROUTER_TOOL_MODE = "lean";

const { default: sisoAgentRouterExtension } = await import("../extensions/siso-agent-router/index.js");

const commands = new Map();
const tools = [];
const listeners = new Map();
const pi = {
  on(name, handler) {
    listeners.set(name, handler);
  },
  registerCommand(name, spec) {
    commands.set(name, spec);
  },
  registerTool(spec) {
    tools.push(spec.name);
  },
  registerMessageRenderer() {},
  sendUserMessage() {},
  getAllTools: () => tools.map((name) => ({ name })),
};

sisoAgentRouterExtension(pi);

assert.ok(listeners.has("session_start"));
assert.ok(listeners.has("session_shutdown"));
assert.ok(listeners.has("before_agent_start"));

const routerSource = readFileSync(new URL("../extensions/siso-agent-router/index.js", import.meta.url), "utf8");
assert.match(routerSource, /stopChildNotificationDispatchers\s*=\s*new Map/, "notification dispatchers must be tracked per parent session");
assert.match(routerSource, /session_shutdown",\s*\(_event,\s*ctx\)/, "session shutdown must receive ctx so it can stop the matching dispatcher");

for (const command of ["skills", "skill", "siso-route", "agents"]) {
  assert.ok(commands.has(command), `missing lean router command: ${command}`);
}

assert.deepEqual(tools, ["siso"]);

for (const hiddenTool of [
  "siso_route",
  "siso_spawn",
  "siso_child",
  "siso_task_create",
  "siso_task_update",
  "siso_task_list",
  "siso_skill_hub",
  "siso_repo_candidates",
]) {
  assert.ok(!tools.includes(hiddenTool), `split router tool leaked in lean mode: ${hiddenTool}`);
}

console.log("SISO_ROUTER_LEAN_TOOLS_SMOKE_OK");
