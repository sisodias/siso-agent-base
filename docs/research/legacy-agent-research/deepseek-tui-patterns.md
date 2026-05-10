# DeepSeek-TUI Pattern Extraction for Pi HUD

Source repo: <https://github.com/Hmbown/DeepSeek-TUI>
Local inspection: `/tmp/deepseek-tui` at `9fc0c41`
Captured: 2026-05-07

## Why this repo matters

DeepSeek-TUI is useful less for model/provider code and more for terminal UX structure. It has already solved several problems we have in Pi/SISO:

- a dense footer that degrades cleanly on narrow terminals
- live sub-agent visibility without flooding the main transcript
- a sidebar/dashboard that auto-collapses empty panels
- transcript cards for delegated/fanout work
- session picker patterns with search, sort, preview, and deletion flow
- deterministic animation/status rendering that is testable

The best path is not porting Rust/ratatui code. It is copying the UX contracts into Pi extension components using `ctx.ui.setFooter`, `ctx.ui.setWidget`, custom overlays, and custom message renderers.

## Key files inspected

- `crates/tui/src/tui/widgets/footer.rs`
- `crates/tui/src/tui/widgets/agent_card.rs`
- `crates/tui/src/tui/sidebar.rs`
- `crates/tui/src/tui/session_picker.rs`
- `crates/tui/src/tui/subagent_routing.rs`
- `docs/ARCHITECTURE.md`

## High-value patterns to steal

### 1. Props-first rendering

DeepSeek footer widgets receive a `FooterProps` snapshot and render from that only. The widget does not read mutable app state during render.

For Pi, this means SISO HUD should build a single `HudProps` object from:

- selected model / Bifrost route
- route profile/lane
- prompt/context/token estimate
- active children
- latest tool/action
- retry/error state
- current branch/cwd if available

Then render that props object into footer/widget lines. This keeps the render code simple and makes regression tests easy.

Candidate Pi shape:

```ts
export interface SisoHudProps {
  mode: string;
  model: string;
  route?: string;
  contextTokens?: number;
  outputTokens?: number;
  activeAgents: number;
  totalAgents: number;
  failedAgents: number;
  latestTool?: string;
  elapsed?: string;
  toast?: { kind: "info" | "warn" | "error"; text: string };
}
```

### 2. Footer priority drop

DeepSeek's footer has a strict degradation ladder. It tries full detail first, then drops low-priority chips until the line fits:

1. `mode · model · cost · status`
2. `mode · model · cost`
3. `mode · model`
4. `mode · truncated model`
5. `mode`

For Pi/SISO, the equivalent should be:

1. `π · model · ctx · agents · tool · elapsed`
2. `π · model · ctx · agents`
3. `π · model · agents`
4. `π · truncated model`
5. `π`

This directly improves the current status/widget output, which is useful but can become too long.

### 3. Auxiliary chip parade

DeepSeek keeps transient chips on the right side: coherence, agents, replay, cache, MCP, worked time. They appear/disappear without disturbing the left identity cluster.

For Pi:

- left cluster: `π`, model, route/profile, context
- right cluster: agents, latest tool, Bifrost latency/cost, retry, branch
- narrow terminals: drop from the right cluster first

Pi docs already expose `ctx.ui.setFooter()`, so this can be implemented as a proper footer replacement rather than patching the native footer.

### 4. Working wave animation

DeepSeek fills the gap between left and right footer clusters with a deterministic wave using block-height glyphs:

`▁▂▃▄▅▆▇█`

Important details:

- animation frame is an input, not hidden mutable widget state
- output is deterministic for tests
- the wave only appears while work is active

For Pi, implement a smaller static version first:

- idle gap: spaces
- active gap: `▁▂▃▄▅▆▇█` sampled by timestamp/frame
- failed/retry gap: maybe `⟳` or warning-colored separator

### 5. Sub-agent cards, not noisy logs

DeepSeek separates sub-agent UX into two surfaces:

- transcript card = detailed live state
- sidebar/footer = compact navigator/counts

`DelegateCard` shows:

- agent id/type
- lifecycle: pending/running/done/failed/cancelled
- last 3 actions only
- terminal summary line

`FanoutCard` shows:

- worker count
- dot grid: `●` done, `◐` running, `×` failed, `⊘` cancelled, `○` pending
- aggregate counts line

For Pi/SISO, this maps cleanly onto our router child records:

```text
agents 5 · 2 active · 2 done · 1 failed · latest 40s · Ctrl+O drawer
◐●×○○  1 done · 1 running · 1 failed · 2 pending
```

Current `packages/siso-status/src/status-state.ts` already has `toAgentWidgetLines()` and child snapshots. The immediate improvement is to replace the flat child lines with dot-grid + bounded action summaries.

### 6. Sidebar auto-collapse

DeepSeek's sidebar renders Plan/Todos/Tasks/Agents/Context, but empty panels collapse. Plan remains visible because it owns the empty-state hint.

For Pi, use widgets rather than a native right sidebar:

- below-editor widget in compact mode: only visible sections
- overlay drawer in expanded mode: plan/context/agents/activity
- no empty noisy sections except one helpful hint

Suggested section ordering:

1. active agents/fanout
2. current run/task
3. context usage
4. latest tool/activity
5. Bifrost route/provider health

### 7. Session picker UX

DeepSeek's session picker uses:

- search mode
- sort by recent/name/size
- preview cache
- selected-item viewport tracking
- confirm delete
- status line

This is relevant to future Pi session/history drawer. It suggests a good overlay command:

```text
/siso-sessions
```

Features:

- fuzzy search session title/content
- sort recent/name/tokens
- preview latest messages + child summaries
- enter resumes/opens
- delete with confirmation

Do not implement this before the HUD; it is second-order.

## Concrete implementation opportunities in this repo

### A. Improve `siso-status` compact widget

Owner files:

- `packages/siso-status/src/status-state.ts`
- `packages/siso-status/src/index.ts`
- tests in `packages/siso-status/test/*`

Work:

- add `agentDotGrid(children)`
- update `agentDrawerLine(children)` to include dot grid
- cap child detail lines at 3-4
- preserve current env switch: `SISO_STATUS_UI=compact|full|off`

Example target output:

```text
agents ◐●×○ · 1 active · 1 done · 1 failed · latest 42s · Ctrl+O drawer
◐ scout · Spark · 42s · 3.1kt · reading footer.rs
● reviewer · Spark · 1m · 5.4kt · done
× worker · MiniMax · failed · timeout
```

### B. Add a real footer replacement prototype

Pi docs say `ctx.ui.setFooter()` can replace the footer. Add a guarded env mode:

```text
SISO_STATUS_FOOTER=1
```

Render priority tiers:

- full: `π · Spark · ctx █░ 4.1k→0.8k · 2 agents · bash · 1m`
- medium: `π · Spark · ctx 4.1k · 2 agents`
- narrow: `π · Spark`
- tiny: `π`

Keep `setStatus` as fallback for older Pi runtimes.

### C. Add fanout card rendering for completed child messages

`packages/siso-status/src/index.ts` already registers a `siso-agent` message renderer. Extend it or add a grouped renderer to show fanout completion summaries as dot-grid cards.

Useful if `siso.workflow` or `siso.spawn` emits multiple child records.

### D. Add overlay drawer later

Use Pi `ctx.ui.custom(..., { overlay: true, overlayOptions: { anchor: "right-center", width: "45%" } })` for a richer drawer.

Drawer sections:

- agents dot grid + rows
- latest activities
- context breakdown
- Bifrost route/latency/cost
- key help

This should come after compact widget/footer because it is more API surface and requires input handling.

## Recommended sequence

1. Patch `siso-status` child widget with dot-grid and priority-truncated lines.
2. Prototype `SISO_STATUS_FOOTER=1` with props-first footer rendering.
3. Add overlay drawer only after the compact/footer surfaces feel right.

## Risks / notes

- DeepSeek is Rust/ratatui; Pi is TS component strings. Port ideas, not code.
- Pi custom footer API may not exist in all installed versions; use optional chaining/fallback.
- All rendered lines must obey Pi width rules. Use `truncateToWidth` from `@mariozechner/pi-tui` if available.
- Keep state building separate from rendering so tests can pin exact output.
