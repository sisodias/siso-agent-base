# Active Projects

## Project: Persistent Executive Agent MVP

Status: active
Owner: Shaan + SISO agents
Priority: high
Created: 2026-05-10

### Current objective

Create the smallest useful persistent-agent MVP: stateless agent runs with durable identity, goals, memory, controlled paths, worklog, changelog, and token metrics, using current SISO infrastructure.

### Current architecture decision

Use a filesystem-backed Markdown state skeleton first. Do not start with a database, complex framework, or full autonomy loop.

### Next action

Create `.siso/agents/` skeleton and first live agents: `persistent-agent-system-improver`.

### Blockers

- Need to avoid overcomplicating the MVP.
- Need future tooling for reliable YouTube transcript ingestion; manual transcript collection is paused.
- Need token metrics to start approximate, then later integrate with router/provider telemetry.

### Related docs

- `docs/strategy/persistent-executive-agent-architecture.md`
- `docs/strategy/persistent-executive-agent-mvp-roadmap.md`
- `docs/research/persistent-executive-agents/README.md`
