# SISO Flight Recorder

Date: 2026-05-09
Status: MVP schema + example trace

## Purpose

The Flight Recorder captures what actually happened during an agent run so SISO can measure, replay, score, debug, and improve the harness.

It complements:

- Capability Registry — what exists
- Test Space — how features are tested
- Agent Contracts — what rules/evidence are required
- Source Drift — whether source/runtime/release state is consistent
- Harness Benchmarks — how runs are scored
- Tool Scenario Cards — what tools agents should choose

## Why it matters

Contracts can say `npm run smoke:capabilities` is required, but without run evidence SISO cannot know:

- whether the command ran
- whether it passed
- whether files changed after validation
- how many tool calls were wasted
- whether context was filtered
- whether child agents were useful
- whether a run improved or regressed harness quality

## MVP scope

This MVP is schema-first. It defines the run trace shape and validates example traces. Later work should wire live router/tool events into this schema.

## Core event types

- `run.started`
- `run.completed`
- `tool.started`
- `tool.completed`
- `file.read`
- `file.changed`
- `command.validation`
- `contract.matched`
- `drift.detected`
- `child.started`
- `child.completed`
- `context.filtered`
- `scorecard.updated`

## Future commands

```bash
siso replay <runId>
siso score <runId>
siso compare <runA> <runB>
siso flight list
siso flight show <runId>
```

## Design rules

- Store summaries by default; avoid raw secret/tool payloads.
- Use bounded fields and explicit pointers for large artifacts.
- Make validation evidence machine-readable.
- Track file changes after validation as a first-class risk.
- Link to contracts, capabilities, benchmark suites, and test-space results.

## MVP live recorder

The first live-ish recorder is:

```bash
npm run record:doctor-readiness-flight
```

It runs the readiness stack, captures tool/validation/contract/drift events, and writes:

```txt
test-space/results/flight-runs/doctor-readiness-latest.json
```

This is not yet a general router-integrated recorder, but it proves the trace schema can capture real validation runs and artifacts.

## Analysis loop

Use:

```bash
npm run analyze:flight-recorder
```

This reads `test-space/results/flight-runs/*.json` and writes:

```txt
test-space/results/flight-analysis.json
test-space/results/flight-analysis.md
```

The analysis currently reports validation pass rate, score trends, event counts, risks, and recommendations such as install drift repair or missing event integrations.

## Context filter recorder

Use:

```bash
npm run record:context-filter-flight
```

This records context filtering evidence and validates the context smoke suite, producing a trace under:

```txt
test-space/results/flight-runs/context-filter-<timestamp>.json
```

This gives the analysis loop measurable `context.filtered` events for context-efficiency work.

## Code intelligence recorder

Use:

```bash
npm run record:code-intel-flight
```

This records native code-intelligence/tooling primitives such as `repoSearch`, `projectTree`, `projectMap`, `fileOutline`, `symbolSearch`, `contextPack`, `briefRepo`, `toolRecommend`, and `runCheck`.

The trace includes `file.read` evidence and `codeIntelligenceMetrics` so we can compare native-tool use against future shell-heavy baselines.
