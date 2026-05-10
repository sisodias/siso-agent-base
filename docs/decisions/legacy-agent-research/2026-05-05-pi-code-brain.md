# Add Pi Code Brain As A Separate Context Plane

## Decision

Add `pi-code-brain` as a separate Pi Harness design lane beside `pi-wiki`.

`pi-wiki` should handle research, source captures, decisions, briefings, and long-lived markdown knowledge.

`pi-code-brain` should handle codebase-specific context: symbols, modules, imports, topology, blast radius, recent activity, stale context, and lightweight code-wiki pages.

## Why

The latest research wave found repeated evidence that useful agent context splits into two different jobs:

- Human-readable knowledge: Karpathy-style LLM wiki, source captures, decisions, lessons, project briefings.
- Machine-assisted code context: AST/search indexes, dependency graphs, callers/callees, risk checks, activity logs, and targeted code summaries.

Trying to make a single wiki do both jobs would either make the wiki too noisy or make the code search too weak. The better shape is two planes with a small shared protocol.

## References

- `kitara2005/code-brain`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kitara2005-code-brain`
- `proofofwork-agency/reporecall`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/proofofwork-agency-reporecall`
- `Houseofmvps/codesight`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/houseofmvps-codesight`
- `MinishLab/semble`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/minishlab-semble`
- Wave report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-codebase-context-wave3.md`

## Proposed MVP

```text
pi-code-brain/
  .pi-brain/
    index.db
    graph.json
    activity.jsonl
    config.json
  code-wiki/
    index.md
    modules/
    flows/
    risks/
  patterns/
    corrections.md
    successful-fixes.md
    anti-patterns.md
```

Core commands:

```bash
pi harness brain index
pi harness brain search <query>
pi harness brain symbol <name>
pi harness brain module <name>
pi harness brain blast-radius <path>
pi harness brain recent-activity
pi harness brain status
```

Core tool contract:

```text
search_code(query, path?, top_k?)
get_symbol(name)
get_module(name)
get_file_summary(path)
get_blast_radius(path)
get_recent_activity(path?)
log_activity(event)
```

## Design Constraints

- Keep Bifrost as the model router.
- Default implementation should be local-first and inspectable.
- Do not require cloud vector databases in the MVP.
- Do not require hidden direct LLM calls in the indexing tool.
- Make semantic search optional: default to local file/SQLite/BM25/AST or a small local code search provider.
- Keep hooks lab-scoped until proven useful.

## Candidate Default Stack

Start with the smallest useful combination:

- Markdown/wiki layout from the Pi-native wiki findings.
- Local code search behavior inspired by `MinishLab/semble` and `Houseofmvps/codesight`.
- Activity memory and blast-radius concepts from `kitara2005/code-brain`.
- Intent-routed context bundle and explainability ideas from `proofofwork-agency/reporecall`.

## Open Questions

- Should `pi-code-brain` be a native Pi extension, an MCP server, or both?
- Should the first implementation use an existing package such as Semble, or a thin in-lab prototype around SQLite plus `rg` plus parser metadata?
- How much hook automation is acceptable before context injection becomes noisy?
- What minimum language support matters for the first lab sprint: TypeScript, Python, markdown, shell?

## Next Step

Run `code-brain`, `codesight`, `reporecall`, and `semble` against `/Users/shaansisodia/SISO_Workspace/pi-harness-lab` in isolated output directories, then compare output size, setup friction, tool contract, and quality of first-session orientation.
