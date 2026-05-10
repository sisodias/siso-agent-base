# SISO Agent Handoff Brief

Status: active handoff entrypoint
Last updated: 2026-05-10
Current source/runtime version at handoff: `0.1.109`

Use this document when handing SISO Agent Base to another agent. It is intentionally operational: where to look first, what is already built, what is still only a plan, and how to avoid breaking the workstreams already in motion.

## Fast Orientation

SISO Agent Base is a Pi/Codex agent harness with:

- a `siso` CLI wrapper and local install/update/doctor flow,
- a SISO router extension for route/spawn/council/workflow/child/task/skill/repo/workspace/check/capability/doc/tool actions,
- scoped child-agent/session state to prevent cross-chat bleed,
- compact result shaping to prevent parent-context token waste,
- code-intelligence tools for repo maps, public code search, tool recommendation, related checks, and context gathering,
- a cached Sourcegraph-lite repo index with `codeQuery` for local file/symbol/import lookup,
- capability/test/contract registries that keep implementation, docs, and verification linked,
- OpenTUI/native output work in progress,
- persistent-agent and persistent-executive work in progress,
- an autopilot verifier plan and no-edit fix-loop controller, but not yet a full checkpointed patch/rerun loop.

Current verified state:

- Source version: `0.1.109`
- Installed runtime version: `0.1.109`
- Capability registry: 68 capabilities
  - 42 validated
  - 22 implemented
  - 4 idea-only
- Contract registry: 7 draft contracts
- Test-space suites: 24
- Tool scenario cards: 38
- Tool packs: 4
- Smoke scripts: 60

Last full verification known good:

```bash
npm run smoke:all
./scripts/install-local.sh
siso where
siso doctor
npm run smoke:source-drift -- --no-report --strict
```

Expected important outputs:

```text
SISO_SOURCE_DRIFT_SMOKE_OK errors=0 warnings=0 versionDrift=false installDrift=false
source version:   0.1.109
runtime version:  0.1.109
version status:   match
SISO doctor passed.
```

`siso --version` reports the bundled Pi version, currently `0.73.1`; that is expected and is not the SISO Agent Base version.

## Start Here

Read these in order:

1. `CHANGELOG.md`
   - Fast history of what shipped recently.
   - `0.1.109` added the no-edit Autopilot Fix Loop controller.
   - `0.1.108` added Repo Index v1 and `codeQuery`.
   - `0.1.107` added `relatedChecks` and `gatherContext`.
   - `0.1.106` added V2 readiness smoke and the autopilot verifier-plan slice.

2. `docs/strategy/v2.1-readiness-plan.md`
   - Defines what must happen before SISO should be called V2.1.
   - Do not rename the system to V2 just because features exist.

3. `docs/strategy/autopilot-verifier-loop.md`
   - Defines the controller/worker/read-only-verifier loop.
   - Current runtime has `autopilotPlan` and `autopilotFixLoop`; the full checkpointed patch/verifier loop is not implemented.

4. `docs/capabilities/registry.json`
   - Machine-readable source of truth for capabilities.
   - Check this before building anything.

5. `test-space/test-plan.json` and `test-space/coverage.json`
   - Show how capabilities are proven and whether they are covered, manual, blocked, external, or idea-only.

6. `docs/tools/scenario-cards.json` and `docs/tools/packs.json`
   - Define task-aware tool discovery and recommendation.
   - Agents should use these instead of guessing raw shell commands.

7. `docs/contracts/contracts.json` and `docs/contracts/agent-final-check.md`
   - Draft enforcement model for "what must be true before claiming done."

## Repo Map

Important runtime files:

- `bin/siso`
  - Main launcher/wrapper.
  - Also dispatches persistent-agent CLI subcommands such as `siso agent inspect`.

- `bin/siso-doctor`
  - Doctor/readiness entrypoint.
  - Supports drift/contracts/readiness checks.

- `scripts/install-local.sh`
  - Syncs canonical source into `~/.siso-agent-base`.
  - Applies native Pi renderer polish during install.

- `extensions/siso-agent-router/index.js`
  - Main router extension.
  - Wires `siso` tool actions to route/spawn/council/workflow/child/task/skill/repo/workspace/check/capability/doc/tool operations.

- `extensions/siso-agent-router/tooling-actions.js`
  - Deterministic code-intelligence and repo tooling.
  - Important exports include `publicCodeSearch`, `rankedRepoMap`, `repoIndexBuild`, `repoIndexStatus`, `codeQuery`, `relatedChecks`, `gatherContext`, `autopilotPlan`, `autopilotFixLoop`, `runCheck`, `toolRecommend`, and capability helpers.

- `extensions/siso-agent-router/spawn-layer.js`
  - Child spawn/result normalization, compact child record projections, storage stats, cleanup/control.

- `extensions/siso-agent-router/task-registry.js`
  - Parent/session-scoped task registry.
  - Key for preventing child-agent bleed across chats.

- `extensions/siso-agent-router/notifications.js`
  - Parent-scoped child completion notifications.
  - Do not make this global again.

- `extensions/siso-agent-router/session-store.js`
  - Session store helpers.

- `extensions/siso-context-manager/`
  - Context filtering/provider-boundary logic.
  - Protects against raw secondary tool parts and context bloat.

- `extensions/siso-status/`
  - Status widget, Bifrost dashboard, timeline/status summaries.

- `extensions/siso-lifecycle/`
  - Lifecycle hooks and correction/status plumbing.

- `apps/siso-opentui/`
  - OpenTUI workstream.
  - Another agent may be actively working here; coordinate before editing.

Important docs/data:

- `docs/capabilities/`
  - Capability registry, current list, ideas, changelog candidates.

- `docs/contracts/`
  - Draft contracts and final-check docs.

- `docs/tools/`
  - Scenario cards and packs for tool discovery.

- `docs/flight-recorder/`
  - Trace schema.

- `docs/strategy/`
  - V2 readiness, autopilot, persistent executive, persistent agent plans.

- `test-space/`
  - Capability-linked scenarios and coverage.

- `.siso/agents/`
  - Persistent-agent runtime state and worklogs.

- `.siso/executive/`
  - Persistent executive state scaffold.

- `.siso/repo-index/`
  - Generated local repo-index cache for `repoIndexBuild` and `codeQuery`.
  - Treat as rebuildable generated state, not source documentation.

Generated/local outputs:

- `test-space/results/`
  - Coverage summaries, contract reports, source drift report, flight-recorder analysis.

- `.siso/tool-telemetry.jsonl`
  - Local tool-recommend/load/unload telemetry.

## Active Workstreams

### 1. V2 Readiness

Status: active readiness gate.

Key files:

- `docs/strategy/v2.1-readiness-plan.md`
- `scripts/smoke-v2-readiness.mjs`
- `docs/capabilities/current.md`
- `docs/capabilities/ideas.md`
- `docs/capabilities/changelog-candidates.md`

Current purpose:

- Keep V2 readiness facts honest.
- Prevent stale docs from listing shipped capabilities as ideas.
- Prevent temporary artifacts from drifting into release.
- Ensure important readiness checks are wired into `smoke:all`.

Run:

```bash
npm run smoke:v2-readiness
```

### 2. Autopilot

Status: no-edit planning and no-edit repair-controller slices are implemented; full checkpointed patch autopilot is not.

Implemented:

- `autopilotPlan` in `extensions/siso-agent-router/tooling-actions.js`
- `autopilotFixLoop` in `extensions/siso-agent-router/tooling-actions.js`
- Router path: `siso action=check op=autopilot-plan`
- Router path: `siso action=check op=fix|fix-loop|autopilot-fix`
- Design contract: `docs/strategy/autopilot-verifier-loop.md`
- Smokes:
  - `npm run smoke:autopilot-plan`
  - `npm run smoke:autopilot-verifier`
  - `npm run smoke:autopilot-fix-loop`

Current behavior:

- Builds a compact controller/worker/read-only-verifier plan.
- Runs one bounded validation command, blocks unsafe checks, summarizes failures, and gathers repair context.
- Preserves `sessionId`, `threadId`, `parentRunId`, and `autopilotRunId`.
- Lists required checks and blocks unsafe command shapes.
- Includes checkpoint, failure-signature, feedback-packet, and flight-recorder metadata.
- Runs no edits and spawns no verifier.

Next best slice:

- Add checkpointed patch handoff around `autopilotFixLoop`.
- Write a flight-recorder trace for the fix-loop run.
- Preserve compact feedback packets and failure signatures.
- Add a read-only verifier verdict after a patch is made.
- Keep actual edits explicit until checkpoint rollback and verifier boundaries are proven.

Do not make the controller silently edit files until checkpoint rollback, verifier boundaries, and loop-stop criteria are proven.

### 3. Related Checks And Gather Context

Status: implemented in `0.1.107`.

Key files:

- `extensions/siso-agent-router/tooling-actions.js`
- `scripts/smoke-related-checks.mjs`
- `scripts/smoke-gather-context.mjs`
- `docs/tools/scenario-cards.json`

Router paths:

- `siso action=check op=related`
- `siso action=repo op=gather`

Purpose:

- `relatedChecks` recommends primary/secondary/full validation commands from changed paths, capability IDs, and task text.
- `gatherContext` builds a task-aware packet with tool recommendation, ranked repo map, search/read evidence, and related checks.

Run:

```bash
npm run smoke:related-checks
npm run smoke:gather-context
```

### 4. Repo Index And Code Query

Status: validated in `0.1.108`.

Key files:

- `extensions/siso-agent-router/tooling-actions.js`
- `extensions/siso-agent-router/index.js`
- `scripts/smoke-repo-index.mjs`
- `test-space/scenarios/repo-index.md`
- `docs/tools/scenario-cards.json`
- `docs/tools/packs.json`

Router paths:

- `siso action=repo op=index`
- `siso action=repo op=index-status`
- `siso action=repo op=query query="symbol:repoIndexBuild"`

Purpose:

- `repoIndexBuild` writes cached file, symbol, and import metadata under `.siso/repo-index`.
- `repoIndexStatus` reports whether the cache exists and how much it contains.
- `codeQuery` gives Sourcegraph-lite local lookup with filters such as `symbol:`, `path:`, `file:`, `lang:`, and `imports:`.
- The repo-navigation pack now prefers `codeQuery` first, with `repoSearch` as the fallback.

Run:

```bash
npm run smoke:repo-index
```

Current caution:

- The index is useful but still heuristic. It is not a full LSP or tree-sitter graph yet.
- Rebuild or fall back to `repoSearch`/`rg` when very recent edits must be inspected exactly.

### 5. Persistent Agent / Persistent Executive

Status: active workstream, partially implemented.

Key files:

- `.siso/agents/`
- `.siso/executive/`
- `docs/strategy/persistent-agent-mvp-build-plan.md`
- `docs/strategy/persistent-executive-agent-mvp-roadmap.md`
- `docs/strategy/persistent-executive-agent-architecture.md`
- `scripts/smoke-persistent-agent-cli.mjs`

Known active command surface:

```bash
siso agent inspect <agent-id>
siso agent run <agent-id> --dry-run
npm run smoke:persistent-agent-cli
```

Current caution:

- This is being actively worked on by another agent.
- Coordinate before changing `.siso/agents/`, `.siso/executive/`, `bin/siso-agent`, or persistent-agent CLI behavior.

### 6. TUI / OpenTUI / Output Polish

Status: active workstream, partially implemented.

Key files:

- `docs/tui/catalog.md`
- `apps/siso-opentui/`
- `scripts/smoke-opentui-app.mjs`
- `scripts/smoke-opentui-runtime.mjs`
- `scripts/patch-pi-native-renderers.mjs`
- `scripts/smoke-native-output-polish.mjs`
- `scripts/smoke-pi-native-renderers.mjs`

Run:

```bash
npm run smoke:opentui-app
npm run smoke:opentui-runtime
npm run smoke:native-output-polish
npm run smoke:renderers
```

Current caution:

- Another agent may be actively working here.
- If a smoke fails because a renderer contract changed, update the smoke to the actual supported renderer contract instead of reverting that work.

### 7. Contracts And Flight Recorder

Status: MVP/draft, not fully enforced.

Contracts:

- `docs/contracts/contracts.json`
- `scripts/smoke-contracts.mjs`
- `docs/contracts/agent-final-check.md`

Flight recorder:

- `docs/flight-recorder/schema.json`
- `scripts/smoke-flight-recorder.mjs`
- `scripts/record-doctor-readiness-flight.mjs`
- `scripts/record-context-filter-flight.mjs`
- `scripts/record-code-intel-flight.mjs`
- `scripts/analyze-flight-recorder.mjs`

Run:

```bash
npm run smoke:contracts
npm run smoke:flight-recorder
npm run analyze:flight-recorder
```

Current gaps:

- Contracts are not yet an enforced stop gate for final answers.
- Flight recorder is not yet automatic for every normal router/tool/check run.

## Handoff Workflow For A New Agent

Use this exact sequence when picking up the repo.

1. Confirm source/runtime alignment.

```bash
siso where
siso doctor
npm run smoke:source-drift -- --no-report --strict
```

2. Inspect current worktree without reverting anything.

```bash
git status --short
```

The worktree is often dirty and has many untracked repo-owned files. Do not run `git reset --hard`, `git checkout --`, or destructive cleanup unless explicitly asked.

3. Find the relevant capability.

```bash
npm run smoke:capabilities
```

Then inspect:

- `docs/capabilities/registry.json`
- `docs/capabilities/current.md`
- `docs/capabilities/ideas.md`

4. Gather task context.

Preferred router tools:

```text
siso action=repo op=gather task="..."
siso action=check op=related paths="..." task="..."
siso action=repo op=query query="symbol:targetName"
siso action=repo op=index-status
siso action=repo op=ranked-map query="..."
siso action=tool op=recommend task="..."
```

Shell fallback:

```bash
rg -n "search terms" .
```

5. Check contracts and test-space.

```bash
npm run smoke:contracts
npm run smoke:test-space
npm run smoke:test-space-coverage
```

6. Add or update tests first for behavior changes.

Follow the repo pattern:

- new behavior gets a `scripts/smoke-*.mjs` or targeted scenario,
- package script added to `package.json`,
- relevant capability `validatedBy` updated,
- test-space suite/coverage updated when a capability is added.

7. Keep parent-visible results compact.

Never reintroduce:

- raw child event arrays,
- raw full child records,
- raw provider payloads,
- full logs in details,
- huge `finalOutput` in parent-visible child/control details.

Use counts, summaries, file paths, and compact artifacts instead.

8. Run focused checks, then broad checks.

Minimum for most capability/tooling changes:

```bash
npm run smoke:capabilities
npm run smoke:test-space
npm run smoke:test-space-coverage
npm run smoke:contracts
npm run smoke:tool-scenario-cards
npm run smoke:tool-selection-eval
npm run smoke:source-drift -- --no-report
```

Before install/release:

```bash
npm run smoke:all
./scripts/install-local.sh
npm run smoke:source-drift -- --no-report --strict
siso where
siso doctor
```

9. Update documentation.

For user-facing or agent-facing changes, update the relevant subset:

- `CHANGELOG.md`
- `releases/latest.json`
- `docs/capabilities/registry.json`
- `docs/capabilities/current.md`
- `docs/capabilities/changelog-candidates.md`
- `test-space/test-plan.json`
- `test-space/coverage.json`
- `docs/tools/scenario-cards.json`
- `docs/tools/packs.json`
- strategy/research docs if the change promotes or invalidates a plan.

## Footguns

- Do not assume `git status --short` untracked means junk. This repo currently has many untracked but real source/docs/scripts.
- Do not revert files touched by other agents.
- Do not make child-agent status global again. Child rows and completions must stay session/parent scoped.
- Do not add raw event arrays back to tool details. Preserve `eventCount`, not raw events.
- Do not let autopilot edit files until check execution, feedback packets, checkpoint policy, and verifier boundaries are proven.
- Do not let the verifier edit files in the first verifier implementation.
- Do not call SISO V2.1 until the readiness contract in `docs/strategy/v2.1-readiness-plan.md` is satisfied.
- Do not use `siso --version` to check SISO Agent Base version; use `siso where`.

## Current Best Next Task

Build Autopilot Slice 3.

Recommended behavior:

- Add checkpointed patch handoff around `autopilotFixLoop`.
- Capture pre-patch state and a compact flight-recorder trace.
- Feed the fix-loop failure summary and gathered context to the patching agent/worker.
- Run a read-only verifier after the patch.
- Return `passed | needs_more_work | blocked` with only compact evidence.
- Do not silently edit from inside the controller yet.

Suggested tests:

- checkpoint metadata is present before any patch handoff,
- passing check returns `passed`,
- failing check returns `needs_patch` or `needs_more_work`,
- unsafe check returns `blocked`,
- raw logs are not returned,
- parent-visible JSON stays bounded,
- session/thread IDs are preserved,
- flight record path is reported,
- verifier cannot edit files.

## Handoff Checklist

Before handing off again:

- [ ] `siso where` reports source/runtime match.
- [ ] `siso doctor` passes.
- [ ] `npm run smoke:source-drift -- --no-report --strict` passes.
- [ ] Focused smokes for changed areas pass.
- [ ] `npm run smoke:all` passes if runtime/release surface changed.
- [ ] Capability registry and test-space coverage are updated for new capabilities.
- [ ] Changelog/release notes mention user-facing or agent-facing changes.
- [ ] This handoff brief is updated if architecture, active lanes, or next task changed.
