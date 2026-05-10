# Design Reference Catalog

Date: 2026-05-05

This catalog lists the repos worth keeping in view for the Pi Harness Lab. It is intentionally opinionated: each entry says whether it is a core candidate, a feature-flag pilot, or a design reference only.

## Core Candidates

| Repo | Local source | Status | Why it matters |
| --- | --- | --- | --- |
| `OthmanAdi/planning-with-files` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/planning-with-files` | Adopt contract | Best current reference for durable markdown planning state. |
| `tintinweb/pi-tasks` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-tasks` | Adopt API shape | Best current reference for task CRUD, dependencies, and worker execution hooks. |
| `tintinweb/pi-supervisor` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-supervisor` | Adopt lite pattern | Best current reference for outcome checking and structured steering decisions. |

## Feature-Flag Pilots

| Repo | Local source | Status | What to copy first |
| --- | --- | --- | --- |
| `arpagon/pi-rewind` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-rewind` | Pilot | Git refs, checkpoint labels, restore flow, redo stack. |
| `tintinweb/pi-schedule-prompt` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-schedule-prompt` | Pilot | `schedule_prompt` tool, `.pi/schedule-prompts.json`, session-bound timers. |
| `championswimmer/pi-context-prune` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-context-prune` | Pilot after metrics | `turn_end` batch capture, `context` filtering, `context_tree_query` recovery. |
| `guwidoe/pi-prompt-suggester` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-prompt-suggester` | Later pilot | Ghost suggestion UX and bounded next-action prompting. |

## Harness Architecture References

| Repo | Local source | Status | What to borrow |
| --- | --- | --- | --- |
| `1jehuang/jcode` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/1jehuang-jcode` | High-value reference | Agentgrep, memory budgets, swarm coordination, file-touch telemetry, provider UX, and async sidecar patterns. |
| `ruvnet/open-claude-code` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/ruvnet-open-claude-code` | Reference only | Claude Code subsystem checklist, event loop vocabulary, permission modes, lazy tool/skill loading, and upstream-drift verification. Do not copy source because the repo is decompile-informed. |

## Worker Runtime References

| Repo | Local source | Status | Notes |
| --- | --- | --- | --- |
| `badlogic/pi-mono` official subagent example | Not cloned here; source URL below | Reference | Canonical minimal extension pattern for single, parallel, and chain subagent modes. |
| `nicobailon/pi-subagents` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-subagents` | Strong later candidate | Mature roles, async runs, artifacts, recursion guard, run metadata, intercom option. |
| `richardgill/pi-extensions` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/richardgill-pi-extensions` | MVP alternative | `sub-pi` and `sub-pi-skill` are smaller references for one child Pi process per task. |
| `askbudi/juno-code` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/juno-code` | Design reference | Service wrapper and lifecycle-hook ideas, but too shell-adapter heavy for core. |

Official source URLs:

- `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts`
- `https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/extensions.md`
- `https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/rpc.md`
- `https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/docs/models.md`

## Safety, Permissions, And Audit

| Repo | Local source | Status | What to study |
| --- | --- | --- | --- |
| `kcosr/pi-extensions` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kcosr-pi-extensions` | High-priority reference | `toolwatch` rule evaluator, audit storage, manual approval plugin, collector DB. |
| `prateekmedia/pi-hooks` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-hooks` | Reference | Small permission/checkpoint/LSP modules with simple boundaries. |
| `qualisero/rhubarb-pi` | Not cloned in this pass | Worth looking into | `safe-git`, session footer color, background notify. |
| `michalvavra/agents` | Not cloned in this pass | Worth looking into | Security and output redaction examples from the awesome list. |

## Task And Queue Systems

| Repo | Local source | Status | What to borrow |
| --- | --- | --- | --- |
| `patleeman/task-factory` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/task-factory` | Later design reference | Queue lanes, execution leases, workflow dashboard, task state contract. |
| `lsj5031/PiSwarm` | Not cloned in this pass | Later design reference | Parallel issue/PR processing and worktree isolation patterns. |
| `juanibiapina/gob` | Not cloned in this pass | Later design reference | Background process manager/TUI shape for long-running jobs. |

## Context, Knowledge, And Codebase Maps

| Repo | Local source | Status | What to borrow |
| --- | --- | --- | --- |
| `praneybehl/llm-wiki-plugin` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/llm-wiki-plugin` | Backlog | Markdown-first knowledge retrieval and optional graph layer. |
| `Lum1104/Understand-Anything` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/Understand-Anything` | Backlog | Deterministic scan, graph schema, dashboard, analyzer pipeline. |
| `kcosr/codemap` or `kcosr/pi-extensions/codemap` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kcosr-pi-extensions/codemap` | Worth looking into | Token-aware symbol/codebase map for scout agents. |
| `Opencode-DCP/opencode-dynamic-context-pruning` | Not cloned in this pass | Worth looking into | Alternative context pruning strategy for comparison. |
| `pi-context-prune` | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-context-prune` | Pilot after metrics | Recoverable tool-output compaction for long sessions. |

## UI And Metrics

| Repo/package | Local source | Status | What to borrow |
| --- | --- | --- | --- |
| `tmustier/pi-extensions/usage-extension` | Not cloned in this pass | Worth looking into | Per-provider/model usage views. |
| `marckrenn/pi-sub` | Not cloned in this pass | Worth looking into | Core/client split for status widgets. |
| `nicobailon/pi-powerline-footer` | Not cloned in this pass | Worth looking into | Footer/status bar model, token intelligence. |
| `mrexodia/agent-cost-dashboard` | Not cloned in this pass | Worth looking into | Cross-session cost dashboard. |
| `pi-context-usage` | Not cloned in this pass | Worth looking into | Context size breakdown paired with pruning. |
| `pi-cache-graph` | Not cloned in this pass | Worth looking into | Prompt-cache hit/miss visibility. |

## What To Look Into Next

Priority 1:

- `@tintinweb/pi-subagents` or `nicobailon/pi-subagents`, depending on which protocol is easiest to pair with `pi-tasks`.
- `toolwatch`, because scheduled prompts and workers need audit/approval before they get write/bash permissions.
- `pi-context-prune`, because the lab's north star is token bloat reduction and this repo is current, small, and directly on-topic.

Priority 2:

- `pi-context-usage` and `pi-cache-graph` as measurement companions for pruning.
- `codemap` for scout-agent codebase summaries.
- `rhubarb-pi/safe-git` and `michalvavra/agents/security` for hard safety rules.

Priority 3:

- `task-factory` queue internals if the simple `pi-tasks` registry starts to need a durable external runner.
- `llm-wiki-plugin` and `Understand-Anything` when `.siso-wiki` becomes a concrete milestone.

## Install Policy

No global installs for these references yet.

Use this order:

1. Clone under `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/`.
2. Inspect package manifest, extension entrypoints, and lifecycle hooks.
3. Run static checks only.
4. Load in an isolated Pi profile or one-shot `pi -e` session.
5. Measure Bifrost prompt tokens, tool chars, total tokens, and behavior.
6. Promote only after the module has a clear rollback and disable path.

## Research Reports

Primary inbox reports:

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-awesome-pi-agent-extensions.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-repo-batch-synthesis.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-pi-mono-source-patterns.md`
