# Session-Scoped Agent Runtime

## Purpose

Protects the Claude Code-style ownership rule that every subagent record belongs to a parent session, and that normal UI projections only show agents for the current chat.

## Commands

```bash
npm run smoke:session-store
npm run smoke:status-widget
```

## Expected Result

The session store smoke should prove that session A and session B cannot read each other's agents, raw event payloads remain in event logs, compact `eventCount` is preserved, and router projections stay compact. The status widget smoke should prove stale cross-session child rows do not render below the input.
