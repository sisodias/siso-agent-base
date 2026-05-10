# Autopilot Verifier Plan Scenario

Goal: prove SISO has an enforceable no-edit autopilot planning slice before building the full smoke/fix loop.

## Commands

```bash
npm run smoke:autopilot-verifier
npm run smoke:autopilot-plan
npm run smoke:tool-selection-eval
```

## Expected

- The verifier-loop design contract exists and names the controller, worker, read-only verifier, checkpoint, failure signature, feedback packet, session scope, and flight recorder expectations.
- `autopilotPlan` returns compact details with no raw logs or raw event payloads.
- Unsafe check commands are blocked in the plan.
- Tool recommendation selects `autopilotPlan` for post-implementation specification verification tasks.

## Failure Signals

- The design contract is missing or no longer describes session-scoped verifier feedback.
- The plan does not include checkpoint, verifier, failure signature, or flight-recorder fields.
- Tool selection falls back to repo search for post-implementation verification.
