# OCC Contracts, Not Runtime

Date: 2026-05-06

## Decision

Use `ruvnet/open-claude-code` as a runnable comparison target and contract reference, not as the Pi harness runtime.

## Evidence

- `npm run smoke:occ-bifrost` passes text and `Read` tool loops through Bifrost after the local OpenAI tool-loop patch.
- `npm run smoke:pi-vs-occ-bifrost` passes the same text/read surface for `pi-codex` and OCC on `gpt-5.4-mini`.
- Latest bakeoff artifact:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/bakeoff/2026-05-06-open-claude-code/pi-vs-occ-bifrost-latest.json
```

- Latest totals: `pi-codex` used 2,925 Bifrost tokens; OCC used 9,330 Bifrost tokens.

## Implementation Slice

Implemented the first two OCC-inspired contracts in Pi-native code:

- `packages/siso-agent-router/src/profile-registry.ts`
  - Added `PermissionProfile`.
  - Added `permissionProfile` to every SISO profile.
- `packages/siso-agent-router/src/route-policy.ts`
  - Carries `permissionProfile` into every `RouteDecision`.
  - Includes `permission_profile=` in route output.
- `packages/siso-agent-router/src/agent-events.ts`
  - Adds a compact `SisoAgentEvent` union for run, model, assistant, tool, permission, and finish events.
- `packages/siso-agent-router/src/spawn-layer.ts`
  - Adds permission profile to child/Codex prompts.
  - Enforces child tool exposure from `permissionProfile`: strips `edit/write` for read-only profiles and exposes no tools for `deny_by_default`.
  - Records `run_started` and `run_finished` `SisoAgentEvent`s on spawn results and persisted child-run records.
  - Parses child JSON streams into `model_request`, `tool_call`, and `assistant_message` events when event state is available.
- `packages/siso-agent-router/src/council-layer.ts`
  - Carries member child events into each council member result and the aggregate council result.
- `packages/siso-agent-router/src/workflow-layer.ts`
  - Carries council events and worker child events into the aggregate workflow result.
- `packages/siso-agent-router/src/index.ts`
  - Wraps composite `siso` route/spawn/council/workflow results with foreground `permission_check` and `tool_result` events.
  - Preserves child event trails between the foreground start/end audit events so a caller can reconstruct the parent action and spawned work from one result object.
- `packages/siso-agent-router/src/repo-catalog.ts`
  - Normalizes research integration query separators so `claude code feel` matches `claude-code-feel`.

## Mapping

OCC vocabulary maps to Pi as:

| OCC concept | Pi-native contract |
| --- | --- |
| `plan` mode | `permissionProfile: "plan"` |
| default ask behavior | `permissionProfile: "ask"` |
| `acceptEdits` | `permissionProfile: "accept_edits"` |
| `dontAsk` | `permissionProfile: "deny_by_default"` |
| `bypassPermissions` | `permissionProfile: "lab_bypass"` |
| agent loop event stream | `SisoAgentEvent` |

## Consequence

Future build work should wire these contracts into stronger foreground mutation gating, status UI summaries, and queryable telemetry. Do not copy OCC source or move foreground execution from `pi-codex` to OCC.

Immediate next implementation work:

1. Add actual foreground mutation gating for task/child control actions.
2. Expose compact event summaries in the status UI/dashboard.
3. Persist/query foreground composite events rather than only returning them inline.
