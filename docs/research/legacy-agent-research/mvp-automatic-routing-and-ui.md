# MVP: Automatic Routing And Claude-Like Pi UI

Date: 2026-05-05

## Decision

Keep `pi-codex` as the best foreground profile Shaan runs directly. Do not make Shaan choose manual `lean`, `code`, or `full` modes.

Instead, build automatic routing inside the harness:

- foreground session: best interactive profile, compact kernel, core tools, Bifrost routing
- scout subagents: MiniMax/Haiku for bulk recon, GPT-5.4 Mini for structured extraction, no inherited transcript unless needed
- edit workers: MiniMax, GPT-5.4 Mini, or Spark, edit/write/bash only when task needs mutation
- review workers: Spark or Codex-style reviewer, no write tools by default
- planning/architecture: GPT-5.5 only when the task needs deep/global context
- worktrees: allocated per sprint/task, not per subagent

## What We Verified

The isolated Pi profile works through Bifrost:

- `claude-haiku-4-5-20251001` routes to `MiniMax-M2.7-highspeed`
- `gpt-5.4-mini` routes to `gpt-5.4-mini`
- `claude-sonnet-4-6` routes to `gpt-5.3-codex-spark`
- `claude-opus-4-7` routes to `gpt-5.5`

Bifrost rows show the trimmed Pi profile is already much smaller than the earlier Claude Code payloads:

| Scenario | Prompt tokens | Tool chars |
| --- | ---: | ---: |
| Spark no tools/context/skills | 438 | 0 |
| GPT no tools/context/skills | 780 | 0 |
| GPT-5.4 Mini no tools/context/skills | 928 | 0 |
| Haiku tool call | 833-1082 | 1,154 |
| Pi default before skill-router trim | 5,215 | 4,994 |
| Pi default after skill-router trim | 1,410 | 4,994 |
| Explicit skill-router only | 773 | 0 |

## UI Findings

Pi can show tool and subagent usage in the CLI. The local Pi runtime exposes:

- tool events: `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `tool_call`, `tool_result`
- agent/model events: `before_agent_start`, `agent_start`, `agent_end`, `model_select`, `turn_start`, `turn_end`
- UI APIs: `ctx.ui.setStatus`, `ctx.ui.setWidget`, `ctx.ui.setFooter`, `ctx.ui.setHeader`, `ctx.ui.setWorkingMessage`
- tool renderers: `renderCall(args, theme, context)` and `renderResult(result, state, theme, context)`
- RPC events for custom external UIs if the terminal UI is not enough

## Best External Pieces To Copy Or Install

| Package | Use |
| --- | --- |
| `pi-claude-style-tools` | Claude-style compact tool rows, diffs, bash/read/grep/edit/write rendering |
| `pi-powerline-footer` | Footer/status bar, custom extension status slots, prompt history UX |
| `@tintinweb/pi-subagents` | Claude-like background subagent UI, progress widget, completion blocks |
| `pi-subagents` | Structured `/run`, `/chain`, `/parallel`, agent frontmatter, async state files |
| `pi-agentteam` | Team/mailbox orchestration without making worktrees the default primitive |

Use `pi-crew` and `@pi-unipi/unipi` as references, not first installs. They are useful but have more workflow surface and can create cleanup sprawl.

## MVP Build Order

1. Finish `siso-status`: footer/status widget for route, model, prompt tokens, tool chars, current tool, current skill, and Bifrost request id.
2. Install or vendor `pi-claude-style-tools` in the isolated `.pi-bifrost` profile to improve tool readability without adding prompt bloat.
3. Prototype `siso-agent-router`: a Pi extension that exposes one subagent tool and chooses model/tools/context automatically.
4. Add agent profiles: `scout`, `worker`, `reviewer`, `planner`.
5. Add Bifrost attribution: write per-request sections for kernel chars, skill chars, tool chars, user chars, and history chars.
6. Run comparison prompts against `claude-codex` and `pi-codex`: read/search/edit/test/subagent.

## Implemented So Far

- `siso-status` now publishes live footer/widget state and tracks provider payload size from `before_provider_request`.
- `siso-agent-router` now has a profile registry, pure routing policy, plus `/siso-route` and `siso_route` surfaces.
- Unit tests cover status payload sizing and routing decisions for MiniMax, GPT-5.4 Mini, Spark, GPT-5.5, Codex, and sprint worktree policy.
- Smoke test through `pi-codex` successfully called `siso_route` and selected `kind=scout`, `model=claude-haiku-4-5-20251001` for Pi source inspection.

## Agent Router Policy

The main agent should decide routing from task shape:

| Task shape | Route |
| --- | --- |
| read/search/research | `minimax.scout`, MiniMax/Haiku, `read,grep,find,ls,bash`, no worktree |
| structured extraction / JSON / tool-call schema | `gpt54mini.scout` or `gpt54mini.verifier`, GPT-5.4 Mini |
| test/build verification | `minimax.verifier`, MiniMax/Haiku, bash plus read-only inspection |
| small edit | `minimax.worker`, MiniMax/Haiku, edit/write/bash, current workspace |
| strict schema/tooling edit | `gpt54mini.worker`, GPT-5.4 Mini, edit/write/bash |
| multi-agent sprint | `spark.worker`, create one task worktree, then run multiple workers inside it |
| architecture/global plan | `gpt55.planner`, GPT-5.5, no write tools unless explicitly executing |
| talk-to-God advisory call | `gpt55.oracle`, GPT-5.5, advisory only |
| adversarial review / weird rescue | `codex.review` or `codex.rescue`, Codex route |

## Sources

- https://pi.dev/packages/pi-claude-style-tools
- https://pi.dev/packages/pi-powerline-footer
- https://pi.dev/packages/pi-subagents
- https://github.com/tintinweb/pi-subagents
- https://pi.dev/docs/latest/usage
- Local Pi API: `/Users/shaansisodia/.npm-global/lib/node_modules/@mariozechner/pi-coding-agent/docs/extensions.md`
- Local Pi API: `/Users/shaansisodia/.npm-global/lib/node_modules/@mariozechner/pi-coding-agent/docs/rpc.md`
