# SISO Agent Contracts

Agent contracts are subsystem-specific rules that tell agents:

- what files are in scope
- what files are risky
- what must not change
- what validation commands must run
- what evidence is needed before claiming done

This directory starts as a design/registry layer. Enforcement should come later through `siso doctor contracts`, test-space coverage, and eventually preflight/stop hooks.

## Research basis

See `docs/contracts/agent-final-check.md` and the contract registry in `docs/contracts/contracts.json`.

## Contract lifecycle

```txt
idea -> draft -> active -> enforced -> retired
```

## Enforcement levels

- `advisory` — warn only
- `required` — must be checked before final response/release
- `permission-gated` — human approval for risky files/actions
- `blocking` — cannot pass doctor/release checks until fixed

## Minimal contract shape

```json
{
  "id": "release-metadata",
  "appliesTo": ["VERSION", "package.json", "releases/latest.json", "CHANGELOG.md"],
  "rules": ["Version metadata must agree."],
  "requiredCommands": ["npm run smoke:release"],
  "riskFiles": ["bin/siso", "bin/siso-doctor"],
  "evidence": ["commandsRun", "filesChanged", "summary"]
}
```

## Diff-aware check

Run:

```bash
node scripts/smoke-contracts.mjs --changed
```

This compares current git changes to contract `appliesTo` globs and writes `test-space/results/contracts-report.json` with matched contracts, required commands, and permission-gated risk notes. See `agent-final-check.md`.

## Capability links

Each contract can declare `capabilityIds`. The contracts smoke validates those IDs against `docs/capabilities/registry.json`. This connects:

- capability = what exists
- contract = rules/evidence for changing it
- test-space = how those rules are tested
