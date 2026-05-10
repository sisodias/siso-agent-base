# Subagent Extension Opportunities

Date: 2026-05-10

## What Was Added To SISO

SISO now has a native structured workflow surface inspired by `pi-subagents`, without loading the `pi-subagents` runtime:

- `tasks[]` for top-level parallel workflow tasks.
- `chain[]` for sequential workflow stages.
- `{task}` and `{previous}` template substitution.
- `{ parallel: [...] }` chain stages.
- `count` expansion for repeated parallel task copies.
- `concurrency` limits for structured parallel stages.
- per-task `agent` routing through SISO profiles and Bifrost model policy.
- per-task `output` and `outputMode: "file-only"` for compact handoff references.
- durable SISO task records for parent, stages, and workers.
- named recipes: `parallel-review`, `parallel-research`, `context-build`, `handoff-plan`, and `cleanup-review`.

See also: [siso-subagent-first-principles.md](siso-subagent-first-principles.md).

## Still Missing From pi-subagents

These are worth porting or adapting next:

| Idea | SISO decision |
|---|---|
| Worktree isolation for parallel writers | Port, but adapt for dirty worktrees and approval gates. |
| Saved `.chain.md` workflows | Port as SISO workflow recipes, not Pi slash-command runtime. |
| Clarify-before-run TUI | Copy pattern into SISO ask-user/interview flow. |
| Subagent doctor | Port as SISO diagnostics for child dirs, task scope, bridge availability, and extension registry. |
| Live intercom follow-up | Review carefully; SISO may prefer process-based resume unless live channels are reliable. |
| Completion guard | Port. Detect implementation children that return plans without edits. |
| Review/research/context-build recipes | Port as first-class SISO workflow templates. |

## Catalog Search Results

The full Pi catalog has several subagent-adjacent packages worth auditing after `pi-subagents`:

| Package | Why It Matters | First Decision |
|---|---|---|
| `pi-messenger-swarm` | Swarm-first multi-agent messaging and task orchestration. | Audit for messaging patterns; likely copy/fork. |
| `@spences10/pi-team-mode` | Local orchestrator/team mode with RPC teammates, tasks, and mailboxes. | Audit for mailbox/team-mode ideas. |
| `@tmustier/pi-ralph-wiggum` | Long-running agent loops for iterative development. | Audit for loop control and safety gates. |
| `@ifi/pi-plan` | Planning mode with persistent plan files and delegated research tasks. | Copy planning/delegated research patterns. |
| `@juicesharp/rpiv-advisor` | Stronger second-opinion reviewer model before action. | Map to SISO council/oracle route. |
| `@juicesharp/rpiv-todo` | Live durable todo overlay for model tasks. | Copy UI/state ideas into SISO task store/OpenTUI. |
| `pi-btw` / `@juicesharp/rpiv-btw` | Parallel side conversations without polluting main thread. | Consider for SISO side-channel/council UX. |
| `pi-ask-user` / `@juicesharp/rpiv-ask-user-question` | Structured clarification UX. | Port into clarify-before-run workflows. |
| `pi-quests` | Quest-log task discipline. | Compare against SISO task registry. |

## Recommended Audit Order

1. `pi-messenger-swarm`
2. `@spences10/pi-team-mode`
3. `@ifi/pi-plan`
4. `@tmustier/pi-ralph-wiggum`
5. `@juicesharp/rpiv-advisor`
6. `pi-ask-user`
7. `@juicesharp/rpiv-todo`

## Harness Rule

Subagent-related packages are high leverage but high overlap. Treat them as orchestration references first.

Do not activate any package that owns routing, child lifecycles, permissions, or global session state until it has a SISO adapter boundary.
