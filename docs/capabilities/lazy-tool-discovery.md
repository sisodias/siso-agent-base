# Lazy Tool Discovery and Loading

Purpose: let SISO agents access a very large tool universe without flooding every model turn with every tool schema.

The goal is not more visible tools by default. The goal is a tiny always-on discovery layer that can find, inspect, and load task-relevant tool packs on demand.

## Live context contract

A large registry must never be rendered into the live model prompt as a long list of tools.

The live prompt should contain only:

1. the small discovery API schemas,
2. maybe 3-10 compact recommended tool/pack cards for the current task,
3. full schemas only for explicitly loaded tools/packs.

The registry itself should live outside the prompt in an indexed store. `tool_search` and `tool_recommend` query that store and return a bounded result set. If SISO has 10 tools or 1,000,000 tools, the default prompt should stay nearly the same size.

Recommended hard budgets:

- default discovery API: under 1-2k tokens total
- `tool_recommend` result: max 5 packs/tools by default
- each returned scenario card: one-line summary plus 2-3 use/avoid bullets unless `tool_show` asks for more
- loaded full schemas: max 5-10 tools or 1-2 packs per turn/session window
- TTL: expire loaded tools after a few turns or after task completion

Do not put thousands of scenario-card summaries into system context. Scenario cards are retrieval data, not prompt data.

## Principle

Agents should start with a small core toolbelt, then lazy-load capability packs only when the task requires them.

Default visible tools should stay boring and minimal:

- file/read/write/edit basics
- shell/check basics
- SISO router/discovery
- context/memory inspection
- tool discovery/loading

Everything else should be discoverable by metadata, not injected into context up front.

## Core lazy-load surface

Suggested always-on tools:

```ts
tool_search({
  query: string,
  tags?: string[],
  domain?: string,
  maxResults?: number
})

tool_show({
  toolId: string,
  includeSchema?: boolean,
  includeExamples?: boolean
})

tool_load({
  toolIds?: string[],
  packIds?: string[],
  reason: string,
  ttlTurns?: number
})

tool_unload({
  toolIds?: string[],
  packIds?: string[]
})

tool_recommend({
  task: string,
  currentFiles?: string[],
  maxResults?: number
})

tool_inventory({
  loadedOnly?: boolean,
  domain?: string
})
```

Only these discovery tools need to be visible globally. Full schemas for heavy tools should appear only after `tool_load`.

## Tool registry metadata

Every tool should have compact searchable metadata:

```json
{
  "id": "repo.search",
  "name": "Repo Search",
  "domain": "repo",
  "pack": "repo-navigation",
  "status": "stable",
  "summary": "Structured text/regex/filename search over the current repo.",
  "tags": ["search", "codebase", "files", "grep"],
  "keywords": ["find code", "where is", "references", "filename"],
  "inputSummary": "query, mode, path, limit, contextLines",
  "outputSummary": "bounded path/line/preview matches",
  "cost": "low",
  "risk": "read-only",
  "requires": ["filesystem"],
  "examples": [
    "Find router dispatch code",
    "Search docs for a capability id"
  ]
}
```

The searchable registry should be much smaller than full JSON schemas.

## Tool packs

Tools should be grouped into packs so agents load coherent sets:

- `repo-navigation`
  - repo search, read many, project tree/map, symbol search, outline, context pack, brief repo
- `workspace-validation`
  - workspace status/diff, run check, related checks
- `docs-capabilities`
  - markdown outline, doc update, capability search/show/add/update/audit
- `repo-indexing`
  - repo index build/update/status, code query, dependency graph
- `autopilot-repair`
  - bounded check/fix loop, failure summarizer, patch review
- `delegation`
  - specialist agents, task contracts, child result aggregation
- `release`
  - changelog candidates, version metadata, release checks

Packs should expose a compact pack summary first; full tool schemas load only when requested.

## Loading behavior

Recommended lifecycle:

1. Agent receives task.
2. Agent calls `tool_recommend({ task })` or `tool_search`.
3. Discovery returns top packs/tools with short reasons.
4. Agent calls `tool_load` for the smallest useful pack.
5. Runtime injects those schemas for a bounded TTL.
6. Tool pack expires after inactivity or completion.
7. Final answer mentions only user-relevant outcomes, not internal loading mechanics.

## Ranking and retrieval

Use hybrid ranking:

- lexical keyword match
- tags/domains
- task intent classifiers
- recent successful usage
- repo/capability context
- risk/cost preference
- current loaded tools

Prefer small, read-only tools first. Prefer high-level workflows when they cover multiple primitive tools.

## Context budget rules

- Never inject all tool schemas.
- Hard cap loaded schemas per turn.
- Prefer pack summaries over full schemas.
- Hide rare/unsafe write tools until explicitly loaded.
- Load exact schema only for tools the model is likely to call.
- Expire loaded tools aggressively.
- Keep examples short and task-specific.

## Safety rules

- Separate discovery from execution.
- Mark tools by risk: read-only, write, network, shell, destructive.
- Require explicit reason for loading risky packs.
- Keep destructive tools out of default recommendations unless the task requires them.
- Log load/unload events for debugging.
- Allow per-agent permission profiles to filter discoverable tools.

## Agent UX goal

The agent should feel like it can access thousands or millions of tools, but the prompt should only contain:

1. a tiny discovery interface,
2. a compact list of relevant candidates,
3. full schemas for a small loaded working set.

This gives broad capability without context bloat.

## Suggested first implementation

1. Add `docs/capabilities/tool-registry.json` or extend the capability registry with tool metadata.
2. Implement `tool_search`, `tool_show`, and `tool_inventory` over static metadata.
3. Add pack definitions for existing Agent Tooling tools.
4. Add `tool_recommend({ task })` using simple lexical/tag scoring.
5. Add `tool_load` as a router/runtime integration once the provider schema injection path supports dynamic tools.
6. Add smoke tests that prove full tool schemas are not present until loaded.

## Success criteria

- Agents can find relevant tools with one search/recommend call.
- Default prompt stays small even if the registry has thousands of tools.
- Loaded tools are explainable and bounded.
- Existing SISO Agent Tooling tools become discoverable as a pack instead of always requiring full upfront knowledge.
