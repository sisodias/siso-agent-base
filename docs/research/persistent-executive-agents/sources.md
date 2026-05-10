# Research Sources: Persistent Executive Agents

Date: 2026-05-10
Status: active

This file tracks sources to investigate for SISO's persistent executive / mouth / worker architecture.

## Priority Sources

### Anthropic

- Building effective agents
  https://www.anthropic.com/engineering/building-effective-agents

- Anthropic Cookbook
  https://github.com/anthropics/anthropic-cookbook

- Claude Code docs
  https://docs.anthropic.com/en/docs/claude-code/overview

Research questions:

- What does Anthropic recommend about workflows vs agents?
- What patterns do they recommend for orchestrator-workers, routing, parallelization, evaluator-optimizer, and human-in-loop?
- What does Claude Code support for subagents/custom agents/memory/session sharing?
- Can Claude Code sessions be used as separate mouth/executive processes over shared files?

---

### LangGraph

- GitHub
  https://github.com/langchain-ai/langgraph

- Docs
  https://langchain-ai.github.io/langgraph/

Research questions:

- How do they model state?
- How do checkpoints/durable execution work?
- How do human-in-loop nodes work?
- Can SISO reuse ideas without adopting LangGraph as core?

---

### AutoGen

- GitHub
  https://github.com/microsoft/autogen

Research questions:

- What patterns exist for multi-agent collaboration?
- How does human proxy work?
- What failure modes appear in agent group chats?
- What should SISO avoid?

---

### CrewAI

- GitHub
  https://github.com/crewAIInc/crewAI

Research questions:

- How are roles/tasks/crews represented?
- What can SISO steal for worker contracts?
- What abstractions are too high-level or too product-specific?

---

### OpenAI Agents SDK

- GitHub
  https://github.com/openai/openai-agents-python

Research questions:

- How are handoffs modeled?
- How is tracing handled?
- What can be adapted for mouth/executive boundary?

---

### Durable Workflow Systems

- Temporal Python SDK
  https://github.com/temporalio/sdk-python

Research questions:

- How do durable workflows persist event history?
- How do retries, leases, and workers operate?
- Which concepts should be mirrored in SISO's executive layer?

---

## Search Queries To Run

### General

- persistent AI agents architecture
- autonomous agent orchestration state memory filesystem
- multi agent orchestration durable workflow
- agent workflow human in the loop state machine
- LLM orchestrator worker pattern
- LLM agent event sourcing
- agent memory filesystem architecture

### Anthropic / Claude

- Anthropic agent workflow orchestrator workers routing parallelization evaluator optimizer
- Anthropic building effective agents orchestrator workers
- Claude Code subagents custom agents memory
- Claude Code multiple sessions shared files
- Claude Code agent fleet
- Claude Code best practices agents

### Frameworks

- LangGraph durable execution human in the loop checkpointing
- AutoGen human proxy multi agent patterns
- CrewAI hierarchical process planning agents
- OpenAI Agents SDK handoffs tracing
- Temporal durable workflows agent orchestration

---

## Evaluation Criteria

For every source/framework, evaluate:

1. What primitive does it provide?
2. Is it aligned with SISO's mouth/executive/worker separation?
3. Does it support durable state?
4. Does it support human-in-loop cleanly?
5. Does it improve sub-agent reliability?
6. Does it reduce implementation time?
7. Does it create dependency/complexity risk?
8. Can we adopt the idea without adopting the framework?

---

## Early Opinion

The likely best path is:

```txt
SISO-native schemas + filesystem/event-log state
        +
Claude/SISO agents as mouth/executive/workers
        +
borrowed patterns from Anthropic/LangGraph/Temporal
        +
adapters to frameworks only if they create real leverage
```

## Open tooling need: YouTube transcript ingestion

Status: unresolved / future tooling needed

We attempted manual transcript collection via many TextEdit files, but the workflow was error-prone and produced duplicate/misleading files. Do not rely on this manual process as the long-term research ingestion path.

Future requirement:

- Build or adopt a free/code-based way to fetch YouTube/video transcripts.
- Input should be a list of URLs.
- Output should be one clean transcript file per video with metadata.
- It should deduplicate by URL/content hash.
- It should preserve raw transcript text separately from summaries.
- It should generate an index for research agents.

Candidate implementation areas to research later:

- YouTube transcript APIs/libraries
- `yt-dlp` subtitle extraction
- auto-caption download where available
- fallback speech-to-text only if transcript unavailable
- content hashing and duplicate detection

Decision for now: pause transcript ingestion and continue the persistent executive agent architecture research/design without depending on these manual transcript files.
