# Workflow: Continue Session Workhorse

Purpose: make session-owned workhorse continuation executable with current manual/background-child SISO infrastructure.

This is the smallest implementation shim before native scheduling exists.

## Inputs

- Workhorse agent id, e.g. `session-persistent-agent-mvp-workhorse`
- Latest inbox task or continuation request
- Current session/main agent context

## Required reads

For `.siso/agents/<agent-id>/` read:

1. `agent.md`
2. `goals.md`
3. `controlled-paths.md`
4. `continuation.md`
5. `questions.md`
6. `worklog.md`
7. `metrics.md`
8. relevant `inbox/`, `outbox/`, and latest `runs/`

## Run steps

1. Confirm the workhorse folder exists and has `continuation.md`.
2. If `Status` is terminal, do not continue; summarize the terminal state.
3. If `Needs user: yes`, write/refresh the question in `questions.md` and `outbox/`; stop.
4. If `Blocker` is not `none`, write/refresh the blocker in `outbox/`; stop.
5. Do exactly one scoped useful next action from `Next action`.
6. Write a run report in `runs/YYYY-MM-DD-HHMM-<slug>.md`.
7. Update `worklog.md`, `metrics.md`, and `changelog.md` if files changed.
8. Update `continuation.md` with one of:
   - `Status: active` plus a concrete `Next action`
   - `Status: done`
   - `Status: blocked-needs-user`
   - `Status: blocked-needs-permission`
   - `Status: paused-by-user`
   - `Status: failed`
9. If still `Status: active`, write `outbox/next-run-request.md` with the exact worker prompt the session/main agent should dispatch next.

## `outbox/next-run-request.md` format

```md
# Next Run Request

Status: ready-to-dispatch
Created: YYYY-MM-DD HH:MM
Workhorse: <agent-id>
Reason: continuation active and no blocker

## Dispatch prompt

You are a SISO Pi child agent and session-owned persistent workhorse for `<agent-id>`.
Execute `.siso/agents/workflows/continue-session-workhorse.md` for this workhorse.
Read durable state first, do one scoped next action, update continuation, write a run report, and return JSON only.
```

## Rule

Continuation is real only when every non-terminal run leaves either:

- a terminal/blocking status with an explicit question/request, or
- `outbox/next-run-request.md` containing the next dispatch prompt.
