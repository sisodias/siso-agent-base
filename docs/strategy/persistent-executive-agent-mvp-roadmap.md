# Persistent Executive Agent MVP Roadmap

Date: 2026-05-10
Status: MVP plan / ready to implement

## 1. Problem Statement

SISO currently behaves mostly like a powerful request/response agent:

```txt
Shaan asks -> agent works -> agent reports -> waits
```

That is useful, but it does not yet behave like a persistent executive partner that can maintain durable context across sessions, track priorities, remember decisions, and keep projects moving without everything living inside one chat context.

The goal is to build a SISO-native persistent executive layer that can answer:

```txt
What are we working on?
What did we decide?
What matters next?
What is blocked?
What should be delegated?
What changed since last review?
```

The first version should be simple, filesystem-backed, inspectable, and immediately useful.

---

## 2. Target Architecture

The core architecture separates conversation, durable reasoning, and execution.

```txt
User
  ↓
Mouth / UI Agent
  ↓
Executive Inbox
  ↓
Executive Agent
  ↓
Durable State + Decisions + Tasks + Research
  ↓
Worker Agents / Tools
```

### Mouth / UI Agent

The chat-facing layer.

Responsibilities:

- talk naturally with Shaan
- brainstorm and clarify messy ideas
- capture important intent
- route durable items into the executive inbox
- present executive summaries back to Shaan

Non-responsibilities:

- should not be the source of truth
- should not silently rewrite durable project strategy
- should not treat every passing thought as permanent memory

### Executive Agent

The persistent planning layer.

Responsibilities:

- process inbox items
- maintain active projects
- maintain priorities
- record decisions
- track tasks and blockers
- decide when to ask, act, delegate, or wait
- produce session/daily reviews

### Worker Agents

Scoped executors.

Responsibilities:

- research
- code
- inspect files
- run tests
- summarize sources
- execute delegated tasks
- report back with evidence and open issues

---

## 3. MVP Definition

The MVP is not full autonomy. The MVP is a durable executive project memory that can be reviewed and updated by agents.

### MVP promise

```txt
At any time, SISO can reconstruct the current project state from durable files and recommend the next concrete actions.
```

### MVP components

```txt
.siso/executive/
  README.md
  profile.md
  state/
    active-projects.md
    goals.md
    principles.md
  inbox/
    README.md
  tasks/
    README.md
    active.md
  decisions/
    README.md
    decision-log.md
  reviews/
    README.md
  research-index.md
```

### MVP workflows

```txt
executive-capture
  Capture important conversation items into inbox.

executive-review
  Read executive state and produce current project summary + next actions.

executive-plan
  Convert goals and inbox items into structured tasks/decisions.

executive-delegate
  Spawn or recommend scoped worker-agent tasks.
```

---

## 4. Filesystem State Schema

### `profile.md`

Stable user/system preferences relevant to executive behavior.

Examples:

- Shaan prefers practical, direct execution.
- Do not overcomplicate workflows.
- Prefer SISO-native primitives first.
- Durable memory should be explicit and inspectable.

### `state/goals.md`

Longer-lived goals.

Suggested fields:

```md
## Goal: <name>

Status: active | paused | complete
Priority: high | medium | low
Created: YYYY-MM-DD
Why it matters:
Success criteria:
Related projects:
```

### `state/active-projects.md`

Current projects and their live status.

Suggested fields:

```md
## Project: <name>

Status:
Owner:
Priority:
Current objective:
Next action:
Blockers:
Related decisions:
Related tasks:
Related research:
```

### `tasks/active.md`

Executive-level task list, not tiny implementation subtasks.

Suggested fields:

```md
- [ ] <task>
  - Project:
  - Priority:
  - Type: research | design | code | review | decision
  - Owner: human | executive | worker
  - Created:
  - Next step:
```

### `decisions/decision-log.md`

Durable decisions.

Suggested fields:

```md
## YYYY-MM-DD — <decision title>

Decision:
Context:
Why:
Consequences:
Revisit when:
```

### `inbox/`

Raw captured items before executive processing.

Use for:

- ideas
- messy notes
- user preferences
- possible tasks
- unresolved questions
- research leads

Inbox items should be promoted, merged, or discarded during executive review.

---

## 5. Event / Inbox Model

Every durable item starts as an event.

Event types:

```txt
idea
request
decision
task
preference
research-lead
blocker
question
source
follow-up
```

Minimal event format:

```md
# Inbox Event: <short title>

Date:
Type:
Source: chat | file | worker | research | system
Status: new | processed | archived

## Raw note

<what was captured>

## Possible executive handling

- [ ] add task
- [ ] update project
- [ ] record decision
- [ ] add research lead
- [ ] ask clarification
- [ ] discard/archive
```

---

## 6. Implementation Phases

### Phase 0 — Documentation and state skeleton

Status: in progress

Deliverables:

- Create this roadmap.
- Create `.siso/executive/` state skeleton.
- Seed current project state for persistent executive agents.
- Record initial decisions.

### Phase 1 — Manual executive review

Goal:

Agents can manually read `.siso/executive/` and answer:

```txt
What is the current state?
What changed?
What should we do next?
```

Deliverables:

- `executive-review` prompt/workflow doc.
- Standard output format.
- First review file in `.siso/executive/reviews/`.

### Phase 2 — Capture workflow

Goal:

Important chat moments can be converted into inbox events without polluting permanent state.

Deliverables:

- `executive-capture` prompt/workflow doc.
- Inbox event template.
- Rules for what should/should not be captured.

### Phase 3 — Planning workflow

Goal:

Inbox + goals become decisions/tasks/project updates.

Deliverables:

- `executive-plan` prompt/workflow doc.
- Task and decision promotion rules.
- Stale item pruning rules.

### Phase 4 — Delegation workflow

Goal:

Executive can create scoped worker tasks with acceptance criteria.

Deliverables:

- `executive-delegate` prompt/workflow doc.
- Worker task template.
- Report-back template.

### Phase 5 — SISO integration

Goal:

Turn the manual docs into SISO-native skills/commands.

Potential commands/skills:

```txt
siso executive review
siso executive capture
siso executive plan
siso executive delegate
```

Or profile skills:

```txt
executive-review
executive-capture
executive-plan
executive-delegate
```

---

## 7. Open Research Questions

1. What is the simplest reliable way to keep executive state from becoming messy?
2. Should state start as Markdown only, or Markdown + JSON indexes?
3. When should the mouth agent capture automatically vs ask first?
4. How aggressive should the executive be in spawning worker agents?
5. What review cadence is useful without becoming annoying?
6. How should executive memory interact with existing SISO context compression?
7. What is the best free/code-based YouTube transcript ingestion path for future research data?

---

## 8. What To Build First

Build the smallest useful loop:

```txt
1. Durable state skeleton exists.
2. Current project is recorded.
3. Decisions are logged.
4. Active tasks are listed.
5. A manual executive review can recommend next actions.
```

First concrete implementation tasks:

- [x] Create MVP roadmap.
- [ ] Create `.siso/executive/` folder structure.
- [ ] Seed active project: Persistent Executive Agent.
- [ ] Record initial decisions.
- [ ] Add executive workflow docs.
- [ ] Run first manual executive review.

---

## 9. Initial Success Criteria

The MVP is useful when a future agent can open `.siso/executive/` and quickly know:

- Shaan's current high-priority agent-system idea
- the mouth/executive/worker separation
- why manual transcript ingestion was paused
- what needs to be built next
- what should not be overcomplicated yet

The system fails if:

- it becomes a giant unstructured notes dump
- every chat message becomes permanent memory
- tasks are created without clear next actions
- agents cannot distinguish brainstorms from decisions
- the executive becomes more complex than the work it coordinates
