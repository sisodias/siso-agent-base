# Multi-Agent Missions Control Plane

Date: 2026-05-07
Status: design proposal / implementation direction
Related incident: `docs/context-hygiene-and-codex-case-packets.md`
Research reference: `~/.siso/agent-base/research/claude-code-like-agents/yasasbanukaofficial-claude-code-notes.md`

## Why this exists

A single `progress.md` does not scale. It is useful as a local breadcrumb, but multiple agents running concurrently need a durable coordination model where agents are disposable and work state survives context resets, crashes, and parallel execution.

First principle:

> Agents are ephemeral executors. Missions, tasks, runs, and artifacts are the durable source of truth.

The project already has three relevant systems:

1. **SystemDB** at `/Users/shaansisodia/SISO_Workspace/.SystemDB/sisosystem.db`
2. **Pi harness JSON task store** at `.pi/tasks/siso-tasks.json`
3. **Mission-style markdown trees** under `~/.siso/agent-base/missions/`
4. **Claude-Code-like research clone** at `~/.siso/agent-base/research/claude-code-like-agents/repos/yasasbanukaofficial-claude-code`

The right future design should combine them, not blindly replace them.

## Existing systems inspected

### 1. SystemDB / SQLite spine

DB path:

```text
/Users/shaansisodia/SISO_Workspace/.SystemDB/sisosystem.db
```

Useful tables already exist:

- `workspaces`
- `projects`
- `missions`
- `goals`
- `tasks`
- `subtasks`
- `task_relationships`
- `task_notes`
- `artifacts`
- `agents`
- `sessions`
- `agent_runs`
- `timeline_events`
- `observability_events`
- `current_state`
- `contexts`

Important schema notes:

```sql
missions(id, project_id, name, description, target_completion_date, status, created_at)

tasks(
  id,
  goal_id,
  parent_task_id,
  blocked_by_task_id,
  assigned_agent_id,
  created_by_agent_id,
  title,
  description,
  status,
  workspace_path,
  executive_summary,
  tokens_burned,
  started_at,
  completed_at,
  created_at,
  updated_at,
  project_id,
  priority,
  due_date,
  time_spent,
  notes,
  urgency_score,
  tags,
  archived_at,
  estimated_minutes,
  cycle_id,
  created_by_user,
  created_by_session,
  source_tool,
  source_todo_id,
  cli_instance_id
)

task_relationships(from_task_id, to_task_id, relationship_type)
artifacts(task_id, artifact_type, file_path)
timeline_events(task_id, agent_id, event_type, message, metadata, timestamp, root_task_id)
agent_runs(trace_id, parent_span_id, session_id, agent_id, model, usage tokens, cost_usd, status, error_type)
```

This is already close to the mission board we want. It has durable IDs, relationships, artifacts, agent runs, and timeline events. Missing pieces are mostly operational polish: leases, role hints, board views, and Pi/SISO-native commands.

### 2. Existing SystemDB skill scripts

Path:

```text
/Users/shaansisodia/SISO_Workspace/.SystemDB/skills/os-database/
```

Useful scripts:

- `scripts/get_my_tasks.py`
- `scripts/create_subtask.py`
- `scripts/update_task.py`
- `scripts/log_event.py`
- `scripts/query_context.py`
- `scripts/init_session.py`

Useful workflows:

- `workflows/boot-sequence.md`
- `workflows/create-subtask.md`
- `workflows/complete-task.md`

These scripts prove the intent already existed: agents should boot, claim/read tasks, create subtasks, log handoffs/events, and complete tasks in DB.

Limitations:

- Assignment is direct `assigned_agent_id`; not enough for dynamic role-based claiming.
- `blocked_by_task_id` is single-edge, though `task_relationships` supports DAG edges.
- No explicit lease/expiry semantics.
- Scripts are Python skill helpers, not integrated into Pi/SISO router tools yet.

### 3. Pi harness JSON task store

File:

```text
packages/siso-agent-router/src/task-store.ts
```

Storage:

```text
.pi/tasks/siso-tasks.json
```

Fields:

- `id`
- `title`
- `description`
- `status`
- `priority`
- `owner`
- `profile`
- `lane`
- `model`
- `blockedBy`
- `metadata`

Strengths:

- Simple.
- Repo-local.
- Already integrated with the `siso task` router surface.
- Good for smoke tests and isolated harness work.

Limitations:

- No true concurrent leasing.
- No first-class mission object.
- No run/artifact/timeline tables.
- JSON writes are okay for small local state, less good for multi-agent coordination.

### 4. Markdown mission folders

Examples:

```text
~/.siso/agent-base/missions/agent-system/MISSION.md
~/.siso/agent-base/missions/skill-system/MISSION.md
~/.siso/agent-base/missions/hook-system/MISSION.md
```

Strengths:

- Human-readable.
- Excellent for role definitions and mission docs.
- Works in git/reviews.

Limitations:

- Not sufficient as the concurrency source of truth.
- Harder to do atomic claims, leases, dependency queries, and dashboards.

### 5. Claude-Code-like research clone

Reference:

```text
~/.siso/agent-base/research/claude-code-like-agents/repos/yasasbanukaofficial-claude-code
~/.siso/agent-base/research/claude-code-like-agents/yasasbanukaofficial-claude-code-notes.md
```

Important caveat: the notes say this repo claims to be sourced from a leaked sourcemap. Treat it as **behavioral research only**. Do not copy implementation wholesale; use clean-room SISO/Pi equivalents.

High-value patterns to incorporate:

#### Task lifecycle is separate from telemetry

Evidence:

- `src/Task.ts`
- `src/tasks/LocalAgentTask/LocalAgentTask.tsx`

Useful model:

```ts
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'
function isTerminalTaskStatus(status) {
  return status === 'completed' || status === 'failed' || status === 'killed'
}
```

Task base state includes:

- stable ID
- type
- status
- description
- start/end time
- output file
- output offset
- notified boolean

SISO implication: mission/task status must not be inferred from token counts, tool counts, stdout activity, or child process liveness. Lifecycle truth is explicit status.

#### Terminal transition first, embellishment second

Evidence:

- `src/tools/AgentTool/agentToolUtils.ts`
- `src/tasks/LocalAgentTask/LocalAgentTask.tsx`

Pattern:

1. Mark completed/failed/killed.
2. Clear abort/cleanup handles.
3. Unblock UI/output state.
4. Then do slower classification, summarization, worktree/git embellishment.
5. Finally enqueue one notification.

SISO implication: when a worker finishes, update `tasks`/`agent_runs` terminal status before optional summarization or artifact classification. Slow post-processing must not leave a finished task looking active.

#### Exactly-once parent notification

Evidence:

- `enqueueAgentNotification(...)` in `src/tasks/LocalAgentTask/LocalAgentTask.tsx`

Pattern:

- Atomic `notified` guard.
- Parent receives a compact XML-ish notification with:
  - task ID
  - output file
  - status
  - summary
  - optional result
  - usage
  - worktree path/branch

SISO implication: every `agent_run`/task attempt needs `notified_at` or equivalent. Parent/orchestrator consumes compact final notification + artifact pointers, not raw session/tool spam.

#### Output file + offset, not hot transcript replay

Evidence:

- `TaskStateBase.outputFile`
- `TaskStateBase.outputOffset`
- local agent task disk bootstrap/stream append comments

SISO implication: raw outputs belong in artifacts/cold files. Hot context and parent notifications should carry summaries and pointers. This matches our Codex case-packet/context hygiene direction.

#### Progress tracker keeps recent activity only

Evidence:

- `createProgressTracker`, `updateProgressFromMessage`, `MAX_RECENT_ACTIVITIES = 5` in `LocalAgentTask.tsx`

Pattern:

- Track tool use count.
- Track latest cumulative input tokens separately from cumulative output tokens.
- Keep only recent activity summaries, not full tool payloads.

SISO implication: status UI and task board should show recent activity summaries and token telemetry, but never use telemetry as lifecycle truth and never replay full tool outputs.

#### Stop task validates running state

Evidence:

- `src/tasks/stopTask.ts`

Pattern:

- `not_found`, `not_running`, `unsupported_type` are distinct errors.
- Only running tasks can be stopped.
- Shell kill notifications can be suppressed as noise.
- Agent kill notifications are preserved because partial result can be useful.

SISO implication: `siso task stop` should distinguish benign not-running from real failure. Killed agent attempts should still write partial handoff/artifact if available.

#### Task tools auto-expand board and run hooks

Evidence:

- `src/tools/TaskCreateTool/TaskCreateTool.ts`
- `src/tools/TaskUpdateTool/TaskUpdateTool.ts`
- `src/tools/TaskGetTool/TaskGetTool.ts`

Patterns:

- Task tools are concurrency-safe.
- Create/update can run hooks.
- Completing a task can be blocked by completion hooks.
- Task update auto-assigns owner when moving to `in_progress`.
- Ownership changes notify the new owner via mailbox.
- Completing all tasks without verification can trigger a verification nudge.

SISO implication: SystemDB-backed `siso task update/complete` should support hooks:

- completion gate / verifier requirement
- changelog gate
- context-hygiene gate
- owner mailbox/notification
- next-task nudge

#### Agent memory has scopes and snapshots

Evidence:

- `src/tools/AgentTool/agentMemory.ts`
- `src/tools/AgentTool/agentMemorySnapshot.ts`

Pattern:

- memory scopes: user, project, local
- local memory can be project-specific and not checked into VCS
- snapshots can initialize or replace local memory
- sync metadata avoids repeated snapshot application

SISO implication: keep three separate memory scopes:

- user/global rules
- project shared mission memory
- local machine/session memory

Missions should link to memory snapshots/case packets, not raw chat.

#### Teammate spawning inherits settings safely

Evidence:

- `src/tools/shared/spawnMultiAgent.ts`

Patterns:

- Spawn config includes name, prompt, team name, cwd, model, agent type, plan mode requirement, invoking request ID.
- Model can inherit from leader but is resolved before launch.
- Permission mode is propagated carefully; plan-mode requirement overrides bypass inheritance.
- Spawn output includes teammate ID, agent ID, model, pane/session metadata, team name.

SISO implication: `agent_runs` should record lineage:

- parent run/request ID
- role/model/lane
- cwd/project/mission/task
- permission profile
- team/workflow identity

Also: never allow unsafe permission inheritance when a task requires plan/read-only mode.

## Control-plane patterns stolen from Claude-Code-like research

Add these to SISO Control Plane v2:

1. `is_terminal_status(status)` helper used everywhere.
2. `notified_at` or `notified` guard for exactly-once parent/task notifications.
3. `output_file` and `output_offset` fields on runs/tasks for cold artifacts.
4. `partial_result` for killed/failed agent runs.
5. `recent_activity_json`, bounded to last ~5 activities.
6. Separate `usage_*` telemetry from lifecycle status.
7. Completion hooks that can block task closure.
8. Verification nudge/gate when a task batch closes without verifier coverage.
9. Owner mailbox/assignment notifications.
10. Memory scopes: user/project/local plus snapshot sync metadata.

## Recommended architecture

Use a **hybrid** model:

```text
SystemDB SQLite = source of truth for coordination
Markdown mission folders = human-readable mission docs and runbooks
Repo-local .pi task store = lightweight fallback/cache/smoke surface
Context-manager memory = distilled task/case context, not coordination truth
```

## Durable hierarchy

```text
Workspace
  Project
    Mission
      Task
        Run / Attempt
          Artifact
          Timeline Event
          Verification
          Handoff
```

Agents should not own state. Agents claim tasks, produce runs/artifacts, and update task status.

## Mission object

A mission is a durable long-running objective.

Example:

```text
Mission: context-hygiene
Objective: Stop Pi Codex context replay waste and build scalable context memory/handoff.
Project: pi-harness-lab
Status: active
Priority: P0
```

Store:

- SystemDB `missions` row for source of truth.
- Repo doc at `docs/missions/context-hygiene.md` or `tasks/missions/context-hygiene/MISSION.md` for human-readable state.

## Task object

A task is the atomic claimable unit.

Required semantics:

- ID
- mission/project link
- title/description
- role hint
- priority
- status
- dependencies
- owner/lease
- acceptance criteria
- context pointers
- artifact pointers
- verification requirements

Existing SystemDB can mostly support this with:

- `tasks.project_id`
- `tasks.parent_task_id`
- `tasks.assigned_agent_id`
- `tasks.priority`
- `tasks.status`
- `tasks.tags`
- `tasks.notes`
- `task_relationships`
- `artifacts`
- `timeline_events`

But we should add or encode:

- `mission_id` on tasks, or use `goal_id`/tags until schema migration.
- `role_hint`
- `lease_owner`
- `lease_expires_at`
- `acceptance_json`
- `context_refs_json`

If avoiding schema migration initially, encode these in `notes` or `metadata` JSON inside `timeline_events`, but long-term real columns are better.

## Run / attempt object

Each time an agent works a task, record a run.

Use existing:

- `agent_runs`
- `sessions`
- `timeline_events`
- `artifacts`

Run artifacts should include:

- input/handoff read
- output summary
- changed files
- test output
- Bifrost query results
- failure report if any

This solves context loss: another agent can inspect the task and its runs, not the old chat.

## Lease model

Task claiming must be atomic.

Desired state transition:

```text
ready -> leased/running -> done/failed/blocked
```

Lease fields:

```text
lease_owner = agent_run_id or agent_id
lease_expires_at = timestamp
```

Claim query should do one atomic update:

```sql
UPDATE tasks
SET assigned_agent_id = ?, status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
WHERE id = ?
  AND status IN ('pending','ready','blocked')
  AND (assigned_agent_id IS NULL OR assigned_agent_id = '' OR lease expired)
```

SQLite supports this enough for local multi-agent coordination.

## Agent allocation

Agents should not infer work from chat. They should ask the board:

```text
claim highest-priority ready task where role_hint matches agent role and dependencies are satisfied
```

Mapping:

| Task role_hint | Agent/profile |
|---|---|
| `scout` | MiniMax scout |
| `planner` | planner |
| `worker` | worker |
| `verifier` | verifier |
| `reviewer` | reviewer |
| `librarian` | context-manager/librarian |
| `release` | release/docs |
| `rescue` | Codex rescue |

Triggers should create tasks, not spawn random agents directly.

Examples:

```text
Codex prompt > 100k tokens
=> create context-hygiene task role_hint=librarian priority=A

large context filter event saved > 5000 tokens
=> create distillation task role_hint=librarian priority=B

API empty-message error repeats
=> create silent-failure-hunter task role_hint=reviewer priority=A

task status done
=> create verification task role_hint=verifier priority=A

behavior-changing code merged without docs
=> create changelog/docs task role_hint=release priority=B
```

## Markdown vs SQLite decision

Use both, with clear ownership:

| Need | Best store |
|---|---|
| atomic claim / lease | SQLite/SystemDB |
| dependency queries | SQLite/SystemDB |
| multi-agent dashboard | SQLite/SystemDB |
| run/artifact indexes | SQLite/SystemDB |
| human-readable mission intent | Markdown |
| design docs / runbooks | Markdown |
| git review | Markdown |
| local fallback/smoke | `.pi/tasks/siso-tasks.json` |

Do not make markdown the concurrency source of truth. Do not make SQLite the only human interface.

## Proposed commands

```text
siso mission list
siso mission status <mission>
siso mission create <id> --project <project> --objective <text>

siso task create --mission <mission> --role <role> --title <title> --acceptance <json>
siso task claim --mission <mission> --role <role> --agent <agent-id>
siso task heartbeat <task-id> --run <run-id>
siso task complete <task-id> --summary <text> --artifacts <paths>
siso task block <task-id> --reason <text>
siso task release <task-id>

siso board --mission <mission>
siso handoff --task <task-id>
siso context forensic --latest-codex --task <task-id>
```

## Current context-hygiene mission seed

Mission:

```text
id: context-hygiene
project: pi-harness-lab
objective: Stop Codex context replay waste and make task state recoverable across agents.
status: active
```

Seed tasks:

```text
CTX-0001 done   Patch function_call_output filtering
CTX-0002 done   Add noisy output filtering
CTX-0003 done   Add Codex case packet path
CTX-0004 done   Document changelog + runbook
CTX-0005 ready  Measure fresh post-restart Bifrost prompt sizes
CTX-0006 ready  Add context forensic command
CTX-0007 ready  Compact paired function_call history
CTX-0008 ready  Add SystemDB-backed mission/task claim leases
CTX-0009 ready  Add lifecycle-triggered task creation for context blowups/session handoff
```

## Implementation plan

### Phase 1: Bridge, do not migrate

- Keep existing `.pi/tasks/siso-tasks.json` working.
- Add SystemDB read/write adapter in `siso-agent-router`.
- Add `siso mission` and `siso task claim` wrappers that can target SystemDB.
- Write mission docs to markdown for human readability.

### Phase 2: Leases, task runs, and Claude-Code-like lifecycle hygiene

- Add lease fields or encode lease in `task_notes`/`timeline_events` first.
- Record every agent attempt as `agent_runs` + `timeline_events`.
- Attach artifacts through `artifacts` table.
- Add terminal-status helpers so UI/router never infer liveness from telemetry.
- Add exactly-once notification fields (`notified_at` or `notified`) for task/run completion.
- Add run output pointers (`output_file`, `output_offset`) so raw logs stay cold.
- Add bounded `recent_activity_json` for last few tool/activity summaries.
- Store partial results for killed/failed agent runs when available.
- Keep usage telemetry separate from lifecycle state.
- Add completion hooks for verifier/changelog/context-hygiene gates.

### Phase 3: Lifecycle task creation

- Context manager/router create tasks when:
  - huge Codex request detected,
  - large filter fires,
  - repeated API error occurs,
  - session ends with active task,
  - verification fails.

### Phase 4: Dashboard

- `siso status` / Pi monitor reads SystemDB mission board.
- Show active missions, ready tasks, running leases, blocked tasks, recent failures.

## Non-negotiable design rules

1. Agents are disposable; tasks are durable.
2. Chat is not the source of truth.
3. Every nontrivial run writes artifacts and timeline events.
4. Work allocation is via claimable tasks, not vibes.
5. SQLite owns concurrency; markdown owns legibility.
6. Codex gets case packets, not full transcripts.
7. Verifier/reviewer/release work should be tasks too, not optional afterthoughts.
8. Task lifecycle status is explicit; never infer active/done from tokens, tools, stdout, or child process noise.
9. Terminal transition happens before slow summarization/classification/git embellishment.
10. Parent notifications are exactly-once and carry compact summaries plus artifact pointers, not raw transcripts.
