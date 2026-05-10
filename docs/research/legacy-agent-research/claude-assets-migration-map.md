# Claude Assets Migration Map

Date: 2026-05-05

## Goal

Move the useful parts of Shaan's Claude Code setup into the Pi/Bifrost harness without recreating Claude Code's startup bloat.

## Keep In Startup Kernel

Source: `/Users/shaansisodia/.claude/CLAUDE.md`

- Voice: terse, direct, first-principles, decide-and-act.
- Interaction rule: no button prompts; ask plain chat questions only when blocked.
- Close-out contract: final answer has exactly 3 `Next steps`, one marked `Recommended`.
- Coding principles: simple, surgical, verify before done.
- Routing policy: Haiku/MiniMax for cheap work, Spark for larger execution/review, GPT-5.5 for planning, Codex for rescue/review.
- Worktree policy: worktrees belong to a task/sprint, not each subagent.
- Startup reads: global lessons, project lessons, `.siso-wiki/index.md` when present.
- Learning loop: after Shaan corrects behavior, append the lesson to `<PROJECT_ROOT>/tasks/lessons.md`.

Destination now: `/Users/shaansisodia/.pi-bifrost/agent/SYSTEM.md`

## Keep As Lazy Skill Pointers

Source: `/Users/shaansisodia/.claude/skills` and `/Users/shaansisodia/SISO_Workspace/.claude/skills`

Do not load full skill bodies at startup. Keep a compact capability index and read the specific `SKILL.md` only when the task asks for that capability.

Priority capability groups:

- Code context: `siso-codex`, `siso-lsp`, `systemdb-query`, `siso-graph`, `graphify`
- Routing and agents: `siso-routing`, `pi-fleet`, `run-spark`, `dispatch`, `async-codex-review`, `iso`
- Research: `websearch`, `gitsearch`, `sourcegraph`, `gh-cli`
- Browser/UI: `playwright-cli`, `opencli`, `impeccable`, `page-deep-dive`, `page-flow-analysis`
- Ops/memory: `session-checkpoint`, `reflect`, `claude-ops`, `omc-reference`
- Cleanup/scaffolds: `ai-slop-cleaner`, `convex-feature`, `skill`

Destination now: `/Users/shaansisodia/.pi-bifrost/agent/skills/siso-capabilities/SKILL.md`

## Convert Agents Into Pi Profiles

Source: `/Users/shaansisodia/.claude/agents`

- `researcher.md` -> `scout`: Haiku/MiniMax, read-only, no worktree by default.
- `worker.md` -> `worker`: Haiku or Spark, scoped writes, current workspace by default, task worktree only when assigned.
- `verifier.md` -> `reviewer` or `verifier`: Haiku/MiniMax, read/bash, writes feedback only when reporting failures.
- `planner.md` -> `planner`: GPT-5.5, read/write plans, no execution.
- `codex-dispatcher.md` -> Codex escalation path: dispatch rescue/review jobs without making every worker know Codex internals.

Destination in progress: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/packages/siso-agent-router`

## Carry Over Project-Local Dispatch Intelligence

Additional useful sources from the workspace inventory:

- `/Users/shaansisodia/SISO_Workspace/agent_os/hub/skills/agent-dispatch.md` has the cleanest routing questions: model, foreground/background, parallel/sequential.
- `/Users/shaansisodia/SISO_Workspace/docs/superpowers/plans/2026-04-19-pi-workers-skill.md` and `/Users/shaansisodia/SISO_Workspace/docs/superpowers/plans/2026-04-19-pi-workers-v2-context-tiers.md` define the older Pi worker plan: `pi-ask`, `pi-fleet`, Tier-0 worker identity, opt-in context profiles, and JSONL logging.
- `/Users/shaansisodia/SISO_Workspace/.agents/skills/siso-routing/SKILL.md` is useful as a newer routing reference, but normalize accidental `Codex-*` substitutions before reuse.

These should inform the router and profile loader, not get loaded wholesale.

## Project-Specific CLAUDE.md Loading

Domain `CLAUDE.md` files should be loaded only when the active task touches that project or path:

- `/Users/shaansisodia/SISO_Workspace/apps/cmux/CLAUDE.md`
- `/Users/shaansisodia/SISO_Workspace/SISO_Library/CLAUDE.md`
- `/Users/shaansisodia/SISO_Workspace/SISO_Library/component_library/CLAUDE.md`
- `/Users/shaansisodia/SISO_Workspace/SISO_Agency/Social_Outreach/CLAUDE.md`
- `/Users/shaansisodia/SISO_Workspace/SISO_Agency/agents/pm/CLAUDE.md`
- `/Users/shaansisodia/SISO_Workspace/SISO_Internal_Lab/agents/lifelock-app-pm/CLAUDE.md`
- `/Users/shaansisodia/SISO_Workspace/paperclip/agents/paperclip-pm/CLAUDE.md`

The Pi loader should walk upward from the target file/directory, read the nearest matching `CLAUDE.md`, then stop unless the task asks for broader domain context.

## Extra Lazy Capability Sources

Keep these discoverable but opt-in:

- Paperclip control-plane skills in `/Users/shaansisodia/SISO_Workspace/paperclip/skills`
- Workspace manager rules in `/Users/shaansisodia/SISO_Workspace/workspace-manager/.claude/rules`
- Old build feedback in `/Users/shaansisodia/SISO_Workspace/.claude/feedback` and project `.claude/feedback`

Never preload `.claude/session-context`, `.claude/worktrees`, archived assets, sandbox copies, or `node_modules/**/.claude`.

## Convert Hooks Into Pi Extensions

Source: `/Users/shaansisodia/.claude/hooks`

Best candidates:

- Session checkpoint hooks -> Pi session lifecycle extension.
- Reflect hooks -> correction capture at turn/session boundaries.
- Codex review surfacer -> Pi status/widget plus review notifications.
- Agent-OS session/subagent hooks -> router spawn/end telemetry.
- LSP usage hooks -> read/grep/edit guidance and usage telemetry.

Keep hook bodies out of the prompt. Runtime extension code should do the work.

## Keep As External Config

Source: `/Users/shaansisodia/.claude/settings.json`

- Bifrost base URL and model display aliases are wrapper/runtime config, not prompt text.
- Permissions and denied MCP servers stay profile settings.
- Status line/HUD maps to Pi UI extensions.
- Plugin enablement stays outside model context.
- Skill listing caps are a design constraint: compact catalog, not full list.

## Do Not Migrate Into Pi Startup

- Full skill bodies.
- Full skill list with long descriptions.
- Archived `.claude` folders.
- `.claude/worktrees/*` agent copies.
- `node_modules/**/.claude`.
- Claude sessions, todos, plugin cache internals.
- Per-project settings until the user opens that project.
- Full hook source code.

## Next Build Slice

1. Add a profile loader that reads only the relevant project `CLAUDE.md`, `.siso-wiki/index.md`, and lesson files for the active working directory.
2. Extend `siso-agent-router` from decision-only to spawnable profiles: `scout`, `worker`, `verifier`, `planner`, `codex`.
3. Port session checkpoint, reflect, and Codex review surfacing hooks into Pi runtime extensions.
