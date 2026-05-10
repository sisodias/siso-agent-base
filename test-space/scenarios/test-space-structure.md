# Scenario: Test Space Structure

Goal: prove the test space links capability registry entries to suites, scenarios, coverage, and npm commands.

Run:

```bash
npm run smoke:test-space
npm run smoke:test-space-coverage
```

Pass criteria:

- suites reference real capability IDs
- suite npm commands exist
- scenario files exist
- coverage rows cover every capability
- coverage summary can be generated under `test-space/results/`
