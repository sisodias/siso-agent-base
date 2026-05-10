# Scenario: Contract Diff Report

Goal: given current git changes, identify matching contracts and required validation before final response/release.

Run:

```bash
node scripts/smoke-contracts.mjs --changed
```

Outputs:

- `test-space/results/contracts-report.json`
- `test-space/results/contracts-report.md`

Pass criteria:

- command exits successfully
- matched contracts list is generated
- required commands are deduped
- permission-gated contracts are visible
