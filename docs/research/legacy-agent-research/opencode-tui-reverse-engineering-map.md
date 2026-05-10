# OpenCode TUI Reverse Engineering Map

## Goal

Use OpenCode as a reference implementation for SISO Code's Pi-based UI, without inheriting OpenCode's full backend surface or rebuilding capabilities that current Pi already ships.

Target outcome:

- Pi remains the lightweight harness substrate.
- Bifrost remains the model router.
- SISO Code becomes a curated Pi distro/extension bundle with SISO branding, Bifrost defaults, cheap worker agents, and clean Claude Code/OpenCode-style presentation.
- OpenCode contributes UX patterns: clean transcript, compact tools, child sessions, model/agent pickers, session persistence, and responsive keyboard/mouse behavior.

## Pi 0.73.0 Reality Check

Local Pi is already current:

```text
pi --version -> 0.73.0
npm view @mariozechner/pi-coding-agent version -> 0.73.0
```

That changes the implementation strategy. The pasted Pi changelog shows Pi already has most of the primitives we were planning to build:

- extension packages, hot reload, custom providers, prompt/skill/theme resources
- model selector, scoped models, thinking metadata, provider `baseUrl` overrides, GPT-5.5 Codex support
- built-in tool definitions with custom `renderCall` / `renderResult`
- runtime tool enable/disable through `setActiveTools`
- `before_agent_start`, `terminal_input`, message/tool lifecycle hooks, `message_end` replacement
- custom footer/header/editor/working indicators through `ctx.ui.*`
- `ctx.ui.setWorkingVisible()` and `ctx.ui.setWorkingIndicator()` for hiding/replacing noisy loader rows
- compact `read` rendering for docs/context/skills
- incremental bash streaming and persisted full truncated output
- session tree, fork/clone/import/export, structured compaction, labels
- `.agents/skills` discovery and skill slash commands
- official package/resource model and `APP_NAME` / `CONFIG_DIR_NAME` rebranding points

SISO Code should therefore be Pi-first:

```text
SISO Code = Pi 0.73.0 + SISO extension package + Bifrost config + subagent bundle + UI render overrides
```

OpenCode is now reference material for polish and architecture pressure-testing, not the product runtime.

## Dispatch Plan

Spark research agents were split by slice:

- TUI rendering stack: layout, renderer, status/footer, top-level providers.
- Tool and subagent UX: compact rows, expanded output, errors, child-agent lifecycle.
- Session/state/events: persistence, message parts, sync, exports.
- Theme/keyboard/commands: selection, slash dialogs, model/agent picker, loading indicators.

Their outputs should be appended to this file under "Agent Findings".

## What We Found Locally

OpenCode's real terminal UI is not in the web app package. It lives here:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui`

Core entrypoint:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/app.tsx`

This uses:

- `@opentui/core`
- `@opentui/solid`
- Solid signals/memos/components
- a client/server sync layer
- plugin slots
- route-based screens
- theme provider
- keybind provider
- dialog provider
- persistent local KV state

Renderer settings worth copying:

- `externalOutputMode: "passthrough"`
- `targetFps: 60`
- `exitOnCtrlC: false`
- `useKittyKeyboard: {}`
- `autoFocus: false`
- `openConsoleOnError: false`
- mouse support behind a flag/config
- native terminal selection copy handling

SISO Code takeaway:

Do not keep iterating on ad-hoc readline rendering. If we continue Pi-native, use `@opentui/core`/`@opentui/solid` directly and build a deliberately smaller SISO UI.

## Session Screen

Main session route:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`

Key patterns:

- session data is rendered from synced message state
- child sessions are computed from `parentID`
- permissions/questions block the prompt when needed
- prompt visibility and disabled state are derived from session state
- tool details, thinking visibility, timestamps, sidebar, scrollbars, and generic tool output are persisted in KV
- the session route owns commands like compact, fork, undo, redo, copy transcript, export transcript, go to child, go to parent, next child, previous child

SISO Code takeaway:

Make SISO Code's transcript event-driven:

```text
session
  messages[]
    parts[]
      text | reasoning | tool | agent | skill
  children[]
  permissions[]
  questions[]
  local_ui_state
```

That gives us Claude Code-style foreground chat plus background subagent state without printing noisy process logs into the transcript.

## Tool Rendering

Tool rendering is concentrated in:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`

Relevant functions:

- `ToolPart`
- `GenericTool`
- `InlineTool`
- `BlockTool`
- `Shell`
- `Read`
- `Grep`
- `Glob`
- `Task`
- `Skill`
- `Edit`
- `Write`
- `ApplyPatch`
- `TodoWrite`

Core behavior:

- hide completed successful tools when tool details are off
- keep running/error tools visible
- render common tools as one-line `InlineTool`
- render file edits, shell output, todos, and errors as `BlockTool`
- generic tool output is hidden unless toggled
- shell output strips ANSI, truncates long output, and supports expansion
- status is derived from `part.state.status`
- tool title comes from metadata when available

SISO Code takeaway:

Our ugly tool rows should become this minimal contract:

```text
• read  .siso-wiki/index.md                  done   98ms
• bash  npm run verify:local                 run    12s
• agent minimax.scout repo reconnaissance    done   18k tok
```

Rules:

- one line by default
- no green/red full-width bars
- failures use a small red status, not a giant red row
- output is hidden behind expand
- tool groups collapse by assistant turn
- task/subagent rows show live child status
- completed subagents inject a short result into the parent transcript

## Subagents

Task tool:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/tool/task.ts`

Subagent footer:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/routes/session/subagent-footer.tsx`

Subagent dialog:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/routes/session/dialog-subagent.tsx`

OpenCode's task tool already does the important thing:

- validates the requested subagent type
- creates or resumes a child session
- sets `parentID` on the child session
- titles child sessions as `description (@agent subagent)`
- inherits relevant deny/external-directory permissions from parent
- can deny nested `task` or `todowrite` based on child agent permission
- selects the child model from the subagent config
- writes metadata with child `sessionId` and model
- runs the prompt in the child session
- returns `task_id` plus `<task_result>` to the parent

SISO Code takeaway:

This is almost exactly the workflow Shaan wants. Port the shape, not the full code:

```text
parent session
  tool call: agent.spawn
    creates child session
    writes child_run record
    displays compact running row

child session
  owns its transcript/tool calls/tokens
  can run in background
  updates parent via event bus

completion
  parent receives child.completed event
  chat gets compact report card
  full report path/session id remains expandable
```

## Theme And Commands

Theme context:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/context/theme.tsx`

Theme files:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/context/theme`

Command/dialog examples:

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/component/dialog-agent.tsx`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/cli/cmd/tui/context/keybind.tsx`

SISO Code takeaway:

Build these first:

- `/exit`
- `/agents`
- `/model`
- `/status`
- `/tools`
- `/sessions`
- `/theme`
- `/compact`

Use dialogs for selection, not noisy printed lists.

## Existing Pi Subagent Substrate

There is already a local `pi-subagents` package:

`/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/pi-subagents`

Its package manifest declares a normal Pi package:

```json
{
  "pi": {
    "extensions": ["./src/extension/index.ts"],
    "skills": ["./skills"],
    "prompts": ["./prompts"]
  }
}
```

It already provides the SISO-shaped agent roles:

- `scout`
- `researcher`
- `planner`
- `worker`
- `reviewer`
- `context-builder`
- `oracle`
- `delegate`

It also supports foreground/background runs, chain and parallel execution, slash commands, async status, forked context, and optional `pi-intercom` supervisor communication.

SISO Code should reuse this instead of inventing a new child-agent system first. The SISO work is to:

- install or vendor `pi-subagents`
- set SISO default model overrides that match the actual Bifrost aliases: Oracle GPT-5.5, Spark, and MiniMax M2.7
- make the visual presentation calmer
- expose `/agents`, `/council`, `/review`, `/scout`, and workflow shortcuts in SISO terms

## Revised Minimal SISO Code Plan

Phase 1: ship a SISO Pi distro wrapper.

- Keep `/Users/shaansisodia/bin/pi-codex` as the lean smoke/profile launcher.
- Use `/Users/shaansisodia/bin/siso-code` as the full SISO Code launcher.
- Ensure Bifrost is healthy before launching.
- Default main model to `bifrost/gpt-5.5`.
- Add SISO package paths for extensions, skills, prompts, and themes.
- Keep OpenCode launcher as a reference/smoke target, not the main product.

Phase 2: install and configure subagents.

- Use `pi install npm:pi-subagents` or a local package path from `research/sources/pi-subagents`.
- Lab project-local install is already present in `.pi/settings.json`:
  - package: `../research/sources/pi-subagents`
  - project agent overrides for oracle/planner/context-builder/worker/scout/reviewer/researcher/delegate
- `/Users/shaansisodia/bin/siso-code` explicitly loads:
  - SISO lifecycle/status/router extensions
  - `research/sources/pi-subagents/src/extension/index.ts`
  - SISO capabilities skill
  - `pi-subagents` skills and prompt templates
- Configure built-in agent overrides:
  - `oracle`: `bifrost-anthropic/claude-opus-4-7` (`Oracle GPT-5.5`)
  - `planner`: `bifrost-anthropic/claude-opus-4-7` (`Oracle GPT-5.5`)
  - `researcher`: `bifrost-anthropic/claude-opus-4-7` (`Oracle GPT-5.5`)
  - `context-builder`: `bifrost-anthropic/claude-sonnet-4-6` (`Spark`)
  - `reviewer`: `bifrost-anthropic/claude-sonnet-4-6` (`Spark`), falling back to MiniMax
  - `worker`: `bifrost-anthropic/claude-haiku-4-5-20251001` (`MiniMax M2.7`)
  - `scout`: `bifrost-anthropic/claude-haiku-4-5-20251001` (`MiniMax M2.7`)
  - `delegate`: `bifrost-anthropic/claude-haiku-4-5-20251001` (`MiniMax M2.7`)
- Add SISO workflow prompts: `/council`, `/parallel-review`, `/scout-plan`, `/oracle-check`, `/worker-review`.

Phase 3: override noisy UI rendering through Pi extension APIs.

- Use built-in tool `renderCall` / `renderResult` overrides for `read`, `bash`, `grep`, `find`, `ls`, `edit`, `write`, and subagent tools.
- Use `ctx.ui.setWorkingVisible(false)` or `ctx.ui.setWorkingIndicator()` to move working state into a compact footer/status line.
- Use `ctx.ui.setFooter()` for Bifrost health, active model, agent count, cost/tokens, branch, and mode.
- Use `ctx.ui.setHeader()` for a compact SISO startup header.
- Use `ctx.ui.getEditorComponent()` / `ctx.ui.setEditorComponent()` only if the default editor needs SISO-specific affordances.

Phase 4: copy OpenCode UX semantics where Pi is still rough.

- Tool rows:
  - one line by default
  - running/error visible
  - successful completed output hidden by default
  - expandable detail on demand
- Agent rows:
  - show agent role, model, task, status, elapsed time, token/cost estimate
  - full child transcript remains in session/artifact path
  - parent transcript receives only a compact report card
- Dialogs:
  - prefer selection dialogs over printed lists for agents, models, tools, sessions, and themes

Phase 5: consider deeper event/state changes only after extension polish.

OpenCode's event-sourced model is excellent, but Pi already has JSONL sessions, session tree, import/export, compaction, tool lifecycle events, and resource hot reload. A separate OpenCode-style event log should wait until we hit a concrete Pi limitation.

## Deferred OpenTUI Rewrite

The earlier idea was to replace the scratch Pi chat UI with a new OpenTUI/Solid shell. That is no longer the first move.

Keep this as a fallback if Pi extension rendering cannot produce the desired feel:

- SISO TUI package using `@opentui/core` and `@opentui/solid`
- three screens: home/session/agents
- message parts: `text`, `reasoning`, `tool`, `skill`, `agent`, `system`
- local event or JSONL persistence under `~/.siso/siso-code`
- batched updates and partial hydration modeled after OpenCode

## Agent Findings

### TUI Rendering Stack

OpenCode's TUI stack is route-rooted and declarative:

- `app.tsx` creates the OpenTUI renderer and global providers.
- `thread.ts` isolates terminal thread/render startup.
- `routes/session/index.tsx` owns the main transcript/prompt layout.
- `sidebar.tsx`, `footer.tsx`, and `subagent-footer.tsx` split durable surfaces.
- `plugin/slots.tsx`, `plugin/api.tsx`, and `plugin/runtime.ts` provide extension slots.
- Dialog/status/prompt components are composable overlays rather than printed transcript content.

Useful pattern for SISO Code:

- keep render state, session state, and plugin state separated
- update transcript parts incrementally
- treat scroll behavior and prompt focus as UX contracts
- expose plugin slots for footer, header, message rows, and dialogs

### Session State And Events

OpenCode's strongest backend idea is the event-sourced sync layer:

- canonical event log with `event_sequence` and `event`
- read-model tables for session/message/part
- projector-first state updates
- publish events only after persistence/projector writes
- streaming deltas as a separate bus event from full part updates
- TUI subscribes once, batches event flushes, and mutates local state surgically

Useful pattern for SISO Code:

- copy the mental model for responsiveness
- avoid adopting the whole backend until Pi's JSONL/session/event APIs are proven insufficient
- if needed later, add a SISO event log as an extension-side projection over Pi session events

### Tool And Subagent UX

OpenCode's tool/subagent UX has a few concrete patterns worth copying directly:

- session status is first-class: `busy`, `retry`, `idle`
- tools move through explicit lifecycle states:
  - input started / pending
  - called / running
  - progress
  - result / completed
  - error
- cancellation and teardown force-close orphaned pending/running tools as explicit aborted errors
- tool metadata and output are persisted as structured message parts, so resumed sessions render deterministically
- task/subagent results carry child session id and model metadata for navigation and durable linking

Files worth referencing when implementing SISO-style tool rows:

- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/session/status.ts`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/session/run-state.ts`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/session/processor.ts`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/v2/session-message-updater.ts`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/opencode/src/tool/task.ts`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/ui/src/components/basic-tool.tsx`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/ui/src/components/tool-status-title.tsx`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/ui/src/components/tool-error-card.tsx`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/ui/src/components/message-part.tsx`
- `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/anomalyco-opencode/packages/ui/src/components/session-retry.tsx`

SISO implementation deltas:

- create one shared compact wrapper for all Pi tool render overrides
- keep pending/running tools expanded or visible; collapse completed successes
- group low-signal context tools into a single expandable context group
- render a dedicated compact error card instead of raw exception blocks
- surface retry as a session-level card/status, not scattered tool output
- render subagents as task rows with role, model, child session, status, and elapsed time
- confirm Pi consumes progress-style updates end to end for any SISO subagent runner output
