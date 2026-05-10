# Changelog Candidates

Release agents should review this file before updating `CHANGELOG.md`.

## Pending

### Added

- No pending release candidates.

## Consumed

- Add initial SISO Capability Registry to track existing capabilities, missing ideas, validations, and changelog candidates.
- Implement Tool Scenario Cards with seeded code-intelligence/validation cards, benchmark suite, test-space coverage, and smoke validation.
- Document Tool Scenario Cards so tool discovery teaches agents when and when not to use each tool.
- Document Lazy Tool Discovery and Loading so future agents can find large tool universes without context bloat.
- Implement Agent Tooling Roadmap actions with smoke coverage for faster coding-agent repo interaction.
- Document Agent Tooling Roadmap and add `agent-tooling-roadmap` capability entry for future coding-agent tool implementation.
- Add SISO Test Space for capability-linked test plans, scenarios, results, and improvement backlog tracking.
- Add test-space coverage audit smoke and generated coverage summary for capability-linked testing.
- Add draft Agent Contracts research, contract registry, and smoke validation for subsystem-specific agent rules.
- Add Source Drift Detector smoke/report for version, install/runtime, capability, test-space, and contract consistency.
- Add doctor readiness subcommands for drift, contracts, and combined readiness checks.
- Add 10x Agent Harness roadmap plus benchmark/scorecard scaffolding for harness-level metrics and external benchmark research targets.
- Add Benchmark Research Inbox for external agent benchmark/GitHub/Sourcegraph research and SISO metric extraction.
- Add Flight Recorder schema, example trace, and smoke validation for future run replay/scorecard evidence.
- Add doctor-readiness flight recorder that captures real validation/contract/drift evidence into a run trace.
- Add Flight Recorder analysis loop that turns recorded runs into validation rates, event counts, risks, and improvement recommendations.
- Add context-filter flight recorder to capture context.filtered events and context-efficiency evidence.
- Add code-intelligence flight recorder to capture native tooling use, file-read evidence, and code-intelligence metrics.
- Add SISO output-style/preflight guidance so agents acknowledge direction before tool-heavy work and produce cleaner final summaries.
- Add V2 readiness smoke coverage that prevents stale capability docs, missing readiness wiring, and leftover temporary recorder artifacts from drifting into a V2 release.
- Refresh capability docs so Source Drift Detector, Agent Contracts, and Flight Recorder are no longer listed as idea-only capabilities.
- Add the Autopilot Verifier Loop design contract plus smoke coverage for the controller/worker/read-only-verifier layout.
- Add `autopilotPlan`, a no-edit runtime slice for building compact checkpoint/check/verifier/feedback plans before the full autopilot loop exists.
- Add an Autopilot Tool Scenario Card and tool-selection eval case so agents can discover the verifier-plan tool for post-implementation specification checks.
- Implement Related Checks and Gather Context execution-intelligence helpers with router wiring, scenario cards, Test Space coverage, and smoke tests.
- Implement Repo Index v1 with cached file/symbol/import metadata, Sourcegraph-lite `codeQuery`, router wiring, scenario cards, Test Space coverage, and smoke tests.
- Implement Autopilot Fix Loop with bounded validation runs, unsafe-command blocking, failure summaries, gathered repair context, scenario cards, Test Space coverage, and smoke tests.
