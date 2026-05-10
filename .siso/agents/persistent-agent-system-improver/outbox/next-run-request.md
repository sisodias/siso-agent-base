# Next Run Request: Background Worker Dispatch

Agent: persistent-agent-system-improver
Created: 2026-05-10 11:38
Priority: high
Status: blocked-on-main-session-approval

## Request

Approve or assign implementation work for `siso agent run <agent-id>` to dispatch the rendered persistent-agent run prompt into a real background child worker.

## Why

The current CLI path makes the persistent-agent loop inspectable, but it still stops after rendering the run prompt. A real persistent agent should be able to:

1. read durable state,
2. execute one scoped continuation chunk in a child worker,
3. write a run report,
4. update worklog/changelog/memory/metrics,
5. leave an outbox request if more work remains.

## Scope needing approval

This likely touches ask-first paths:

- SISO runtime/source code
- native router/command code
- persistent-agent CLI command behavior

## Suggested acceptance checks

- `siso agent run persistent-agent-system-improver --dry-run` still renders without writing.
- Non-dry-run dispatches a background child with the rendered prompt.
- The child is instructed to obey controlled paths and write required run artifacts.
- The CLI reports the child/run id and where artifacts should appear.
- Existing smoke checks continue passing.
