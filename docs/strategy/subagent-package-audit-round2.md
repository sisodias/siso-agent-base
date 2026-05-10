# Subagent Package Audit Round 2

Date: 2026-05-10

Two cheap read-only audit agents reviewed the highest-value subagent/team packages.

## Packages Audited

| Package | Read | Recommendation |
|---|---|---|
| `@x1any/pi-swarm` | small subagent runtime, markdown agents, tool ACLs, chain/parallel | Copy agent config/trust prompt/tool ACL ideas. |
| `@0xkobold/pi-orchestration` | typed orchestration modes, depth, worktree/fork concepts | Copy vocabulary; do not depend on runtime. |
| `taskplane` | full batch orchestration product with DAG, mailboxes, quality gates, dashboard | Treat as future SISO batch-orchestrator reference. |
| `@spences10/pi-team-mode` | team tool, RPC teammates, mailbox read/ack, task deps, worktree guards | Copy team grammar, mailbox semantics, dependency validation. |
| `pi-crew` | scheduler/runtime with DAG, heartbeats, deadletter, mailbox, worktrees | Copy supervisor/task-graph patterns; do not install as core runtime. |
| `@melihmucuk/pi-crew` | lightweight interactive subagents, owner-session delivery, respond/done | Copy interactive child lifecycle ideas. |
| `pi-messenger-swarm` | durable channel JSONL, task event feed, swarm protocol | Copy append-only channel/feed projection. |

## First-Principles Impact

The best design is not “install a better subagent package.” The best design is:

```text
SISO core owns routing, permissions, lifecycle, task graph, and records.
External packages provide patterns or optional isolated adapters.
```

## Features To Add To SISO

1. **Scoped mailbox**
   - message states: `queued`, `delivered`, `read`, `acknowledged`
   - message kinds: `message`, `steer`, `follow_up`, `response`, `supervisor_notice`
   - stored under SISO task/session roots

2. **Task graph**
   - fields: `stepId`, `dependsOn`, `children`, `queue`
   - operations: `claim_next`, `fail_and_block_children`, `cancel_subtree`, `resume_failed`

3. **Supervisor layer**
   - heartbeat state: `healthy`, `warn`, `stale`, `dead`
   - deadletter JSONL
   - retry traces
   - completion mutation guard

4. **Interactive child controls**
   - `respond`
   - `done`
   - owner-session checks
   - queued result delivery when parent session is inactive

5. **Channel/feed projection**
   - `#session`
   - `#memory`
   - `#task/<id>`
   - append-only JSONL with replay

6. **Trusted project agents**
   - markdown agent definitions
   - frontmatter for `model`, `thinkingLevel`, `tools`
   - project-local trust prompt before enabling `.pi/agents` or SISO equivalent

7. **Tool ACL grammar**
   - support simple declarations like `all, !write, !edit`
   - enforce in SISO router/spawn layer, not just prompt instructions

## Integration Policy

- Copy from `@x1any/pi-swarm`: markdown agent config, tool ACLs, project trust prompt.
- Copy from `@spences10/pi-team-mode`: team grammar, mailbox read/ack, dependency validation, orphan PID checks.
- Copy from `pi-crew`: DAG scheduler, heartbeat/deadletter, quality gate.
- Copy from `@melihmucuk/pi-crew`: interactive child `respond/done` and owner-session delivery.
- Copy from `pi-messenger-swarm`: durable channel/feed projection.
- Copy from `taskplane`: batch architecture, process registry, quality gates, dashboard concepts.

Do not activate these packages as global runtimes yet. They overlap with SISO-owned orchestration and would fragment source of truth.

## Mini-Agent Round 3 Deltas

Four cheap parallel agents re-checked the same package family against SISO's current router, task records, status surface, and catalog. They did not overturn the policy above, but they found sharper contracts SISO should copy.

### Mailboxes, Feeds, And Session Ownership

Keep these as separate lanes:

| Pattern | Source | SISO Copy |
|---|---|---|
| Lead-owned team mailbox | `@spences10/pi-team-mode` | Lead session owns spawn; teammates cannot spawn nested teams; messages track `delivered_at`, `read_at`, and `acknowledged_at`; unacknowledged deliveries are cleared on attach for redelivery. |
| Durable mailbox/result delivery | `pi-crew` | Per-run/per-task mailbox files; statuses are `queued`, `delivered`, `acknowledged`; replay pending messages after restart; reject foreign-session replies. |
| Live interactive follow-up | `@melihmucuk/pi-crew` | `respond` only works while a child is waiting; `done` and `respond` are owner-session scoped; result delivery queues until the owning session is active. |
| Channel feed | `pi-messenger-swarm` | Named append-only feeds such as `#session`, `#task/<id>`, and `#handoff`; channel posts are not the same thing as mailbox acknowledgements. |

SISO should not flatten these into one generic `read/ack` API. Delivery, read, acknowledgement, redelivery, channel replay, and owner-session routing are different contracts.

### Task Graph And Runtime Control

The earlier audit said "task graph", but the missing primitive is more specific: SISO needs a durable scheduler boundary.

- `claim_next`: pick ready work from dependency state, not from child process state.
- `wave`: start all currently ready tasks up to concurrency limits.
- `retry_state`: track attempts, retry reason, retry schedule, and terminal deadletter state.
- `fail_and_block_children`: propagate failed blockers through the graph.
- `resume_failed`: allow a parent to retry a failed subtree without recreating the whole run.

Child-agent queue/cancel is a runtime concern. Task readiness, dependency blocking, retries, and deadletters should live in task graph state.

### Project Agents And Tool ACLs

`@x1any/pi-swarm` exposed a customization gap:

- project/user markdown agent definitions should be loadable from a trusted registry, not hardcoded only in `profile-registry.js`;
- local project agents need an opt-in trust prompt before activation;
- tool ACLs need a real grammar such as `all, !write, !edit`, not only profile-level prompt guidance;
- normalized ACL policy should be stored on child records and enforced by the spawn layer.

### Process, Heartbeat, Worktree, And Dashboard

The control plane still needs explicit durable objects:

- `heartbeatAt`, `attempt`, `retryState`, and `deadletterAt` on task/session records.
- a process registry with PID plus start identity or command/session fingerprint before orphan cleanup kills anything.
- structured worktree policy: branch validation, dirty preservation, diff preview, and merge gate.
- dashboard panels for heartbeat age, orphan count, deadletters, retry attempts, merge status, and worktree state.

## Updated Build Order

1. Workflow recipes - done.
2. Task graph scheduler - `claim_next`, waves, blocked children, retry/deadletter state.
3. Scoped mailbox/feed layer - split delivery/read/ack/redelivery from channel replay.
4. Project agent registry/tool ACLs - trusted markdown agents plus enforceable tool grammar.
5. Durable process supervisor - heartbeat, process identity, orphan cleanup, retry telemetry.
6. Worktree policy object - branch guard, diff preview, merge gate.
7. Subagent doctor/completion guard - expose the above as diagnostics and safety checks.
