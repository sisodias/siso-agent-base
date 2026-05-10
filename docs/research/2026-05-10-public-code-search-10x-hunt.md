# Public Code Search 10x Hunt

Date: 2026-05-10

## Goal

Find open-source code patterns that can materially improve SISO's agent runtime, especially for faster iteration, lower parent-chat token waste, safer subagent orchestration, and Claude Code-like per-session behavior.

## Highest-ROI Finds

1. OpenCode Sourcegraph/public code search
   - Source: `opencode-ai/opencode` `internal/llm/tools/sourcegraph.go`
   - Pattern: expose public code search as an agent tool with query/count/context/timeout controls.
   - SISO adaptation: `publicCodeSearch` returns compact repo/path/line previews and URLs, and deliberately avoids requesting full external file content.

2. OpenCode task sessions
   - Source: `opencode-ai/opencode` `internal/session/session.go` and `internal/llm/agent/agent-tool.go`
   - Pattern: child agent runs become task sessions linked by `ParentSessionID`, with parent cost/usage accounting updated after the child completes.
   - SISO adaptation candidate: keep converging child runs, notifications, and status UI around explicit parent-session keys.

3. Aider repo map
   - Source: `Aider-AI/aider` `aider/repomap.py`
   - Pattern: tree-sitter tags plus PageRank choose a token-bounded structural map before model calls.
   - SISO adaptation: `rankedRepoMap` now builds a bounded local symbol/file relevance map. The first version uses regex tags and PageRank-inspired scoring; the next version should swap in tree-sitter tags and persistent cache.

4. Cline context/checkpoint loop
   - Source: `cline/cline` `ContextManager.ts`, `SubagentRunner.ts`, and `CheckpointTracker.ts`
   - Pattern: compact before overflow, retry after context-window failures, and create task-scoped shadow-git checkpoints.
   - SISO adaptation candidate: future autopilot loop should checkpoint before edit/test cycles and compact locally before handing anything back to the parent chat.

## Implemented In 0.1.103

- Added `publicCodeSearch` in `extensions/siso-agent-router/tooling-actions.js`.
- Wired it through `siso action=repo op=sourcegraph|public-code|internet-code|codesearch`.
- Added Tool Scenario Card metadata under `public-code-search`.
- Added mocked Sourcegraph regression coverage to `smoke:agent-tooling`.

## Implemented In 0.1.104

- Added `rankedRepoMap` in `extensions/siso-agent-router/tooling-actions.js`.
- Wired it through `siso action=repo op=ranked-map|repo-map|repomap`.
- Added Tool Scenario Card metadata under `ranked-repo-map` and made it the first tool in the repo-navigation pack.
- Expanded `smoke:agent-tooling` to prove the map ranks relevant files, includes task-relevant symbols, stays bounded, and avoids secret-like paths.

## Next 10x Candidate

Cline-style checkpoint autopilot is now the next major multiplier. Public code search finds outside patterns; ranked repo maps find local code; autopilot should then run bounded inspect/edit/test loops with a checkpoint before each edit, compact local logs before parent delivery, and stop when tests pass or the failure signature stops changing.

## 10x Roadmap

1. Public code search: shipped in 0.1.103.
2. Ranked local repo map: shipped in 0.1.104.
3. Tree-sitter/persistent repo-map cache: replace regex tags with language-aware tags, cache by file mtime, and expose map freshness/cost.
4. Checkpoint autopilot: task-scoped checkpoints, bounded edit/test cycles, failure-signature dedupe, and compact parent-visible reports.
5. Session cost rollup: OpenCode-style parent/child session accounting so child cost, token use, and result summaries roll up without raw transcript leakage.
