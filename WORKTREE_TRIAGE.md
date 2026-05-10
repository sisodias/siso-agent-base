# SISO Agent Base Worktree Triage

Generated: 2026-05-10

## Current Shape

- Tracked modified files: runtime/router/status/context/install/release stack.
- Untracked files: mostly new docs, smokes, OpenTUI app files, test-space fixtures, extension catalog data, and persistent-agent state.
- Current untracked count by top-level area: `docs` 136, `apps` 112, `scripts` 97, `.siso` 78, `test-space` 49, `extensions` 20, `packages` 14, `benchmarks` 13, `bin` 6, `data` 5, `research` 4, `templates` 3, plus root files.
- Local/generated folders now ignored: `.pi/`, `.superpowers/`, `.firecrawl/`, `.siso/bin/`, `.siso/agents/_runtime/`, `.siso/repo-index/`, `.siso/reports/`, `.siso/tool-telemetry.jsonl`, `artifacts/`.

## Classification Summary

### A. Commit Candidate: Runtime/Core Agent System

These are real source changes and should stay together unless split into smaller runtime commits:

- `extensions/siso-agent-router/*.js`
- `extensions/siso-agent-router/*.d.ts`
- `extensions/siso-context-manager/*.js`
- `extensions/siso-context-manager/*.d.ts`
- `extensions/siso-lifecycle/index.js`
- `extensions/siso-status/*.js`
- `extensions/siso-status/*.d.ts`
- `templates/profile/SYSTEM.md`

Reason:

- These implement/verify router, child lifecycle, context filtering, status, mailbox, task scope, and provider/tool behavior.
- Multiple smokes now cover these paths.

### B. Commit Candidate: Install/Release Surface

- `VERSION`
- `package.json`
- `package-lock.json`
- `releases/latest.json`
- `CHANGELOG.md`
- `.npmrc`
- `install.sh`
- `scripts/install-local.sh`
- `bin/siso`
- `bin/siso-agent`
- `bin/siso-doctor`
- `bin/siso-update`
- `bin/siso-where`
- `bin/siso-pi`

Reason:

- These make the runtime changes installable and discoverable.
- `.npmrc` only contains `legacy-peer-deps=true`; no secret found.

Hold back / separate if desired:

- `bin/siso-tui`
- `bin/siso-tui-preview`
- `bin/siso-opentui-live`

Reason:

- User said other agents are working on SISO TUI, so keep TUI wrappers in a separate chunk.

### C. Commit Candidate: Diagnostics And Error Queue

- `scripts/analyze-tool-errors.mjs`
- `scripts/error-queue.mjs`
- `scripts/smoke-error-queue.mjs`
- `scripts/analyze-flight-recorder.mjs`
- `scripts/smoke-flight-recorder.mjs`
- `docs/flight-recorder/`
- `examples/flight-recorder/`

Reason:

- This is the durable error queue / diagnostics loop.
- Current queue is drained.
- Digest now separates actionable fixes from noise.

### D. Commit Candidate: Verification Harness

- `scripts/smoke-*.mjs` except TUI-specific smokes if splitting TUI
- `scripts/benchmark-subagent-stack.mjs`
- `benchmarks/harness/`
- `test-space/`
- `docs/contracts/`
- `docs/capabilities/`
- `docs/tools/`

Reason:

- These are test fixtures, smoke tests, tool packs, scenario cards, and contracts that protect the runtime changes.
- This is large enough to be its own verification commit.

### E. Commit Candidate With Product Decision: Persistent Agent State

- `.siso/agents/`
- `.siso/executive/`
- `tasks/lessons.md`
- `templates/profile/skills/`

Reason:

- These are intentional persistent-agent MVP files.
- Runtime pointer `.siso/agents/_runtime/` is ignored.
- Small markdown run history is useful durable context, but this still needs a deliberate "source state vs live state" decision before commit.

### F. Separate Other-Agent/TUI Slice

- `apps/siso-opentui/`
- `apps/siso-tui/`
- `packages/siso-tui/`
- `docs/tui/`
- `scripts/siso-opentui-live.mjs`
- `scripts/smoke-opentui-*.mjs`
- `scripts/smoke-siso-tui-*.mjs`
- `scripts/smoke-tui-demo.mjs`
- `scripts/tui-demo*.mjs`
- `scripts/tui-demo-components/`
- `bin/siso-tui`
- `bin/siso-tui-preview`
- `bin/siso-opentui-live`

Reason:

- User said not to worry about SISO TUI because other agents are working there.
- Keep this out of the main router/runtime cleanup commit unless explicitly asked.

### G. Generated Snapshot / Data Decision

- `data/extensions/extension-catalog.json`
- `data/extensions/pi-packages.raw.json`
- `data/extensions/shortlist.md`
- `data/extensions/approval-registry.seed.json`
- `docs/extensions-catalog.md`
- `docs/strategy/extension-*`
- `research/benchmarks/`

Reason:

- Router and benchmark code expects `data/extensions/extension-catalog.json`.
- `data/extensions/sources/` is ignored.
- Decide whether catalog snapshots are committed or rebuilt on demand.

### H. Local Ignore / Do Not Commit

Already ignored:

- `.pi/`
- `.superpowers/`
- `.firecrawl/`
- `.siso/bin/`
- `.siso/agents/_runtime/`
- `.siso/repo-index/`
- `.siso/reports/`
- `.siso/tool-telemetry.jsonl`
- `artifacts/`

Do not add these unless explicitly needed as fixtures.

## Review Buckets

### 1. Commit Candidate: Runtime And Router Core

- `extensions/siso-agent-router/*`
- `extensions/siso-status/*`
- `extensions/siso-context-manager/*`
- `extensions/siso-lifecycle/index.js`
- `bin/siso`, `bin/siso-doctor`, `bin/siso-update`, `install.sh`, `scripts/install-local.sh`

Initial review notes:

- Fixed duplicate `mode` key in `extensions/siso-agent-router/index.js`; it was overwriting council mode schema metadata.
- Fixed `smoke:syntax` so it checks all installed bin wrappers.
- `task-store.*` changed while this review was running; treat as active work from another agent and review with `task-scheduler.*`.
- Fixed `task-scheduler.js` so `buildReadyWave()` does not promote `backlog` tasks to `ready`; added smoke coverage.
- Fixed lazy tool-schema discovery hints so they preserve the provider tool schema shape (`parameters`, `input_schema`, or `function.parameters`); added smoke coverage.
- Removed stale runtime/token/tool-call budget exceeded logic from `taskBudgetState()`; child budgets now report only sanitized fleet-shaping limits (`maxParallel`, `maxChildren`) and never flag deprecated work budgets as exceeded.
- Added `smoke:task-scope` coverage for deprecated budget fields being dropped.
- Fixed legacy Pi child spawn model routing in `spawn-layer.js`: non-Codex Pi child commands now pass `--provider` and the routed `--model`, preventing MiniMax/Haiku-profile workers from falling back to the default Opus model.
- Added `smoke:native-subagent-status` coverage asserting the legacy Pi child command includes the routed model.

### 2. Commit Candidate: Error Queue And Diagnostics

- `scripts/analyze-tool-errors.mjs`
- `scripts/error-queue.mjs`
- `scripts/smoke-error-queue.mjs`
- `scripts/analyze-flight-recorder.mjs`
- `scripts/smoke-flight-recorder.mjs`

Initial review notes:

- Current queue is drained: `queue=0`, `resolved=207`.
- Keep these with matching package scripts.
- `scripts/error-queue.mjs` already filters non-actionable source dumps/terminal noise out of dispatchable repair packets.
- Fixed `scripts/analyze-tool-errors.mjs` so the Markdown digest separates actionable fix backlog from non-actionable/noise signatures instead of asking future agents to repair source dumps.
- Verified `smoke:error-queue` and a fresh 24h digest generation.

### 3. Commit Candidate: Smokes And Test Space

- `scripts/smoke-*.mjs`
- `test-space/`
- `benchmarks/`

Initial review notes:

- This is large but useful. It should be committed as its own test/verification slice if possible.

### 4. Needs Product Decision: Persistent Agent State

- `.siso/agents/`
- `.siso/executive/`
- `tasks/lessons.md`

Initial review notes:

- These are important. They read like deliberate MVP source/state, not cache.
- `.siso/agents/README.md` describes durable identities, goals, memory, logs, changelogs, controlled paths, and metrics.
- `.siso/executive/README.md` describes durable executive memory for active goals, projects, decisions, tasks, inbox events, and reviews.
- Runtime pointer `.siso/agents/_runtime/` is ignored, but the agent/executive markdown should be reviewed as product state.
- Commit strategy still needs care: templates/workflows/registry are clear commit candidates; per-run logs may need a separate source-vs-live-state decision.
- Fixed `.siso/agents/registry.md` so it includes the live `session-persistent-workhorse-mvp` agent folder.
- Added `scripts/smoke-persistent-agent-state.mjs` and `smoke:persistent-agent-state` to validate registry coverage, required agent files, ID/folder consistency, and executive folder structure.
- Normalized absolute local checkout paths inside persistent-agent state to repo-relative paths.
- Added a source-control convention to `.siso/agents/README.md`: commit deliberate durable markdown state, keep runtime pointers/generated telemetry/local machine paths out.

Observed untracked files include:

- `.siso/agents/README.md`
- `.siso/agents/registry.md`
- `.siso/agents/templates/*.md`
- `.siso/agents/workflows/*.md`
- `.siso/agents/persistent-agent-system-improver/**`
- `.siso/agents/session-persistent-workhorse-mvp/**`
- `.siso/executive/README.md`
- `.siso/executive/decisions/**`
- `.siso/executive/inbox/**`
- `.siso/executive/reviews/**`
- `.siso/executive/state/**`
- `.siso/executive/tasks/**`
- `.siso/executive/workflows/**`

### 5. Needs Product Decision: OpenTUI App

- `apps/siso-opentui/`
- `packages/siso-tui/`
- `docs/tui/`
- `scripts/tui-demo*.mjs`

Initial review notes:

- This is a separate app-sized feature. Review separately from router/runtime changes.
- Fixed `bin/siso-tui` and `bin/siso-opentui-live` root resolution so wrappers keep a stable repo/install root when selecting between app entrypoints and script fallbacks.
- Verified `smoke:syntax`, `smoke:siso-tui-app`, `smoke:opentui-app`, and `smoke:opentui-runtime`.

### 6. Generated Or Data-Heavy

- `data/extensions/extension-catalog.json`
- `data/extensions/pi-packages.raw.json`
- `data/extensions/shortlist.md`
- `data/extensions/approval-registry.seed.json`

Initial review notes:

- `data/extensions/sources/` is already ignored by `data/extensions/.gitignore`.
- Decide whether generated catalog snapshots should be versioned or rebuilt on demand.
- `data/extensions/extension-catalog.json` is the largest untracked non-ignored file in this bucket and should be treated as a generated snapshot unless another agent confirms it is source-of-truth.
- Router code, benchmark scripts, and docs reference `data/extensions/extension-catalog.json`, so the current repo expects this snapshot to exist.
- Normalized an absolute local checkout path in `docs/strategy/subagent-extension-candidates.md`.
- Verified `smoke:extension-catalog` and `smoke:harness-benchmark`.

### 7. Untracked Root Files

- `.npmrc`
- `AGENTS.md`
- `CHANGELOG.md`
- `WORKTREE_TRIAGE.md`

Initial review notes:

- `.npmrc` currently only contains `legacy-peer-deps=true`; no secret found.
- `AGENTS.md` is repo guidance and should be reviewed for commit.
- `CHANGELOG.md` appears to be release history and should be reviewed with version/release files.
- `WORKTREE_TRIAGE.md` is this review note.

## Verification Already Run

```bash
git diff --check
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
npm run smoke:syntax
npm run smoke:agent-router
npm run smoke:route-policy-eval
npm run smoke:task-scope
npm run smoke:session-store
npm run smoke:task-scheduler
npm run smoke:task-store-scheduler
npm run smoke:child-control
npm run smoke:child-control-isolation
npm run smoke:child-control-safety
npm run smoke:mailbox-feed
npm run smoke:mailbox-tool
npm run smoke:supervisor-tool
npm run smoke:agent-tooling
npm run smoke:native-subagent-status
npm run smoke:subagent-lifecycle
npm run smoke:persistent-agent-state
npm run smoke:persistent-agent-cli
npm run smoke:tasks-command
npm run smoke:mailbox-tool
npm run smoke:project-agent-registry
npm run smoke:siso-tui-app
npm run smoke:opentui-app
npm run smoke:opentui-runtime
npm run smoke:extension-catalog
npm run smoke:harness-benchmark
npm run smoke:error-queue
npm run errors:status -- --limit=5
```

## Next Review Targets

1. Finalize runtime/core agent-system commit candidate.
2. Finalize install/release surface commit candidate.
3. Finalize diagnostics/error queue commit candidate.
4. Decide persistent-agent source-state policy.
5. Leave SISO TUI app/wrappers for the other-agent slice.

## Suggested Commit Order

1. Runtime/router/status/context core.
2. Install/release wrapper support.
3. Error queue and diagnostics.
4. Verification harness and fixtures.
5. Persistent-agent state, after source-vs-live decision.
6. Extension catalog snapshot, if choosing to version generated catalog data.
7. SISO TUI slice, owned separately by the TUI agents.
