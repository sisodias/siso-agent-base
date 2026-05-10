# SISO Test Space

A repo-owned lab for proving SISO capabilities work and for storing improvement data discovered while testing.

## How it links to capabilities

`docs/capabilities/registry.json` says what SISO has or wants.

`test-space/test-plan.json` says how each capability is proven.

The link is `capabilityId`:

```json
{
  "id": "tui-workbench",
  "capabilityId": "tui-demo-workbench",
  "commands": ["npm run smoke:tui-demo"]
}
```

This lets agents answer:

- capability exists, but does it have a test?
- test exists, but does the npm command still exist?
- feature is validated, but when was it last tested?
- feature is missing, blocked, flaky, or needs future work?

## Existing testing locations this consolidates

Current SISO testing was already spread across:

- `scripts/smoke-*.mjs` — executable smoke tests.
- `package.json` — smoke command registry and `smoke:all` chain.
- `artifacts/tui-demo/` — generated TUI demo snapshots/gallery output.
- `docs/superpowers/plans/` — implementation plans with test steps.
- `docs/decisions/` — research/bakeoff decisions and results.
- `tasks/lessons.md` — learned testing/agent behavior notes.
- `.pi/session-context/` — session shutdown summaries/context memory.

`test-space/` does not replace those immediately. It indexes and coordinates them.

## Files

- `test-plan.json` — capability-linked test matrix.
- `coverage.json` — generated capability/test coverage report.
- `scenarios/` — focused scenario specs for manual or automated tests.
- `results/` — generated/local run outputs; keep large/raw logs out of git unless useful.
- `notes/improvements.md` — future improvement backlog discovered while testing.

## Agent workflow

1. Check `docs/capabilities/registry.json` for the capability.
2. Check `test-space/test-plan.json` for a suite with the same `capabilityId`.
3. If missing, add a suite or mark why it is manual/blocked.
4. Run the listed commands.
5. Store short results or important artifacts under `test-space/results/`.
6. Put future work in `test-space/notes/improvements.md`.
7. If the capability was newly proven, update capability status/validation and changelog candidates.

Validate with:

```bash
npm run smoke:test-space
```
