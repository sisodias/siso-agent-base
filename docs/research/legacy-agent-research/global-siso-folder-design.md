# Global SISO Folder Design

Date: 2026-05-07
Status: draft
Scope: design for the global `~/.siso` home that will replace ad-hoc Pi harness paths and absorb the useful global-Claude patterns without copying its bloat.

## Executive Decision

Use `~/.siso` as the global SISO product home.

Do not put SISO Agent runtime under `~/.pi`, `~/.pi-bifrost`, or the repo checkout. Those can remain compatibility/import sources, but the product runtime should live under one stable global namespace:

```text
~/.siso/
```

Primary runtime for the packaged CLI:

```text
~/.siso/agent/
```

Primary command:

```bash
siso
```

Package name:

```text
@siso/agent-base
```

Compatibility command:

```bash
pi-codex
```

## What We Observed

### `~/.claude`

Claude global home is not just config. It is an operating system for agent work.

High-signal categories found:

- root behavior/config: `CLAUDE.md`, `settings.json`, `settings.local.json`, `.claude.json`
- agent roles: `agents/`
- lazy capabilities: `skills/`
- hooks/lifecycle: `hooks/`
- extensions/plugins: `extensions/`, `plugins/`
- sessions/transcripts/projects: `sessions/`, `transcripts/`, `projects/`
- memory/feedback: `lessons/`, `.reflect-queue.jsonl`, `.reflect-state.json`
- plans/tasks/todos: `plans/`, `tasks/`, `todos/`
- operational docs/state: `ops/`, `docs/`, `state/`, `telemetry/`, `logs/`
- artifact caches: `paste-cache/`, `file-history/`, `cache/`
- safety/recovery: `backups/`, `_backups/`, `_quarantine/`
- local commands: `bin/`

Problem: it has accumulated massive high-churn directories (`projects`, `plugins`, `extensions`, `file-history`, `_quarantine`, `tasks`) that are valuable but should not be blindly copied into the always-used SISO runtime.

### Current `~/.siso`

Existing:

```text
~/.siso/
  AI_CHANGELOG.md
  ai-changelog.jsonl
  bin/
  pi-harness-lab/
  pi-workers/
  sg-watches/
```

This is already the right top-level namespace, but it is not yet a clean product layout. `pi-harness-lab` is lab-specific; `pi-workers` is worker-specific. Both should become compatibility/import sources or subdomains, not the main runtime root.

### Current Pi Runtime

Current isolated Pi+Bifrost profile:

```text
~/.pi-bifrost/agent/
  AGENTS.md
  SYSTEM.md
  README.md
  auth.json
  models.json
  settings.json
  prompts/
  sessions/
  skills/
  .reflect-queue.jsonl
```

Current default Pi profile:

```text
~/.pi/agent/
  auth.json
  config.json
  settings.json
  run-history.jsonl
  sessions/
  skills/
  bin/
```

Decision: import/migrate useful pieces into `~/.siso/agent/profile`, but do not make `~/.pi` or `~/.pi-bifrost` the long-term home.

## Design Principles

1. One product home: `~/.siso`.
2. One main agent runtime: `~/.siso/agent`.
3. Separate package-managed files from user-owned state.
4. Lazy-load capabilities. Never eagerly inject huge memories, catalogs, transcripts, or research.
5. Keep imports from Claude/Pi traceable. Do not copy mystery bloat into core runtime.
6. Use clear lifecycle tiers: config, profile, capabilities, runtime, memory, ops, archive.
7. Make `siso doctor` able to audit the whole tree.
8. Make `siso setup` idempotent and migration-safe.
9. Prefer JSONL for append-only events, JSON for current state, Markdown for human-readable knowledge.
10. Design for sync/backup later without syncing secrets or churn-heavy caches by default.

## Proposed `~/.siso` Layout

```text
~/.siso/
  README.md
  config.json
  registry.json
  bin/

  agent/
    config.json
    profile/
      AGENTS.md
      SYSTEM.md
      settings.json
      models.json
      auth.json
      prompts/
      skills/
      extensions/
    agents/
    skills/
    extensions/
    hooks/
    tools/
    models/
    policies/

    sessions/
    transcripts/
    projects/
    child-runs/
    workers/
    tasks/
    workflows/
    checkpoints/

    memory/
      lessons/
      reflections/
      feedback/
      summaries/
      indexes/
    research/
      inbox/
      runs/
      sources/
      syntheses/
    ops/
      docs/
      decisions/
      changelog/
      health/
      metrics/
    state/
    logs/
    telemetry/
    cache/
    tmp/
    backups/
    quarantine/
    imports/
      claude/
      pi/
      pi-bifrost/
```

## Directory Contract

### `~/.siso/config.json`

Global SISO config. Machine-readable. Small.

Owns:

- default product channel
- active agent home
- package version seen by setup
- global paths
- update policy

Example:

```json
{
  "version": 1,
  "defaultAgentHome": "~/.siso/agent",
  "channel": "stable",
  "createdBy": "@siso/agent-base",
  "updatedAt": "2026-05-07T00:00:00.000Z"
}
```

### `~/.siso/registry.json`

Registry of installed SISO products/modules.

Example entries:

- `agent-base`
- future `agent-labs`
- future `browser`
- future `research`

### `~/.siso/bin/`

User-level shims only. Package managers may symlink here, but npm global bin may remain elsewhere.

Should contain stable entrypoints, not full app logic.

### `~/.siso/agent/config.json`

SISO Agent runtime config. This is the main product config for `siso`.

Owns:

- selected Pi profile path
- Bifrost endpoint
- default provider/model aliases
- enabled SISO extensions
- child run path
- task store path
- lifecycle settings
- migration state

### `~/.siso/agent/profile/`

The Pi-compatible agent profile.

This replaces current:

```text
~/.pi-bifrost/agent
```

Expected files:

```text
profile/
  AGENTS.md       # compact operating instructions for Pi/SISO Agent
  SYSTEM.md       # compact always-on kernel if Pi reads it
  settings.json   # Pi settings
  models.json     # Bifrost provider/model aliases
  auth.json       # local auth if Pi requires it; must be gitignored/sensitive
  prompts/
  skills/
  extensions/
```

Rule: this folder should stay small enough to reason about. It is the boot profile, not the knowledge warehouse.

### `~/.siso/agent/agents/`

Reusable agent role definitions.

Examples:

```text
agents/
  planner.md
  researcher.md
  worker.md
  verifier.md
  reviewer.md
  codex-rescue.md
  _templates/
```

This corresponds to `~/.claude/agents` but should be normalized for SISO/Pi routing.

### `~/.siso/agent/skills/`

Global lazy skills. Human-readable and package/import managed.

Examples:

```text
skills/
  siso-routing/SKILL.md
  bifrost-debugging/SKILL.md
  playwright-cli/SKILL.md
  repo-research/SKILL.md
```

Rule: the catalog/index can be visible to the model; full skill bodies load only on demand.

### `~/.siso/agent/extensions/`

Installed Pi/SISO extensions.

Package-managed extensions should be linked or copied here by `siso setup`:

```text
extensions/
  siso-agent-router/
  siso-status/
  siso-lifecycle/
  pi-subagents/
```

The CLI should resolve extensions from here first, then package dist fallback.

### `~/.siso/agent/hooks/`

Lifecycle hooks, inspired by Claude hooks but adapted for Pi/SISO.

Examples:

```text
hooks/
  pre-tool-use.mjs
  post-tool-use.mjs
  session-start.mjs
  session-stop.mjs
  checkpoint-writer.mjs
  reflect-capture.mjs
```

Rule: hooks must be explicit and auditable through `siso doctor hooks`.

### `~/.siso/agent/tools/`

Local tool adapters and command metadata.

Examples:

```text
tools/
  bifrost-audit.json
  code-search.json
  browser.json
```

Do not dump full tool schemas into prompts unless requested.

### `~/.siso/agent/models/`

Model and routing policy files.

Examples:

```text
models/
  aliases.json
  bifrost.json
  route-policy.json
  token-budgets.json
```

This should mirror the code-level router policy enough for inspection and overrides.

### `~/.siso/agent/policies/`

Permissions and safety profiles.

Examples:

```text
policies/
  permissions.json
  git-safety.json
  workspace-boundaries.json
  secrets.json
```

### `~/.siso/agent/sessions/`

Foreground SISO/Pi sessions. Use date partitioning to avoid one giant folder.

```text
sessions/
  2026-05-07/*.jsonl
```

### `~/.siso/agent/transcripts/`

Cleaned/human-readable transcripts, separate from raw sessions.

```text
transcripts/
  2026-05-07/*.md
```

### `~/.siso/agent/projects/`

Per-project metadata, like Claude's `projects`, but with stricter shape.

```text
projects/
  <slug>/
    config.json
    sessions/
    tasks/
    summaries/
    indexes/
```

Rule: project memory should be lazy. Do not load all project memory globally.

### `~/.siso/agent/child-runs/`

Child/subagent run records.

This replaces current lab-specific:

```text
~/.siso/pi-harness-lab/child-runs
```

Use:

```text
child-runs/
  2026-05-07/<run-id>.json
```

### `~/.siso/agent/workers/`

Worker pool state, logs, and profiles.

This absorbs current:

```text
~/.siso/pi-workers
```

Suggested:

```text
workers/
  runs/
  logs/
  pools/
  profiles/
```

### `~/.siso/agent/tasks/`

Task store and task history.

```text
tasks/
  siso-tasks.json
  history.jsonl
  indexes/
```

### `~/.siso/agent/workflows/`

Workflow parent records and orchestration artifacts.

```text
workflows/
  2026-05-07/<workflow-id>.json
```

### `~/.siso/agent/checkpoints/`

Session checkpoints and restore summaries.

```text
checkpoints/
  current.md
  2026-05-07/*.md
```

### `~/.siso/agent/memory/`

Long-lived useful memory. This is where Claude's lessons/reflection pattern should be preserved.

```text
memory/
  lessons/
    INDEX.md
    feedback_*.md
  reflections/
    queue.jsonl
    state.json
  feedback/
  summaries/
  indexes/
```

Rule: memory is indexed and searched, not dumped into every prompt.

### `~/.siso/agent/research/`

Research runs and synthesized knowledge.

```text
research/
  inbox/
  runs/
  sources/
  syntheses/
  indexes/
```

This is for global research assets. Repo-specific research should stay in that repo unless promoted.

### `~/.siso/agent/ops/`

Operational documentation and health.

```text
ops/
  docs/
  decisions/
  changelog/
  health/
  metrics/
```

Map Claude `ops`, `docs/adrs`, changelogs here.

### `~/.siso/agent/state/`

Current machine state. JSON files that can be overwritten.

Examples:

```text
state/
  active-session.json
  active-workers.json
  last-doctor.json
  migrations.json
```

### `~/.siso/agent/logs/`

Append-only or rotating logs.

```text
logs/
  siso.log
  errors.log
  setup.log
```

### `~/.siso/agent/telemetry/`

Local telemetry and measurement. No remote assumption.

```text
telemetry/
  tool-schema-metrics.jsonl
  token-budgets.jsonl
  route-events.jsonl
```

Bifrost can remain at `~/.config/bifrost`, but SISO can keep derived/imported views here.

### `~/.siso/agent/cache/`

Regenerable caches.

Examples:

- search indexes
- repo catalogs
- skill indexes
- package metadata

Safe to delete.

### `~/.siso/agent/tmp/`

Temporary files. Safe to delete.

### `~/.siso/agent/backups/`

Intentional backups made by migrations/setup.

```text
backups/
  2026-05-07T.../
```

### `~/.siso/agent/quarantine/`

Unknown or unsafe imports from Claude/Pi. Nothing here is loaded by default.

### `~/.siso/agent/imports/`

Traceable import manifests and snapshots.

```text
imports/
  claude/
    manifest.json
    selected-files/
  pi/
    manifest.json
  pi-bifrost/
    manifest.json
```

Rule: every migration from `~/.claude`, `~/.pi`, or `~/.pi-bifrost` writes a manifest.

## Claude-to-SISO Mapping

| Claude path | SISO destination | Load policy |
| --- | --- | --- |
| `~/.claude/CLAUDE.md` | `~/.siso/agent/profile/AGENTS.md` or imported reference | compact only |
| `~/.claude/settings*.json` | `~/.siso/agent/config.json`, `profile/settings.json` | explicit |
| `~/.claude/agents` | `~/.siso/agent/agents` | lazy by role |
| `~/.claude/skills` | `~/.siso/agent/skills` | lazy by skill |
| `~/.claude/hooks` | `~/.siso/agent/hooks` | explicit enable |
| `~/.claude/extensions` | `~/.siso/agent/extensions` or quarantine | explicit enable |
| `~/.claude/plugins` | `~/.siso/agent/extensions` or quarantine | explicit enable |
| `~/.claude/lessons` | `~/.siso/agent/memory/lessons` | indexed/search only |
| `~/.claude/.reflect-*` | `~/.siso/agent/memory/reflections` | indexed/search only |
| `~/.claude/research` | `~/.siso/agent/research` | lazy |
| `~/.claude/tasks` | `~/.siso/agent/tasks/imports/claude` | not active by default |
| `~/.claude/todos` | `~/.siso/agent/tasks/imports/claude-todos` | not active by default |
| `~/.claude/projects` | `~/.siso/agent/projects/imports/claude` | not active by default |
| `~/.claude/transcripts` | `~/.siso/agent/transcripts/imports/claude` | not active by default |
| `~/.claude/file-history` | `~/.siso/agent/quarantine/file-history` or skip | never prompt |
| `~/.claude/paste-cache` | `~/.siso/agent/cache/paste-cache` or skip | never prompt |
| `~/.claude/_quarantine` | `~/.siso/agent/quarantine/claude` | never prompt |

## Pi-to-SISO Mapping

| Current path | SISO destination |
| --- | --- |
| `~/.pi-bifrost/agent/AGENTS.md` | `~/.siso/agent/profile/AGENTS.md` |
| `~/.pi-bifrost/agent/SYSTEM.md` | `~/.siso/agent/profile/SYSTEM.md` |
| `~/.pi-bifrost/agent/models.json` | `~/.siso/agent/profile/models.json` |
| `~/.pi-bifrost/agent/settings.json` | `~/.siso/agent/profile/settings.json` |
| `~/.pi-bifrost/agent/skills` | `~/.siso/agent/profile/skills` initially, then promoted to `agent/skills` |
| `~/.pi-bifrost/agent/sessions` | `~/.siso/agent/sessions/imports/pi-bifrost` |
| `~/.pi/agent/sessions` | `~/.siso/agent/sessions/imports/pi` |
| `~/.siso/pi-harness-lab/child-runs` | `~/.siso/agent/child-runs/imports/pi-harness-lab` or migrated active |
| `~/.siso/pi-workers` | `~/.siso/agent/workers/imports/pi-workers` then active workers |

## Package-Managed vs User-Owned

Important split:

### Package-managed

Lives in npm package and can be updated:

- default templates
- default compact kernel
- built extensions
- default setup scripts
- default route policies

Can be copied/symlinked into:

```text
~/.siso/agent/.managed/
```

Optional future structure:

```text
~/.siso/agent/.managed/
  @siso-agent-base-0.0.1/
```

### User-owned

Never overwritten without backup:

- `config.json`
- local profile overrides
- memories
- lessons
- sessions
- tasks
- research
- auth/secrets

## Git / Sync Policy

`~/.siso` should not automatically be a git repo at first.

If we later add sync, use explicit profiles:

- sync safe: agents, skills, docs, policies, selected memory
- local only: auth, sessions, logs, telemetry, cache, tmp, file-history, secrets
- manual review: imported Claude extensions/plugins/hooks

Add a generated `.gitignore` if `siso sync init` is introduced.

## Setup Behavior

`siso setup` should be idempotent:

1. create `~/.siso` if missing;
2. create `~/.siso/agent` tree;
3. write default `config.json` only if absent;
4. create `profile` from package templates or import `~/.pi-bifrost/agent`;
5. copy/link package extensions;
6. create import manifests for Claude/Pi discovery;
7. do not import huge Claude folders by default;
8. run `siso doctor`.

## Doctor Behavior

`siso doctor` should report:

- package version
- global SISO home
- agent home
- Pi binary found/missing
- Bifrost reachable/unreachable
- profile files present/missing
- extension files present/missing
- model aliases present/missing
- child run path writable
- task store writable
- session path writable
- secrets file permissions
- migration candidates from Claude/Pi
- high-churn folder sizes

## Migration Phases

### Phase 1: Create Skeleton

Create only directories and config. No destructive moves.

### Phase 2: Pi-Bifrost Profile Import

Copy `~/.pi-bifrost/agent` into `~/.siso/agent/profile` with backups and manifest.

### Phase 3: CLI Switch

Change `siso` default `PI_CODING_AGENT_DIR` to:

```text
~/.siso/agent/profile
```

Fallback to `~/.pi-bifrost/agent` if no SISO profile exists.

### Phase 4: Runtime State Switch

Move active paths:

```text
SISO_CHILD_RUN_DIR=~/.siso/agent/child-runs
SISO_TASK_STORE=~/.siso/agent/tasks/siso-tasks.json
SISO_TRANSCRIPT_DIR=~/.siso/agent/transcripts
```

### Phase 5: Selective Claude Import

Import only high-signal Claude assets:

- selected agents
- selected skills
- lessons index
- reflection queue/state
- selected hooks as disabled templates
- docs/adrs/ops

Do not import by default:

- full projects
- full transcripts
- file-history
- paste-cache
- plugins/extensions without review
- quarantine

### Phase 6: Cleanup / Compatibility

Leave `~/.pi`, `~/.pi-bifrost`, and old `~/.siso/pi-harness-lab` intact until the new runtime passes live verification.

Then `siso migrate status` can recommend archival.

## Open Questions

1. Should the main runtime be `~/.siso/agent` or `~/.siso/agent-base`?
   - Recommendation: `~/.siso/agent` for product feel.
2. Should package-managed extension files be copied or symlinked?
   - Recommendation: symlink in dev, copy in published package setup.
3. Should `~/.siso` become a git repo?
   - Recommendation: not by default. Add explicit `siso sync init` later.
4. Should Claude lessons be promoted immediately?
   - Recommendation: import index and selected lessons first, not all into prompt.

## Recommended First Implementation Slice

Build `siso setup --dry-run` and `siso doctor --json` around this layout before moving files.

Minimum created tree:

```text
~/.siso/
  config.json
  agent/
    config.json
    profile/
    agents/
    skills/
    extensions/
    sessions/
    transcripts/
    child-runs/
    tasks/
    memory/lessons/
    memory/reflections/
    research/
    ops/decisions/
    state/
    logs/
    cache/
    backups/
    quarantine/
    imports/
```

Then migrate the Pi profile only.
