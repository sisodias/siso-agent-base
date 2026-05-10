#!/usr/bin/env node
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.SISO_SKILL_ROOTS = join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "profile", "skills");

import { querySkillHub } from "../extensions/siso-agent-router/skill-hub.js";

const result = querySkillHub({
  op: "load_body",
  skillId: "improve-agent-system",
  maxChars: 5000,
});

assert.ok(result.entries.length >= 1, "improve-agent-system skill should be discoverable");
assert.equal(result.entries[0].name, "improve-agent-system");
assert.equal(result.entries[0].source, "siso-profile");
assert.match(result.body ?? "", /Read `VERSION`, `CHANGELOG\.md`, `releases\/latest\.json`/);
assert.match(result.body ?? "", /Run `siso doctor` after installing locally/);
assert.match(result.body ?? "", /Do not touch friend\/customer runtimes unless explicitly asked/);

console.log("SISO_IMPROVE_AGENT_SYSTEM_SKILL_SMOKE_OK");
