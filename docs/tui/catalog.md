# SISO TUI Improvement Catalog

Status: active catalog
Owner surface: plain `siso` / Pi native interactive TUI / `siso tui`

This catalog tracks SISO terminal UI improvements separately from general agent runtime work. Use it before changing the `siso` chat experience, Pi native renderer patches, OpenTUI experiments, status widgets, model/session selectors, tool rendering, or child-agent UI.

## Product Direction

Primary path:

```txt
plain siso
  -> Pi native interactive TUI
  -> SISO extensions
  -> SISO renderer/status/model/session polish
```

Secondary path:

```txt
siso tui
  -> fresh SISO-owned OpenTUI shell
  -> shared packages/siso-tui render contract/components
```

Research path:

```txt
siso opentui
  -> old experimental sandbox/reference
```

Current recommendation: keep plain `siso` excellent as the stable daily driver, while building `siso tui` as the clean SISO-owned terminal renderer. Use `apps/siso-opentui` only for runtime adapter ideas and OpenCode reference material.

## Source Files

Core wrapper and launch:

- `bin/siso` - main SISO command, env/config/provider/tool setup, Pi launch.
- `bin/siso-tui` - fresh SISO-owned OpenTUI shell launch path for `siso tui` / `siso ui`.
- `bin/siso-opentui-live` - experimental OpenTUI launch path.
- `scripts/install-local.sh` - installed command surface.

Pi native TUI patches:

- `scripts/patch-pi-native-renderers.mjs` - applies SISO visual/runtime patches into installed Pi renderer files.
- `scripts/smoke-pi-native-renderers.mjs` - validates Pi renderer patch markers.
- `scripts/smoke-native-output-polish.mjs` - validates native output cleanup.
- `scripts/smoke-output-style.mjs` - validates SISO preflight/output-style behavior.
- `scripts/smoke-pi-output-map.mjs` - validates Pi output UX map.

SISO extension UI:

- `extensions/siso-agent-router/index.js` - `/agents`, `/skills`, `/skill`, `/siso-route`, `siso` tool renderers, router widgets/status.
- `extensions/siso-agent-router/native-subagent-bridge.js` - native subagent bridge and parent-visible child result formatting.
- `extensions/siso-status/index.js` - status widget, child-agent renderer, Bifrost/status commands.
- `extensions/siso-status/timeline.js` - tool/agent/status timeline summaries.
- `extensions/siso-status/tool-display.js` - compact tool display helpers.
- `extensions/siso-context-manager/index.js` - context manager status/widget and renderers.
- `extensions/siso-lifecycle/index.js` - lifecycle/status hooks and transcript/checkpoint UI.

SISO TUI source package:

- `packages/siso-tui/` - SISO-owned TUI source, docs, gallery, and Pi-native patch snippets.
- `packages/siso-tui/src/contract/events.ts` - renderer-neutral session/event contract.
- `packages/siso-tui/src/components/rows.ts` - shared terminal rows for chat, tools, agents, startup, status, and sessions.
- `packages/siso-tui/src/adapters/local-snapshot.ts` - local child-run/status snapshot adapter for the fresh app shell.
- `packages/siso-tui/src/runtime/session-runtime.ts` - real Pi/SISO `AgentSession` runtime adapter for prompt streaming and tool events.
- `packages/siso-tui/src/theme/siso-theme.ts` - SISO terminal color tokens.
- `packages/siso-tui/src/pi-native/tool-phase-helpers.js` - phase classification helpers injected into Pi native tool rows.
- `packages/siso-tui/src/pi-native/tool-renderer.js` - compact tool row renderer source injected into Pi native tool rows.
- `packages/siso-tui/src/pi-native/model-helpers.js` - SISO model display-name source for footer/selectors/status.
- `packages/siso-tui/src/pi-native/footer-renderer.js` - clean footer helper and render block source.
- `packages/siso-tui/src/pi-native/animation-helpers.js` - compact tool-row animation helper source.
- `packages/siso-tui/src/pi-native/startup-loading.js` - transient plain `siso` startup/loading header source.
- `packages/siso-tui/src/pi-native/patch-rules.js` - Pi native replacement rules owned by the SISO TUI package.
- `packages/siso-tui/gallery/tool-groups.md` - current and target tool grouping examples.

Fresh OpenTUI shell:

- `apps/siso-tui/` - active SISO-owned OpenTUI app shell for `siso tui`.
- `apps/siso-tui/src/main.tsx` - terminal-native shell with startup, session list, chat transcript, agents/status routes, and composer.
- `scripts/smoke-siso-tui-app.mjs` - active SISO TUI app smoke.

OpenTUI sandbox/reference:

- `apps/siso-opentui/` - experimental OpenTUI app.
- `apps/siso-opentui/src/main.tsx` - active OpenTUI prototype.
- `apps/siso-opentui/src/siso/session-runtime.ts` - runtime adapter for OpenTUI prototype.
- `apps/siso-opentui/src/opencode/` - vendored OpenCode TUI reference, not active production UI.
- `scripts/smoke-opentui-app.mjs` - OpenTUI app surface smoke.
- `scripts/smoke-opentui-runtime.mjs` - OpenTUI runtime adapter smoke.

Research/design references:

- `docs/tui/render-contract.md`
- `docs/tui/feature-matrix.md`
- `docs/research/siso-r1-tui-rebuild-lessons.md`
- `docs/research/siso-r1-tui-component-inventory.md`
- `docs/research/siso-tui-workbench.md`
- `docs/research/pi-output-ux-map.md`
- `docs/research/legacy-agent-research/pi-tui-components.md`
- `docs/research/legacy-agent-research/opencode-tui-reverse-engineering-map.md`
- `docs/research/legacy-agent-research/deepseek-tui-patterns.md`
- `docs/research/claude-code-subagent-lifecycle.md`

## Shipped / Existing Improvements

### Fresh `siso tui` OpenTUI shell

`siso tui` and `siso ui` now route to `apps/siso-tui`, a fresh SISO-owned terminal renderer instead of the old static preview. The shell uses the shared `packages/siso-tui` contract/components so future UI work has one home instead of scattered launcher scripts.

Included behavior:

- instant chat-first session surface with no fake loading screen
- quiet one-line header with no inferred model or stale agent count
- clean composer-first first screen
- Claude-style welcome panel in the empty transcript with SISO version, workspace, and recent activity
- OpenCode-inspired black palette and Braille working spinner
- real prompt submission through the Pi/SISO `AgentSession` runtime
- assistant text streaming into the transcript
- tool execution start/update/end rows
- local session list route
- local child-agent/status snapshot route
- shared row renderers for messages, tool groups, agents, notices, and session lists
- `siso preview` preserved for the old static demo
- `siso opentui` preserved for the older OpenTUI prototype/reference

Smoke:

```bash
npm run smoke:siso-tui-app
npm run smoke:siso-tui-runtime
```

### TUI render contract and smoke bans

SISO now treats the plain `siso` TUI as a compact operator console with named render surfaces and strict collapsed/default line budgets.

Contract:

- allowed surfaces: `StartupHeader`, `AssistantText`, `PhaseCard`, `ToolGroup`, `ToolDetail`, `AgentCard`, `StatusLine`, `Widget`, `CommandOverlay`, `Notice`
- budgets: startup 2 lines, phase 3 lines, tool groups 1 header plus up to 4 children, compact agent cards 2-3 lines, footer 1 line, widgets 4 total lines
- bans: `Recon`, `kind=`, `runtime=native-subagent`, `child_id=`, timeout/limit suffixes, raw long task labels, raw diagnostic prefixes

Smoke:

```bash
npm run smoke:output-style
npm run smoke:renderers
npm run smoke:status-widget
```

### Transient SISO startup loading

SISO patches Pi's `InteractiveMode.init()` so plain `siso` shows a compact startup header while Pi binds the workspace, model, resources, and extensions:

```txt
SISO
loading workspace · Spark · extensions
```

The header is cleared immediately after initial messages render, so the app lands in the normal chat surface without adding any startup sleep.

Patch owner:

- `scripts/patch-pi-native-renderers.mjs`
- `packages/siso-tui/src/pi-native/startup-loading.js`

Smoke:

```bash
npm run smoke:renderers
```

### SISO command uses Pi native interactive TUI

Plain `siso` is the main product surface. It configures SISO env, Bifrost Anthropic provider, model/tool defaults, and SISO extensions, then launches Pi's interactive mode.

Proof:

```bash
bash -n bin/siso
siso doctor
```

### Compact native tool rows

SISO patches Pi's `ToolExecutionComponent` so collapsed tool calls render as compact single-line rows instead of noisy JSON blocks.

Included behavior:

- compact status icon
- phase label: `Explore`, `Modify`, `Verify`, `Delegate`, or `Tools`
- disclosure-style grouped row header such as `▾ Explored`
- indented child line with the concrete tool/action
- tool family chip
- short path/command subject
- short phase stat such as `1 lookup`, `+4 lines`, `npm smoke:renderers`, `agent completed`
- readable running/done/error labels
- no background blocks for normal collapsed tool rows
- animated working indicator for partial tool execution

Patch owner:

- `scripts/patch-pi-native-renderers.mjs`

Smoke:

```bash
npm run smoke:renderers
```

### Trim noisy built-in tool previews

SISO patches read/search/list/bash previews to keep collapsed output short.

Included behavior:

- `read` collapsed preview: 1 line
- `grep` collapsed preview: 1 line
- `find` collapsed preview: 1 line
- `ls` collapsed preview: 1 line
- `bash` preview lines: 1 line
- default bash timeout copy adjusted to 120 seconds

Patch owner:

- `scripts/patch-pi-native-renderers.mjs`

Smoke:

```bash
npm run smoke:renderers
```

### Clean SISO footer

SISO patches Pi's footer into a single-line status surface:

```txt
context meter | calls/sub/active | model
```

Included behavior:

- context percent and token label
- context bar with warning/error color thresholds
- extension status aggregation
- call/subagent/active counters
- SISO model display names
- single-line footer layout

Patch owner:

- `scripts/patch-pi-native-renderers.mjs`

Smoke:

```bash
npm run smoke:renderers
npm run smoke:status-widget
```

### SISO model display names

SISO maps internal model ids to cleaner labels in footer, model selector, scoped model selector, and model status messages.

Examples:

```txt
claude-opus-4-7 -> Oracle GPT-5.5
gpt-5.3-codex-spark -> Spark
MiniMax-M2.7-highspeed -> MiniMax M2.7
```

Patch owner:

- `scripts/patch-pi-native-renderers.mjs`

Smoke:

```bash
npm run smoke:renderers
```

### Skill invocation polish

SISO patches skill invocation rendering to show a compact active/loaded line.

Patch owner:

- `scripts/patch-pi-native-renderers.mjs`

Smoke:

```bash
npm run smoke:renderers
npm run smoke:skill-slash
```

### SISO router UI status/widgets

`extensions/siso-agent-router` publishes compact/full router status into Pi's extension UI status/widget surfaces.

Controls:

```bash
SISO_AGENT_ROUTER_UI=off|compact|full
SISO_AGENT_ROUTER_WIDGET_PLACEMENT=aboveEditor|belowEditor
```

Owner:

- `extensions/siso-agent-router/index.js`

Smoke:

```bash
npm run smoke:router-lean
npm run smoke:agents-command
```

### SISO status widget and child-agent renderer

`extensions/siso-status` renders SISO child-agent/status information without dumping noisy logs into the normal chat stream.

Controls:

```bash
SISO_STATUS_UI=off|compact|full
SISO_STATUS_POLL_MS=2000
```

Owner:

- `extensions/siso-status/index.js`

Smoke:

```bash
npm run smoke:status-widget
npm run smoke:status-lean
npm run smoke:subagents
```

### SISO context manager UI

`extensions/siso-context-manager` publishes context manager status and optional widget information.

Owner:

- `extensions/siso-context-manager/index.js`

Smoke:

```bash
npm run smoke:context
npm run smoke:context-details
npm run smoke:context-tier
```

### SISO lifecycle UI

`extensions/siso-lifecycle` publishes compact lifecycle/checkpoint/reflection/transcript status when enabled.

Control:

```bash
SISO_LIFECYCLE_UI=off|compact
```

Owner:

- `extensions/siso-lifecycle/index.js`

Smoke:

```bash
npm run smoke:subagent-lifecycle
npm run smoke:session-isolation
```

### OpenTUI prototype and runtime adapter

The separate OpenTUI app exists but is not the recommended primary surface for now.

Included behavior:

- local OpenTUI shell
- local sessions
- adapter/runtime smoke
- staged OpenCode reference files

Owner:

- `apps/siso-opentui/`

Smoke:

```bash
npm run smoke:opentui-app
npm run smoke:opentui-runtime
```

## Active Priorities

### P0 - Make plain `siso` the polished product surface

Decision:

```txt
Improve the current Pi-native SISO TUI path first.
Do not rebuild the main product around apps/siso-opentui unless Pi native TUI blocks required UX.
```

Acceptance:

- `siso` starts cleanly.
- The prompt is obvious and focused.
- Footer/model/context/agent state are useful but not noisy.
- Normal runtime/tool/session behavior is unchanged.

### P0 - Group tool activity into phases

Goal:

```txt
Collapse sequential tool calls into readable groups like Explore, Modify, Verify, Delegate.
```

Current status:

```txt
Disclosure-style phase rows are implemented. True multi-tool parent containers are still pending.
```

Target collapsed examples:

```txt
✓ Explore · 5 tools · read 3 files · searched 1 pattern · 00:12
✓ Modify · 2 edits · 1 file · 00:04
✓ Verify · 2 commands · smoke passed · 00:21
● Delegate · 3 agents · 1 running · 2 complete
```

Likely owners:

- `scripts/patch-pi-native-renderers.mjs`
- `extensions/siso-status/timeline.js`
- `extensions/siso-status/tool-display.js`

Required smoke:

```bash
npm run smoke:renderers
npm run smoke:status-widget
npm run smoke:timeline
```

### P0 - Child-agent result cards

Goal:

```txt
Show SISO child agents as first-class chat/status events, while hiding noisy child telemetry by default.
```

Target examples:

```txt
● Agent running · ui-research-worker · exploring renderer hooks
✓ Agent completed · smoke-verifier · 7 tools · 01:12
✕ Agent failed · api-reviewer · no final output
```

Likely owners:

- `extensions/siso-agent-router/native-subagent-bridge.js`
- `extensions/siso-status/index.js`
- `extensions/siso-agent-router/task-registry.js`

Required smoke:

```bash
npm run smoke:child-notifications
npm run smoke:subagents
npm run smoke:spawn-result
npm run smoke:status-widget
```

### P0 - Better startup and first chat layout

Goal:

```txt
Plain siso should start with a polished SISO welcome/loading state, then land in a clean chat-first layout.
```

Potential owners:

- Pi `InteractiveMode` via extension hooks if possible.
- `scripts/patch-pi-native-renderers.mjs` only if extension hooks cannot cover it.
- Future `extensions/siso-app-mode/` if needed.

Required smoke:

```bash
npm run smoke:renderers
npm run smoke:syntax
```

Manual check:

```bash
siso
```

### P1 - Better model selector

Goal:

```txt
Clean model labels, provider grouping, current/default markers, and short descriptions.
```

Likely owners:

- `scripts/patch-pi-native-renderers.mjs`
- Pi model selector component patch
- optional future `extensions/siso-app-mode/`

Required smoke:

```bash
npm run smoke:renderers
```

Manual check:

```txt
Open model selector inside siso and verify labels/grouping.
```

### P1 - Command overlays

Goal:

```txt
Make /model, /agents, /status, /context, /sessions, /theme feel fast and coherent.
```

Likely owners:

- `extensions/siso-agent-router/index.js`
- `extensions/siso-status/index.js`
- `extensions/siso-context-manager/index.js`
- optional future `extensions/siso-app-mode/`

Required smoke:

```bash
npm run smoke:agents-command
npm run smoke:status-widget
npm run smoke:context-explain
```

### P1 - TUI snapshot/workbench coverage

Goal:

```txt
Keep a deterministic demo/snapshot surface for new visual primitives before touching live Pi renderers.
```

Owners:

- `scripts/tui-demo.mjs`
- `scripts/tui-demo-components/index.mjs`
- `scripts/smoke-tui-demo.mjs`

Required smoke:

```bash
npm run smoke:tui-demo
```

## Backlog

- Replace patch-heavy native renderer customizations with extension-owned `ctx.ui.setFooter()` where Pi supports it reliably.
- Add a SISO app-mode extension for startup/loading, model selector, command overlays, and persistent agent/status panels.
- Add a right-side agent/activity rail on wide terminals only.
- Add grouped permission cards for bash/write/network/agent spawn approvals.
- Add compact file/artifact/source chips below assistant turns.
- Add richer session resume/fork/rename UX.
- Add terminal-width visual checks for 80x24, 100x32, and 140x40.
- Decide whether `siso opentui` should remain a sandbox, become an alias, or be removed from the main command surface.

## Verification Matrix

Run before claiming TUI work is complete:

```bash
npm run smoke:renderers
npm run smoke:native-output-polish
npm run smoke:pi-output-map
npm run smoke:status-widget
npm run smoke:tui-demo
npm run smoke:syntax
```

Measure startup without spending model tokens:

```bash
npm run measure:siso-startup
```

Run when touching OpenTUI sandbox:

```bash
npm run smoke:opentui-app
npm run smoke:opentui-runtime
```

Run when touching child-agent/status UI:

```bash
npm run smoke:agents-command
npm run smoke:child-notifications
npm run smoke:subagents
npm run smoke:spawn-result
npm run smoke:subagent-lifecycle
```

Manual checks:

```bash
siso
SISO_STATUS_UI=full siso
SISO_AGENT_ROUTER_UI=full siso
SISO_LIFECYCLE_UI=compact siso
```

## Catalog Update Rule

When adding, changing, or removing a TUI improvement:

1. Update this catalog in the same change.
2. Add or update the relevant smoke command.
3. Keep plain `siso` as the primary product surface unless a decision doc says otherwise.
4. Treat `apps/siso-opentui` as sandbox/reference unless explicitly promoted.
