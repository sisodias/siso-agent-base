# SISO Persistent Agents

Status: MVP skeleton
Created: 2026-05-10

This folder stores durable identities, goals, memory, logs, changelogs, controlled paths, and metrics for persistent SISO agents.

MVP model:

```txt
persistent files + stateless run + durable report/memory/changelog/metrics
```

Agents do not need to be always-on processes yet. A run loads the agent's state, performs scoped work, writes updates, and stops.

## Source Control Convention

Commit deliberate persistent-agent state:

- `registry.md`
- `README.md`
- `templates/`
- `workflows/`
- each live agent's `agent.md`, `goals.md`, `memory.md`, `controlled-paths.md`, `worklog.md`, `changelog.md`, `metrics.md`
- small markdown `inbox/`, `outbox/`, and `runs/` records that explain durable agent history

Do not commit runtime pointers, generated indexes, bulky telemetry, or local machine paths.

Current ignored runtime path:

- `.siso/agents/_runtime/`
