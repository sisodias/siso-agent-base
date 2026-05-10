# SISO Subagent First-Principles Design

Date: 2026-05-10

Related audit: [subagent-package-audit-round2.md](subagent-package-audit-round2.md)

## Thesis

SISO subagents should be a controlled distributed execution system, not autonomous chaos.

The parent session owns intent, routing, permissions, task graph, budgets, and final judgment. Child agents receive bounded contracts, isolated context, narrow tools, and explicit output expectations.

## Core Design

```text
Human request
  -> parent orchestrator
    -> route/profile selection
    -> task graph / workflow recipe
    -> child contracts
    -> child execution
    -> durable records + artifacts
    -> parent synthesis / final decision
```

## Non-Negotiables

- Parent owns orchestration.
- Children do not spawn children by default.
- Every child has a task record.
- Every child has a profile, model, permission ceiling, and context tier.
- Every child output is summarized before it enters parent context.
- Large outputs go to files and return compact references.
- Third-party extension runtimes never own SISO routing or permissions.
- Parallel writers need isolation or explicit non-overlap.

## Runtime Layers

| Layer | Owner | Purpose |
|---|---|---|
| Router | SISO | Pick profile/model/context/tools. |
| Workflow graph | SISO | Fan-out, chain, recipes, dependencies, concurrency. |
| Task registry | SISO | Durable parent/child records, status, handoff artifacts. |
| Task scheduler | SISO | Claim ready work, promote blocked work, retry failed work, deadletter terminal work. |
| Mailbox/feed layer | SISO | Deliver owner-scoped messages, replay pending results, expose channel feeds without confusing them with acknowledgements. |
| Supervisor | SISO | Heartbeats, process identity, orphan cleanup, retry telemetry. |
| Execution adapter | SISO | Native Pi subagent bridge or SISO legacy child process. |
| Extension store | SISO | Fetch/audit/activate package code without startup bloat. |
| Recipes | SISO | Repeatable orchestration patterns for agents and users. |

## Added From pi-subagents

SISO now has:

- explicit `tasks[]`
- explicit `chain[]`
- `{task}` and `{previous}` handoffs
- chain parallel stages
- task `count`
- bounded `concurrency`
- file-only output references
- named workflow recipes:
  - `parallel-review`
  - `parallel-research`
  - `context-build`
  - `handoff-plan`
  - `cleanup-review`

## Recommended Agent Roles

Keep the role set small:

- `scout`: read-only local/context discovery.
- `planner`: implementation plan or synthesis.
- `worker`: one bounded implementation slice.
- `reviewer`: fresh-context critique.
- `verifier`: tests/checks/reproduction.
- `oracle`: expensive escalation only.

Do not add many role names until there is a durable behavior difference.

## What To Add Next

1. Task graph scheduler:
   - `claim_next` for dependency-ready work
   - wave execution up to concurrency limits
   - `fail_and_block_children`
   - `resume_failed`
   - retry and deadletter state

2. Scoped mailbox/feed layer:
   - split `delivered`, `read`, `acknowledged`, and `redelivered`
   - owner-session checks for `respond` and `done`
   - waiting-state gate for live child follow-up
   - append-only `#session`, `#task/<id>`, and `#handoff` feeds

3. Project agent registry and tool ACLs:
   - trusted markdown agent definitions
   - project-local opt-in trust prompt
   - ACL grammar such as `all, !write, !edit`
   - normalized ACL stored on each child record and enforced by the spawn layer

4. Supervisor/process control:
   - durable `heartbeatAt`, `attempt`, `retryState`, and `deadletterAt`
   - process registry with PID plus start identity or command/session fingerprint
   - orphan cleanup refuses ambiguous matches

5. Worktree policy and merge gate:
   - explicit branch validation
   - dirty-worktree preservation
   - diff preview on completion
   - merge gate before parent accepts writer output

6. Subagent doctor and completion guard:
   - diagnose child-run dirs, task scope, native bridge state, extension registry state, profile/tool-pack state
   - implementation children must edit files or explain why no edit was valid
   - parent flags plan-only worker outputs

## Extension Policy

Subagent-related Pi packages are high overlap. Treat them as references first:

- direct adapter only for narrow tools
- fork for strategic runtime pieces
- copy-pattern for broad orchestration packages
- never global-activate a package that owns routing, permissions, child lifecycle, or session state

## Golden Path

For non-trivial feature work:

```text
context-build -> planner -> worker -> parallel-review -> worker fixes -> verifier
```

For risky external package adoption:

```text
parallel-research -> handoff-plan -> worker adapter/fork -> parallel-review -> verifier
```

For cleanup:

```text
cleanup-review -> worker fixes -> verifier
```
