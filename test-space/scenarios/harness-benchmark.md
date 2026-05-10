# Scenario: Harness Benchmark and Scorecard

Goal: prove SISO has a structured measurement layer for 10x harness work.

Run:

```bash
npm run smoke:harness-benchmark
```

Pass criteria:

- benchmark plan is valid
- scorecard schema exists
- task files exist
- referenced npm commands exist
- result summary is written to `benchmarks/harness/results/`
