# Workflow: executive-review

Purpose: reconstruct current executive state and recommend next actions.

## Inputs to read

1. `.siso/executive/profile.md`
2. `.siso/executive/state/goals.md`
3. `.siso/executive/state/active-projects.md`
4. `.siso/executive/tasks/active.md`
5. `.siso/executive/decisions/decision-log.md`
6. `.siso/executive/research-index.md`
7. Any new files in `.siso/executive/inbox/`

## Output format

```md
# Executive Review: YYYY-MM-DD

## Current focus

## What changed

## Key decisions

## Active tasks

## Blockers / risks

## Recommended next actions

## Items needing Shaan's decision
```

## Rules

- Recommend concrete next actions.
- Do not create busywork.
- Distinguish facts from recommendations.
- If state is stale or contradictory, say so.
