# SISO Agent Base Agent Notes

Use this repository as the canonical SISO Agent Base source tree.

## Fast Start

- Read `README.md` for install/runtime basics.
- Prefer `rg`/`rg --files` for discovery.
- Do not assume optional directories such as `.siso-wiki`, `.claude/feedback`, `src`, `lib`, `apps`, `packages`, or `tools` exist; check first.
- For SISO/Pi runtime work, run the smallest relevant smoke before broad validation.

## Common Commands

```bash
npm run errors:status
npm run errors:batch
npm run smoke:error-queue
npm run smoke:agent-prompts
npm run smoke:subagent-stack
npm run smoke:agent-scorecards
npm run smoke:supervisor-persistence
npm run smoke:extension-adapter-contract
npm run benchmark:subagent-stack
npm run audit:subagent-architecture
npm run smoke:all
siso doctor
```

## Subagent Extension Stack

- Read `docs/strategy/subagent-extension-workspace.md` before changing subagent routing, scheduling, mailbox/feed delivery, project markdown agents, ACLs, or supervisor logic.
- Use the `siso-subagent-stack` skill when using or improving SISO subagents.
- Use `siso_task_schedule` or `/tasks` for durable task graph operations.
- Use `siso_mailbox` for parent-session delivery/read/ack/feed workflows.
- Use `siso_project_agents` before selecting trusted markdown project/user agents.
- Use `siso_supervisor` before retry/deadletter/orphan-cleanup decisions.
- Use `siso_agent_scorecards` before promoting an agent route, prompt, or extension-backed specialist.
- Use `siso_extension_adapter` before promoting a Pi package or repo into runtime adapter status.
- Keep third-party Pi packages as references/adapters unless the audit docs explicitly approve a narrower integration.

## Current Router Files

- `extensions/siso-agent-router/index.js` is the main router entrypoint.
- `extensions/siso-agent-router/spawn-layer.js` owns child/subagent lifecycle.
- `extensions/siso-agent-router/task-registry.js` owns scoped task records.
- `extensions/siso-agent-router/tooling-actions.js` owns repo/check/tooling actions.
- `extensions/siso-agent-router/session-store.js` owns session-scoped agent state.
- `extensions/siso-agent-router/task-scheduler.js` owns pure task graph scheduling.
- `extensions/siso-agent-router/mailbox-feed.js` owns mailbox state and append-only feeds.
- `extensions/siso-agent-router/project-agent-registry.js` owns trusted markdown agents and tool ACL parsing.
- `extensions/siso-agent-router/subagent-supervisor.js` owns heartbeat, retry/deadletter, and process identity helpers.
- `extensions/siso-agent-router/agent-scorecards.js` owns persisted agent eval scorecards.
- `extensions/siso-agent-router/extension-adapter.js` owns the extension adapter contract.
