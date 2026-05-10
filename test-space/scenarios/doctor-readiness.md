# Scenario: Doctor Readiness

Goal: expose foundational health checks through operator-friendly doctor subcommands.

Run:

```bash
npm run smoke:doctor-readiness
```

Manual commands:

```bash
bin/siso-doctor drift
bin/siso-doctor contracts
bin/siso-doctor readiness
```

Pass criteria:

- drift subcommand runs source drift detector
- contracts subcommand runs diff-aware contract check
- readiness subcommand runs drift, contracts, capability registry, test-space, and coverage checks
