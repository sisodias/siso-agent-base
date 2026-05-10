# Use A Five-Verb Code Brain UX

## Decision

Expose Pi code intelligence through a small five-verb UX:

```text
pi brain understand
pi brain retrieve "<task>"
pi brain context <symbol-or-file>
pi brain preflight <symbol-or-file-or-diff>
pi brain critique <diff>
```

Keep individual adapter tool surfaces hidden behind these verbs unless the user explicitly asks for raw adapter access.

## Why

The latest research wave found many tools with large command or MCP surfaces. Large surfaces are powerful but can hurt agent behavior by loading too many tool schemas and making tool choice noisy.

Roam’s five high-level verbs are a good UX pattern, and they map cleanly onto capabilities from other candidates:

- `understand`: architecture overview / repo map / project summary.
- `retrieve`: task-oriented context search.
- `context`: exact files, symbols, and line ranges before editing.
- `preflight`: blast radius, tests, risk, guard checks.
- `critique`: graph-grounded diff review.

## References

- `Cranot/roam-code`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/cranot-roam-code`
- `ThinkyMiner/codeTree`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/thinkyminer-codetree`
- Wave report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-last-mile-context-wave7.md`

## Adapter Mapping

```text
understand
  repomap repo map
  codetree repository map
  codebase-memory architecture
  qartez map
  roam understand

retrieve
  semble search
  codetree search_graph/search_symbols
  codebase-memory search_code/search_graph
  roam retrieve
  codanna semantic search

context
  codetree get_symbol/get_file_skeleton
  serena symbol/reference tools
  tokensave context tools
  roam context

preflight
  qartez impact/hotspots
  codetree blast_radius/change_impact
  code-graph-mcp impact_analysis
  roam preflight

critique
  roam critique
  code-review-graph review prompts
  qartez diff impact
  codebase-memory detect_changes
```

## Design Constraints

- The default profile should expose only the five verbs.
- Raw adapter tools should be available through an advanced/debug mode.
- Each verb should report which adapter handled it.
- Each verb should report whether it used cached index data, embeddings, model calls, or external services.
- Model calls must go through Bifrost.

## Next Step

Bakeoff candidates should be scored on how well they can implement the five verbs. The winner is not the tool with the most features; it is the tool that gives the cleanest, fastest, most inspectable answers behind these verbs.
