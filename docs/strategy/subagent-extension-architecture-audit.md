# Subagent Extension Architecture Audit

Generated: 2026-05-10T07:47:35.881Z

This audit compares the tracked Pi subagent packages against the now-wired SISO subagent layers.

## Current SISO Layers

- Task graph: `task-scheduler.js`, `task-store.js`, `siso_task_schedule`, `/tasks`.
- Mailbox/feed: `mailbox-feed.js`, `notifications.js`, `siso_mailbox`, `/agents report` mailbox summary.
- Project agents/ACL: `project-agent-registry.js`, `siso_project_agents`, `siso_spawn agent=...`.
- Supervisor: `subagent-supervisor.js`, `siso_supervisor`, `/agents report` supervisor summary.
- Package workspace: `subagent-extension-workspace.md`, `subagent-improve-log.md`, `subagent-extension-package-map.md`.

## Package Fit

| Package | SISO Layer | Classification | Next Action | Useful Pattern |
|---|---|---|---|---|
| [pi-subagents](https://pi.dev/packages/pi-subagents) | task scheduler / supervisor / mailbox | reference / copy-pattern / high | keep as copy-pattern reference; do not install as runtime | workflow recipes, parallel/chain ergonomics, result handoff patterns |
| [pi-crew](https://pi.dev/packages/pi-crew) | task scheduler / supervisor / mailbox | reference / copy-pattern / high | keep as copy-pattern reference; do not install as runtime | task graph, heartbeat, mailbox, retry/deadletter references |
| [@spences10/pi-team-mode](https://pi.dev/packages/@spences10/pi-team-mode) | task scheduler / supervisor / mailbox | candidate / install-check / medium | test in isolated extension store before any activation | lead-owned mailbox, read/ack semantics, team grammar, orphan identity checks |
| [@melihmucuk/pi-crew](https://pi.dev/packages/@melihmucuk/pi-crew) | mailbox owner-session lifecycle | candidate / audit / high | deep audit before copying narrow patterns | interactive respond/done lifecycle and owner-session delivery |
| [pi-messenger-swarm](https://pi.dev/packages/pi-messenger-swarm) | mailbox-feed channel projection | reference / copy-pattern / high | keep as copy-pattern reference; do not install as runtime | append-only channel feed model and channel grammar |
| [taskplane](https://pi.dev/packages/taskplane) | task scheduler / supervisor / mailbox | reference / copy-pattern / high | keep as copy-pattern reference; do not install as runtime | batch orchestration, DAG waves, quality gates, integration/merge telemetry |
| [@0xkobold/pi-orchestration](https://pi.dev/packages/@0xkobold/pi-orchestration) | workflow context/worktree backlog | candidate / install-check / medium | test in isolated extension store before any activation | context mode vocabulary, worktree/fork semantics |
| [@x1any/pi-swarm](https://pi.dev/packages/@x1any/pi-swarm) | project-agent registry / ACL | candidate / install-check / medium | test in isolated extension store before any activation | markdown agent registry, trust prompt, tool ACL grammar |
| [@tintinweb/pi-subagents](https://pi.dev/packages/@tintinweb/pi-subagents) | project-agent registry / ACL | candidate / audit / high | deep audit before copying narrow patterns | markdown agent definitions and subagent invocation patterns |
| [@e9n/pi-subagent](https://pi.dev/packages/@e9n/pi-subagent) | project-agent registry / ACL | candidate / audit / high | deep audit before copying narrow patterns | small subagent definition and delegation pattern reference |
| [pi-agent-router](https://pi.dev/packages/pi-agent-router) | router policy / ACL backlog | candidate / audit / high | deep audit before copying narrow patterns | router/delegation controls and extension-tool guardrails |
| [pi-task-subagents](https://pi.dev/packages/pi-task-subagents) | workflow context/worktree backlog | candidate / install-check / medium | test in isolated extension store before any activation | task-oriented retained-session and retry vocabulary |

## Rule

External packages remain references unless they provide a narrow, isolated adapter. SISO core owns routing, task graph, lifecycle, permissions, mailbox state, and supervisor records.
