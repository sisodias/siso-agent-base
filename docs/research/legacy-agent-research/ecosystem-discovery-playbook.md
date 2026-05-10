# Ecosystem Discovery Playbook

Date: 2026-05-05

## Purpose

The Pi ecosystem is too large and fast-moving to inventory by hand from GitHub links alone. Use this playbook to keep discovering Pi packages, extension code, skills, and design references without relying on GitHub search.

## Discovery Lanes

Use three lanes together:

1. **NPM/Pi package registry** for broad inventory.
2. **Sourcegraph code search** for implementation evidence.
3. **GitHub metadata** only when search/rate limits allow it.

The local Claude skill for lane 2 is:

```text
/Users/shaansisodia/.claude/skills/sourcegraph/SKILL.md
```

That skill is now documented as the code-search skill. It still uses the `sourcegraph` name so existing references do not break.

## Why Not GitHub First

In the 2026-05-05 scan, both `gh search` and the GitHub connector hit GitHub-side failures:

- `User flagged as spammy`
- code search API rate limit exceeded

So GitHub remains useful for clone/read, repo metadata, PRs, issues, and later verification, but it should not be the only discovery engine.

## Broad Inventory Method

### Step 1: NPM package scan

Run:

```bash
python3 /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/scripts/discover_pi_ecosystem.py \
  --output /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/pi-package-registry.json \
  --markdown /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/pi-package-registry.md
```

This queries NPM for Pi-related package searches, deduplicates packages, extracts repo links, categorizes candidates, and writes both JSON and a markdown summary.

### Step 2: Sourcegraph code-pattern scan

Run the local scanner:

```bash
python3 /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/scripts/sourcegraph_pi_scan.py \
  --output /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sourcegraph-pi-code-search.json \
  --markdown /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sourcegraph-pi-code-search.md
```

Use Sourcegraph for evidence queries:

```text
file:package.json "pi" "extensions" count:50
"@mariozechner/pi-coding-agent" count:50
registerTool lang:TypeScript count:50
registerCommand lang:TypeScript count:50
"pi.on(\"tool_call\"" lang:TypeScript count:50
"pi.on(\"context\"" lang:TypeScript count:50
"pi.setActiveTools" lang:TypeScript count:50
"sendUserMessage" "followUp" lang:TypeScript count:50
```

Use the direct GraphQL fallback in the `sourcegraph` skill if the old helper script is missing.

### Step 3: Score candidates

Score each package by:

- category fit,
- recent publish date,
- source repo availability,
- package size/dependencies,
- whether it registers tools,
- whether it intercepts `tool_call`,
- whether it rewrites context,
- whether it spawns processes,
- whether it writes files,
- tests/docs presence,
- inspection priority for powerful harness surfaces.

### Step 4: Dispatch research agents

Only after the registry exists, dispatch Spark agents against the top candidates in each category.

Good batch groupings:

- workers/subagents,
- task/queue/workflow,
- safety/permission/audit,
- context/pruning/memory,
- codebase maps/wiki,
- UI/status/metrics,
- web/browser/search,
- testing/devtools,
- provider/MCP/integration.

## Current High-Signal Unknowns

These came from package discovery and deserve follow-up:

- `pi-link`
- `pi-context-usage`
- `pi-ask-user`
- `pi-codex`
- `pi-multiagent`
- `pi-mcp-adapter`
- `pi-web-access`
- `pi-permission-system` and `@gotgenes/pi-permission-system`
- `@plannotator/pi-extension`
- `pi-btw`
- `context-mode`
- `pi-workflow-kit`
- `taskplane`
- `pi-crew`
- `pi-agent-flow`
- `pi-messenger-swarm`
- `pi-minions`
- `pi-fast-subagent`
- `pi-hashline-readmap`
- `pi-codebase-memory`
- `@0xkobold/pi-codebase-wiki`
- `@kaiserlich-dev/pi-session-search`
- `pi-tool-display`
- `@marcfargas/pi-test-harness`
- `pi-depo`
- `@aliou/pi-guardrails`

## Output Files

Discovery artifacts should live under:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/
```

Expected files:

```text
research/pi-package-registry.json
research/pi-package-registry.md
research/pi-package-keyword-registry-full.json
research/pi-package-keyword-registry-full.md
research/pi-ecosystem-combined-registry.json
research/pi-ecosystem-combined-registry.md
research/sourcegraph-pi-code-search.json
research/sourcegraph-pi-code-search.md
research/sources/discovery/*.json
research/inbox/YYYY-MM-DD-<topic>.md
```

## 2026-05-05 Coverage Checkpoint

The exact NPM `keywords:pi-package` lane returned `2089` packages and the lab captured all `2089`.

Merged with the broader query matrix, the combined registry currently contains:

- `3109` package candidates,
- `2203` direct Pi candidates,
- `176` adjacent agent ecosystem candidates,
- `185` unique Sourcegraph repos with public Pi code evidence.

The checkpoint report is:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-ecosystem-coverage.md
```

## Rule

Do not install discovered packages globally.

Flow:

1. Discover metadata.
2. Clone source under `research/sources/`.
3. Inspect package manifest and extension entrypoints.
4. Run static checks.
5. Try in an isolated Pi profile or temporary `pi -e` run.
6. Promote only with a rollback/disable path.
