#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isToolAllowed, loadProjectAgentRegistry, normalizeToolAcl, parseAgentMarkdown } from "../extensions/siso-agent-router/project-agent-registry.js";

const root = mkdtempSync(join(tmpdir(), "siso-project-agent-registry-"));
const workspace = join(root, "workspace");
const userHome = join(root, "home");
const projectAgentsRoot = join(workspace, ".siso", "agents");
const userAgentsRoot = join(userHome, ".siso", "agents");

mkdirSync(projectAgentsRoot, { recursive: true });
mkdirSync(userAgentsRoot, { recursive: true });

const projectAgentPath = join(projectAgentsRoot, "project-guardian.md");
const userAgentPath = join(userAgentsRoot, "user-helper.md");
const userCollisionPath = join(userAgentsRoot, "project-guardian.md");

writeFileSync(
  projectAgentPath,
  `---\nname: project-guardian\nmodel: claude-sonnet-4-6\nthinkingLevel: high\ntools: all, !write, !edit\ncost_tier: cheap\nmemory: project\nbackground: true\nmax_turns: 8\nwrite_scope:\n  - extensions/siso-agent-router/**\nextension_dependencies:\n  - pi-subagents\nevals:\n  - subagent-regression-v1\n---\nProject agent body.\n`,
  "utf8",
);
writeFileSync(
  userAgentPath,
  `---\nname: user-helper\nmodel: gpt-5.4-mini\nthinkingLevel: medium\ntools:\n  - read\n  - bash\n  - !write\n---\nUser agent body.\n`,
  "utf8",
);
writeFileSync(
  userCollisionPath,
  `---\nname: project-guardian\nmodel: gpt-5.4-mini\nthinkingLevel: low\ntools: read\n---\nUser collision body.\n`,
  "utf8",
);

const untrusted = loadProjectAgentRegistry({
  cwd: workspace,
  projectRoots: [projectAgentsRoot],
  userRoots: [userAgentsRoot],
  trustMarkerName: ".siso-agent-trusted",
});

assert.equal(untrusted.projectAgents.length, 0, "project agents must be ignored without trust marker");
assert.equal(untrusted.userAgents.length, 2, "user agents should still load");
assert.equal(untrusted.agents.length, 2, "registry should expose user agents when project is untrusted");
assert.equal(untrusted.skippedProjectRoots.length, 1, "untrusted project root should be tracked");

writeFileSync(join(projectAgentsRoot, ".siso-agent-trusted"), "trusted\n", "utf8");

const trusted = loadProjectAgentRegistry({
  cwd: workspace,
  projectRoots: [projectAgentsRoot],
  userRoots: [userAgentsRoot],
  trustMarkerName: ".siso-agent-trusted",
});

assert.equal(trusted.projectAgents.length, 1, "trusted project agent should load");
assert.equal(trusted.userAgents.length, 2, "user agents should still load");
assert.equal(trusted.agents.length, 2, "project agent should override same-named user agent");
assert.equal(trusted.collisions.length, 1, "same-named project/user agents should be reported as collisions");
assert.equal(trusted.collisions[0].winnerScope, "project");

const projectAgent = trusted.projectAgents[0];
assert.equal(projectAgent.name, "project-guardian");
assert.equal(projectAgent.model, "claude-sonnet-4-6");
assert.equal(projectAgent.thinkingLevel, "high");
assert.equal(projectAgent.costTier, "cheap");
assert.equal(projectAgent.memoryScope, "project");
assert.equal(projectAgent.background, true);
assert.equal(projectAgent.maxTurns, 8);
assert.deepEqual(projectAgent.writeScope, ["extensions/siso-agent-router/**"]);
assert.deepEqual(projectAgent.extensionDependencies, ["pi-subagents"]);
assert.deepEqual(projectAgent.evals, ["subagent-regression-v1"]);
assert.deepEqual(projectAgent.tools, { allow: [], deny: ["write", "edit"], all: true });
assert.equal(isToolAllowed(projectAgent.tools, "read"), true);
assert.equal(isToolAllowed(projectAgent.tools, "write"), false);
assert.equal(isToolAllowed(projectAgent.tools, "edit"), false);

const userAgent = trusted.userAgents.find((agent) => agent.name === "user-helper");
assert.equal(userAgent.name, "user-helper");
assert.equal(userAgent.model, "gpt-5.4-mini");
assert.equal(userAgent.thinkingLevel, "medium");
assert.deepEqual(userAgent.tools, { allow: ["read", "bash"], deny: ["write"], all: false });
assert.equal(isToolAllowed(userAgent.tools, "read"), true);
assert.equal(isToolAllowed(userAgent.tools, "bash"), true);
assert.equal(isToolAllowed(userAgent.tools, "write"), false);
assert.equal(isToolAllowed(userAgent.tools, "ls"), false);

assert.deepEqual(normalizeToolAcl("all, !write, !edit"), { allow: [], deny: ["write", "edit"], all: true });
assert.deepEqual(normalizeToolAcl(["read", "bash", "!write"]), { allow: ["read", "bash"], deny: ["write"], all: false });

const parsed = parseAgentMarkdown(
  `---\nname: sample-agent\nmodel: claude-haiku-4-5-20251001\nthinkingLevel: low\ntools: read, !write\ncostTier: medium\nmemoryScope: local\nbackground: false\nmaxTurns: 3\nwriteScope: [docs/**, scripts/**]\nextensionDependencies: [taskplane]\nevals: [quick-review-v1]\n---\nBody.\n`,
  join(projectAgentsRoot, "sample-agent.md"),
  "project",
  projectAgentsRoot,
);

assert.ok(parsed, "parser should recognize a valid agent");
assert.equal(parsed?.model, "claude-haiku-4-5-20251001");
assert.equal(parsed?.thinkingLevel, "low");
assert.equal(parsed?.costTier, "medium");
assert.equal(parsed?.memoryScope, "local");
assert.equal(parsed?.background, false);
assert.equal(parsed?.maxTurns, 3);
assert.deepEqual(parsed?.writeScope, ["docs/**", "scripts/**"]);
assert.deepEqual(parsed?.extensionDependencies, ["taskplane"]);
assert.deepEqual(parsed?.evals, ["quick-review-v1"]);
assert.deepEqual(parsed?.tools, { allow: ["read"], deny: ["write"], all: false });

console.log("SISO_PROJECT_AGENT_REGISTRY_SMOKE_OK");
