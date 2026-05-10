# Session-Scoped Agent Runtime

Purpose: keep child-agent state scoped to the current SISO session while preserving the legacy durable child-run records for compatibility and auditing.

## What It Provides

- Session-owned agent records for HUD/status views.
- Compact child-agent event counts instead of dumping raw event logs into status output.
- Router projections that show only the current chat/session by default.
- Legacy child-run writes for older tooling that still reads `~/.siso/agent/child-runs`.
- Smoke coverage for session isolation, status widgets, and native subagent status.

## Implementation

- `extensions/siso-agent-router/session-store.js`
- `extensions/siso-agent-router/spawn-layer.js`
- `extensions/siso-status/index.js`
- `scripts/smoke-session-store.mjs`
- `scripts/smoke-session-isolation-status-context-lifecycle.mjs`
- `scripts/smoke-status-agent-widget.mjs`
- `scripts/smoke-native-subagent-status.mjs`

## Expected Behavior

Agents spawned from one parent session should not appear as active child rows in another parent session's normal status/HUD output.

Global files may still exist for compatibility, but user-facing status commands should prefer session-scoped records unless an explicit global or diagnostic view is requested.

## Verification

```bash
npm run smoke:session-store
npm run smoke:session-isolation
npm run smoke:status-widget
npm run smoke:subagents
```

For broad release validation:

```bash
npm run smoke:all
```
