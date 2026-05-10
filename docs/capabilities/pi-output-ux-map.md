# Pi Output UX Map

This file tracks the public runtime output surfaces patched by SISO.

## phase-level communication

SISO keeps progress messaging compact and phase-oriented so agents and humans can scan long runs without loading full transcripts.

## Runtime components

- `assistant-message.js` renders assistant output in the Pi interactive stream.
- `custom-message.js` renders custom/system status output.
- `tool-execution.js` renders tool start, progress, completion, and failure states.
- `extensions/siso-agent-router/output-style.js` owns SISO output-style defaults and preflight formatting.

## Validation

Run:

```bash
npm run smoke:pi-output-map
```
