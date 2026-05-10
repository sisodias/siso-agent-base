# SISO Agent Harness 10x Roadmap

Date: 2026-05-09
Status: living strategy

## North star

Build an agent harness that is measurably better than comparable V2 agent harnesses across task success, context efficiency, tool efficiency, delegation, safety, learning, and operator control.

The goal is not one flashy feature. The goal is a compounding system where every run makes future runs easier to trust, measure, replay, improve, and scale.

## What we have now

Foundation layer:

- Capability Registry — what exists / what is missing.
- Test Space — how capabilities are tested and tracked.
- Agent Contracts — subsystem rules and required validation.
- Source Drift Detector — source/runtime/release/test consistency.
- Doctor Readiness — one health/readiness surface.

Existing code-intelligence/tooling layer is further along than zero:

- `repoSearch`
- `readMany`
- `projectTree`
- `projectMap`
- `fileOutline`
- `symbolSearch`
- `contextPack`
- `briefRepo`
- `runCheck`
- workspace status/diff helpers
- capability search/show/add/update/audit helpers

Current estimate: code intelligence is roughly 5–10% of the desired final system, not 1%. It has deterministic local primitives but not yet deep semantic indexing, run scoring, adaptive context selection, or benchmark-proven gains.

## 10x measurement categories

We need to score the harness, not just the model.

### Task achievement

- task success rate
- patch correctness
- test pass rate
- regression rate
- final answer usefulness

### Tool efficiency

- tool calls to solution
- repeated/duplicate calls
- failed tool calls
- shell-vs-native tool ratio
- time to first useful evidence

### Token/context efficiency

- input tokens per solved task
- output tokens per solved task
- relevant-context ratio
- raw/noisy output avoided
- context retrieval precision/recall

### Code intelligence

- time to locate relevant files
- number of files read before first correct plan
- symbol/file outline quality
- architecture map usefulness
- context pack completeness

### Delegation/subagents

- correct decision to delegate or not
- child task clarity
- child result usefulness
- parallel speedup
- synthesis quality
- wasted child runs

### Skill usage and improvement

- correct skill selected
- skill load latency
- skill instruction usefulness
- stale/missing skill detection
- skill rewrite/improvement quality

### Safety and governance

- contract compliance
- source/runtime drift caught
- secret/path safety
- risky file edits gated
- validation before final claim

### Memory and improveability

- lessons captured
- repeated mistake rate
- preference/taste retention
- capability/test/changelog updates after feature work
- benchmark trend improvement

### Operator experience

- readiness clarity
- actionable diagnostics
- TUI/status clarity
- replay/debuggability
- human intervention required

## External benchmark research targets

Research these for ideas, not blind adoption:

- SWE-bench / SWE-bench Verified — coding patch success.
- Terminal-Bench — terminal task execution.
- AgentBench — broad agent task categories.
- ToolBench / APIBench-style tool-use benchmarks — tool selection and API use.
- WebArena / WorkArena — long-horizon web workflows.
- τ-bench / tau-bench — tool-agent reliability in simulated domains.
- BrowseComp / information retrieval benchmarks — difficult evidence finding.
- HumanEval / MBPP only as low-level coding signal, not harness signal.
- OpenAI/Anthropic/Sourcegraph/Cognition/Cursor/Windsurf/Continue/OpenHands/OpenCode public docs for agent loop, context, eval, and tool design patterns.

## SISO-specific benchmark philosophy

Public benchmarks measure model+agent quality. SISO also needs harness-native evals:

- same model, different harness version
- same task, with/without code intelligence tools
- same task, with/without contracts/drift/readiness
- same task, single agent vs delegated agents
- same task, baseline shell tools vs native tooling actions

This isolates harness improvements from model improvements.

## Next three build lanes

### 1. Harness Benchmark and Scorecard

Build a benchmark registry and scorecard schema that measures the categories above. Start cheap/local, then add public benchmark subsets.

Deliverables:

- `benchmarks/harness/benchmark-plan.json`
- `benchmarks/harness/scorecard.schema.json`
- `scripts/smoke-harness-benchmark.mjs`

### 2. Code Intelligence Layer v1 -> v10

Expand existing tooling actions into first-class agent tools and score them with benchmarks.

Near-term upgrades:

- add result ranking and path priors
- add multi-file context packing with citations
- add better symbol extraction for JS/TS/MD/shell
- add repo briefing templates by task type
- add stale/dead-file/test-gap detectors
- add code-intel benchmark tasks

### 3. Flight Recorder and Run Scorecards

Capture structured run traces and score them.

Needed fields:

- task
- model/profile
- tools called
- files read/changed
- child agents spawned
- contracts matched
- commands run
- token/time/tool metrics
- final result
- benchmark score

This powers replay, agent reputation, memory, model bakeoffs, and automatic improvement loops.

## Current best next action

Create the harness benchmark/scorecard scaffolding, then add code-intelligence benchmark tasks that prove native tooling beats shell-only exploration.
