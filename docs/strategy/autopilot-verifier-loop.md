# Autopilot Verifier Loop

Status: design contract
Date: 2026-05-10
Related readiness gate: `docs/strategy/v2.1-readiness-plan.md`

## Goal

Autopilot should reduce repeated manual "try, test, fix, retest" prompts by turning them into a bounded controller loop. The loop can use a cheaper or more isolated verifier, such as a Minimax agent, after the worker says the task is done.

The goal is not full autonomy. The goal is a supervised system that can prove whether a prompt was completed to specification, feed compact corrections back to the worker, and stop safely.

## Roles

### Controller

The controller owns loop state. It decides when to checkpoint, when to run checks, when to call the verifier, when to feed back, and when to stop.

The controller must track:

- `sessionId`
- `threadId`
- `parentRunId`
- `autopilotRunId`
- `iteration`
- `maxIterations`
- current specification summary
- required checks
- latest failure signature
- checkpoint id/path
- flight recorder path

### Worker

The worker performs implementation work. In the normal chat flow, this is the current coding agent.

The worker receives:

- the user prompt,
- the compact specification,
- allowed files or scope,
- required checks,
- the latest feedback packet when a verifier rejects the work.

The worker should not receive raw verifier logs or raw child event payloads.

### Verifier

The verifier is a read-only verifier by default. The preferred cheap verifier can be a Minimax agent when available, because it gives an independent second pass without paying for another full frontier-model implementation loop.

The verifier receives:

- the original user prompt,
- the compact specification,
- changed-file summary,
- relevant diff,
- required check results,
- contract report summary,
- flight recorder summary.

The verifier returns a verdict:

- `pass`
- `needs_fix`
- `blocked`

The verifier must not edit files in v1. If edits are later allowed, they must happen in a separate explicit mode.

## Loop

1. Build a compact specification from the prompt.
2. Resolve required checks from explicit user instructions, changed files, contracts, and package scripts.
3. Create a checkpoint before file edits.
4. Let the worker implement.
5. Run required checks.
6. Produce a failure signature from failing command, exit code, key error line, changed files, and contract id.
7. If checks pass, call the verifier.
8. If the verifier passes, finish with a compact parent-visible report.
9. If checks or verifier fail, create a feedback packet and return it to the worker.
10. Stop when the work passes, `maxIterations` is reached, or the failure signature stops changing.

## Feedback Packet

The feedback packet is the only thing that should flow from verifier back to worker.

It should contain:

- verdict,
- missing requirement,
- failing check command,
- compact failure signature,
- relevant files,
- suggested next action,
- whether a fresh checkpoint is required.

It must not contain:

- raw logs,
- raw tool events,
- full child-agent records,
- full file contents,
- provider payloads.

## Checkpoint Policy

Autopilot must checkpoint before edits in every iteration.

For V2.1, a checkpoint can be lightweight:

- git diff snapshot for tracked files,
- list of untracked files,
- selected file content snapshots for files the worker is about to touch,
- metadata in the flight recorder.

Rollback should be explicit. The controller may recommend rollback, but should not silently discard user or other-agent edits.

## Failure Signature

The failure signature prevents dumb infinite loops.

It should include:

- command,
- exit code,
- first meaningful error line,
- contract id when available,
- changed file set hash,
- verifier missing-requirement id when available.

If the same failure signature appears twice without a meaningful diff change, the controller should stop and return a blocked report.

## Session Isolation

Autopilot is session-scoped.

Every event and child result must carry:

- `sessionId`
- `threadId`
- `parentRunId`
- `autopilotRunId`
- `visibility`

The TUI may show global health globally, but worker/verifier rows and child completion payloads are visible only in the owning session by default.

## Flight Recorder

Every autopilot run writes a compact flight recorder trace.

The trace should include:

- specification summary,
- selected checks,
- checkpoint metadata,
- worker iterations,
- verifier verdicts,
- failure signatures,
- final outcome,
- parent-visible token/character estimate when available.

The parent chat receives a compact summary only. Full evidence stays on disk. There should be no raw logs in parent-visible details.

## When To Use A Minimax Verifier

Use a Minimax verifier when:

- the worker claims the task is complete,
- the task has a specification or checklist,
- checks are green but quality/spec adherence still matters,
- the verifier can run read-only.

Do not use a verifier when:

- the task is a tiny direct command,
- the required check already failed and the next action is obvious,
- the prompt contains secrets or private provider payloads,
- the controller has no session identity.

## First Runtime Slice

The first runtime implementation should be narrow:

1. `siso action=check op=autopilot-plan`
2. Produce the controller plan and required checks.
3. Run no edits.
4. Run no verifier.
5. Return compact details.
6. Smoke-test that the plan includes checkpoint, verifier, max iteration, failure signature, session isolation, and flight recorder fields.

The second runtime slice should execute checks and generate feedback packets.

The third runtime slice should spawn or request a read-only verifier agent.

The fourth runtime slice should close the loop by feeding a failed verifier packet back into a worker iteration.
