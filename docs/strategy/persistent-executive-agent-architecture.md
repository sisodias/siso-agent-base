# SISO Persistent Executive Agent Architecture

Date: 2026-05-10
Status: working theory / target architecture

## Origin

The current SISO agent pattern is mostly request/response:

```txt
Shaan asks -> agent works -> agent reports -> waits
```

The desired architecture is different. SISO should not depend on Shaan manually pushing every next step. It should have a durable executive layer that can maintain goals, allocate workers, think through what comes next, and only involve Shaan when human judgment, preference, approval, or conversation is valuable.

The core idea is to split what is currently treated as “the agent” into separate roles:

```txt
Mouth / UI Agent      = talks with Shaan
Big Brain / Executive = plans, prioritizes, queues, delegates, synthesizes
Hands / Workers       = research, code, test, inspect, debug, implement
Memory / State        = durable goals, decisions, tasks, reports, preferences
Nervous System        = event bus, queue, lifecycle, timers, notifications
```

This is not just an MVP idea. This is the target shape: a SISO operating system for autonomous software/research execution.

---

## First-Principles Model

An agent system has a few primitive functions:

1. **Perception**
   - User messages
   - Worker results
   - File/repo changes
   - Errors
   - Timers
   - Environment status

2. **State**
   - What are we trying to do?
   - What has happened?
   - What is pending?
   - What is blocked?
   - What does Shaan care about?
   - What has been approved?

3. **Policy / Judgment**
   - What should happen next?
   - What is high leverage?
   - What is risky?
   - What needs approval?
   - What can be delegated?
   - What should be ignored?

4. **Action**
   - Spawn worker agents
   - Ask Shaan a question
   - Edit code
   - Run tests
   - Research
   - Summarize
   - Queue future work

5. **Interface**
   - How SISO talks to Shaan
   - When it interrupts
   - How it asks questions
   - How it captures informal conversation and turns it into actionable state

A normal chat agent collapses all five into one loop. SISO should separate them.

---

## Core Architecture

```txt
                       ┌──────────────────────┐
                       │        Shaan          │
                       └──────────┬───────────┘
                                  │
                                  v
                       ┌──────────────────────┐
                       │ Mouth / UI Agent      │
                       │ conversational memory │
                       │ asks, listens, frames │
                       └──────────┬───────────┘
                                  │
                   structured notes / decisions / tasks
                                  │
                                  v
┌──────────────────────────────────────────────────────────────┐
│                  Durable SISO State / Memory                  │
│ goals, tasks, user prefs, decisions, reports, approvals,      │
│ conversations, queue, artifacts, open questions, strategy      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           v
                ┌────────────────────────┐
                │ Big Brain / Executive   │
                │ plans, prioritizes,     │
                │ delegates, synthesizes  │
                └──────┬────────┬────────┘
                       │        │
             spawns    │        │ asks mouth to talk
                       │        │
                       v        v
        ┌────────────────────┐  ┌──────────────────────┐
        │ Worker Sub-Agents   │  │ UI Agent Invocation   │
        │ research/code/test/ │  │ question / summary /  │
        │ debug/verify        │  │ approval / brainstorm │
        └─────────┬──────────┘  └──────────────────────┘
                  │
                  v
          reports / artifacts / patches
```

The durable center should be state, not a fragile infinite chat transcript.

---

## The Mouth / UI Agent

The mouth is the user-facing agent. It is responsible for talking with Shaan.

Important point: the mouth should have its **own memory**.

This is different from the executive memory.

### Mouth Memory

The mouth remembers:

- How Shaan likes to talk
- Current conversational thread
- Half-formed ideas Shaan is exploring
- Preferences, taste, tone, frustration, excitement
- Recent informal context
- Questions Shaan has asked
- Things not yet ready to become tasks
- Conversational commitments

The mouth is allowed to have a more fluid memory because conversation is messy. Shaan may brainstorm, contradict himself, explore vibes, or talk through an intuition before it is ready to become structured work.

The mouth should support a mode like:

```txt
Talk with me first. Do not queue this yet.
```

Then later:

```txt
Send this to the big brain.
```

At that point, the mouth should convert the conversation into structured executive input.

### Mouth Responsibilities

- Talk naturally with Shaan
- Ask clarifying questions
- Maintain conversational continuity
- Capture ideas without forcing them into tasks too early
- Distinguish brainstorming from instructions
- Package mature ideas for the executive
- Bring executive questions back to Shaan
- Return Shaan's answer in structured form

### Mouth Non-Responsibilities

The mouth should not independently run the whole system.

It should not silently execute major actions, spawn large fleets, or mutate strategic state without either:

1. Shaan asking it to send the idea to the executive, or
2. the executive asking the mouth to collect a decision/approval.

### Example Mouth-to-Executive Payload

```json
{
  "type": "conversation_distillation",
  "source": "mouth_agent",
  "status": "ready_for_executive",
  "summary": "Shaan wants SISO split into a persistent executive, a conversational mouth with its own memory, and worker agents. He does not want to over-focus on MVP constraints; he wants the full target architecture planned and then implemented by generating/repurposing code.",
  "user_intent": "Build the architecture, not just discuss it.",
  "preferences": [
    "Use first-principles reasoning over copying existing frameworks",
    "Internet research is useful but not authoritative",
    "Do not prematurely constrain the design to a tiny MVP",
    "The main bottleneck is code generation and implementation throughput"
  ],
  "requested_action": "Plan and queue the implementation of the persistent executive agent system."
}
```

---

## The Big Brain / Executive Agent

The big brain is the strategic/executive layer.

It owns:

- Goals
- Current strategy
- Task queue
- Worker allocation
- Report synthesis
- Decision records
- Approval state
- Priority management
- Long-horizon continuity

It should have its **own memory**, separate from the mouth.

### Executive Memory

The executive remembers:

- Active goals
- Project state
- Decisions made and why
- Task dependencies
- Worker reports
- Codebase status
- Risks and blockers
- Approved budgets/scopes
- Strategic principles
- Open questions needing Shaan

This memory should be more structured and auditable than mouth memory.

### Executive Responsibilities

- Convert goals into plans
- Convert plans into tasks
- Allocate worker agents
- Decide when to ask Shaan
- Decide when to continue without Shaan
- Synthesize worker outputs
- Maintain momentum
- Detect blockers
- Prevent duplicate/conflicting work
- Keep the system pointed at explicit goals

### Executive Decision Cycle

```txt
1. Read durable state.
2. Read new user-distilled inputs from the mouth.
3. Read new worker reports.
4. Update tasks/goals/known facts.
5. Identify blockers and opportunities.
6. Decide next action:
   - spawn workers
   - request user input through mouth
   - synthesize reports
   - create/update tasks
   - schedule future tick
   - pause/sleep
7. Write a decision record.
8. Dispatch actions.
```

### Example Executive Decision Record

```json
{
  "type": "executive_decision",
  "goal_id": "persistent-executive-agent-system",
  "decision": "spawn_workers",
  "reason": "Implementation requires parallel workstreams: state schema, event bus, mouth memory, executive loop, worker lifecycle, and UI routing.",
  "actions": [
    {
      "kind": "spawn_worker",
      "task": "Design durable state schema for goals/tasks/decisions/reports/mouth memory."
    },
    {
      "kind": "spawn_worker",
      "task": "Inspect current SISO child agent lifecycle and identify hooks for executive orchestration."
    }
  ],
  "requires_user_approval": false
}
```

---

## Worker Sub-Agents

Workers are disposable, scoped agents.

They should be treated like execution resources, not autonomous principals.

Worker roles can include:

- Researcher
- Repo inspector
- Code implementer
- Test writer
- Verifier
- Critic
- Debugger
- Documentation writer
- Migration planner
- Refactor agent

Workers should get narrow tasks and structured output requirements.

### Worker Contract

Each worker should receive:

- Objective
- Scope
- Allowed paths/tools
- Forbidden actions
- Budget
- Expected output format
- Success criteria
- Reporting destination

Example:

```json
{
  "worker_type": "repo_inspector",
  "objective": "Find the current SISO child agent spawn, notification, and lifecycle code paths.",
  "allowed_actions": ["read_files", "search_repo", "run_safe_diagnostics"],
  "forbidden_actions": ["edit_files", "print_secrets", "modify_active_install"],
  "output": {
    "required_sections": [
      "files_of_interest",
      "current_flow",
      "integration_points",
      "risks",
      "recommended_next_steps"
    ]
  }
}
```

---

## Memory Separation

The architecture needs multiple memory types, not one giant memory bucket.

### 1. Mouth Memory

Purpose: conversational continuity.

Stores:

- Recent chats
- Shaan preferences
- Brainstorming notes
- Informal ideas
- Things to maybe send later
- Tone/style preferences

Shape: semi-structured. Optimized for conversation.

### 2. Executive Memory

Purpose: operational continuity.

Stores:

- Goals
- Tasks
- Decisions
- Plans
- Reports
- Approvals
- Risks
- Blockers
- Dependencies

Shape: structured and auditable.

### 3. Worker Memory

Purpose: task-local context.

Stores:

- Current task context
- Files inspected
- Observations
- Partial results

Shape: temporary. Usually discarded or summarized after completion.

### 4. Global Knowledge / Reference Memory

Purpose: reusable knowledge.

Stores:

- Architecture docs
- System conventions
- Repo maps
- Tool docs
- Known failure modes
- Good patterns

Shape: indexed docs / retrieval.

### 5. Event Log

Purpose: source of truth for what happened.

Stores append-only events:

- User input received
- Mouth distillation created
- Executive decision made
- Worker spawned
- Worker completed
- File changed
- Approval granted
- Task completed

Shape: append-only JSONL or database table.

---

## Conversation-to-Execution Flow

One key feature: Shaan can talk to the mouth without immediately making tasks.

```txt
Shaan brainstorms with mouth
        ↓
Mouth stores conversational notes
        ↓
Shaan says: send this to the big brain
        ↓
Mouth distills conversation into structured intent
        ↓
Executive ingests intent
        ↓
Executive creates goals/tasks/worker plans
        ↓
Workers execute
        ↓
Executive synthesizes
        ↓
Mouth reports back or asks questions
```

This avoids a common failure mode where every casual thought becomes an action item.

---

## Escalation Policy

The executive should not constantly interrupt Shaan.

It should route through the mouth only when useful.

### Silent

Routine progress. No need to interrupt.

Examples:

- Worker finished a small inspection
- Task queue updated
- Non-blocking research completed

### Digest

Meaningful progress worth summarizing later.

Examples:

- Several worker reports synthesized
- Major implementation step completed
- New architecture doc created

### Ask

Need preference or clarification.

Examples:

- Multiple good strategic paths
- Ambiguous user intent
- Need prioritization

### Approval

Need explicit permission.

Examples:

- Destructive file operations
- Large autonomous run
- External network/API usage beyond normal expectations
- Touching active install or deployment
- Expensive compute

### Urgent

Need immediate attention.

Examples:

- Data loss risk
- Security issue
- Broken runtime
- Runaway worker loop

---

## First-Principles Build Blocks

To build the full system, we need these pieces:

1. **Durable State Store**
   - Goals
   - Tasks
   - Events
   - Decisions
   - Reports
   - Approvals
   - Mouth memory
   - Executive memory

2. **Event Bus / Queue**
   - User message events
   - Worker completion events
   - Timer events
   - File/repo change events
   - Approval events

3. **Executive Runtime**
   - Reads state/events
   - Applies policy
   - Writes decisions
   - Dispatches actions

4. **Mouth Runtime**
   - Maintains conversation memory
   - Distills ideas into executive payloads
   - Asks questions on behalf of executive
   - Returns structured answers

5. **Worker Runtime**
   - Spawns scoped agents
   - Tracks leases/heartbeats
   - Collects reports
   - Handles failures/timeouts

6. **Policy Layer**
   - Budgets
   - Permissions
   - Escalation rules
   - Risk classification
   - Task usefulness threshold

7. **Observability**
   - Status UI
   - Logs
   - Decision traces
   - Worker timelines
   - Queue inspection

8. **Recovery / Safety**
   - Idempotent ticks
   - Crash recovery
   - Deduplication
   - Stale task cleanup
   - Kill switches

---

## Implementation Workstreams

This is the “just build it” decomposition. The bottleneck is code, so the system should be split into parallel implementation tracks.

### Workstream A: State Schema

Define canonical schemas for:

- Goal
- Task
- Event
- Decision
- WorkerRun
- Report
- Approval
- MouthMemory
- ExecutiveMemory
- UserQuestion

Likely starting storage:

```txt
.siso/executive/
  goals.json
  tasks.json
  events.jsonl
  decisions.jsonl
  approvals.json
  mouth-memory.json
  executive-memory.json
  reports/
  workers/
```

Later storage can move to SQLite/Postgres, but file-backed JSON/JSONL is easiest to inspect and debug first.

### Workstream B: Executive Tick

Build a command/runtime:

```bash
siso executive tick
```

It should:

- Load state
- Read pending events
- Read worker reports
- Update tasks
- Decide next actions
- Write decisions
- Spawn workers or request mouth interaction

Even if the final version is always-on, the core should be tickable and replayable.

### Workstream C: Mouth Memory + Distillation

Build a mouth layer that can:

- Store conversational notes
- Mark ideas as not-yet-actionable
- Distill a conversation into executive-ready payload
- Receive executive questions
- Ask Shaan naturally
- Store answers and send structured results back

Commands could look like:

```bash
siso mouth note
siso mouth send-to-executive
siso mouth answer-question
siso mouth digest
```

### Workstream D: Worker Orchestration

Build robust worker allocation:

- Spawn workers with scoped prompts
- Track worker state
- Capture reports
- Detect timeout/failure
- Retry or escalate
- Prevent infinite spawning
- Support worker roles

### Workstream E: Policy / Permissions

Implement rules for:

- Max parallel workers
- Max total workers per goal
- Read-only vs edit permissions
- Approval thresholds
- Network/tool usage
- Active install changes
- Cost/runtime budgets

### Workstream F: Observability UI

Add status views:

```bash
siso executive status
siso executive queue
siso executive decisions
siso mouth memory
siso workers status
```

The system needs to be inspectable. If Shaan cannot see what the executive thinks it is doing, trust collapses.

### Workstream G: Internet / Code Repurposing Research

Research is useful, but not authoritative. The goal is to extract useful implementation patterns, not copy someone else's architecture blindly.

Look for reusable ideas/code from:

- LangGraph: stateful graph orchestration, durable checkpoints, human-in-loop nodes
- AutoGen: multi-agent communication and human proxy patterns
- CrewAI: role/task crew abstractions
- Distributed systems: queues, leases, event logs, supervisors, retries
- Workflow engines: Temporal/Durable Functions-style replay and deterministic workflows
- Actor systems: supervisor trees, message passing, isolation

Use first principles to decide what to adopt.

---

## Design Principles

1. **Persistent state over persistent vibes**
   - The durable artifact should be state/events/decisions, not an endless chat transcript.

2. **Separate talking, thinking, and doing**
   - Mouth talks.
   - Executive thinks/plans.
   - Workers do.

3. **The user is not the scheduler**
   - Shaan should not need to manually advance every step.

4. **The mouth can hold ideas before they become work**
   - Brainstorming should not automatically create tasks.

5. **Every executive action should cite a goal**
   - Prevents drift and random busywork.

6. **Workers are scoped and disposable**
   - They do not own strategy.

7. **Structured artifacts beat hidden context**
   - Reports, decisions, tasks, approvals, and memories should be inspectable.

8. **Autonomy needs budgets**
   - Parallelism, runtime, cost, scope, and risk must be bounded.

9. **Research informs; first principles decide**
   - Do not cargo-cult frameworks.

10. **Build for parallel implementation**
   - If code is the bottleneck, split the build into independent workstreams and allocate agents.

---

## Failure Modes and Guardrails

### Runaway Busywork

Risk: executive invents tasks because it can.

Guardrail:

- Every task must map to an explicit goal.
- Every self-generated task must have expected value and output.

### Context Drift

Risk: executive slowly optimizes for the wrong objective.

Guardrail:

- Maintain explicit goals and decision records.
- Periodically ask Shaan to reconcile direction.

### Infinite Delegation

Risk: workers spawn more uncertainty instead of convergence.

Guardrail:

- Max delegation depth.
- Required synthesis after N reports.
- Escalate if uncertainty remains.

### Chatty Mouth

Risk: mouth interrupts too much.

Guardrail:

- Escalation policy.
- Digest mode.
- User-configurable interruption threshold.

### State Corruption

Risk: messy state causes bad decisions.

Guardrail:

- Schemas.
- Append-only event log.
- Validation.
- Recovery tools.

### Authority Confusion

Risk: mouth, executive, and workers all think they can act.

Guardrail:

- Clear permissions.
- Mouth communicates.
- Executive plans/delegates.
- Workers execute scoped tasks.
- Shaan approves risky actions.

### Worker Reliability

Risk: sub-agents timeout, fail, or report partial work.

Guardrail:

- Leases/heartbeats.
- Status tracking.
- Partial-result handling.
- Verifier workers.
- Retry/abandon policies.

---

## Target Build Plan

This is not framed as a tiny MVP. This is the target system decomposed into buildable layers.

### Layer 1: Documentation and Schemas

- Write architecture doc.
- Define JSON schemas.
- Define memory separation.
- Define event types.
- Define role contracts.

### Layer 2: State Store

- Create `.siso/executive` state directory.
- Implement read/write helpers.
- Implement append-only event log.
- Implement schema validation.

### Layer 3: Mouth

- Add mouth memory.
- Add conversation note capture.
- Add distillation to executive payload.
- Add executive question handling.

### Layer 4: Executive

- Add executive tick.
- Add decision policy.
- Add task queue management.
- Add report synthesis.
- Add action dispatch.

### Layer 5: Worker Integration

- Integrate existing SISO child agents.
- Add worker contracts.
- Add role templates.
- Add status/timeout handling.
- Add report ingestion.

### Layer 6: Autonomy Loop

- Add timer/event triggered ticks.
- Add background mode.
- Add idle opportunity detection.
- Add budget-aware proactive research/work.

### Layer 7: UI / Observability

- Add status commands.
- Add queue views.
- Add decision history.
- Add mouth memory view.
- Add worker status panel.

### Layer 8: Hardening

- Add tests/smokes.
- Add recovery tools.
- Add idempotency.
- Add duplicate prevention.
- Add safe shutdown.
- Add approval enforcement.

---

## Immediate Next Actions

1. Inspect current SISO agent/sub-agent code paths.
2. Identify where child agents are spawned and where results return.
3. Define state schemas under docs/contracts or implementation package.
4. Implement `.siso/executive` state helpers.
5. Implement `siso executive status` and `siso executive tick`.
6. Implement mouth memory and `send-to-executive` distillation.
7. Wire worker reports into executive events.
8. Add background loop only after tick/state/report flow is reliable.

---

## Short Summary

SISO should evolve from a prompt-response coding agent into a persistent executive operating system. The mouth talks with Shaan and keeps conversational memory. The big brain maintains strategic/operational memory, plans, queues, delegates, and synthesizes. Workers execute scoped tasks. The durable center is shared state and event history. Shaan can brainstorm with the mouth without immediately creating tasks, then explicitly send mature ideas to the big brain for planning and execution. The system should be built by decomposing it into code-generatable layers: state, events, mouth, executive, workers, policy, observability, and hardening.
