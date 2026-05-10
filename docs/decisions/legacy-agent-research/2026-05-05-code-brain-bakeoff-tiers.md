# Run Code Brain Bakeoff By Tiers

## Decision

Evaluate code intelligence candidates in tiers instead of comparing every tool as if it solves the same job.

Use three code tiers and one memory evaluation lane:

```text
Tier 0: Lean repo map
Tier 1: Local structural graph
Tier 2: Rich semantic / agentic / symbolic adapters
Memory lane: structured local memory vs advanced learning references
```

## Why

The research hunt found many tools with overlapping claims but different cost profiles:

- Repo-map tools are tiny and token-budgeted but shallow.
- Structural graph tools are strong for impact analysis and architecture but require indexing and state.
- Semantic/agentic tools add embeddings, LSP, reasoning loops, or external providers.
- Symbolic IDE tools can safely refactor, which graph tools do not necessarily do.
- Memory-learning tools optimize recall/learning, not code navigation.

Pi Harness needs the smallest default that works, plus adapters for bigger jobs.

## Tier 0: Lean Repo Map

Candidates:

- `pdavis68/repomapper`
- `cdpath/repomap`
- `aimasteracc/tree-sitter-analyzer` summary/outline mode

Expected role:

- fast first-session orientation
- token-budgeted map
- no daemon
- minimal install and minimal state

Core questions:

```text
What are the most important files?
What symbols matter?
What should the agent read first?
Can this fit in 4k, 8k, 16k token budgets?
```

## Tier 1: Local Structural Graph

Candidates:

- `DeusData/codebase-memory-mcp`
- Qartez
- TokenSave
- `sdsrss/code-graph-mcp`
- `tirth8205/code-review-graph`

Expected role:

- persistent local graph
- architecture overview
- call graph
- impact analysis
- dead code
- hotspots/test gaps where available
- optional guard hooks

Core questions:

```text
What calls this?
What depends on this file?
What changes if this diff lands?
Which modules are central?
Which files are risky?
Which tests should run?
```

## Tier 2: Rich Semantic / Agentic / Symbolic

Candidates:

- Serena
- Codanna
- Octocode
- CodeGraphContext
- codegraph-rust

Expected role:

- semantic code+docs search
- symbolic navigation/refactoring
- LSP-backed editing
- richer GraphRAG
- optional model-assisted answers

Core questions:

```text
Can it rename/replace symbols safely?
Can it answer semantic questions better than graph search?
Does it require embeddings, external services, LSP servers, or model calls?
Can its capabilities stay optional?
```

## Memory Lane

Baseline:

- Engram-style local SQLite + FTS structured memory.

Advanced references:

- Hindsight for retain/recall/reflect and world/experience/mental-model taxonomy.
- RASPUTIN for lane-budget ablations and LoCoMo evaluation discipline.
- Token Savior for validity, TTL, symbol staleness, progressive disclosure, and profile-sized tool manifests.

Core questions:

```text
Can the agent recover after compaction?
Can it recall project decisions?
Can memories expire, contradict, or supersede each other?
Can memory entries link to code symbols and become stale when code changes?
```

## Bakeoff Rules

- No global mutation of `~/.claude`, `~/.codex`, or real `~/.pi/agent`.
- Run each candidate in a lab-local output/cache directory.
- Disable model calls unless they can route through Bifrost.
- Record every file created.
- Record tool manifest size if MCP is used.
- Prefer CLI mode for the first bakeoff to avoid persistent daemon ambiguity.
- Capture exact command, elapsed time, output size, and failure mode.

## Query Suite

Use the same questions for every code candidate where possible:

```text
1. Give an architecture overview of this lab.
2. Find the scripts that discover Pi ecosystem packages.
3. Find all code/docs that write to research/inbox.
4. Explain what would break if decisions/ were renamed.
5. Identify likely dead or stale files.
6. Find the highest-risk files by imports/churn/centrality.
7. Generate a compact repo map under 8k tokens.
8. Trace the flow from a discovered repo URL to a research inbox report.
```

Use the same questions for memory candidates:

```text
1. Save an architecture decision and recall it by topic.
2. Save a bugfix and recall it by affected file.
3. Save a correction that supersedes an earlier memory.
4. Save a session summary and recover it after a simulated compaction.
5. Link a memory to a symbol/file and mark it stale after a file hash changes.
```

## Output

Each candidate gets one report:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/YYYY-MM-DD-bakeoff-<candidate>.md
```

Final synthesis:

```text
/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/YYYY-MM-DD-code-brain-bakeoff-synthesis.md
```

## Next Step

Create a bakeoff harness script that can run read-only CLI tests first. Start with:

```text
repomap
tree-sitter-analyzer
codebase-memory-mcp
tokensave
code-graph-mcp
serena
```

Then expand to Qartez, Semble, Codesight, Codanna, and Hindsight-style memory once the matrix format is stable.
