# SISO TUI

Source home for SISO terminal UI logic used by the main `siso` command.

The main product surface is still Pi's native TUI. This package holds SISO-owned UI rules so install-time patch scripts are not the design/source of truth.

## Areas

- `src/contract/` - renderer-neutral event/session contracts shared by terminal shells.
- `src/components/` - renderer-neutral row/layout functions for chat, tools, agents, startup, and session lists.
- `src/adapters/` - SISO runtime/status/session adapters that turn local agent state into UI events.
- `src/runtime/` - real Pi/SISO `AgentSession` wiring for prompt streaming and tool events.
- `src/theme/` - SISO terminal palette tokens for app renderers.
- `src/pi-native/` - code snippets and adapters for Pi native TUI patches.
- `src/pi-native/patch-rules.js` - replacement rules applied to installed Pi native files.
- `gallery/` - visual examples and target states.
- `docs/` - architecture notes specific to the SISO TUI source package.

## Rule

Patch scripts may apply this code into installed Pi files, but new SISO UI behavior should start here.

The fresh OpenTUI shell in `apps/siso-tui/` consumes this package first. The older `apps/siso-opentui/` app remains a research sandbox and a source for adapter ideas.
