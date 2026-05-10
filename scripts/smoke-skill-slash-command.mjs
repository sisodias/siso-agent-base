#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.SISO_SKILL_ROOTS = join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "profile", "skills");

const messages = [];
const commands = new Map();
const skillHub = await import("../extensions/siso-agent-router/skill-hub.js");
const module = await import("../extensions/siso-agent-router/index.js");
module.default({
  on() {},
  registerCommand(name, options) {
    commands.set(name, options);
  },
  registerTool() {},
  registerMessageRenderer() {},
  sendUserMessage(message) {
    messages.push(message);
  },
});

assert.ok(commands.has("skills"), "/skills command should be registered");
assert.ok(commands.has("skill"), "/skill command should be registered");

const skillsResult = await commands.get("skills").handler("agent improve");
assert.match(skillsResult.content[0].text, /improve-agent-system/);
assert.ok(skillsResult.content[0].text.length < 2500, "/skills query output should stay compact");
assert.doesNotMatch(skillsResult.content[0].text, /path=/, "/skills compact output should not include file paths by default");
assert.doesNotMatch(skillsResult.content[0].text, /headings=/, "/skills compact output should not include heading outlines by default");

const skillResult = await commands.get("skill").handler("agent improve Add slash skill aliases");
assert.match(skillResult.content[0].text, /Loaded skill improve-agent-system/);
assert.equal(messages.length, 1);
assert.match(messages[0], /<skill name="improve-agent-system"/);
assert.match(messages[0], /Add slash skill aliases/);

process.env.SISO_SKILL_CACHE = "0";
skillHub.clearSkillHubStats();
messages.length = 0;
const singlePassResult = await commands.get("skill").handler("agent improve Add single pass skill resolution");
assert.match(singlePassResult.content[0].text, /Loaded skill improve-agent-system/);
assert.equal(messages.length, 1);
assert.match(messages[0], /Add single pass skill resolution/);
assert.equal(skillHub.skillHubStats().catalogScans, 1, "/skill should resolve aliases/prefixes from one catalog snapshot");
delete process.env.SISO_SKILL_CACHE;
skillHub.clearSkillHubCache();

const tempRoot = mkdtempSync(join(tmpdir(), "siso-skill-efficiency-"));
try {
  for (let index = 0; index < 60; index += 1) {
    const id = `synthetic-skill-${String(index).padStart(2, "0")}`;
    const dir = join(tempRoot, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), `---\nname: ${id}\ndescription: Synthetic skill ${index} for compact output regression coverage.\n---\n# ${id}\nUse this skill for smoke coverage.\n`);
  }
  const largeDir = join(tempRoot, "large-skill");
  mkdirSync(largeDir, { recursive: true });
  writeFileSync(join(largeDir, "SKILL.md"), `---\nname: large-skill\ndescription: Large synthetic skill for prompt cap regression coverage.\n---\n# Large Skill\n${"Keep this body compact. ".repeat(240)}\n`);

  process.env.SISO_SKILL_ROOTS = tempRoot;
  process.env.SISO_SKILL_LIST_LIMIT = "20";
  process.env.SISO_SKILL_PROMPT_MAX_CHARS = "900";
  skillHub.clearSkillHubCache();

  const compactList = await commands.get("skills").handler("");
  assert.match(compactList.content[0].text, /returned=20/);
  assert.ok(compactList.content[0].text.length < 6000, "large /skills output should stay compact");
  assert.doesNotMatch(compactList.content[0].text, /path=/, "large compact /skills output should not include paths");

  messages.length = 0;
  const largeResult = await commands.get("skill").handler("large-skill summarize it");
  assert.match(largeResult.content[0].text, /Loaded skill large-skill/);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /SISO_SKILL_BODY_TRUNCATED/);
  assert.ok(messages[0].length < 1600, "large /skill prompt should respect SISO_SKILL_PROMPT_MAX_CHARS");
}
finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("SISO_SKILL_SLASH_COMMAND_SMOKE_OK");
