# Claude Code Feature Parity Checklist

Date: 2026-05-06

Purpose: use `ruvnet/open-claude-code` as a Claude Code subsystem checklist without adopting its source or runtime.

Reference source:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/ruvnet-open-claude-code
```

Research note:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-06-open-claude-code.md
```

## Verdict

`open-claude-code` is useful as a feature map, smoke-test checklist, and isolated alternate harness experiment. It is not a drop-in Pi harness dependency.

Reasons:

- It installs and tests cleanly only when isolated from global agent/skill state.
- It is Claude-shaped and `.claude`-path oriented.
- Its Anthropic call path is hardcoded to Anthropic's public endpoint, not the lab's Bifrost Anthropic route.
- It is decompile-informed, so the lab should borrow concepts and contracts only.

Runnable experiment:

```bash
npm run occ:bifrost -- status
npm run occ:bifrost -- run --prompt "Reply exactly: OCC_BIFROST_OK"
npm run smoke:occ-bifrost
```

Experiment note:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/experiments/open-claude-code-bifrost.md
```

## First Checklist

| System | open-claude-code reference | Current Pi harness equivalent | Status | Missing first slice |
| --- | --- | --- | --- | --- |
| Agent loop events | `v2/src/core/agent-loop.mjs` yields request, stream, assistant, tool progress, tool result, hook permission, and stop events. | `packages/siso-agent-router/src/agent-events.ts` defines `SisoAgentEvent`; `spawn-layer.ts` emits start/finish plus parsed model/tool/assistant events; `council-layer.ts` and `workflow-layer.ts` aggregate child event trails into parent results; composite `siso` route/spawn/council/workflow calls attach foreground `permission_check` and `tool_result` events around those child trails. | Strong partial | Expose compact event summaries in status UI and add persistence/query views for foreground runs. |
| Tool registry | `v2/src/tools/registry.mjs` uses tool modules with `name`, `description`, `inputSchema`, `validateInput`, and `call`. | Pi provides tools/extensions; `siso` exposes router commands and repo/skill/spawn actions. | Partial | Document the Pi-native tool adapter shape and require validation/result metadata for each `siso` action. |
| Permission modes | `v2/src/permissions/checker.mjs` models plan/default/acceptEdits/auto/dontAsk/bypass modes. | `packages/siso-agent-router/src/profile-registry.ts` gives every profile a `permissionProfile`; `chooseRoute()` carries it into child prompts and formatted decisions; `buildSpawnSpec()` strips `edit/write` unless the profile permits edits and exposes no tools for `deny_by_default`; composite `siso` actions now record the foreground permission profile used for the action. | Strong partial | Add actual foreground mutation gating for task/child control actions before exposing more write-capable operations. |
| Lazy tools and skills | `ToolSearch`, `Skill`, `skills/loader.mjs`, and `agents/loader.mjs` keep discovery separate from bodies. | `packages/siso-agent-router/src/skill-hub.ts` and repo recommender already move this way. | Strong partial | Add a deferred tool/schema registry so child agents receive only tool names until requested. |
| Context compaction | `v2/src/core/context-manager.mjs` has threshold compaction and micro-compaction of stale tool results. | Lab has `pi-context-prune` as a pilot and Bifrost token metrics in `siso-status`. | Partial | Gate context pruning behind measured token/cache recovery tests. |
| Settings chain | `v2/src/config/settings.mjs` models global/project/local/env settings with feature flags. | `pi-codex` wrapper and profile registry already prefer isolated config. | Partial | Document final precedence for lab profile, project overrides, task policy, and env overrides. |
| Hooks | `v2/src/hooks/engine.mjs` models pre/post tool and stop/session hooks. | `packages/siso-lifecycle` has lifecycle primitives. | Partial | Map lifecycle events to Pi extension hooks and Bifrost telemetry rows. |
| MCP transports | `v2/src/mcp/` covers client plus SSE, WebSocket, and Streamable HTTP transports. | Pi supports MCP; lab has not selected a dynamic MCP import strategy yet. | Backlog | Add read-only MCP config inspection before allowing runtime tool import. |
| Sessions/checkpoints | `v2/src/core/session.mjs` and `checkpoints.mjs` model session export/import and file checkpoints. | `pi-rewind` and task/session IDs are pilots. | Backlog | Create one shared session/task id used by planning, tasks, rewind, and supervisor-lite. |
| Upstream drift verification | `.github/workflows/nightly.yml` detects upstream releases and gates release on tests/audit/smoke. | Lab has `verify:local`, `verify:live`, and token budget checks. | Strong partial | Add a scheduled or manual Pi drift check that watches Pi package updates and writes a local report. |

## Adopt

- Permission-mode vocabulary.
- Event stream vocabulary.
- Deferred tool/skill discovery pattern.
- Drift-check pipeline structure.
- Broad subsystem checklist.

## Do Not Adopt Directly

- Source files.
- Direct Anthropic provider path.
- `.claude` state paths as Pi defaults.
- Global install flow.
- Permission checker as a security boundary.
- Claims of feature parity without local verification.

## Next Build Tickets

1. Expose compact `SisoAgentEvent` summaries in the status UI/dashboard.
2. Add actual foreground mutation gating for task/child control actions.
3. Add a deferred tool schema registry to `siso-agent-router`.
4. Add a Pi upstream-drift check script that runs local verification and token budgets.
5. Add isolated test guidance for any repo that reads global agent/skill paths.
6. Extend the `pi-codex` vs `occ-bifrost` comparison smoke to include grep and dry-run edit cases.
