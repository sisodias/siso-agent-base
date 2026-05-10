# SISO R1 TUI Rebuild Lessons

Date: 2026-05-09
Status: planning / clean-room design notes

## Goal

Rebuild the SISO R1 terminal UI so it keeps the existing SISO/Pi agent runtime, router, child-agent lifecycle, workflows, skills, status widgets, and Bifrost telemetry, while adopting the best interaction patterns from modern agent TUIs.

This document is intentionally a clean-room product/architecture spec. It should capture observable UI patterns and reusable design lessons, not copy proprietary source code or private implementation details.

## Current R1 surface

Active runtime:

- wrapper: `bin/siso`
- runtime: `@mariozechner/pi-coding-agent`
- TUI toolkit: `@mariozechner/pi-tui`
- SISO extension layer: `extensions/siso-agent-router`, `extensions/siso-status`

Important R1 UI files:

- `dist/modes/interactive/interactive-mode.js` — owns screen composition and session event wiring.
- `dist/modes/interactive/components/custom-editor.js` — prompt editor and app-level keybindings.
- `dist/modes/interactive/components/footer.js` — compact footer/status surface.
- `dist/modes/interactive/components/user-message.js` — user message rendering.
- `dist/modes/interactive/components/assistant-message.js` — assistant message rendering.
- `dist/modes/interactive/components/tool-execution.js` — tool execution rendering.
- `dist/modes/interactive/components/diff.js` — diff rendering.
- `dist/modes/interactive/theme/*.json` — theme tokens.

## Design principles for the rebuild

1. **Keep R1 as the backend.** Do not throw away the SISO router, child agents, workflows, councils, skills, task registry, context filters, or Bifrost telemetry.
2. **Build a real UI system, not one-off polish.** Introduce reusable UI primitives and named surfaces so future improvements are easy.
3. **Use clean-room implementation.** Learn from interaction patterns, not leaked/proprietary code.
4. **Make agent operations first-class.** SISO's unique advantage is not only chat; it is parallel agents, tasks, workflows, councils, and telemetry.
5. **Prefer progressive enhancement.** Patch the current Pi TUI first; migrate to another renderer only if Pi TUI becomes the bottleneck.
6. **Make changes testable.** Every renderer patch should have a smoke test or snapshot-like assertion.

## Target UI architecture

R1 should evolve from ad-hoc components into named layers:

```txt
SisoTuiShell
├─ Header / SessionBanner
├─ ConversationViewport
│  ├─ MessageGroup
│  ├─ UserTurn
│  ├─ AssistantTurn
│  ├─ ToolCard
│  ├─ PermissionCard
│  └─ ProgressRow
├─ AgentOpsPanel / optional overlay
│  ├─ ChildAgentRow
│  ├─ WorkflowStepRow
│  ├─ CouncilMemberRow
│  └─ TaskBudgetRow
├─ PromptComposer
│  ├─ EditorBox
│  ├─ AttachmentContextChips
│  ├─ SlashCommandMenu
│  ├─ ModeIndicator
│  └─ QueuedPromptRow
└─ StatusFooter
   ├─ ModelIndicator
   ├─ ContextMeter
   ├─ ToolCallCounter
   ├─ SubagentCounter
   ├─ BifrostIndicator
   └─ Cwd/GitIndicator
```

The current implementation can map onto this without a renderer migration:

| Target surface | Current owner |
| --- | --- |
| `SisoTuiShell` | `interactive-mode.js` |
| `ConversationViewport` | `chatContainer`, `pendingMessagesContainer` |
| `PromptComposer` | `custom-editor.js`, `editorContainer` |
| `StatusFooter` | `footer.js`, `extensions/siso-status` |
| `ToolCard` | `tool-execution.js`, `bash-execution.js`, `diff.js` |
| `AgentOpsPanel` | `extensions/siso-agent-router`, `extensions/siso-status` |

## What to learn and rebuild

### 1. Prompt composer

A premium agent TUI lives or dies by its composer.

Rebuild targets:

- bordered editor with stable height behavior
- subtle dim placeholder
- footer hint row
- mode indicator: normal / plan / edit / permission / background-running
- slash-command suggestion menu
- attached context chips: file, image, IDE selection, repo, task
- queued prompt row while assistant is busy
- clear multiline navigation and external-editor affordance

R1 starting files:

- `custom-editor.js`
- `footer.js`
- `interactive-mode.js`

### 2. Conversation viewport

The message area should feel structured, not like a log stream.

Rebuild targets:

- group messages by turn
- compact user turn header
- assistant markdown with predictable spacing
- low-noise system/status notices
- unseen/new-message divider
- optional fullscreen/scrollback mode
- later: virtualized rendering if history becomes expensive

R1 starting files:

- `user-message.js`
- `assistant-message.js`
- `interactive-mode.js`

### 3. Tool cards

Tool calls should be concise while running and expandable when useful.

Rebuild targets:

- one-line running state: icon, tool name, subject/path, timer
- success/error/warning color semantics
- compact file edit summaries
- diff preview with clear accepted/rejected state
- bash command cards with cwd, command, exit status, duration
- collapse noisy output by default; show important output/errors

R1 starting files:

- `tool-execution.js`
- `bash-execution.js`
- `diff.js`
- `extensions/siso-status/tool-display.js`

### 4. Permission cards

Permissions should be explicit, readable, and keyboard-friendly.

Rebuild targets:

- separate permission card component from generic tool card
- permission title: action + target + risk level
- concise reason/explanation
- visible available actions: allow once, always allow, deny, edit rule
- rule preview for file/tool/web permissions

R1 likely needs new component files; do not overload `tool-execution.js` too much.

### 5. Agent operations panel

This is where SISO should surpass generic agent TUIs.

Rebuild targets:

- active child agents with spinner, model, elapsed time, tool count, token budget
- background task queue and blocked tasks
- workflow steps and current owner
- council/member comparison progress
- task result summaries when children finish
- Bifrost health and duplicate-request warnings

R1 starting files:

- `extensions/siso-agent-router/*`
- `extensions/siso-status/*`
- `scripts/smoke-native-subagent-status.mjs`
- `scripts/smoke-status-agent-widget.mjs`

### 6. Status footer

The footer should be compact, stable, and information dense.

Rebuild targets:

- left: input hints / mode / permission state
- center: task/subagent status when active
- right: model, context, tool calls, Bifrost indicator
- never spam timeline rows by default
- allow expanded status overlay on demand

R1 starting files:

- `footer.js`
- `extensions/siso-status/index.js`
- `extensions/siso-status/status-state.js`

## UI primitives to add to R1

Before adding many feature components, create reusable primitives:

- `SisoThemeTokens`: semantic colors and glyphs.
- `StatusPill`: compact colored label/value pair.
- `KeyHint`: dim keybinding hint with consistent formatting.
- `Card`: border/title/body/actions primitive.
- `ProgressLine`: spinner + label + elapsed + optional detail.
- `TruncatedPath`: path shortening with middle elision.
- `ToolSubject`: standard way to derive display name/path from tool inputs.
- `EmptyState`: consistent message for empty overlays/selectors.
- `OverlayMenu`: command palette/slash/autocomplete base.

These can be implemented over `pi-tui` first. If we later move to Ink, the same component model/spec survives.

## Interactive TUI workbench

To make future UI iteration fast, add a local workbench/demo mode rather than testing only inside real model sessions.

Suggested command:

```txt
SISO_TUI_DEMO=1 siso
# or
node scripts/tui-demo.mjs composer
node scripts/tui-demo.mjs tool-cards
node scripts/tui-demo.mjs agent-ops
```

Demo scenarios:

1. empty session with composer and footer
2. long conversation with markdown/code blocks
3. running bash tool with streaming output
4. successful file edit with diff
5. failed tool call with error card
6. permission request
7. active child agents + queued prompt
8. workflow/council progress
9. narrow terminal width
10. short terminal height

Testing strategy:

- Keep existing smoke tests.
- Add renderer assertions for key strings/glyphs.
- Add width stress tests for 40/80/120 columns.
- Add idempotence checks for patch scripts.
- Avoid tests that depend on exact ANSI color bytes unless the color is the feature.

## Migration phases

### Phase 0 — Document and map

- Keep this research doc updated.
- Document current UI owners and target surfaces.
- Decide which pieces stay in Pi TUI and where new abstractions live.

### Phase 1 — Visual foundation

- Add semantic theme tokens.
- Normalize key hints, pills, and card styles.
- Improve prompt editor border/padding/footer.
- Improve message spacing.

### Phase 2 — Tool and permission UX

- Split tool rendering into small reusable card helpers.
- Add permission-card primitive.
- Compact noisy outputs.

### Phase 3 — SISO agent-ops UX

- Build active child-agent/task panel.
- Integrate workflow/council status.
- Add Bifrost status indicator.

### Phase 4 — Interaction polish

- Better slash-command menu.
- Prompt overlays.
- Scrollback/fullscreen view.
- New/unseen divider.

### Phase 5 — Renderer decision

Only consider a React/Ink migration if we cannot implement:

- overlays cleanly
- virtualization
- reliable resizing
- complex nested focus states
- testable component previews

If migration happens, keep the runtime contracts from this document so the UI remains SISO-native.

## Non-goals / guardrails

- Do not copy leaked/proprietary implementation code.
- Do not remove existing SISO router/status/Bifrost capabilities.
- Do not make timeline spam visible by default again.
- Do not make UI polish depend on live provider calls.
- Do not regress headless/API behavior.

## First high-leverage implementation candidates

1. Add `docs/research/siso-r1-tui-rebuild-lessons.md` as the living spec.
2. Add a TUI demo/snapshot harness for composer/tool/agent states.
3. Refactor renderer patches to named helpers instead of large inline replacements.
4. Improve `footer.js` and `custom-editor.js` around stable composer/footer visuals.
5. Add an agent-ops panel that surfaces SISO child agents better than generic agent TUIs.
