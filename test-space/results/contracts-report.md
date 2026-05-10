# SISO Contract Diff Report

Generated: 2026-05-10T08:13:58.867Z

Changed files: 221
Matched contracts: 5

## Required commands

- `npm run smoke:agents-command`
- `npm run smoke:child-control`
- `npm run smoke:child-notifications`
- `npm run smoke:composite-result`
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
- `package.json`

### test-space

Level: required

Changed files:
- `test-space/results/contracts-report.json`
- `test-space/results/contracts-report.md`
- `test-space/results/coverage-summary.json`
- `test-space/results/flight-analysis.json`
- `test-space/results/flight-analysis.md`
- `test-space/results/flight-recorder-summary.json`
- `test-space/results/source-drift-report.json`

### tui-workbench

Level: required

Changed files:
- `docs/research/siso-r1-tui-component-inventory.md`
- `docs/research/siso-r1-tui-rebuild-lessons.md`
- `docs/research/siso-tui-workbench.md`

### router-subagents

Level: permission-gated

Changed files:
- `extensions/siso-agent-router/index.js`
- `extensions/siso-agent-router/project-agent-registry.d.ts`
- `extensions/siso-agent-router/project-agent-registry.js`

Risk files touched:
- `extensions/siso-agent-router/index.js`

### install-runtime

Level: required

Changed files:
- `package.json`
