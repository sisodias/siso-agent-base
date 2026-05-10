# Subagent Improve Log

Generated: 2026-05-10T08:13:09.371Z

## Baseline

- Task records existed, but there was no pure scheduler boundary for `claim_next`, ready waves, failure propagation, or subtree resume.
- Child notifications existed, but mailbox delivery/read/ack/redelivery and append-only channel feeds were not modeled as separate primitives.
- Profiles existed as hardcoded router entries, but there was no trusted markdown project/user agent registry or enforceable tool ACL parser.
- Runtime status could report stale active records, but there was no dedicated supervisor helper for heartbeat derivation, process fingerprinting, health aggregation, or package classification.
- Agent scorecards, persisted supervisor records, and extension adapter validation were not yet first-class SISO primitives.
- No dedicated benchmark script validated the subagent stack primitives or regenerated the improve/package-map docs.

## Current

- Helper exports present: yes.
- Task scheduler primitives covered: yes.
- Task store scheduler integration covered: yes.
- Mailbox/feed primitives covered: yes.
- Child notification mailbox/feed integration covered: yes.
- Project agent registry and ACL primitives covered: yes.
- Heartbeat states covered: yes.
- Supervisor health aggregation covered: yes.
- Package classification covered: yes.
- Persisted supervisor records covered: yes.
- Agent scorecards covered: yes.
- Child-run scorecard harvesting covered: yes.
- Extension adapter contract covered: yes.
- Package map doc available: [subagent-extension-package-map.md](subagent-extension-package-map.md).

## Implemented Primitives

| Primitive | Status | Notes |
|---|---|---|
| `claimNextTask/buildReadyWave/failAndBlockChildren/resumeFailed` | ready | claim, wave, failure propagation, and subtree resume sample records all pass. |
| `claimNextSisoTask/buildSisoTaskWave/failAndBlockSisoTask/resumeFailedSisoTask` | wired | persistent task-store claim, wave, fail/block, and resume operations all pass. |
| `createMailboxMessage/markMailbox*/shouldRedeliver` | ready | queued, delivered, read, acknowledged, and redelivery checks are covered. |
| child notification mailbox/feed write-through | wired | parent notification delivery writes mailbox and task feed records. |
| `appendFeedEvent/readFeedEvents/normalizeChannelName` | ready | append-only channel events round-trip independently of mailbox ack state. |
| `loadProjectAgentRegistry/normalizeToolAcl/isToolAllowed` | ready | markdown frontmatter and deny-wins ACL grammar are covered. |
| `deriveHeartbeatState(record, now)` | ready | healthy, warn, stale, and dead sample records all map correctly. |
| `buildProcessFingerprint(record)` | ready | distinct process metadata yields distinct fingerprints. |
| `summarizeSupervisorHealth(records)` | ready | aggregate counts and age tracking are present. |
| `createDeadletterRecord/nextRetryState/shouldCleanupOrphanProcess` | ready | deadletter, retry backoff, and orphan identity checks are covered. |
| `classifyPackageForSubagentUse(pkg)` | ready | reference and future-candidate package classes are distinguished. |
| `persistSupervisorRecord/listSupervisorRecords` | ready | active/retry/deadletter/orphan records append to `.siso/supervisor/*.jsonl`. |
| `recordAgentScorecard/listAgentScorecards` | ready | scorecards persist under `.siso/evals/results` and summarize best agent runs. |
| `recordChildRunScorecard(record)` | wired | terminal child run records can be harvested into scorecards with latency, token-cost, and finding counts. |
| `validateExtensionAdapter/createExtensionAdapterManifest` | ready | adapter manifests declare id, risk, capabilities, and executable run support. |

## Runtime Wiring

- `siso_task_schedule` exposes persistent `claim-next`, `wave`, `fail`, and `resume` operations through the router.
- `/tasks` exposes list, claim, wave, fail, and resume from slash-command flows.
- Child notification delivery now writes mailbox records and append-only `#task/<id>` / `#session/<id>` feed events.
- `siso_mailbox` exposes list, show, read, ack, and feed inspection for parent-session deliveries.
- `siso_project_agents` exposes trusted markdown agent discovery and ACL checks through the router.
- `siso_spawn` can select a trusted markdown project/user agent and applies deny-wins ACL filtering before spawn.
- Project-agent collisions are deterministic: trusted project agents shadow same-name user agents and the registry reports collisions.
- `/agents report` includes a supervisor summary for active child records.
- `/agents report` includes a mailbox delivery/read/ack summary for the parent session.
- `siso_supervisor` exposes health, retry, deadletter, and cleanup-check operations.
- `siso_supervisor` persists and lists active, retry, deadletter, and orphan records under `.siso/supervisor`.
- `siso_agent_scorecards` records, lists, and summarizes `.siso/evals/results` scorecards.
- Delivered terminal child runs now persist scorecards back onto the run record and `.siso/evals/results`.
- `siso_spawn` can auto-select trusted markdown project/user agents from matching scorecards when no explicit agent is supplied.
- `siso_extension_adapter` validates adapter manifests before package candidates are promoted to runtime.
- Supervisor helpers expose deadletter, retry, and orphan cleanup identity decisions for future action surfaces.
- `audit:subagent-architecture` regenerates the package-to-layer architecture audit.

## Verification Commands

```bash
npm run smoke:subagent-stack
npm run benchmark:subagent-stack
node scripts/benchmark-subagent-stack.mjs --smoke
```

## Package Map Links

- [Package map](subagent-extension-package-map.md)
- [Subagent package audit round 2](subagent-package-audit-round2.md)
- [Subagent extension candidates](subagent-extension-candidates.md)

## Checked Packages

| Package | Repo | SISO use |
|---|---|---|
| [pi-subagents](https://pi.dev/packages/pi-subagents) | [repo](https://github.com/nicobailon/pi-subagents) | reference / copy-pattern |
| [pi-crew](https://pi.dev/packages/pi-crew) | [repo](https://github.com/baphuongna/pi-crew) | reference / copy-pattern |
| [@spences10/pi-team-mode](https://pi.dev/packages/@spences10/pi-team-mode) | [repo](https://github.com/spences10/my-pi) | candidate / install-check |
| [@melihmucuk/pi-crew](https://pi.dev/packages/@melihmucuk/pi-crew) | [repo](https://github.com/earendil-works/pi/issues/new?labels=package-report&title=Package+Report%3A+%40melihmucuk%2Fpi-crew&body=Package%3A+%40melihmucuk%2Fpi-crew%0AVersion%3A+1.0.15%0A%0ADescribe+your+concern%3A%0A) | candidate / audit |
| [pi-messenger-swarm](https://pi.dev/packages/pi-messenger-swarm) | [repo](https://github.com/monotykamary/pi-messenger-swarm) | reference / copy-pattern |
| [taskplane](https://pi.dev/packages/taskplane) | [repo](https://github.com/HenryLach/taskplane) | reference / copy-pattern |
| [@0xkobold/pi-orchestration](https://pi.dev/packages/@0xkobold/pi-orchestration) | [repo](https://github.com/0xKobold/pi-orchestration) | candidate / install-check |
| [@x1any/pi-swarm](https://pi.dev/packages/@x1any/pi-swarm) | [repo](https://github.com/x1any/pi-swarm) | candidate / install-check |
| [@tintinweb/pi-subagents](https://pi.dev/packages/@tintinweb/pi-subagents) | [repo](https://github.com/tintinweb/pi-subagents) | candidate / audit |
| [@e9n/pi-subagent](https://pi.dev/packages/@e9n/pi-subagent) | [repo](https://github.com/espennilsen/pi) | candidate / audit |
| [pi-agent-router](https://pi.dev/packages/pi-agent-router) | [repo](https://github.com/MasuRii/pi-agent-router) | candidate / audit |
| [pi-task-subagents](https://pi.dev/packages/pi-task-subagents) | [repo](https://github.com/sids/pi-extensions) | candidate / install-check |

## Notes

- The benchmark stays light: it checks local module exports, sample records, package classification, and doc coverage.
- The smoke mode reuses the same checks without rewriting the docs.
