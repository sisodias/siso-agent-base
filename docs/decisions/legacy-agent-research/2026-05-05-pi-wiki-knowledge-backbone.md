# Decision: Prototype A Pi Wiki Knowledge Backbone

Date: 2026-05-05

## Status

Proposed

## Context

Karpathy-adjacent research points repeatedly to the same pattern: raw sources are kept immutable, an agent compiles them into an interlinked markdown wiki, a schema tells the agent how to maintain the wiki, and query/export tools make the knowledge reusable.

This pattern appears across:

- https://github.com/Pratiyush/llm-wiki
- https://github.com/Ar9av/obsidian-wiki
- https://github.com/atomicmemory/llm-wiki-compiler
- https://github.com/VectifyAI/OpenKB
- https://github.com/NousResearch/hermes-agent
- https://github.com/boshu2/agentops

Pi Harness already has a growing research corpus under:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/pi-ecosystem-combined-registry.json
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/decisions/
```

That corpus is useful, but not yet activated automatically before planning, research, or subagent dispatch.

## Decision

Prototype a local `pi-wiki` knowledge backbone inside the lab.

The first version should be deterministic and file-only:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/wiki/
  AGENTS.md
  index.md
  log.md
  manifest.json
  concepts/
  playbooks/
  briefings/
  explorations/
  exports/
    llms.txt
    graph.jsonld
```

LLM synthesis through Bifrost can be added after the deterministic compiler works.

## Why

- Makes research compound instead of being rediscovered every turn.
- Gives Pi a cheap context activation step before expensive model calls.
- Keeps knowledge inspectable as plain markdown and JSON.
- Avoids mutating the real `~/.claude` or `~/.pi/agent`.
- Provides a natural place to promote findings from `research/inbox/` into stable playbooks and briefings.

## Consequences

- We need a clear provenance model: source URL, local path, commit hash, and date inspected.
- We need lifecycle metadata so stale findings do not masquerade as facts.
- The prototype should not ingest secrets from raw session logs until redaction exists.
- The query layer should prefer index/log/briefing reads before full-source reads.

## Next Step

Design and build a minimal compiler that reads `research/inbox/`, `decisions/`, and the package registry, then emits `wiki/index.md`, `wiki/log.md`, `wiki/manifest.json`, and `wiki/exports/llms.txt`.
