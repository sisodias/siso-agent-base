#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sisoAgentRouterExtension from "../extensions/siso-agent-router/index.js";
import { createSisoTask } from "../extensions/siso-agent-router/task-store.js";

const cwd = mkdtempSync(join(tmpdir(), "siso-tasks-command-"));
process.chdir(cwd);

const dep = createSisoTask({ cwd, title: "Task dependency", status: "ready" }).task;
createSisoTask({ cwd, title: "Task child", status: "blocked", blockedBy: [dep.id] });

const commands = new Map();
const pi = {
  on() {},
  registerTool() {},
  registerMessageRenderer() {},
  getAllTools: () => [],
  registerCommand(name, spec) {
    commands.set(name, spec);
  },
};

sisoAgentRouterExtension(pi);

const list = await commands.get("tasks").handler("", {});
assert.match(list.content[0].text, /total=2/);

const claimed = await commands.get("tasks").handler("claim", {});
assert.match(claimed.content[0].text, /claimed=/);
assert.equal(claimed.details.task.id, dep.id);

const failed = await commands.get("tasks").handler(`fail ${dep.id}`, {});
assert.match(failed.content[0].text, /failed=/);
assert.match(failed.content[0].text, /blocked=/);

const resumed = await commands.get("tasks").handler(`resume ${dep.id}`, {});
assert.match(resumed.content[0].text, /resumed_root=/);

console.log("SISO_TASKS_COMMAND_SMOKE_OK");
