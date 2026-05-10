# Feature Integration Log

Date: 2026-05-08

## Score

Current research-to-product integration rating: **58/100**.

Why: the SISO/Pi harness has a real spine now, but the most valuable research is still only partially converted into product features. We have launcher, Bifrost routing, context hygiene, native subagent bridge, status UI, eval scaffolding, lifecycle checkpoints, and repo recommendations. We are missing safety, planning, graph intelligence, session search, and polished orchestration.

## Integration Backlog

| Priority | Feature | Current state | Local code/docs to build from | Source repos to inspect |
| --- | --- | --- | --- | --- |
| P0 | Safety, rewind, and mutation control | Partial checkpoint/session capture exists, but no true pre-edit snapshot/restore or risky mutation approval gate. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-lifecycle/src/index.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/worker-guard.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/route-policy.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-code-intelligence-wave5.md` | `https://github.com/arpagon/pi-rewind`; `https://github.com/tintinweb/pi-supervisor`; `https://github.com/kcosr/pi-extensions` |
| P0 | Supervisor-lite verifier | Research queue has the pattern, but no actual no-tools verifier loop after spawn/workflow/council. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/council-layer.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/workflow-layer.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/agent-events.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/pi-council-prototype.md` | `https://github.com/tintinweb/pi-supervisor`; `https://github.com/karpathy/llm-council`; `https://github.com/jacob-bd/llm-council-plus` |
| P0 | File-backed planning | Task and lifecycle primitives exist, but no active plan directory, `task_plan.md`, `progress.md`, or bounded catch-up flow. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/task-store.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-lifecycle/src/index.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/harness-feature-intake.md`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-planning-with-files.md` | `https://github.com/OthmanAdi/planning-with-files`; `https://github.com/tintinweb/pi-tasks`; `https://github.com/obra/superpowers` |
| P0 | Task dependency lifecycle | Child runs and task-store exist, but dependency states, leases, retries, ownership, blocked states, and worker completion updates are thin. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/task-store.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/workflow-layer.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-status/src/status-state.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/multi-agent-missions-control-plane.md` | `https://github.com/tintinweb/pi-tasks`; `https://github.com/OthmanAdi/planning-with-files`; `https://www.npmjs.com/package/taskplane` |
| P1 | Codebrain and code search | `pi-brain-grep` exists, but there is no first-class `siso codebrain` skill combining Sourcegraph, symbol-aware grep, and seen-context memory. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/scripts/pi-brain-grep.mjs`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/scripts/smoke-pi-brain-grep.mjs`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/code-brain-adapter-contract.md`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/skill-hub.ts` | `https://github.com/1jehuang/jcode`; `https://github.com/akbad/sourcegraph-mcp`; `https://github.com/yamadashy/repomix` |
| P1 | Repo-map and graph intelligence | Catalog/recommendation exists and graph repos are researched, but no `.pi/repo-map` registry or one-hop impact/blast-radius context. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/repo-catalog.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/repo-candidate-catalog.md`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-last-mile-context-wave7.md`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-code-intelligence-wave5.md` | `https://github.com/tintinweb/pi-gitnexus`; `https://github.com/abhigyanpatwari/GitNexus`; `https://github.com/serena-ai/serena` |
| P1 | Session memory search and handoff | Context filtering, typed memory, case packets, and lifecycle checkpoints exist; user-facing search/resume/handoff does not. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-context-manager/src/index.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-context-manager/src/retrieve.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-context-manager/src/typed-memory.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-lifecycle/src/index.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/context-hygiene-and-codex-case-packets.md` | `https://github.com/kaiserlich-dev/pi-session-search`; `https://github.com/weauratech/pi-memctx`; `https://github.com/vectorize-io/hindsight` |
| P1 | Subagent presets, chains, and UX | Native `pi-subagents` bridge exists, but SISO lacks polished scout/implementer/reviewer/verifier presets and full chain/parallel UX. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/native-subagent-bridge.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/spawn-layer.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-status/src/tool-display.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/pi-codex-subagent-runtime-decision.md` | `https://github.com/nicobailon/pi-subagents`; `https://github.com/dreki-gg/pi-extensions`; `https://github.com/kalindudc/pi-minions` |
| P2 | MCP/provider importer | Bifrost route is strong, but there is no safe read-only MCP/profile inspector or explicit allowlisted tool importer. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/agent-base/bin/siso.mjs`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router/src/profile-registry.ts`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/scripts/pi-codex-doctor.mjs`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/skill-candidate-review-research-memory.md` | `https://github.com/dreki-gg/pi-extensions`; `https://github.com/akbad/sourcegraph-mcp`; `https://github.com/rohitg00/awesome-claude-code-toolkit` |
| P2 | External benchmark ladder | Internal evals and ladder configs exist, but serious external suites are not yet wired into scheduled runs. | `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/pi-evals/README.md`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/pi-evals/runners/run_ladder.mjs`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/pi-evals/suites/evalplus_runner.py`; `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/docs/pi-eval-harness-benchmark-plan.md` | `https://github.com/evalplus/evalplus`; `https://github.com/Aider-AI/polyglot-benchmark`; `https://github.com/laude-institute/terminal-bench` |

## Feature Notes

### 1. Safety, Rewind, And Mutation Control

This should be the next product hardening layer. `siso-lifecycle` already writes compact checkpoints and touched-file metadata, so the first build should reuse that rather than inventing a parallel state store. The missing behavior is pre-edit file snapshots, restore command, risky-path detection, and parent-session approval before child agents mutate important files.

First implementation slice:

- Add `siso_safety_checkpoint` before edit/write/shell mutation actions.
- Capture file content snapshots under `.pi/safety-checkpoints/`.
- Block or ask before `.env`, auth, config, package manager, and git mutation paths.
- Add a smoke test that edits a fixture, restores it, and proves secrets are not printed.

### 2. Supervisor-Lite Verifier

This is the fastest path to making the harness feel more autonomous. After a workflow or subagent completes, run a no-tools verifier through Bifrost with a strict JSON schema: `done`, `continue`, `steer`, or `failed`. Store the decision beside child-run records and show one compact status line.

First implementation slice:

- Add a verifier module inside `siso-agent-router`.
- Call it after `spawn`, `workflow`, and `council` when enabled.
- Persist decision JSON in the child-run/task metadata.
- Add unit tests for parser failure and live smoke behind an env gate.

### 3. File-Backed Planning

The harness needs an inspectable plan spine that survives crashes and compaction. Use `planning-with-files` as the pattern, but keep paths inside the project/lab. The plan files should be boring markdown because they are easy for humans and agents to repair.

First implementation slice:

- Resolve active plan dir in `.pi/plans/<slug>/`.
- Maintain `task_plan.md`, `progress.md`, and `findings.md`.
- Add lifecycle catch-up that injects only a bounded, labeled summary.
- Connect task-store IDs to plan rows.

### 4. Task Dependency Lifecycle

Current tasks are useful, but not enough for a real multi-agent assembly line. The system needs states like `pending`, `ready`, `in_progress`, `blocked`, `done`, `failed`, plus dependency IDs, leases, assignees, and output artifact pointers.

First implementation slice:

- Extend task-store schema in a backward-compatible way.
- Make workflow parent tasks update from child completion.
- Add lease timeout handling for abandoned child runs.
- Add status dashboard grouping by task state.

### 5. Codebrain And Code Search

This is where the research pays off day-to-day. `pi-brain-grep` is a good seed, but SISO needs a named tool/skill that answers "where should I look/edit?" without loading the repo into context.

First implementation slice:

- Promote `pi-brain-grep` behind `siso codebrain search`.
- Add seen-region cache per session.
- Add optional Sourcegraph backend for ecosystem/internet searches.
- Keep `rg` as the default local path.

### 6. Repo-Map And Graph Intelligence

Do not start with a heavy graph database. Start with a cheap `.pi/repo-map` registry: file summaries, imports, exports, symbols, backlinks, tests, and known hotspots. Heavy backends can plug into the same adapter later.

First implementation slice:

- Generate `.pi/repo-map/index.json` and `index.md`.
- Expose bounded `overview`, `related`, and `impact` actions.
- Add strict output caps and truncation metadata.
- Add optional adapters for GitNexus/Serena/codebase-memory later.

### 7. Session Memory Search And Handoff

Context hygiene is already strong, but recovery is still too manual. The missing user-facing action is: "what did we learn before?" Search across transcripts, case packets, typed memory, and lifecycle checkpoints, then return a compact handoff.

First implementation slice:

- Index SISO transcript/checkpoint files into SQLite FTS.
- Add `siso memory search` and `siso memory handoff`.
- Reuse `siso_context op=case_packet`.
- Never inject raw transcripts by default.

### 8. Subagent Presets, Chains, And UX

The native bridge is the right direction, but the user should not have to think about low-level runtime shape. Add SISO presets: `scout`, `implementer`, `reviewer`, `verifier`, `cataloger`, and `researcher`.

First implementation slice:

- Add preset definitions in router profile/config.
- Map presets to native subagent params when available.
- Render chain/parallel progress in status UI.
- Warn on file-touch conflicts between workers.

### 9. MCP/Provider Importer

Keep Bifrost as the router. The importer should inspect existing MCP/provider configs, explain what they would expose, and require explicit allowlisting before adding anything to a SISO profile.

First implementation slice:

- Add `siso doctor mcp` read-only inspection.
- Detect config files without printing secrets.
- Produce an allowlist patch suggestion.
- Add Context7 and Sourcegraph as optional candidates, not defaults.

### 10. External Benchmark Ladder

The internal evals are enough for smoke testing, not enough for confidence. The next level is benchmark reports that compare SISO/Pi across code repair, terminal tasks, and repo tasks.

First implementation slice:

- Finish EvalPlus runner.
- Add Aider Polyglot smoke subset.
- Add Terminal-Bench smoke subset.
- Store reports under `pi-evals/reports/ladder/`.

## Build Rule

Every feature from this log needs:

- One small adapter before any heavy dependency.
- At least one smoke or unit test.
- A changelog entry.
- A link back to the research source.
- No mutation of real `~/.claude` or `~/.pi/agent` during prototyping.
