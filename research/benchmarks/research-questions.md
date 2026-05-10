# Benchmark Research Questions

Use this when researching internet/GitHub/Sourcegraph.

## For every benchmark/project

- What exactly is scored?
- What is the unit of work: task, issue, episode, tool call, trajectory, patch?
- Does it measure model quality, harness quality, or both?
- Can we run a cheap local subset?
- What metrics should SISO copy/adapt?
- What metrics are missing that SISO should pioneer?
- What artifacts does it store: logs, trajectories, diffs, tests, scorecards?
- How does it handle partial credit?
- How does it prevent benchmark overfitting?
- What would a 10x harness do better than this benchmark currently measures?

## SISO-specific metrics to add

- token efficiency per solved task
- context precision/recall
- duplicate tool-call rate
- native-tool vs shell fallback ratio
- correct skill selection
- skill improvement quality
- delegation decision quality
- child task clarity
- child result usefulness
- contract compliance
- source drift caught before release
- memory/improvement captured after task
- operator readiness clarity
