# Decision Log

## 2026-05-10 — Use filesystem-backed Markdown for executive MVP

Decision:
Use `.siso/executive/` Markdown files as the first durable state store.

Context:
We need a persistent executive memory layer that is useful immediately and easy to inspect.

Why:
Markdown files are transparent, easy for agents to read/write, easy for Shaan to correct, and do not require infrastructure.

Consequences:
This may later need JSON indexes, database storage, or workflow engine integration, but only after the manual loop proves useful.

Revisit when:
State becomes too large, too inconsistent, or too hard to query.

## 2026-05-10 — Separate mouth, executive, and worker responsibilities

Decision:
Treat the chat-facing mouth agent, durable executive agent, and worker agents as separate roles.

Context:
A single chat agent is prone to mixing brainstorm, memory, execution, and delegation.

Why:
Separation reduces context drift and makes durable state more reliable.

Consequences:
Workflows need clear handoff formats between mouth, executive, and workers.

Revisit when:
The separation creates too much friction or duplicate work.

## 2026-05-10 — Pause manual transcript ingestion

Decision:
Do not depend on manually pasted transcript files for current architecture work.

Context:
Manual TextEdit transcript collection produced duplicate/misleading files and became a distraction.

Why:
The ingestion workflow is error-prone. The core executive-agent architecture can proceed without it.

Consequences:
Future research should include a free/code-based YouTube transcript ingestion tool with URL input, metadata, and deduplication.

Revisit when:
We are ready to build research ingestion tooling.

## 2026-05-10 — MVP persistent agents are stateless runs with durable state

Decision:
The first MVP agents will not be always-on daemons. They will be stateless executions that load persistent files, do scoped work, write reports/memory/changelog/metrics, and stop.

Context:
Shaan wants agents that can be programmed, made live, inspected, and allowed to improve their own memories/goals over time using current infrastructure.

Why:
This fits current SISO capabilities, avoids premature daemon/scheduler complexity, and still proves the persistent-agent loop.

Consequences:
We need a file-backed `.siso/agents/` schema, manual run/inspect workflows, and approximate token accounting before deeper runtime integration.

Revisit when:
Manual runs are useful and we are ready for background scheduling or native `siso agent ...` commands.

## 2026-05-10 — Use one descriptive agent/team for the first MVP

Decision:
Collapse the initial two-agent split into one descriptive live agent/team: `persistent-agent-system-improver`.

Context:
The first names (`atlas`, `forge`) were too metaphorical, and the split between strategist and builder was premature for the MVP.

Why:
Shaan wants names that clearly explain what an agent does. The first MVP is easier to test with one system for one goal: improving the persistent-agent system itself.

Consequences:
The initial live registry now has one agent/team. Future agents can split out only when there is a clearly useful separation of responsibility.

Revisit when:
The persistent-agent-system-improver has enough recurring work that a separate implementation, research, or maintenance agent would be obviously useful.
