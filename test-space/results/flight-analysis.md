# SISO Flight Recorder Analysis

Generated: 2026-05-10T08:14:07.814Z

## Summary

- Traces: 8
- Unique run IDs: 8
- Average overall score: 77
- Validation pass rate: 31/31 (1)
- Failed active run families: 0
- Active run families: 3
- Historical warnings: 18
- Active errors: 0

## Recommendations

- **low** install-drift-resolved-monitor: Historical install/runtime drift was detected but the latest run is clean; keep monitoring.
- **medium** record-child-agent-events: Flight traces do not yet include child agent events; wire subagent lifecycle once subagents are healthy.

## Event counts

- command.validation: 31
- context.filtered: 1
- contract.matched: 18
- drift.detected: 2
- file.changed: 9
- file.read: 25
- run.completed: 8
- run.started: 8
- scorecard.updated: 8
- tool.completed: 47
- tool.started: 47

## Traces

- `code-intel-2026-05-09T17-49-47-616Z.json` — code-intel-2026-05-09T17-49-47-616Z, overall=65, validations=1/1, risks=1
- `code-intel-2026-05-09T17-50-40-292Z.json` — code-intel-2026-05-09T17-50-40-292Z, overall=82, validations=1/1, risks=0
- `context-filter-2026-05-09T17-45-47-967Z.json` — context-filter-2026-05-09T17-45-47-967Z, overall=79, validations=4/4, risks=0
- `doctor-readiness-2026-05-09T17-05-21-017Z.json` — doctor-readiness-2026-05-09T17-05-21-017Z, overall=78, validations=5/5, risks=13
- `doctor-readiness-2026-05-09T17-11-14-767Z.json` — doctor-readiness-2026-05-09T17-11-14-767Z, overall=78, validations=5/5, risks=5
- `doctor-readiness-2026-05-09T17-18-45-174Z.json` — doctor-readiness-2026-05-09T17-18-45-174Z, overall=78, validations=5/5, risks=0
- `doctor-readiness-2026-05-09T17-19-14-638Z.json` — doctor-readiness-2026-05-09T17-19-14-638Z, overall=78, validations=5/5, risks=0
- `doctor-readiness-2026-05-09T17-19-16-621Z.json` — doctor-readiness-2026-05-09T17-19-16-621Z, overall=78, validations=5/5, risks=0
