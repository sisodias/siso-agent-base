# Adopt Karpathy-Inspired Harness Patterns

## Decision

Use the Karpathy/context-engineering research slice as inspiration for four small Pi Harness Lab primitives:

1. `pi-council`: a Bifrost-routed multi-model deliberation tool.
2. `karpathy-kernel`: a small behavior guardrail for implementation/review agents.
3. `context-packet`: a structured payload for subagent dispatch.
4. `verification-templates`: short reusable checks for understanding, implementation, and factual claims.

Do not import `llm-council`, `llm-council-plus`, or `Context-Engineering` wholesale.

## Rationale

The useful parts are control loops and schemas, not frameworks:

- `llm-council` proves a simple three-stage deliberation loop.
- `llm-council-plus` shows the operational features a real version needs: provider routing, modes, search grounding, settings, progress, and abort behavior.
- `andrej-karpathy-skills` is already small enough to translate directly into Pi skill/kernel form.
- `Context-Engineering` has useful references for context packets, retrieval, evaluation, and slash-command agent structure, but is too broad for direct adoption.

## Consequences

- Pi Harness Lab keeps Bifrost as the only model router.
- Council behavior becomes a tool/mode rather than a separate app.
- Subagents get structured context instead of ad hoc prompts.
- Agent outputs can be evaluated against explicit success criteria and verification templates.

## Follow-Up

Draft `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/pi-council-prototype.md` with API shape, schemas, storage paths, and a minimal implementation plan.
