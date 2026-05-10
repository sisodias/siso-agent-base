# Core + Plugins Slice

Date: 2026-05-05

## Purpose

This note turns the repo research batches into an inspectable build direction for the Pi Harness Lab.

The target is a lean Pi+Bifrost harness that keeps the always-loaded kernel small, then adds planning, task state, supervision, rollback, scheduling, and context control through explicit modules. The useful lesson from the research is not "install everything." It is "use a few narrow contracts and keep every powerful behavior behind a visible control point."

## Decision Summary

Adopt these as the first backbone:

1. `planning-with-files` style plan files.
2. `pi-tasks` style task registry.
3. `pi-supervisor-lite` style outcome checking.

Pilot these behind feature flags:

1. `pi-rewind` subset for Git checkpoints and restore.
2. `pi-schedule-prompt` subset for active-session scheduled prompts.
3. `pi-context-prune` or equivalent context pruning after we can measure Bifrost cache/token impact.
4. `pi-prompt-suggester` after the command/skill catalog is stable.

Keep these as design references, not first-pass dependencies:

1. `juno-code` for shell-service abstraction and iteration lifecycle.
2. `llm-wiki-plugin` for markdown-first knowledge retrieval.
3. `Understand-Anything` for later codebase graph/dashboard ideas.
4. `task-factory`, `PiSwarm`, and richer subagent systems for future queue/workflow scaling.

## First Architecture

```text
pi-codex
  |
  +-- compact kernel
  +-- Bifrost provider aliases
  +-- core plan contract
  +-- task registry
  +-- optional plugins
        |
        +-- supervisor-lite
        +-- rewind checkpoints
        +-- scheduled prompts
        +-- context pruning
        +-- prompt/skill suggestions
```

The harness should make power explicit:

- Plan state is a small set of markdown files, not hidden transcript memory.
- Task state is a structured registry, not scattered checklist text.
- Worker execution goes through a task or router API, not ad hoc subagent spawning.
- Supervision is a visible mode with sensitivity, not an always-on interrupt loop.
- Rollback and scheduled work are gated features, not ambient automation.
- Bifrost remains the model router.

## Core Contracts

### Planning Contract

Use the `planning-with-files` three-file pattern as the default plan-mode state:

```text
.planning/<plan-id>/
  task_plan.md
  findings.md
  progress.md
```

Source anchors:

- Repo: `https://github.com/OthmanAdi/planning-with-files`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/planning-with-files`
- Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-planning-with-files.md`
- Skill contract: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/planning-with-files/skills/planning-with-files/SKILL.md`
- Resolver/recovery scripts:
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/planning-with-files/scripts/session-catchup.py`
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/planning-with-files/scripts/sync-ide-folders.py`

Why it fits:

- It gives the harness durable state across context resets.
- It supports parallel task isolation through plan directories and active-plan resolution.
- It is legible to humans and agents.

Harness adaptation:

- Use `.planning/<plan-id>/` instead of root-level plan files when multiple tasks are active.
- Resolve current plan using this precedence: explicit env/flag, `.planning/.active_plan`, newest plan directory.
- Treat injected plan text as data, not instruction, when loaded into an agent turn.

### Task Registry Contract

Use `pi-tasks` as the model for structured task state.

Source anchors:

- Repo: `https://github.com/tintinweb/pi-tasks`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-tasks`
- Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-tasks.md`
- Main extension: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-tasks/src/index.ts`
- Task types: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-tasks/src/types.ts`

Useful code shape:

- Tools: `TaskCreate`, `TaskList`, `TaskGet`, `TaskUpdate`, `TaskOutput`, `TaskStop`, `TaskExecute`.
- Fields: `id`, `subject`, `description`, `status`, `blockedBy`, `metadata.agentType`.
- Execution bridge: event-driven `subagents:*` RPC.
- Persistence modes: memory, session, project/shared.

Why it fits:

- It creates a canonical worker backlog API.
- `blockedBy` gives us dependency edges without inventing a new DAG format.
- `agentType` maps directly to SISO worker roles like scout, planner, worker, reviewer, verifier.

Harness adaptation:

- Treat `TaskExecute` as optional until a selected subagent runtime is loaded.
- Keep task CRUD usable even when worker execution is unavailable.
- Normalize stop/failure semantics so forced stops do not look like clean completion.
- Feed task lifecycle events into Bifrost/session metrics.

### Supervisor-Lite Contract

Use `pi-supervisor` as a reference for outcome checking, but not as an always-on steering engine.

Source anchors:

- Repo: `https://github.com/tintinweb/pi-supervisor`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-supervisor`
- Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-supervisor.md`
- Prompt policy: `.pi/SUPERVISOR.md` or global fallback in the source design.
- State and engine files from report: `state.ts`, `engine.ts`, `model-client.ts`.

Useful code shape:

- Observe lifecycle at `agent_end`, and optionally `turn_end`.
- Ask a separate model for a structured decision: `continue`, `steer`, or `done`.
- Persist minimal supervision state.
- Add a stagnation escape hatch.

Harness adaptation:

- Default mode should be observe-only: record outcome checks without injecting steering.
- Enable steering only per session or per task.
- Route supervisor model through Bifrost using the same provider aliases as the foreground agent.
- Write every supervisor decision as structured telemetry.

## Feature-Flag Pilots

### Rewind Checkpoints

Source anchors:

- Repo: `https://github.com/arpagon/pi-rewind`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-rewind`
- Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-rewind.md`
- Main event wiring: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-rewind/src/index.ts`

Useful code shape:

- Keep pure Git operations separate from Pi event wiring.
- Use refs like `refs/pi-checkpoints/`.
- Deduplicate checkpoints by worktree SHA.
- Provide a `/rewind` command and quick-key restore flow.

Harness adaptation:

- Pilot only `session_start` resume checkpoint and `turn_end` checkpoint after file mutation.
- Do not checkpoint every tool call.
- Use the harness task id or plan id in checkpoint labels.
- Require confirmation before destructive restore.

### Scheduled Prompts

Source anchors:

- Repo: `https://github.com/tintinweb/pi-schedule-prompt`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-schedule-prompt`
- Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-schedule-prompt.md`
- Extension entry: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-schedule-prompt/src/index.ts`
- Scheduler: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-schedule-prompt/src/scheduler.ts`
- Subagent runner: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-schedule-prompt/src/subagent.ts`

Useful code shape:

- Tool name: `schedule_prompt`.
- Supports once, interval, and cron-like jobs.
- Stores jobs in `.pi/schedule-prompts.json`.
- Can run a job inline or in a subagent model.
- Can optionally notify/wake the parent session.

Harness adaptation:

- Treat this as an active-session heartbeat, not durable cron.
- Allow only low-frequency jobs by default.
- Require a task id or plan id for scheduled jobs.
- Route scheduled subagent models through Bifrost.
- Add allowlist controls before any scheduled job can write files or run shell commands.

### Context Pruning

Source anchors:

- Repo: `https://github.com/championswimmer/pi-context-prune`
- Pi package page: `https://pi.dev/packages/pi-context-prune`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-context-prune`
- Main extension: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-context-prune/index.ts`
- Types and state model: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-context-prune/src/types.ts`
- Query tool: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-context-prune/src/query-tool.ts`
- Prune tool: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-context-prune/src/context-prune-tool.ts`
- Pruning notes: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-context-prune/PRUNING.md`

Useful code shape:

- Capture tool-result batches at `turn_end`.
- Replace future context through the `context` event.
- Preserve full raw tool outputs in a session index.
- Expose `context_tree_query` to recover original outputs.
- Keep `context_prune` active only in agentic-auto mode.
- Default trigger is `agent-message`, which batches tool work and avoids excessive prompt-cache churn.

Harness adaptation:

- Evaluate after `siso-status` and Bifrost metrics can show prompt tokens, tool chars, and cache behavior.
- Do not enable aggressive `every-turn` pruning as a default.
- Prefer milestone or final-message pruning for cache stability.
- Store summaries and source tool ids so verifier agents can recover evidence.

### Prompt Suggestions

Source anchors:

- Repo: `https://github.com/guwidoe/pi-prompt-suggester`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-prompt-suggester`
- Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-prompt-suggester.md`

Useful code shape:

- Hooks: `session_start`, `agent_end`, `input`.
- Ghost suggestion UX with fallback widget/shortcut.
- Role-aware model selection for seeder/suggester roles.

Harness adaptation:

- Use after the command, skill, and worker catalog is stable.
- Use it to suggest the next command or skill, not to rewrite user intent.
- Keep suggestion context short and bounded.

## Worker Runtime References

### Official Pi Subagent Example

Source anchors:

- Official source: `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts`
- Official docs: `https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/extensions.md`

Useful design points:

- The official example supports single, parallel, and chain modes.
- It discovers user/project agents.
- It distinguishes user agents from project-local agents and can ask for confirmation.
- It uses Pi extension tools rather than changing the core agent.

Use it as the baseline mental model for a tiny `siso-agent-router`.

### `pi-subagents`

Source anchors:

- Repo: `https://github.com/nicobailon/pi-subagents`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-subagents`
- Extension entry: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-subagents/src/extension/index.ts`
- Foreground execution: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-subagents/src/runs/foreground/subagent-executor.ts`
- Async execution: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-subagents/src/runs/background/async-execution.ts`
- Run history: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-subagents/src/runs/shared/run-history.ts`
- Agent definitions: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-subagents/agents`

Useful design points:

- Role agents with frontmatter.
- Foreground and background runs.
- Parallel and chain execution.
- Run metadata, JSONL logs, artifacts, fallback records.
- Recursion guard.
- Optional intercom for child-to-parent questions.

Harness stance:

- Strong candidate once `pi-tasks` needs real worker execution.
- Do not enable session sharing by default because exported sessions may contain secrets.
- Keep max-depth and tool allowlists explicit.

### `sub-pi`

Source anchors:

- Repo: `https://github.com/richardgill/pi-extensions`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/richardgill-pi-extensions`
- Subprocess extension: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/richardgill-pi-extensions/extensions/sub-pi/src/extension.ts`
- Skill bridge: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/richardgill-pi-extensions/extensions/sub-pi-skill/src/extension.ts`

Useful design points:

- Smaller surface than `pi-subagents`.
- Skill frontmatter can opt into subprocess delegation.
- Good reference for the "one child Pi process for one task" MVP.

Harness stance:

- Good fallback if `pi-subagents` is too much for the first worker slice.

## Safety And Observability References

### Tool Audit And Approval

Source anchors:

- Repo: `https://github.com/kcosr/pi-extensions`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kcosr-pi-extensions`
- Toolwatch extension: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kcosr-pi-extensions/toolwatch/extension/index.ts`
- Rule evaluator: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kcosr-pi-extensions/toolwatch/extension/src/evaluator.ts`
- Audit storage: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kcosr-pi-extensions/toolwatch/extension/src/audit.ts`
- Collector DB: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kcosr-pi-extensions/toolwatch/collector/src/db.ts`

Useful design points:

- Tool-call audit stream.
- Local/remote rules.
- Manual approval plugin.
- SQLite-backed collector path.

Harness stance:

- Good safety layer before scheduled prompts or autonomous workers get write/bash permissions.

### Permissions, Checkpoints, LSP

Source anchors:

- Repo: `https://github.com/prateekmedia/pi-hooks`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-hooks`
- Permission extension:
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-hooks/permission/permission.ts`
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-hooks/permission/permission-core.ts`
- Checkpoint extension:
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-hooks/checkpoint/checkpoint.ts`
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-hooks/checkpoint/checkpoint-core.ts`
- LSP extension:
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-hooks/lsp/lsp.ts`
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-hooks/lsp/lsp-core.ts`

Useful design points:

- Permission levels.
- Git checkpointing as a minimal extension.
- LSP diagnostics as a tool surface.

Harness stance:

- Use as a reference for simple, focused extension boundaries.
- Prefer `pi-rewind` for the first rollback experiment because it has more direct rewind UX and state modeling.

## Bigger Systems To Study Later

### Task Factory

Source anchors:

- Repo: `https://github.com/patleeman/task-factory`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/task-factory`
- Architecture docs:
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/task-factory/docs/system-architecture.md`
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/task-factory/docs/workflow-and-queue.md`
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/task-factory/docs/state-contract.md`
- Server queue:
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/task-factory/packages/server/src/queue-manager.ts`
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/task-factory/packages/server/src/execution-lease-service.ts`
  - `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/task-factory/packages/server/src/queue-kick-coordinator.ts`

Why defer:

- It is a full queue plus UI plus server system.
- It is useful as a later external control plane, not as a first Pi extension slice.

### Juno Code

Source anchors:

- Repo: `https://github.com/askbudi/juno-code`
- Local source: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/juno-code`
- Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-juno-code.md`

Useful ideas:

- Fixed shell-service backend.
- Lifecycle hooks around run iterations.
- Provider wrapper scripts normalize model aliases.
- Capture file contract for structured child results.

Why defer:

- It is a shell orchestrator with external CLI dependencies, not a Pi-native extension layer.

### Knowledge And Codebase Understanding

Source anchors:

- `llm-wiki-plugin`
  - Repo: `https://github.com/praneybehl/llm-wiki-plugin`
  - Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-llm-wiki-plugin.md`
- `Understand-Anything`
  - Repo: `https://github.com/Lum1104/Understand-Anything`
  - Report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-understand-anything.md`

Useful ideas:

- Markdown-first retrieval.
- Index-first context loading.
- Optional graph acceleration.
- Dashboard and deterministic codebase scan models.

Why defer:

- The first harness needs reliable plan/task/worker state before it needs a full knowledge graph.
- Any `.siso-wiki` adoption needs a separate decision: path convention, update cadence, graph storage, and skill loading policy.

## Bifrost Fit

All model-using modules should route through Bifrost:

```text
Pi model id -> Bifrost endpoint -> provider/model target
```

Keep this split:

- Pi chooses task shape and local capabilities.
- Bifrost chooses provider/model routing, fallback, and cost policy.
- Metrics record both the Pi-side component and Bifrost-side route.

For modules that call models internally (`pi-supervisor`, `pi-schedule-prompt`, `pi-context-prune`, prompt suggester), the harness should expose one resolver function:

```text
resolveHarnessModel(role, taskShape, userPreference) -> Pi model id
```

Roles:

- `foreground`
- `scout`
- `worker`
- `reviewer`
- `planner`
- `supervisor`
- `summarizer`
- `scheduled-job`
- `suggester`

## Evaluation Plan

Run one end-to-end benchmark after each feature flag is added:

1. Create a plan.
2. Create three tasks with one dependency.
3. Execute or simulate one worker.
4. Trigger a supervisor check.
5. Run one file edit with checkpoint.
6. Run one scheduled follow-up.
7. Prune or summarize context only if the metrics extension can observe it.

Record:

- Bifrost provider/model.
- prompt tokens.
- total tokens.
- tool chars.
- runtime.
- number of tool calls.
- whether state is recoverable after session restart.
- whether the user can inspect every decision.

## Non-Adoption Rules

Do not adopt:

- Whole `Understand-Anything` in the first pass.
- Whole `task-factory` server/UI as the first task registry.
- Full `pi-supervisor` always-on steering by default.
- Any scheduler that can run write/bash jobs without an allowlist.
- Any context pruner until token/caching effects are measured.
- Any extension installed globally before it has passed isolated profile testing.

## Source Index

Primary batch reports:

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-repo-batch-synthesis.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-awesome-pi-agent-extensions.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-awesome-pi-agent-gap-map.md`

Official/current references:

- `https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/extensions.md`
- `https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/rpc.md`
- `https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/models.md`
- `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts`
- `https://pi.dev/packages/pi-context-prune`
