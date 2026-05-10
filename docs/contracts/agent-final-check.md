# Agent Final Contract Check

Before claiming work is complete, agents should run the contract diff check:

```bash
node scripts/smoke-contracts.mjs --changed
```

This writes:

```txt
test-space/results/contracts-report.json
```

Use the report to answer:

- Which contracts matched changed files?
- Which commands are required?
- Were any permission-gated/risky files touched?
- What evidence should be included in the final response?

## Final response evidence format

```txt
Contracts matched:
- contract-id: required commands / risk notes

Validation run:
- npm run ... ✅/❌/skipped because ...

Unresolved risks:
- none / list
```

## Current limitation

This is diff-aware and advisory. It does not yet verify command history automatically. Future work should connect it to the structured event stream / flight recorder so required validation can be proven from run events.
