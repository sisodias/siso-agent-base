# Workflow: Inspect Persistent Agent

Purpose: show what a persistent agent/team is, what it is doing, and what changed recently.

## Inputs

- Agent id, e.g. `persistent-agent-system-improver`

## Files to read

1. `.siso/agents/registry.md`
2. `.siso/agents/<id>/agent.md`
3. `.siso/agents/<id>/goals.md`
4. `.siso/agents/<id>/memory.md`
5. `.siso/agents/<id>/controlled-paths.md`
6. `.siso/agents/<id>/worklog.md`
7. `.siso/agents/<id>/changelog.md`
8. `.siso/agents/<id>/metrics.md`
9. newest files in `.siso/agents/<id>/runs/`
10. open items in `.siso/agents/<id>/inbox/` and `.siso/agents/<id>/outbox/`

## Output format

```md
# Agent Inspection: <name>

## Identity

## Current goal/objectives

## Recent work

## Recent changes

## Memory summary

## Controlled paths

## Metrics

## Open inbox/outbox items

## Recommended next action
```

## Rules

- Keep it concise.
- Separate facts from recommendations.
- If metrics are approximate, say so.
