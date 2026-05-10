# Pi Harness Profile Taxonomy

Date: 2026-05-05

## Principle

Profiles are composed, not hand-invented:

`profile = model lane + role + tool pack + context tier + state policy`

This keeps Shaan's foreground agent as the best interactive profile while child agents get cheaper, narrower profiles selected automatically by the router.

## Model Lanes

| Lane | Route | Use |
| --- | --- | --- |
| `minimax` | `claude-haiku-4-5-20251001` -> `MiniMax-M2.7-highspeed` | Free bulk reads, fan-out, simple edits, verification |
| `gpt54mini` | `gpt-5.4-mini` -> `CodexOpenAI/gpt-5.4-mini` | Cheap OpenAI-native structured output, JSON, schemas, tool-call-sensitive work |
| `spark` | `claude-sonnet-*` -> `gpt-5.3-codex-spark` | Serious coding worker, multi-file edits, synthesis, review |
| `gpt55` | `claude-opus-*` -> `gpt-5.5` | Planning, architecture, oracle calls |
| `codex` | Codex CLI/review path | Adversarial review, weird failures, rescue |

## Initial Profile Registry

| Profile | Role | Model | Context | State | Purpose |
| --- | --- | --- | --- | --- | --- |
| `minimax.scout` | scout | MiniMax | none | stateless | Bulk read/search/recon fan-out |
| `minimax.worker` | worker | MiniMax | project | task-state | Small scoped edits from explicit briefs |
| `minimax.verifier` | verifier | MiniMax | project | task-state | Tests, lint, build checks, file assertions |
| `gpt54mini.scout` | scout | GPT-5.4 Mini | none | stateless | Strict parsing, structured extraction, JSON summaries |
| `gpt54mini.worker` | worker | GPT-5.4 Mini | project | task-state | Cheap OpenAI-native edits involving schemas/tool contracts |
| `gpt54mini.verifier` | verifier | GPT-5.4 Mini | project | task-state | JSON/schema/tool-call validation |
| `spark.worker` | worker | Spark | project | sprint-worktree | Harder multi-file execution and sprint work |
| `spark.reviewer` | reviewer | Spark | project | task-state | Code review, synthesis, taste checks |
| `gpt55.planner` | planner | GPT-5.5 | full | advisory | Architecture and TASK_BOARD planning |
| `gpt55.oracle` | oracle | GPT-5.5 | project | advisory | Talk-to-God advisory decision for other agents |
| `codex.rescue` | rescue | Codex | project | advisory | Weird bugs, repeated failures, rescue |
| `codex.review` | reviewer | Codex | project | advisory | Adversarial/security review |

## Context Tiers

| Tier | Load |
| --- | --- |
| `none` | Only task brief and kernel |
| `topology` | Workspace git topology and repo map |
| `agents` | Active Agent OS registry |
| `library` | SISO Library indexes |
| `project` | Nearest project `CLAUDE.md`, `.siso-wiki/index.md`, project lessons |
| `full` | Full curated planning context, used sparingly |

## Current Implementation

- Bifrost route added: `gpt-5.4-mini` and `gpt-mini` alias route to `CodexOpenAI/gpt-5.4-mini`.
- Pi model list includes `gpt-5.4-mini`.
- `siso-agent-router` has a profile registry in `packages/siso-agent-router/src/profile-registry.ts`.
- Routing policy selects GPT-5.4 Mini for structured JSON/schema/tool-call work.
- Direct route smoke passed: `pi-codex --model gpt-5.4-mini` returned `GPT MINI OK`.

## Next Implementation Slice

1. Build the spawn layer around this registry.
2. Add context-tier loading for `project`, `.siso-wiki`, and lessons.
3. Add dashboard/status output for profile, lane, model, tool pack, context tier, Bifrost tokens, and child-agent lifecycle.
