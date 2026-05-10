# Harness Feature Intake

Pi Harness Lab has two research funnels:

- Broad catalog: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/pi-ecosystem-broad-candidate-catalog.json`
- Cloned-source catalog: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/repo-candidate-catalog.json`

Use the `siso` repo recommender to turn those catalogs into buildable harness features:

```text
Use siso with action="repo" op="recommend" catalog="both" limit=8.
Use siso with action="repo" op="recommend" catalog="both" query="subagent" limit=5.
Use siso with action="repo" op="recommend" catalog="cloned" priority="A" limit=5.
```

The recommender ranks feature families by catalog evidence instead of listing raw repos. It currently recognizes:

- subagent runtime
- session memory
- context pruning
- codebase map
- task workflow
- safety and permissions
- status and telemetry
- provider/MCP bridge

## Current Research Consensus

The strongest next build slices from the existing research are:

1. Context pack and repo summarization from Repomix.
2. Zero-setup code brain search from the current `rg` adapter.
3. Optional graph augmentation after read/search from `pi-gitnexus`.
4. Task registry and dependency lifecycle from `pi-tasks`.
5. File-backed plan state from `planning-with-files`.
6. Policy-routed subagent runtime from the Pi subagent packages.
7. Persistent memory queue from hook-queue memory plugins.
8. Supervisor-lite outcome checking from `pi-supervisor`.
9. Status, diagnostics, and token accounting from the current dashboard plus Pi status packages.

## Rule

Before adding a heavy dependency, run the recommender, inspect the top source implementation, then build the smallest Pi-native adapter behind `siso`.
