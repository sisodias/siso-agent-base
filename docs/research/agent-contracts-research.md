# Agent Contracts Research

Date: 2026-05-09
Status: initial research + SISO contract candidates

## Goal

Figure out what SISO agent contracts should be by looking at existing local docs, Claude Code docs, prior Agent OS ADRs, and common software quality-gate patterns.

## Local sources inspected

- `ecosystem_context/claude-code-docs/hooks.md`
- `ecosystem_context/claude-code-docs/hooks-guide.md`
- `ecosystem_context/claude-code-docs/permission-modes.md`
- `ecosystem_context/claude-code-docs/best-practices.md`
- `ecosystem_context/architectural_decisions/ADRs/ADR-004-skill-hook-deployment.md`
- `ecosystem_context/architectural_decisions/ADRs/ADR-002-agent-os-structure.md`
- Current SISO files: `package.json`, `docs/capabilities/`, `test-space/`, `extensions/siso-agent-router/`, `scripts/smoke-*.mjs`.

No proprietary source was copied. Claude/OpenClaude material is used only as behavioral/product reference.

## Patterns from other systems

### 1. Hooks / lifecycle gates

Claude Code docs expose lifecycle hook concepts such as session start, prompt submit, pre-tool, post-tool, notification, stop, and subagent stop. The important product idea is not the exact implementation; it is that checks happen at predictable lifecycle points.

SISO adaptation:

- `beforeTask` — load applicable contracts.
- `beforeTool` — warn/block risky edits or commands.
- `afterTool` — record files touched, commands run, failures.
- `beforeFinal` — verify required evidence and smokes.
- `afterRun` — update test-space/results and changelog candidates.

### 2. Permission modes and protected paths

Claude permission docs distinguish normal work, planning, accepted edits, bypass/danger modes, and protected paths. The key idea is risk-tiering.

SISO adaptation:

- advisory for docs/demo work
- required for release/capability/test-space work
- permission-gated for router, launcher, install, auth, profile, and subagent runtime files
- blocking for release metadata drift or missing required validation

### 3. CODEOWNERS / branch protection / CI required checks

Common GitHub patterns: CODEOWNERS identifies ownership; branch protection requires specific checks before merge. These are simple and proven.

SISO adaptation:

- contracts own file globs
- contracts declare required smoke commands
- `siso doctor contracts` reports missing required checks
- release cannot claim complete if active contracts fail

### 4. Pre-commit / lint-staged / Danger-style review bots

These tools inspect changed files and run targeted checks. Danger-style bots comment on risky changes and missing tests.

SISO adaptation:

- changed files -> matching contracts
- matching contracts -> required commands + risk warnings
- final agent response must include evidence: files changed, commands run, unresolved risks

### 5. Policy-as-code / admission control

OPA, Conftest, Sentinel, and Kubernetes admission policies show a useful separation: policy is data, enforcement is a runner.

SISO adaptation:

- `docs/contracts/contracts.json` is policy data
- `scripts/smoke-contracts.mjs` validates policy shape
- later `siso doctor contracts` evaluates policy against git diff/run events

### 6. Agent OS ADRs: registry sync + hook promotion

Existing ADRs recommend registry sync, explicit hook promotion, active/staging/pipeline states, no hardcoded personal paths, and failing visibly instead of silent exit(0).

SISO adaptation:

- contract lifecycle: idea -> draft -> active -> enforced -> retired
- active contracts must have tests
- enforcement must fail visibly when required evidence is missing

## Contract quality rubric

A good SISO contract should be:

1. **File-scoped** — clear `appliesTo` globs.
2. **Behavior-scoped** — says what must not change.
3. **Validatable** — has required commands or manual evidence.
4. **Risk-tiered** — advisory/required/permission-gated/blocking.
5. **Small enough** — one subsystem per contract.
6. **Agent-readable** — concise rules, no huge prose wall.
7. **Evidence-based** — final response can prove compliance.
8. **Upgradeable** — starts draft, becomes active, then enforced.

## Initial SISO contract candidates

Highest ROI contracts first:

1. Release Metadata Contract
2. Capability Registry Contract
3. Test Space Contract
4. Router and Subagents Contract
5. Context Safety Contract
6. Install and Runtime Contract
7. TUI Workbench Contract

These are seeded in `docs/contracts/contracts.json`.

## Enforcement roadmap

### Phase 1 — Registry only

- Maintain `docs/contracts/contracts.json`.
- Validate schema with `npm run smoke:contracts`.
- Link contract capability in registry/test-space.

### Phase 2 — Diff-aware doctor

- Add `siso doctor contracts` or `npm run smoke:contracts` diff mode.
- Detect changed files.
- Show matching contracts and required commands.

### Phase 3 — Agent final-response gate

Before an agent claims done, it should report:

- applicable contracts
- changed files
- required commands run/skipped
- unresolved risks

### Phase 4 — Runtime hooks/events

Integrate with structured event stream:

- before edit/tool: warn/block risky operations
- after command: record validation evidence
- before final: require missing evidence

## Open research questions

- Should contracts live as JSON only, Markdown only, or both?
- Should enforcement be advisory by default until the system is stable?
- How do we handle currently broken subagent smokes without blocking all router work?
- Should capability registry and contracts be merged later, or stay separate linked registries?
