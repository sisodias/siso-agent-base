# Use Code Intelligence Adapters

## Decision

Design `pi-code-brain` around a stable adapter contract instead of hard-coding one code-intelligence engine.

The first default should be local, inspectable, and deterministic where possible. Other engines can plug in as adapters for stronger graph analysis, symbolic editing, semantic search, or generated wiki output.

## Why

The research hunt found multiple strong but different tool families:

- Static structural graph engines: `codebase-memory-mcp`, Qartez, code-review-graph.
- IDE/symbolic engines: Serena.
- Fast search engines: Semble.
- Generated context/wiki engines: Codesight.
- Code+docs semantic engines: Codanna.

They are not interchangeable. A graph engine answers "what depends on this?" A symbolic IDE engine can rename or replace a symbol body. A search engine finds likely snippets quickly. A wiki generator creates durable human-readable context.

Pi should make these swappable behind a small contract.

## References

- `DeusData/codebase-memory-mcp`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/deusdata-codebase-memory-mcp`
- `oraios/serena`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/oraios-serena`
- `kuberstar/qartez-mcp`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/kuberstar-qartez-mcp`
- `MinishLab/semble`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/minishlab-semble`
- `Houseofmvps/codesight`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/houseofmvps-codesight`
- `bartolli/codanna`: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/bartolli-codanna`
- Wave report: `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/2026-05-05-code-intelligence-wave5.md`

## Adapter Contract

Minimum graph/search contract:

```text
index(project_root, options)
status(project_root)
search_code(query, top_k, filters)
symbol(name, filters)
file_summary(path)
architecture_overview()
impact(paths_or_diff)
dead_code(filters)
```

Optional graph contract:

```text
callers(symbol)
callees(symbol)
routes(filters)
communities()
hotspots()
test_gaps()
graph_query(query)
export_artifact(format)
```

Optional symbolic editing contract:

```text
find_references(symbol)
rename_symbol(symbol, new_name, dry_run)
replace_symbol_body(symbol, content, dry_run)
insert_before_symbol(symbol, content)
insert_after_symbol(symbol, content)
diagnostics(path?)
```

Optional memory/wiki contract:

```text
generate_code_wiki()
search_docs(query)
adr_create(title, body, links)
adr_search(query)
```

## Candidate Defaults

For the first comparison:

- Baseline fast search: Semble.
- Baseline markdown/wiki: Codesight.
- Primary structural graph candidate: `codebase-memory-mcp`.
- Risk/guard candidate: Qartez.
- Symbolic editing candidate: Serena.

## Design Constraints

- Adapter setup must support lab-local mode without mutating global `~/.claude`, `~/.codex`, or real `~/.pi/agent`.
- Any model calls must go through Bifrost or be explicitly disabled.
- The adapter must report what files it created and where its cache/index lives.
- The adapter must expose whether semantic embeddings, external services, or background watchers are active.
- Pi must keep a plain fallback: `rg`, git, and local parsing should still work if no adapter is installed.

## Open Questions

- Should Pi call adapters through MCP, CLI, or a local JSON-RPC wrapper?
- Should adapter results be normalized into `.pi/brain/graph.db`, or should Pi leave each adapter’s native store in place and cache only summaries?
- Should symbolic edit tools be disabled by default until a profile explicitly opts in?
- What is the smallest query suite that proves an adapter is worth adopting?

## Next Step

Create an adapter bakeoff script that runs a fixed query suite against each candidate in isolated output directories:

```text
queries:
  architecture overview
  find command/router entrypoints
  find research inbox writer
  what changes if decisions docs move?
  list likely dead/unused files
  summarize test gaps
```

The bakeoff should produce one markdown report per adapter under `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/`.
