# Add Pi Memory And Pi Guard As Lab-Scoped Primitives

## Decision

Add two lab-scoped primitives to the Pi Harness design:

- `pi-memory`: structured, local-first memory for decisions, fixes, corrections, patterns, session summaries, and user/project preferences.
- `pi-guard`: pre-edit impact awareness for high-risk files.

These are distinct from `pi-wiki` and `pi-code-brain`:

- `pi-wiki` is human-readable project/research knowledge.
- `pi-code-brain` is codebase search, symbols, modules, and topology.
- `pi-memory` is cross-session agent learning and continuity.
- `pi-guard` is edit-time risk awareness.

## Why

The latest research wave showed that useful agent memory does not have to be a raw transcript recorder. The strongest pattern is structured memory written by the agent after meaningful work, supported by lightweight search and session recovery.

The same wave also showed that code intelligence becomes dramatically more useful when it gates risky edits. A simple guard that asks the agent to inspect blast radius before touching high-impact files can preserve flow while preventing blind changes.

## References

- `syntax-syndicate/engram-agent-memory`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/syntax-syndicate-engram-agent-memory`
- `julep-ai/memory-store-plugin`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/julep-ai-memory-store-plugin`
- `memory-graph/memory-graph`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/memory-graph-memory-graph`
- `kuberstar/qartez-mcp`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kuberstar-qartez-mcp`
- Wave report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-agent-memory-code-graph-wave4.md`

## Pi Memory MVP

Local files:

```text
.pi/
  memory.db
  events/
    queue.jsonl
    state.json
  sessions/
    current.json
```

Core records:

```text
memory
  id
  project
  scope
  type
  title
  content
  tags
  importance
  topic_key
  created_at
  updated_at

memory_relation
  from_id
  to_id
  relation_type
  confidence

session_summary
  id
  goal
  discoveries
  accomplished
  files
  created_at
```

Core commands:

```bash
pi harness memory save
pi harness memory search <query>
pi harness memory context
pi harness memory timeline <id>
pi harness memory session-summary
pi harness memory stats
pi harness memory process-queue
```

Default save triggers should be agent-authored, not automatic firehose:

- bug fix
- architecture decision
- repeated correction
- successful pattern
- anti-pattern discovered
- important user preference
- session close summary

## Hook Queue Pattern

Use a fast producer/slow consumer model:

```text
hooks write compact events to .pi/events/queue.jsonl
memory process-queue reads unprocessed offsets
agent or tool decides what should become durable memory
state.json records last processed byte offset or event id
```

This gives Pi the benefits of lifecycle capture without making hooks slow or noisy.

## Pi Guard MVP

Core behavior:

```text
Before edits:
  if file is high-impact:
    require impact inspection first
  else:
    allow edit normally
```

First risk signals:

- imported by many files
- touched often in git history
- co-changed with many files
- known central path from `pi-code-brain`
- listed in `.pi/guard/high-impact.txt`

Future signals:

- PageRank on import graph
- blast radius from full graph
- cyclomatic complexity
- clone/smell/security scoring
- test-gap scoring

## Design Constraints

- Keep the first version local and inspectable.
- Do not mutate global Claude or Pi config from the lab prototype.
- Do not require Neo4j, Chroma, cloud MCP, OAuth, or hosted vector stores in the default path.
- Keep Bifrost as the only model router when model calls are needed.
- Make guard behavior explainable: the agent should know why a file was flagged.

## Open Questions

- Should `pi-memory` be a Pi extension, an MCP server, a CLI, or all three?
- Should structured memory use SQLite FTS5 directly or plain markdown plus an index?
- How much queue processing should be deterministic versus model-assisted through Bifrost?
- Should `pi-guard` block edits or simply warn in the first sprint?

## Next Step

Implement a tiny lab-only prototype:

1. SQLite-backed `memory save/search/context/session-summary`.
2. `.pi/events/queue.jsonl` with a deterministic `process-queue` command.
3. A warning-only `pi-guard` that flags high-impact files using import count and git churn.
