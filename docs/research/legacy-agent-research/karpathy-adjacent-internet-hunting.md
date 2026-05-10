# Karpathy-Adjacent Internet Hunting

Date: 2026-05-05

## Goal

Keep finding useful open-source material around Andrej Karpathy's agent ideas, context engineering, skills, agent memory, codebase wikis, council-style orchestration, and anything that can improve the Pi+Bifrost harness.

This is a discovery workflow, not an install workflow. Clone and inspect before adopting.

## Search Lanes

Use five lanes together.

1. Web search for human phrasing and fresh launches.
2. Sourcegraph/code search for implementation fingerprints.
3. Package registries for breadth.
4. Skills/plugin directories for prompt-native tools.
5. Gists, talks, transcripts, Reddit/HN, and blog posts for seed ideas.

## Seed Terms

Use Karpathy-related concept terms:

```text
"Andrej Karpathy" "LLM Wiki"
"Karpathy" "LLM Wiki" GitHub
"Karpathy" "compounding knowledge" agent
"Software 3.0" agents GitHub
"Software Is Changing Again" agents
"vibe coding" agent harness
"Iron Man suit" agents Karpathy
"march of nines" LLM agents
"jagged intelligence" coding agents
"LLM OS" Karpathy agents
"context engineering" "Claude Code"
"context engineering" "Codex"
"context engineering" "agent skills"
```

Use implementation terms:

```text
"llm-wiki"
"llmwiki"
"wiki-ingest" "SKILL.md"
"wiki-query" "SKILL.md"
"graph.jsonld" "llms.txt"
"SessionStart" "llm wiki"
"WIKI_PATH" "SCHEMA.md"
"index.md" "log.md" "Obsidian" "agent"
"knowledge activation" ".agents"
"beliefs" "playbooks" "briefings" "agents"
"context packet" agent
"compiled wiki" LLM
"PageIndex" "knowledge base" agent
"Obsidian" "LLM" "wiki" "agent"
```

Use Pi bridge terms:

```text
"Pi" "llm wiki"
"Pi" "AGENTS.md" "skills"
"pi-coding-agent" "wiki"
"pi-package" "memory"
"pi-package" "context"
"pi-package" "subagent"
"@mariozechner/pi-coding-agent" "knowledge"
```

## Sourcegraph Queries

The current Sourcegraph helper appends Pi defaults, which is useful for Pi inventory but noisy for Karpathy-adjacent work:

```bash
python3 /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/scripts/sourcegraph_pi_scan.py \
  --output /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sourcegraph-karpathy-adjacent.json \
  --markdown /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sourcegraph-karpathy-adjacent.md \
  --query '"Karpathy" "LLM Wiki" count:100' \
  --query '"llm-wiki" "SKILL.md" count:100' \
  --query '"LLM Wiki" "AGENTS.md" count:100' \
  --query '"context engineering" "Claude Code" count:100' \
  --query '"llms.txt" "graph.jsonld" "wiki" count:100'
```

When a lead is known, search for fingerprints instead of names:

```text
"wiki-ingest"
"wiki-query"
"knowledge-activation"
"llmwiki sync"
"llmwiki build"
"openkb query"
"WIKI_PATH"
"graph.jsonld"
"llms-full.txt"
"confidence" "lifecycle" "frontmatter"
"raw/" "wiki/" "schema" "Obsidian"
```

## Web Search Queries

Run web searches like:

```text
Karpathy LLM Wiki GitHub llmwiki Obsidian wiki agent
Andrej Karpathy Software Is Changing Again context engineering GitHub agents
Karpathy inspired agent skills GitHub llm wiki codex claude
"Turned Andrej Karpathy" "LLM Wiki" "Codex"
"Karpathy's LLM wiki" "Pi"
"Karpathy's LLM wiki" "MCP"
"LLM wiki" "Claude Code" "Codex" "OpenCode"
```

Follow links into:

- GitHub repos,
- gists,
- package pages,
- skill marketplaces,
- Reddit/HN launch posts,
- docs sites,
- YouTube transcripts,
- blog posts with implementation details.

## Package Registry Lanes

Search NPM/PyPI for:

```text
llm-wiki
llmwiki
openkb
obsidian wiki llm
agent wiki
context engineering
agent skills
claude skills
codex skills
pi-package memory
pi-package context
```

For Pi packages, keep using:

```bash
python3 /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/scripts/discover_pi_ecosystem.py \
  --output /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/pi-package-registry.json \
  --markdown /Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/pi-package-registry.md
```

## Clone And Inspect Protocol

For each high-signal repo:

1. Clone into `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/sources/`.
2. Record URL, local path, commit hash, commit date, and one-line commit subject.
3. Read README first.
4. Inspect package manifests and CLI/skill/MCP entrypoints.
5. Look for tests, examples, schemas, and docs.
6. Write a concise report under `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/research/inbox/`.
7. Promote design choices to `/Users/shaansisodia/SISO_Workspace/pi-harness-lab/decisions/` only when we are ready to adopt.

Do not globally install packages during discovery.

## Priority Queue

Already cloned and worth deeper analysis:

- https://github.com/Pratiyush/llm-wiki
- https://github.com/Ar9av/obsidian-wiki
- https://github.com/atomicmemory/llm-wiki-compiler
- https://github.com/VectifyAI/OpenKB
- https://github.com/NousResearch/hermes-agent
- https://github.com/boshu2/agentops
- https://github.com/refactoringhq/tolaria
- https://github.com/alchaincyf/karpathy-skill

Next leads to inspect:

- https://github.com/vanillaflava/llm-wiki-claude-skills
- https://github.com/sdyckjq-lab/llm-wiki-skill
- https://llm-wiki.net/
- https://gist.github.com/kennyg/6c45cace2e1c4e424a28fcd51dd6c25b
- https://github.com/agent-team-foundation/first-tree
- https://github.com/ndjordjevic/pin-llm-wiki
- https://github.com/VLSiddarth/ku-obsidian-wiki
- https://github.com/OpenDataLab/MinerU-Document-Explorer

## What To Extract For Pi

Prioritize ideas that map to Pi Harness primitives:

- file-first memory,
- Bifrost-routed LLM calls,
- cheap context activation before expensive reasoning,
- skill loading,
- role/subagent dispatch,
- provenance and lifecycle tracking,
- inspectable JSON/markdown traces,
- MCP/headless integration,
- rollback/disable paths,
- UI surfaces for logs, active context, and retrieved knowledge.

## Adoption Filter

High value:

- deterministic CLI,
- markdown/JSON data model,
- clear schema,
- strong tests,
- no forced cloud dependency,
- small dependency tree,
- easy Bifrost provider adaptation,
- readable prompts/skills,
- importable concepts without installing the whole app.

Lower value:

- persona-only prompt packs,
- demos without tests,
- tools that require a hosted backend,
- repos that hide behavior in opaque binaries,
- agents that need a large custom runtime before the idea can be tested.

## Current Read

The likely Pi breakthrough is a tiny local knowledge compiler:

```text
research/inbox + decisions + package registry + session notes
  -> deterministic index/log/manifest
  -> Bifrost-assisted synthesis
  -> markdown wiki
  -> llms.txt + graph.jsonld + compact JSON registry
  -> query tool used before every substantial agent dispatch
```

This would make Pi feel less like a fresh stateless CLI and more like a small, inspectable research lab that compounds.
