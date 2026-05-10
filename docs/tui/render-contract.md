# SISO TUI Render Contract

Status: active contract
Owner surface: plain `siso` / Pi native interactive TUI

The SISO TUI must render as a clean operator console. Normal chat should show intent, progress, and results, not raw runtime telemetry. Permission prompts can be improved later; the default render surface should stay compact now.

## Allowed Surfaces

These are the only first-class visible surfaces for normal TUI output:

- `StartupHeader` - transient launch state before chat is ready.
- `AssistantText` - final/user-facing assistant prose.
- `PhaseCard` - short plan/implement/validate progress notes.
- `ToolGroup` - collapsed parent row for one or more tool calls.
- `ToolDetail` - expanded child/detail lines under a tool group.
- `AgentCard` - child/subagent state and result summary.
- `StatusLine` - one-line footer/status surface.
- `Widget` - below-editor live status, agent, or queue lines.
- `CommandOverlay` - slash command, selector, and management overlays.
- `Notice` - concise warnings, failures, updates, and system notices.

Do not add new named visible surfaces for routine tool/runtime data without updating this contract and the relevant smoke.

## Line Budgets

- startup: 2 lines.
- phase: 3 lines.
- tool group: 1 header + up to 4 child lines.
- agent card compact: 2-3 lines.
- footer: 1 line.
- widgets: max 4 total lines.

Expanded views may show more detail, but they must be deliberate disclosure states. Collapsed/default rendering should fit the budgets above.

## Text Contract

Allowed visible copy:

- Human labels: `Plan`, `Implement`, `Validate`, `Explored`, `Modified`, `Verified`, `Delegated`, `Agent running`, `Agent complete`.
- Compact metrics: `2 checks`, `1.5k tok`, `32s`, `+4 lines`, `7 tools`.
- Short task labels: four meaningful words by default; command diagnostics must be rewritten into readable labels.
- Paths and commands: shortened to the relevant subject, not full shell transcripts.

Banned in collapsed/default rendering:

- `Recon`.
- `kind=`.
- `runtime=native-subagent`.
- `child_id=`.
- timeout/limit suffixes on compact tool rows.
- raw long task labels.
- raw diagnostic prefixes such as `run `, `ctx `, `tools `, `activity `, `prompt `, `tool:start`, `input=`, or `result=`.

Telemetry and raw identifiers may remain in structured details, logs, or explicit diagnostic commands. They must not leak into the normal TUI render path.

## Smoke Ownership

- `scripts/smoke-output-style.mjs` enforces the contract doc, phase naming, and collapsed `PhaseCard` budget.
- `scripts/smoke-pi-native-renderers.mjs` enforces Pi native compact renderer markers and bans timeout/limit suffix markers.
- `scripts/smoke-status-agent-widget.mjs` enforces compact `AgentCard`/`Widget` behavior, short task labels, widget line budgets, and telemetry bans.

Run the smallest smoke that covers the surface you touch. Use `npm run smoke:renderers`, `npm run smoke:output-style`, or `npm run smoke:status-widget` for the surfaces above.
