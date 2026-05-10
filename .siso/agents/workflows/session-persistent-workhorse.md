# Workflow: Session Persistent Workhorse

Purpose: let any chat/session agent create and manage its own persistent workhorse agent for a durable goal.

## Model

```txt
Shaan
  <-> session/main agent
        <-> session-owned persistent workhorse agent
              -> background child runs
              -> durable state files
              -> asks questions through the session/main agent
              -> keeps working until done/blocked/paused
```

The user normally talks to the session/main agent. The workhorse does not need to talk to the user directly.

## When to create one

Create a session persistent workhorse when the user gives a task that is:

- multi-step
- likely to exceed one assistant turn
- needs continued follow-through
- research/planning/build loop
- should keep memory, decisions, questions, and progress across context resets

## Agent id

Use descriptive names:

```txt
session-<short-goal>-workhorse
```

Examples:

```txt
session-persistent-agent-mvp-workhorse
session-youtube-transcript-ingestion-workhorse
session-tui-agent-dashboard-workhorse
```

## Folder layout

```txt
.siso/agents/<agent-id>/
  agent.md
  goals.md
  memory.md
  controlled-paths.md
  continuation.md
  questions.md
  worklog.md
  changelog.md
  metrics.md
  inbox/
  outbox/
  runs/
```

## Continuation loop

The workhorse should continue until one of these terminal states:

```txt
done | blocked-needs-user | blocked-needs-permission | paused-by-user | failed
```

Use `.siso/agents/workflows/continue-session-workhorse.md` as the current MVP continuation runner/checker.

Each run must decide the next state:

1. If spec is not done and no blocker exists: update `continuation.md` with `Status: active`, set a concrete `Next action`, and write `outbox/next-run-request.md` with the exact next worker dispatch prompt.
2. If user input is needed: write question to `questions.md` and `outbox/`, stop with `blocked-needs-user`.
3. If permission is needed: write permission request, stop with `blocked-needs-permission`.
4. If complete: write final report and mark `done`.

## Required state files

### `continuation.md`

Tracks whether the workhorse should keep going.

```md
# Continuation

Status: active
Mode: continue-until-done
Current phase:
Next action:
Blocker: none
Needs user: no
Last run:
```

### `questions.md`

The workhorse writes questions for the session/main agent to relay to Shaan.

```md
# Questions For Shaan

## Open

None.

## Answered
```

## Main agent responsibilities

The session/main agent must:

- create the workhorse folder/state
- write tasks into inbox
- spawn background runs
- check run reports/worklog/outbox/questions
- relay questions to Shaan
- relay Shaan's answers back into inbox/memory
- summarize progress without dumping raw logs

## Workhorse responsibilities

The workhorse must:

- read durable state at start of every run
- do scoped useful work
- write run report
- update worklog/metrics/changelog/memory as appropriate
- update continuation state
- write questions/requests instead of silently stopping
- recommend or trigger the next run when not done

## Future TUI hook

The TUI can render:

- current status from `continuation.md`
- questions from `questions.md`
- latest run reports from `runs/`
- recent work from `worklog.md`
- recent changes from `changelog.md`
- health/progress from `metrics.md`
