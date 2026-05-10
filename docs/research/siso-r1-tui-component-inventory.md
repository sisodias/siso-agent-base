# SISO R1 TUI Component Inventory

Date: 2026-05-09
Status: clean-room inventory + demo implementation tracker

## Purpose

Track the component families needed to rebuild a Claude-level terminal UI on top of the SISO R1/Pi runtime without copying proprietary implementation code. This inventory is based on high-level local file/category names from the Claude-like reference plus current R1/SISO capabilities.

## Current demo component coverage

Implemented in the isolated workbench only:

- `scripts/tui-demo.mjs`
- `scripts/tui-demo-components/index.mjs`
- `scripts/tui-demo-components/theme.mjs`
- `scripts/smoke-tui-demo.mjs`

Demo modes now covered:

- `composer`
- `tool-cards`
- `agent-ops`
- `workflow`
- `permissions`
- `messages`
- `menus`
- `settings`
- `mcp`
- `diff`
- `markdown`
- `budget`
- `transcript`
- `code`
- `agent-detail`
- `permissions-full`
- `help`
- `wizard`
- `sandbox`
- `narrow`
- `short`
- `all`

Demo primitives now available:

- Shell/layout: `Divider`, `StatusLine`, `Breadcrumb`, `Card`, `Notice`, `Table`, `ListRow`, `SelectList`
- Composer/menu: `PromptComposer`, `OverlayMenu`, `KeyHint`, `AttachmentChip`, `ContextChip`
- Message/markdown: `MessageGroup`, `MessageRouter`, `TranscriptViewport`, `MarkdownBlock`, `CodeBlock`
- Tools: `ToolCard`, `ToolSubject`, `ToolOutputPreview`, `ToolErrorPreview`
- Permissions: `PermissionCard`, `PermissionDialog`, `PermissionRulePreview`, `BashPermissionRequest`, `FilePermissionRequest`, `WebFetchPermissionRequest`, `SkillPermissionRequest`, `ChildAgentSpawnPermissionRequest`
- Agent ops: `ChildAgentRow`, `WorkflowStepRow`, `CouncilMemberRow`
- Diff/editing: `DiffCard`, `StructuredDiffCard`, `DiffHunk`, `DiffAddedLine`, `DiffRemovedLine`, `DiffContextLine`
- Progress/meters: `Spinner`, `ProgressBar`, `ProgressLine`, `StatusPill`, `ContextMeter`, `TokenBudgetMeter`, `FleetBudgetMeter`
- Detail/help/setup: `AgentDetail`, `AgentTimeline`, `McpServerDetail`, `HelpPanel`, `ShortcutTable`, `WizardStep`, `SandboxConfigPanel`
- Formatting: `TruncatedPath` / `truncatePath`, ANSI-aware `fit`, `sanitizeChildLabel`

These are static/demo-only and do not alter live runtime behavior.

## Reference component families observed at high level

The Claude-like reference has hundreds of component files. Major categories observed by directory/file taxonomy include:

- `PromptInput/` — input editor, footer, suggestions, queued commands, mode indicator, stash/notifications/history/voice.
- `messages/` — assistant/user/tool messages, grouped tool content, thinking text, attachments, notices, compact boundaries.
- `permissions/` — bash/file/write/edit/web/notebook/skill/user-question/plan-mode permission requests and rule UI.
- `agents/` — agent list/detail/editor/navigation/new-agent creation.
- `mcp/` — MCP server/tool/status related UI.
- `diff/` and `StructuredDiff/` — diff rendering and structured file-change views.
- `Settings/` — settings, model/provider/config style surfaces.
- `HelpV2/` — help and command documentation surfaces.
- `skills/`, `tasks/`, `memory/` — domain panels for agent capabilities and task/memory state.
- `wizard/`, `sandbox/` — guided setup/configuration flows.
- `design-system/`, `ui/`, `CustomSelect/` — reusable low-level primitives.
- top-level surfaces including `App`, `FullscreenLayout`, `StatusLine`, progress lines, onboarding/auth/status boxes.

## Gap tracker

| Area | Demo status | Live R1 status | Priority | Notes |
| --- | --- | --- | --- | --- |
| Prompt composer | partial static | live editor exists, not unified | P0 | Need footer/mode/chips/suggestions parity before live integration. |
| Tool cards | partial static | live tool renderers exist | P0 | Good first integration candidate after demo review. |
| Agent ops | partial static | backend strong, UI limited | P0 | SISO can exceed reference here with fleet/budget/workflow/council. |
| Permission cards | partial static | live approval UX not unified | P0 | Need risk/action/rule primitives. |
| Message groups | partial static | live user/assistant components exist | P1 | Need grouping/thinking/notices/attachments/code blocks. |
| Menus/overlays | partial static | selectors exist but fragmented | P1 | Need reusable overlay/select/list primitives. |
| Workflow/council | partial static | backend exists | P1 | Build as SISO-native differentiator. |
| Settings/model selectors | partial static | live selectors exist | P2 | Unify later under design system. |
| MCP | partial static | needs mapping | P2 | Add status + auth + tool preview surfaces. |
| Diff/structured diff | partial static | live diff exists | P1 | Demo now has `DiffCard` and `StructuredDiffCard`; needs richer hunks later. |
| Help/wizard/sandbox | partial static | partial live surfaces | P3 | Demo has `HelpPanel`, `WizardStep`, and `SandboxConfigPanel`. |
| Transcript viewport | partial static | chat container exists | P2 | Demo has `TranscriptViewport` and `MessageRouter`; virtualization deferred. |

## Safe next implementation batches

### Batch A — Expand demo-only component library

- Add `Table` / `ListRow` primitive for selectors and task panels.
- Add richer `DiffHunk`, `DiffAddedLine`, `DiffRemovedLine` primitives.
- Add specialized permission request variants.
- Add richer transcript viewport / message router demo.

### Batch B — Design SISO AgentOpsPanel in demo

- Child agent rows.
- Fleet status and queue pressure.
- Token/tool/runtime budget rows.
- Workflow worker rows.
- Council member comparison rows.
- Hidden child notification delivery status.

### Batch C — ToolCard live integration candidate

After demo review, integrate only the safest live surface first:

- tool summary row formatting
- bash/file/search/web variants
- output preview/collapse behavior

Do not start with the composer.

## Guardrails

- Keep workbench static and provider-free.
- Do not copy reference code.
- Do not alter live routing, Bifrost, child notifications, context filtering, or launcher behavior from demo work.
- Add smoke coverage for every new demo mode at 40/80/120 columns.


## Additional demo coverage added later

Newer demo primitives now also include deeper prompt footer/suggestions/queued/stash/voice/sandbox hint states; per-message renderers; grouped tool content; specialized tool cards for bash/read/edit/search/web/MCP; and specialized permission requests for notebook, plan mode, ask-user, workflow, council, and external routes.

Current demo library export count: 111.


## Product shell expansion

Additional demo primitives now include auth/OAuth/API-key approval, theme selector, changelog/update/doctor, repo map/git/branch summary, compaction/cost/session stats, command palette/slash help, modal/confirm/toast/error boundary, media/image/input/empty/loading states, team/feedback/desktop companion panels. Current demo library export count: 139.


## Layout and deep ops expansion

Additional primitives now include TabBar, SplitPane, Accordion, TreeView, CheckboxList, RadioGroup, telemetry/log/queue panels, FleetDetailPanel, WorkflowGraph, CouncilSynthesisCard, TaskDependencyPanel, SecuritySettingsPanel, ApprovalModeSelector, SandboxDependenciesPanel, EnvVarPanel, and FileChangeSummary. Current demo library export count: 158.


## Final stretch expansion

Additional demo primitives now include accessibility/keybinding conflict panels, smoke/test failure/release/install panels, router/context/child notification delivery cards, budget pressure/tool approval summaries, web search/notebook/todo/plan panels, IDE/file/image/clipboard/external editor attachments, history timeline, and session export. Current demo library export count: 183.


## Extended advanced surface expansion

Additional demo primitives now include code review/inline comment/patch apply/rollback, database/json/csv/api/browser/computer-use cards, terminal/process/performance panels, feature flags/experiments/localization, theme palette/density previews, privacy/data-retention/audit logs, prompt templates/snippets, and macro recorder. Current demo library export count: 208.


## Ecosystem and maintenance expansion

Additional demo primitives now include extension/plugin/profile/skill marketplace panels, repo catalog/recommendations, benchmark/latency panels, timeline filters/event detail, keyboard shortcut editor, terminal capability/resize previews, server health/remote tunnels, backup/prune/maintenance panels, migration/compatibility matrix, and open-source license/contribution panels. Current demo library export count: 230.


## Operations quality expansion

Additional demo primitives now include guided tours/coach marks/project trust/workspace health, dependency/package/build/lint/typecheck/coverage panels, artifacts/download/cache panels, network/rate-limit/quota panels, and alert/incident/recovery panels. Current demo library export count: 250.
