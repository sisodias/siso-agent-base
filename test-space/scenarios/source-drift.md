# Scenario: Source Drift Detector

Goal: detect whether workspace source, release metadata, smoke scripts, capability registry, contracts, test-space, and installed runtime agree.

Run:

```bash
npm run smoke:source-drift
```

Output:

```txt
test-space/results/source-drift-report.json
```

Pass criteria:

- no structural errors
- version metadata agrees
- capability/test/contract references are valid
- install drift is reported as warning unless strict mode is used

Strict mode:

```bash
node scripts/smoke-source-drift.mjs --strict
```
