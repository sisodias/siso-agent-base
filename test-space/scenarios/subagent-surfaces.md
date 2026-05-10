# Scenario: Subagent Surfaces

Goal: validate child spawn/control/notification lifecycle once live subagents are healthy.

Run:

```bash
npm run smoke:child-control
npm run smoke:child-notifications
npm run smoke:subagent-lifecycle
npm run smoke:subagents
npm run smoke:spawn-result
npm run smoke:composite-result
```

Current note: live subagents are known broken in this session, so this suite is tracked but should be treated as manual/blocked until fixed.
