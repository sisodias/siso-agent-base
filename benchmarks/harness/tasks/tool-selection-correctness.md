# Tool Selection Correctness

Goal: verify SISO can teach agents when to use native tools instead of falling back to shell/manual loops.

Primary signal: `docs/tools/scenario-cards.json` contains scenario cards for high-priority code-intelligence and validation tools.

Metrics:

- `correctToolSelection` — task scenarios map to the expected tool or pack.
- `nativeToolVsShellFallback` — cards identify shell habits replaced by native tools.
- `wastedToolCalls` — avoid/anti-trigger guidance reduces unnecessary calls.
- `stageMatch` — tools declare workflow stages such as recon, planning, verification, repair, docs, release.
- `antiTriggerAvoided` — avoidWhen guidance is present and actionable.

Command:

```bash
npm run smoke:tool-scenario-cards
```
