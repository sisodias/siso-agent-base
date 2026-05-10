# Decision: Isolated Pi Bifrost Profile

Date: 2026-05-05

## Decision

Use `/Users/shaansisodia/.pi-bifrost/agent` as the MVP profile and `/Users/shaansisodia/bin/pi-codex` as the launcher.

## Why

This tests Pi as a harness without mutating the real `~/.pi/agent` profile or copying the full `~/.claude` ecosystem. It also gives Bifrost clean logs for prompt-token measurement.

## Rules

- Keep Bifrost as the model router.
- Keep global Claude skills centralized; do not clone them.
- Use one tiny `siso-capabilities` skill as the default skill entrypoint.
- Use worktrees per task or sprint, not per subagent.

## Current Result

The usable default MVP prompt is down to 1,410 prompt tokens with seven tools enabled, compared with the earlier 5,215-token default Pi run and much larger Claude Code tool/schema payloads.
