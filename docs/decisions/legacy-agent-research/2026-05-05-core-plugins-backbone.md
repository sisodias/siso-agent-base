# Decision: Core + Plugins Backbone

Date: 2026-05-05

## Decision

Use a small core+plugins backbone for the Pi Harness Lab:

1. `planning-with-files` contract for durable planning.
2. `pi-tasks` contract for task state and worker backlog.
3. `pi-supervisor-lite` contract for outcome checking.

Add `pi-rewind`, `pi-schedule-prompt`, `pi-context-prune`, and `pi-prompt-suggester` only as feature-flagged experiments.

Keep larger or more opinionated systems as design references until the core is stable.

## Why

The research batches showed that the strongest pieces are not giant replacement harnesses. They are focused, inspectable modules:

- file-backed planning gives durable context without prompt bloat,
- task registry gives worker coordination without hidden state,
- supervision gives quality checks without requiring a new process manager,
- rollback and scheduling are powerful but need explicit safety gates,
- context pruning is promising but must be measured against Bifrost cache/token behavior.

This matches the lab mission: smaller, inspectable, modular, Pi-native, Bifrost-routed.

## Adopt Now

### Planning

Adopt the `planning-with-files` three-file state contract:

```text
task_plan.md
findings.md
progress.md
```

Use `.planning/<plan-id>/` for concurrent plans and an active-plan resolver.

### Tasks

Adopt the `pi-tasks` API shape:

- `TaskCreate`
- `TaskList`
- `TaskGet`
- `TaskUpdate`
- `TaskOutput`
- `TaskStop`
- `TaskExecute`

Use `blockedBy` for dependencies and `metadata.agentType` for worker role selection.

### Supervision

Adopt the `pi-supervisor` outcome-checking pattern, but default to observe-only.

The supervisor may emit structured decisions:

- `continue`
- `steer`
- `done`

Only explicit session/task settings should allow automatic steering.

## Pilot Behind Flags

### `pi-rewind`

Pilot session and turn-end checkpoints only.

Do not enable per-tool checkpointing by default.

### `pi-schedule-prompt`

Pilot active-session heartbeat jobs only.

Do not treat it as durable cron.

### `pi-context-prune`

Pilot only after metrics can show:

- prompt tokens,
- tool chars,
- total tokens,
- prompt-cache/cost side effects,
- recovery quality through `context_tree_query`.

### `pi-prompt-suggester`

Pilot only after the command/skill catalog stabilizes.

Use it for next-action suggestions, not user intent rewriting.

## Design References Only

Do not adopt as first-pass dependencies:

- `Understand-Anything`
- `task-factory`
- full `llm-wiki-plugin` command layer
- full always-on `pi-supervisor`
- `juno-code` shell orchestrator

Study them for architecture ideas only.

## Safety Rules

- Keep Bifrost as the only model router.
- Do not mutate the real `/Users/shaansisodia/.pi/agent` profile for experiments.
- Do not install third-party Pi packages globally during evaluation.
- Do not enable scheduled write/bash tasks without allowlists.
- Do not enable session export/sharing by default.
- Do not prune context until raw outputs remain recoverable.
- Do not let task, rewind, and supervisor state diverge without a shared session/task id.

## Documentation

Implementation/design documentation:

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/core-plugins-slice.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/design-reference-catalog.md`

Research sources:

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-repo-batch-synthesis.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-awesome-pi-agent-extensions.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-design-reference-followups.md`

## Next Step

Build an isolated benchmark slice:

1. Create a plan with `.planning/<plan-id>/task_plan.md`, `findings.md`, and `progress.md`.
2. Create three task records with one dependency.
3. Simulate or run one worker through the selected task execution bridge.
4. Record one supervisor-lite decision.
5. Add one checkpoint and test restore visibility.
6. Add one scheduled heartbeat job.
7. Measure Bifrost tokens and tool chars after each addition.
