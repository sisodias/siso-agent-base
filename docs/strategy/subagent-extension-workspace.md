# SISO Subagent Extension Workspace

Date: 2026-05-10

This is the working area for SISO subagent extensions, package research, and runtime improvements.

## Purpose

SISO owns the subagent control plane:

- routing and profile decisions
- task graph scheduling
- child lifecycle records
- mailbox/feed delivery
- project/user markdown agent trust
- tool ACL enforcement
- supervisor health and retry/deadletter policy

Pi packages are references or optional adapters. They should not own global SISO routing, permissions, task records, or session state.

## Main Files

| Area | Files |
|---|---|
| Package catalog | `data/extensions/extension-catalog.json`, `docs/extensions-catalog.md` |
| Package map | `docs/strategy/subagent-extension-package-map.md`, `docs/strategy/subagent-extension-candidates.md` |
| Architecture audit | `docs/strategy/subagent-extension-architecture-audit.md` |
| Improve log | `docs/strategy/subagent-improve-log.md` |
| First-principles design | `docs/strategy/siso-subagent-first-principles.md` |
| Package audit | `docs/strategy/subagent-package-audit-round2.md` |
| Task scheduler | `extensions/siso-agent-router/task-scheduler.js`, `extensions/siso-agent-router/task-store.js` |
| Mailbox/feed | `extensions/siso-agent-router/mailbox-feed.js`, `extensions/siso-agent-router/notifications.js` |
| Project agents/ACL | `extensions/siso-agent-router/project-agent-registry.js` |
| Supervisor | `extensions/siso-agent-router/subagent-supervisor.js` |
| Agent scorecards | `extensions/siso-agent-router/agent-scorecards.js` |
| Extension adapter contract | `extensions/siso-agent-router/extension-adapter.js` |

## Runtime Tools

Use these from SISO agents:

```text
siso_task_schedule
siso_mailbox
siso_project_agents
siso_supervisor
siso_agent_scorecards
siso_extension_adapter
siso_extension_catalog
```

Use these slash commands:

```text
/tasks
/tasks claim
/tasks wave 3
/tasks fail <task-id>
/tasks resume <task-id>
/agents report
```

## Task Scheduler

The scheduler has two layers:

- pure functions in `task-scheduler.js`
- persistent store wrappers in `task-store.js`

Supported scheduler operations:

```text
claim-next
wave
fail
resume
```

Agents should create durable tasks before dispatching multiple workers, then use `siso_task_schedule` or `/tasks` to claim work.

## Mailbox And Feeds

Mailbox records are owner-session scoped. They model delivery state:

```text
queued -> delivered -> read -> acknowledged
```

Feeds are append-only replay logs. They are not acknowledgements.

Common channels:

```text
#task/<child-id>
#session/<parent-session-id>
#handoff
```

Use `siso_mailbox`:

```json
{"op":"list"}
{"op":"read","id":"child-id"}
{"op":"ack","id":"child-id"}
{"op":"feed","channel":"#task/child-id"}
```

`/agents report` also includes a mailbox summary:

```text
Mailbox: <delivered> delivered · <read> read · <acknowledged> acknowledged · <unacked> unacked
```

## Project Agents And ACLs

Trusted markdown agents live in:

```text
.siso/agents
.claude/agents
.pi/agents
~/.siso/agents
~/.claude/agents
~/.pi/agents
```

Project-local agent roots are ignored unless they contain:

```text
.siso-agent-trusted
```

Example:

```md
---
name: readonly-reviewer
model: gpt-5.4-mini
thinkingLevel: low
tools: all, !write, !edit
cost_tier: cheap
memory: project
background: true
max_turns: 8
write_scope:
  - docs/**
extension_dependencies:
  - pi-subagents
evals:
  - subagent-regression-v1
---

Review code and report risks without editing files.
```

ACL grammar:

```text
all, !write, !edit
read, bash, !write
```

Deny wins. `siso_spawn` can select a trusted markdown agent with:

```json
{
  "task": "Review auth risks",
  "agent": "readonly-reviewer"
}
```

Collision rule:

```text
trusted project agent > user agent with the same name
```

Collisions are reported by `siso_project_agents` so agents can see which definition was shadowed.

## Supervisor

Supervisor helpers classify active child records as:

```text
healthy
warn
stale
dead
```

`/agents report` includes a supervisor line with watched process count and fingerprint count.

Action helpers exist for:

- deadletter record creation
- retry backoff state
- orphan cleanup identity checks

Use `siso_supervisor`:

```json
{"op":"health","records":[...]}
{"op":"retry","record":{...},"policy":{"maxAttempts":3}}
{"op":"deadletter","record":{...},"reason":"heartbeat dead"}
{"op":"persist","kind":"deadletters","record":{...}}
{"op":"list","kind":"deadletters"}
{"op":"cleanup-check","record":{...},"observed":{...}}
```

These helpers are intentionally conservative. Orphan cleanup must refuse ambiguous PID/process identity matches.

Persisted supervisor state lives under:

```text
.siso/supervisor/active.jsonl
.siso/supervisor/retries.jsonl
.siso/supervisor/deadletters.jsonl
.siso/supervisor/orphans.jsonl
```

## Agent Scorecards

Use `siso_agent_scorecards` after benchmark or dogfood runs:

```json
{
  "op": "record",
  "agent": "code-reviewer",
  "version": "1.1.0",
  "taskSet": "subagent-regression-v1",
  "runs": 20,
  "trueFindings": 31,
  "falsePositives": 6,
  "missedBugs": 4,
  "avgCostUsd": 0.08,
  "avgLatencySeconds": 94
}
```

Scorecards persist under:

```text
.siso/evals/results/<agent>@<version>/<task-set>.json
```

Use scorecards to route by measured performance rather than static preference.

## Extension Adapter Contract

Pi packages and external repos must cross a narrow adapter boundary before runtime use. A candidate adapter declares:

```json
{
  "id": "browser-use",
  "name": "Browser Use Adapter",
  "risk": "medium",
  "capabilities": ["browser-automation"],
  "hasRun": true
}
```

Use `siso_extension_adapter` to validate manifests. Keep package code outside SISO core unless the adapter benchmark and audit justify promotion.

## Package Candidates

The current package map tracks:

- `pi-subagents`
- `pi-crew`
- `@spences10/pi-team-mode`
- `@melihmucuk/pi-crew`
- `pi-messenger-swarm`
- `taskplane`
- `@0xkobold/pi-orchestration`
- `@x1any/pi-swarm`
- `@tintinweb/pi-subagents`
- `@e9n/pi-subagent`
- `pi-agent-router`
- `pi-task-subagents`

Default policy:

```text
reference first -> copy pattern -> fork only if strategic -> install only when isolated and low-risk
```

## Verification

Run the focused stack checks:

```bash
npm run smoke:task-scheduler
npm run smoke:task-store-scheduler
npm run smoke:tasks-command
npm run smoke:mailbox-feed
npm run smoke:mailbox-tool
npm run smoke:child-notifications
npm run smoke:project-agent-registry
npm run smoke:project-agent-routing
npm run smoke:supervisor-tool
npm run smoke:supervisor-persistence
npm run smoke:agent-scorecards
npm run smoke:agent-scorecards-tool
npm run smoke:extension-adapter-contract
npm run smoke:agents-command
npm run smoke:subagent-stack
npm run benchmark:subagent-stack
npm run audit:subagent-architecture
```

Update `docs/strategy/subagent-improve-log.md` by running:

```bash
npm run benchmark:subagent-stack
```
