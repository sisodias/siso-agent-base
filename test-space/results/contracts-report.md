# SISO Contract Diff Report

Generated: 2026-05-10T07:49:48.814Z

Changed files: 594
Matched contracts: 7

## Required commands

- `npm run smoke:agents-command`
- `npm run smoke:capabilities`
- `npm run smoke:child-control`
- `npm run smoke:child-notifications`
- `npm run smoke:composite-result`
- `npm run smoke:context`
- `npm run smoke:context-details`
- `npm run smoke:context-explain`
- `npm run smoke:context-tier`
- `npm run smoke:contracts`
- `npm run smoke:doctor`
- `npm run smoke:release`
- `npm run smoke:router-lean`
- `npm run smoke:source-drift`
- `npm run smoke:spawn-result`
- `npm run smoke:status-lean`
- `npm run smoke:subagent-lifecycle`
- `npm run smoke:test-space`
- `npm run smoke:test-space-coverage`
- `npm run smoke:tui-demo`
- `npm run smoke:where`
- `npm run smoke:wrapper`

## Permission-gated contracts

- router-subagents

## Matched contracts

### release-metadata

Level: required

Changed files:
- `CHANGELOG.md`
- `VERSION`
- `package.json`
- `releases/latest.json`

### capability-registry

Level: required

Changed files:
- `docs/capabilities/README.md`
- `docs/capabilities/agent-tooling-roadmap.md`
- `docs/capabilities/changelog-candidates.md`
- `docs/capabilities/current.md`
- `docs/capabilities/ideas.md`
- `docs/capabilities/lazy-tool-discovery.md`
- `docs/capabilities/registry.json`
- `docs/capabilities/session-scoped-agent-runtime.md`
- `docs/capabilities/tool-scenario-cards.md`
- `docs/contracts/README.md`
- `docs/contracts/agent-final-check.md`
- `docs/contracts/contracts.json`
- `scripts/smoke-capability-registry.mjs`
- `scripts/smoke-contracts.mjs`

### test-space

Level: required

Changed files:
- `scripts/smoke-test-space-coverage.mjs`
- `scripts/smoke-test-space.mjs`
- `test-space/README.md`
- `test-space/coverage.json`
- `test-space/extension-catalog-fixtures/detail-pi-memory-lite.html`
- `test-space/extension-catalog-fixtures/detail-pi-subagents.html`
- `test-space/extension-catalog-fixtures/packages-page-1.html`
- `test-space/extension-catalog-fixtures/pi-subagents-0.24.0.tgz`
- `test-space/notes/improvements.md`
- `test-space/results/contracts-report.json`
- `test-space/results/contracts-report.md`
- `test-space/results/coverage-summary.json`
- `test-space/results/flight-analysis.json`
- `test-space/results/flight-analysis.md`
- `test-space/results/flight-recorder-summary.json`
- `test-space/results/flight-runs/code-intel-2026-05-09T17-49-47-616Z.json`
- `test-space/results/flight-runs/code-intel-2026-05-09T17-50-40-292Z.json`
- `test-space/results/flight-runs/context-filter-2026-05-09T17-45-47-967Z.json`
- `test-space/results/flight-runs/doctor-readiness-2026-05-09T17-05-21-017Z.json`
- `test-space/results/flight-runs/doctor-readiness-2026-05-09T17-11-14-767Z.json`
- `test-space/results/flight-runs/doctor-readiness-2026-05-09T17-18-45-174Z.json`
- `test-space/results/flight-runs/doctor-readiness-2026-05-09T17-19-14-638Z.json`
- `test-space/results/flight-runs/doctor-readiness-2026-05-09T17-19-16-621Z.json`
- `test-space/results/flight-runs/doctor-readiness-latest.json`
- `test-space/results/flight-runs/index.json`
- `test-space/results/source-drift-report.json`
- `test-space/scenarios/agent-contracts.md`
- `test-space/scenarios/agent-tooling.md`
- `test-space/scenarios/autopilot-fix-loop.md`
- `test-space/scenarios/autopilot-verifier-plan.md`
- `test-space/scenarios/benchmark-research.md`
- `test-space/scenarios/capability-registry.md`
- `test-space/scenarios/context-tools.md`
- `test-space/scenarios/contract-diff-report.md`
- `test-space/scenarios/doctor-and-launcher.md`
- `test-space/scenarios/doctor-readiness.md`
- `test-space/scenarios/flight-recorder.md`
- `test-space/scenarios/gather-context.md`
- `test-space/scenarios/harness-benchmark.md`
- `test-space/scenarios/native-output-polish.md`
- `test-space/scenarios/output-style-preflight.md`
- `test-space/scenarios/related-checks.md`
- `test-space/scenarios/release-metadata.md`
- `test-space/scenarios/repo-index.md`
- `test-space/scenarios/session-scoped-agent-runtime.md`
- `test-space/scenarios/source-drift.md`
- `test-space/scenarios/subagent-surfaces.md`
- `test-space/scenarios/test-space-structure.md`
- `test-space/scenarios/tool-scenario-cards.md`
- `test-space/scenarios/tui-workbench.md`
- `test-space/test-plan.json`

### tui-workbench

Level: required

Changed files:
- `docs/research/siso-r1-tui-component-inventory.md`
- `docs/research/siso-r1-tui-rebuild-lessons.md`
- `docs/research/siso-tui-workbench.md`
- `scripts/tui-demo-components/index.mjs`
- `scripts/tui-demo-components/theme.mjs`
- `scripts/tui-demo-gallery.mjs`
- `scripts/tui-demo.mjs`

### router-subagents

Level: permission-gated

Changed files:
- `extensions/siso-agent-router/agent-prompts.js`
- `extensions/siso-agent-router/agent-runner.js`
- `extensions/siso-agent-router/agent-scorecards.d.ts`
- `extensions/siso-agent-router/agent-scorecards.js`
- `extensions/siso-agent-router/check-tools.js`
- `extensions/siso-agent-router/child-control.js`
- `extensions/siso-agent-router/codex-case-packet.js`
- `extensions/siso-agent-router/council-layer.d.ts`
- `extensions/siso-agent-router/council-layer.js`
- `extensions/siso-agent-router/extension-adapter.d.ts`
- `extensions/siso-agent-router/extension-adapter.js`
- `extensions/siso-agent-router/extension-catalog.d.ts`
- `extensions/siso-agent-router/extension-catalog.js`
- `extensions/siso-agent-router/index.js`
- `extensions/siso-agent-router/mailbox-feed.d.ts`
- `extensions/siso-agent-router/mailbox-feed.js`
- `extensions/siso-agent-router/native-subagent-bridge.d.ts`
- `extensions/siso-agent-router/native-subagent-bridge.js`
- `extensions/siso-agent-router/notifications.js`
- `extensions/siso-agent-router/output-style.js`
- `extensions/siso-agent-router/project-agent-registry.d.ts`
- `extensions/siso-agent-router/project-agent-registry.js`
- `extensions/siso-agent-router/route-policy.js`
- `extensions/siso-agent-router/session-store.js`
- `extensions/siso-agent-router/skill-hub.d.ts`
- `extensions/siso-agent-router/skill-hub.js`
- `extensions/siso-agent-router/spawn-layer.d.ts`
- `extensions/siso-agent-router/spawn-layer.js`
- `extensions/siso-agent-router/specialist-registry.js`
- `extensions/siso-agent-router/subagent-supervisor.d.ts`
- `extensions/siso-agent-router/subagent-supervisor.js`
- `extensions/siso-agent-router/task-registry.js`
- `extensions/siso-agent-router/task-scheduler.d.ts`
- `extensions/siso-agent-router/task-scheduler.js`
- `extensions/siso-agent-router/task-store.d.ts`
- `extensions/siso-agent-router/task-store.js`
- `extensions/siso-agent-router/tooling-actions.js`
- `extensions/siso-agent-router/workflow-layer.d.ts`
- `extensions/siso-agent-router/workflow-layer.js`

Risk files touched:
- `extensions/siso-agent-router/index.js`
- `extensions/siso-agent-router/native-subagent-bridge.js`
- `extensions/siso-agent-router/spawn-layer.js`

### context-safety

Level: required

Changed files:
- `scripts/smoke-context-details-compact.mjs`
- `scripts/smoke-context-details.mjs`
- `scripts/smoke-context-explain.mjs`
- `scripts/smoke-context-filter.mjs`

### install-runtime

Level: required

Changed files:
- `VERSION`
- `bin/siso`
- `bin/siso-doctor`
- `bin/siso-update`
- `bin/siso-where`
- `install.sh`
- `package.json`
- `releases/latest.json`
- `scripts/install-local.sh`
