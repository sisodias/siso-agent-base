# Scenario: Agent Contracts

Goal: prove the draft contract registry is valid and useful enough for future enforcement.

Run:

```bash
npm run smoke:contracts
```

Pass criteria:

- every contract has valid ID/status/level
- every contract has appliesTo, rules, requiredCommands, and evidence
- referenced npm commands exist
- research/design docs exist
