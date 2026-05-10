# Persistent Agent MVP Build Plan

Date: 2026-05-10
Status: build plan for current SISO infrastructure

## Goal

Build an MVP persistent-agent runtime using the current SISO infrastructure.

The MVP should let Shaan create a small number of mostly stateless agents that have durable goals, memory, ownership boundaries, changelogs, and observable activity. Then we use those agents to improve the system itself.

The key principle:

```txt
Agents can be stateless at runtime, but persistent in identity, goals, memory, logs, and controlled workspace.
```

## MVP User Story

Shaan can define an agent like:

```txt
name: persistent-agent-system-improver
purpose: improve the persistent executive agent system
controlled paths:
  - .siso/executive/
  - docs/strategy/persistent-agent-mvp-build-plan.md
cadence: manual for MVP
permissions: ask before broad changes
```

Then he can make it live, inspect it, and see:

- what it worked on
- what changed
- what it learned
- how its goals evolved
- what files/code it controls
- how much token budget it used
- what it recommends next

## MVP Architecture

```txt
.siso/agents/
  registry.md
  <agent-id>/
    agent.md
    goals.md
    memory.md
    changelog.md
    worklog.md
    controlled-paths.md
    metrics.md
    inbox/
    outbox/
    runs/
      <timestamp>.md
```

### Runtime model

Agents do not need to stay alive as processes for MVP.

Instead:

```txt
agent definition + durable memory + current task
  -> spawn/run stateless agent
  -> agent reads its files
  -> agent works
  -> agent writes run report, memory updates, changelog, metrics
  -> agent stops
```

This is simpler than true daemon-style persistence and fits current infrastructure.

## Agent State Schema

### `agent.md`

Identity and contract.

Fields:

- id
- name
- purpose
- status: draft | live | paused | retired
- owner
- created
- autonomy level
- approval rules

### `goals.md`

Persistent goals and objectives.

Should show history, not just current state.

Fields:

- current goals
- success criteria
- goal history
- changes with timestamps and reasons

### `memory.md`

Agent's personal memory bank.

Should contain:

- stable facts
- lessons learned
- preferences
- recurring mistakes to avoid
- project-specific context

Agents may propose or apply memory updates depending on permission level.

### `controlled-paths.md`

What code/files the agent is expected to own or care about.

Should distinguish:

- read paths
- write paths
- ask-first paths
- forbidden/no-touch paths

### `worklog.md`

Human-readable history of work.

Every run appends:

- date/time
- objective
- actions taken
- files read/changed
- commands run
- result
- open issues

### `changelog.md`

User-visible changes caused by the agent.

Not every thought. Only meaningful changes.

### `metrics.md`

Operational metrics.

For MVP, start with manually/approximately captured metrics:

- runs
- estimated tokens in
- estimated tokens out
- total estimated tokens
- tasks completed
- files changed
- last run

Later this can integrate with provider/router telemetry if available.

### `inbox/` and `outbox/`

Inbox:

- assigned tasks
- user messages
- executive instructions

Outbox:

- reports
- proposals
- requests for approval
- handoffs to other agents

## MVP Agent/Team To Create First

### 1. `persistent-agent-system-improver`

Purpose:
Design and improve the persistent executive/persistent-agent system.

Controlled paths:

- `.siso/executive/`
- `.siso/agents/`
- `docs/strategy/persistent-executive-agent-mvp-roadmap.md`
- `docs/strategy/persistent-agent-mvp-build-plan.md`

Initial goals:

- keep the architecture simple
- define the persistent-agent schema
- run reviews
- recommend next implementation steps

### 2. `persistent-agent-system-improver`

Purpose:
Implement SISO-native skills/commands/templates for persistent agents.

Controlled paths:

- future SISO profile skills
- `.siso/agents/`
- implementation docs

Initial goals:

- create reusable templates
- create manual run workflow
- later integrate with `siso` commands

### 3. `research-ingestion-agent` / later

Purpose:
Solve reliable transcript/source ingestion.

Status:
Not needed for first MVP. Park until the persistent-agent loop works.

## MVP Workflows

### Create agent

```txt
1. Create `.siso/agents/<agent-id>/`.
2. Fill identity, goals, memory, controlled paths, metrics.
3. Add to `.siso/agents/registry.md`.
4. Mark status live when ready.
```

### Run agent manually

```txt
1. Read agent files.
2. Read assigned task/inbox item.
3. Work using current SISO tools/child agents.
4. Append run report.
5. Update worklog/changelog/memory/metrics.
6. Produce next recommendation.
```

### Inspect agent

Show:

- status
- current goals
- last run
- recent worklog
- memory summary
- controlled paths
- token metrics
- open proposals

### Agent self-improvement

An agent may update its own memory and propose changes to goals/objectives.

Rules:

- memory updates are allowed if factual and scoped
- goal changes should record reason/history
- broad autonomy or controlled-path expansion requires Shaan approval
- code changes must follow current SISO safety/verification norms

## Implementation Phases

### Phase 1 — File-backed persistent agents

Deliverables:

- `.siso/agents/` registry and schema
- first live agent: `persistent-agent-system-improver`
- second draft/live agent: `persistent-agent-system-improver`
- manual run and inspect workflows
- metrics file with approximate token counters

### Phase 2 — SISO profile skills

Create skills:

- `persistent-agent-create`
- `persistent-agent-run`
- `persistent-agent-inspect`
- `persistent-agent-review`

### Phase 3 — Native command integration

Only after workflows prove useful, add commands like:

```txt
siso agent list
siso agent inspect <id>
siso agent run <id>
siso agent worklog <id>
```

### Phase 4 — Telemetry integration

Integrate actual token usage from SISO/router/provider logs if available.

### Phase 5 — Self-improvement loop

Let `persistent-agent-system-improver` propose and implement small improvements to their own schema/workflows under review.

## Immediate Build Tasks

- [ ] Create `.siso/agents/` skeleton.
- [ ] Create `persistent-agent-system-improver` agent.
- [ ] Create `persistent-agent-system-improver` agent.
- [ ] Add registry.
- [ ] Add manual run workflow.
- [ ] Add inspect workflow.
- [ ] Run first `persistent-agent-system-improver` review of this MVP.

## Non-Goals For MVP

- Always-on background daemons.
- Full autonomous scheduling.
- Complex database.
- Complex web UI.
- Perfect token accounting.
- Large multi-agent society.

## Success Criteria

The MVP works if Shaan can ask:

```txt
Show me my persistent agents.
What did persistent-agent-system-improver do last?
What memory did it update?
What code does persistent-agent-system-improver control?
How have their goals changed?
How many estimated tokens have they used?
What should they do next?
```

And SISO can answer from durable files.
