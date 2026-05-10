# Local Existing Research Notes

Initial local scan found:

- `docs/research/legacy-agent-research/pi-eval-harness-benchmark-plan.md`
- `docs/decisions/legacy-agent-research/2026-05-05-code-intelligence-adapters.md`
- `docs/capabilities/agent-tooling-roadmap.md`
- `extensions/siso-agent-router/tooling-actions.js`
- `scripts/smoke-agent-tooling.mjs`

Important finding: SISO already has local deterministic code-intelligence primitives:

- repo search
- read many
- project tree/map
- file outline
- symbol search
- context pack
- repo brief
- run check
- workspace status/diff
- capability CRUD/audit helpers

This means the next work is not inventing code intelligence from scratch. It is benchmarking, improving ranking/context quality, and exposing these primitives as first-class agent workflow tools.
