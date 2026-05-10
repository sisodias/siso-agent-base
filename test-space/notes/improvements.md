# Test Space Improvement Backlog

## Near-term

- Add `siso test-space list` / `siso test-space run <suite>` commands.
- Add generated coverage report: capabilities with no test suite.
- Add result snapshots under `test-space/results/` for important release runs.
- Add blocked status handling for currently broken subagent suites.

## Future

- Connect capability registry entries directly to test suites.
- Auto-suggest new tests when capabilities are added.
- Add scorecards: pass/fail history, flake count, last validated version.
- Add sandbox/lab runs for risky agent changes before applying to source.

## Linkage model

- Add generated coverage: every capability should show `covered`, `manual`, `blocked`, or `untested`.
- Pull command existence from `package.json` and validation claims from `docs/capabilities/registry.json`.
- Add suite statuses for `active`, `manual`, `blocked`, `flaky`, and `retired`.

## Coverage priorities from first audit

Current generated summary:

- 53 total capabilities
- 6 first-class covered in test-space suites
- 27 externally covered by existing smoke/package paths
- 13 manual
- 1 blocked: live subagents
- 6 idea-only
- 0 fully untracked

Next sewing work:

1. Convert external smoke-backed capabilities into explicit test-plan suites.
2. Add dedicated smokes for manual capabilities that matter most: role prompt contracts, global task registry, repo catalog, handoff packets, worker guard.
3. Keep blocked subagent suite visible until subagents are fixed.
4. Generate coverage.json automatically instead of maintaining it manually.

## Flight recorder analysis findings

The flight recorder now generates reusable improvement data:

- `test-space/results/flight-analysis.json`
- `test-space/results/flight-analysis.md`

Current recurring recommendations include collecting more runs, wiring file.read events, child-agent events, and context.filtered events, and repairing install/runtime drift when it repeats.
