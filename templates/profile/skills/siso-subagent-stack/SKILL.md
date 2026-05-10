---
name: siso-subagent-stack
description: Use when working with SISO subagents, task scheduling, mailbox/feed delivery, project markdown agents, tool ACLs, supervisor health, or Pi subagent package extension research.
---

# SISO Subagent Stack

Use this skill when you need to use, debug, or improve SISO subagents.

## Start Here

Read:

```text
docs/strategy/subagent-extension-workspace.md
docs/strategy/subagent-improve-log.md
docs/strategy/subagent-extension-package-map.md
```

## Use The Stack

For durable task scheduling:

```text
siso_task_schedule
/tasks
/tasks claim
/tasks wave 3
/tasks fail <task-id>
/tasks resume <task-id>
```

For mailbox and feeds:

```text
siso_mailbox
```

Common mailbox calls:

```json
{"op":"list"}
{"op":"read","id":"child-id"}
{"op":"ack","id":"child-id"}
{"op":"feed","channel":"#task/child-id"}
```

For trusted project/user markdown agents:

```text
siso_project_agents
```

Spawn with a trusted project agent:

```json
{
  "task": "Review auth risks",
  "agent": "readonly-reviewer"
}
```

For supervisor health and recovery decisions:

```text
siso_supervisor
```

Common supervisor calls:

```json
{"op":"health","records":[...]}
{"op":"retry","record":{...},"policy":{"maxAttempts":3}}
{"op":"deadletter","record":{...},"reason":"heartbeat dead"}
{"op":"persist","kind":"deadletters","record":{...}}
{"op":"list","kind":"deadletters"}
{"op":"cleanup-check","record":{...},"observed":{...}}
```

For measured agent promotion/routing:

```text
siso_agent_scorecards
```

Common scorecard calls:

```json
{"op":"list"}
{"op":"summary"}
{"op":"record","agent":"code-reviewer","version":"1.1.0","taskSet":"subagent-regression-v1","runs":20,"trueFindings":31,"falsePositives":6,"missedBugs":4,"avgCostUsd":0.08,"avgLatencySeconds":94}
```

For package/runtime adapter validation:

```text
siso_extension_adapter
```

Example adapter manifest:

```json
{"adapter":{"id":"browser-use","name":"Browser Use Adapter","risk":"medium","capabilities":["browser-automation"],"hasRun":true}}
```

## Improve The Stack

Keep layers separate:

- `task-scheduler.js`: pure task graph logic
- `task-store.js`: persistent task graph operations
- `mailbox-feed.js`: mailbox state and append-only feeds
- `notifications.js`: parent delivery write-through
- `project-agent-registry.js`: markdown agents and ACL parsing
- `subagent-supervisor.js`: heartbeat, deadletter, retry, orphan identity helpers
- `agent-scorecards.js`: persisted agent eval scorecards
- `extension-adapter.js`: package adapter manifest validation

Do not let third-party packages own SISO routing, permissions, session state, or task records.

## Verify Changes

Run focused checks:

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

When adding a subagent improvement, update the improve log by running:

```bash
npm run benchmark:subagent-stack
```
