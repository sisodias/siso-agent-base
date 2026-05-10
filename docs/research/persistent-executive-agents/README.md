# Persistent Executive Agents Research Hub

Date: 2026-05-10
Status: active research area

## Purpose

This folder collects research, notes, source links, framework evaluations, and first-principles synthesis for the SISO persistent executive agent architecture.

The goal is not to blindly copy existing agent frameworks. The goal is:

```txt
research widely -> extract useful primitives -> reason from first principles -> build the simplest high-ROI SISO-native system
```

This research area supports the larger architecture doc:

- `docs/strategy/persistent-executive-agent-architecture.md`

---

## Core Question

How should SISO evolve from a prompt-response coding agent into a durable executive operating system with:

- a conversational mouth/UI agent with its own memory
- a big brain/executive agent with its own operational memory
- worker/sub-agent fleets for research, coding, testing, verification
- filesystem-backed persistent state
- explicit handoff from conversation to execution
- controlled autonomy
- high inspectability

---

## Research Themes

### 1. Anthropic / Claude Agent Guidance

Priority source because Anthropic has strong practical guidance on using agents effectively.

Research targets:

- Anthropic engineering posts
- Claude Code docs
- Claude Code sub-agents / custom agents
- Claude Code memory patterns
- videos/interviews on agent usage
- tool-use best practices
- evaluation and safety patterns

Known useful source:

- Anthropic, **Building effective agents**
  https://www.anthropic.com/engineering/building-effective-agents

Early takeaway:

- Anthropic distinguishes simpler **workflows** from more autonomous **agents**.
- They emphasize using simple composable patterns where possible.
- Their patterns around routing, parallelization, evaluator-optimizer, orchestrator-workers, and human/tool boundaries are directly relevant.

SISO interpretation:

- Do not make everything a free-running agent.
- Use deterministic workflow/state machinery where possible.
- Use LLM agency where judgment and adaptation are actually valuable.
- The executive can be an orchestrator-worker pattern with durable memory.

---

### 2. LangGraph / Stateful Agent Graphs

Research target:

- LangGraph stateful agents
- durable execution
- checkpoints
- human-in-loop
- long-running agents

Known useful source:

- https://github.com/langchain-ai/langgraph

Early takeaway:

- LangGraph describes itself as a low-level orchestration framework for **stateful agents**.
- It explicitly targets long-running workflows/agents and durable execution.

SISO interpretation:

- The big brain should likely be modeled as a stateful graph or tickable state machine.
- Even if SISO does not use LangGraph directly, its primitives validate our direction.

---

### 3. AutoGen / Multi-Agent Collaboration

Research target:

- agent-to-agent communication
- human proxy agents
- group chat patterns
- tool execution boundaries

Known useful source:

- https://github.com/microsoft/autogen

Early takeaway:

- Multi-agent collaboration is a mature pattern.
- But too much agent-to-agent chat can become unstructured and hard to debug.

SISO interpretation:

- Prefer structured events/reports over endless internal chat.
- Use conversations only where they add value.

---

### 4. CrewAI / Role-Based Workers

Research target:

- role/task/crew abstractions
- worker specialization
- task delegation

Known useful source:

- https://github.com/crewAIInc/crewAI

Early takeaway:

- Role-based workers map well onto SISO sub-agent fleets.

SISO interpretation:

- Workers should be scoped jobs with contracts, not independent strategic agents.

---

### 5. OpenAI Agents SDK / Handoffs

Research target:

- handoff patterns
- agent roles
- tool execution
- tracing

Known useful source:

- https://github.com/openai/openai-agents-python

SISO interpretation:

- Mouth-to-executive and executive-to-mouth are specialized handoffs.
- A handoff boundary converts informal conversation into formal execution input, and formal questions into natural conversation.

---

### 6. Workflow Engines / Temporal / Durable Execution

Research target:

- Temporal
- durable workflows
- event history
- retries
- worker leases
- idempotency
- crash recovery

Known useful source:

- https://github.com/temporalio/sdk-python

Early takeaway:

- Durable workflow systems may be more relevant than agent frameworks for the executive layer.

SISO interpretation:

- The big brain is part LLM planner, part workflow coordinator.
- State/events/leases/retries matter as much as prompts.

---

### 7. Claude Code / Sub-Agent Fleet Patterns

Research target:

- Claude Code custom subagents
- memory files
- slash commands
- background agents if available
- session handling
- how multiple Claude sessions can share filesystem state

Hypothesis:

- A simple high-ROI implementation may be two or more separate agent sessions sharing filesystem-backed memory:
  - mouth session
  - executive session
  - worker sessions/subagents
- If they can read/write shared files safely, filesystem becomes the shared nervous system.

Open question:

- Should the mouth and big brain be two independent long-lived sessions, or should they be roles invoked by one runtime with separate memory files?

---

## First-Principles Assumptions

1. **Persistent memory can be filesystem-backed.**
   - If an agent can read/write durable files, it can maintain memory.

2. **Separate memories are valuable.**
   - Mouth memory should be conversational and fluid.
   - Executive memory should be structured and operational.

3. **Agents should communicate through artifacts.**
   - Files, events, reports, tasks, decisions.
   - Not only chat messages.

4. **The simplest useful version may be multiple sessions over a shared filesystem.**
   - Mouth and executive do not necessarily require complex infrastructure at first.

5. **Sub-agents are labor units.**
   - They need scopes, contracts, budgets, and outputs.

6. **Research is evidence, not authority.**
   - Existing frameworks reveal useful primitives but may not match SISO's desired shape.

---

## Open Design Questions

### Mouth / Executive Shape

Options:

1. **Two separate long-lived sessions**
   - Mouth agent session and executive agent session.
   - Both read/write shared files.
   - Simple mental model.
   - Risk: concurrency conflicts and session drift.

2. **One runtime, two role memories**
   - Same process invokes mouth or executive role as needed.
   - Cleaner state control.
   - Less like true separate minds.

3. **Mouth always-on, executive event-driven**
   - Mouth stays conversationally available.
   - Executive wakes when asked or when events arrive.

4. **Executive always-on, mouth ephemeral**
   - Executive keeps operating.
   - Mouth wakes only for user interaction.

5. **Both event-driven**
   - Durable state is primary.
   - Agents are invoked when events require them.

Current leaning:

- Use filesystem-backed separate memory domains regardless of runtime.
- Start with the simplest execution model that preserves the conceptual separation.

### Agent Communication

Options:

1. Shared files only
2. Event log JSONL
3. SQLite
4. Message queue
5. Direct session-to-session messages

Current leaning:

- Start with files + JSONL event log because it is transparent, inspectable, and easy for agents to use.
- Move to SQLite/queue when concurrency requires it.

### Framework Adoption

Options:

1. Use LangGraph directly
2. Use AutoGen/CrewAI style framework
3. Use Temporal/workflow engine
4. Build SISO-native core and add adapters

Current leaning:

- Build SISO-native state/contracts first.
- Use external frameworks as references or adapters, not as the core dependency until proven useful.

---

## Research Log

### 2026-05-10 Initial Sweep

Sources quickly checked:

- Anthropic: Building effective agents
- Anthropic cookbook
- Claude Code docs overview
- LangGraph README
- AutoGen README
- CrewAI README
- OpenAI Agents SDK README
- Temporal Python SDK README

Initial synthesis:

- The best external validation is around stateful orchestration, durable execution, human-in-loop, and orchestrator-worker patterns.
- The most SISO-specific idea is the **mouth memory -> executive handoff**.
- Durable filesystem state may be enough to prototype the core architecture without heavy infrastructure.

---

## Files To Add In This Research Area

Suggested structure:

```txt
docs/research/persistent-executive-agents/
  README.md
  sources.md
  anthropic-agent-guidance.md
  claude-code-subagents.md
  langgraph-notes.md
  autogen-notes.md
  crewai-notes.md
  openai-agents-notes.md
  temporal-workflow-notes.md
  first-principles-synthesis.md
  framework-comparison.md
  implementation-hypotheses.md
```
