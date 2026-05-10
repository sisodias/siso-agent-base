# Research Integration Gap Map

Date: 2026-05-08

## Bottom Line

- The live SISO/Pi build is currently `0.0.1` packages, not `0.1.6`: `@siso/agent-base`, router, context manager, lifecycle, and status are all at `0.0.1`.
- The "0.1.6" memory is real, but it comes from researched Pi ecosystem packages such as `@wayaans/ramean`, `nightmanager`, `pi-bmad-flow`, `@ocodista/pi-token-bloat`, and `@dreki-gg/pi-context7`.
- We researched far more than we integrated: `110` cloned/source-reviewed repo candidates, `3,218` broad ecosystem candidates, and `63` inbox research reports.
- The harness now has a real core: global `siso` launcher, Bifrost route, context hygiene, case packets, native Pi renderer polish, status/queue UI, eval smokes, repo recommender, and native subagent bridge.
- The biggest remaining gaps are safety/rollback, file-backed planning, task dependency lifecycle, graph/code-map intelligence, session search, dynamic MCP/provider import, and a cleaner productized `~/.siso` asset registry.

## Current Integrated Surface

| Area | Integrated now | Evidence |
| --- | --- | --- |
| Global launcher | `siso` package wrapper with `chat`, `status`, `doctor`, `verify`, `setup`, `update`, and compatibility `pi-codex` path | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/agent-base/bin/siso.mjs` |
| Routing | Bifrost-first profile with Mac Mini health preflight and SISO env defaults | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/agent-base/bin/siso.mjs`, `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/CHANGELOG.md` |
| Research recommender | Catalog query/recommendation APIs for cloned and broad repo catalogs | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/repo-catalog.ts` |
| Subagents | Native `pi-subagents` bridge for direct delegation when available, legacy fallback for council/workflow | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/native-subagent-bridge.ts`, `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/pi-codex-subagent-runtime-decision.md` |
| Context hygiene | Hot-context filtering, Codex case packets, semantic/local librarian distillation, typed memory ops | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-context-manager/src/index.ts`, `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/context-hygiene-and-codex-case-packets.md` |
| UI/status | Native Pi renderer patches, compact footer/tool rows, queue commands, active child rows, monitor/dashboard scripts | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-status`, `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/scripts/patch-pi-native-renderers.mjs` |
| Evals | Local/live smokes plus `pi-evals` and ladder scaffold | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/pi-evals/README.md`, `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/package.json` |
| Open Claude Code comparison | OCC treated as feature checklist and isolated Bifrost experiment, not as source to copy | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/claude-code-feature-parity-checklist.md` |
| Global SISO design | `~/.siso/agent` and `~/.siso/agent-base` target layout documented and partially scaffolded | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/global-siso-folder-design.md`, `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/siso-agent-base-concept.md` |

## Partially Integrated From Research

| Research source | What we already absorbed | What's left |
| --- | --- | --- |
| `1jehuang/jcode` | TUI polish ideas, compact tool rendering, `pi-brain-grep`, memory budget instincts, eval/bakeoff mindset | Swarm server model, file-touch conflict warnings, provider profile UX, MCP config import, async memory sidecar |
| `yamadashy/repomix` | Context-pack direction and catalog priority | Full remote repo packing, secret scanning, tree-sitter compression, default `siso context pack` workflow |
| `tintinweb/pi-supervisor` | Outcome/verifier pattern documented in router research queue | Actual supervisor-lite turn/end verifier with stored decisions and dashboard surfacing |
| `tintinweb/pi-tasks` | Task-store and workflow shape influenced SISO task/child records | Dependency lifecycle, leases, worker execution hooks, task board UI |
| `OthmanAdi/planning-with-files` | File-backed planning accepted as design pattern | Real active plan dir resolver, `task_plan.md`/`progress.md` updates, session catch-up guardrails |
| `tintinweb/pi-gitnexus` | Graph augmentation chosen as next small adapter idea | Read/search hook augmentation, bounded appended context, deduped session graph cache |
| `nicobailon/pi-subagents` and related subagent packages | Native extension bridge and runtime decision | Prompt presets, chains/parallel UX parity, richer child status, migration of `council/workflow` to native chains where appropriate |
| `karpathy/llm-council` | SISO council concept and Bifrost-routed multi-model review | Better peer review/ranking/chairman flow and saved council decisions |
| `obra/superpowers` and Karpathy skills | Process discipline and skill candidates documented | Promote selected skills into SISO skill registry with lazy loading and verification gates |
| `ruvnet/open-claude-code` | Feature parity checklist and isolated comparison smoke | Extend bakeoff beyond text/read to grep/edit/session/permission cases |

## Mostly Not Integrated Yet

| Lane | Useful research | Needed integration |
| --- | --- | --- |
| Code graph / code brain | `deusdata-codebase-memory-mcp`, `kitara2005-code-brain`, `qartez-mcp`, `Serena`, `GitNexus`, `Understand-Anything` | A `siso codebrain` adapter contract with cheap file/symbol/import/backlink index first, heavy graph engines optional |
| Session memory | `pi-sessions`, `pi-memctx`, `session-checkpoint`, `reflect`, Hindsight-style memory | Searchable session index, handoff browser, correction memory, and "ask previous work" command |
| Safety / rollback | `pi-rewind`, `pi-heimdall`, `pi-gatekeeper`, Toolwatch-like guards | Pre-edit mutation gate, checkpoint/rewind primitive, `.env`/secret protection, foreground approval path |
| Provider / MCP | `pi-context7`, MCP import packages, Sourcegraph MCP, provider packages | Read-only MCP inspection first, then explicit opt-in adapter import; Context7/docs skill behind Bifrost-safe config |
| Workflow / planning | `pi-bmad-flow`, `nightmanager`, `@wayaans/ramean`, BMAD-related packages | Inspect before use; likely steal queue/oracle/manager patterns, not adopt package wholesale |
| UI | OpenTUI, DeepSeek TUI, OpenCode TUI, Pi status extensions | Full SISO session picker, subagent cards, foreground event stream, prompt queue management |
| External benchmarks | EvalPlus, Aider Polyglot, Terminal-Bench, Mini-SWE/SWE-bench | Turn existing ladder scaffold into real scheduled benchmark runs with reports |

## Recommended Integration Order

1. Finish surfaces already started: event summaries in status UI, foreground mutation gating, native subagent prompt presets, `siso_context` forensic command, and changelogged task tickets.
2. Build supervisor-lite: no-tools verifier after `workflow/council/spawn` with JSON decision, stored outcome, and dashboard line.
3. Add file-backed planning: active plan dir, `task_plan.md`, `progress.md`, and safe session catch-up that is bounded and labeled.
4. Add rewind/checkpoint: before risky edits, capture file snapshots and expose one restore command.
5. Promote code-search/codebrain: make Sourcegraph/code search and current `pi-brain-grep` the first-class way to find code without flooding context.
6. Add cheap repo-map registry: file/symbol/import/backlink summaries under `.pi/repo-map`, with optional graph backends later.
7. Turn the 0.1.6 packages into an inspect queue: start with `nightmanager`, `@wayaans/ramean`, `pi-bmad-flow`, `@ocodista/pi-token-bloat`, `@dreki-gg/pi-context7`.

## Do Not Integrate Blindly

- Do not copy `open-claude-code` source into the harness; use it as a checklist and smoke-test oracle only.
- Do not adopt heavy code graph engines before the cheap adapter contract exists.
- Do not allow dynamic MCP/provider imports until read-only inspection and explicit allowlisting exist.
- Do not promote broad-catalog packages based only on npm descriptions; clone or inspect first.
- Do not mutate real `~/.claude` or `~/.pi/agent` while productizing; keep using isolated `~/.siso` and lab paths.

## Next Concrete Ticket

Create implementation tasks from this gap map in this order:

1. `supervisor-lite-verifier`
2. `file-backed-plan-state`
3. `safe-rewind-checkpoints`
4. `code-search-codebrain-skill`
5. `repo-map-registry`

Each task should cite the source research file, update `CHANGELOG.md`, and add a smoke test before being marked integrated.
