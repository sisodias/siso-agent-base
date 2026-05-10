# Architecture Sketch

## Goal

Create a Pi-based coding-agent harness that preserves the useful parts of Claude Code and SISO Agent OS while reducing always-loaded context.

## System View

```text
User
  |
  v
pi-codex wrapper
  |
  +-- Pi kernel: compact rules
  +-- Pi skills: lazy SOPs
  +-- Pi extensions: hooks/tools/commands/workers
  |
  v
Bifrost :8080
  |
  +-- Haiku alias -> MiniMax
  +-- Sonnet alias -> Spark
  +-- Opus alias -> GPT-5.5
  |
  v
Provider
```

## Control Plane Mapping

| Claude/SISO piece | Pi target |
| --- | --- |
| `~/.claude/CLAUDE.md` | compact `SYSTEM.md` or `AGENTS.md` |
| `~/.claude/skills` | curated Pi skills path or symlinks |
| `~/.claude/hooks` | Pi extensions |
| `~/.claude/agents` | Pi worker profile markdown |
| `agent_os/hub` registries | generated Pi catalog inputs |
| `.SystemDB/sisosystem.db` | metrics/task/session spine |
| Bifrost shim metrics | bakeoff scoreboard |
| `.claude/feedback` | verifier output loop |

## Design Principle

Claude Code made a lot of power ambient. Pi should make power explicit.

Ambient:

- tiny rules
- tiny tool surface
- tiny skill descriptions

Explicit:

- load skill body
- spawn worker
- enter plan mode
- open browser/search/review capability
- use a task worktree

## First Prototype

`pi-codex` should use an isolated config directory and these pieces:

```text
~/.pi-bifrost/agent/settings.json
~/.pi-bifrost/agent/models.json
~/.pi-bifrost/agent/SYSTEM.md
~/.pi-bifrost/agent/skills/
~/.pi-bifrost/agent/extensions/
~/bin/pi-codex
```

The prototype should not change the real `~/.pi/agent` profile.

## Current Core Slice

The current research-backed slice is documented in:

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/core-plugins-slice.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/design-reference-catalog.md`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/decisions/2026-05-05-core-plugins-backbone.md`

Backbone:

- `planning-with-files` style plan files.
- `pi-tasks` style task registry.
- `pi-supervisor-lite` style outcome checks.

Feature-flag pilots:

- `pi-rewind` for rollback.
- `pi-schedule-prompt` for active-session scheduled prompts.
- `pi-context-prune` for recoverable context pruning after metrics are in place.
- `pi-prompt-suggester` for later command/skill discovery UX.
