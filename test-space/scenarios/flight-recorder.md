# Scenario: Flight Recorder

Goal: validate the SISO run trace schema and example traces so future live runs can be replayed, scored, compared, and audited.

Run:

```bash
npm run smoke:flight-recorder
```

Outputs:

```txt
test-space/results/flight-recorder-summary.json
```

Pass criteria:

- schema exists and includes event, metric, and score fields
- example traces include run started/completed events
- metrics are non-negative numbers
- scorecard fields are 0-100
- validation events include command and status
