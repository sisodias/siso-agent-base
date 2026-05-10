# Current SISO Capabilities

Maintained from `registry.json`. Last audited: 2026-05-10.

This file is a human-readable snapshot. `docs/capabilities/registry.json` remains the source of truth.

## Validated / Implemented
- Gather Context — `npm run smoke:gather-context`
- Related Checks — `npm run smoke:related-checks`

### Feature memory and release

- Capability Registry — `npm run smoke:capabilities`
- SISO Test Space — `npm run smoke:test-space`
- Test Space Coverage Audit — `npm run smoke:test-space-coverage`
- Changelog Candidate Collector — manual release-note inbox
- Composite Smoke Suite — `npm run smoke:all`
- Release Metadata Smoke — `npm run smoke:release`
- Source Drift Detector — `npm run smoke:source-drift`
- V2 Readiness Smoke — `npm run smoke:v2-readiness`

### Launcher, install, doctor

- SISO Wrapper Launcher — `npm run smoke:wrapper`, `npm run smoke:where`
- Install Update Repair — installer/update/doctor repair paths
- SISO Doctor — `npm run smoke:doctor`
- Doctor Readiness — `npm run smoke:doctor-readiness`

### Routing and providers

- Route Policy — `npm run smoke:router-lean`
- Permission Aware Routing
- Profile Registry
- Bifrost Gateway Routing — `npm run smoke:bifrost-dashboard`, `npm run smoke:bifrost-duplicates`
- Lean Router Surface — compact router outputs

### Subagents and orchestration

- Child Agent Spawn
- Native Subagent Bridge
- Child Agent Notifications
- Child Run Control
- Child Control Isolation and Safety
- Spawn Result Normalization
- Composite Result Compaction
- Runtime Guardrails
- Fleet Queue Control
- Agents Command Surface
- Agent Handoff Packets
- Worker Guard
- Council Orchestration
- Workflow Orchestration

### Tasks, context, skills

- Durable Task Store
- Task Scope Management
- Context Filtering and Retrieval
- Context Memory Tools
- Skill Loading
- Skill Slash Command

### Code intelligence and tooling

- Agent Tooling Roadmap — `npm run smoke:agent-tooling`
- Public Code Search — Sourcegraph-backed compact public code lookup
- Ranked Repo Map — task-weighted local repo map, first tool in the repo-navigation pack
- Repo Index v1 — `npm run smoke:repo-index`
- Tool Scenario Cards — `npm run smoke:tool-scenario-cards`
- Tool Packs — `npm run smoke:tool-packs`
- Lazy Tool Schema Loading — `npm run smoke:tool-schema-lazy`
- Tool Selection Eval — `npm run smoke:tool-selection-eval`
- Tool Adoption Telemetry — recommend/load/unload/stats events
- Autopilot Verifier Plan — `npm run smoke:autopilot-plan`, `npm run smoke:autopilot-verifier`
- Autopilot Fix Loop — `npm run smoke:autopilot-fix-loop`

### Observability and status

- Structured Event Stream — partial/current event formatting exists; full append-only event log is still planned
- Status Agent Widget
- Lean Status Surface
- Status Timeline
- Bifrost Dashboard
- Flight Recorder MVP — schema, examples, manual recorders, and analysis loop
- Harness Benchmark Scorecard — `npm run smoke:harness-benchmark`

### Contracts and readiness

- Agent Contracts — draft registry, diff smoke, final-check docs, and readiness reporting
- Contract Diff Report — `npm run smoke:contracts`
- Output Style and Preflight Message — `npm run smoke:output-style`
- Pi Output UX Map — `npm run smoke:pi-output-map`
- Native Output Polish — `npm run smoke:native-output-polish`

### Research/catalog

- Repo Candidate Catalog
- Research Integration Queue
- Codex Case Packets
- Public Code Search 10x Hunt
- V2.1 Readiness Plan
- Autopilot Verifier Loop Design Contract — `npm run smoke:autopilot-verifier`

### Quality and docs

- Renderer Smoke Coverage
- Syntax Smoke Coverage
- Tailscale/Admin Documentation
- Lesson Log

## Missing / Proposed

- Capability Audit Smoke
- Live Event-Driven TUI
- Capability CLI
- Autopilot Smoke/Fix Loop
