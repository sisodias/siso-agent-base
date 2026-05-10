# Workflow: Run Persistent Agent

Purpose: run a file-backed persistent agent/team using current SISO infrastructure.

MVP model:

```txt
read durable state -> perform scoped work -> write run report -> update memory/worklog/changelog/metrics -> stop
```

## Inputs

- Agent id, e.g. `persistent-agent-system-improver`
- Optional task/inbox item
- Optional user instruction

## Required files to read

For agent `<id>`:

1. `.siso/agents/<id>/agent.md`
2. `.siso/agents/<id>/goals.md`
3. `.siso/agents/<id>/memory.md`
4. `.siso/agents/<id>/controlled-paths.md`
5. `.siso/agents/<id>/worklog.md`
6. `.siso/agents/<id>/changelog.md`
7. `.siso/agents/<id>/metrics.md`
8. relevant files in `.siso/agents/<id>/inbox/`

## Run steps

1. Confirm the agent exists in `.siso/agents/registry.md`.
2. Read the agent state files.
3. State the run objective.
4. Check controlled paths before editing.
5. Do the smallest useful scoped work.
6. Write a run report in `.siso/agents/<id>/runs/YYYY-MM-DD-HHMM-<slug>.md`.
7. Append a worklog entry.
8. Append a changelog entry if user-visible files changed.
9. Update memory only for durable lessons/facts.
10. Update metrics approximately.
11. Report result and next recommendation.

## Run report template

```md
# Run Report: <title>

Agent: <id>
Date: YYYY-MM-DD HH:MM
Objective:
Status: complete | partial | blocked

## Context read

## Work performed

## Files changed

## Commands run

## Memory updates

## Changelog updates

## Metrics update

## Result

## Next recommendation

## Open issues
```

## Rules

- Do not write outside controlled paths without asking.
- Do not update memory with transient thoughts.
- Do not hide failed commands or uncertainty.
- Prefer one completed useful improvement per run.
