# Run Report: CLI Activation Loop

Agent: persistent-agent-system-improver
Date: 2026-05-10 11:22
Objective: Turn the documented persistent-agent inspect/run workflow into a tiny `siso agent` CLI surface.
Status: complete

## Context read

- `.siso/agents/workflows/run-persistent-agent.md`
- `.siso/agents/workflows/inspect-persistent-agent.md`
- `.siso/agents/persistent-agent-system-improver/`
- `bin/siso`
- `.siso/bin/persist`
- `package.json`
- existing smoke test patterns in `scripts/`

## Work performed

- Added `bin/siso-agent` with `list`, `inspect`, and `run` subcommands.
- Wired `siso agent ...` and `siso agents ...` through the top-level `bin/siso` wrapper.
- Added a focused smoke test for inspect, run prompt rendering, and unknown-agent failure.
- Added `smoke:persistent-agent-cli` to `package.json`.
- Included `bin/siso-agent` in the syntax smoke command.
- Added `siso-agent` to the installer copy list and release-surface smoke.
- Ran one real activation request for `persistent-agent-system-improver`.

## Files changed

- `bin/siso`
- `bin/siso-agent`
- `scripts/smoke-persistent-agent-cli.mjs`
- `package.json`
- `scripts/install-local.sh`
- `scripts/smoke-install-release-surface.mjs`
- `.siso/agents/persistent-agent-system-improver/runs/2026-05-10-112056-activation-request.md`
- `.siso/agents/persistent-agent-system-improver/runs/2026-05-10-1122-cli-activation-loop.md`
- `.siso/agents/persistent-agent-system-improver/worklog.md`
- `.siso/agents/persistent-agent-system-improver/changelog.md`
- `.siso/agents/persistent-agent-system-improver/memory.md`
- `.siso/agents/persistent-agent-system-improver/metrics.md`

## Commands run

- `node scripts/smoke-persistent-agent-cli.mjs`
- `npm run smoke:syntax`
- `bash bin/siso agent inspect persistent-agent-system-improver`
- `bash bin/siso agent run persistent-agent-system-improver --dry-run`
- `bash bin/siso agent run persistent-agent-system-improver`

## Memory updates

- Recorded that the first real command surface is `siso agent inspect|run <id>`.

## Changelog updates

- Recorded the CLI activation loop and smoke coverage.

## Metrics update

- Incremented approximate run/task counts to include this CLI activation-loop run.

## Result

The manual file-backed MVP now has a small command-backed activation loop. Inspect is read-only and summarizes durable state. Run emits the exact continuation prompt and, in non-dry-run mode, writes a durable activation request under `runs/`.

## Next recommendation

Teach the main session/runtime to dispatch the rendered run prompt into a background child agent and then verify that the child updates the required files.

## Open issues

- `siso agent run` does not yet spawn a real background worker.
- Metrics remain approximate until router/provider telemetry is connected.
- Controlled-path enforcement is documented but not enforced by the CLI.
