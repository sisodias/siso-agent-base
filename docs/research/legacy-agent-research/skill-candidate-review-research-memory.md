# Skill Candidate Review: Research + Memory Spine

Date: 2026-05-07
Status: draft review, no imports promoted yet

## Bottom Line

Start by promoting a small, renamed, SISO-native skill spine:

1. `code-search` from Sourcegraph — active candidate, highest value.
2. `code-intel` from `siso-lsp` — candidate, verify CLI first.
3. `repo-wiki` from `siso-codex` — candidate, rename away from Codex if kept.
4. `reflection` from `reflect` — important, rewrite paths to `~/.siso`.
5. `session-memory` from `session-checkpoint` — important, rewrite paths to `~/.siso`.
6. `systemdb` from `systemdb-query` — candidate, read-only only.
7. `github-search` from `gitsearch` — optional fallback, GitHub rate limits.

Do not promote `websearch` or `multisearch` until their underlying commands/API paths are verified.

## Proposed SISO Categories

```text
research/
  code-search      # Sourcegraph/NPM/GitHub public search
  github-search    # gh fallback only
  web-search       # blocked until verified

code-intelligence/
  code-intel       # LSP symbol navigation
  repo-wiki        # .siso-wiki generator

memory/
  reflection       # corrections -> lessons
  session-memory   # checkpoints/restore

ops/
  systemdb         # read-only SystemDB inspection
  spark-review     # possible wrapper around SISO route/review
```

## Candidate Notes

### `sourcegraph` -> `code-search`

Verdict: promote first.

Why:
- directly useful for public code and package discovery;
- no Claude-specific runtime dependency if direct GraphQL fallback works;
- stronger than GitHub code search for broad pattern research;
- matches current SISO repo-discovery work.

Caveats:
- current doc references stale helper path under an app repo;
- port should package a stable SISO script or direct GraphQL recipe.

Destination:

```text
~/.siso/agent-base/candidate/skills/research/code-search/
```

### `gitsearch` -> `github-search`

Verdict: keep as fallback, not primary.

Why:
- useful for repo stars/issues/PRs;
- duplicate copies exist across Agent OS and SISO Library;
- GitHub code search may rate limit or require auth.

Destination:

```text
~/.siso/agent-base/candidate/skills/research/github-search/
```

### `websearch`

Verdict: do not promote yet.

Why:
- likely broken per Shaan;
- depends on old Perplexity/OpenRouter scripts/keys;
- needs verification before active use.

Keep only as source reference.

### `multisearch`

Verdict: do not promote yet.

Why:
- depends on websearch and xsearch;
- Claude Task-tool specific;
- should be redesigned as SISO council/fanout later.

Future name: `research-fanout`.

### `siso-lsp` -> `code-intel`

Verdict: candidate, verify CLI.

Why:
- high token savings;
- real code navigation beats grep/read for definitions/references;
- useful for Pi/SISO.

Caveats:
- current CLI lives under `~/.claude/bin/siso-lsp`;
- must verify language server deps.

Destination:

```text
~/.siso/agent-base/candidate/skills/code-intelligence/code-intel/
```

### `siso-codex` -> `repo-wiki`

Verdict: candidate, rename.

Why:
- `.siso-wiki` idea is valuable;
- aligns with existing rule: read `.siso-wiki/index.md` first;
- reduces repeated repo exploration.

Caveats:
- name `siso-codex` is misleading now;
- command should become `siso wiki build` or `siso repo index`.

Destination:

```text
~/.siso/agent-base/candidate/skills/code-intelligence/repo-wiki/
```

### `reflect` -> `reflection`

Verdict: important, rewrite.

Why:
- captures Shaan corrections as durable lessons;
- essential to improve agent behavior over time.

Caveats:
- current paths point to `~/.claude`;
- SISO target should be `~/.siso/agent/memory/lessons` and `~/.siso/agent/memory/reflections`.

Destination:

```text
~/.siso/agent-base/candidate/skills/memory/reflection/
```

### `session-checkpoint` -> `session-memory`

Verdict: important, rewrite.

Why:
- solves continuity after compaction/clear/session restart;
- maps cleanly to existing `siso-lifecycle` extension.

Caveats:
- current paths point to `.claude/session-context`;
- SISO target should be project `.siso/session-context` or global `~/.siso/agent/checkpoints`.

Destination:

```text
~/.siso/agent-base/candidate/skills/memory/session-memory/
```

### `async-codex-review`

Verdict: inspect as pattern, likely not direct promote.

Why:
- idea is useful: background review job + next-turn surfacing;
- implementation is Claude-hook/Codex-specific.

Future SISO version should use router action/council and child-run records.

Future name: `background-review`.

### `run-spark`

Verdict: pattern only.

Why:
- it worked around Spark/Codex config issues;
- SISO already has Bifrost routing and route policy.

Future SISO equivalent: `siso route review --lane spark` or a review profile.

### `systemdb-query` -> `systemdb`

Verdict: candidate, read-only.

Why:
- SystemDB is still useful for old SISO task/agent telemetry;
- good bridge during migration.

Caveats:
- should not write by default;
- many paths/tables may be stale.

Destination:

```text
~/.siso/agent-base/candidate/skills/ops/systemdb/
```

## Proposed First Promotion Batch

Create candidate copies/adapted drafts for:

```text
research/code-search
research/github-search
code-intelligence/code-intel
code-intelligence/repo-wiki
memory/reflection
memory/session-memory
ops/systemdb
```

Mark these as `candidate`, not `active`, until smokes pass.

## Required Smokes

- `code-search`: direct Sourcegraph GraphQL query returns results.
- `github-search`: `gh auth status` or unauthenticated repo search works.
- `code-intel`: `siso-lsp symbols` works in a TS repo.
- `repo-wiki`: generate `.siso-wiki/index.md` in a temp repo.
- `reflection`: writes to temp `~/.siso/agent/memory` path, not Claude.
- `session-memory`: writes/reads checkpoint from temp project path.
- `systemdb`: read-only query against existing DB succeeds or reports missing safely.
